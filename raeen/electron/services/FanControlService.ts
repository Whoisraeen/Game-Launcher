import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class FanControlService {
    private exePath: string;
    private fanCurves: Map<string, { temp: number; speed: number }[]> = new Map();
    private controlInterval: NodeJS.Timeout | null = null;

    constructor() {
        // In production, binaries are usually in resources/bin
        // In dev, we might look in electron/native/bin/Debug/net...
        this.exePath = path.join(process.cwd(), 'electron', 'native', 'FanControl.exe');
        this.startControlLoop();
    }

    async setFanCurve(fanId: string, points: { temp: number; speed: number }[]) {
        this.fanCurves.set(fanId, points);
        console.log(`[FanControl] Curve set for ${fanId}:`, points);
        return true;
    }

    private startControlLoop() {
        if (this.controlInterval) clearInterval(this.controlInterval);
        
        this.controlInterval = setInterval(async () => {
            if (this.fanCurves.size === 0) return;

            try {
                const data = await this.getFanData();
                // Flatten sensors
                const allSensors = data.flatMap((hw: any) => hw.Sensors || []);
                const temps = allSensors.filter((s: any) => s.Type === 'Temperature');

                // Basic Heuristic for Temp Source
                const cpuTemp = temps.find((t: any) => t.Name.includes('CPU'))?.Value || 50;
                const gpuTemp = temps.find((t: any) => t.Name.includes('GPU'))?.Value || 50;

                for (const [fanId, points] of this.fanCurves.entries()) {
                    // Determine which temp to use
                    // This should ideally be user-configurable
                    let sourceTemp = cpuTemp;
                    if (fanId.toLowerCase().includes('gpu')) sourceTemp = gpuTemp;

                    // Calculate Target Speed
                    const targetSpeed = this.calculateSpeed(sourceTemp, points);
                    
                    // Apply
                    // Note: To prevent spamming, we should check if current speed is close to target
                    // But we don't have current speed setting, only RPM. 
                    // So we just set it.
                    await this.setFanSpeed(fanId, targetSpeed);
                }
            } catch (e) {
                console.error('[FanControl] Control loop error:', e);
            }
        }, 5000); // Update every 5 seconds
    }

    private calculateSpeed(temp: number, points: { temp: number; speed: number }[]): number {
        // Sort points by temp
        const sorted = [...points].sort((a, b) => a.temp - b.temp);
        
        // Below lowest
        if (temp <= sorted[0].temp) return sorted[0].speed;
        // Above highest
        if (temp >= sorted[sorted.length - 1].temp) return sorted[sorted.length - 1].speed;

        // Interpolate
        for (let i = 0; i < sorted.length - 1; i++) {
            if (temp >= sorted[i].temp && temp <= sorted[i + 1].temp) {
                const t1 = sorted[i].temp;
                const t2 = sorted[i + 1].temp;
                const s1 = sorted[i].speed;
                const s2 = sorted[i + 1].speed;
                
                const factor = (temp - t1) / (t2 - t1);
                return Math.round(s1 + factor * (s2 - s1));
            }
        }
        return 50; // Fallback
    }

    async getFanData(): Promise<any> {
        // Check if exe exists, if not return mock data
        if (!fs.existsSync(this.exePath)) {
            console.warn('FanControl.exe not found at', this.exePath, '- Returning mock data');
            return this.getMockData();
        }

        return new Promise((resolve) => {
            const process = spawn(this.exePath, ['list']);
            let data = '';
            let error = '';

            process.stdout.on('data', (chunk) => {
                data += chunk;
            });

            process.stderr.on('data', (chunk) => {
                error += chunk;
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    console.error('FanControl process exited with code', code, error);
                    // Fallback to mock on error
                    resolve(this.getMockData());
                } else {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        console.error('Failed to parse FanControl output', e);
                        resolve(this.getMockData());
                    }
                }
            });
        });
    }

    async setFanSpeed(sensorId: string, value: number): Promise<boolean> {
        if (!fs.existsSync(this.exePath)) {
            console.log(`[MOCK] Setting fan ${sensorId} to ${value}%`);
            return true;
        }

        return new Promise((resolve) => {
            const process = spawn(this.exePath, ['set', sensorId, value.toString()]);
            
            process.on('close', (code) => {
                resolve(code === 0);
            });
        });
    }

    private getMockData() {
        return [
            {
                Name: "Mock System",
                Type: "Motherboard",
                Sensors: [
                    { Id: "/intelcpu/0/fan/0", Name: "CPU Fan", Type: "Fan", Value: 1250 },
                    { Id: "/gpu/0/fan/0", Name: "GPU Fan", Type: "Fan", Value: 0 }, // 0 RPM mode
                    { Id: "/lpc/0/fan/0", Name: "Case Fan Front", Type: "Fan", Value: 800 },
                    { Id: "/lpc/0/fan/1", Name: "Case Fan Rear", Type: "Fan", Value: 950 },
                    { Id: "/intelcpu/0/temperature/0", Name: "CPU Temp", Type: "Temperature", Value: 45 },
                    { Id: "/gpu/0/temperature/0", Name: "GPU Temp", Type: "Temperature", Value: 38 }
                ]
            }
        ];
    }
}
