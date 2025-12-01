import { getDb } from '../database';
import axios from 'axios';

export interface DLC {
  id: string;
  gameId: string;
  platform: string;
  platformDlcId: string;
  name: string;
  description?: string;
  releaseDate?: number;
  price?: number;
  currency?: string;
  owned: boolean;
  installed: boolean;
  coverUrl?: string;
  detectedAt: number;
}

export interface DLCWithGame extends DLC {
  gameName: string;
  gameCover?: string;
}

export class DLCTrackerService {
  private steamApiKey: string = '';

  constructor() {
    this.loadApiKey();
  }

  private loadApiKey() {
    try {
      const db = getDb();
      const settings = db.prepare('SELECT value FROM settings WHERE key = ?').get('integrations') as any;
      if (settings) {
        const integrations = JSON.parse(settings.value);
        this.steamApiKey = integrations.steamApiKey || '';
      }
    } catch (error) {
      console.error('Failed to load Steam API key:', error);
    }
  }

  /**
   * Scan for DLCs across all owned games
   */
  async scanForDLCs(): Promise<DLC[]> {
    const db = getDb();
    const games = db.prepare(`
      SELECT id, title, platform, platform_id
      FROM games
      WHERE is_installed = 1
    `).all() as any[];

    const allDLCs: DLC[] = [];

    for (const game of games) {
      try {
        const dlcs = await this.scanGameDLCs(game.id, game.platform, game.platform_id);
        allDLCs.push(...dlcs);
      } catch (error) {
        console.error(`Failed to scan DLCs for ${game.title}:`, error);
      }
    }

    return allDLCs;
  }

  /**
   * Scan DLCs for a specific game
   */
  async scanGameDLCs(gameId: string, platform: string, platformId: string): Promise<DLC[]> {
    switch (platform.toLowerCase()) {
      case 'steam':
        return await this.scanSteamDLCs(gameId, platformId);
      case 'epic':
        return await this.scanEpicDLCs(gameId, platformId);
      case 'gog':
        return await this.scanGOGDLCs(gameId, platformId);
      default:
        return [];
    }
  }

  /**
   * Scan Steam DLCs using Steam Web API
   */
  private async scanSteamDLCs(gameId: string, appId: string): Promise<DLC[]> {
    if (!this.steamApiKey) {
      console.warn('Steam API key not configured');
      return [];
    }

    try {
      // Get app details from Steam API
      const response = await axios.get(`https://store.steampowered.com/api/appdetails`, {
        params: { appids: appId },
        timeout: 10000
      });

      if (!response.data || !response.data[appId] || !response.data[appId].success) {
        return [];
      }

      const appData = response.data[appId].data;
      const dlcs: DLC[] = [];

      if (appData.dlc && Array.isArray(appData.dlc)) {
        for (const dlcId of appData.dlc) {
          try {
            const dlcResponse = await axios.get(`https://store.steampowered.com/api/appdetails`, {
              params: { appids: dlcId },
              timeout: 10000
            });

            if (dlcResponse.data && dlcResponse.data[dlcId] && dlcResponse.data[dlcId].success) {
              const dlcData = dlcResponse.data[dlcId].data;

              const dlc: DLC = {
                id: `dlc_${gameId}_${dlcId}`,
                gameId,
                platform: 'steam',
                platformDlcId: dlcId.toString(),
                name: dlcData.name || `DLC ${dlcId}`,
                description: dlcData.short_description,
                releaseDate: dlcData.release_date ? new Date(dlcData.release_date.date).getTime() : undefined,
                price: dlcData.price_overview ? dlcData.price_overview.final / 100 : undefined,
                currency: dlcData.price_overview ? dlcData.price_overview.currency : undefined,
                owned: false, // Would need to check user's library
                installed: false,
                coverUrl: dlcData.header_image,
                detectedAt: Date.now()
              };

              dlcs.push(dlc);
              this.saveDLC(dlc);
            }

            // Rate limiting: wait 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Failed to fetch DLC ${dlcId}:`, error);
          }
        }
      }

      return dlcs;
    } catch (error) {
      console.error('Failed to scan Steam DLCs:', error);
      return [];
    }
  }

  /**
   * Scan Epic Games DLCs
   */
  private async scanEpicDLCs(gameId: string, epicId: string): Promise<DLC[]> {
    // Epic Games Store doesn't have a public API
    // Would need to implement Epic Games Store integration
    // Placeholder for now
    return [];
  }

  /**
   * Scan GOG DLCs
   */
  private async scanGOGDLCs(gameId: string, gogId: string): Promise<DLC[]> {
    try {
      // GOG API endpoint
      const response = await axios.get(`https://api.gog.com/products/${gogId}`, {
        timeout: 10000
      });

      const dlcs: DLC[] = [];

      if (response.data && response.data.dlcs) {
        for (const dlcData of response.data.dlcs) {
          const dlc: DLC = {
            id: `dlc_${gameId}_${dlcData.id}`,
            gameId,
            platform: 'gog',
            platformDlcId: dlcData.id.toString(),
            name: dlcData.title,
            description: dlcData.description,
            price: dlcData.price ? dlcData.price.amount / 100 : undefined,
            currency: dlcData.price ? dlcData.price.currency : undefined,
            owned: false,
            installed: false,
            coverUrl: dlcData.images?.icon,
            detectedAt: Date.now()
          };

          dlcs.push(dlc);
          this.saveDLC(dlc);
        }
      }

      return dlcs;
    } catch (error) {
      console.error('Failed to scan GOG DLCs:', error);
      return [];
    }
  }

  /**
   * Save DLC to database
   */
  private saveDLC(dlc: DLC) {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO dlcs (
          id, gameId, platform, platformDlcId, name, description,
          releaseDate, price, currency, owned, installed,
          coverUrl, detectedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          price = excluded.price,
          coverUrl = excluded.coverUrl
      `).run(
        dlc.id,
        dlc.gameId,
        dlc.platform,
        dlc.platformDlcId,
        dlc.name,
        dlc.description || null,
        dlc.releaseDate || null,
        dlc.price || null,
        dlc.currency || null,
        dlc.owned ? 1 : 0,
        dlc.installed ? 1 : 0,
        dlc.coverUrl || null,
        dlc.detectedAt
      );
    } catch (error) {
      console.error('Failed to save DLC:', error);
    }
  }

  /**
   * Get all DLCs
   */
  getAllDLCs(): DLCWithGame[] {
    try {
      const db = getDb();
      const dlcs = db.prepare(`
        SELECT
          d.*,
          g.title as gameName,
          g.cover_url as gameCover
        FROM dlcs d
        LEFT JOIN games g ON d.gameId = g.id
        ORDER BY d.releaseDate DESC
      `).all() as any[];

      return dlcs.map(d => ({
        id: d.id,
        gameId: d.gameId,
        platform: d.platform,
        platformDlcId: d.platformDlcId,
        name: d.name,
        description: d.description,
        releaseDate: d.releaseDate,
        price: d.price,
        currency: d.currency,
        owned: Boolean(d.owned),
        installed: Boolean(d.installed),
        coverUrl: d.coverUrl,
        detectedAt: d.detectedAt,
        gameName: d.gameName,
        gameCover: d.gameCover
      }));
    } catch (error) {
      console.error('Failed to get all DLCs:', error);
      return [];
    }
  }

  /**
   * Get DLCs for a specific game
   */
  getGameDLCs(gameId: string): DLC[] {
    try {
      const db = getDb();
      const dlcs = db.prepare(`
        SELECT * FROM dlcs
        WHERE gameId = ?
        ORDER BY releaseDate DESC
      `).all(gameId) as any[];

      return dlcs.map(d => ({
        id: d.id,
        gameId: d.gameId,
        platform: d.platform,
        platformDlcId: d.platformDlcId,
        name: d.name,
        description: d.description,
        releaseDate: d.releaseDate,
        price: d.price,
        currency: d.currency,
        owned: Boolean(d.owned),
        installed: Boolean(d.installed),
        coverUrl: d.coverUrl,
        detectedAt: d.detectedAt
      }));
    } catch (error) {
      console.error('Failed to get game DLCs:', error);
      return [];
    }
  }

  /**
   * Get unowned DLCs
   */
  getUnownedDLCs(): DLCWithGame[] {
    try {
      const db = getDb();
      const dlcs = db.prepare(`
        SELECT
          d.*,
          g.title as gameName,
          g.cover_url as gameCover
        FROM dlcs d
        LEFT JOIN games g ON d.gameId = g.id
        WHERE d.owned = 0
        ORDER BY d.releaseDate DESC
      `).all() as any[];

      return dlcs.map(d => ({
        id: d.id,
        gameId: d.gameId,
        platform: d.platform,
        platformDlcId: d.platformDlcId,
        name: d.name,
        description: d.description,
        releaseDate: d.releaseDate,
        price: d.price,
        currency: d.currency,
        owned: Boolean(d.owned),
        installed: Boolean(d.installed),
        coverUrl: d.coverUrl,
        detectedAt: d.detectedAt,
        gameName: d.gameName,
        gameCover: d.gameCover
      }));
    } catch (error) {
      console.error('Failed to get unowned DLCs:', error);
      return [];
    }
  }

  /**
   * Mark DLC as owned
   */
  markAsOwned(dlcId: string) {
    try {
      const db = getDb();
      db.prepare('UPDATE dlcs SET owned = 1 WHERE id = ?').run(dlcId);
    } catch (error) {
      console.error('Failed to mark DLC as owned:', error);
    }
  }

  /**
   * Mark DLC as installed
   */
  markAsInstalled(dlcId: string) {
    try {
      const db = getDb();
      db.prepare('UPDATE dlcs SET installed = 1, owned = 1 WHERE id = ?').run(dlcId);
    } catch (error) {
      console.error('Failed to mark DLC as installed:', error);
    }
  }

  /**
   * Get DLC statistics
   */
  getDLCStats(): { total: number; owned: number; installed: number; totalValue: number } {
    try {
      const db = getDb();
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN owned = 1 THEN 1 ELSE 0 END) as owned,
          SUM(CASE WHEN installed = 1 THEN 1 ELSE 0 END) as installed,
          SUM(CASE WHEN owned = 0 AND price IS NOT NULL THEN price ELSE 0 END) as totalValue
        FROM dlcs
      `).get() as any;

      return {
        total: stats.total || 0,
        owned: stats.owned || 0,
        installed: stats.installed || 0,
        totalValue: stats.totalValue || 0
      };
    } catch (error) {
      console.error('Failed to get DLC stats:', error);
      return { total: 0, owned: 0, installed: 0, totalValue: 0 };
    }
  }

  /**
   * Get recent DLC releases (last 30 days)
   */
  getRecentDLCReleases(): DLCWithGame[] {
    try {
      const db = getDb();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      const dlcs = db.prepare(`
        SELECT
          d.*,
          g.title as gameName,
          g.cover_url as gameCover
        FROM dlcs d
        LEFT JOIN games g ON d.gameId = g.id
        WHERE d.releaseDate > ?
        ORDER BY d.releaseDate DESC
      `).all(thirtyDaysAgo) as any[];

      return dlcs.map(d => ({
        id: d.id,
        gameId: d.gameId,
        platform: d.platform,
        platformDlcId: d.platformDlcId,
        name: d.name,
        description: d.description,
        releaseDate: d.releaseDate,
        price: d.price,
        currency: d.currency,
        owned: Boolean(d.owned),
        installed: Boolean(d.installed),
        coverUrl: d.coverUrl,
        detectedAt: d.detectedAt,
        gameName: d.gameName,
        gameCover: d.gameCover
      }));
    } catch (error) {
      console.error('Failed to get recent DLC releases:', error);
      return [];
    }
  }
}
