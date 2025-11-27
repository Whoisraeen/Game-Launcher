import fs from 'fs';
import path from 'path';
import { DriveScanner } from './DriveScanner';

export interface RiotGame {
    id: string;
    title: string;
    installPath: string;
    executable?: string;
}

export class RiotLibrary {

    async getInstalledGames(): Promise<RiotGame[]> {
        const games: RiotGame[] = [];

        // 1. Parse RiotClientInstalls.json (Primary method)
        const jsonGames = await this.parseRiotClientInstalls();
        games.push(...jsonGames);

        // 2. Fallback: Scan common paths if JSON fails or to find others
        // (Riot games are usually well-tracked by the JSON, but good to have fallback)
        // For now, we'll rely on the JSON as it's the official tracking method for the Riot Client.

        return games;
    }

    private async parseRiotClientInstalls(): Promise<RiotGame[]> {
        const games: RiotGame[] = [];
        const drives = DriveScanner.getDrives();

        // Scan all drives for ProgramData/Riot Games/RiotClientInstalls.json
        // Also check standard C: location explicitly if not covered
        const searchPaths = new Set<string>();

        // Standard location
        if (process.env.ProgramData) {
            searchPaths.add(path.join(process.env.ProgramData, 'Riot Games', 'RiotClientInstalls.json'));
        }

        // Check other drives
        for (const drive of drives) {
            searchPaths.add(path.join(drive, 'ProgramData', 'Riot Games', 'RiotClientInstalls.json'));
            // Sometimes users install directly to root e.g. D:\Riot Games
            searchPaths.add(path.join(drive, 'Riot Games', 'RiotClientInstalls.json'));
        }

        for (const jsonPath of searchPaths) {
            if (fs.existsSync(jsonPath)) {
                try {
                    const content = fs.readFileSync(jsonPath, 'utf-8');
                    const data = JSON.parse(content);

                    for (const [key, exePath] of Object.entries(data)) {
                        if (key === 'rc_live' || key === 'rc_beta') continue;

                        let productId = key;
                        let title = key;

                        const normalizedKey = key.toLowerCase();

                        if (normalizedKey.includes('valorant')) {
                            title = 'VALORANT';
                            productId = 'valorant';
                        } else if (normalizedKey.includes('league_of_legends')) {
                            title = 'League of Legends';
                            productId = 'league_of_legends';
                        } else if (normalizedKey.includes('bacon')) {
                            title = 'Legends of Runeterra';
                            productId = 'bacon';
                        } else if (normalizedKey.includes('tft')) {
                            title = 'Teamfight Tactics';
                            productId = 'tft';
                        }

                        if (typeof exePath === 'string' && fs.existsSync(exePath)) {
                            // Avoid duplicates
                            if (!games.some(g => g.id === productId)) {
                                games.push({
                                    id: productId,
                                    title: title,
                                    installPath: path.dirname(exePath),
                                    executable: exePath
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Error parsing RiotClientInstalls.json at ${jsonPath}:`, e);
                }
            }
        }

        return games;
    }

    getLaunchCommand(productId: string): string {
        // Riot games are launched via RiotClientServices.exe
        // We need to find the Riot Client path first, or assume default
        // A robust way is to read the "rc_live" entry from the JSON we just parsed.
        // For now, we'll try to find it or use a common path.

        // Actually, we can just use the "Riot Client" protocol if it exists, but usually it's a command line.
        // "C:\Riot Games\Riot Client\RiotClientServices.exe" --launch-product=valorant --launch-patchline=live

        // Let's try to find the Riot Client path dynamically in a real implementation.
        // For this snippet, we'll assume a standard path or try to look it up again (cached).

        // Better approach: The caller (GameManager) might handle the execution, 
        // but here we return the *arguments* or a custom protocol string if we register one.
        // Since we don't have a custom protocol for "riot-launch", we might return a special string 
        // that the GameManager understands, OR we return the full command if we can find the executable.

        // Let's try to find the Riot Client executable again.
        const riotClientPath = this.getRiotClientPath();
        if (riotClientPath) {
            return `"${riotClientPath}" --launch-product=${productId} --launch-patchline=live`;
        }

        return '';
    }

    private getRiotClientPath(): string | undefined {
        const programData = process.env.ProgramData || 'C:\\ProgramData';
        const jsonPath = path.join(programData, 'Riot Games', 'RiotClientInstalls.json');
        if (fs.existsSync(jsonPath)) {
            try {
                const content = fs.readFileSync(jsonPath, 'utf-8');
                const data = JSON.parse(content);
                if (data.rc_live && fs.existsSync(data.rc_live)) return data.rc_live;
                if (data.rc_beta && fs.existsSync(data.rc_beta)) return data.rc_beta;
            } catch (e) { }
        }

        // Fallback
        const commonPath = 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe';
        if (fs.existsSync(commonPath)) return commonPath;

        return undefined;
    }
}
