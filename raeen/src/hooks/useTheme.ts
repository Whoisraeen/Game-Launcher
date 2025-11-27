import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { themes, ThemeName } from '../styles/themes';

export const useTheme = () => {
    const { settings } = useSettingsStore();

    useEffect(() => {
        if (!settings) return;
        
        const themeName = (settings.appearance.theme || 'dark') as ThemeName;
        const theme = themes[themeName] || themes.dark;

        const root = document.documentElement;
        
        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

    }, [settings?.appearance.theme]);
};
