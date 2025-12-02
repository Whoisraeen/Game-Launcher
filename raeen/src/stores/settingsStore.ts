import { create } from 'zustand';

// Duplicate of the interface from backend to avoid importing from electron folder
// In a real monorepo, this would be in a shared package
export interface UserSettings {
    general: {
        launchOnStartup: boolean;
        startMinimized: boolean;
        autoDetectGames: boolean;
    };
    appearance: {
        theme: 'dark' | 'light' | 'cyberpunk' | 'midnight';
        enableTransparency: boolean;
        animatedBackgrounds: boolean;
        customBackground?: string;
        blurLevel?: 'low' | 'medium' | 'high';
        overlayOpacity?: number;
        accentColor?: string;
    };
    gameManagement: {
        closeOnLaunch: boolean;
        cloudSync: boolean; // For save games
    };
    account: {
        username: string;
        avatar: string;
        status: 'online' | 'away' | 'offline' | 'playing';
    };
    integrations: {
        steamApiKey: string;
        steamId: string;
        discordId?: string;
        discordEnabled?: boolean;
        xboxId?: string;
        epicId?: string;
        gogId?: string;
    };
    obs: {
        address: string;
        password?: string;
    };
    performance: {
        optimizeOnLaunch: boolean;
        showOverlay: boolean;
        targetFps?: number;
    };
    gaming: {
        preGameHealthCheck: boolean;
        autoCloseBackgroundApps: boolean;
    };
}

interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof UserSettings>(category: K, value: Partial<UserSettings[K]>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await window.ipcRenderer.invoke('settings:getAll');
      set({ settings, isLoading: false });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  updateSetting: async (category, value) => {
    try {
      // Optimistic update
      set((state) => {
        if (!state.settings) return state;
        return {
          settings: {
            ...state.settings,
            [category]: {
              ...state.settings[category],
              ...value
            }
          }
        };
      });

      const updatedSettings = await window.ipcRenderer.invoke('settings:update', category, value);
      set({ settings: updatedSettings });
    } catch (error) {
      console.error('Failed to update setting:', error);
      // Revert would be nice here, but simple optimistic is okay for now
    }
  }
}));
