import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// BUG-055: tight allow-list for device IDs we will pass into PowerShell.
// Windows audio device IDs look like {0.0.0.00000000}.{guid}, paths, or numeric indexes.
function isSafeDeviceId(id: string): boolean {
    return typeof id === 'string' && id.length < 200 && /^[A-Za-z0-9_.,:\-\\{}/ ]+$/.test(id);
}

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
        // BUG-054: try AudioDeviceCmdlets first to learn which device is actually default.
        let defaultId: string | null = null;
        try {
            const { stdout: defOut } = await execFileAsync(
                'powershell',
                ['-NoProfile', '-Command', 'Get-AudioDevice -Playback | Select-Object -ExpandProperty ID'],
                { timeout: 5000 }
            );
            defaultId = (defOut || '').trim() || null;
        } catch {
            // module not installed; we'll fall back to the legacy first-item heuristic below
        }

        const { stdout } = await execFileAsync(
            'powershell',
            ['-NoProfile', '-Command', 'Get-CimInstance Win32_SoundDevice | Select-Object Name, Status, DeviceID | ConvertTo-Json'],
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
                // BUG-054: prefer real default, fall back to first-item only when unknown.
                isDefault: defaultId ? d.DeviceID === defaultId : idx === 0,
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

            // BUG-055: validate before any shell-adjacent call. Reject IDs with
            // characters that could break out of the PowerShell single-quoted string.
            if (!isSafeDeviceId(deviceId)) {
                return { success: false, error: 'Invalid device id' };
            }

            try {
                // execFile + arg array — no template interpolation reaches the shell.
                await execFileAsync(
                    'powershell',
                    ['-NoProfile', '-Command', `Set-AudioDevice -ID '${deviceId.replace(/'/g, "''")}'`],
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
