import si from 'systeminformation';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

interface DisplayInfo {
    width: number;
    height: number;
    dpi: number;
    scaleFactor: number;
    diagonal: number;
    refreshRate: number;
    model: string;
}

interface ScaleRecommendation {
    displayInfo: DisplayInfo;
    recommendedScale: number;
    uiScalePercent: number;
    reasoning: string;
    presets: { label: string; scale: number }[];
}

export class UIScalerService {
    async getDisplayInfo(): Promise<DisplayInfo> {
        try {
            const graphics = await si.graphics();
            const display = graphics.displays?.[0];

            let dpi = 96;
            try {
                const { stdout } = await execAsync(
                    'powershell -Command "(Get-ItemProperty \'HKCU:\\Control Panel\\Desktop\\WindowMetrics\').AppliedDPI"',
                );
                const parsed = parseInt(stdout.trim(), 10);
                if (parsed > 0) dpi = parsed;
            } catch {
                // fallback
            }

            let scaleFactor = 1.0;
            try {
                const { stdout } = await execAsync(
                    'powershell -Command "[Math]::Round((Get-ItemProperty \'HKCU:\\Control Panel\\Desktop\').LogPixels / 96, 2)"',
                );
                const parsed = parseFloat(stdout.trim());
                if (parsed > 0) scaleFactor = parsed;
            } catch {
                scaleFactor = dpi / 96;
            }

            const width = display?.resolutionX || 1920;
            const height = display?.resolutionY || 1080;
            const diagonal = Math.sqrt(width * width + height * height) / dpi;

            return {
                width,
                height,
                dpi,
                scaleFactor,
                diagonal: Math.round(diagonal * 10) / 10,
                refreshRate: display?.currentRefreshRate || 60,
                model: display?.model || 'Unknown',
            };
        } catch (error) {
            console.error('Failed to get display info:', error);
            return {
                width: 1920,
                height: 1080,
                dpi: 96,
                scaleFactor: 1.0,
                diagonal: 24,
                refreshRate: 60,
                model: 'Unknown',
            };
        }
    }

    async getRecommendation(): Promise<ScaleRecommendation> {
        const displayInfo = await this.getDisplayInfo();
        const { width, height, dpi } = displayInfo;
        const totalPixels = width * height;

        let recommendedScale = 1.0;
        let reasoning = '';

        if (totalPixels >= 3840 * 2160) {
            recommendedScale = 2.0;
            reasoning = '4K display detected — 200% scaling keeps UI elements readable at native resolution.';
        } else if (totalPixels >= 2560 * 1440) {
            recommendedScale = 1.5;
            reasoning = '1440p display — 150% scaling balances sharpness and usability.';
        } else if (totalPixels >= 1920 * 1080) {
            if (dpi > 120) {
                recommendedScale = 1.25;
                reasoning = 'High-DPI 1080p display — slight scale-up improves readability.';
            } else {
                recommendedScale = 1.0;
                reasoning = 'Standard 1080p display — native 100% scaling is optimal.';
            }
        } else {
            recommendedScale = 1.0;
            reasoning = 'Sub-1080p resolution — 100% keeps maximum usable space.';
        }

        const presets = [
            { label: 'Compact', scale: 0.75 },
            { label: 'Default', scale: 1.0 },
            { label: 'Comfortable', scale: 1.25 },
            { label: 'Large', scale: 1.5 },
            { label: '4K Ready', scale: 2.0 },
        ];

        return {
            displayInfo,
            recommendedScale,
            uiScalePercent: Math.round(recommendedScale * 100),
            reasoning,
            presets,
        };
    }

    async applyScaleToGameConfig(configPath: string, scaleKey: string, scaleValue: number): Promise<boolean> {
        try {
            if (!fs.existsSync(configPath)) return false;

            let content = fs.readFileSync(configPath, 'utf-8');

            fs.copyFileSync(configPath, `${configPath}.bak`);

            const regex = new RegExp(`(${scaleKey}\\s*=\\s*)([\\d.]+)`, 'i');
            if (regex.test(content)) {
                content = content.replace(regex, `$1${scaleValue}`);
            } else {
                content += `\n${scaleKey}=${scaleValue}\n`;
            }

            fs.writeFileSync(configPath, content, 'utf-8');
            return true;
        } catch (error) {
            console.error('Failed to apply UI scale to config:', error);
            return false;
        }
    }
}
