
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
