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
            } else {
                root.style.setProperty(key, value);
            }
        });
        
        // Also inject glass border color derived from accent if dynamic
        if (dynamicAccentColor) {
            // Simple way to make it semi-transparent
            root.style.setProperty('--glass-border', dynamicAccentColor.replace('rgb', 'rgba').replace(')', ', 0.3)'));
        }

    }, [settings?.appearance.theme, dynamicAccentColor]);
};
