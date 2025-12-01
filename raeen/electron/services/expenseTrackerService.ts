import { getDb } from '../database';

export interface GamePurchase {
  id: string;
  gameId?: string;
  gameName: string;
  platform: string;
  price: number;
  currency: string;
  purchaseDate: number;
  genre?: string;
  source: 'manual' | 'wishlist' | 'import'; // How the purchase was tracked
  createdAt: number;
}

export interface ExpenseStats {
  totalSpent: number;
  totalGames: number;
  totalPlaytime: number; // hours
  costPerHour: number;
  monthlySpending: Array<{ month: string; amount: number; year: number }>;
  genreBreakdown: Array<{ genre: string; amount: number; count: number }>;
  platformBreakdown: Array<{ platform: string; amount: number; count: number }>;
  averageGamePrice: number;
  mostExpensiveGame: { name: string; price: number } | null;
}

export class ExpenseTrackerService {
  constructor() {
    this.initializeTable();
  }

  private initializeTable() {
    const db = getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS game_purchases (
        id TEXT PRIMARY KEY,
        game_id TEXT,
        game_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        purchase_date INTEGER NOT NULL,
        genre TEXT,
        source TEXT DEFAULT 'manual',
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_purchases_date ON game_purchases(purchase_date);
      CREATE INDEX IF NOT EXISTS idx_purchases_game_id ON game_purchases(game_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_genre ON game_purchases(genre);
    `);
  }

  /**
   * Add a new purchase
   */
  addPurchase(purchase: Omit<GamePurchase, 'id' | 'createdAt'>): GamePurchase {
    const db = getDb();

    const id = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    db.prepare(`
      INSERT INTO game_purchases (
        id, game_id, game_name, platform, price, currency,
        purchase_date, genre, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      purchase.gameId || null,
      purchase.gameName,
      purchase.platform,
      purchase.price,
      purchase.currency,
      purchase.purchaseDate,
      purchase.genre || null,
      purchase.source,
      now
    );

    return {
      id,
      ...purchase,
      createdAt: now
    };
  }

  /**
   * Get all purchases
   */
  getAllPurchases(): GamePurchase[] {
    const db = getDb();
    const purchases = db.prepare(`
      SELECT * FROM game_purchases
      ORDER BY purchase_date DESC
    `).all() as any[];

    return purchases.map(this.mapPurchase);
  }

  /**
   * Get purchases for a specific year
   */
  getPurchasesForYear(year: number): GamePurchase[] {
    const db = getDb();
    const startDate = new Date(year, 0, 1).getTime();
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999).getTime();

    const purchases = db.prepare(`
      SELECT * FROM game_purchases
      WHERE purchase_date >= ? AND purchase_date <= ?
      ORDER BY purchase_date DESC
    `).all(startDate, endDate) as any[];

    return purchases.map(this.mapPurchase);
  }

  /**
   * Delete a purchase
   */
  deletePurchase(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM game_purchases WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Get comprehensive expense statistics
   */
  getExpenseStats(year?: number): ExpenseStats {
    const db = getDb();
    const currentYear = year || new Date().getFullYear();

    // Get purchases for the year
    const purchases = this.getPurchasesForYear(currentYear);

    // Calculate total spent
    const totalSpent = purchases.reduce((sum, p) => sum + p.price, 0);
    const totalGames = purchases.length;

    // Get total playtime from games
    const playtimeResult = db.prepare(`
      SELECT SUM(playtime_seconds) as total
      FROM games
    `).get() as any;
    const totalPlaytimeSeconds = playtimeResult?.total || 0;
    const totalPlaytime = totalPlaytimeSeconds / 3600; // Convert to hours

    // Calculate cost per hour
    const costPerHour = totalPlaytime > 0 ? totalSpent / totalPlaytime : 0;

    // Monthly spending breakdown
    const monthlySpending: Array<{ month: string; amount: number; year: number }> = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let month = 0; month < 12; month++) {
      const monthPurchases = purchases.filter(p => {
        const date = new Date(p.purchaseDate);
        return date.getMonth() === month && date.getFullYear() === currentYear;
      });

      const monthTotal = monthPurchases.reduce((sum, p) => sum + p.price, 0);

      monthlySpending.push({
        month: monthNames[month],
        amount: monthTotal,
        year: currentYear
      });
    }

    // Genre breakdown
    const genreMap = new Map<string, { amount: number; count: number }>();
    purchases.forEach(p => {
      const genre = p.genre || 'Unknown';
      const current = genreMap.get(genre) || { amount: 0, count: 0 };
      genreMap.set(genre, {
        amount: current.amount + p.price,
        count: current.count + 1
      });
    });

    const genreBreakdown = Array.from(genreMap.entries()).map(([genre, data]) => ({
      genre,
      amount: data.amount,
      count: data.count
    })).sort((a, b) => b.amount - a.amount);

    // Platform breakdown
    const platformMap = new Map<string, { amount: number; count: number }>();
    purchases.forEach(p => {
      const platform = p.platform || 'Unknown';
      const current = platformMap.get(platform) || { amount: 0, count: 0 };
      platformMap.set(platform, {
        amount: current.amount + p.price,
        count: current.count + 1
      });
    });

    const platformBreakdown = Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      amount: data.amount,
      count: data.count
    })).sort((a, b) => b.amount - a.amount);

    // Average game price
    const averageGamePrice = totalGames > 0 ? totalSpent / totalGames : 0;

    // Most expensive game
    let mostExpensiveGame: { name: string; price: number } | null = null;
    if (purchases.length > 0) {
      const maxPricePurchase = purchases.reduce((max, p) => p.price > max.price ? p : max);
      mostExpensiveGame = {
        name: maxPricePurchase.gameName,
        price: maxPricePurchase.price
      };
    }

    return {
      totalSpent,
      totalGames,
      totalPlaytime,
      costPerHour,
      monthlySpending,
      genreBreakdown,
      platformBreakdown,
      averageGamePrice,
      mostExpensiveGame
    };
  }

  /**
   * Import purchases from existing games in library
   */
  async importFromLibrary(): Promise<number> {
    const db = getDb();

    // Get all games that don't already have a purchase record
    const games = db.prepare(`
      SELECT g.id, g.title, g.platform, g.genre, g.added_at
      FROM games g
      LEFT JOIN game_purchases p ON g.id = p.game_id
      WHERE p.id IS NULL
      AND g.is_installed = 1
    `).all() as any[];

    let imported = 0;

    for (const game of games) {
      // Estimate purchase price based on platform (these are just estimates)
      let estimatedPrice = 0;
      const platform = game.platform?.toLowerCase() || '';

      if (platform.includes('steam') || platform.includes('epic') || platform.includes('gog')) {
        estimatedPrice = 29.99; // Average AAA game price
      } else if (platform.includes('itch')) {
        estimatedPrice = 9.99; // Average indie game price
      }

      // Only import if we have a reasonable estimate
      if (estimatedPrice > 0) {
        this.addPurchase({
          gameId: game.id,
          gameName: game.title,
          platform: game.platform || 'Unknown',
          price: estimatedPrice,
          currency: 'USD',
          purchaseDate: game.added_at || Date.now(),
          genre: game.genre,
          source: 'import'
        });
        imported++;
      }
    }

    return imported;
  }

  /**
   * Map database row to GamePurchase
   */
  private mapPurchase(row: any): GamePurchase {
    return {
      id: row.id,
      gameId: row.game_id,
      gameName: row.game_name,
      platform: row.platform,
      price: row.price,
      currency: row.currency,
      purchaseDate: row.purchase_date,
      genre: row.genre,
      source: row.source,
      createdAt: row.created_at
    };
  }
}
