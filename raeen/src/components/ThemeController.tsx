import React, { useEffect } from 'react';
import { Vibrant } from 'node-vibrant/browser';
import { useUIStore } from '../stores/uiStore';
import { useGameStore } from '../stores/gameStore';

const ThemeController: React.FC = () => {
    const { selectedGame, setDynamicAccentColor } = useUIStore();
    const { games } = useGameStore();

    // Determine the active game to pull colors from
    // If a game is selected (e.g. in details view or Big Picture), use that.
    // Otherwise, use the most recently played game for the home screen vibe.
    const activeGame = selectedGame || [...games].sort((a, b) => 
        (b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0) - 
        (a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0)
    )[0];

    useEffect(() => {
        if (!activeGame) return;

        const imageToAnalyze = activeGame.heroImage || activeGame.cover;
        if (!imageToAnalyze) return;

        const extractColors = async () => {
            try {
                // Use node-vibrant to extract the palette
                // We disable the worker in Electron renderer usually to avoid path issues, 
                // but basic usage often works. If not, we might need to configure it.
                const palette = await Vibrant.from(imageToAnalyze).getPalette();
                
                // Prefer Vibrant or LightVibrant for the primary accent
                const primary = palette.Vibrant || palette.LightVibrant || palette.Muted;
                const secondary = palette.DarkVibrant || palette.DarkMuted;

                if (primary) {
                    const hex = primary.hex;
                    const [r, g, b] = primary.rgb;

                    // Update global CSS variables
                    const root = document.documentElement;
                    
                    root.style.setProperty('--theme-primary', hex);
                    root.style.setProperty('--theme-rgb', `${r}, ${g}, ${b}`);
                    
                    if (secondary) {
                        root.style.setProperty('--theme-secondary', secondary.hex);
                    }

                    // Store in zustand for components that need JS access
                    setDynamicAccentColor(hex);
                }
            } catch (error) {
                console.error("Failed to extract theme colors:", error);
            }
        };

        extractColors();

    }, [activeGame?.id, activeGame?.heroImage, activeGame?.cover]);

    return null; // This component is renderless
};

export default ThemeController;
