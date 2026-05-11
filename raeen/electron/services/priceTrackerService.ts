import { getDb } from '../database';
import axios from 'axios';
import { NotificationService } from './notificationService';

export interface WishlistGame {
  id: string;
  title: string;
  platform: string;
  platformId: string;
  coverUrl?: string;
  currentPrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  currency?: string;
  lowestPrice?: number;
  targetPrice?: number;
  priceHistory: PricePoint[];
  addedAt: number;
  lastChecked?: number;
  priceAlertEnabled: boolean;
}

export interface PricePoint {
  timestamp: number;
  price: number;
  discount?: number;
}

export interface PriceAlert {
  id: string;
  wishlistGameId: string;
  gameName: string;
  targetPrice: number;
  currentPrice: number;
  discountPercent: number;
  triggered: boolean;
  triggeredAt?: number;
}

export class PriceTrackerService {
  private checkInterval: NodeJS.Timeout | null = null;
  private notificationService?: NotificationService;

  constructor(notificationService?: NotificationService) {
    this.notificationService = notificationService;
    this.startAutoCheck();
  }

  /**
   * Start automatic price checking (every 4 hours)
   */
  startAutoCheck() {
    // Check immediately on start
    this.checkPrices();

    // Then check every 4 hours
    this.checkInterval = setInterval(() => {
      this.checkPrices();
    }, 4 * 60 * 60 * 1000); // 4 hours
  }

  /**
   * Stop automatic price checking
   */
  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check prices for all wishlist games
   */
  // BUG-047: replace strict serial-with-1s-delay with bounded concurrency.
  // 100-game wishlists no longer take 100+ seconds. We still rate-limit per
  // worker to be polite to upstream stores.
  async checkPrices(): Promise<PriceAlert[]> {
    const wishlistGames = this.getAllWishlistGames();
    const alerts: PriceAlert[] = [];
    const CONCURRENCY = 4;
    const PER_WORKER_DELAY_MS = 250;

    let cursor = 0;
    const next = async () => {
      while (cursor < wishlistGames.length) {
        const game = wishlistGames[cursor++];
        try {
          const priceData = await this.fetchPrice(game.platform, game.platformId);
          if (priceData) {
            this.updatePrice(game.id, priceData.price, priceData.discount);
            if (game.priceAlertEnabled && game.targetPrice && priceData.price <= game.targetPrice) {
              const alert = await this.triggerPriceAlert(game, priceData.price, priceData.discount);
              alerts.push(alert);
            }
          }
        } catch (error) {
          console.error(`Failed to check price for ${game.title}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, PER_WORKER_DELAY_MS));
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, wishlistGames.length) }, () => next())
    );
    return alerts;
  }

  /**
   * Fetch current price for a game
   */
  private async fetchPrice(platform: string, platformId: string): Promise<{ price: number; discount?: number } | null> {
    switch (platform.toLowerCase()) {
      case 'steam':
        return await this.fetchSteamPrice(platformId);
      case 'epic':
        return await this.fetchEpicPrice(platformId);
      case 'gog':
        return await this.fetchGOGPrice(platformId);
      default:
        return null;
    }
  }

  /**
   * Fetch Steam price
   */
  private async fetchSteamPrice(appId: string): Promise<{ price: number; discount?: number } | null> {
    try {
      const response = await axios.get(`https://store.steampowered.com/api/appdetails`, {
        params: {
          appids: appId,
          cc: 'us', // Country code
          filters: 'price_overview'
        },
        timeout: 10000
      });

      if (response.data && response.data[appId] && response.data[appId].success) {
        const priceData = response.data[appId].data.price_overview;

        if (priceData) {
          return {
            price: priceData.final / 100, // Convert cents to dollars
            discount: priceData.discount_percent
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch Steam price:', error);
      return null;
    }
  }

  /**
   * Fetch Epic Games price
   */
  private async fetchEpicPrice(epicId: string): Promise<{ price: number; discount?: number } | null> {
    // Epic doesn't have a public API
    // Would need to implement Epic Games Store integration or web scraping
    return null;
  }

  /**
   * Fetch GOG price
   */
  private async fetchGOGPrice(gogId: string): Promise<{ price: number; discount?: number } | null> {
    try {
      const response = await axios.get(`https://api.gog.com/products/${gogId}/prices`, {
        params: { countryCode: 'US' },
        timeout: 10000
      });

      if (response.data && response.data.finalPrice) {
        const discount = response.data.basePrice > response.data.finalPrice
          ? ((response.data.basePrice - response.data.finalPrice) / response.data.basePrice) * 100
          : 0;

        return {
          price: response.data.finalPrice,
          discount: Math.round(discount)
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch GOG price:', error);
      return null;
    }
  }

  /**
   * Update price in database and add to price history
   */
  private updatePrice(wishlistGameId: string, price: number, discount?: number) {
    try {
      const db = getDb();

      // Get current price history
      const game = db.prepare('SELECT priceHistory, currentPrice FROM wishlist WHERE id = ?').get(wishlistGameId) as any;

      if (!game) return;

      let priceHistory: PricePoint[] = game.priceHistory ? JSON.parse(game.priceHistory) : [];

      // Only add to history if price changed
      if (game.currentPrice !== price) {
        priceHistory.push({
          timestamp: Date.now(),
          price,
          discount
        });

        // Keep last 100 price points
        if (priceHistory.length > 100) {
          priceHistory = priceHistory.slice(-100);
        }
      }

      // Calculate lowest price
      const lowestPrice = Math.min(...priceHistory.map(p => p.price));

      // Update database
      db.prepare(`
        UPDATE wishlist SET
          currentPrice = ?,
          discountPercent = ?,
          lowestPrice = ?,
          priceHistory = ?,
          lastChecked = ?
        WHERE id = ?
      `).run(price, discount || 0, lowestPrice, JSON.stringify(priceHistory), Date.now(), wishlistGameId);
    } catch (error) {
      console.error('Failed to update price:', error);
    }
  }

  /**
   * Trigger price alert
   */
  private async triggerPriceAlert(game: WishlistGame, currentPrice: number, discount?: number): Promise<PriceAlert> {
    const alert: PriceAlert = {
      id: `alert_${game.id}_${Date.now()}`,
      wishlistGameId: game.id,
      gameName: game.title,
      targetPrice: game.targetPrice!,
      currentPrice,
      discountPercent: discount || 0,
      triggered: true,
      triggeredAt: Date.now()
    };

    // Save alert to database
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO price_alerts (
          id, wishlistGameId, gameName, targetPrice, currentPrice,
          discountPercent, triggered, triggeredAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        alert.id,
        alert.wishlistGameId,
        alert.gameName,
        alert.targetPrice,
        alert.currentPrice,
        alert.discountPercent,
        1,
        alert.triggeredAt
      );
    } catch (error) {
      console.error('Failed to save price alert:', error);
    }

    // Send notification
    if (this.notificationService) {
      const discountText = discount ? ` (${discount}% off)` : '';
      this.notificationService.show({
        title: '💰 Price Alert!',
        body: `${game.title} is now $${currentPrice}${discountText} - Below your target of $${game.targetPrice}!`,
        icon: game.coverUrl
      });
    }

    return alert;
  }

  /**
   * Add game to wishlist
   */
  addToWishlist(game: Omit<WishlistGame, 'id' | 'addedAt' | 'priceHistory'>): string {
    const platform = game.platform || 'Steam';
    const platformId = String(game.platformId);

    try {
      const db = getDb();
      const existing = db
        .prepare('SELECT id FROM wishlist WHERE lower(platform) = lower(?) AND platformId = ?')
        .get(platform, platformId) as { id: string } | undefined;
      if (existing) return existing.id;
    } catch (e) {
      console.warn('addToWishlist duplicate check failed:', e);
    }

    const id = `wishlist_${game.platformId}_${Date.now()}`;

    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO wishlist (
          id, title, platform, platformId, coverUrl, currentPrice,
          originalPrice, discountPercent, currency, targetPrice,
          priceHistory, addedAt, priceAlertEnabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        game.title,
        platform,
        platformId,
        game.coverUrl || null,
        game.currentPrice || null,
        game.originalPrice || null,
        game.discountPercent || 0,
        game.currency || 'USD',
        game.targetPrice || null,
        JSON.stringify([]),
        Date.now(),
        game.priceAlertEnabled ? 1 : 0
      );
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
    }

    return id;
  }

  /**
   * Remove from wishlist
   */
  removeFromWishlist(wishlistGameId: string) {
    try {
      const db = getDb();
      db.prepare('DELETE FROM wishlist WHERE id = ?').run(wishlistGameId);
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  }

  /**
   * Get all wishlist games
   */
  getAllWishlistGames(): WishlistGame[] {
    try {
      const db = getDb();
      const games = db.prepare(`
        SELECT * FROM wishlist
        ORDER BY addedAt DESC
      `).all() as any[];

      return games.map(g => ({
        id: g.id,
        title: g.title,
        platform: g.platform,
        platformId: g.platformId,
        coverUrl: g.coverUrl,
        currentPrice: g.currentPrice,
        originalPrice: g.originalPrice,
        discountPercent: g.discountPercent,
        currency: g.currency,
        lowestPrice: g.lowestPrice,
        targetPrice: g.targetPrice,
        priceHistory: g.priceHistory ? JSON.parse(g.priceHistory) : [],
        addedAt: g.addedAt,
        lastChecked: g.lastChecked,
        priceAlertEnabled: Boolean(g.priceAlertEnabled)
      }));
    } catch (error) {
      console.error('Failed to get wishlist games:', error);
      return [];
    }
  }

  /**
   * Get games with active discounts
   */
  getDiscountedGames(): WishlistGame[] {
    try {
      const db = getDb();
      const games = db.prepare(`
        SELECT * FROM wishlist
        WHERE discountPercent > 0
        ORDER BY discountPercent DESC
      `).all() as any[];

      return games.map(g => ({
        id: g.id,
        title: g.title,
        platform: g.platform,
        platformId: g.platformId,
        coverUrl: g.coverUrl,
        currentPrice: g.currentPrice,
        originalPrice: g.originalPrice,
        discountPercent: g.discountPercent,
        currency: g.currency,
        lowestPrice: g.lowestPrice,
        targetPrice: g.targetPrice,
        priceHistory: g.priceHistory ? JSON.parse(g.priceHistory) : [],
        addedAt: g.addedAt,
        lastChecked: g.lastChecked,
        priceAlertEnabled: Boolean(g.priceAlertEnabled)
      }));
    } catch (error) {
      console.error('Failed to get discounted games:', error);
      return [];
    }
  }

  /**
   * Update target price for price alert
   */
  setTargetPrice(wishlistGameId: string, targetPrice: number, enabled: boolean = true) {
    try {
      const db = getDb();
      db.prepare('UPDATE wishlist SET targetPrice = ?, priceAlertEnabled = ? WHERE id = ?')
        .run(targetPrice, enabled ? 1 : 0, wishlistGameId);
    } catch (error) {
      console.error('Failed to set target price:', error);
    }
  }

  /**
   * Get price alerts
   */
  getPriceAlerts(onlyTriggered: boolean = true): PriceAlert[] {
    try {
      const db = getDb();
      let query = 'SELECT * FROM price_alerts';

      if (onlyTriggered) {
        query += ' WHERE triggered = 1';
      }

      query += ' ORDER BY triggeredAt DESC';

      const alerts = db.prepare(query).all() as any[];

      return alerts.map(a => ({
        id: a.id,
        wishlistGameId: a.wishlistGameId,
        gameName: a.gameName,
        targetPrice: a.targetPrice,
        currentPrice: a.currentPrice,
        discountPercent: a.discountPercent,
        triggered: Boolean(a.triggered),
        triggeredAt: a.triggeredAt
      }));
    } catch (error) {
      console.error('Failed to get price alerts:', error);
      return [];
    }
  }

  /**
   * Dismiss price alert
   */
  dismissAlert(alertId: string) {
    try {
      const db = getDb();
      db.prepare('DELETE FROM price_alerts WHERE id = ?').run(alertId);
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  }

  /**
   * Get wishlist statistics
   */
  getWishlistStats(): {
    totalGames: number;
    totalValue: number;
    discountedGames: number;
    averageDiscount: number;
  } {
    try {
      const db = getDb();
      const stats = db.prepare(`
        SELECT
          COUNT(*) as totalGames,
          SUM(CASE WHEN currentPrice IS NOT NULL THEN currentPrice ELSE 0 END) as totalValue,
          SUM(CASE WHEN discountPercent > 0 THEN 1 ELSE 0 END) as discountedGames,
          AVG(CASE WHEN discountPercent > 0 THEN discountPercent ELSE 0 END) as averageDiscount
        FROM wishlist
      `).get() as any;

      return {
        totalGames: stats.totalGames || 0,
        totalValue: stats.totalValue || 0,
        discountedGames: stats.discountedGames || 0,
        averageDiscount: Math.round(stats.averageDiscount || 0)
      };
    } catch (error) {
      console.error('Failed to get wishlist stats:', error);
      return { totalGames: 0, totalValue: 0, discountedGames: 0, averageDiscount: 0 };
    }
  }

  /**
   * Pull public Steam wishlist (store) for a Steam64 ID and merge into local DB.
   */
  async importSteamWishlist(steamId: string): Promise<{ added: number; skipped: number; failed: number }> {
    const sid = String(steamId).trim();
    const result = { added: 0, skipped: 0, failed: 0 };
    if (!/^\d+$/.test(sid)) {
      throw new Error('Invalid Steam ID — use your numeric Steam64 (Integrations in Settings).');
    }

    try {
      const url = `https://store.steampowered.com/wishlist/profiles/${sid}/wishlistdata/?v=1`;
      const res = await axios.get(url, {
        timeout: 20000,
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        },
      });

      const data = res.data;
      if (!data || typeof data !== 'object') {
        throw new Error('Wishlist response was empty (profile may be private or Steam unavailable).');
      }

      const appIds = Object.keys(data).filter(k => /^\d+$/.test(k));
      const CONCURRENCY = 5;
      const db = getDb();

      const fetchTitle = async (appId: string): Promise<string> => {
        try {
          const r = await axios.get(`https://store.steampowered.com/api/appdetails`, {
            params: { appids: appId },
            timeout: 12000,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            },
          });
          const block = r.data?.[appId];
          if (block?.success && block.data?.name) return String(block.data.name);
        } catch {
          /* ignore */
        }
        return `Steam app ${appId}`;
      };

      let cursor = 0;
      const worker = async () => {
        while (cursor < appIds.length) {
          const idx = cursor++;
          const appId = appIds[idx];
          try {
            const exists = db
              .prepare('SELECT id FROM wishlist WHERE lower(platform) = lower(?) AND platformId = ?')
              .get('Steam', appId);
            if (exists) {
              result.skipped++;
              continue;
            }
            const title = await fetchTitle(appId);
            this.addToWishlist({
              title,
              platform: 'Steam',
              platformId: appId,
              coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
              discountPercent: 0,
              currency: 'USD',
              priceAlertEnabled: false,
            });
            result.added++;
          } catch {
            result.failed++;
          }
          await new Promise(r => setTimeout(r, 120));
        }
      };

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, appIds.length) }, () => worker()));
    } catch (e: any) {
      console.error('importSteamWishlist failed:', e);
      throw new Error(e?.message || 'Steam wishlist import failed');
    }

    return result;
  }
}
