import { PlatformScanner } from './platformScanner';
import { PlaytimeTracker } from './playtimeTracker';
import { MetadataFetcher } from './metadataFetcher';
import { ProcessManager } from './processManager';
import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import path from 'path';
import { shell, app } from 'electron';
import { SteamLibrary } from './SteamLibrary';
import { EpicLibrary } from './EpicLibrary';

export class GameManager {
    private scanner: PlatformScanner;
    private playtimeTracker: PlaytimeTracker;
    private metadataFetcher: MetadataFetcher;
    private processManager: ProcessManager;
    private steamLibrary: SteamLibrary;
    private epicLibrary: EpicLibrary;

    constructor() {
        this.scanner = new PlatformScanner();
        this.playtimeTracker = new PlaytimeTracker();
        this.metadataFetcher = new MetadataFetcher();
        this.processManager = new ProcessManager();
        this.steamLibrary = new SteamLibrary();
        this.epicLibrary = new EpicLibrary();
    }

    async syncLibrary() {
        console.log('Starting library sync...');
        try {
            const scannedGames = await this.scanner.scanAll();
            console.log(`Found ${scannedGames.length} games from scanner`);

            const db = getDb();

            // Pre-fetch existing games to check for metadata
            const existingGames = db.prepare('SELECT platform, platform_id, genre, cover_url FROM games').all() as any[];
            const existingMap = new Map(existingGames.map(g => [`${g.platform}:${g.platform_id}`, g]));

            // Enrich with metadata
            console.log('Enriching games with metadata...');
            const enrichedGames = await Promise.all(scannedGames.map(async (game) => {
                const key = `${game.platform}:${game.platformId}`;
                const existing = existingMap.get(key);

                let metadata: any = null;

                // Check if we need to fetch metadata
                // 1. Steam: If we don't have genre
                // 2. Others: If we don't have cover
                const needsGenre = !existing?.genre;
                const needsCover = !game.cover && !existing?.cover_url;

                if (needsGenre || needsCover) {
                    if (game.platform === 'steam') {
                        // For Steam, we want genres even if we have cover
                        if (needsGenre) {
                            metadata = await this.metadataFetcher.fetchSteamMetadata(game.platformId);
                        }
                    } else if (needsCover) {
                        // For others, primarily want cover
                        metadata = await this.metadataFetcher.fetchMetadata(game.title);
                    }
                }

                const result: any = { ...game };

                if (metadata) {
                    result.cover = game.cover || metadata.cover;
                    result.hero = metadata.hero;
                    result.logo = metadata.logo;
                    result.genre = metadata.genres?.[0]; // Primary genre
                    result.tags = metadata.genres ? JSON.stringify(metadata.genres) : null;
                    result.achievementsTotal = metadata.achievementsTotal || 0;
                } else {
                    // Preserve existing if we didn't fetch new
                    result.genre = existing?.genre;
                    result.achievementsTotal = existing?.achievements_total || 0;
                }

                return result;
            }));

            console.log('Preparing database transaction...');
            const insert = db.prepare(`
          INSERT INTO games (
            id, title, platform, platform_id, install_path, executable, added_at, is_installed, icon_url, cover_url, background_url, logo_url, genre, tags, achievements_total, achievements_unlocked
          ) VALUES (
            @id, @title, @platform, @platformId, @installPath, @executable, @addedAt, 1, @icon, @cover, @hero, @logo, @genre, @tags, @achievementsTotal, @achievementsUnlocked
          )
          ON CONFLICT(id) DO UPDATE SET
            is_installed = 1,
            install_path = @installPath,
            executable = @executable,
            icon_url = @icon,
            cover_url = COALESCE(excluded.cover_url, games.cover_url),
            background_url = COALESCE(excluded.background_url, games.background_url),
            logo_url = COALESCE(excluded.logo_url, games.logo_url),
            genre = COALESCE(excluded.genre, games.genre),
            tags = COALESCE(excluded.tags, games.tags),
            achievements_total = MAX(excluded.achievements_total, games.achievements_total)
        `);

            // We need to check if game already exists by platform_id and platform
            const check = db.prepare('SELECT id FROM games WHERE platform = ? AND platform_id = ?');

            const runTransaction = db.transaction((games: any[]) => {
                let insertedCount = 0;
                for (const game of games) {
                    const existing = check.get(game.platform, game.platformId) as { id: string } | undefined;

                    try {
                        insert.run({
                            id: existing ? existing.id : uuidv4(),
                            title: game.title,
                            platform: game.platform,
                            platformId: game.platformId,
                            installPath: game.installPath,
                            executable: game.executable || null,
                            addedAt: Date.now(),
                            icon: game.icon || null,
                            cover: game.cover || null,
                            hero: game.hero || null,
                            logo: game.logo || null,
                            genre: game.genre || null,
                            tags: game.tags || null,
                            achievementsTotal: game.achievementsTotal || 0,
                            achievementsUnlocked: 0 // Default to 0 for now
                        });
                        insertedCount++;
                    } catch (err) {
                        console.error(`Failed to insert game ${game.title}:`, err);
                    }
                }
                console.log(`Transaction complete. Processed ${insertedCount} games.`);
            });

            runTransaction(enrichedGames);

            console.log('Library sync complete');
            // Return all games from DB to ensure consistent IDs and fields
            const allGames = this.getAllGames();
            console.log(`Returning ${allGames.length} games to frontend`);
            return allGames;
        } catch (error) {
            console.error('Critical error during library sync:', error);
            throw error;
        }
    }

    // Collection Management
    getCollections() {
        const db = getDb();
        const collections = db.prepare('SELECT * FROM collections ORDER BY name ASC').all() as any[];

        // For each collection, get the game IDs
        const result = collections.map(col => {
            const games = db.prepare('SELECT game_id FROM collection_games WHERE collection_id = ?').all(col.id) as { game_id: string }[];
            return {
                ...col,
                gameIds: games.map(g => g.game_id)
            };
        });

        return result;
    }

    createCollection(name: string, description?: string) {
        const db = getDb();
        const id = uuidv4();
        const createdAt = Date.now();

        db.prepare('INSERT INTO collections (id, name, description, created_at) VALUES (?, ?, ?, ?)').run(id, name, description || null, createdAt);

        return { id, name, description, createdAt, gameIds: [] };
    }

    deleteCollection(id: string) {
        const db = getDb();
        // Cascading delete should handle collection_games due to FOREIGN KEY ON DELETE CASCADE
        // But let's be safe or rely on schema. Schema has ON DELETE CASCADE.
        db.prepare('DELETE FROM collections WHERE id = ?').run(id);
        return true;
    }

    addGameToCollection(collectionId: string, gameId: string) {
        const db = getDb();
        try {
            db.prepare('INSERT INTO collection_games (collection_id, game_id, added_at) VALUES (?, ?, ?)').run(collectionId, gameId, Date.now());
            return true;
        } catch (e) {
            // Ignore unique constraint violations (already in collection)
            return false;
        }
    }

    removeGameFromCollection(collectionId: string, gameId: string) {
        const db = getDb();
        db.prepare('DELETE FROM collection_games WHERE collection_id = ? AND game_id = ?').run(collectionId, gameId);
        return true;
    }

    getAllGames() {
        const db = getDb();
        return db.prepare('SELECT * FROM games ORDER BY sort_order ASC, title ASC').all();
    }

    getWeeklyActivity() {
        const db = getDb();
        // Get sessions from last 7 days
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        const sessions = db.prepare(`
          SELECT 
              start_time, 
              duration_seconds 
          FROM playtime_sessions 
          WHERE start_time >= ?
      `).all(sevenDaysAgo) as { start_time: number, duration_seconds: number }[];

        // Group by day of week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const activity = days.map(day => ({ name: day, hours: 0 }));

        for (const session of sessions) {
            const date = new Date(session.start_time);
            const dayIndex = date.getDay(); // 0 is Sunday
            // duration is in seconds, convert to hours
            const hours = (session.duration_seconds || 0) / 3600;
            activity[dayIndex].hours += hours;
        }

        // Rotate array so today is last? Or just return Sun-Sat? 
        // User mock data was Mon-Sun. Let's stick to standard order or last 7 days relative to today.
        // Mock data: Mon, Tue, Wed...
        // Let's reorder to match "last 7 days" ending with today, or just Mon-Sun. 
        // If we use Mon-Sun fixed, it's easier for charts.

        // Let's just return Mon-Sun order (shifting Sunday to end if needed, or keeping standard)
        // Mock data was Mon-Sun.
        const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const orderedActivity = orderedDays.map(day => {
            const found = activity.find(a => a.name === day);
            return found || { name: day, hours: 0 };
        });

        return orderedActivity;
    }

    getAverageSessionDuration() {
        const db = getDb();
        // Calculate average duration of all sessions in hours
        const result = db.prepare('SELECT AVG(duration_seconds) as avg_duration FROM playtime_sessions WHERE duration_seconds > 60').get() as { avg_duration: number };

        const avgSeconds = result.avg_duration || 0;
        const avgHours = avgSeconds / 3600;

        // Return rounded to 1 decimal
        return Math.round(avgHours * 10) / 10;
    }

    toggleFavorite(gameId: string, isFavorite: boolean) {
        const db = getDb();
        db.prepare('UPDATE games SET is_favorite = ? WHERE id = ?').run(isFavorite ? 1 : 0, gameId);
        return true;
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

    updateUserNotes(gameId: string, notes: string) {
        const db = getDb();
        db.prepare('UPDATE games SET user_notes = ? WHERE id = ?').run(notes, gameId);
        return true;
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

        const launchOptions = game.launch_options || '';

        try {
            switch (game.platform) {
                case 'steam':
                    // Use new SteamLibrary helper
                    await shell.openExternal(this.steamLibrary.getLaunchCommand(game.platform_id));
                    break;
                case 'epic':
                    // Use new EpicLibrary helper
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
                    // Use the platform scanner to get the launch command
                    const launchCommand = this.scanner.getLaunchCommand(game.platform, game.platform_id);

                    if (launchCommand) {
                        console.log(`Launching ${game.title} via URI: ${launchCommand}`);
                        await shell.openExternal(launchCommand);
                    } else if (game.executable) {
                        // Fallback to direct executable launch
                        const execPath = path.join(game.install_path, game.executable);
                        console.log(`Launching ${game.title} via executable: ${execPath}`);
                        const command = `"${execPath}" ${launchOptions}`;
                        exec(command, { cwd: game.install_path });
                    } else {
                        throw new Error(`Cannot launch game: No executable or launch URI found for ${game.title}`);
                    } break;
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
                    // Riot games return a full command string from getLaunchCommand
                    const riotCommand = this.scanner.getLaunchCommand('riot', game.platform_id);
                    if (riotCommand) {
                        console.log(`Launching Riot game: ${riotCommand}`);
                        exec(riotCommand);
                    }
                    break;
                case 'emulated':
                    const launchInfo = this.scanner.emulationService.getLaunchCommand(game.platform_id);
                    if (launchInfo) {
                        console.log(`Launching Emulated game: ${launchInfo.command}`);
                        exec(launchInfo.command, { cwd: launchInfo.cwd });
                    } else {
                        throw new Error(`Cannot launch emulated game: Configuration not found for ${game.title}`);
                    }
                    break;
                case 'battlenet':
                    await shell.openExternal(`battlenet://${game.platform_id}`);
                    break;
                default:
                    if (game.executable) {
                        const execPath = path.join(game.install_path, game.executable);
                        // Use execFile for better security/handling if possible, but exec is flexible for args
                        const command = `"${execPath}" ${launchOptions}`;
                        console.log(`Executing: ${command} in ${game.install_path}`);
                        exec(command, { cwd: game.install_path });
                    } else {
                        throw new Error(`Cannot launch game: No executable found for ${game.title}`);
                    }
                    break;
            }

            // Start tracking playtime if executable is known
            if (game.executable) {
                // Give it a moment to start
                setTimeout(async () => {
                    this.playtimeTracker.startTracking(gameId, game.executable);
                    
                    // Game Mode Optimization
                    // Try to find the process
                    try {
                        const processList = await this.processManager.getProcessList();
                        const gameProcess = processList.find(p => p.name.toLowerCase() === game.executable.toLowerCase());
                        
                        if (gameProcess) {
                            console.log(`Found game process PID: ${gameProcess.pid}. Optimizing...`);
                            const actions = await this.processManager.optimizeSystem(gameProcess.pid);
                            console.log('Optimization actions:', actions);
                        } else {
                            console.log('Could not find game process for optimization.');
                        }
                    } catch (optError) {
                        console.error('Error during game optimization:', optError);
                    }

                }, 5000);
            }

        } catch (error) {
            console.error('Launch failed:', error);
            // Fallback to executable if protocol fails and we have one
            if (game.executable && game.platform !== 'steam') { // Steam usually doesn't have direct exe launch without Steam running
                console.log('Attempting fallback to direct executable launch...');
                const execPath = path.join(game.install_path, game.executable);
                exec(`"${execPath}"`, { cwd: game.install_path });

                // Start tracking
                setTimeout(() => {
                    this.playtimeTracker.startTracking(gameId, game.executable);
                }, 5000);

            } else {
                throw error;
            }
        }

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

        // For platform games, we might want to create a URL shortcut or a shortcut to the launcher
        // But for now, let's try to create a shortcut to the executable if it exists
        if (game.executable && game.install_path) {
            const result = shell.writeShortcutLink(shortcutPath, {
                target: path.join(game.install_path, game.executable),
                cwd: game.install_path,
                description: `Launch ${game.title}`,
                icon: path.join(game.install_path, game.executable), // Try to use exe icon
                iconIndex: 0
            });
            if (!result) throw new Error('Failed to create shortcut');
            return true;
        } else if (game.platform === 'steam') {
            // Create a URL shortcut for Steam
            const urlShortcutPath = path.join(desktopPath, `${game.title.replace(/[\\/:*?"<>|]/g, '')}.url`);
            // Node's fs to write .url file
            const fs = require('fs');
            const content = `[InternetShortcut]\nURL=steam://rungameid/${game.platform_id}\nIconIndex=0\nIconFile=${path.join(process.env.ProgramFiles || 'C:\\Program Files (x86)', 'Steam', 'steam.exe')}`;
            fs.writeFileSync(urlShortcutPath, content);
            return true;
        }

        throw new Error('Cannot create shortcut: missing executable path');
    }

    async uninstallGame(gameId: string) {
        const db = getDb();
        const game = db.prepare('SELECT platform, platform_id FROM games WHERE id = ?').get(gameId) as any;

        if (!game) throw new Error('Game not found');

        switch (game.platform) {
            case 'steam':
                await shell.openExternal(`steam://uninstall/${game.platform_id}`);
                break;
            case 'epic':
                // Epic doesn't have a direct uninstall URI, open launcher
                await shell.openExternal('com.epicgames.launcher://');
                break;
            default:
                // Open Windows "Apps & Features"
                await shell.openExternal('ms-settings:appsfeatures');
                break;
        }
        return true;
    }

    async updateGameDetails(gameId: string, updates: any) {
        const db = getDb();

        // Construct the UPDATE query dynamically
        const fields: string[] = [];
        const values: any[] = [];

        // Map frontend fields to database columns if necessary
        // Assuming Game interface matches DB columns mostly
        const allowedFields = [
            'title', 'description', 'genre', 'developer', 'publisher',
            'releaseDate', 'cover', 'heroImage', 'logo', 'icon',
            'rating', 'userNotes', 'playStatus', 'isHidden', 'isFavorite',
            'install_path', 'executable', 'launchOptions'
        ];

        for (const [key, value] of Object.entries(updates)) {
            // Handle specific field mappings if needed
            let dbField = key;
            if (key === 'installPath') dbField = 'install_path';
            if (key === 'heroImage') dbField = 'background_url';
            if (key === 'cover') dbField = 'cover_url';
            if (key === 'logo') dbField = 'logo_url';
            if (key === 'icon') dbField = 'icon_url';

            if (allowedFields.includes(dbField) || allowedFields.includes(key)) {
                fields.push(`${dbField} = ?`);
                values.push(value);
            }
        }

        // Handle tags separately as they are likely in a separate table or stored as JSON string
        // For this implementation, let's assume we might store them as JSON in a 'tags' column 
        // OR we have a separate tags table. 
        // Looking at previous code, tags seem to be handled by `updateTags` which might be separate.
        // Let's check if `games` table has a `tags` column. 
        // If not, we should probably stick to the separate `updateTags` method for tags.
        // But for simplicity, let's assume we can update other fields here.

        if (fields.length === 0) return false;

        values.push(gameId);
        const query = `UPDATE games SET ${fields.join(', ')} WHERE id = ?`;

        try {
            db.prepare(query).run(...values);
            return true;
        } catch (error) {
            console.error('Failed to update game details:', error);
            throw error;
        }
    }

    updateGameOrder(gameIds: string[]) {
        const db = getDb();
        const update = db.prepare('UPDATE games SET sort_order = ? WHERE id = ?');

        const transaction = db.transaction((ids: string[]) => {
            for (let i = 0; i < ids.length; i++) {
                update.run(i, ids[i]);
            }
        });

        try {
            transaction(gameIds);
            return true;
        } catch (error) {
            console.error('Failed to update game order:', error);
            throw error;
        }
    }
}
