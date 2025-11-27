import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import si from 'systeminformation';

const execAsync = util.promisify(exec);

export interface GogGame {
    id: string;
    title: string;
    installPath: string;
    executable?: string;
}

export class GogLibrary {

    async getInstalledGames(): Promise<GogGame[]> {
        const games: GogGame[] = [];

        // 1. Registry Scan (Primary)
        const registryGames = await this.scanRegistry();
        games.push(...registryGames);

        // 2. Disk Scan (Fallback/Enrichment)
        const diskGames = await this.scanDrives();

        for (const dGame of diskGames) {
            if (!games.find(g => g.id === dGame.id)) {
                games.push(dGame);
            }
        }

        return games;
    }

    private async scanRegistry(): Promise<GogGame[]> {
        const games: GogGame[] = [];
        const registryKey = 'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games';

        try {
            const { stdout } = await execAsync(`reg query "${registryKey}"`);
            const keys = stdout.split('\r\n').filter(line => line.trim().length > 0 && line.includes(registryKey));

            for (const key of keys) {
                try {
                    const id = key.split('\\').pop();
                    const title = await this.getRegistryValue(key, 'gameName');
                    const installPath = await this.getRegistryValue(key, 'path');
                    const exe = await this.getRegistryValue(key, 'exe');

                    if (id && title && installPath) {
                        games.push({
                            id: id,
                            title: title,
                            installPath: installPath,
                            executable: exe ? exe.replace(/^\/|\\/, '') : undefined
                        });
                    }
                } catch (e) {
                    // Ignore individual game errors
                }
            }
        } catch (e) {
            // Registry key might not exist if GOG Galaxy isn't installed
        }

        return games;
    }

    private async scanDrives(): Promise<GogGame[]> {
        const games: GogGame[] = [];
        const drives = await this.getDrives();

        for (const drive of drives) {
            const commonPaths = [
                path.join(drive, 'GOG Games'),
                path.join(drive, 'Games', 'GOG Galaxy', 'Games')
            ];

            for (const p of commonPaths) {
                if (fs.existsSync(p)) {
                    try {
                        const subdirs = fs.readdirSync(p);
                        for (const dir of subdirs) {
                            const gamePath = path.join(p, dir);
                            if (!fs.statSync(gamePath).isDirectory()) continue;

                            const infoFile = this.findGogInfoFile(gamePath);
                            if (infoFile) {
                                try {
                                    const content = fs.readFileSync(path.join(gamePath, infoFile), 'utf-8');
                                    const data = JSON.parse(content);

                                    if (data.gameId && data.name) {
                                        games.push({
                                            id: data.gameId,
                                            title: data.name,
                                            installPath: gamePath,
                                            executable: this.findExecutable(gamePath)
                                        });
                                    }
                                } catch (e) {
                                    // Ignore parse errors
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore dir access errors
                    }
                }
            }
        }
        return games;
    }

    private findGogInfoFile(dir: string): string | undefined {
        try {
            const files = fs.readdirSync(dir);
            return files.find(f => f.startsWith('goggame-') && f.endsWith('.info'));
        } catch {
            return undefined;
        }
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
        try {
            const data = await si.fsSize();
            return data.map(d => d.mount);
        } catch (e) {
            return ['C:'];
        }
    }

    private findExecutable(dirPath: string): string | undefined {
        if (!fs.existsSync(dirPath)) return undefined;
        try {
            const files = fs.readdirSync(dirPath);
            const exes = files.filter(f => f.toLowerCase().endsWith('.exe') &&
                !f.toLowerCase().includes('unins') &&
                !f.toLowerCase().includes('setup') &&
                !f.toLowerCase().includes('patch') &&
                !f.toLowerCase().includes('dxwebsetup') &&
                !f.toLowerCase().includes('vcredist'));

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
        return `goggalaxy://launchGame/${gameId}`;
    }
}
