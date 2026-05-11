import DiscordRPC from 'discord-rpc';

// BUG-066: read the Discord application client ID from env first, then fall
// back to the bundled default. Surface a clear status so consumers can show
// the user what went wrong instead of silently failing.
const DEFAULT_CLIENT_ID = '1344426698654224445';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || DEFAULT_CLIENT_ID;

export class DiscordManager {
    private static instance: DiscordManager;
    private rpc: DiscordRPC.Client;
    private isReady = false;
    public lastError: string | null = null;
    public clientId: string = CLIENT_ID;

    private constructor() {
        this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

        this.rpc.on('ready', () => {
            console.log('Discord RPC Ready');
            this.isReady = true;
            this.lastError = null;
            this.setIdle();
        });

        this.rpc.login({ clientId: CLIENT_ID }).catch(err => {
            const msg = `Discord RPC login failed: ${err?.message || err}. Client ID: ${CLIENT_ID}.`;
            console.warn(msg);
            this.lastError = msg;
        });
    }

    public getStatus(): { connected: boolean; clientId: string; error: string | null } {
        return { connected: this.isReady, clientId: this.clientId, error: this.lastError };
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
