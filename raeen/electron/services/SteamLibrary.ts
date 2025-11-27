import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface SteamGame {
    id: string;
    title: string;
    installPath: string;
    executable?: string;
}

export class SteamLibrary {

    async getInstalledGames(): Promise<SteamGame[]> {
        const games: SteamGame[] = [];
        const libraryFolders = await this.getLibraryFolders();

        for (const folder of libraryFolders) {
            const steamAppsPath = path.join(folder, 'steamapps');
            if (!fs.existsSync(steamAppsPath)) continue;

            try {
                const files = fs.readdirSync(steamAppsPath);
                const manifests = files.filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'));

                for (const manifest of manifests) {
                    try {
                        const content = fs.readFileSync(path.join(steamAppsPath, manifest), 'utf-8');
                        const game = this.parseManifest(content, steamAppsPath);
                        if (game) {
                            games.push(game);
                        }
                    } catch (e) {
                        console.error(`Error parsing manifest ${manifest}:`, e);
                    }
                }
            } catch (e) {
                console.error(`Error reading library ${steamAppsPath}:`, e);
            }
        }

        return games;
    }

    private async getLibraryFolders(): Promise<string[]> {
        const folders = new Set<string>();

        // 1. Find main Steam installation
        let steamPath = await this.findSteamPath();
        if (!steamPath) return [];

        folders.add(steamPath);

        // 2. Parse libraryfolders.vdf
        const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
        if (fs.existsSync(vdfPath)) {
            try {
                const content = fs.readFileSync(vdfPath, 'utf-8');
                const parsed = this.parseVdf(content);

                // The structure is usually "libraryfolders" -> { "0" -> { "path": "..." }, "1" -> { "path": "..." } }
                if (parsed && parsed.libraryfolders) {
                    for (const key in parsed.libraryfolders) {
                        const entry = parsed.libraryfolders[key];
                        if (entry && entry.path) {
                            folders.add(entry.path);
                        } else if (typeof entry === 'string' && fs.existsSync(entry)) {
                            // Old format might just have paths? Unlikely but safe to check
                            folders.add(entry);
                        }
                    }
                }
            } catch (e) {
                console.error('Error parsing libraryfolders.vdf:', e);
            }
        }

        return Array.from(folders);
    }

    private async findSteamPath(): Promise<string | null> {
        const commonPaths = [
            'C:\\Program Files (x86)\\Steam',
            'C:\\Program Files\\Steam',
        ];

        for (const p of commonPaths) {
            if (fs.existsSync(p)) return p;
        }

        try {
            const { stdout } = await execAsync('reg query "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v "InstallPath"');
            const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
            if (match && match[1]) {
                return match[1].trim();
            }
        } catch (e) {
            // Ignore registry error
        }

        return null;
    }

    private parseManifest(content: string, steamAppsPath: string): SteamGame | null {
        // Simple regex parsing for manifest as it's flat key-value mostly
        const nameMatch = content.match(/"name"\s+"(.+?)"/);
        const idMatch = content.match(/"appid"\s+"(\d+)"/);
        const installDirMatch = content.match(/"installdir"\s+"(.+?)"/);

        if (nameMatch && idMatch && installDirMatch) {
            const installPath = path.join(steamAppsPath, 'common', installDirMatch[1]);
            return {
                id: idMatch[1],
                title: nameMatch[1],
                installPath: installPath,
                executable: this.findExecutable(installPath)
            };
        }
        return null;
    }

    private findExecutable(dirPath: string): string | undefined {
        if (!fs.existsSync(dirPath)) return undefined;
        try {
            const files = fs.readdirSync(dirPath);
            // Look for .exe files, filtering out common non-game exes
            const exes = files.filter(f => f.toLowerCase().endsWith('.exe') &&
                !f.toLowerCase().includes('launcher') &&
                !f.toLowerCase().includes('unins') &&
                !f.toLowerCase().includes('crash') &&
                !f.toLowerCase().includes('update') &&
                !f.toLowerCase().includes('helper') &&
                !f.toLowerCase().includes('redist') &&
                !f.toLowerCase().includes('unitycrashhandler'));

            if (exes.length === 0) return undefined;
            if (exes.length === 1) return exes[0];

            // If multiple, pick the largest one as a heuristic
            return exes.sort((a, b) => {
                const statA = fs.statSync(path.join(dirPath, a));
                const statB = fs.statSync(path.join(dirPath, b));
                return statB.size - statA.size;
            })[0];
        } catch (e) {
            return undefined;
        }
    }

    // A simple VDF parser
    private parseVdf(text: string): any {
        if (!text) return {};

        // Remove comments
        text = text.replace(/\/\/.*$/gm, '');

        let index = 0;
        const len = text.length;

        function parseObject(): any {
            const obj: any = {};

            while (index < len) {
                skipWhitespace();
                if (index >= len) break;

                if (text[index] === '}') {
                    index++;
                    return obj;
                }

                const key = parseString();
                skipWhitespace();

                if (index >= len) break;

                if (text[index] === '{') {
                    index++;
                    obj[key] = parseObject();
                } else {
                    const value = parseString();
                    obj[key] = value;
                }
            }
            return obj;
        }

        function parseString(): string {
            if (text[index] === '"') {
                index++;
                let str = '';
                while (index < len && text[index] !== '"') {
                    if (text[index] === '\\') {
                        index++;
                        // Handle simple escapes if needed, for paths mostly just pass through or handle double backslash
                        if (text[index] === '\\') str += '\\';
                        else str += text[index];
                    } else {
                        str += text[index];
                    }
                    index++;
                }
                index++; // skip closing quote
                return str;
            }

            // Fallback for unquoted strings (rare in VDF but possible)
            let str = '';
            while (index < len && !/\s/.test(text[index]) && text[index] !== '{' && text[index] !== '}') {
                str += text[index];
                index++;
            }
            return str;
        }

        function skipWhitespace() {
            while (index < len && /\s/.test(text[index])) {
                index++;
            }
        }

        skipWhitespace();
        if (text[index] !== '"' && text[index] !== '{') return {}; // Invalid start

        // Usually starts with a root key like "libraryfolders"
        // But our parseObject expects to be inside an object or at start of keys
        // If the file is just one root object: "Root" { ... }
        // We can parse it as a single key-value pair where value is object

        const root: any = {};
        while (index < len) {
            skipWhitespace();
            if (index >= len) break;
            const key = parseString();
            skipWhitespace();
            if (text[index] === '{') {
                index++;
                root[key] = parseObject();
            }
        }

        return root;
    }

    getInstallCommand(appId: string): string {
        return `steam://install/${appId}`;
    }

    getLaunchCommand(appId: string): string {
        return `steam://rungameid/${appId}`;
    }
}
