import { getDb } from '../database';
import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';

export interface Screenshot {
  id: string;
  gameId: string;
  gameName: string;
  filePath: string;
  thumbnailPath?: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  takenAt: number;
  isFavorite: boolean;
  tags: string[];
  caption?: string;
  platform: string;
}

export class ScreenshotService {
  private screenshotDirs: Map<string, string> = new Map();
  private watchedDirs: Set<string> = new Set();

  constructor() {
    this.initializeScreenshotDirs();
  }

  /**
   * Initialize known screenshot directories for various platforms
   */
  private async initializeScreenshotDirs() {
    const userProfile = process.env.USERPROFILE || process.env.HOME || '';

    // Steam screenshots
    const steamPath = path.join(userProfile, 'AppData', 'Local', 'Steam', 'userdata');
    this.screenshotDirs.set('steam', steamPath);

    // Epic Games screenshots (typically in game folders)
    const epicPath = path.join(userProfile, 'Pictures', 'Epic Games');
    this.screenshotDirs.set('epic', epicPath);

    // Xbox screenshots
    const xboxPath = path.join(userProfile, 'Videos', 'Captures');
    this.screenshotDirs.set('xbox', xboxPath);

    // GOG screenshots (game-specific)
    const gogPath = path.join(userProfile, 'Documents', 'GOG Screenshots');
    this.screenshotDirs.set('gog', gogPath);

    // Generic Windows Game DVR
    const gameDVRPath = path.join(userProfile, 'Videos', 'Captures');
    this.screenshotDirs.set('windows', gameDVRPath);

    // Start watching directories
    await this.startWatching();
  }

  /**
   * Start watching screenshot directories for new files
   */
  private async startWatching() {
    for (const [platform, dir] of this.screenshotDirs.entries()) {
      try {
        await fs.access(dir);
        if (!this.watchedDirs.has(dir)) {
          this.watchedDirs.add(dir);
          // Note: In production, you'd use fs.watch or chokidar for file watching
          // For now, we'll rely on manual scanning
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }
  }

  /**
   * Scan all known directories for screenshots
   */
  async scanForScreenshots(): Promise<Screenshot[]> {
    const foundScreenshots: Screenshot[] = [];

    for (const [platform, dir] of this.screenshotDirs.entries()) {
      try {
        const screenshots = await this.scanDirectory(dir, platform);
        foundScreenshots.push(...screenshots);
      } catch (error) {
        console.error(`Failed to scan ${platform} directory:`, error);
      }
    }

    // Save new screenshots to database
    for (const screenshot of foundScreenshots) {
      await this.saveScreenshot(screenshot);
    }

    return foundScreenshots;
  }

  /**
   * Scan a specific directory for screenshot files
   */
  private async scanDirectory(dir: string, platform: string): Promise<Screenshot[]> {
    const screenshots: Screenshot[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subScreenshots = await this.scanDirectory(fullPath, platform);
          screenshots.push(...subScreenshots);
        } else if (this.isImageFile(entry.name)) {
          const screenshot = await this.processScreenshotFile(fullPath, platform);
          if (screenshot) {
            screenshots.push(screenshot);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return screenshots;
  }

  /**
   * Check if file is an image
   */
  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.gif'];
    const ext = path.extname(fileName).toLowerCase();
    return imageExtensions.includes(ext);
  }

  /**
   * Process a screenshot file and extract metadata
   */
  private async processScreenshotFile(filePath: string, platform: string): Promise<Screenshot | null> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);

      // Check if already in database
      const existing = this.getScreenshotByPath(filePath);
      if (existing) return null;

      // Extract game name from path (heuristic)
      const gameName = this.extractGameNameFromPath(filePath);

      // Get image dimensions (would need image-size package in production)
      const { width, height } = await this.getImageDimensions(filePath);

      const screenshot: Screenshot = {
        id: crypto.randomBytes(16).toString('hex'),
        gameId: '', // Will be matched later
        gameName,
        filePath,
        fileName,
        fileSize: stats.size,
        width,
        height,
        takenAt: stats.mtimeMs,
        isFavorite: false,
        tags: [],
        platform
      };

      return screenshot;
    } catch (error) {
      console.error('Failed to process screenshot:', error);
      return null;
    }
  }

  /**
   * Extract game name from file path
   */
  private extractGameNameFromPath(filePath: string): string {
    const parts = filePath.split(path.sep);

    // Try to find game name in path
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];

      // Skip common directory names
      if (['Screenshots', 'Pictures', 'Videos', 'Captures', 'userdata'].includes(part)) {
        continue;
      }

      // If it looks like a game name, use it
      if (part.length > 3 && !part.includes('.')) {
        return part;
      }
    }

    return 'Unknown Game';
  }

  /**
   * Get image dimensions (placeholder - would use image-size package)
   */
  private async getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
    // In production, use the 'image-size' package
    // For now, return defaults
    return { width: 1920, height: 1080 };
  }

  /**
   * Get screenshot by file path
   */
  private getScreenshotByPath(filePath: string): Screenshot | null {
    try {
      const db = getDb();
      const row = db.prepare('SELECT * FROM screenshots WHERE filePath = ?').get(filePath) as any;

      if (!row) return null;

      return {
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        isFavorite: Boolean(row.isFavorite)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Save screenshot to database
   */
  private async saveScreenshot(screenshot: Screenshot) {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO screenshots (
          id, gameId, gameName, filePath, thumbnailPath, fileName,
          fileSize, width, height, takenAt, isFavorite, tags,
          caption, platform
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `).run(
        screenshot.id,
        screenshot.gameId,
        screenshot.gameName,
        screenshot.filePath,
        screenshot.thumbnailPath || null,
        screenshot.fileName,
        screenshot.fileSize,
        screenshot.width,
        screenshot.height,
        screenshot.takenAt,
        screenshot.isFavorite ? 1 : 0,
        JSON.stringify(screenshot.tags),
        screenshot.caption || null,
        screenshot.platform
      );
    } catch (error) {
      console.error('Failed to save screenshot:', error);
    }
  }

  /**
   * Get all screenshots
   */
  getAllScreenshots(limit?: number, offset?: number): Screenshot[] {
    try {
      const db = getDb();
      let query = 'SELECT * FROM screenshots ORDER BY takenAt DESC';

      if (limit) {
        query += ` LIMIT ${limit}`;
        if (offset) {
          query += ` OFFSET ${offset}`;
        }
      }

      const rows = db.prepare(query).all() as any[];

      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        isFavorite: Boolean(row.isFavorite)
      }));
    } catch (error) {
      console.error('Failed to get screenshots:', error);
      return [];
    }
  }

  /**
   * Get screenshots for a specific game
   */
  getGameScreenshots(gameId: string): Screenshot[] {
    try {
      const db = getDb();
      const rows = db.prepare(`
        SELECT * FROM screenshots
        WHERE gameId = ?
        ORDER BY takenAt DESC
      `).all(gameId) as any[];

      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        isFavorite: Boolean(row.isFavorite)
      }));
    } catch (error) {
      console.error('Failed to get game screenshots:', error);
      return [];
    }
  }

  /**
   * Get favorite screenshots
   */
  getFavoriteScreenshots(): Screenshot[] {
    try {
      const db = getDb();
      const rows = db.prepare(`
        SELECT * FROM screenshots
        WHERE isFavorite = 1
        ORDER BY takenAt DESC
      `).all() as any[];

      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        isFavorite: Boolean(row.isFavorite)
      }));
    } catch (error) {
      console.error('Failed to get favorite screenshots:', error);
      return [];
    }
  }

  /**
   * Toggle favorite status
   */
  toggleFavorite(screenshotId: string) {
    try {
      const db = getDb();
      const screenshot = db.prepare('SELECT isFavorite FROM screenshots WHERE id = ?').get(screenshotId) as any;

      if (screenshot) {
        const newStatus = screenshot.isFavorite ? 0 : 1;
        db.prepare('UPDATE screenshots SET isFavorite = ? WHERE id = ?').run(newStatus, screenshotId);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  /**
   * Add tags to screenshot
   */
  addTags(screenshotId: string, newTags: string[]) {
    try {
      const db = getDb();
      const screenshot = db.prepare('SELECT tags FROM screenshots WHERE id = ?').get(screenshotId) as any;

      if (screenshot) {
        const existingTags = screenshot.tags ? JSON.parse(screenshot.tags) : [];
        const updatedTags = Array.from(new Set([...existingTags, ...newTags]));

        db.prepare('UPDATE screenshots SET tags = ? WHERE id = ?').run(
          JSON.stringify(updatedTags),
          screenshotId
        );
      }
    } catch (error) {
      console.error('Failed to add tags:', error);
    }
  }

  /**
   * Update caption
   */
  updateCaption(screenshotId: string, caption: string) {
    try {
      const db = getDb();
      db.prepare('UPDATE screenshots SET caption = ? WHERE id = ?').run(caption, screenshotId);
    } catch (error) {
      console.error('Failed to update caption:', error);
    }
  }

  /**
   * Delete screenshot
   */
  async deleteScreenshot(screenshotId: string, deleteFile: boolean = false) {
    try {
      const db = getDb();
      const screenshot = db.prepare('SELECT filePath, thumbnailPath FROM screenshots WHERE id = ?').get(screenshotId) as any;

      if (screenshot && deleteFile) {
        // Delete physical files
        try {
          await fs.unlink(screenshot.filePath);
          if (screenshot.thumbnailPath) {
            await fs.unlink(screenshot.thumbnailPath);
          }
        } catch (error) {
          console.error('Failed to delete file:', error);
        }
      }

      // Delete from database
      db.prepare('DELETE FROM screenshots WHERE id = ?').run(screenshotId);
    } catch (error) {
      console.error('Failed to delete screenshot:', error);
    }
  }

  /**
   * Search screenshots
   */
  searchScreenshots(query: string): Screenshot[] {
    try {
      const db = getDb();
      const rows = db.prepare(`
        SELECT * FROM screenshots
        WHERE gameName LIKE ? OR caption LIKE ? OR tags LIKE ?
        ORDER BY takenAt DESC
      `).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];

      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        isFavorite: Boolean(row.isFavorite)
      }));
    } catch (error) {
      console.error('Failed to search screenshots:', error);
      return [];
    }
  }
}
