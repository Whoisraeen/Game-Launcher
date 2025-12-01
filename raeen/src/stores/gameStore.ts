import { create } from 'zustand';
import { Game, Collection } from '../types';

interface GameState {
    games: Game[];
    recommendations: Game[];
    collections: Collection[];
    weeklyActivity: { name: string; hours: number }[];
    avgSessionDuration: number;
    isLoading: boolean;
    error: string | null;
    selectedCollectionId: string | null;
    setSelectedCollectionId: (id: string | null) => void;
    syncLibrary: () => Promise<void>;
    page: number;
    pageSize: number;
    hasMore: boolean;
    totalGames: number;
    loadMoreGames: () => Promise<void>;
    loadGames: (reset?: boolean) => Promise<void>;
    loadRecommendations: () => Promise<void>;
    loadCollections: () => Promise<void>;
    createCollection: (name: string, description?: string) => Promise<void>;
    deleteCollection: (id: string) => Promise<void>;
    addGameToCollection: (collectionId: string, gameId: string) => Promise<void>;
    removeGameFromCollection: (collectionId: string, gameId: string) => Promise<void>;
    loadWeeklyActivity: () => Promise<void>;
    loadAvgSessionDuration: () => Promise<void>;
    launchGame: (gameId: string) => Promise<void>;
    openPlatform: (platform: string) => Promise<void>;
    toggleFavorite: (gameId: string, isFavorite: boolean) => Promise<void>;
    toggleHidden: (gameId: string, isHidden: boolean) => Promise<void>;
    updateTags: (gameId: string, tags: string[]) => Promise<void>;
    updatePlayStatus: (gameId: string, status: string) => Promise<void>;
    updateLaunchOptions: (gameId: string, options: string) => Promise<void>;
    updateRating: (gameId: string, rating: number) => Promise<void>;
    updateUserNotes: (gameId: string, notes: string) => Promise<void>;
    openInstallFolder: (gameId: string) => Promise<void>;
    createShortcut: (gameId: string) => Promise<void>;
    installGame: (gameId: string) => Promise<void>;
    uninstallGame: (gameId: string) => Promise<void>;
    updateGameDetails: (gameId: string, updates: Partial<Game>) => Promise<void>;
    reorderGames: (activeId: string, overId: string) => void;
    saveGameOrder: () => Promise<void>;

    // Friends & Achievements
    friends: any[];
    achievements: any[];
    loadFriends: () => Promise<void>;
    importSteamFriends: () => Promise<void>;
    loadAchievements: () => Promise<void>;
    openExternal: (url: string) => Promise<void>;
    
    // Merging
    mergeGames: (primaryId: string, secondaryId: string) => Promise<void>;
    unmergeGame: (gameId: string) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
    games: [],
    page: 1,
    pageSize: 50,
    hasMore: true,
    totalGames: 0,
    recommendations: [],
    collections: [],
    weeklyActivity: [],
    avgSessionDuration: 0,
    isLoading: false,
    error: null,
    selectedCollectionId: null,
    setSelectedCollectionId: (id) => set({ selectedCollectionId: id }),

    openInstallFolder: async (gameId) => {
        try {
            await window.ipcRenderer.invoke('games:openInstallFolder', gameId);
        } catch (error) {
            console.error('Failed to open install folder:', error);
        }
    },

    createShortcut: async (gameId) => {
        try {
            await window.ipcRenderer.invoke('games:createShortcut', gameId);
        } catch (error) {
            console.error('Failed to create shortcut:', error);
        }
    },

    installGame: async (gameId) => {
        try {
            await window.ipcRenderer.invoke('games:install', gameId);
        } catch (error) {
            console.error('Failed to install game:', error);
        }
    },

    uninstallGame: async (gameId) => {
        try {
            await window.ipcRenderer.invoke('games:uninstall', gameId);
        } catch (error) {
            console.error('Failed to uninstall game:', error);
        }
    },

    syncLibrary: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await window.ipcRenderer.invoke('games:sync');

            const mappedGames: Game[] = result.map((g: any) => ({
                id: g.id,
                title: g.title,
                cover: g.cover_url || g.icon_url,
                platform: g.platform,
                platformId: g.platform_id, // Fix: DB uses snake_case
                status: g.is_installed ? 'installed' : 'not_installed',
                playStatus: g.play_status || 'none',
                lastPlayed: g.last_played ? new Date(g.last_played) : undefined,
                addedAt: g.added_at ? new Date(g.added_at) : undefined,
                playtime: g.playtime_seconds ? g.playtime_seconds / 3600 : 0,
                isFavorite: !!g.is_favorite,
                isHidden: !!g.is_hidden,
                achievements: {
                    unlocked: g.achievements_unlocked || 0,
                    total: g.achievements_total || 0
                },
                tags: g.tags ? JSON.parse(g.tags) : [],
                genre: g.genre,
                installPath: g.install_path, // Fix: DB uses snake_case
                executable: g.executable,
                launchOptions: g.launch_options,
                rating: g.rating || 0,
                userNotes: g.user_notes || '',
                heroImage: g.background_url || g.cover_url,
                logo: g.logo_url,
                group_id: g.group_id
            }));

            set({
                games: mappedGames,
                isLoading: false,
                page: 1,
                hasMore: false, // Sync loads everything
                totalGames: mappedGames.length
            });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    loadGames: async (reset = false) => {
        set({ isLoading: true, error: null });
        if (reset) {
            set({ page: 1, games: [], hasMore: true });
        }

        const { page, pageSize } = get();

        try {
            const result = await window.ipcRenderer.invoke('games:getPage', reset ? 1 : page, pageSize);
            const { games: newGamesRaw, total } = result;

            const mappedGames: Game[] = newGamesRaw.map((g: any) => ({
                id: g.id,
                title: g.title,
                cover: g.cover_url,
                platform: g.platform,
                platformId: g.platform_id,
                status: g.is_installed ? 'installed' : 'not_installed',
                playStatus: g.play_status || 'none',
                lastPlayed: g.last_played ? new Date(g.last_played) : undefined,
                addedAt: g.added_at ? new Date(g.added_at) : undefined,
                playtime: g.playtime_seconds ? g.playtime_seconds / 3600 : 0,
                isFavorite: !!g.is_favorite,
                isHidden: !!g.is_hidden,
                achievements: {
                    unlocked: g.achievements_unlocked || 0,
                    total: g.achievements_total || 0
                },
                tags: g.tags ? JSON.parse(g.tags) : [],
                genre: g.genre,
                installPath: g.install_path,
                executable: g.executable,
                launchOptions: g.launch_options,
                rating: g.rating || 0,
                userNotes: g.user_notes || '',
                heroImage: g.background_url || g.cover_url,
                logo: g.logo_url,
                group_id: g.group_id
            }));

            set(state => ({
                games: reset ? mappedGames : [...state.games, ...mappedGames],
                isLoading: false,
                totalGames: total,
                hasMore: (reset ? mappedGames.length : state.games.length + mappedGames.length) < total,
                page: (reset ? 1 : state.page) + 1
            }));
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    loadMoreGames: async () => {
        const { hasMore, isLoading } = get();
        if (!hasMore || isLoading) return;
        await get().loadGames(false);
    },

    loadRecommendations: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await window.ipcRenderer.invoke('games:getRecommendations');

            const mappedGames: Game[] = result.map((g: any) => ({
                id: g.id,
                title: g.title,
                cover: g.cover_url,
                platform: g.platform,
                platformId: g.platform_id,
                status: g.is_installed ? 'installed' : 'not_installed',
                playStatus: g.play_status || 'none',
                lastPlayed: g.last_played ? new Date(g.last_played) : undefined,
                addedAt: g.added_at ? new Date(g.added_at) : undefined,
                playtime: g.playtime_seconds ? g.playtime_seconds / 3600 : 0,
                isFavorite: !!g.is_favorite,
                isHidden: !!g.is_hidden,
                achievements: {
                    unlocked: g.achievements_unlocked || 0,
                    total: g.achievements_total || 0
                },
                tags: g.tags ? JSON.parse(g.tags) : [],
                genre: g.genre,
                installPath: g.installPath || g.install_path,
                executable: g.executable,
                launchOptions: g.launch_options,
                rating: g.rating || 0,
                userNotes: g.user_notes || '',
                heroImage: g.background_url || g.cover_url,
                logo: g.logo_url
            }));

            set({ recommendations: mappedGames, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    loadCollections: async () => {
        try {
            const result = await window.ipcRenderer.invoke('collections:getAll');
            set({ collections: Array.isArray(result) ? result : [] });
        } catch (error) {
            console.error('Failed to load collections:', error);
            set({ collections: [] });
        }
    },

    createCollection: async (name: string, description?: string) => {
        try {
            const newCollection = await window.ipcRenderer.invoke('collections:create', name, description);
            set(state => ({ collections: [...state.collections, newCollection] }));
        } catch (error) {
            console.error('Failed to create collection:', error);
        }
    },

    deleteCollection: async (id: string) => {
        try {
            await window.ipcRenderer.invoke('collections:delete', id);
            set(state => ({ collections: state.collections.filter(c => c.id !== id) }));
        } catch (error) {
            console.error('Failed to delete collection:', error);
        }
    },

    addGameToCollection: async (collectionId: string, gameId: string) => {
        try {
            const success = await window.ipcRenderer.invoke('collections:addGame', collectionId, gameId);
            if (success) {
                set(state => ({
                    collections: state.collections.map(c =>
                        c.id === collectionId
                            ? { ...c, gameIds: [...c.gameIds, gameId] }
                            : c
                    )
                }));
            }
        } catch (error) {
            console.error('Failed to add game to collection:', error);
        }
    },

    removeGameFromCollection: async (collectionId: string, gameId: string) => {
        try {
            await window.ipcRenderer.invoke('collections:removeGame', collectionId, gameId);
            set(state => ({
                collections: state.collections.map(c =>
                    c.id === collectionId
                        ? { ...c, gameIds: c.gameIds.filter(id => id !== gameId) }
                        : c
                )
            }));
        } catch (error) {
            console.error('Failed to remove game from collection:', error);
        }
    },

    loadWeeklyActivity: async () => {
        try {
            const result = await window.ipcRenderer.invoke('games:getWeeklyActivity');
            set({ weeklyActivity: result });
        } catch (error) {
            console.error('Failed to load weekly activity:', error);
        }
    },

    loadAvgSessionDuration: async () => {
        try {
            const result = await window.ipcRenderer.invoke('games:getAverageSessionDuration');
            set({ avgSessionDuration: result });
        } catch (error) {
            console.error('Failed to load average session duration:', error);
        }
    },

    launchGame: async (gameId: string) => {
        try {
            await window.ipcRenderer.invoke('games:launch', gameId);
        } catch (error) {
            console.error('Failed to launch game:', error);
            // Optionally set error state
        }
    },

    openPlatform: async (platform: string) => {
        try {
            await window.ipcRenderer.invoke('games:openPlatform', platform);
        } catch (error) {
            console.error('Failed to open platform:', error);
        }
    },

    toggleFavorite: async (gameId: string, isFavorite: boolean) => {
        try {
            await window.ipcRenderer.invoke('games:toggleFavorite', gameId, isFavorite);
            // Optimistic update
            set(state => ({
                games: state.games.map(g =>
                    g.id === gameId ? { ...g, isFavorite } : g
                )
            }));
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            // Revert on error if needed
            get().loadGames();
        }
    },

    toggleHidden: async (gameId: string, isHidden: boolean) => {
        try {
            await window.ipcRenderer.invoke('games:toggleHidden', gameId, isHidden);
            set(state => ({
                games: state.games.map(g => g.id === gameId ? { ...g, isHidden } : g)
            }));
        } catch (error) {
            console.error('Failed to toggle hidden:', error);
        }
    },

    updateTags: async (gameId: string, tags: string[]) => {
        try {
            await window.ipcRenderer.invoke('games:updateTags', gameId, tags);
            set(state => ({
                games: state.games.map(g => g.id === gameId ? { ...g, tags } : g)
            }));
        } catch (error) {
            console.error('Failed to update tags:', error);
        }
    },

    updatePlayStatus: async (gameId: string, status: string) => {
        try {
            await window.ipcRenderer.invoke('games:updatePlayStatus', gameId, status);
            set(state => ({
                games: state.games.map(g => g.id === gameId ? { ...g, playStatus: status as any } : g)
            }));
        } catch (error) {
            console.error('Failed to update play status:', error);
        }
    },

    updateLaunchOptions: async (gameId: string, options: string) => {
        try {
            await window.ipcRenderer.invoke('games:updateLaunchOptions', gameId, options);
            set(state => ({
                games: state.games.map(g => g.id === gameId ? { ...g, launchOptions: options } : g)
            }));
        } catch (error) {
            console.error('Failed to update launch options:', error);
        }
    },

    updateRating: async (gameId: string, rating: number) => {
        try {
            await window.ipcRenderer.invoke('games:updateRating', gameId, rating);
            set(state => ({
                games: state.games.map(g => g.id === gameId ? { ...g, rating } : g)
            }));
        } catch (error) {
            console.error('Failed to update rating:', error);
        }
    },

    updateUserNotes: async (gameId: string, notes: string) => {
        try {
            await window.ipcRenderer.invoke('games:updateUserNotes', gameId, notes);
            set(state => ({
                games: state.games.map(g => g.id === gameId ? { ...g, userNotes: notes } : g)
            }));
        } catch (error) {
            console.error('Failed to update user notes:', error);
        }
    },

    updateGameDetails: async (gameId: string, updates: Partial<Game>) => {
        // Optimistic update
        set(state => ({
            games: state.games.map(g => g.id === gameId ? { ...g, ...updates } : g)
        }));
        try {
            await window.ipcRenderer.invoke('games:updateDetails', gameId, updates);
        } catch (error) {
            console.error('Failed to update game details:', error);
            // For now, let's just log error.
            get().loadGames();
        }
    },

    reorderGames: (activeId: string, overId: string) => {
        set(state => {
            const oldIndex = state.games.findIndex(g => g.id === activeId);
            const newIndex = state.games.findIndex(g => g.id === overId);

            if (oldIndex === -1 || newIndex === -1) return state;

            const newGames = [...state.games];
            const [movedGame] = newGames.splice(oldIndex, 1);
            newGames.splice(newIndex, 0, movedGame);

            return { games: newGames };
        });
    },

    saveGameOrder: async () => {
        const { games } = get();
        const gameIds = games.map(g => g.id);
        try {
            await window.ipcRenderer.invoke('games:updateOrder', gameIds);
        } catch (error) {
            console.error('Failed to save game order:', error);
        }
    },

    mergeGames: async (primaryId: string, secondaryId: string) => {
        try {
            await window.ipcRenderer.invoke('games:merge', primaryId, secondaryId);
            await get().loadGames(true);
        } catch (error) {
            console.error('Failed to merge games:', error);
        }
    },

    unmergeGame: async (gameId: string) => {
        try {
            await window.ipcRenderer.invoke('games:unmerge', gameId);
            await get().loadGames(true);
        } catch (error) {
            console.error('Failed to unmerge game:', error);
        }
    },

    // Friends & Achievements
    friends: [],
    achievements: [],

    loadFriends: async () => {
        try {
            const result = await window.ipcRenderer.invoke('friends:getAll');
            set({ friends: Array.isArray(result) ? result : [] });
        } catch (error) {
            console.error('Failed to load friends:', error);
            set({ friends: [] });
        }
    },

    importSteamFriends: async () => {
        try {
            const result = await window.ipcRenderer.invoke('friends:importSteam');
            set({ friends: Array.isArray(result) ? result : [] });
        } catch (error) {
            console.error('Failed to import Steam friends:', error);
        }
    },

    loadAchievements: async () => {
        try {
            const result = await window.ipcRenderer.invoke('achievements:getRecentlyUnlocked', 20);
            set({ achievements: Array.isArray(result) ? result : [] });
        } catch (error) {
            console.error('Failed to load achievements:', error);
            set({ achievements: [] });
        }
    },

    openExternal: async (url: string) => {
        try {
            await window.ipcRenderer.invoke('system:openExternal', url);
        } catch (error) {
            console.error('Failed to open external URL:', error);
        }
    }
}));
