import OBSWebSocket from 'obs-websocket-js';

export interface ObsConnectionConfig {
    address: string;
    password?: string;
}

export interface ObsScene {
    sceneName: string;
    sceneIndex: number;
}

export interface ObsStreamStatus {
    isStreaming: boolean;
    isRecording: boolean;
    streamTimecode: string;
    recTimecode: string;
}

export class ObsService {
    private obs: OBSWebSocket;
    private config: ObsConnectionConfig | null = null;
    private isConnected: boolean = false;

    constructor() {
        this.obs = new OBSWebSocket();

        // Event listeners
        this.obs.on('ConnectionOpened', () => {
            this.isConnected = true;
            console.log('OBS WebSocket Connected!');
        });
        this.obs.on('ConnectionClosed', () => {
            this.isConnected = false;
            console.log('OBS WebSocket Disconnected.');
        });
        this.obs.on('ConnectionError', (err) => {
            this.isConnected = false;
            console.error('OBS WebSocket Error:', err);
        });

        // Add more listeners for events like SceneChanged, StreamStatus, etc., if needed
    }

    public isObsConnected(): boolean {
        return this.isConnected;
    }

    public setConnectionConfig(config: ObsConnectionConfig) {
        this.config = config;
    }

    public getConnectionConfig(): ObsConnectionConfig | null {
        return this.config;
    }

    public async connect(): Promise<boolean> {
        if (!this.config || !this.config.address) {
            throw new Error('OBS connection address is not set.');
        }
        if (this.isConnected) {
            console.log('Already connected to OBS.');
            return true;
        }

        try {
            await this.obs.connect(this.config.address, this.config.password);
            this.isConnected = true;
            return true;
        } catch (error) {
            this.isConnected = false;
            console.error('Failed to connect to OBS:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.obs.disconnect();
            this.isConnected = false;
        }
    }

    public async getSceneList(): Promise<ObsScene[]> {
        if (!this.isConnected) throw new Error('Not connected to OBS.');
        const { scenes } = await this.obs.call('GetSceneList');
        return scenes.map((s: any) => ({ sceneName: s.sceneName, sceneIndex: s.sceneIndex }));
    }

    public async setCurrentScene(sceneName: string): Promise<void> {
        if (!this.isConnected) throw new Error('Not connected to OBS.');
        await this.obs.call('SetCurrentProgramScene', { 'sceneName': sceneName });
    }

    public async getStreamStatus(): Promise<ObsStreamStatus> {
        if (!this.isConnected) throw new Error('Not connected to OBS.');
        const streamStatus = await this.obs.call('GetStreamStatus');
        const recordStatus = await this.obs.call('GetRecordStatus');
        
        return {
            isStreaming: streamStatus.outputActive,
            isRecording: recordStatus.outputActive,
            streamTimecode: streamStatus.outputTimecode,
            recTimecode: recordStatus.outputTimecode
        };
    }

    public async startStreaming(): Promise<void> {
        if (!this.isConnected) throw new Error('Not connected to OBS.');
        await this.obs.call('StartStream');
    }

    public async stopStreaming(): Promise<void> {
        if (!this.isConnected) throw new Error('Not connected to OBS.');
        await this.obs.call('StopStream');
    }

    public async startRecording(): Promise<void> {
        if (!this.isConnected) throw new Error('Not connected to OBS.');
        await this.obs.call('StartRecord');
    }

    public async stopRecording(): Promise<void> {
        if (!this.isConnected) throw new Error('Not connected to OBS.');
        await this.obs.call('StopRecord');
    }

    // You can add more OBS commands here as needed (e.g., toggleSourceVisibility)
}
