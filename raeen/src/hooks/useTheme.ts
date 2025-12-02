import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { themes, ThemeName } from '../styles/themes';

export const useTheme = () => {
    const { settings } = useSettingsStore();
    const { dynamicAccentColor } = useUIStore();

    useEffect(() => {
        if (!settings) return;
        
        const themeName = (settings.appearance.theme || 'dark') as ThemeName;
        const theme = themes[themeName] || themes.dark;

        const root = document.documentElement;
        
        // Apply base theme
        Object.entries(theme).forEach(([key, value]) => {
            // If we have a dynamic accent, override the accent color
            if (key === '--accent' && dynamicAccentColor) {
                root.style.setProperty(key, dynamicAccentColor);
            } else if (key === '--accent' && settings.appearance.accentColor) {
                 // Use user specified accent if no dynamic game color
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

        // Also inject glass border color derived from accent if dynamic
        if (dynamicAccentColor) {
            // Simple way to make it semi-transparent
            root.style.setProperty('--glass-border', dynamicAccentColor.replace('rgb', 'rgba').replace(')', ', 0.3)'));
        } else if (settings.appearance.accentColor) {
             // Hex to rgba conversion for border
             const hex = settings.appearance.accentColor;
             const r = parseInt(hex.slice(1, 3), 16);
             const g = parseInt(hex.slice(3, 5), 16);
             const b = parseInt(hex.slice(5, 7), 16);
             root.style.setProperty('--glass-border', `rgba(${r}, ${g}, ${b}, 0.3)`);
        }

    }, [settings?.appearance, dynamicAccentColor]);
};
