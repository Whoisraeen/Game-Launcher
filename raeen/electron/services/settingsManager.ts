import { getDb } from '../database';

export interface UserSettings {
  general: {
    launchOnStartup: boolean;
    startMinimized: boolean;
    autoDetectGames: boolean;
  };
  appearance: {
    theme: 'dark' | 'light' | 'cyberpunk' | 'midnight';
    enableTransparency: boolean;
    animatedBackgrounds: boolean;
  };
  gameManagement: {
    closeOnLaunch: boolean;
    cloudSync: boolean;
  };
  account: {
    username: string;
    avatar: string;
    status: 'online' | 'offline' | 'playing' | 'away';
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  general: {
    launchOnStartup: true,
    startMinimized: false,
    autoDetectGames: true,
  },
  appearance: {
    theme: 'dark',
    enableTransparency: true,
    animatedBackgrounds: true,
  },
  gameManagement: {
    closeOnLaunch: false,
    cloudSync: true,
  },
  account: {
    username: 'Guest',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
    status: 'online',
  },
};

export class SettingsManager {
  
  getAllSettings(): UserSettings {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    
    const settings: any = { ...DEFAULT_SETTINGS };

    // Hydrate from DB
    for (const row of rows) {
      try {
        // We store nested keys as 'category.key' or just rely on the structure
        // But for simplicity in this key-value table, let's assume we store the whole JSON for each category
        // OR we store flat keys.
        
        // Let's support flat keys for categories: 'general', 'appearance', 'gameManagement'
        if (settings[row.key]) {
            settings[row.key] = { ...settings[row.key], ...JSON.parse(row.value) };
        }
      } catch (e) {
        console.error(`Failed to parse setting for ${row.key}`, e);
      }
    }

    return settings as UserSettings;
  }

  updateSetting<K extends keyof UserSettings>(category: K, value: Partial<UserSettings[K]>) {
    const db = getDb();
    
    // Get current category value
    const current = this.getCategory(category);
    const updated = { ...current, ...value };
    
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(category, JSON.stringify(updated), Date.now());

    return this.getAllSettings();
  }

  private getCategory<K extends keyof UserSettings>(category: K): UserSettings[K] {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(category) as { value: string } | undefined;
    
    if (row) {
      try {
        return { ...DEFAULT_SETTINGS[category], ...JSON.parse(row.value) };
      } catch (e) {
        return DEFAULT_SETTINGS[category];
      }
    }
    
    return DEFAULT_SETTINGS[category];
  }
}
