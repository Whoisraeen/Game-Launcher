import { Client } from 'openrgb-sdk';

interface IOpenRGBClient {
    connect(): Promise<void>;
    getControllerCount(): Promise<number>;
    getControllerData(deviceId: number): Promise<{ colors: any[] }>;
    updateLeds(deviceId: number, colors: any[]): Promise<void>;
}

export class RGBService {
    private client: IOpenRGBClient;
    private isConnected = false;
    
    private effectInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.client = new Client('RaeenLauncher', 6742, 'localhost') as unknown as IOpenRGBClient;
    }

    async connect() {
        if (this.isConnected) return;
        try {
            await this.client.connect();
            this.isConnected = true;
            console.log('Connected to OpenRGB');
        } catch (error) {
            console.warn('Failed to connect to OpenRGB (Is the server running?):', error);
            this.isConnected = false;
        }
    }

    async setStaticColor(r: number, g: number, b: number) {
        this.stopEffect();
        await this.applyColor(r, g, b);
    }

    async setEffect(effect: string, speed: number, color?: {r: number, g: number, b: number}) {
        this.stopEffect();
        if (!this.isConnected) await this.connect();
        if (!this.isConnected) return;

        console.log(`Starting RGB effect: ${effect} with speed ${speed}`);

        switch (effect.toLowerCase()) {
            case 'breathing':
                this.startBreathingEffect(speed, color || {r: 255, g: 255, b: 255});
                break;
            case 'rainbow':
                this.startRainbowWave(speed);
                break;
            case 'rainbow wave':
                this.startRainbowWave(speed);
                break;
            case 'color cycle':
                this.startColorCycle(speed);
                break;
            case 'starry night':
                this.startStarryNight(speed);
                break;
            case 'audio viz':
                this.startAudioViz(speed);
                break;
            case 'static':
                if (color) await this.applyColor(color.r, color.g, color.b);
                break;
            case 'off':
                await this.applyColor(0, 0, 0);
                break;
            default:
                console.warn(`Unknown effect: ${effect}`);
        }
    }

    private stopEffect() {
        if (this.effectInterval) {
            clearInterval(this.effectInterval);
            this.effectInterval = null;
        }
    }

    private async applyColor(r: number, g: number, b: number) {
        if (!this.isConnected) return;
        try {
            const count = await this.client.getControllerCount();
            for (let i = 0; i < count; i++) {
                const device = await this.client.getControllerData(i);
                const colors = Array(device.colors.length).fill({ red: r, green: g, blue: b });
                await this.client.updateLeds(i, colors);
            }
        } catch (error) {
            console.error('Error applying color:', error);
        }
    }

    private startBreathingEffect(speed: number, color: {r: number, g: number, b: number}) {
        let brightness = 0;
        let direction = 1;
        const intervalMs = 50; 
        
        this.effectInterval = setInterval(async () => {
            brightness += direction * (0.02 * (speed / 50)); // Normalize speed
            if (brightness >= 1) {
                brightness = 1;
                direction = -1;
            } else if (brightness <= 0.1) {
                brightness = 0.1;
                direction = 1;
            }

            const r = Math.round(color.r * brightness);
            const g = Math.round(color.g * brightness);
            const b = Math.round(color.b * brightness);

            await this.applyColor(r, g, b);
        }, intervalMs);
    }

    private startColorCycle(speed: number) {
        let hue = 0;
        const intervalMs = 50;
        const step = Math.max(1, Math.round(speed / 10));

        this.effectInterval = setInterval(async () => {
            hue = (hue + step) % 360;
            const { r, g, b } = this.hsvToRgb(hue / 360, 1, 1);
            await this.applyColor(r, g, b);
        }, intervalMs);
    }

    private startRainbowWave(speed: number) {
        let offset = 0;
        const intervalMs = 50;
        const speedFactor = Math.max(1, Math.round(speed / 5));

        this.effectInterval = setInterval(async () => {
            offset = (offset + speedFactor) % 360;
            
            if (!this.isConnected) return;
            try {
                const count = await this.client.getControllerCount();
                for (let i = 0; i < count; i++) {
                    const device = await this.client.getControllerData(i);
                    const colors = [];
                    for (let l = 0; l < device.colors.length; l++) {
                        // Calculate hue based on LED position and offset
                        const hue = (offset + (l * 10)) % 360;
                        const { r, g, b } = this.hsvToRgb(hue / 360, 1, 1);
                        colors.push({ red: r, green: g, blue: b });
                    }
                    await this.client.updateLeds(i, colors);
                }
            } catch (error) {
                console.error('Error in Rainbow Wave:', error);
            }
        }, intervalMs);
    }

    private startStarryNight(_speed: number) {
        const intervalMs = 100;
        
        this.effectInterval = setInterval(async () => {
            if (!this.isConnected) return;
            try {
                const count = await this.client.getControllerCount();
                for (let i = 0; i < count; i++) {
                    const device = await this.client.getControllerData(i);
                    const colors = [];
                    for (let l = 0; l < device.colors.length; l++) {
                        // Randomly twinkle
                        if (Math.random() > 0.9) {
                            colors.push({ red: 255, green: 255, blue: 255 }); // White star
                        } else {
                            // Dark blue background
                            colors.push({ red: 0, green: 0, blue: 20 });
                        }
                    }
                    await this.client.updateLeds(i, colors);
                }
            } catch (error) {
                console.error('Error in Starry Night:', error);
            }
        }, intervalMs);
    }

    private startAudioViz(_speed: number) {
        // Mock Audio Viz - Random bars/intensities
        const intervalMs = 50;
        
        this.effectInterval = setInterval(async () => {
            if (!this.isConnected) return;
            try {
                const count = await this.client.getControllerCount();
                for (let i = 0; i < count; i++) {
                    const device = await this.client.getControllerData(i);
                    const colors = [];
                    // Generate a random intensity for this frame (simulating beat)
                    const intensity = Math.random();
                    
                    for (let l = 0; l < device.colors.length; l++) {
                        // Color based on intensity (Green -> Yellow -> Red)
                        const r = Math.round(intensity * 255);
                        const g = Math.round((1 - intensity) * 255);
                        const b = 0;
                        
                        // Only light up if below "volume" threshold for this LED (simulating VU meter)
                        // Or just pulse entire device
                        colors.push({ red: r, green: g, blue: b });
                    }
                    await this.client.updateLeds(i, colors);
                }
            } catch (error) {
                console.error('Error in Audio Viz:', error);
            }
        }, intervalMs);
    }

    private hsvToRgb(h: number, s: number, v: number) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
            default: r = 0; g = 0; b = 0;
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    async getDevices() {
        if (!this.isConnected) await this.connect();
        if (!this.isConnected) return [];
        
        try {
            const count = await this.client.getControllerCount();
            const devices = [];
            for (let i = 0; i < count; i++) {
                const data: any = await this.client.getControllerData(i);
                devices.push({
                    id: i,
                    name: data.name,
                    type: data.type,
                    leds: data.leds.length
                });
            }
            return devices;
        } catch (error) {
            console.error('Error getting RGB devices:', error);
            return [];
        }
    }
}
