import axios from 'axios';

export interface GameMetadata {
    cover?: string;
    hero?: string;
    logo?: string;
    description?: string;
    releaseDate?: string;
    genres?: string[];
    achievementsTotal?: number;
}

export class MetadataFetcher {

    /**
     * Fetches metadata specifically for a Steam game using its AppID
     */
    async fetchSteamMetadata(appId: string): Promise<GameMetadata | null> {
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
                    achievementsTotal: details.achievementsTotal
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching Steam metadata for ${appId}:`, error);
            return null;
        }
    }

    /**
     * Fetches metadata for a game title using public APIs (Steam Store Search as primary)
     */
    async fetchMetadata(title: string): Promise<GameMetadata | null> {
        try {
            // Clean title for better search results
            const cleanTitle = title
                .replace(/^(The|A|An)\s+/i, '') // Remove articles
                .replace(/[^\w\s]/gi, ' ')      // Replace special chars with spaces
                .replace(/\s+/g, ' ')           // Collapse spaces
                .trim();

            console.log(`Fetching metadata for: ${title} (cleaned: ${cleanTitle})`);

            // Try Steam Store Search first (free, no key required)
            const steamData = await this.searchSteam(cleanTitle);
            if (steamData) return steamData;

            // TODO: Add IGDB or other sources here as fallback

            return null;
        } catch (error) {
            console.error(`Error fetching metadata for ${title}:`, error);
            return null;
        }
    }

    async fetchGameNews(appId: string, count: number = 3): Promise<any[]> {
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
                    date: item.date, // Unix timestamp
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

    private async searchSteam(query: string): Promise<GameMetadata | null> {
        try {
            const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`;
            const response = await axios.get(url);

            if (response.data && response.data.items && response.data.items.length > 0) {
                const item = response.data.items[0]; // Take first result
                const appId = item.id;

                // Get detailed info for genres
                const details = await this.getSteamAppDetails(appId);

                return {
                    cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
                    hero: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
                    logo: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/logo.png`,
                    genres: details?.genres,
                    description: details?.description,
                    releaseDate: details?.releaseDate,
                    achievementsTotal: details?.achievementsTotal
                };
            }
            return null;
        } catch (error) {
            // console.warn('Steam search failed:', error);
            return null;
        }
    }

    private async getSteamAppDetails(appId: number): Promise<{ genres?: string[], description?: string, releaseDate?: string, achievementsTotal?: number } | null> {
        try {
            const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
            const response = await axios.get(url);

            if (response.data && response.data[appId] && response.data[appId].success) {
                const data = response.data[appId].data;
                const genres = data.genres ? data.genres.map((g: any) => g.description) : [];
                return {
                    genres,
                    description: data.short_description,
                    releaseDate: data.release_date?.date,
                    achievementsTotal: data.achievements?.total || 0
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}
