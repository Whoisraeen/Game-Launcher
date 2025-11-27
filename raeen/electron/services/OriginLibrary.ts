import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { DriveScanner } from './DriveScanner';

const execAsync = util.promisify(exec);

export interface OriginGame {
    id: string;
    title: string;
    installPath: string;
    executable?: string;
}

export class OriginLibrary {

    async getInstalledGames(): Promise<OriginGame[]> {
        const games: OriginGame[] = [];

        // 1. Registry Scan
        const registryGames = await this.scanRegistry();
        games.push(...registryGames);

        // 2. Disk Scan
        const diskGames = await this.scanDrives();
        for (const dGame of diskGames) {
            if (!games.find(g => g.installPath.toLowerCase() === dGame.installPath.toLowerCase())) {
                games.push(dGame);
            }
        }

        return games;
    }

    private async scanRegistry(): Promise<OriginGame[]> {
        const games: OriginGame[] = [];
        const registryKey = 'HKLM\\SOFTWARE\\WOW6432Node\\Origin Games';

        try {
            const { stdout } = await execAsync(`reg query "${registryKey}"`);
            const keys = stdout.split('\r\n').filter(line => line.trim().length > 0 && line.includes(registryKey));

            for (const key of keys) {
                try {
                    const id = key.split('\\').pop();
                    const title = await this.getRegistryValue(key, 'DisplayName');
                    const installPath = await this.getRegistryValue(key, 'InstallDir');

                    if (id && title && installPath) {
                        games.push({
                            id: id,
                            title: title,
                            installPath: installPath,
                            executable: this.findExecutable(installPath)
                        });
                    }
                } catch (e) {
                    // Ignore
                }
            }
        } catch (e) {
            // Ignore
        }

        return games;
    }

    private async scanDrives(): Promise<OriginGame[]> {
        const games: OriginGame[] = [];
        const drives = await this.getDrives();

        for (const drive of drives) {
            const commonPaths = [
                path.join(drive, 'Origin Games'),
                path.join(drive, 'Program Files (x86)', 'Origin Games'),
                path.join(drive, 'Program Files', 'Origin Games'),
                path.join(drive, 'Program Files', 'EA Games')
            ];

            for (const p of commonPaths) {
                if (fs.existsSync(p)) {
                    try {
                        const subdirs = fs.readdirSync(p);
                        for (const dir of subdirs) {
                            const gamePath = path.join(p, dir);
                            if (!fs.statSync(gamePath).isDirectory()) continue;

                            // Origin games usually have __Installer folder
                            if (fs.existsSync(path.join(gamePath, '__Installer'))) {
                                const exe = this.findExecutable(gamePath);
                                if (exe) {
                                    games.push({
                                        id: dir, // Fallback ID
                                        title: dir,
                                        installPath: gamePath,
                                        executable: exe
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }
        }
        return games;
    }

    private async getRegistryValue(key: string, valueName: string): Promise<string | null> {
        try {
            const { stdout } = await execAsync(`reg query "${key}" /v "${valueName}"`);
            const match = stdout.match(new RegExp(`${valueName}\\s+REG_\\w+\\s+(.+)`));
            return match ? match[1].trim() : null;
        } catch (e) {
            return null;
        }
    }

    private async getDrives(): Promise<string[]> {
        return DriveScanner.getDrives();
    }

    private findExecutable(dirPath: string): string | undefined {
        if (!fs.existsSync(dirPath)) return undefined;
        try {
            const files = fs.readdirSync(dirPath);
            const exes = files.filter(f => f.toLowerCase().endsWith('.exe') &&
                !f.toLowerCase().includes('cleanup') &&
                !f.toLowerCase().includes('touchup') &&
                !f.toLowerCase().includes('dxsetup') &&
                !f.toLowerCase().includes('vcredist') &&
                !f.toLowerCase().includes('activation'));

            if (exes.length === 0) return undefined;
            if (exes.length === 1) return exes[0];

            return exes.sort((a, b) => {
                const statA = fs.statSync(path.join(dirPath, a));
                const statB = fs.statSync(path.join(dirPath, b));
                return statB.size - statA.size;
            })[0];
        } catch (e) {
            return undefined;
        }
    }

    getLaunchCommand(gameId: string): string {
        return `origin://launchgame/${gameId}`;
    }
}
