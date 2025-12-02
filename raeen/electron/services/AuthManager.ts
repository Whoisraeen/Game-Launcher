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
                return;
            }

            this.loginWindow = new BrowserWindow({
                width: 800,
                height: 600,
                show: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    partition: 'persist:steam_auth' // Use persistent partition to save cookies
                }
            });

            this.loginWindow.loadURL('https://steamcommunity.com/login/home/?goto=');

            // Check for successful login by monitoring redirects or cookies
            this.loginWindow.webContents.on('did-navigate', async (event, url) => {
                if (url.includes('steamcommunity.com/id/') || url.includes('steamcommunity.com/profiles/')) {
                    // Login successful
                    const cookies = await session.fromPartition('persist:steam_auth').cookies.get({ domain: 'steamcommunity.com' });
                    
                    // Verify we have the essential auth cookie
                    const sessionCookie = cookies.find(c => c.name === 'steamLoginSecure');
                    
                    if (sessionCookie) {
                        // Extract Steam ID from URL or Cookie
                        // steamLoginSecure format: steamid%7C%7Ctoken
                        const steamId = sessionCookie.value.split('%7C%7C')[0];
                        
                        this.saveAuthToken('steam', {
                            steamId: steamId,
                            cookies: cookies
                        });

                        if (this.loginWindow) {
                            this.loginWindow.close();
                            this.loginWindow = null;
                        }
                        resolve(true);
                    }
                }
            });

            this.loginWindow.on('closed', () => {
                this.loginWindow = null;
                resolve(false); // Closed without success
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
