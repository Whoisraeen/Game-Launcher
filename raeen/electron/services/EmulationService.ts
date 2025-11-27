import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export interface Emulator {
    id: string;
    name: string;
    executable: string;
    arguments: string; // e.g. "-f {rom}"
    platforms: string[]; // e.g. ["nes", "snes"]
    extensions: string[]; // e.g. [".nes", ".sfc"]
}

export interface EmulatedGame {
    id: string;
    title: string;
    romPath: string;
    platform: string; // e.g. "snes"
    emulatorId: string;
    addedAt: number;
}

export class EmulationService {
    private storagePath: string;
    private emulators: Emulator[] = [];
    private games: EmulatedGame[] = [];

    constructor() {
        const userDataPath = (app && app.getPath) ? app.getPath('userData') : '.';
        this.storagePath = path.join(userDataPath, 'emulation_data.json');
        this.loadData();
    }

    private loadData() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
                this.emulators = data.emulators || [];
                this.games = data.games || [];
            } else {
                // Add some default emulators if empty
                this.addDefaultEmulators();
            }
        } catch (e) {
            console.error('Failed to load emulation data:', e);
            this.emulators = [];
            this.games = [];
        }
    }

    private saveData() {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify({
                emulators: this.emulators,
                games: this.games
            }, null, 2));
        } catch (e) {
            console.error('Failed to save emulation data:', e);
        }
    }

    private addDefaultEmulators() {
        // Add common emulators as examples/defaults
        this.emulators.push({
            id: uuidv4(),
            name: 'RetroArch',
            executable: 'C:\\RetroArch\\retroarch.exe',
            arguments: '-L {core} {rom}',
            platforms: ['nes', 'snes', 'gba', 'n64', 'ps1'],
            extensions: ['.nes', '.sfc', '.smc', '.gba', '.gbc', '.n64', '.z64', '.cue', '.iso', '.chd']
        });
        this.emulators.push({
            id: uuidv4(),
            name: 'Dolphin',
            executable: 'C:\\Dolphin\\Dolphin.exe',
            arguments: '-b -e {rom}',
            platforms: ['gc', 'wii'],
            extensions: ['.iso', '.gcz', '.wbfs', '.rvz', '.ciso']
        });
        this.saveData();
    }

    getEmulators(): Emulator[] {
        return this.emulators;
    }

    getGames(): EmulatedGame[] {
        return this.games;
    }

    addEmulator(name: string, executable: string, args: string, platforms: string[], extensions: string[]): Emulator {
        const emu: Emulator = {
            id: uuidv4(),
            name,
            executable,
            arguments: args,
            platforms,
            extensions
        };
        this.emulators.push(emu);
        this.saveData();
        return emu;
    }

    addGame(title: string, romPath: string, platform: string, emulatorId: string): EmulatedGame {
        const game: EmulatedGame = {
            id: uuidv4(),
            title,
            romPath,
            platform,
            emulatorId,
            addedAt: Date.now()
        };
        this.games.push(game);
        this.saveData();
        return game;
    }

    async scanRomFolder(folderPath: string, platform: string, emulatorId: string): Promise<EmulatedGame[]> {
        if (!fs.existsSync(folderPath)) return [];

        const emulator = this.emulators.find(e => e.id === emulatorId);
        if (!emulator) throw new Error('Emulator not found');

        const foundGames: EmulatedGame[] = [];
        
        const walk = (dir: string) => {
            const list = fs.readdirSync(dir);
            for (const file of list) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat && stat.isDirectory()) {
                    walk(filePath);
                } else {
                    const ext = path.extname(file).toLowerCase();
                    if (emulator.extensions.includes(ext)) {
                        // Check if already added
                        if (!this.games.some(g => g.romPath === filePath)) {
                            const title = path.basename(file, ext);
                            foundGames.push(this.addGame(title, filePath, platform, emulatorId));
                        }
                    }
                }
            }
        };

        try {
            walk(folderPath);
        } catch (e) {
            console.error('ROM Scan failed:', e);
        }

        return foundGames;
    }

    getLaunchCommand(gameId: string): { command: string, cwd: string } | undefined {
        const game = this.games.find(g => g.id === gameId);
        if (!game) return undefined;

        const emulator = this.emulators.find(e => e.id === game.emulatorId);
        if (!emulator) return undefined;

        // Replace placeholders
        // We might need a way to specify 'core' for RetroArch if it's generic
        // For now, simple replacement
        let args = emulator.arguments.replace('{rom}', `"${game.romPath}"`);

        return {
            command: `"${emulator.executable}" ${args}`,
            cwd: path.dirname(emulator.executable)
        };
    }
}
