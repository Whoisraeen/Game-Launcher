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
        const games: EpicGame[] = [];
        const manifestDirs = await this.getManifestDirs();

        // 1. Parse LauncherInstalled.dat (Primary source)
        // This file usually contains all installed games across all drives
        const datPath = 'C:\\ProgramData\\Epic\\UnrealEngineLauncher\\LauncherInstalled.dat';
        if (fs.existsSync(datPath)) {
            try {
                const content = fs.readFileSync(datPath, 'utf-8');
                const data = JSON.parse(content);
                if (data.InstallationList && Array.isArray(data.InstallationList)) {
                    for (const app of data.InstallationList) {
                        if (this.isValidGame(app)) {
                            games.push({
                                id: app.AppName,
                                title: this.cleanTitle(app.AppName), // DisplayName might not be here, fallback to AppName
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

        // 2. Parse individual manifests (Secondary source / Enrichment)
        // Manifests contain better DisplayNames and metadata
        for (const dir of manifestDirs) {
            if (!fs.existsSync(dir)) continue;

            try {
                const files = fs.readdirSync(dir).filter(f => f.endsWith('.item'));
                for (const file of files) {
                    try {
                        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
                        const manifest = JSON.parse(content);

                        // Update existing game or add new one
                        const existingIndex = games.findIndex(g => g.id === manifest.AppName);

                        if (existingIndex !== -1) {
                            // Update title if available
                            if (manifest.DisplayName) {
                                games[existingIndex].title = manifest.DisplayName;
                            }
                        } else if (this.isValidManifest(manifest)) {
                            games.push({
                                id: manifest.AppName,
                                title: manifest.DisplayName || manifest.AppName,
                                installPath: manifest.InstallLocation,
                                executable: manifest.LaunchExecutable
                            });
                        }
                    } catch (e) {
                        console.error(`Error parsing Epic manifest ${file}:`, e);
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        return games;
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
            // Check ProgramData on other drives
            dirs.push(path.join(drive, 'ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'));

            // Also check for "Epic Games" folder in root, sometimes manifests are there? 
            // Usually manifests are always in ProgramData, but game installs can be anywhere.
            // The manifests point to the install location, so finding the manifests is key.
            // They are almost exclusively in ProgramData.
        }

        return dirs;
    }

    private isValidGame(app: any): boolean {
        // Filter out engine versions and other non-game apps
        if (!app.AppName) return false;
        if (app.AppName.startsWith('UE_')) return false;
        return true;
    }

    private isValidManifest(manifest: any): boolean {
        if (!manifest.AppName) return false;
        if (manifest.AppName.startsWith('UE_')) return false;
        // Filter out DLCs if possible? Playnite checks categories.
        // For now, basic filtering.
        return true;
    }

    private cleanTitle(appName: string): string {
        // Fallback cleaner if DisplayName is missing
        return appName.replace(/([A-Z])/g, ' $1').trim();
    }

    getInstallCommand(appId: string): string {
        return `com.epicgames.launcher://apps/${appId}?action=install`;
    }

    getLaunchCommand(appId: string): string {
        return `com.epicgames.launcher://apps/${appId}?action=launch&silent=true`;
    }
}
