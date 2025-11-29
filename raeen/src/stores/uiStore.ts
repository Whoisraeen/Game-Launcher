import { create } from 'zustand';
import { Game } from '../types';

interface UIState {
    dynamicAccentColor: string | null;
    setDynamicAccentColor: (color: string | null) => void;
    selectedGame: Game | null;
    setSelectedGame: (game: Game | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    dynamicAccentColor: null,
    setDynamicAccentColor: (color) => set({ dynamicAccentColor: color }),
    selectedGame: null,
    setSelectedGame: (game) => set({ selectedGame: game }),
}));
