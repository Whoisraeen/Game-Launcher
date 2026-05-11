import { Notification, nativeImage } from 'electron';
import { getDb } from '../database';
import path from 'path';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
  actions?: Array<{ type: string; text: string }>;
  tag?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  friendOnline: boolean;
  friendPlaying: boolean;
  achievementUnlocked: boolean;
  gameUpdateAvailable: boolean;
  wishlistSale: boolean;
  newsUpdate: boolean;
  sessionReminder: boolean;
  sound: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  friendOnline: true,
  friendPlaying: true,
  achievementUnlocked: true,
  gameUpdateAvailable: true,
  wishlistSale: true,
  newsUpdate: true,
  sessionReminder: true,
  sound: true,
};

export class NotificationService {
  private preferences: NotificationPreferences;
  private notificationHistory: Array<{ id: string; timestamp: number; type: string; title: string }> = [];
  // BUG-025: persist last-sent timestamps to disk so a launcher restart doesn't
  // re-fire identical notifications the user has already seen.
  private recentNotifications: Map<string, number> = new Map(); // key → ts
  private cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly THROTTLE_WINDOW_MS = 30 * 60 * 1000; // 30 min

  constructor() {
    this.preferences = this.loadPreferences();
    this.loadThrottleStateFromDisk();
    this.startCleanupTimer();
  }

  private throttlePath(): string | null {
    try {
      const { app } = require('electron');
      const path = require('node:path');
      return path.join(app.getPath('userData'), 'notification-throttle.json');
    } catch { return null; }
  }

  private loadThrottleStateFromDisk(): void {
    try {
      const fs = require('node:fs');
      const file = this.throttlePath();
      if (!file || !fs.existsSync(file)) return;
      const obj = JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
      const now = Date.now();
      for (const [k, ts] of Object.entries(obj)) {
        if (typeof ts === 'number' && now - ts < NotificationService.THROTTLE_WINDOW_MS) {
          this.recentNotifications.set(k, ts);
        }
      }
    } catch {/* non-fatal */}
  }

  private saveThrottleStateToDisk(): void {
    try {
      const fs = require('node:fs');
      const file = this.throttlePath();
      if (!file) return;
      const obj: Record<string, number> = {};
      for (const [k, ts] of this.recentNotifications.entries()) obj[k] = ts;
      fs.writeFileSync(file, JSON.stringify(obj), 'utf8');
    } catch {/* non-fatal */}
  }

  /**
   * Load notification preferences from database
   */
  private loadPreferences(): NotificationPreferences {
    try {
      const db = getDb();
      const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('notifications') as { value: string } | undefined;

      if (result) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(result.value) };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  /**
   * Save notification preferences to database
   */
  public savePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };

    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run('notifications', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Get current preferences
   */
  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Show a notification
   */
  public showNotification(options: NotificationOptions, type: string): void {
    if (!this.preferences.enabled) {
      return;
    }

    // BUG-025: throttle window survives restarts (loaded from disk in ctor).
    const notificationKey = `${type}:${options.title}:${options.body}`;
    const now = Date.now();
    const lastTs = this.recentNotifications.get(notificationKey);
    if (lastTs && now - lastTs < NotificationService.THROTTLE_WINDOW_MS) {
      return;
    }

    try {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon: options.icon ? nativeImage.createFromPath(options.icon) : undefined,
        silent: options.silent ?? !this.preferences.sound,
        urgency: options.urgency ?? 'normal',
        timeoutType: 'default',
      });

      notification.show();

      // Track notification (BUG-025: persist throttle state)
      this.recentNotifications.set(notificationKey, now);
      this.saveThrottleStateToDisk();
      this.notificationHistory.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type,
        title: options.title,
      });

      // Keep history limited to last 100 notifications
      if (this.notificationHistory.length > 100) {
        this.notificationHistory = this.notificationHistory.slice(-100);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Friend came online notification
   */
  public notifyFriendOnline(friendName: string, platform: string): void {
    if (!this.preferences.friendOnline) return;

    this.showNotification({
      title: `${friendName} is online`,
      body: `Your friend ${friendName} just came online on ${platform}`,
      urgency: 'low',
    }, 'friend-online');
  }

  /**
   * Friend started playing a game notification
   */
  public notifyFriendPlaying(friendName: string, gameName: string): void {
    if (!this.preferences.friendPlaying) return;

    this.showNotification({
      title: `${friendName} started playing`,
      body: `${friendName} is now playing ${gameName}`,
      urgency: 'low',
    }, 'friend-playing');
  }

  /**
   * Achievement unlocked notification
   */
  public notifyAchievementUnlocked(achievementName: string, gameName: string, icon?: string): void {
    if (!this.preferences.achievementUnlocked) return;

    this.showNotification({
      title: `Achievement Unlocked!`,
      body: `${achievementName} in ${gameName}`,
      icon,
      urgency: 'normal',
    }, 'achievement');
  }

  /**
   * Game update available notification
   */
  public notifyGameUpdate(gameName: string, platform: string, updateSize?: string): void {
    if (!this.preferences.gameUpdateAvailable) return;

    const sizeText = updateSize ? ` (${updateSize})` : '';
    this.showNotification({
      title: `Update Available`,
      body: `${gameName} on ${platform} has an update${sizeText}`,
      urgency: 'normal',
    }, 'game-update');
  }

  /**
   * Wishlist game on sale notification
   */
  public notifyWishlistSale(gameName: string, platform: string, discount: number, oldPrice: string, newPrice: string): void {
    if (!this.preferences.wishlistSale) return;

    this.showNotification({
      title: `Sale Alert: ${gameName}`,
      body: `${discount}% OFF! Now ${newPrice} (was ${oldPrice}) on ${platform}`,
      urgency: 'normal',
    }, 'wishlist-sale');
  }

  /**
   * Game Crash notification
   */
  public notifyCrash(gameName: string): void {
    this.showNotification({
      title: `Game Crash Detected`,
      body: `We detected a crash for ${gameName}. Click for analysis and solutions.`,
      urgency: 'critical',
    }, 'crash-report');
  }

  /**
   * News update notification
   */
  public notifyNewsUpdate(gameName: string, headline: string): void {
    if (!this.preferences.newsUpdate) return;

    this.showNotification({
      title: `News: ${gameName}`,
      body: headline,
      urgency: 'low',
    }, 'news-update');
  }

  /**
   * Gaming session reminder notification
   */
  public notifySessionReminder(message: string): void {
    if (!this.preferences.sessionReminder) return;

    this.showNotification({
      title: `Gaming Session Reminder`,
      body: message,
      urgency: 'normal',
    }, 'session-reminder');
  }

  /**
   * Generic notification (for custom use)
   */
  public notify(title: string, body: string, options?: Partial<NotificationOptions>): void {
    this.showNotification({
      title,
      body,
      ...options,
    }, 'custom');
  }

  /**
   * Get notification history
   */
  public getHistory(): Array<{ id: string; timestamp: number; type: string; title: string }> {
    return [...this.notificationHistory];
  }

  /**
   * Clear notification history
   */
  public clearHistory(): void {
    this.notificationHistory = [];
  }

  /**
   * Start cleanup timer to remove old notifications from recent set
   */
  private startCleanupTimer(): void {
    // BUG-025: every minute, drop entries past the throttle window so the
    // persisted file doesn't grow unbounded.
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let removed = 0;
      for (const [key, ts] of this.recentNotifications.entries()) {
        if (now - ts > NotificationService.THROTTLE_WINDOW_MS) {
          this.recentNotifications.delete(key);
          removed++;
        }
      }
      if (removed > 0) this.saveThrottleStateToDisk();
    }, 60_000);
  }

  /**
   * Stop cleanup timer (for cleanup when service is destroyed)
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
