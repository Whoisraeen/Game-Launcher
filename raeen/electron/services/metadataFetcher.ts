import axios from 'axios';

// You should technically move these to an environment variable or a secure backend proxy
// for a production app to avoid exposing keys. For a desktop app, it's trickier.
// Users might need to provide their own keys, or you proxy requests.
// For this demo, we'll use placeholders that the user needs to fill.
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID || 'YOUR_CLIENT_ID'; 
const IGDB_ACCESS_TOKEN = process.env.IGDB_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';

export interface GameMetadata {
    cover?: string;
    hero?: string;
    logo?: string;
    description?: string;
    releaseDate?: string;
    genres?: string[];
    developer?: string;
    publisher?: string;
    rating?: number;
    achievementsTotal?: number;
    videoUrl?: string;
}

export class MetadataFetcher {

    private async getIgdbHeaders() {
        // In a real app, manage token expiry and refreshing here
        return {
            'Client-ID': IGDB_CLIENT_ID,
            'Authorization': `Bearer ${IGDB_ACCESS_TOKEN}`,
            'Content-Type': 'text/plain' // IGDB uses raw body
        };
    }

    /**
     * Fetches metadata specifically for a Steam game using its AppID
     */
    async fetchSteamMetadata(appId: string): Promise<GameMetadata | null> {
        // 1. Try Steam first for asset exactness (cover/hero match the store exactly)
        try {
            const details = await this.getSteamAppDetails(parseInt(appId));
            if (details) {
                return {
                    cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
                    hero: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
                    logo: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/logo.png`,
                    genres: details.genres,
                    description: details.description,
                    releaseDate: details.releaseDate,
                    achievementsTotal: details.achievementsTotal,
                    videoUrl: details.videoUrl
                };
            }
        } catch (e) {
            console.warn('Steam metadata failed, falling back to IGDB...');
        }

        // 2. Fallback to IGDB if Steam fails
        // We don't have the title here easily unless passed, but normally we'd have it.
        // For now, return null as Steam ID specific fetch implies Steam source.
        return null;
    }

    /**
     * Fetches metadata for a game title using IGDB (Primary) then Steam (Fallback)
     */
    async fetchMetadata(title: string): Promise<GameMetadata | null> {
        console.log(`Fetching metadata for: ${title}`);

        // 1. Try IGDB
        try {
            const igdbData = await this.searchIgdb(title);
            if (igdbData) return igdbData;
        } catch (e) {
            console.error('IGDB fetch failed:', e);
        }

        // 2. Fallback to Steam Store Search
        try {
            const cleanTitle = title
                .replace(/^(The|A|An)\s+/i, '')
                .replace(/[^\w\s]/gi, ' ')
                .trim();
            const steamData = await this.searchSteam(cleanTitle);
            if (steamData) return steamData;
        } catch (e) {
            console.error('Steam search failed:', e);
        }

        return null;
    }

    async fetchGameNews(appId: string, count: number = 3): Promise<any[]> {
        // ... (Steam news logic remains same)
        try {
            const url = `http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=${count}&maxlength=300&format=json`;
            const response = await axios.get(url);

            if (response.data && response.data.appnews && response.data.appnews.newsitems) {
                return response.data.appnews.newsitems.map((item: any) => ({
                    gid: item.gid,
                    title: item.title,
                    url: item.url,
                    author: item.author,
                    contents: item.contents,
                    feedlabel: item.feedlabel,
                    date: item.date,
                    feedname: item.feedname,
                    appId: appId
                }));
            }
            return [];
        } catch (error) {
            console.error(`Error fetching news for ${appId}:`, error);
            return [];
        }
    }

    private async searchIgdb(query: string): Promise<GameMetadata | null> {
        if (IGDB_CLIENT_ID === 'YOUR_CLIENT_ID') return null; // Skip if not configured

        const headers = await this.getIgdbHeaders();
        
        // IGDB Query: Search by name, get cover, screenshots, rating, etc.
        const body = `
            search "${query}";
            fields name, summary, cover.url, artworks.url, rating, first_release_date, involved_companies.company.name, genres.name;
            limit 1;
        `;

        const response = await axios.post('https://api.igdb.com/v4/games', body, { headers });

        if (response.data && response.data.length > 0) {
            const game = response.data[0];
            
            // Process Image URLs (replace 't_thumb' with 't_cover_big' or 't_1080p')
            const coverUrl = game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : undefined;
            const heroUrl = game.artworks?.[0]?.url ? `https:${game.artworks[0].url.replace('t_thumb', 't_1080p')}` : undefined;

            return {
                cover: coverUrl,
                hero: heroUrl,
                description: game.summary,
                rating: game.rating ? game.rating / 20 : 0, // Scale 0-100 to 0-5
                releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000).toLocaleDateString() : undefined,
                genres: game.genres ? game.genres.map((g: any) => g.name) : [],
                developer: game.involved_companies?.[0]?.company?.name,
                // IGDB doesn't easily distinguish dev/pub in the flat fields without more logic, using first company as proxy
            };
        }
        return null;
    }

    private async searchSteam(query: string): Promise<GameMetadata | null> {
        try {
            const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`;
            const response = await axios.get(url);

            if (response.data && response.data.items && response.data.items.length > 0) {
                const item = response.data.items[0];
                const appId = item.id;
                const details = await this.getSteamAppDetails(appId);

                return {
                    cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
                    hero: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
                    logo: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/logo.png`,
                    genres: details?.genres,
                    description: details?.description,
                    releaseDate: details?.releaseDate,
                    achievementsTotal: details?.achievementsTotal,
                    videoUrl: details?.videoUrl
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    private async getSteamAppDetails(appId: number): Promise<{ genres?: string[], description?: string, releaseDate?: string, achievementsTotal?: number, videoUrl?: string } | null> {
        try {
            const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
            const response = await axios.get(url);

            if (response.data && response.data[appId] && response.data[appId].success) {
                const data = response.data[appId].data;
                const genres = data.genres ? data.genres.map((g: any) => g.description) : [];
                
                let videoUrl;
                if (data.movies && data.movies.length > 0) {
                    videoUrl = data.movies[0].mp4?.max || data.movies[0].mp4?.[480];
                }

                return {
                    genres,
                    description: data.short_description,
                    releaseDate: data.release_date?.date,
                    achievementsTotal: data.achievements?.total || 0,
                    videoUrl
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}