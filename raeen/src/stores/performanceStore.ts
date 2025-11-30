import { create } from 'zustand';
import { SystemStats } from '../types';

interface PerformanceStore {
    isOverlayVisible: boolean;
    toggleOverlay: () => void;
    stats: SystemStats | null;
    setStats: (stats: SystemStats) => void;
}

export const usePerformanceStore = create<PerformanceStore>((set) => ({
    isOverlayVisible: false,
    stats: null,
    toggleOverlay: () => {
        set((state) => {
            // Send IPC to main process to toggle window visibility
            window.ipcRenderer.send('overlay:toggle');
            return { isOverlayVisible: !state.isOverlayVisible };
        });
    },
    setStats: (stats) => set({ stats }),
}));