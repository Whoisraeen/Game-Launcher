import { app, shell } from 'electron';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { EventEmitter } from 'events';
import { getDb } from '../database';
import { DatabaseWorkerClient } from '../database/dbClient';
import { SteamLibrary } from './SteamLibrary';
import { EpicLibrary } from './EpicLibrary';
import { PlatformScanner } from './platformScanner';
import { MetadataFetcher } from './metadataFetcher';
import { ProcessManager } from './processManager';
import { PlaytimeTracker } from './playtimeTracker';
import { DiscordManager } from './discordManager';
import { PerformanceService } from './PerformanceService';
import { CrashAnalyzerService } from './crashAnalyzerService';
import { NotificationService } from './notificationService';
import { SettingsManager } from './settingsManager';
import { GamingSessionService } from './gamingSessionService';

export class GameManager extends EventEmitter {
    private steamLibrary: SteamLibrary;
    private epicLibrary: EpicLibrary;
    private scanner: PlatformScanner;
    private metadataFetcher: MetadataFetcher;
    private processManager: ProcessManager;
    private playtimeTracker: PlaytimeTracker;
    private performanceService?: PerformanceService;
    private crashAnalyzerService: CrashAnalyzerService;
    private notificationService: NotificationService;
    private gamingSessionService: GamingSessionService;
    private dbClient: DatabaseWorkerClient;

    constructor() {
        super();
        this.steamLibrary = new SteamLibrary();
        this.epicLibrary = new EpicLibrary();
        this.scanner = new PlatformScanner();
        this.metadataFetcher = new MetadataFetcher();
        this.processManager = new ProcessManager();
        this.playtimeTracker = new PlaytimeTracker();
        this.crashAnalyzerService = new CrashAnalyzerService();
        this.notificationService = new NotificationService();
        this.gamingSessionService = new GamingSessionService();
        this.dbClient = DatabaseWorkerClient.getInstance();
    }

    setPerformanceService(service: PerformanceService) {
        this.performanceService = service;
    }

    async getAllGames() {
        return await this.dbClient.all('SELECT * FROM games');
    }

    async getGamesPage(page: number, pageSize: number) {
        const offset = (page - 1) * pageSize;
        const games = await this.dbClient.all('SELECT * FROM games LIMIT ? OFFSET ?', pageSize, offset);
        const total = await this.dbClient.get('SELECT COUNT(*) as count FROM games');
        
        return {
            games,
            total: total.count
        };
    }

    async getCollections() {
        try {
            const collections = await this.dbClient.all('SELECT * FROM collections');
            
            // Fetch game IDs for each collection
            // This is slightly less efficient in worker model if we loop
            // A JOIN would be better
            const collectionsWithGames = await Promise.all(collections.map(async (collection: any) => {
                const games = await this.dbClient.all('SELECT game_id FROM collection_games WHERE collection_id = ?', collection.id);
                return {
                    ...collection,
                    gameIds: games.map((g: any) => g.game_id)
                };
            }));
            
            return collectionsWithGames;
        } catch (error) {
            console.error('Error fetching collections:', error);
            return [];
        }
    }

    async createCollection(name: string, description?: string) {
        const id = uuidv4();
        const now = Date.now();
        
        try {
            await this.dbClient.run('INSERT INTO collections (id, name, description, created_at) VALUES (?, ?, ?, ?)', id, name, description || '', now);
            return {
                id,
                name,
                description,
                gameIds: []
            };
        } catch (error) {
            console.error('Error creating collection:', error);
            throw error;
        }
    }

    async deleteCollection(id: string) {
        const db = getDb();
        try {
            db.prepare('DELETE FROM collections WHERE id = ?').run(id);
            // Cascade delete handled by FK but good to be sure
            db.prepare('DELETE FROM collection_games WHERE collection_id = ?').run(id);
            return true;
        } catch (error) {
            console.error('Error deleting collection:', error);
            throw error;
        }
    }

    async addGameToCollection(collectionId: string, gameId: string) {
        const db = getDb();
        const now = Date.now();
        try {
            db.prepare('INSERT INTO collection_games (collection_id, game_id, added_at) VALUES (?, ?, ?)').run(collectionId, gameId, now);
            return true;
        } catch (error) {
            console.error('Error adding game to collection:', error);
            // Likely duplicate constraint, ignore
            return false;
        }
    }

    async removeGameFromCollection(collectionId: string, gameId: string) {
        const db = getDb();
        try {
            db.prepare('DELETE FROM collection_games WHERE collection_id = ? AND game_id = ?').run(collectionId, gameId);
            return true;
        } catch (error) {
            console.error('Error removing game from collection:', error);
            return false;
        }
    }

    async removeDuplicates() {
        console.log('Checking for duplicates in database...');
        try {
            // Find duplicates based on platform and platform_id
            const duplicates = await this.dbClient.all(`
                SELECT platform, platform_id, COUNT(*) as count
                FROM games
                GROUP BY platform, platform_id
                HAVING count > 1
            `);

            if (duplicates.length > 0) {
                console.log(`Found ${duplicates.length} sets of duplicates. Cleaning up...`);
                let deletedCount = 0;
                
                for (const dup of duplicates) {
                    // Get all instances of this game
                    // Order by playtime (desc) to keep progress, then added_at (asc) to keep original
                    const games = await this.dbClient.all(
                        'SELECT id, added_at, play_status, playtime_seconds FROM games WHERE platform = ? AND platform_id = ? ORDER BY playtime_seconds DESC, added_at ASC', 
                        dup.platform, 
                        dup.platform_id
                    );
                    
                    // Keep the first one (best), delete rest
                    const toDelete = games.slice(1);
                    for (const g of toDelete) {
                        await this.dbClient.run('DELETE FROM games WHERE id = ?', g.id);
                        deletedCount++;
                    }
                }
                console.log(`Removed ${deletedCount} duplicate game entries.`);
            } else {
                console.log('No duplicates found.');
            }
        } catch (error) {
            console.error('Error removing duplicates:', error);
        }
    }

    async syncLibrary() {
        console.log('Starting library sync...');
        try {
            // Clean up duplicates first to ensure clean state
            await this.removeDuplicates();

            const scannedGames = await this.scanner.scanAll();
            console.log(`Found ${scannedGames.length} games from scanner`);
            
            if (scannedGames.length === 0) {
                console.warn('Scanner found NO games. Check PlatformScanner and individual libraries.');
            } else {
                console.log('First few scanned games:', JSON.stringify(scannedGames.slice(0, 3), null, 2));
            }

            // Pre-fetch existing games to check for metadata
            const existingGames = await this.dbClient.all('SELECT id, platform, platform_id, genre, cover_url, icon_url, background_url, logo_url, tags, description FROM games');
            const existingMap = new Map(existingGames.map((g: any) => [`${g.platform}:${g.platform_id}`, g]));

            // Enrich with metadata
            console.log(`Enriching games with metadata (Existing games in DB: ${existingGames.length})...`);
            const enrichedGames = await Promise.all(scannedGames.map(async (game) => {
                const key = `${game.platform}:${game.platformId}`;
                const existing: any = existingMap.get(key);
                
                // If we have existing rich metadata, keep it (unless we want to force refresh)
                // For now, let's merge.
                
                return {
                    id: existing?.id || uuidv4(),
                    title: game.title,
                    platform: game.platform,
                    platformId: game.platformId,
                    installPath: game.installPath,
                    executable: game.executable,
                    addedAt: existing?.added_at || Date.now(),
                    isInstalled: game.isInstalled ? 1 : 0,
                    icon: existing?.icon_url || game.icon,
                    cover: existing?.cover_url || game.cover,
                    hero: existing?.background_url || game.hero,
                    logo: existing?.logo_url || game.logo,
                    genre: existing?.genre || game.genre,
                    tags: existing?.tags || JSON.stringify(game.tags || []),
                    achievementsTotal: existing?.achievements_total || 0,
                    achievementsUnlocked: existing?.achievements_unlocked || 0,
                    videoUrl: existing?.video_url || null
                };
            }));

            console.log('Preparing database updates...');
            // Note: We can't use transaction callback with async worker easily yet
            // We'll run them as individual async calls for now. 
            // A batched transaction method in worker would be better for performance.
            // For prototype/v1 this is "okay" but slower than main thread better-sqlite3 transaction.
            // TODO: Implement batched transaction in DbWorker.
            
            let insertedCount = 0;
            console.log(`Starting updates for ${enrichedGames.length} games...`);
            
            for (const game of enrichedGames) {
                try {
                    await this.dbClient.run(`
                        INSERT INTO games (
                            id, title, platform, platform_id, install_path, executable, added_at, is_installed, icon_url, cover_url, background_url, logo_url, genre, tags, achievements_total, achievements_unlocked, video_url
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                        )
                        ON CONFLICT(id) DO UPDATE SET
                            is_installed = excluded.is_installed,
                            install_path = excluded.install_path,
                            executable = excluded.executable,
                            icon_url = COALESCE(excluded.icon_url, games.icon_url),
                            cover_url = COALESCE(excluded.cover_url, games.cover_url),
                            background_url = COALESCE(excluded.background_url, games.background_url),
                            logo_url = COALESCE(excluded.logo_url, games.logo_url),
                            genre = COALESCE(excluded.genre, games.genre),
                            tags = COALESCE(excluded.tags, games.tags),
                            achievements_total = MAX(excluded.achievements_total, games.achievements_total),
                            video_url = COALESCE(excluded.video_url, games.video_url)
                    `, 
                        game.id, game.title, game.platform, game.platformId, game.installPath, game.executable, 
                        game.addedAt, game.isInstalled, game.icon, game.cover, game.hero, game.logo, 
                        game.genre, game.tags, game.achievementsTotal, game.achievementsUnlocked, game.videoUrl
                    );
                    insertedCount++;
                } catch (err) {
                    console.error(`Failed to insert game ${game.title}:`, err);
                }
            }
            
            console.log(`Updates complete. Processed ${insertedCount} games.`);

            // Auto-merge duplicates after sync
            console.log('Auto-merging duplicates...');
            const mergedCount = await this.autoMergeDuplicates();
            console.log(`Auto-merged ${mergedCount} groups of duplicates.`);

            console.log('Library sync complete');
            return await this.getAllGames();
        } catch (error) {
            console.error('Critical error during library sync:', error);
            throw error;
        }
    }

    async toggleHidden(gameId: string, isHidden: boolean) {
        await this.dbClient.run('UPDATE games SET is_hidden = ? WHERE id = ?', isHidden ? 1 : 0, gameId);
        return true;
    }

    async updateGameTags(gameId: string, tags: string[]) {
        await this.dbClient.run('UPDATE games SET tags = ? WHERE id = ?', JSON.stringify(tags), gameId);
        return true;
    }

    async updatePlayStatus(gameId: string, status: string) {
        const db = getDb();
        db.prepare('UPDATE games SET play_status = ? WHERE id = ?').run(status, gameId);
        return true;
    }

    async updateLaunchOptions(gameId: string, options: string) {
        await this.dbClient.run('UPDATE games SET launch_options = ? WHERE id = ?', options, gameId);
        return true;
    }

    async updateRating(gameId: string, rating: number) {
        await this.dbClient.run('UPDATE games SET rating = ? WHERE id = ?', rating, gameId);
        return true;
    }

    async mergeGames(primaryGameId: string, secondaryGameId: string) {
        // Verify both games exist
        const primary = await this.dbClient.get('SELECT * FROM games WHERE id = ?', primaryGameId);
        const secondary = await this.dbClient.get('SELECT * FROM games WHERE id = ?', secondaryGameId);

        if (!primary || !secondary) {
            throw new Error('One or both games not found');
        }

        // Create a group ID (use primary ID or generate new UUID)
        // If primary already has group_id, use it.
        let groupId = primary.group_id;
        if (!groupId) {
            groupId = uuidv4();
            await this.dbClient.run('UPDATE games SET group_id = ? WHERE id = ?', groupId, primaryGameId);
        }

        // Set secondary game's group_id to match
        await this.dbClient.run('UPDATE games SET group_id = ? WHERE id = ?', groupId, secondaryGameId);
        
        return true;
    }

    async unmergeGame(gameId: string) {
        await this.dbClient.run('UPDATE games SET group_id = NULL WHERE id = ?', gameId);
        return true;
    }

    // New method to auto-merge duplicates based on title
    async autoMergeDuplicates() {
        const games = await this.getAllGames() as any[];
        
        // Group by normalized title
        const titleMap = new Map<string, any[]>();
        
        for (const game of games) {
            const normalized = game.title.toLowerCase().replace(/[^\w\s]/gi, '').trim();
            if (!titleMap.has(normalized)) {
                titleMap.set(normalized, []);
            }
            titleMap.get(normalized)?.push(game);
        }

        let mergedCount = 0;

        for (const [_, group] of titleMap.entries()) {
            if (group.length > 1) {
                // Found duplicates
                
                // Score each game to find the best primary candidate
                // Priority: Installed > Platform Preference > Playtime
                const platformPriority = ['steam', 'gog', 'epic', 'xbox', 'origin', 'uplay', 'battlenet', 'riot'];
                
                const sortedGroup = group.sort((a, b) => {
                    // 1. Installed status
                    if (a.is_installed && !b.is_installed) return -1;
                    if (!a.is_installed && b.is_installed) return 1;
                    
                    // 2. Platform Preference
                    const pA = platformPriority.indexOf(a.platform);
                    const pB = platformPriority.indexOf(b.platform);
                    // If platform not in list, it gets -1. We want lower index to be better.
                    // Treat -1 as Infinity for sorting (lowest priority)
                    const scoreA = pA === -1 ? 999 : pA;
                    const scoreB = pB === -1 ? 999 : pB;
                    
                    if (scoreA !== scoreB) return scoreA - scoreB;
                    
                    // 3. Playtime
                    return (b.playtime || 0) - (a.playtime || 0);
                });
                
                const primary = sortedGroup[0];

                // Generate group ID if needed
                let groupId = primary.group_id;
                if (!groupId) {
                    groupId = uuidv4();
                    await this.dbClient.run('UPDATE games SET group_id = ? WHERE id = ?', groupId, primary.id);
                }

                // Link others
                for (const game of group) {
                    if (game.id !== primary.id) {
                        // Only update if not already in a DIFFERENT group
                        if (game.group_id !== groupId) {
                            await this.dbClient.run('UPDATE games SET group_id = ? WHERE id = ?', groupId, game.id);
                            mergedCount++;
                        }
                    }
                }
            }
        }
        
        return mergedCount;
    }

    async updateUserNotes(gameId: string, notes: string) {
        await this.dbClient.run('UPDATE games SET user_notes = ? WHERE id = ?', notes, gameId);
        return true;
    }

    private async monitorGameProcess(game: any) {
        if (!game.executable) {
            console.log(`No executable defined for ${game.title}, cannot monitor process for Discord RPC.`);
            return; 
        }

        const processName = path.basename(game.executable);
        console.log(`Monitoring game process for Discord RPC: ${processName}`);

        // 1. Wait for process to appear (max 60s)
        let isRunning = false;
        let attempts = 0;
        while (attempts < 30 && !isRunning) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            isRunning = await this.processManager.isProcessRunning(processName);
            attempts++;
        }

        if (isRunning) {
            console.log(`Process detected: ${processName}. Monitoring active.`);
            
            // 2. Monitor until it closes
            const monitorInterval = setInterval(async () => {
                const stillRunning = await this.processManager.isProcessRunning(processName);
                if (!stillRunning) {
                    clearInterval(monitorInterval);
                    console.log(`Game process exited: ${processName}`);
                    DiscordManager.getInstance().setIdle();
                    this.gamingSessionService.stopMonitoring();
                    
                    // Notify listeners
                    this.emit('game-ended', game);

                    // Trigger memory cleanup and restore performance settings
                    try {
                        const settingsManager = new SettingsManager();
                        const settings = settingsManager.getAllSettings();
                        
                        // Restore Power Plan
                        if (this.performanceService) {
                            this.performanceService.restoreSystem()
                                .catch(err => console.error('Error restoring system performance settings:', err));
                        }

                        // Check if user has enabled post-session cleanup (defaulting to true)
                        const cleanupEnabled = settings.performance.memoryCleanup !== false;

                        if (cleanupEnabled) {
                            console.log('Starting post-session memory cleanup...');
                            const result = await this.processManager.cleanMemoryAfterSession();
                            if (result.success) {
                                console.log('Memory cleanup completed:', result.actions.join(', '));
                            }
                        }

                        // Auto Crash Analysis
                        if (settings.gaming?.crashAnalysis) {
                            console.log('Running post-game crash analysis...');
                            // Small delay to let Windows Event Log populate
                            setTimeout(async () => {
                                try {
                                    const report = await this.crashAnalyzerService.analyzeCrash(game.id, game.title);
                                    
                                    // If we found something significant
                                    if (report.relevantLogs.length > 0 || report.crashType !== 'unknown') {
                                        console.log(`Crash detected for ${game.title}: ${report.crashType}`);
                                        this.notificationService.notifyCrash(game.title);
                                    } else {
                                        console.log(`No crash detected for ${game.title}`);
                                    }
                                } catch (error) {
                                    console.error('Error during auto crash analysis:', error);
                                }
                            }, 3000);
                        }
                    } catch (err) {
                        console.error('Error during post-session cleanup:', err);
                    }
                }
            }, 5000);
        } else {
            console.warn(`Process ${processName} failed to start or could not be detected.`);
            DiscordManager.getInstance().setIdle();
        }
    }

    async launchGame(gameId: string) {
        const game = await this.dbClient.get('SELECT * FROM games WHERE id = ?', gameId);

        if (!game) {
            throw new Error('Game not found');
        }

        console.log(`Launching game: ${game.title} (${game.platform})`);

        // Notify listeners
        this.emit('game-started', game);

        // Update last_played
        await this.dbClient.run('UPDATE games SET last_played = ? WHERE id = ?', Date.now(), gameId);

        // Set Discord Activity
        DiscordManager.getInstance().setActivity(game.title, 'Playing');

        // Start Session Monitoring (Breaks, Time Limits)
        try {
            const settingsManager = new SettingsManager();
            const settings = settingsManager.getAllSettings();
            
            // Check for planned session
            const plannedSession = this.gamingSessionService.getSessionForGameNow(game.id);
            
            let breakInterval = 60; // Default 60 mins
            let limitMinutes: number | undefined = undefined;

            if (plannedSession) {
                console.log(`Found planned session: ${plannedSession.title}`);
                if (plannedSession.breakInterval) {
                    breakInterval = plannedSession.breakInterval;
                }
                // Calculate remaining minutes
                const now = Date.now();
                if (plannedSession.endTime > now) {
                    limitMinutes = Math.floor((plannedSession.endTime - now) / 60000);
                }
            }

            this.gamingSessionService.startMonitoring(game.id, game.title, breakInterval, limitMinutes);
        } catch (e) {
            console.error('Failed to start session monitoring:', e);
        }
        
        // Start monitoring process for Discord RPC status
        this.monitorGameProcess(game).catch(err => console.error('Error monitoring game process:', err));

        // Performance Optimization
        try {
            const settingsManager = new SettingsManager();
            const settings = settingsManager.getAllSettings();
            if (settings.performance.optimizeOnLaunch && this.performanceService) {
                console.log('Triggering auto-optimization...');
                // Fire and forget, or at least don't block launch too long
                this.performanceService.optimizeSystem(game.executable ? path.basename(game.executable) : undefined)
                    .catch(err => console.error('Auto-optimization error:', err));
            }
        } catch (err) {
            console.error('Error checking performance settings:', err);
        }

        const launchOptions = game.launch_options || '';

        try {
            switch (game.platform) {
                case 'steam':
                    await shell.openExternal(this.steamLibrary.getLaunchCommand(game.platform_id));
                    break;
                case 'epic':
                    try {
                        await shell.openExternal(this.epicLibrary.getLaunchCommand(game.platform_id));
                    } catch (e) {
                        console.warn('Epic protocol launch failed, falling back to executable', e);
                        if (game.executable) {
                            const execPath = path.join(game.install_path, game.executable);
                            exec(`"${execPath}" ${launchOptions}`, { cwd: game.install_path });
                        } else {
                            throw new Error('No executable found for Epic game fallback');
                        }
                    }
                    break;
                case 'gog':
                    const launchCommand = this.scanner.getLaunchCommand(game.platform, game.platform_id);
                    if (launchCommand) {
                        await shell.openExternal(launchCommand);
                    } else if (game.executable) {
                        const execPath = path.join(game.install_path, game.executable);
                        const command = `"${execPath}" ${launchOptions}`;
                        exec(command, { cwd: game.install_path });
                    } else {
                        throw new Error(`Cannot launch game: No executable or launch URI found for ${game.title}`);
                    } 
                    break;
                case 'origin':
                    await shell.openExternal(`origin://launchgame/${game.platform_id}`);
                    break;
                case 'uplay':
                    await shell.openExternal(`uplay://launch/${game.platform_id}/0`);
                    break;
                case 'xbox':
                    await shell.openExternal(`shell:AppsFolder\\${game.platform_id}!App`);
                    break;
                case 'riot':
                    const riotCommand = this.scanner.getLaunchCommand('riot', game.platform_id);
                    if (riotCommand) {
                        exec(riotCommand);
                    }
                    break;
                case 'battlenet':
                    await shell.openExternal(`battlenet://${game.platform_id}`);
                    break;
                case 'itch':
                case 'amazon':
                case 'manual':
                case 'default':
                default:
                    if (game.executable && game.install_path) {
                        const execPath = path.join(game.install_path, game.executable);
                        const command = `"${execPath}" ${launchOptions}`;
                        console.log(`Executing: ${command} in ${game.install_path}`);
                        exec(command, { cwd: game.install_path });
                    } else if (game.platform === 'emulated') {
                         const launchInfo = this.scanner.emulationService.getLaunchCommand(game.platform_id);
                        if (launchInfo) {
                            console.log(`Launching Emulated game: ${launchInfo.command}`);
                            exec(launchInfo.command, { cwd: launchInfo.cwd });
                        } else {
                            throw new Error(`Cannot launch emulated game: Configuration not found for ${game.title}`);
                        }
                    } else {
                        throw new Error(`Cannot launch game: No executable found for ${game.title}`);
                    }
                    break;
            }

            // Start tracking playtime if executable is known
            if (game.executable) {
                setTimeout(async () => {
                    this.playtimeTracker.startTracking(gameId, game.executable);
                    // Optimization logic removed for now
                }, 5000);
            }

            return true;
        } catch (error) {
            console.error('Error launching game:', error);
            throw error;
        }
    }

    async verifyGame(gameId: string) {
        console.log(`Verifying game ${gameId}... (Not implemented)`);
        return true;
    }

    async killGame(gameId: string) {
        const db = getDb();
        const game = db.prepare('SELECT executable FROM games WHERE id = ?').get(gameId) as any;
        if (game && game.executable) {
            try {
                // This is a rough implementation, ideally we track PID
                exec(`taskkill /F /IM "${path.basename(game.executable)}"`);
                return true;
            } catch (e) {
                console.error('Failed to kill game process', e);
                return false;
            }
        }
        return false;
    }

    getWeeklyActivity() {
        // Mock data or implementation using playtime_history table if it exists
        return Array(7).fill(0).map(() => Math.floor(Math.random() * 120));
    }

    toggleFavorite(gameId: string, isFavorite: boolean) {
        const db = getDb();
        db.prepare('UPDATE games SET is_favorite = ? WHERE id = ?').run(isFavorite ? 1 : 0, gameId);
        return true;
    }

    getAverageSessionDuration() {
        // Mock
        return 45; 
    }

    async updateGameDetails(gameId: string, updates: any) {
        const allowedFields = ['description', 'developer', 'publisher', 'genre', 'release_date', 'rating'];
        const sets: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                sets.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (sets.length === 0) return false;

        values.push(gameId);
        const sql = `UPDATE games SET ${sets.join(', ')} WHERE id = ?`;
        await this.dbClient.run(sql, ...values);
        return true;
    }

    updateGameOrder(gameIds: string[]) {
        // Placeholder for manual sorting
        console.log('Updated game order:', gameIds.length);
        return true;
    }

    async getLibraryNews() {
        const games = await this.dbClient.all("SELECT * FROM games WHERE platform = 'steam' ORDER BY last_played DESC LIMIT 10");
        const newsPromises = games.map((game: any) =>
            this.metadataFetcher.fetchGameNews(game.platform_id, 2)
                .then(news => news.map(n => ({
                    ...n,
                    gameTitle: game.title,
                    gameIcon: game.icon_url || game.cover_url
                })))
        );
        const results = await Promise.all(newsPromises);
        return results.flat().sort((a: any, b: any) => b.date - a.date);
    }

    async openPlatform(platform: string) {
        try {
            switch (platform) {
                case 'steam': await shell.openExternal('steam://open/games'); break;
                case 'epic': await shell.openExternal('com.epicgames.launcher://'); break;
                case 'gog': await shell.openExternal('goggalaxy://'); break;
                case 'origin': await shell.openExternal('origin://'); break;
                case 'uplay': await shell.openExternal('uplay://'); break;
                case 'battlenet': await shell.openExternal('battlenet://'); break;
                case 'itch': await shell.openExternal('itch://'); break;
                case 'amazon': await shell.openExternal('amazon-games://'); break;
                default: console.log(`No handler for opening platform ${platform}`);
            }
        } catch (e) {
            console.error(`Failed to open platform ${platform}:`, e);
        }
    }

    async openInstallFolder(gameId: string) {
        const game = await this.dbClient.get('SELECT install_path FROM games WHERE id = ?', gameId) as { install_path: string };
        if (game && game.install_path) {
            await shell.openPath(game.install_path);
            return true;
        }
        throw new Error('Install path not found');
    }

    async createShortcut(gameId: string) {
        const game = await this.dbClient.get('SELECT title, executable, install_path, platform, platform_id FROM games WHERE id = ?', gameId) as any;
        if (!game) throw new Error('Game not found');
        const desktopPath = app.getPath('desktop');
        const shortcutPath = path.join(desktopPath, `${game.title.replace(/[\\/:*?"<>|]/g, '')}.lnk`);
        if (game.executable && game.install_path) {
            const result = shell.writeShortcutLink(shortcutPath, {
                target: path.join(game.install_path, game.executable),
                cwd: game.install_path,
                description: `Launch ${game.title}`,
                icon: path.join(game.install_path, game.executable),
                iconIndex: 0
            });
            if (!result) throw new Error('Failed to create shortcut');
            return true;
        } else if (game.platform === 'steam') {
            const urlShortcutPath = path.join(desktopPath, `${game.title.replace(/[\\/:*?"<>|]/g, '')}.url`);
            const fs = require('fs');
            const content = `[InternetShortcut]\nURL=steam://rungameid/${game.platform_id}\nIconIndex=0\nIconFile=${path.join(process.env.ProgramFiles || 'C:\\Program Files (x86)', 'Steam', 'steam.exe')}`;
            fs.writeFileSync(urlShortcutPath, content);
            return true;
        }
        throw new Error('Cannot create shortcut: missing executable path');
    }

    async installGame(gameId: string) {
        const game = await this.dbClient.get('SELECT platform, platform_id FROM games WHERE id = ?', gameId) as any;
        if (!game) throw new Error('Game not found');
        switch (game.platform) {
            case 'steam': await shell.openExternal(`steam://install/${game.platform_id}`); return true;
            case 'epic': await shell.openExternal(`com.epicgames.launcher://store/product/${game.platform_id}`); return true;
            case 'xbox': await shell.openExternal(`ms-windows-store://pdp/?ProductId=${game.platform_id}`); return true;
            case 'itch': await this.openPlatform('itch'); return false;
            case 'amazon': await this.openPlatform('amazon'); return false;
            default: await this.openPlatform(game.platform); return false;
        }
    }

    async uninstallGame(gameId: string) {
        const game = await this.dbClient.get('SELECT platform, platform_id FROM games WHERE id = ?', gameId) as any;
        if (!game) throw new Error('Game not found');
        switch (game.platform) {
            case 'steam': await shell.openExternal(`steam://uninstall/${game.platform_id}`); break;
            case 'epic': await shell.openExternal('com.epicgames.launcher://'); break;
            default: await shell.openExternal('ms-settings:appsfeatures'); break;
        }
        return true;
    }

    async searchMetadata(title: string) {
        return await this.metadataFetcher.searchMetadata(title);
    }

    async autoDetectEmulators() {
        await this.scanner.emulationService.autoDetectEmulators();
    }

    getEmulators() {
        return this.scanner.emulationService.getEmulators();
    }
}