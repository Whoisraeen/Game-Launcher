import { create } from 'zustand';

interface PerformanceStore {
    isOverlayVisible: boolean;
    toggleOverlay: () => void;
}

export const usePerformanceStore = create<PerformanceStore>((set) => ({
    isOverlayVisible: false,
    toggleOverlay: () => {
        set((state) => {
            // Send IPC to main process to toggle window visibility
            window.ipcRenderer.send('overlay:toggle');
            return { isOverlayVisible: !state.isOverlayVisible };
        });
    },
}));