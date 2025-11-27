import fs from 'fs';
import path from 'path';
import { DriveScanner } from './DriveScanner';

export interface EpicGame {
    id: string;
    title: string;
    installPath: string;
    executable?: string;
}

export class EpicLibrary {

    async getInstalledGames(): Promise<EpicGame[]> {
        const gamesMap = new Map<string, EpicGame>();
        const manifestDirs = await this.getManifestDirs();

        // 1. Parse individual manifests (Primary source for details)
        for (const dir of manifestDirs) {
            if (!fs.existsSync(dir)) continue;

            try {
                const files = fs.readdirSync(dir).filter(f => f.endsWith('.item'));
                for (const file of files) {
                    try {
                        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
                        const manifest = JSON.parse(content);

                        if (this.isValidManifest(manifest)) {
                            const game: EpicGame = {
                                id: manifest.AppName,
                                title: manifest.DisplayName || manifest.AppName,
                                installPath: manifest.InstallLocation,
                                executable: manifest.LaunchExecutable
                            };
                            gamesMap.set(game.id, game);
                        }
                    } catch (e) {
                        console.error(`Error parsing Epic manifest ${file}:`, e);
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        // 2. Parse LauncherInstalled.dat (Fallback source)
        const datPath = 'C:\\ProgramData\\Epic\\UnrealEngineLauncher\\LauncherInstalled.dat';
        if (fs.existsSync(datPath)) {
            try {
                const content = fs.readFileSync(datPath, 'utf-8');
                const data = JSON.parse(content);
                if (data.InstallationList && Array.isArray(data.InstallationList)) {
                    for (const app of data.InstallationList) {
                        if (this.isValidGame(app) && !gamesMap.has(app.AppName)) {
                            gamesMap.set(app.AppName, {
                                id: app.AppName,
                                title: this.cleanTitle(app.AppName),
                                installPath: app.InstallLocation,
                                executable: app.LaunchExecutable
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Error parsing LauncherInstalled.dat:', e);
            }
        }

        return Array.from(gamesMap.values());
    }

    private async getManifestDirs(): Promise<string[]> {
        const dirs: string[] = [];
        const drives = DriveScanner.getDrives();

        // Standard location
        if (process.env.ProgramData) {
            dirs.push(path.join(process.env.ProgramData, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'));
        }

        // Check all drives
        for (const drive of drives) {
            dirs.push(path.join(drive, 'ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'));
        }

        return dirs;
    }

    private isValidGame(app: any): boolean {
        if (!app.AppName) return false;
        if (app.AppName.startsWith('UE_')) return false;
        return true;
    }

    private isValidManifest(manifest: any): boolean {
        if (!manifest.AppName) return false;
        if (manifest.AppName.startsWith('UE_')) return false;
        // Filter out DLCs?
        // Playnite logic: Check if it's a DLC app name or has parent
        return true;
    }

    private cleanTitle(appName: string): string {
        return appName.replace(/([A-Z])/g, ' $1').trim();
    }

    getInstallCommand(appId: string): string {
        return `com.epicgames.launcher://apps/${appId}?action=install`;
    }

    getLaunchCommand(appId: string): string {
        return `com.epicgames.launcher://apps/${appId}?action=launch&silent=true`;
    }
}
