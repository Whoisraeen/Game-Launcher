import { getDb } from '../database';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface GameUpdate {
  id: string;
  gameId: string;
  gameName: string;
  platform: string;
  version: string;
  newVersion: string;
  releaseNotes?: string;
  updateSize?: string; // e.g., "2.5 GB"
  detectedAt: number;
  status: 'pending' | 'downloading' | 'downloaded' | 'installed' | 'failed';
  priority: 'critical' | 'high' | 'normal' | 'low';
  autoUpdate: boolean;
  progress?: number; // 0-100
  downloadSpeed?: string;
  estimatedTime?: string;
}

export interface UpdateCheckResult {
  hasUpdates: boolean;
  updates: GameUpdate[];
  lastChecked: number;
}

export class UpdateManagerService {
  private checkInterval: NodeJS.Timeout | null = null;
  private updateCallbacks: Map<string, (update: GameUpdate) => void> = new Map();

  constructor() {
    this.startAutoCheck();
  }

  /**
   * Start automatic update checking (every 6 hours)
   */
  startAutoCheck() {
    // Check immediately on start
    this.checkForUpdates();

    // Then check every 6 hours
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  /**
   * Stop automatic update checking
   */
  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check for updates across all installed games
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const db = getDb();
    const games = db.prepare(`
      SELECT id, title, platform, platform_id, install_path, executable
      FROM games
      WHERE is_installed = 1
    `).all() as any[];

    const updates: GameUpdate[] = [];

    for (const game of games) {
      try {
        const update = await this.checkGameUpdate(game);
        if (update) {
          updates.push(update);
          this.saveUpdate(update);
        }
      } catch (error) {
        console.error(`Failed to check update for ${game.title}:`, error);
      }
    }

    return {
      hasUpdates: updates.length > 0,
      updates,
      lastChecked: Date.now()
    };
  }

  /**
   * Check for update for a specific game
   */
  private async checkGameUpdate(game: any): Promise<GameUpdate | null> {
    switch (game.platform.toLowerCase()) {
      case 'steam':
        return await this.checkSteamUpdate(game);
      case 'epic':
        return await this.checkEpicUpdate(game);
      case 'gog':
        return await this.checkGOGUpdate(game);
      default:
        return await this.checkGenericUpdate(game);
    }
  }

  /**
   * Check Steam game for updates
   */
  private async checkSteamUpdate(game: any): Promise<GameUpdate | null> {
    try {
      // Check Steam manifest file for version info
      const steamPath = this.getSteamPath();
      if (!steamPath) return null;

      const manifestPath = path.join(
        steamPath,
        'steamapps',
        `appmanifest_${game.platform_id}.acf`
      );

      const manifestContent = await fs.readFile(manifestPath, 'utf-8');

      // Parse ACF file (Valve's KeyValue format)
      const buildIdMatch = manifestContent.match(/"buildid"\s+"(\d+)"/);
      const sizeMatch = manifestContent.match(/"SizeOnDisk"\s+"(\d+)"/);
      const updateMatch = manifestContent.match(/"StateFlags"\s+"(\d+)"/);

      if (!buildIdMatch) return null;

      const currentBuildId = buildIdMatch[1];

      // Check if StateFlags indicates update available (flag 4 = UpdateRequired)
      const stateFlags = updateMatch ? parseInt(updateMatch[1]) : 0;
      const needsUpdate = (stateFlags & 4) !== 0;

      if (needsUpdate) {
        const updateSize = sizeMatch ? this.formatBytes(parseInt(sizeMatch[1])) : undefined;

        return {
          id: `update_${game.id}_${Date.now()}`,
          gameId: game.id,
          gameName: game.title,
          platform: game.platform,
          version: currentBuildId,
          newVersion: 'Latest', // Steam doesn't expose new version in manifest
          detectedAt: Date.now(),
          status: 'pending',
          priority: 'normal',
          autoUpdate: false,
          updateSize
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to check Steam update:', error);
      return null;
    }
  }

  /**
   * Check Epic Games for updates
   */
  private async checkEpicUpdate(game: any): Promise<GameUpdate | null> {
    try {
      // Epic Games Store manifest location
      const epicPath = path.join(
        process.env.PROGRAMDATA || 'C:\\ProgramData',
        'Epic',
        'EpicGamesLauncher',
        'Data',
        'Manifests'
      );

      const files = await fs.readdir(epicPath);
      const manifestFile = files.find(f => f.endsWith('.item'));

      if (!manifestFile) return null;

      const manifestContent = await fs.readFile(
        path.join(epicPath, manifestFile),
        'utf-8'
      );

      const manifest = JSON.parse(manifestContent);

      // Check if update is needed (Epic stores this differently)
      if (manifest.bNeedsUpdate || manifest.bIsIncompleteInstall) {
        return {
          id: `update_${game.id}_${Date.now()}`,
          gameId: game.id,
          gameName: game.title,
          platform: game.platform,
          version: manifest.AppVersionString || 'Unknown',
          newVersion: 'Latest',
          detectedAt: Date.now(),
          status: 'pending',
          priority: 'normal',
          autoUpdate: false
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to check Epic update:', error);
      return null;
    }
  }

  /**
   * Check GOG game for updates
   */
  private async checkGOGUpdate(game: any): Promise<GameUpdate | null> {
    try {
      // GOG Galaxy stores game info in registry and local files
      // For simplicity, we'll check the local gameinfo file
      if (!game.install_path) return null;

      const gameinfoPath = path.join(game.install_path, 'goggame-*.info');

      // This would require more complex logic to actually check GOG's CDN
      // For now, return null (placeholder for future implementation)
      return null;
    } catch (error) {
      console.error('Failed to check GOG update:', error);
      return null;
    }
  }

  /**
   * Generic update check based on executable modification time
   */
  private async checkGenericUpdate(game: any): Promise<GameUpdate | null> {
    try {
      if (!game.executable || !game.install_path) return null;

      const exePath = path.join(game.install_path, game.executable);
      const stats = await fs.stat(exePath);

      // Check if executable was modified in the last 24 hours
      // This is a very rough heuristic
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (stats.mtimeMs > dayAgo) {
        return {
          id: `update_${game.id}_${Date.now()}`,
          gameId: game.id,
          gameName: game.title,
          platform: game.platform,
          version: 'Unknown',
          newVersion: 'Detected',
          detectedAt: Date.now(),
          status: 'pending',
          priority: 'low',
          autoUpdate: false,
          releaseNotes: 'Update detected based on file modification time'
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Steam installation path
   */
  private getSteamPath(): string | null {
    const possiblePaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Steam'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Steam')
    ];

    for (const steamPath of possiblePaths) {
      try {
        if (require('fs').existsSync(steamPath)) {
          return steamPath;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  /**
   * Trigger update for a game
   */
  async triggerUpdate(updateId: string): Promise<boolean> {
    const update = this.getUpdate(updateId);
    if (!update) return false;

    try {
      this.updateStatus(updateId, 'downloading', 0);

      switch (update.platform.toLowerCase()) {
        case 'steam':
          return await this.triggerSteamUpdate(update);
        case 'epic':
          return await this.triggerEpicUpdate(update);
        case 'gog':
          return await this.triggerGOGUpdate(update);
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to trigger update:', error);
      this.updateStatus(updateId, 'failed');
      return false;
    }
  }

  /**
   * Trigger Steam update by opening Steam protocol
   */
  private async triggerSteamUpdate(update: GameUpdate): Promise<boolean> {
    try {
      const db = getDb();
      const game = db.prepare('SELECT platform_id FROM games WHERE id = ?').get(update.gameId) as any;

      if (!game || !game.platform_id) return false;

      // Open Steam to the game page which will trigger update
      const { exec } = require('child_process');
      exec(`start steam://validate/${game.platform_id}`);

      this.updateStatus(update.id, 'downloading');
      return true;
    } catch (error) {
      console.error('Failed to trigger Steam update:', error);
      return false;
    }
  }

  /**
   * Trigger Epic Games update
   */
  private async triggerEpicUpdate(update: GameUpdate): Promise<boolean> {
    try {
      // Launch Epic Games Launcher with the game
      const { exec } = require('child_process');
      exec(`start com.epicgames.launcher://apps/${update.gameId}?action=launch`);

      this.updateStatus(update.id, 'downloading');
      return true;
    } catch (error) {
      console.error('Failed to trigger Epic update:', error);
      return false;
    }
  }

  /**
   * Trigger GOG update
   */
  private async triggerGOGUpdate(update: GameUpdate): Promise<boolean> {
    try {
      // Launch GOG Galaxy
      const { exec } = require('child_process');
      exec(`start "goggalaxy://openGameView/${update.gameId}"`);

      this.updateStatus(update.id, 'downloading');
      return true;
    } catch (error) {
      console.error('Failed to trigger GOG update:', error);
      return false;
    }
  }

  /**
   * Get all pending updates
   */
  getPendingUpdates(): GameUpdate[] {
    try {
      const db = getDb();
      const updates = db.prepare(`
        SELECT * FROM game_updates
        WHERE status IN ('pending', 'downloading')
        ORDER BY priority DESC, detectedAt DESC
      `).all() as any[];

      return updates.map(u => ({
        ...u,
        detectedAt: u.detected_at
      }));
    } catch (error) {
      console.error('Failed to get pending updates:', error);
      return [];
    }
  }

  /**
   * Get update history for a game
   */
  getGameUpdateHistory(gameId: string): GameUpdate[] {
    try {
      const db = getDb();
      const updates = db.prepare(`
        SELECT * FROM game_updates
        WHERE gameId = ?
        ORDER BY detectedAt DESC
        LIMIT 50
      `).all(gameId) as any[];

      return updates.map(u => ({
        ...u,
        detectedAt: u.detected_at
      }));
    } catch (error) {
      console.error('Failed to get update history:', error);
      return [];
    }
  }

  /**
   * Get specific update
   */
  private getUpdate(updateId: string): GameUpdate | null {
    try {
      const db = getDb();
      const update = db.prepare('SELECT * FROM game_updates WHERE id = ?').get(updateId) as any;

      if (!update) return null;

      return {
        ...update,
        detectedAt: update.detected_at,
        autoUpdate: Boolean(update.autoUpdate)
      };
    } catch (error) {
      console.error('Failed to get update:', error);
      return null;
    }
  }

  /**
   * Save update to database
   */
  private saveUpdate(update: GameUpdate) {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO game_updates (
          id, gameId, gameName, platform, version, newVersion,
          releaseNotes, updateSize, detected_at, status, priority, autoUpdate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          progress = excluded.progress
      `).run(
        update.id,
        update.gameId,
        update.gameName,
        update.platform,
        update.version,
        update.newVersion,
        update.releaseNotes || null,
        update.updateSize || null,
        update.detectedAt,
        update.status,
        update.priority,
        update.autoUpdate ? 1 : 0
      );
    } catch (error) {
      console.error('Failed to save update:', error);
    }
  }

  /**
   * Update status of an update
   */
  private updateStatus(updateId: string, status: GameUpdate['status'], progress?: number) {
    try {
      const db = getDb();
      if (progress !== undefined) {
        db.prepare('UPDATE game_updates SET status = ?, progress = ? WHERE id = ?')
          .run(status, progress, updateId);
      } else {
        db.prepare('UPDATE game_updates SET status = ? WHERE id = ?')
          .run(status, updateId);
      }

      // Trigger callback if registered
      const callback = this.updateCallbacks.get(updateId);
      if (callback) {
        const update = this.getUpdate(updateId);
        if (update) callback(update);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  /**
   * Mark update as installed
   */
  markAsInstalled(updateId: string) {
    this.updateStatus(updateId, 'installed', 100);
  }

  /**
   * Dismiss/ignore an update
   */
  dismissUpdate(updateId: string) {
    try {
      const db = getDb();
      db.prepare('DELETE FROM game_updates WHERE id = ?').run(updateId);
    } catch (error) {
      console.error('Failed to dismiss update:', error);
    }
  }

  /**
   * Subscribe to update progress
   */
  onUpdateProgress(updateId: string, callback: (update: GameUpdate) => void) {
    this.updateCallbacks.set(updateId, callback);
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
