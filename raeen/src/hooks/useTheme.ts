import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { themes, ThemeName } from '../styles/themes';

export const useTheme = () => {
    const { settings } = useSettingsStore();
    const { dynamicAccentColor, selectedGame } = useUIStore();

    useEffect(() => {
        if (!settings) return;

        const themeName = (settings.appearance.theme || 'dark') as ThemeName;
        const theme = themes[themeName] || themes.dark;
        const root = document.documentElement;

        // Apply all theme CSS variables
        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // Determine the effective accent color (dynamic > user setting > theme default)
        let effectiveAccent = theme['--accent'];
        let effectiveRgb = theme['--accent-rgb'];

        if (settings.appearance.accentColor) {
            effectiveAccent = settings.appearance.accentColor;
            effectiveRgb = hexToRgb(settings.appearance.accentColor);
        }
        if (dynamicAccentColor) {
            effectiveAccent = dynamicAccentColor;
            effectiveRgb = colorToRgb(dynamicAccentColor);
        }

        root.style.setProperty('--accent', effectiveAccent);
        root.style.setProperty('--accent-rgb', effectiveRgb);

        // Set --theme-rgb (used by index.css body gradient and .mesh-bg)
        root.style.setProperty('--theme-rgb', effectiveRgb);
        // Also set --theme-primary for any direct usage
        root.style.setProperty('--theme-primary', effectiveAccent);

        // Apply background color to body
        document.body.style.backgroundColor = theme['--bg-primary'];
        document.body.style.color = theme['--text-primary'];

        // Apply blur & opacity settings
        const blurVal = settings.appearance.blurLevel === 'low' ? '8px' : settings.appearance.blurLevel === 'high' ? '64px' : '32px';
        root.style.setProperty('--bg-blur', blurVal);

        const opacityVal = settings.appearance.overlayOpacity !== undefined ? settings.appearance.overlayOpacity.toString() : '0.6';
        root.style.setProperty('--bg-opacity', opacityVal);

        // Glass border derived from accent
        const glassBorder = `rgba(${effectiveRgb}, 0.15)`;
        root.style.setProperty('--glass-border', glassBorder);

        // Game-specific font
        const gameFont = getGameFont(selectedGame);
        root.style.setProperty('--game-font', gameFont);

    }, [settings?.appearance, dynamicAccentColor, selectedGame]);
};

function hexToRgb(hex: string): string {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return '79, 70, 229';
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

function colorToRgb(color: string): string {
    if (color.startsWith('#')) return hexToRgb(color);
    const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (match) return `${match[1]}, ${match[2]}, ${match[3]}`;
    return '79, 70, 229';
}

function getGameFont(game: any | null): string {
    if (!game) return 'inherit';
    try {
        const stored = localStorage.getItem('raeen.gameFonts.v1');
        if (stored) {
            const fontMap: Record<string, string> = JSON.parse(stored);
            if (fontMap[game.id]) return fontMap[game.id];
        }
    } catch {}
    return 'inherit';
}

export function setGameFont(gameId: string, font: string) {
    try {
        const stored = localStorage.getItem('raeen.gameFonts.v1');
        const fontMap: Record<string, string> = stored ? JSON.parse(stored) : {};
        fontMap[gameId] = font;
        localStorage.setItem('raeen.gameFonts.v1', JSON.stringify(fontMap));
        document.documentElement.style.setProperty('--game-font', font);
    } catch {}
}

export function getGameFontPreference(gameId: string): string {
    try {
        const stored = localStorage.getItem('raeen.gameFonts.v1');
        if (stored) {
            const fontMap: Record<string, string> = JSON.parse(stored);
            return fontMap[gameId] || '';
        }
    } catch {}
    return '';
}
