import { create } from 'zustand';

interface UIState {
    dynamicAccentColor: string | null;
    setDynamicAccentColor: (color: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    dynamicAccentColor: null,
    setDynamicAccentColor: (color) => set({ dynamicAccentColor: color }),
}));
