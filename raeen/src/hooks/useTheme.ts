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
        
        // Apply base theme
        Object.entries(theme).forEach(([key, value]) => {
            if (key === '--accent' && dynamicAccentColor) {
                root.style.setProperty(key, dynamicAccentColor);
            } else if (key === '--accent' && settings.appearance.accentColor) {
                root.style.setProperty(key, settings.appearance.accentColor);
            } else {
                root.style.setProperty(key, value);
            }
        });
        
        // Apply Custom Effects
        const blurVal = settings.appearance.blurLevel === 'low' ? '8px' : settings.appearance.blurLevel === 'high' ? '64px' : '32px';
        root.style.setProperty('--bg-blur', blurVal);
        
        const opacityVal = settings.appearance.overlayOpacity !== undefined ? settings.appearance.overlayOpacity.toString() : '0.6';
        root.style.setProperty('--bg-opacity', opacityVal);

        // Glass border color derived from accent
        if (dynamicAccentColor) {
            root.style.setProperty('--glass-border', dynamicAccentColor.replace('rgb', 'rgba').replace(')', ', 0.3)'));
        } else if (settings.appearance.accentColor) {
             const hex = settings.appearance.accentColor;
             const r = parseInt(hex.slice(1, 3), 16);
             const g = parseInt(hex.slice(3, 5), 16);
             const b = parseInt(hex.slice(5, 7), 16);
             root.style.setProperty('--glass-border', `rgba(${r}, ${g}, ${b}, 0.3)`);
        }

        // Game-specific font: apply from per-game settings or fallback
        const gameFont = getGameFont(selectedGame);
        root.style.setProperty('--game-font', gameFont);

    }, [settings?.appearance, dynamicAccentColor, selectedGame]);
};

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
