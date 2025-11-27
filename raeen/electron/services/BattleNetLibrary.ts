import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import si from 'systeminformation';

const execAsync = util.promisify(exec);

export interface BattleNetGame {
    id: string;
    title: string;
    installPath: string;
    executable?: string;
}

export class BattleNetLibrary {

    async getInstalledGames(): Promise<BattleNetGame[]> {
        const games: BattleNetGame[] = [];

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

    private async scanRegistry(): Promise<BattleNetGame[]> {
        const games: BattleNetGame[] = [];
        const registryKey = 'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall';

        try {
            const { stdout } = await execAsync(`reg query "${registryKey}"`);
            const keys = stdout.split('\r\n').filter(line => line.trim().length > 0 && line.includes(registryKey));

            for (const key of keys) {
                try {
                    const publisher = await this.getRegistryValue(key, 'Publisher');
                    if (publisher === 'Blizzard Entertainment') {
                        const title = await this.getRegistryValue(key, 'DisplayName');
                        const installLocation = await this.getRegistryValue(key, 'InstallLocation');
                        const uninstallString = await this.getRegistryValue(key, 'UninstallString');

                        let platformId = 'unknown';

                        if (uninstallString) {
                            const productMatch = uninstallString.match(/--os_product_id=([^\s]+)/) || uninstallString.match(/--game=([^\s]+)/) || uninstallString.match(/--uid=([^\s]+)/);
                            if (productMatch) {
                                platformId = productMatch[1];
                            }
                        }

                        if (platformId === 'unknown' && title) {
                            // Fallback mapping if needed, or just use title slug
                            platformId = this.guessIdFromTitle(title);
                        }

                        if (title && installLocation) {
                            games.push({
                                id: platformId,
                                title: title,
                                installPath: installLocation,
                                executable: this.findExecutable(installLocation)
                            });
                        }
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

    private async scanDrives(): Promise<BattleNetGame[]> {
        const games: BattleNetGame[] = [];
        const drives = await this.getDrives();

        for (const drive of drives) {
            const commonPaths = [
                path.join(drive, 'Battle.net'),
                path.join(drive, 'Program Files (x86)', 'Battle.net'),
                path.join(drive, 'Program Files', 'Battle.net'),
                path.join(drive, 'Games', 'Battle.net'),
                path.join(drive, 'Games')
            ];

            for (const p of commonPaths) {
                if (fs.existsSync(p)) {
                    try {
                        const subdirs = fs.readdirSync(p);
                        for (const dir of subdirs) {
                            const gamePath = path.join(p, dir);
                            if (!fs.statSync(gamePath).isDirectory()) continue;

                            if (this.isBattleNetGame(gamePath)) {
                                games.push({
                                    id: this.guessIdFromTitle(dir),
                                    title: dir,
                                    installPath: gamePath,
                                    executable: this.findExecutable(gamePath)
                                });
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

    private isBattleNetGame(dir: string): boolean {
        try {
            const files = fs.readdirSync(dir);
            return files.some(f => f === '.flavor.info' || f === '.build.info' || f === 'Launcher.db');
        } catch {
            return false;
        }
    }

    private guessIdFromTitle(title: string): string {
        const t = title.toLowerCase();
        if (t.includes('world of warcraft')) return 'WoW';
        if (t.includes('diablo iv') || t.includes('diablo 4')) return 'Fenris';
        if (t.includes('diablo iii') || t.includes('diablo 3')) return 'D3';
        if (t.includes('overwatch')) return 'Pro';
        if (t.includes('starcraft ii') || t.includes('starcraft 2')) return 'S2';
        if (t.includes('hearthstone')) return 'WTCG';
        if (t.includes('heroes of the storm')) return 'Hero';
        if (t.includes('call of duty')) return 'Odin'; // Generic COD ID, might vary
        return title.replace(/\s+/g, '').toLowerCase();
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
                !f.toLowerCase().includes('launcher') &&
                !f.toLowerCase().includes('agent') &&
                !f.toLowerCase().includes('cleanup') &&
                !f.toLowerCase().includes('error') &&
                !f.toLowerCase().includes('setup'));

            if (exes.length === 0) return undefined;

            // Prefer known executables
            const known = ['Wow.exe', 'Diablo IV.exe', 'Diablo III.exe', 'Overwatch.exe', 'SC2_x64.exe', 'Hearthstone.exe', 'HeroesOfTheStorm_x64.exe'];
            const foundKnown = exes.find(e => known.includes(e));
            if (foundKnown) return foundKnown;

            return exes.sort((a, b) => {
                const statA = fs.statSync(path.join(dirPath, a));
                const statB = fs.statSync(path.join(dirPath, b));
                return statB.size - statA.size;
            })[0];
        } catch (e) {
            return undefined;
        }
    }

    getLaunchCommand(productId: string): string {
        return `battlenet://${productId}`;
    }
}
