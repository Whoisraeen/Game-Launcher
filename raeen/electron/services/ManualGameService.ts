import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export interface ManualGame {
    id: string;
    title: string;
    executable: string;
    installPath: string;
    arguments?: string;
    icon?: string;
    cover?: string;
    addedAt: number;
}

export class ManualGameService {
    private storagePath: string;
    private games: ManualGame[] = [];

    constructor() {
        // Store in userData directory
        const userDataPath = (app && app.getPath) ? app.getPath('userData') : '.';
        this.storagePath = path.join(userDataPath, 'manual_games.json');
        this.loadGames();
    }

    private loadGames() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = fs.readFileSync(this.storagePath, 'utf-8');
                this.games = JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load manual games:', e);
            this.games = [];
        }
    }

    private saveGames() {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(this.games, null, 2));
        } catch (e) {
            console.error('Failed to save manual games:', e);
        }
    }

    getGames(): ManualGame[] {
        return this.games;
    }

    addGame(title: string, executablePath: string, args?: string): ManualGame {
        const game: ManualGame = {
            id: uuidv4(),
            title: title,
            executable: executablePath,
            installPath: path.dirname(executablePath),
            arguments: args,
            addedAt: Date.now()
        };

        this.games.push(game);
        this.saveGames();
        return game;
    }

    removeGame(id: string): boolean {
        const initialLength = this.games.length;
        this.games = this.games.filter(g => g.id !== id);
        if (this.games.length !== initialLength) {
            this.saveGames();
            return true;
        }
        return false;
    }

    updateGame(id: string, updates: Partial<ManualGame>): ManualGame | undefined {
        const gameIndex = this.games.findIndex(g => g.id === id);
        if (gameIndex !== -1) {
            this.games[gameIndex] = { ...this.games[gameIndex], ...updates };
            this.saveGames();
            return this.games[gameIndex];
        }
        return undefined;
    }
}
