import { create } from 'zustand';
import { Friend } from '../types';

interface FriendState {
    friends: Friend[];
    isLoading: boolean;
    error: string | null;
    loadFriends: () => Promise<void>;
    addFriend: (username: string, platform?: string) => Promise<void>;
    removeFriend: (id: string) => Promise<void>;
    importSteamFriends: () => Promise<void>;
    syncFriends: () => Promise<void>;
    simulateActivity: () => Promise<void>;
}

export const useFriendStore = create<FriendState>((set) => ({
    friends: [],
    isLoading: false,
    error: null,

    loadFriends: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await window.ipcRenderer.invoke('friends:getAll');
            set({ friends: result, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    addFriend: async (username: string, platform?: string) => {
        try {
            const newFriend = await window.ipcRenderer.invoke('friends:add', username, platform);
            set(state => ({ friends: [...state.friends, newFriend] }));
        } catch (error) {
            console.error('Failed to add friend:', error);
        }
    },

    removeFriend: async (id: string) => {
        try {
            await window.ipcRenderer.invoke('friends:remove', id);
            set(state => ({ friends: state.friends.filter(f => f.id !== id) }));
        } catch (error) {
            console.error('Failed to remove friend:', error);
        }
    },

    importSteamFriends: async () => {
        set({ isLoading: true });
        try {
            const newFriends = await window.ipcRenderer.invoke('friends:importSteam');
            set(state => ({ 
                friends: [...state.friends, ...newFriends],
                isLoading: false 
            }));
        } catch (error) {
            console.error('Failed to import Steam friends:', error);
            set({ isLoading: false });
        }
    },

    syncFriends: async () => {
        set({ isLoading: true });
        try {
            await window.ipcRenderer.invoke('friends:sync');
            // Reload all friends to get the latest state including manual ones
            const result = await window.ipcRenderer.invoke('friends:getAll');
            set({ friends: result, isLoading: false });
        } catch (error) {
            console.error('Failed to sync friends:', error);
            set({ isLoading: false });
        }
    },

    simulateActivity: async () => {
        try {
            const result = await window.ipcRenderer.invoke('friends:simulate');
            set({ friends: result });
        } catch (error) {
            console.error('Failed to simulate activity:', error);
        }
    }
}));
