import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs';

const execAsync = promisify(exec);

export type CompatMode = 'WIN7' | 'WIN8' | 'WIN10' | 'VISTA' | 'WINXP' | 'NONE';

export interface CompatSettings {
    gameId: string;
    executablePath: string;
    currentMode: CompatMode;
    runAsAdmin: boolean;
    disableFullscreenOptimizations: boolean;
    highDpiScaling: boolean;
}

export interface WindowsInfo {
    version: string;
    build: string;
    arch: string;
}

const COMPAT_LAYER_MAP: Record<CompatMode, string> = {
    WIN7:   'WIN7RTM',
    WIN8:   'WIN8RTM',
    WIN10:  'WIN10',
    VISTA:  'VISTARTM',
    WINXP:  'WINXPSP3',
    NONE:   '',
};

const REGISTRY_PATH = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers';

export class CompatibilityService {

    async getWindowsInfo(): Promise<WindowsInfo> {
        const rel = os.release();
        const arch = os.arch();
        let build = '';

        try {
            const { stdout } = await execAsync(
                'powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).BuildNumber"',
                { timeout: 8000 }
            );
            build = stdout.trim();
        } catch { /* ignore */ }

        let version = 'Unknown';
        const major = parseInt(rel.split('.')[0], 10);
        const buildNum = parseInt(build, 10);
        if (major >= 10 && buildNum >= 22000) version = 'Windows 11';
        else if (major >= 10) version = 'Windows 10';
        else if (major === 6 && rel.startsWith('6.3')) version = 'Windows 8.1';
        else if (major === 6 && rel.startsWith('6.2')) version = 'Windows 8';
        else if (major === 6 && rel.startsWith('6.1')) version = 'Windows 7';

        return { version, build, arch };
    }

    async getSettings(gameId: string, executablePath: string): Promise<CompatSettings> {
        const settings: CompatSettings = {
            gameId,
            executablePath,
            currentMode: 'NONE',
            runAsAdmin: false,
            disableFullscreenOptimizations: false,
            highDpiScaling: false,
        };

        if (!executablePath || !fs.existsSync(executablePath)) return settings;

        try {
            const { stdout } = await execAsync(
                `reg query "${REGISTRY_PATH}" /v "${executablePath}" 2>nul`,
                { timeout: 8000 }
            );

            const value = stdout.split('REG_SZ').pop()?.trim() || '';
            const layers = value.split(' ').map(l => l.trim().toUpperCase());

            for (const [mode, regVal] of Object.entries(COMPAT_LAYER_MAP)) {
                if (regVal && layers.includes(regVal)) {
                    settings.currentMode = mode as CompatMode;
                    break;
                }
            }

            settings.runAsAdmin = layers.includes('RUNASADMIN');
            settings.disableFullscreenOptimizations = layers.includes('DISABLEDXMAXIMIZEDWINDOWEDMODE');
            settings.highDpiScaling = layers.includes('HIGHDPIAWARE');
        } catch {
            // No entry — defaults are fine
        }

        return settings;
    }

    async setMode(
        gameId: string,
        executablePath: string,
        mode: CompatMode,
        options?: { runAsAdmin?: boolean; disableFullscreenOpt?: boolean; highDpi?: boolean }
    ): Promise<{ success: boolean; error?: string }> {
        if (!executablePath) {
            return { success: false, error: 'No executable path provided' };
        }

        try {
            const layers: string[] = [];

            if (mode !== 'NONE') {
                const regVal = COMPAT_LAYER_MAP[mode];
                if (regVal) layers.push(`~ ${regVal}`);
            }

            if (options?.runAsAdmin)           layers.push('RUNASADMIN');
            if (options?.disableFullscreenOpt) layers.push('DISABLEDXMAXIMIZEDWINDOWEDMODE');
            if (options?.highDpi)              layers.push('HIGHDPIAWARE');

            if (layers.length === 0) {
                await execAsync(
                    `reg delete "${REGISTRY_PATH}" /v "${executablePath}" /f 2>nul`,
                    { timeout: 8000 }
                );
            } else {
                const value = layers.join(' ');
                await execAsync(
                    `reg add "${REGISTRY_PATH}" /v "${executablePath}" /t REG_SZ /d "${value}" /f`,
                    { timeout: 8000 }
                );
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
}
