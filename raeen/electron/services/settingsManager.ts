import { getDb } from '../database';
import fs from 'fs';
import path from 'path';
import { app, nativeImage } from 'electron';
import { fileURLToPath } from 'node:url';

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
    enableParticles: boolean;
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
    enableParticles: true,
    customBackground: '',
    blurLevel: 'low',
    overlayOpacity: 0,
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

    // BUG-072: only coerce to Number for known-numeric keys. Blanket coercion
    // turned strings like a Steam API key "12345..." into a Number, breaking
    // any code that compared/sent it as a string.
    const NUMERIC_KEYS = new Set<string>([
      'overlayOpacity', 'targetFps', 'volume', 'fps', 'cpuTempLimit', 'gpuTempLimit',
    ]);

    rows.forEach(row => {
      try {
        const [category, key] = row.key.split('.');
        if (category && key && (settings as any)[category]) {
           let val: any = row.value;
           if (val === 'true') val = true;
           else if (val === 'false') val = false;
           else if (NUMERIC_KEYS.has(key) && val !== '' && !isNaN(Number(val))) val = Number(val);
           // everything else stays as string

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
          // BUG-020: validate size before copy to prevent OOM crashes on low-RAM systems.
          const stat = await fs.promises.stat(filePath);
          const MAX_BYTES = 16 * 1024 * 1024; // 16 MB
          if (stat.size > MAX_BYTES) {
              throw new Error(`Background image is too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_BYTES / 1024 / 1024} MB.`);
          }

          const userDataPath = app.getPath('userData');
          const backgroundsDir = path.join(userDataPath, 'backgrounds');

          if (!fs.existsSync(backgroundsDir)) {
              fs.mkdirSync(backgroundsDir, { recursive: true });
          }

          const ext = path.extname(filePath).toLowerCase();
          // BUG-020: reject suspicious extensions
          const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
          if (!ALLOWED.has(ext)) {
              throw new Error(`Unsupported image type: ${ext}`);
          }
          const fileName = `bg_${Date.now()}${ext}`;
          const destPath = path.join(backgroundsDir, fileName);

          await fs.promises.copyFile(filePath, destPath);

          // BUG-062: return safe-file:// (custom Electron protocol) so the
          // renderer can load the image without webSecurity:false.
          return `safe-file:///${destPath.replace(/\\/g, '/')}`;
      } catch (error) {
          console.error('Failed to upload background:', error);
          throw error;
      }
  }

  /** Same allow-list roots as `safe-file` protocol (must stay in sync). */
  private getSafeBackgroundRoots(): string[] {
    return [
      app.getPath('userData'),
      app.getPath('pictures'),
      app.getPath('temp'),
      app.getPath('home'),
    ].map((p) => path.resolve(p));
  }

  /** Resolve stored launcher background reference to an absolute file path, or null. */
  resolveAllowedBackgroundPath(stored: string): string | null {
    const s = String(stored).trim();
    if (!s || /^https?:\/\//i.test(s)) return null;
    try {
      let resolved: string;
      if (/^safe-file:/i.test(s)) {
        const asFile = s.replace(/^safe-file:/i, 'file:');
        resolved = path.resolve(fileURLToPath(new URL(asFile)));
      } else if (s.startsWith('file:')) {
        resolved = path.resolve(fileURLToPath(new URL(s)));
      } else if (/^[a-zA-Z]:[\\/]/.test(s)) {
        resolved = path.resolve(s);
      } else {
        return null;
      }

      const rl = resolved.toLowerCase();
      const allowed = this.getSafeBackgroundRoots().some((root) => {
        const rootResolved = path.resolve(root).toLowerCase();
        return rl.startsWith(rootResolved + path.sep) || rl === rootResolved;
      });
      if (!allowed || !fs.existsSync(resolved)) return null;
      return resolved;
    } catch {
      return null;
    }
  }

  /**
   * Raster reference suitable for <img src> in the renderer (data URL).
   * Keeps payload reasonable by downsampling very wide images.
   */
  getBackgroundImageDataUrl(stored: string): string | null {
    const abs = this.resolveAllowedBackgroundPath(stored);
    if (!abs) return null;
    try {
      let img = nativeImage.createFromPath(abs);
      if (img.isEmpty()) return null;
      const { width } = img.getSize();
      if (width > 2400) {
        img = img.resize({ width: 2400 });
      }
      return img.toDataURL();
    } catch (e) {
      console.error('getBackgroundImageDataUrl failed:', e);
      return null;
    }
  }
}
