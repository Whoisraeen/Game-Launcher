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
                const files = fs.readdirSync(dir).filter(f =>
                    f.endsWith('.item') || f.endsWith('.manifest')
                );
                for (const file of files) {
                    try {
                        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
                        const manifest = this.parseEpicJson(raw);
                        if (!manifest) continue;

                        const norm = this.normalizeManifestRecord(manifest);
                        if (!norm || !this.isValidManifest(norm)) continue;

                        const installPath = (norm.InstallLocation || '').trim();
                        if (!installPath) continue;

                        const game: EpicGame = {
                            id: norm.AppName,
                            title: norm.DisplayName?.trim() || norm.AppName,
                            installPath,
                            executable: norm.LaunchExecutable
                        };
                        gamesMap.set(game.id, game);
                    } catch (e) {
                        console.error(`Error parsing Epic manifest ${file}:`, e);
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        // 2. Parse LauncherInstalled.dat (Fallback — works when manifests are missing/outdated)
        for (const datPath of this.getLauncherInstalledPaths()) {
            if (!fs.existsSync(datPath)) continue;
            try {
                const raw = fs.readFileSync(datPath, 'utf-8');
                const data = this.parseEpicJson(raw);
                const list = data?.InstallationList ?? data?.installationList;
                if (!Array.isArray(list)) continue;

                for (const app of list) {
                    const norm = this.normalizeInstalledEntry(app);
                    if (!norm || !this.isValidGame(norm)) continue;

                    const installPath = (norm.InstallLocation || '').trim();
                    if (!installPath) continue;

                    if (!gamesMap.has(norm.AppName)) {
                        gamesMap.set(norm.AppName, {
                            id: norm.AppName,
                            title: norm.DisplayName?.trim() || this.cleanTitle(norm.AppName),
                            installPath,
                            executable: norm.LaunchExecutable
                        });
                    }
                }
            } catch (e) {
                console.error('Error parsing LauncherInstalled.dat:', datPath, e);
            }
        }

        return Array.from(gamesMap.values());
    }

    private parseEpicJson(raw: string): any | null {
        try {
            let s = raw.trimStart();
            if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
            return JSON.parse(s);
        } catch {
            return null;
        }
    }

    private normalizeManifestRecord(m: any): { AppName: string; DisplayName?: string; InstallLocation?: string; LaunchExecutable?: string } | null {
        const AppName = m.AppName ?? m.appName;
        if (!AppName || typeof AppName !== 'string') return null;
        return {
            AppName,
            DisplayName: m.DisplayName ?? m.displayName,
            InstallLocation: m.InstallLocation ?? m.installLocation,
            LaunchExecutable: m.LaunchExecutable ?? m.launchExecutable,
        };
    }

    private normalizeInstalledEntry(app: any): { AppName: string; DisplayName?: string; InstallLocation?: string; LaunchExecutable?: string } | null {
        const AppName = app.AppName ?? app.appName;
        if (!AppName || typeof AppName !== 'string') return null;
        return {
            AppName,
            DisplayName: app.DisplayName ?? app.displayName,
            InstallLocation: app.InstallLocation ?? app.installLocation,
            LaunchExecutable: app.LaunchExecutable ?? app.launchExecutable,
        };
    }

    private getLauncherInstalledPaths(): string[] {
        const dirs = new Set<string>();
        if (process.env.ProgramData) {
            dirs.add(path.join(process.env.ProgramData, 'Epic', 'UnrealEngineLauncher', 'LauncherInstalled.dat'));
        }
        for (const drive of DriveScanner.getDrives()) {
            dirs.add(path.join(drive, 'ProgramData', 'Epic', 'UnrealEngineLauncher', 'LauncherInstalled.dat'));
        }
        return [...dirs];
    }

    private async getManifestDirs(): Promise<string[]> {
        const dirs = new Set<string>();
        const drives = DriveScanner.getDrives();

        // Standard location
        if (process.env.ProgramData) {
            dirs.add(path.join(process.env.ProgramData, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'));
        }

        // Check all drives
        for (const drive of drives) {
            dirs.add(path.join(drive, 'ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'));
        }

        return [...dirs];
    }

    private isValidGame(app: { AppName: string }): boolean {
        if (!app.AppName) return false;
        if (app.AppName.startsWith('UE_')) return false;
        return true;
    }

    private isValidManifest(manifest: { AppName: string }): boolean {
        if (!manifest.AppName) return false;
        if (manifest.AppName.startsWith('UE_')) return false;
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
