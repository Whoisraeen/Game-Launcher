import { app, shell } from 'electron';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { getDb } from '../database';
import { SteamLibrary } from './SteamLibrary';
import { EpicLibrary } from './EpicLibrary';
import { PlatformScanner } from './platformScanner';
import { MetadataFetcher } from './metadataFetcher';
import { ProcessManager } from './processManager';
import { PlaytimeTracker } from './playtimeTracker';
import { DiscordManager } from './discordManager';
import { PerformanceService } from './PerformanceService';
import { SettingsManager } from './settingsManager';

export class GameManager {
    private steamLibrary: SteamLibrary;
    private epicLibrary: EpicLibrary;
    private scanner: PlatformScanner;
    private metadataFetcher: MetadataFetcher;
    private processManager: ProcessManager;
    private playtimeTracker: PlaytimeTracker;
    private performanceService?: PerformanceService;

    constructor() {
        this.steamLibrary = new SteamLibrary();
        this.epicLibrary = new EpicLibrary();
        this.scanner = new PlatformScanner();
        this.metadataFetcher = new MetadataFetcher();
        this.processManager = new ProcessManager();
        this.playtimeTracker = new PlaytimeTracker();
    }

    setPerformanceService(service: PerformanceService) {
        this.performanceService = service;
    }

    getAllGames() {
        const db = getDb();
        return db.prepare('SELECT * FROM games').all();
    }

    getGamesPage(page: number, pageSize: number) {
        const db = getDb();
        const offset = (page - 1) * pageSize;
        return db.prepare('SELECT * FROM games LIMIT ? OFFSET ?').all(pageSize, offset);
    }

    async getCollections() {
        const db = getDb();
        try {
            const collections = db.prepare('SELECT * FROM collections').all() as any[];
            
            // Fetch game IDs for each collection
            const collectionsWithGames = collections.map(collection => {
                const games = db.prepare('SELECT game_id FROM collection_games WHERE collection_id = ?').all(collection.id) as any[];
                return {
                    ...collection,
                    gameIds: games.map(g => g.game_id)
                };
            });
            
            return collectionsWithGames;
        } catch (error) {
            console.error('Error fetching collections:', error);
            return [];
        }
    }

    async createCollection(name: string, description?: string) {
        const db = getDb();
        const id = uuidv4();
        const now = Date.now();
        
        try {
            db.prepare('INSERT INTO collections (id, name, description, created_at) VALUES (?, ?, ?, ?)').run(id, name, description || '', now);
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

    async syncLibrary() {
        try {
            const scannedGames = await this.scanner.scanAll();
            console.log(`Found ${scannedGames.length} games from scanner`);

            const db = getDb();

            // Pre-fetch existing games to check for metadata
            const existingGames = db.prepare('SELECT platform, platform_id, genre, cover_url, icon_url, background_url, logo_url, tags, description FROM games').all() as any[];
            const existingMap = new Map(existingGames.map(g => [`${g.platform}:${g.platform_id}`, g]));

            // Enrich with metadata
            console.log('Enriching games with metadata...');
            const enrichedGames = await Promise.all(scannedGames.map(async (game) => {
                const key = `${game.platform}:${game.platformId}`;
                const existing = existingMap.get(key);
                
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

            console.log('Preparing database transaction...');
            const insert = db.prepare(`
                INSERT INTO games (
                    id, title, platform, platform_id, install_path, executable, added_at, is_installed, icon_url, cover_url, background_url, logo_url, genre, tags, achievements_total, achievements_unlocked, video_url
                ) VALUES (
                    @id, @title, @platform, @platformId, @installPath, @executable, @addedAt, @isInstalled, @icon, @cover, @hero, @logo, @genre, @tags, @achievementsTotal, @achievementsUnlocked, @videoUrl
                )
                ON CONFLICT(id) DO UPDATE SET
                    is_installed = @isInstalled,
                    install_path = @installPath,
                    executable = @executable,
                    icon_url = COALESCE(excluded.icon_url, games.icon_url),
                    cover_url = COALESCE(excluded.cover_url, games.cover_url),
                    background_url = COALESCE(excluded.background_url, games.background_url),
                    logo_url = COALESCE(excluded.logo_url, games.logo_url),
                    genre = COALESCE(excluded.genre, games.genre),
                    tags = COALESCE(excluded.tags, games.tags),
                    achievements_total = MAX(excluded.achievements_total, games.achievements_total),
                    video_url = COALESCE(excluded.video_url, games.video_url)
            `);

            const runTransaction = db.transaction((games: any[]) => {
                let insertedCount = 0;
                for (const game of games) {
                    try {
                        insert.run(game);
                        insertedCount++;
                    } catch (err) {
                        console.error(`Failed to insert game ${game.title}:`, err);
                    }
                }
                console.log(`Transaction complete. Processed ${insertedCount} games.`);
            });

            runTransaction(enrichedGames);

            // Auto-merge duplicates after sync
            console.log('Auto-merging duplicates...');
            const mergedCount = await this.autoMergeDuplicates();
            console.log(`Auto-merged ${mergedCount} groups of duplicates.`);

            console.log('Library sync complete');
            return this.getAllGames();
        } catch (error) {
            console.error('Critical error during library sync:', error);
            throw error;
        }
    }

    toggleHidden(gameId: string, isHidden: boolean) {
        const db = getDb();
        db.prepare('UPDATE games SET is_hidden = ? WHERE id = ?').run(isHidden ? 1 : 0, gameId);
        return true;
    }

    updateGameTags(gameId: string, tags: string[]) {
        const db = getDb();
        db.prepare('UPDATE games SET tags = ? WHERE id = ?').run(JSON.stringify(tags), gameId);
        return true;
    }

    updatePlayStatus(gameId: string, status: string) {
        const db = getDb();
        db.prepare('UPDATE games SET play_status = ? WHERE id = ?').run(status, gameId);
        return true;
    }

    updateLaunchOptions(gameId: string, options: string) {
        const db = getDb();
        db.prepare('UPDATE games SET launch_options = ? WHERE id = ?').run(options, gameId);
        return true;
    }

    updateRating(gameId: string, rating: number) {
        const db = getDb();
        db.prepare('UPDATE games SET rating = ? WHERE id = ?').run(rating, gameId);
        return true;
    }

    async mergeGames(primaryGameId: string, secondaryGameId: string) {
        const db = getDb();
        
        // Verify both games exist
        const primary = db.prepare('SELECT * FROM games WHERE id = ?').get(primaryGameId) as any;
        const secondary = db.prepare('SELECT * FROM games WHERE id = ?').get(secondaryGameId) as any;

        if (!primary || !secondary) {
            throw new Error('One or both games not found');
        }

        // Create a group ID (use primary ID or generate new UUID)
        // If primary already has group_id, use it.
        let groupId = primary.group_id;
        if (!groupId) {
            groupId = uuidv4();
            db.prepare('UPDATE games SET group_id = ? WHERE id = ?').run(groupId, primaryGameId);
        }

        // Set secondary game's group_id to match
        db.prepare('UPDATE games SET group_id = ? WHERE id = ?').run(groupId, secondaryGameId);
        
        return true;
    }

    async unmergeGame(gameId: string) {
        const db = getDb();
        db.prepare('UPDATE games SET group_id = NULL WHERE id = ?').run(gameId);
        return true;
    }

    // New method to auto-merge duplicates based on title
    async autoMergeDuplicates() {
        const db = getDb();
        const games = this.getAllGames() as any[];
        
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
                    db.prepare('UPDATE games SET group_id = ? WHERE id = ?').run(groupId, primary.id);
                }

                // Link others
                for (const game of group) {
                    if (game.id !== primary.id) {
                        // Only update if not already in a DIFFERENT group
                        if (game.group_id !== groupId) {
                            db.prepare('UPDATE games SET group_id = ? WHERE id = ?').run(groupId, game.id);
                            mergedCount++;
                        }
                    }
                }
            }
        }
        
        return mergedCount;
    }

    updateUserNotes(gameId: string, notes: string) {
        const db = getDb();
        db.prepare('UPDATE games SET user_notes = ? WHERE id = ?').run(notes, gameId);
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
                }
            }, 5000);
        } else {
            console.warn(`Process ${processName} failed to start or could not be detected.`);
            DiscordManager.getInstance().setIdle();
        }
    }

    async launchGame(gameId: string) {
        const db = getDb();
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any;

        if (!game) {
            throw new Error('Game not found');
        }

        console.log(`Launching game: ${game.title} (${game.platform})`);

        // Update last_played
        db.prepare('UPDATE games SET last_played = ? WHERE id = ?').run(Date.now(), gameId);

        // Set Discord Activity
        DiscordManager.getInstance().setActivity(game.title, 'Playing');
        
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
        const db = getDb();
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
        db.prepare(sql).run(...values);
        return true;
    }

    updateGameOrder(gameIds: string[]) {
        // Placeholder for manual sorting
        console.log('Updated game order:', gameIds.length);
        return true;
    }

    async getLibraryNews() {
        const db = getDb();
        const games = db.prepare("SELECT * FROM games WHERE platform = 'steam' ORDER BY last_played DESC LIMIT 10").all();
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
        const db = getDb();
        const game = db.prepare('SELECT install_path FROM games WHERE id = ?').get(gameId) as { install_path: string };
        if (game && game.install_path) {
            await shell.openPath(game.install_path);
            return true;
        }
        throw new Error('Install path not found');
    }

    async createShortcut(gameId: string) {
        const db = getDb();
        const game = db.prepare('SELECT title, executable, install_path, platform, platform_id FROM games WHERE id = ?').get(gameId) as any;
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
        const db = getDb();
        const game = db.prepare('SELECT platform, platform_id FROM games WHERE id = ?').get(gameId) as any;
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
        const db = getDb();
        const game = db.prepare('SELECT platform, platform_id FROM games WHERE id = ?').get(gameId) as any;
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