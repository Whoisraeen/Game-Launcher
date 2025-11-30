export interface Game {
    id: string;
    title: string;
    cover?: string;
    heroImage?: string; // Large background for Hero section
    backgroundVideo?: string; // Path to .webm/.mp4 background video
    logo?: string; // Transparent logo for Hero section
    platform: 'steam' | 'xbox' | 'psn' | 'epic' | 'gog' | 'riot' | 'battlenet' | 'origin' | 'uplay' | 'other';
    platformId?: string;
    status: 'installed' | 'not_installed' | 'updating';
    playStatus?: 'playing' | 'backlog' | 'completed' | 'dropped' | 'none';
    lastPlayed?: Date;
    addedAt?: Date;
    playtime: number; // in hours
    isFavorite?: boolean;
    isHidden?: boolean;
    achievements?: {
        unlocked: number;
        total: number;
    };
    tags: string[];
    description?: string;
    genre?: string;
    developer?: string;
    installPath?: string;
    executable?: string;
    launchOptions?: string;
    rating?: number;
    userNotes?: string;
    mood?: string;
    multiplayer?: {
        local: boolean;
        online: boolean;
        coop: boolean;
    };
    group_id?: string;
}

export interface Collection {
    id: string;
    name: string;
    description?: string;
    gameIds: string[];
    isDynamic?: boolean;
    filterCriteria?: string;
}

export interface UserProfile {
    username: string;
    avatar: string;
    status: 'online' | 'offline' | 'playing' | 'away';
    currentActivity?: string;
}

export interface Friend {
    id: string;
    username: string;
    avatar: string;
    status: 'online' | 'offline' | 'playing' | 'away' | 'busy';
    activity?: string;
    lastSeen?: string; // For offline users
    platform?: string;
}

export interface PlayNextRecommendation {
    gameId: string;
    reason: string; // "Based on your Roguelike history", "Friends are playing", etc.
    icon: string; // Platform icon URL or similar
}

export interface RecentAchievement {
    id: string;
    gameTitle: string;
    achievementTitle: string;
    user: string;
    icon: string;
    unlockDate: Date;
}

export interface SystemStats {
    cpu: {
        usage: number;
        temp: number;
        speed: number;
        cores: number;
        model: string;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        percentage: number;
    };
    gpu: {
        model: string;
        usage: number;
        temp: number;
        vram: number;
    }[];
    disk: {
        fs: string;
        size: number;
        used: number;
        use: number;
    }[];
}
