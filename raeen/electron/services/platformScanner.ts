import { SteamLibrary } from './SteamLibrary';
import { EpicLibrary } from './EpicLibrary';
import { GogLibrary } from './GogLibrary';
import { BattleNetLibrary } from './BattleNetLibrary';
import { UbisoftLibrary } from './UbisoftLibrary';
import { OriginLibrary } from './OriginLibrary';
import { XboxLibrary } from './XboxLibrary';
import { RiotLibrary } from './RiotLibrary';
import { ManualGameService } from './ManualGameService';
import { EmulationService } from './EmulationService';
import * as path from 'path';

export interface ScannedGame {
    platform: 'steam' | 'epic' | 'gog' | 'origin' | 'uplay' | 'battlenet' | 'xbox' | 'riot' | 'manual' | 'emulated' | 'other';
    platformId: string;
    title: string;
    installPath: string;
    executable?: string;
    icon?: string;
    cover?: string;
    launchOptions?: string;
}

export class PlatformScanner {
    public steamLibrary: SteamLibrary;
    public epicLibrary: EpicLibrary;
    public gogLibrary: GogLibrary;
    public battleNetLibrary: BattleNetLibrary;
    public ubisoftLibrary: UbisoftLibrary;
    public originLibrary: OriginLibrary;
    public xboxLibrary: XboxLibrary;
    public riotLibrary: RiotLibrary;
    public manualGameService: ManualGameService;
    public emulationService: EmulationService;

    constructor() {
        this.steamLibrary = new SteamLibrary();
        this.epicLibrary = new EpicLibrary();
        this.gogLibrary = new GogLibrary();
        this.battleNetLibrary = new BattleNetLibrary();
        this.ubisoftLibrary = new UbisoftLibrary();
        this.originLibrary = new OriginLibrary();
        this.xboxLibrary = new XboxLibrary();
        this.riotLibrary = new RiotLibrary();
        this.manualGameService = new ManualGameService();
        this.emulationService = new EmulationService();
    }

    async scanAll(): Promise<ScannedGame[]> {
        console.log('Scanning all platforms...');
        const results = await Promise.allSettled([
            this.scanSteam(),
            this.scanEpic(),
            this.scanGog(),
            this.scanBattleNet(),
            this.scanUbisoft(),
            this.scanOrigin(),
            this.scanXbox(),
            this.scanRiot(),
            this.scanManual(),
            this.scanEmulated()
        ]);

        const games: ScannedGame[] = [];
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                games.push(...result.value);
            } else {
                console.error('Scan failed:', result.reason);
            }
        });

        return games;
    }

    async scanManual(): Promise<ScannedGame[]> {
        const manualGames = this.manualGameService.getGames();
        return manualGames.map(g => ({
            platform: 'manual',
            platformId: g.id,
            title: g.title,
            installPath: g.installPath,
            executable: g.executable,
            launchOptions: g.arguments,
            icon: g.icon,
            cover: g.cover
        }));
    }

    async scanEmulated(): Promise<ScannedGame[]> {
        const emulatedGames = this.emulationService.getGames();
        return emulatedGames.map(g => ({
            platform: 'emulated',
            platformId: g.id,
            title: g.title,
            installPath: path.dirname(g.romPath),
            executable: g.romPath, // Using ROM path as executable for display
            launchOptions: g.emulatorId // Storing emulator ID in launch options for retrieval
        }));
    }

    async scanSteam(): Promise<ScannedGame[]> {
        try {
            const games = await this.steamLibrary.getInstalledGames();
            return games.map(g => ({
                platform: 'steam',
                platformId: g.id,
                title: g.title,
                installPath: g.installPath,
                executable: g.executable,
                cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.id}/library_600x900.jpg`
            }));
        } catch (e) {
            console.error('Steam scan failed:', e);
            return [];
        }
    }

    async scanEpic(): Promise<ScannedGame[]> {
        try {
            const games = await this.epicLibrary.getInstalledGames();
            return games.map(g => ({
                platform: 'epic',
                platformId: g.id,
                title: g.title,
                installPath: g.installPath,
                executable: g.executable
            }));
        } catch (e) {
            console.error('Epic scan failed:', e);
            return [];
        }
    }

    async scanGog(): Promise<ScannedGame[]> {
        try {
            const games = await this.gogLibrary.getInstalledGames();
            return games.map(g => ({
                platform: 'gog',
                platformId: g.id,
                title: g.title,
                installPath: g.installPath,
                executable: g.executable
            }));
        } catch (e) {
            console.error('GOG scan failed:', e);
            return [];
        }
    }

    async scanBattleNet(): Promise<ScannedGame[]> {
        try {
            const games = await this.battleNetLibrary.getInstalledGames();
            return games.map(g => ({
                platform: 'battlenet',
                platformId: g.id,
                title: g.title,
                installPath: g.installPath,
                executable: g.executable
            }));
        } catch (e) {
            console.error('Battle.net scan failed:', e);
            return [];
        }
    }

    async scanUbisoft(): Promise<ScannedGame[]> {
        try {
            const games = await this.ubisoftLibrary.getInstalledGames();
            return games.map(g => ({
                platform: 'uplay',
                platformId: g.id,
                title: g.title,
                installPath: g.installPath,
                executable: g.executable
            }));
        } catch (e) {
            console.error('Ubisoft scan failed:', e);
            return [];
        }
    }

    async scanOrigin(): Promise<ScannedGame[]> {
        try {
            const games = await this.originLibrary.getInstalledGames();
            return games.map(g => ({
                platform: 'origin',
                platformId: g.id,
                title: g.title,
                installPath: g.installPath,
                executable: g.executable
            }));
        } catch (e) {
            console.error('Origin scan failed:', e);
            return [];
        }
    }

    async scanXbox(): Promise<ScannedGame[]> {
        try {
            const games = await this.xboxLibrary.getInstalledGames();
            return games.map(g => ({
                platform: 'xbox',
                platformId: g.pfn, // Use PFN as ID for Xbox
                title: g.title,
                installPath: g.installPath,
                executable: g.executable
            }));
        } catch (e) {
            console.error('Xbox scan failed:', e);
            return [];
        }
    }

    async scanRiot(): Promise<ScannedGame[]> {
        try {
            const games = await this.riotLibrary.getInstalledGames();
            return games.map(g => ({
                platform: 'riot',
                platformId: g.id,
                title: g.title,
                installPath: g.installPath,
                executable: g.executable
            }));
        } catch (e) {
            console.error('Riot scan failed:', e);
            return [];
        }
    }

    getLaunchCommand(platform: string, id: string): string {
        switch (platform) {
            case 'steam': return this.steamLibrary.getLaunchCommand(id);
            case 'epic': return this.epicLibrary.getLaunchCommand(id);
            case 'gog': return this.gogLibrary.getLaunchCommand(id);
            case 'battlenet': return this.battleNetLibrary.getLaunchCommand(id);
            case 'uplay': return this.ubisoftLibrary.getLaunchCommand(id);
            case 'origin': return this.originLibrary.getLaunchCommand(id);
            case 'xbox': return this.xboxLibrary.getLaunchCommand(id);
            case 'riot': return this.riotLibrary.getLaunchCommand(id);
            case 'manual': return ''; // Manual games are handled by executable path
            case 'emulated': return ''; // Emulated games are handled by EmulationService
            default: return '';
        }
    }
}
