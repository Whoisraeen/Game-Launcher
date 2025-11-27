import { create } from 'zustand';

export interface Mod {
    id: string;
    gameId: string;
    name: string;
    description: string;
    version: string;
    enabled: boolean;
    installPath: string;
    createdAt: number;
    gameTitle?: string;
    gamePlatform?: string;
}

interface ModState {
    mods: Mod[];
    isLoading: boolean;
    error: string | null;
    loadMods: () => Promise<void>;
    addMod: (gameId: string, name: string, description: string, version: string, installPath: string) => Promise<void>;
    updateMod: (id: string, updates: Partial<Mod>) => Promise<void>;
    deleteMod: (id: string) => Promise<void>;
    toggleMod: (id: string, enabled: boolean) => Promise<void>;
}

export const useModStore = create<ModState>((set, get) => ({
    mods: [],
    isLoading: false,
    error: null,

    loadMods: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await window.ipcRenderer.invoke('mods:getAll');
            // Map snake_case to camelCase
            const mappedMods = result.map((m: any) => ({
                id: m.id,
                gameId: m.game_id,
                name: m.name,
                description: m.description,
                version: m.version,
                enabled: !!m.enabled,
                installPath: m.install_path,
                createdAt: m.created_at,
                gameTitle: m.game_title,
                gamePlatform: m.game_platform
            }));
            set({ mods: mappedMods, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    addMod: async (gameId, name, description, version, installPath) => {
        try {
            await window.ipcRenderer.invoke('mods:add', gameId, name, description, version, installPath);
            await get().loadMods();
        } catch (error) {
            console.error('Failed to add mod:', error);
        }
    },

    updateMod: async (id, updates) => {
        try {
            // Map camelCase to snake_case for DB
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.version !== undefined) dbUpdates.version = updates.version;
            if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled ? 1 : 0;
            if (updates.installPath !== undefined) dbUpdates.install_path = updates.installPath;

            await window.ipcRenderer.invoke('mods:update', id, dbUpdates);
            
            // Optimistic update
            set(state => ({
                mods: state.mods.map(m => m.id === id ? { ...m, ...updates } : m)
            }));
        } catch (error) {
            console.error('Failed to update mod:', error);
            get().loadMods(); // Revert
        }
    },

    deleteMod: async (id) => {
        try {
            await window.ipcRenderer.invoke('mods:delete', id);
            set(state => ({
                mods: state.mods.filter(m => m.id !== id)
            }));
        } catch (error) {
            console.error('Failed to delete mod:', error);
        }
    },

    toggleMod: async (id, enabled) => {
        await get().updateMod(id, { enabled });
    }
}));
