import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import chokidar from 'chokidar';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { getDb } from '../database';
import { SupabaseService } from './supabaseService';

interface SaveConfig {
    gameId: string;
    path: string; // The folder to watch
    autoBackup: boolean;
    lastBackup?: number;
}

interface BackupEntry {
    id: string;
    gameId: string;
    filename: string;
    timestamp: number;
    size: number;
    path: string;
}

export class SaveManagerService {
    private configPath: string;
    private backupsRoot: string;
    private configs: SaveConfig[] = [];
    private watchers: Map<string, any> = new Map();
    private cloudPath: string | null = null;
    private cloudSyncEnabled: boolean = false;
    private supabaseService: SupabaseService | null = null;

    constructor() {
        const userData = (app && app.getPath) ? app.getPath('userData') : '.';
        this.configPath = path.join(userData, 'save_manager_config.json');
        this.backupsRoot = path.join(userData, 'backups');
        
        if (!fs.existsSync(this.backupsRoot)) {
            fs.mkdirSync(this.backupsRoot, { recursive: true });
        }

        this.loadConfig();
        this.initWatchers();
    }

    public setSupabaseService(service: SupabaseService) {
        this.supabaseService = service;
    }

    private loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                this.configs = data.configs || [];
                this.cloudPath = data.cloudPath || null;
                this.cloudSyncEnabled = data.cloudSyncEnabled || false;
            }
        } catch (e) {
            console.error('Failed to load save config', e);
            this.configs = [];
        }
    }

    private saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify({
                configs: this.configs,
                cloudPath: this.cloudPath,
                cloudSyncEnabled: this.cloudSyncEnabled
            }, null, 2));
        } catch (e) {
            console.error('Failed to save save config', e);
        }
    }

    private initWatchers() {
        // Clear existing
        this.watchers.forEach(w => w.close());
        this.watchers.clear();

        // Setup new
        this.configs.forEach(cfg => {
            if (cfg.autoBackup && fs.existsSync(cfg.path)) {
                this.startWatcher(cfg);
            }
        });
    }

    private startWatcher(config: SaveConfig) {
        if (this.watchers.has(config.gameId)) return;

        console.log(`Starting save watcher for ${config.gameId} at ${config.path}`);
        
        // Watch for changes, ignore initial add events
        const watcher = chokidar.watch(config.path, {
            ignored: /(^|[\]\/])\..*/, // ignore dotfiles
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 2000, // Wait 2s after write finishes
                pollInterval: 100
            }
        });

        watcher.on('all', (event, path) => {
            console.log(`Save file changed (${event}): ${path}`);
            // Trigger backup with debounce
            this.scheduleBackup(config.gameId);
        });

        this.watchers.set(config.gameId, watcher);
    }

    // Debounce backups to avoid spamming during a save operation that touches multiple files
    private backupTimers: Map<string, NodeJS.Timeout> = new Map();

    private scheduleBackup(gameId: string) {
        if (this.backupTimers.has(gameId)) {
            clearTimeout(this.backupTimers.get(gameId));
        }

        const timer = setTimeout(() => {
            console.log(`Executing auto-backup for ${gameId}`);
            this.createBackup(gameId, true);
            this.backupTimers.delete(gameId);
        }, 5000); // 5 second debounce

        this.backupTimers.set(gameId, timer);
    }

    // --- Heuristic Detection ---

    public detectSavePath(gameTitle: string, developer?: string): string | null {
        const home = app.getPath('home');
        const docs = app.getPath('documents'); // My Documents
        const appData = app.getPath('appData'); // Roaming
        const localAppData = path.join(home, 'AppData', 'Local');
        const localLow = path.join(home, 'AppData', 'LocalLow');
        const savedGames = path.join(app.getPath('home'), 'Saved Games'); // User Profile/Saved Games

        // Clean title for regex/matching
        const cleanTitle = gameTitle.replace(/[^\w\s]/gi, '').trim();
        
        // Common locations to check
        const candidates = [
            path.join(docs, 'My Games', gameTitle),
            path.join(docs, 'My Games', cleanTitle),
            path.join(docs, gameTitle),
            path.join(docs, cleanTitle),
            path.join(localAppData, gameTitle),
            path.join(localAppData, cleanTitle),
            path.join(localLow, gameTitle),
            path.join(localLow, cleanTitle),
            path.join(appData, gameTitle),
            path.join(appData, cleanTitle),
            path.join(savedGames, gameTitle),
            path.join(savedGames, cleanTitle)
        ];

        // If developer provided, check Developer/Game structure
        if (developer) {
            const cleanDev = developer.replace(/[^\w\s]/gi, '').trim();
            candidates.push(
                path.join(localAppData, developer, gameTitle),
                path.join(localAppData, cleanDev, cleanTitle),
                path.join(docs, 'My Games', developer, gameTitle),
                path.join(docs, developer, gameTitle)
            );
        }

        // Check STEAM userdata if possible (heuristic)
        // C:\Program Files (x86)\Steam\userdata\<user_id>\<app_id>
        // This requires knowing the steam AppID which we might have in the game object passed in, 
        // but for now let's stick to generic folder scanning.

        for (const p of candidates) {
            if (fs.existsSync(p)) {
                // Check if it looks like a save folder (contains files)
                try {
                    if (fs.readdirSync(p).length > 0) return p;
                } catch (e) {}
            }
        }

        return null;
    }

    public getTotalBackupSize(gameId: string): number {
        const backups = this.getBackups(gameId);
        return backups.reduce((acc, curr) => acc + curr.size, 0);
    }

    // --- Public API ---

    public getConfigs() {
        return this.configs;
    }

    public setCloudPath(path: string) {
        this.cloudPath = path;
        this.saveConfig();
    }

    public getCloudPath() {
        return this.cloudPath;
    }

    public async addGamePath(gameId: string, folderPath: string) {
        if (!fs.existsSync(folderPath)) throw new Error('Path does not exist');

        const existing = this.configs.find(c => c.gameId === gameId);
        if (existing) {
            existing.path = folderPath;
            existing.autoBackup = true;
        } else {
            this.configs.push({
                gameId,
                path: folderPath,
                autoBackup: true
            });
        }
        
        this.saveConfig();
        
        // Restart watcher for this game
        const cfg = this.configs.find(c => c.gameId === gameId);
        if (cfg) {
            if (this.watchers.has(gameId)) {
                await this.watchers.get(gameId)?.close();
                this.watchers.delete(gameId);
            }
            this.startWatcher(cfg);
        }
    }

    public removeGamePath(gameId: string) {
        this.configs = this.configs.filter(c => c.gameId !== gameId);
        if (this.watchers.has(gameId)) {
            this.watchers.get(gameId)?.close();
            this.watchers.delete(gameId);
        }
        this.saveConfig();
    }

    public setCloudSyncEnabled(enabled: boolean) {
        this.cloudSyncEnabled = enabled;
        this.saveConfig();
    }

    public getCloudSyncEnabled() {
        return this.cloudSyncEnabled;
    }

    public async createBackup(gameId: string, isAuto: boolean = false): Promise<BackupEntry | null> {
        const config = this.configs.find(c => c.gameId === gameId);
        if (!config || !fs.existsSync(config.path)) return null;

        const timestamp = Date.now();
        const filename = `${gameId}_${timestamp}_${isAuto ? 'auto' : 'manual'}.zip`;
        
        // Determine destination: Cloud path if set, otherwise local backup folder
        const destDir = this.cloudPath 
            ? path.join(this.cloudPath, 'RaeenBackups', gameId)
            : path.join(this.backupsRoot, gameId);

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const destPath = path.join(destDir, filename);
        const output = fs.createWriteStream(destPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', async () => {
                const stats = fs.statSync(destPath);
                config.lastBackup = timestamp;
                this.saveConfig();
                
                // Cloud Sync (Supabase)
                if (this.cloudSyncEnabled && this.supabaseService && this.supabaseService.isAuthenticated()) {
                    try {
                        const db = getDb();
                        const game = db.prepare('SELECT title, platform FROM games WHERE id = ?').get(gameId) as any;
                        if (game) {
                            console.log(`Uploading backup for ${game.title} to Supabase...`);
                            await this.supabaseService.uploadSaveGame(gameId, game.title, game.platform, destPath);
                        }
                    } catch (err) {
                        console.error('Failed to upload backup to Supabase:', err);
                    }
                }

                resolve({
                    id: uuidv4(),
                    gameId,
                    filename,
                    timestamp,
                    size: stats.size,
                    path: destPath
                });
            });

            archive.on('warning', (err: any) => {
                if (err.code === 'ENOENT') {
                    console.warn('Archiver warning:', err);
                } else {
                    reject(err);
                }
            });

            archive.on('error', (err: any) => reject(err));

            archive.pipe(output);
            archive.directory(config.path, false);
            archive.finalize();
        });
    }

    public getBackups(gameId: string): BackupEntry[] {
        const dirsToCheck = [path.join(this.backupsRoot, gameId)];
        if (this.cloudPath) {
            dirsToCheck.push(path.join(this.cloudPath, 'RaeenBackups', gameId));
        }

        const backups: BackupEntry[] = [];

        dirsToCheck.forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir).filter(f => f.endsWith('.zip'));
                files.forEach(f => {
                    try {
                        const fullPath = path.join(dir, f);
                        const stats = fs.statSync(fullPath);
                        // Parse timestamp from filename: gameId_timestamp_type.zip
                        const parts = f.split('_');
                        if (parts.length >= 2) {
                            const ts = parseInt(parts[parts.length - 2]);
                            if (!isNaN(ts)) {
                                backups.push({
                                    id: f, // use filename as ID
                                    gameId,
                                    filename: f,
                                    timestamp: ts,
                                    size: stats.size,
                                    path: fullPath
                                });
                            }
                        }
                    } catch (e) {
                        // ignore invalid files
                    }
                });
            }
        });

        // Sort descending
        return backups.sort((a, b) => b.timestamp - a.timestamp);
    }

    public async restoreBackup(backupPath: string, targetPath: string): Promise<void> {
        if (!fs.existsSync(backupPath)) throw new Error('Backup file not found');
        
        // Ensure target exists
        if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

        // Extract
        await fs.createReadStream(backupPath)
            .pipe(unzipper.Extract({ path: targetPath }))
            .promise();
            
        console.log(`Restored backup ${backupPath} to ${targetPath}`);
    }
}
