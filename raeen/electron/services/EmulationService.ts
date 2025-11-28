import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { EmulatorDiscoveryService } from './EmulatorDiscoveryService';

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
    private discoveryService: EmulatorDiscoveryService;

    constructor() {
        const userDataPath = (app && app.getPath) ? app.getPath('userData') : '.';
        this.storagePath = path.join(userDataPath, 'emulation_data.json');
        this.discoveryService = new EmulatorDiscoveryService();
        this.loadData();
    }

    private loadData() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
                this.emulators = data.emulators || [];
                this.games = data.games || [];
            } 
            
            // If no emulators, try auto-discovery
            if (this.emulators.length === 0) {
                this.autoDetectEmulators();
            }
        } catch (e) {
            console.error('Failed to load emulation data:', e);
            this.emulators = [];
            this.games = [];
        }
    }

    public async autoDetectEmulators() {
        try {
            const detected = await this.discoveryService.discover();
            let addedCount = 0;

            for (const item of detected) {
                // Check if we already have this executable path
                const exists = this.emulators.some(e => e.executable === item.fullPath);
                if (!exists) {
                    this.addEmulator(
                        item.emulator.name,
                        item.fullPath,
                        item.emulator.defaultArgs,
                        item.emulator.platforms,
                        item.emulator.extensions
                    );
                    addedCount++;
                }
            }
            
            if (addedCount > 0) {
                console.log(`Auto-detected and added ${addedCount} emulators.`);
            }
        } catch (e) {
            console.error('Error during emulator auto-detection:', e);
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
    
    // Removed addDefaultEmulators as we use autoDetectEmulators now

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
