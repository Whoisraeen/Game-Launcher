import { BrowserWindow, session, ipcMain } from 'electron';
import { getDb } from '../database';

export class AuthManager {
    private loginWindow: BrowserWindow | null = null;

    constructor() {
        this.registerHandlers();
    }

    private registerHandlers() {
        ipcMain.handle('auth:steam', async () => {
            return await this.loginSteam();
        });

        ipcMain.handle('auth:epic', async () => {
            return await this.loginEpic();
        });
    }

    async loginSteam(): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.loginWindow) {
                this.loginWindow.focus();
                resolve(false); // BUG-067: focus existing instead of leaking a new pending Promise
                return;
            }

            this.loginWindow = new BrowserWindow({
                width: 800,
                height: 600,
                show: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    partition: 'persist:steam_auth'
                }
            });

            this.loginWindow.loadURL('https://steamcommunity.com/login/home/?goto=');

            // BUG-067: settle the Promise exactly once and add a hard timeout +
            // crash listeners so a stalled or crashed login window can never
            // hang the caller forever.
            let settled = false;
            const settle = (val: boolean) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutHandle);
                if (this.loginWindow) {
                    try { this.loginWindow.close(); } catch { /* */ }
                    this.loginWindow = null;
                }
                resolve(val);
            };

            const timeoutHandle = setTimeout(() => settle(false), 5 * 60 * 1000); // 5 min ceiling

            this.loginWindow.webContents.on('did-navigate', async (_event, url) => {
                if (url.includes('steamcommunity.com/id/') || url.includes('steamcommunity.com/profiles/')) {
                    try {
                        const cookies = await session.fromPartition('persist:steam_auth').cookies.get({ domain: 'steamcommunity.com' });
                        const sessionCookie = cookies.find(c => c.name === 'steamLoginSecure');
                        if (sessionCookie) {
                            const steamId = sessionCookie.value.split('%7C%7C')[0];
                            this.saveAuthToken('steam', { steamId, cookies });
                            settle(true);
                        }
                    } catch (err) {
                        console.error('Steam login post-auth error:', err);
                        settle(false);
                    }
                }
            });

            this.loginWindow.webContents.on('render-process-gone', (_e, details) => {
                console.warn('Steam login renderer crashed:', details);
                settle(false);
            });
            this.loginWindow.webContents.on('did-fail-load', (_e, code, desc) => {
                if (code === -3) return; // user aborted navigation — not a hard failure
                console.warn(`Steam login load failed: ${code} ${desc}`);
            });

            this.loginWindow.on('closed', () => {
                this.loginWindow = null;
                settle(false);
            });
        });
    }

    async loginEpic(): Promise<boolean> {
        // Placeholder for Epic Games login flow (similar concept)
        return false;
    }

    private saveAuthToken(platform: string, data: any) {
        const db = getDb();
        // We'll store this in a new 'auth_tokens' table or just use settings for now
        // Ideally, encrypt sensitive tokens. For now, we store in settings for simplicity.
        
        // We update the integrations settings
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        
        // Save SteamID
        if (platform === 'steam') {
            stmt.run('integrations.steamId', data.steamId);
            // We don't store full cookies in DB usually, Electron's session handles persistence.
            // But we mark it as 'connected'
            stmt.run('integrations.steamConnected', 'true');
        }
    }
    
    // Helper to get authenticated session for scraping
    getSession(platform: string) {
        if (platform === 'steam') {
            return session.fromPartition('persist:steam_auth');
        }
        return session.defaultSession;
    }
}
