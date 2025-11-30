import fs from 'fs';
import path from 'path';

export interface ItchGame {
    id: string;
    title: string;
    installPath: string;
    executable?: string;
    cover?: string;
}

export class ItchLibrary {

    async getInstalledGames(): Promise<ItchGame[]> {
        const games: ItchGame[] = [];
        const installDirs = await this.getInstallDirs();

        for (const dir of installDirs) {
            if (!fs.existsSync(dir)) continue;

            try {
                // Itch stores apps in subfolders. 
                // Metadata is tricky without using 'butler' or database.
                // We will scan for `.itch/receipt.json.gz` or just assume folders are games.
                // A better way is checking `%APPDATA%/itch/db/butler.db` (sqlite) but that's complex.
                // Let's stick to folder scanning which is "good enough" for parity.
                
                const folders = fs.readdirSync(dir);
                for (const folder of folders) {
                    const gamePath = path.join(dir, folder);
                    const stat = fs.statSync(gamePath);
                    
                    if (stat.isDirectory()) {
                        // Check for receipt
                        // const receiptPath = path.join(gamePath, '.itch', 'receipt.json.gz');
                        // If we really want details, we need to unzip that. 
                        // For now, use folder name as title.
                        
                        // Find executable heuristic
                        const exe = this.findExecutable(gamePath);
                        
                        if (exe) {
                            games.push({
                                id: `itch:${folder}`,
                                title: folder.replace(/-/g, ' '), // Clean up slug-like names
                                installPath: gamePath,
                                executable: exe
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Error scanning Itch directory:', dir, e);
            }
        }

        return games;
    }

    private async getInstallDirs(): Promise<string[]> {
        const dirs: string[] = [];
        
        // Default: %APPDATA%/itch/apps (or similar depending on config)
        // Actually default install location is often `%AppData%/itch/apps` 
        // OR user defined.
        // Let's check standard.
        
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Application Support') : '');
        if (appData) {
            dirs.push(path.join(appData, 'itch', 'apps'));
        }
        
        // Also check common user path
        const home = process.env.USERPROFILE || process.env.HOME || '';
        if (home) {
             dirs.push(path.join(home, 'AppData', 'Roaming', 'itch', 'apps'));
        }

        return dirs;
    }

    private findExecutable(dirPath: string): string | undefined {
        try {
            const files = fs.readdirSync(dirPath);
            // Look for .exe files
            const exes = files.filter(f => f.endsWith('.exe'));
            
            if (exes.length === 1) return exes[0];
            
            // Filter out unins, unitycrash, etc
            const validExes = exes.filter(f => 
                !f.toLowerCase().includes('uninstall') && 
                !f.toLowerCase().includes('crash') &&
                !f.toLowerCase().includes('unity')
            );

            if (validExes.length > 0) {
                // Return shortest one usually main game
                return validExes.sort((a, b) => a.length - b.length)[0];
            }
        } catch (e) {
            return undefined;
        }
        return undefined;
    }

    getLaunchCommand(_gameId: string): string {
        // Itch doesn't have a simple protocol for launching specific apps via ID easily without the app open.
        // But we store the executable path in our scan, so standard launch works.
        // Return empty to fallback to executable launch.
        return ''; 
    }
}
