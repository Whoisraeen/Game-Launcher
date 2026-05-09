import { exec } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';

const execAsync = promisify(exec);

export interface AudioDevice {
    id: string;
    name: string;
    type: 'playback' | 'recording';
    status: string;
    isDefault: boolean;
}

export class AudioService {
    private cachedDevices: AudioDevice[] = [];

    async getDevices(): Promise<AudioDevice[]> {
        try {
            const devices = await this.getDevicesViaPowerShell();
            if (devices.length > 0) {
                this.cachedDevices = devices;
                return devices;
            }
        } catch {
            // PowerShell approach failed, fall back
        }

        try {
            return await this.getDevicesViaSysInfo();
        } catch (error) {
            console.error('Failed to get audio devices:', error);
            return this.cachedDevices;
        }
    }

    private async getDevicesViaPowerShell(): Promise<AudioDevice[]> {
        const { stdout } = await execAsync(
            `powershell -NoProfile -Command "Get-CimInstance Win32_SoundDevice | Select-Object Name, Status, DeviceID | ConvertTo-Json"`,
            { timeout: 10000 }
        );

        const raw = JSON.parse(stdout.trim());
        const items = Array.isArray(raw) ? raw : [raw];

        return items
            .filter((d: any) => d.Name)
            .map((d: any, idx: number) => ({
                id: d.DeviceID || `audio_${idx}`,
                name: d.Name,
                type: 'playback' as const,
                status: d.Status || 'Unknown',
                isDefault: idx === 0,
            }));
    }

    private async getDevicesViaSysInfo(): Promise<AudioDevice[]> {
        const audio = await si.audio();
        return audio.map((d, idx) => ({
            id: d.id || `si_audio_${idx}`,
            name: d.name || 'Unknown Device',
            type: (d.type === 'microphone' ? 'recording' : 'playback') as 'playback' | 'recording',
            status: d.status || 'OK',
            isDefault: d.default || idx === 0,
        }));
    }

    async setDefault(deviceId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Try AudioDeviceCmdlets first
            const deviceName = this.cachedDevices.find(d => d.id === deviceId)?.name;
            if (!deviceName) {
                return { success: false, error: 'Device not found' };
            }

            try {
                await execAsync(
                    `powershell -NoProfile -Command "Set-AudioDevice -ID '${deviceId}'"`,
                    { timeout: 10000 }
                );
                return { success: true };
            } catch {
                // AudioDeviceCmdlets not installed — best-effort registry approach
            }

            // Fallback: open Windows sound settings so user can change manually
            await execAsync('rundll32.exe shell32.dll,Control_RunDLL mmsys.cpl,,0');
            return {
                success: false,
                error: 'AudioDeviceCmdlets not installed. Opened Windows Sound settings instead — please set the device manually.',
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
}
