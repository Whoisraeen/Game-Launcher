import { Game, UserProfile, Friend, RecentAchievement } from '../types';

// --- DATA STORE ---

export const CURRENT_USER: UserProfile = {
    username: "DriftKing_99",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    status: "online",
    currentActivity: "Elden Ring"
};

export const FRIENDS_LIST: Friend[] = [
    { id: '1', username: "Sarah_G", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", status: "playing", activity: "Halo Infinite" },
    { id: '2', username: "Mike_T", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike", status: "playing", activity: "Spider-Man 2" },
    { id: '3', username: "Alex_R", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", status: "online" },
    { id: '4', username: "Jessica_W", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica", status: "online" },
    { id: '5', username: "Offline_User_1", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1", status: "offline", lastSeen: "2h ago" },
    { id: '6', username: "Offline_User_2", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2", status: "offline", lastSeen: "5h ago" },
    { id: '7', username: "Offline_User_3", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3", status: "offline", lastSeen: "1d ago" },
];

export const RECENT_ACHIEVEMENTS: RecentAchievement[] = [
    { id: '1', gameTitle: "Halo Infinite", achievementTitle: "Legendary", user: "Sarah_G", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=Halo", unlockDate: new Date() },
    { id: '2', gameTitle: "Spider-Man 2", achievementTitle: "Amazing", user: "Mike_T", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=Spidey", unlockDate: new Date() },
    { id: '3', gameTitle: "Elden Ring", achievementTitle: "Elden Lord", user: "DriftKing_99", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=Elden", unlockDate: new Date() }
];

export const GAMES_LIBRARY: Game[] = [
    {
        id: 'elden-ring',
        title: 'Elden Ring',
        cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/library_600x900.jpg',
        heroImage: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/library_hero.jpg',
        logo: 'https://cdn2.steamgriddb.com/file/sgdb-cdn/logo/7f65476a0d4377926c0430a6d0b64267.png',
        platform: 'steam',
        status: 'installed',
        lastPlayed: new Date('2023-11-26T10:30:00'),
        playtime: 145.5,
        achievements: { unlocked: 32, total: 42 },
        tags: ['RPG', 'Open World', 'Souls-like', 'Dark Fantasy'],
        genre: 'RPG'
    },
    {
        id: 'starfield',
        title: 'Starfield',
        cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1716740/library_600x900.jpg',
        heroImage: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1716740/library_hero.jpg',
        platform: 'xbox',
        status: 'installed',
        lastPlayed: new Date('2023-11-25T20:00:00'),
        playtime: 42.0,
        tags: ['RPG', 'Space', 'Exploration', 'Sci-Fi'],
        genre: 'RPG'
    },
    {
        id: 'cyberpunk-2077',
        title: 'Cyberpunk 2077',
        cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900.jpg',
        platform: 'gog',
        status: 'installed',
        playtime: 89.2,
        tags: ['RPG', 'Cyberpunk', 'FPS', 'Open World'],
        genre: 'RPG'
    },
    {
        id: 'baldurs-gate-3',
        title: "Baldur's Gate 3",
        cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/library_600x900.jpg',
        platform: 'gog',
        status: 'not_installed',
        playtime: 12.5,
        tags: ['RPG', 'Strategy', 'Co-op', 'Story Rich'],
        genre: 'RPG'
    },
    {
        id: 'hades-2',
        title: 'Hades II',
        cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145350/library_600x900.jpg',
        platform: 'epic',
        status: 'installed',
        playtime: 5.0,
        tags: ['Roguelike', 'Action', 'Indie'],
        genre: 'Roguelike'
    },
    {
        id: 'valorant',
        title: 'Valorant',
        cover: 'https://cdn1.epicgames.com/offer/cbd5b3d310a54b12bf3fe8c41994174f/EGS_VALORANT_RiotGames_S2_1200x1600-9ebf575033287e2177106da5ff4542d4',
        platform: 'riot',
        status: 'installed',
        playtime: 340.0,
        tags: ['FPS', 'Competitive', 'Multiplayer'],
        genre: 'FPS'
    },
    {
        id: 'minecraft',
        title: 'Minecraft',
        cover: 'https://upload.wikimedia.org/wikipedia/en/5/51/Minecraft_cover.png',
        platform: 'xbox',
        status: 'installed',
        playtime: 1250.5,
        tags: ['Sandbox', 'Survival', 'Building'],
        genre: 'Sandbox'
    },
    {
        id: 'apex-legends',
        title: 'Apex Legends',
        cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172470/library_600x900.jpg',
        platform: 'steam',
        status: 'updating',
        playtime: 600.2,
        tags: ['FPS', 'Battle Royale', 'Multiplayer'],
        genre: 'FPS'
    },
    {
        id: 'witcher-3',
        title: 'The Witcher 3: Wild Hunt',
        cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/library_600x900.jpg',
        platform: 'steam',
        status: 'installed',
        playtime: 205.0,
        tags: ['RPG', 'Open World', 'Fantasy'],
        genre: 'RPG'
    }
];

// --- HELPER FUNCTIONS (The "Backend" Logic) ---

export const getLastPlayedGame = (): Game => {
    // Sort by lastPlayed date descending
    const played = GAMES_LIBRARY.filter(g => g.lastPlayed);
    played.sort((a, b) => (b.lastPlayed?.getTime() || 0) - (a.lastPlayed?.getTime() || 0));
    return played[0] || GAMES_LIBRARY[0];
};

export const getPlayNextRecommendations = (): { game: Game, reason: string }[] => {
    // This logic mimics the "Smart Features" from the doc
    const recommendations: { game: Game, reason: string }[] = [];

    // 1. "Based on your Roguelike history" (Example: Hades II)
    const hades = GAMES_LIBRARY.find(g => g.id === 'hades-2');
    if (hades) recommendations.push({ game: hades, reason: "Based on your Roguelike history" });

    // 2. "Friends are playing" (Example: Baldur's Gate 3)
    const bg3 = GAMES_LIBRARY.find(g => g.id === 'baldurs-gate-3');
    if (bg3) recommendations.push({ game: bg3, reason: "Friends are playing right now" });

    // 3. "Finish your backlog" (Example: Cyberpunk 2077)
    const cp2077 = GAMES_LIBRARY.find(g => g.id === 'cyberpunk-2077');
    if (cp2077) recommendations.push({ game: cp2077, reason: "Finish your backlog" });

    return recommendations;
};

export const getPlatformIcon = (platform: string): string => {
    switch (platform) {
        case 'steam': return 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg';
        case 'xbox': return 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Xbox_one_logo.svg';
        case 'psn': return 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg';
        case 'epic': return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Epic_Games_white_logo.svg/1200px-Epic_Games_white_logo.svg.png';
        case 'gog': return 'https://upload.wikimedia.org/wikipedia/commons/5/5a/GOG_Galaxy_2.0_logo.svg';
        case 'riot': return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Riot_Games_logo.svg/1200px-Riot_Games_logo.svg.png'; // Placeholder
        case 'battlenet': return 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Battle.net_Icon.svg';
        default: return 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg';
    }
};

export const getPlatformName = (platform: string): string => {
    switch (platform) {
        case 'steam': return 'Steam';
        case 'xbox': return 'Xbox';
        case 'psn': return 'PlayStation';
        case 'epic': return 'Epic Games';
        case 'gog': return 'GOG Galaxy';
        case 'riot': return 'Riot Client';
        case 'battlenet': return 'Battle.net';
        default: return 'Launcher';
    }
};

export const launchGame = (game: Game) => {
    console.log(`Launching ${game.title} on ${game.platform}...`);
    // In a real electron app, this would use child_process or shell.openExternal
    // For this web prototype, we'll try custom protocols where possible or fallback to store pages

    switch (game.platform) {
        case 'steam':
            window.location.href = `steam://run/${game.id}`;
            break;
        case 'xbox':
            // Xbox app deep linking is complex, usually relies on PackageFamilyName
            window.open(`https://www.xbox.com/games/store/${game.title.replace(/\s+/g, '-').toLowerCase()}/${game.id}`, '_blank');
            break;
        case 'epic':
            // Epic usually needs a specific catalog ID, but we'll try a generic launcher open
            window.location.href = `com.epicgames.launcher://apps/${game.id}?action=launch&silent=true`;
            break;
        default:
            alert(`Launching ${game.title} on ${getPlatformName(game.platform)}`);
    }
};

export const getFriendsList = (): Friend[] => {
    return FRIENDS_LIST;
};

export const getLibraryStats = () => {
    let totalPlaytime = 0;
    let totalAchievements = 0;
    const genreCounts: { [key: string]: number } = {};

    GAMES_LIBRARY.forEach(game => {
        totalPlaytime += game.playtime;
        if (game.achievements) {
            totalAchievements += game.achievements.unlocked;
        }
        if (game.genre) {
            genreCounts[game.genre] = (genreCounts[game.genre] || 0) + 1;
        }
    });

    const genreDistribution = Object.keys(genreCounts).map(genre => ({
        name: genre,
        value: genreCounts[genre]
    }));

    return {
        totalPlaytime: Math.round(totalPlaytime),
        totalAchievements,
        genreDistribution
    };
};

export const getRecentAchievements = (): RecentAchievement[] => {
    return RECENT_ACHIEVEMENTS;
};
