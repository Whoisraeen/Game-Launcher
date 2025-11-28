import DiscordRPC from 'discord-rpc';

const CLIENT_ID = '1344426698654224445'; // Placeholder ID - Needs to be replaced with real App ID from Discord Portal

export class DiscordManager {
    private static instance: DiscordManager;
    private rpc: DiscordRPC.Client;
    private isReady = false;

    private constructor() {
        this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

        this.rpc.on('ready', () => {
            console.log('Discord RPC Ready');
            this.isReady = true;
            this.setIdle();
        });

        this.rpc.login({ clientId: CLIENT_ID }).catch(err => {
            console.warn('Discord RPC login failed (Client ID might be invalid or Discord not running):', err);
        });
    }

    public static getInstance(): DiscordManager {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }

    setIdle() {
        if (!this.isReady) return;
        this.rpc.setActivity({
            details: 'Browsing Library',
            state: 'Idle',
            largeImageKey: 'app_logo', // Ensure this asset exists in Discord Dev Portal
            largeImageText: 'Game Launcher',
            startTimestamp: Date.now(),
            instance: false,
        }).catch(console.error);
    }

    setActivity(gameTitle: string, status: string = 'Playing') {
        if (!this.isReady) return;
        this.rpc.setActivity({
            details: gameTitle,
            state: status,
            largeImageKey: 'game_icon', // generic icon
            largeImageText: gameTitle,
            startTimestamp: Date.now(),
            instance: false,
        }).catch(console.error);
    }

    clearActivity() {
        if (!this.isReady) return;
        this.rpc.clearActivity().catch(console.error);
    }
}
