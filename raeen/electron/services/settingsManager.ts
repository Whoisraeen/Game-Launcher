import { getDb } from '../database';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

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
    customBackground?: string;
    blurLevel: 'low' | 'medium' | 'high';
    overlayOpacity: number;
    accentColor: string;
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
  integrations: {
    steamApiKey: string;
    steamId: string;
    discordId?: string;
    discordEnabled?: boolean;
    xboxId?: string;
    epicId?: string;
    gogId?: string;
  };
  obs: {
    address: string;
    password?: string;
  };
  performance: {
    optimizeOnLaunch: boolean;
    showOverlay: boolean;
    targetFps?: number;
    memoryCleanup?: boolean;
  };
  gaming: {
    preGameHealthCheck: boolean;
    autoCloseBackgroundApps: boolean;
    crashAnalysis: boolean;
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
    customBackground: '',
    blurLevel: 'medium',
    overlayOpacity: 0.6,
    accentColor: '#4f46e5',
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
  integrations: {
    steamApiKey: '',
    steamId: '',
    discordId: '',
    discordEnabled: true,
    xboxId: '',
    epicId: '',
    gogId: '',
  },
  obs: {
    address: 'localhost:4444',
    password: '',
  },
  performance: {
    optimizeOnLaunch: false,
    showOverlay: false,
    targetFps: 60,
    memoryCleanup: true,
  },
  gaming: {
    preGameHealthCheck: true,
    autoCloseBackgroundApps: false,
    crashAnalysis: true,
  },
};

export class SettingsManager {
  
  getAllSettings(): UserSettings {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    
    const settings = { ...DEFAULT_SETTINGS };

    rows.forEach(row => {
      try {
        const [category, key] = row.key.split('.');
        if (category && key && (settings as any)[category]) {
           // Handle type conversion if needed
           let val: any = row.value;
           if (val === 'true') val = true;
           if (val === 'false') val = false;
           if (!isNaN(Number(val)) && val !== '') val = Number(val);
           
           (settings as any)[category][key] = val;
        }
      } catch (e) {
        console.warn(`Failed to parse setting: ${row.key}`);
      }
    });

    return settings;
  }

  updateSetting(category: string, values: any): UserSettings {
    const db = getDb();
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    const transaction = db.transaction((cat, vals) => {
      Object.entries(vals).forEach(([key, value]) => {
        stmt.run(`${cat}.${key}`, String(value));
      });
    });

    transaction(category, values);
    return this.getAllSettings();
  }

  async uploadBackground(filePath: string): Promise<string> {
      try {
          const userDataPath = app.getPath('userData');
          const backgroundsDir = path.join(userDataPath, 'backgrounds');
          
          if (!fs.existsSync(backgroundsDir)) {
              fs.mkdirSync(backgroundsDir, { recursive: true });
          }

          const ext = path.extname(filePath);
          const fileName = `bg_${Date.now()}${ext}`;
          const destPath = path.join(backgroundsDir, fileName);

          await fs.promises.copyFile(filePath, destPath);
          
          // Return file protocol URL for easy display in renderer
          return `file://${destPath.replace(/\\/g, '/')}`;
      } catch (error) {
          console.error('Failed to upload background:', error);
          throw error;
      }
  }
}
