import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { SettingsManager } from './settingsManager';
import { NotificationService } from './notificationService';
import { BrowserWindow } from 'electron';

export interface Achievement {
  id: string;
  gameId: string;
  platform: string;
  platformAchievementId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  iconGrayUrl?: string;
  unlocked: boolean;
  unlockTime?: number;
  hidden: boolean;
  rarityPercent?: number;
  createdAt: number;
  updatedAt: number;
}

export class AchievementService {
  private notificationService?: NotificationService;

  constructor(notificationService?: NotificationService) {
    this.notificationService = notificationService;
  }

  /**
   * Get all achievements for a game
   */
  getGameAchievements(gameId: string): Achievement[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM achievements WHERE game_id = ? ORDER BY unlocked DESC, name ASC').all(gameId);

    return rows.map((row: any) => this.mapRowToAchievement(row));
  }

  /**
   * Get achievement statistics for a game
   */
  getGameAchievementStats(gameId: string): { total: number; unlocked: number; percent: number } {
    const db = getDb();
    const result = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN unlocked = 1 THEN 1 ELSE 0 END) as unlocked
      FROM achievements
      WHERE game_id = ?
    `).get(gameId) as { total: number; unlocked: number };

    const total = result?.total || 0;
    const unlocked = result?.unlocked || 0;
    const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    return { total, unlocked, percent };
  }

  /**
   * Sync achievements for a Steam game
   */
  async syncSteamAchievements(gameId: string, steamAppId: string): Promise<boolean> {
    try {
      const settingsManager = new SettingsManager();
      const settings = settingsManager.getAllSettings();
      const apiKey = settings.integrations?.steamApiKey;
      const steamId = settings.integrations?.steamId;

      if (!apiKey || !steamId) {
        console.log('Steam sync skipped: Missing API Key or Steam ID');
        return false;
      }

      // 1. Get game schema (all available achievements)
      const schemaUrl = `http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${steamAppId}`;
      const schemaRes = await axios.get(schemaUrl);
      const availableAchievements = schemaRes.data?.game?.availableGameStats?.achievements || [];

      if (availableAchievements.length === 0) {
        console.log(`No achievements found for Steam game ${steamAppId}`);
        return false;
      }

      // 2. Get player achievements (what user has unlocked)
      const playerUrl = `http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${apiKey}&steamid=${steamId}&appid=${steamAppId}`;
      const playerRes = await axios.get(playerUrl);
      const playerAchievements = playerRes.data?.playerstats?.achievements || [];

      // 3. Get global achievement percentages
      const globalUrl = `http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${steamAppId}`;
      const globalRes = await axios.get(globalUrl);
      const globalStats = globalRes.data?.achievementpercentages?.achievements || [];

      // Create a map for quick lookups
      const playerMap = new Map(playerAchievements.map((a: any) => [a.apiname, a]));
      const globalMap = new Map(globalStats.map((a: any) => [a.name, a.percent]));

      // 4. Store/Update achievements in database
      const db = getDb();
      const previousAchievements = this.getGameAchievements(gameId);
      const previousUnlockedMap = new Map(previousAchievements.map(a => [a.platformAchievementId, a.unlocked]));

      const stmt = db.prepare(`
        INSERT INTO achievements (id, game_id, platform, platform_achievement_id, name, description, icon_url, icon_gray_url, unlocked, unlock_time, hidden, rarity_percent, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_id, platform, platform_achievement_id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          icon_url = excluded.icon_url,
          icon_gray_url = excluded.icon_gray_url,
          unlocked = excluded.unlocked,
          unlock_time = excluded.unlock_time,
          rarity_percent = excluded.rarity_percent,
          updated_at = excluded.updated_at
      `);

      let newlyUnlocked = 0;

      for (const achievement of availableAchievements) {
        const playerData = playerMap.get(achievement.name);
        const rarity = globalMap.get(achievement.name);
        const unlocked = playerData?.achieved === 1;
        const unlockTime = playerData?.unlocktime ? playerData.unlocktime * 1000 : undefined;

        const wasUnlocked = previousUnlockedMap.get(achievement.name);
        if (unlocked && !wasUnlocked) {
          newlyUnlocked++;
          // Send notification for newly unlocked achievement
          if (this.notificationService) {
            this.notificationService.notifyAchievementUnlocked(
              achievement.displayName || achievement.name,
              gameId, // We'll need to get game title from gameId
              achievement.icon
            );
          }
        }

        stmt.run(
          uuidv4(),
          gameId,
          'steam',
          achievement.name, // API name
          achievement.displayName || achievement.name,
          achievement.description || '',
          achievement.icon || '',
          achievement.icongray || '',
          unlocked ? 1 : 0,
          unlockTime || null,
          achievement.hidden === 1 ? 1 : 0,
          rarity || null,
          Date.now(),
          Date.now()
        );
      }

      // 5. Update game's achievement counts
      const stats = this.getGameAchievementStats(gameId);
      db.prepare('UPDATE games SET achievements_total = ?, achievements_unlocked = ? WHERE id = ?')
        .run(stats.total, stats.unlocked, gameId);

      // Broadcast update to renderer
      this.broadcastAchievementUpdate(gameId);

      console.log(`Synced ${availableAchievements.length} achievements for game ${gameId} (${newlyUnlocked} newly unlocked)`);
      return true;

    } catch (error) {
      console.error(`Failed to sync Steam achievements for game ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Sync achievements for all Steam games in library
   */
  async syncAllSteamAchievements(): Promise<{ success: number; failed: number }> {
    const db = getDb();
    const steamGames = db.prepare('SELECT id, platform_id FROM games WHERE platform = ? AND platform_id IS NOT NULL').all('steam');

    let success = 0;
    let failed = 0;

    for (const game of steamGames as any[]) {
      const result = await this.syncSteamAchievements(game.id, game.platform_id);
      if (result) {
        success++;
      } else {
        failed++;
      }

      // Rate limit: 1 request per second to avoid Steam API throttling
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Achievement sync complete: ${success} succeeded, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Get recently unlocked achievements across all games
   */
  getRecentlyUnlocked(limit: number = 10): Achievement[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM achievements WHERE unlocked = 1 ORDER BY unlock_time DESC LIMIT ?').all(limit);

    return rows.map((row: any) => this.mapRowToAchievement(row));
  }

  /**
   * Get rarest unlocked achievements
   */
  getRarestUnlocked(limit: number = 10): Achievement[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM achievements WHERE unlocked = 1 AND rarity_percent IS NOT NULL ORDER BY rarity_percent ASC LIMIT ?').all(limit);

    return rows.map((row: any) => this.mapRowToAchievement(row));
  }

  /**
   * Get achievement completion progress across all games
   */
  getOverallProgress(): { totalGames: number; gamesWithAchievements: number; totalAchievements: number; unlockedAchievements: number; percent: number } {
    const db = getDb();

    const result = db.prepare(`
      SELECT
        COUNT(DISTINCT game_id) as gamesWithAchievements,
        COUNT(*) as totalAchievements,
        SUM(CASE WHEN unlocked = 1 THEN 1 ELSE 0 END) as unlockedAchievements
      FROM achievements
    `).get() as { gamesWithAchievements: number; totalAchievements: number; unlockedAchievements: number };

    const totalGames = (db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number }).count;
    const percent = result.totalAchievements > 0 ? Math.round((result.unlockedAchievements / result.totalAchievements) * 100) : 0;

    return {
      totalGames,
      gamesWithAchievements: result.gamesWithAchievements || 0,
      totalAchievements: result.totalAchievements || 0,
      unlockedAchievements: result.unlockedAchievements || 0,
      percent
    };
  }

  /**
   * Map database row to Achievement object
   */
  private mapRowToAchievement(row: any): Achievement {
    return {
      id: row.id,
      gameId: row.game_id,
      platform: row.platform,
      platformAchievementId: row.platform_achievement_id,
      name: row.name,
      description: row.description,
      iconUrl: row.icon_url,
      iconGrayUrl: row.icon_gray_url,
      unlocked: row.unlocked === 1,
      unlockTime: row.unlock_time,
      hidden: row.hidden === 1,
      rarityPercent: row.rarity_percent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Broadcast achievement updates to renderer
   */
  private broadcastAchievementUpdate(gameId: string) {
    const achievements = this.getGameAchievements(gameId);
    const stats = this.getGameAchievementStats(gameId);

    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('achievements:update', { gameId, achievements, stats });
    });
  }
}
