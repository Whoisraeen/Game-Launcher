import { create } from 'zustand';

export interface NewsItem {
    gid: string;
    title: string;
    url: string;
    author: string;
    contents: string;
    feedlabel: string;
    date: number;
    feedname: string;
    appId: string;
    gameTitle?: string;
    gameIcon?: string;
}

interface NewsState {
    news: NewsItem[];
    globalNews: NewsItem[];
    isLoading: boolean;
    error: string | null;
    loadNews: () => Promise<void>;
    loadGlobalNews: () => Promise<void>;
}

export const useNewsStore = create<NewsState>((set) => ({
    news: [],
    globalNews: [],
    isLoading: false,
    error: null,

    loadNews: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await window.ipcRenderer.invoke('games:getNews');
            set({ news: result, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    loadGlobalNews: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await window.ipcRenderer.invoke('news:getGlobal');
            set({ globalNews: result, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    }
}));
