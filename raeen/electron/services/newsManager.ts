import axios from 'axios';

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
}

export class NewsManager {
    // RSS Feeds for Global News
    private feeds = [
        { name: 'IGN', url: 'http://feeds.ign.com/ign/news' },
        { name: 'PCGamer', url: 'https://www.pcgamer.com/rss/' },
        { name: 'GameSpot', url: 'https://www.gamespot.com/feeds/news/' },
        { name: 'Eurogamer', url: 'https://www.eurogamer.net/?format=rss' },
        { name: 'Kotaku', url: 'https://kotaku.com/rss' }
    ];

    async getGlobalNews(): Promise<NewsItem[]> {
        const allNews: NewsItem[] = [];

        // Fetch in parallel
        const promises = this.feeds.map(async (feed) => {
            try {
                const response = await axios.get(feed.url, { timeout: 5000 });
                const xml = response.data;
                const items = this.parseRSS(xml, feed.name);
                allNews.push(...items);
            } catch (error) {
                console.error(`Failed to fetch news from ${feed.name}:`, error);
            }
        });

        await Promise.all(promises);

        // Sort by date descending
        return allNews.sort((a, b) => b.date - a.date);
    }

    private parseRSS(xml: string, sourceName: string): NewsItem[] {
        const items: NewsItem[] = [];
        // Simple regex-based parsing (robust enough for standard RSS)
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xml)) !== null) {
            const itemContent = match[1];
            
            const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(itemContent);
            const linkMatch = /<link>(.*?)<\/link>/.exec(itemContent);
            const dateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemContent);
            const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/.exec(itemContent);
            const guidMatch = /<guid.*?>([\s\S]*?)<\/guid>/.exec(itemContent);

            const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : 'No Title';
            const link = linkMatch ? linkMatch[1] : '';
            const pubDate = dateMatch ? new Date(dateMatch[1]).getTime() : Date.now();
            const description = descMatch ? (descMatch[1] || descMatch[2]) : '';
            const guid = guidMatch ? guidMatch[1] : link;

            // Basic HTML Entity decoding if needed (axios usually returns raw text)
            // For now, we trust the source XML structure

            items.push({
                gid: guid,
                title: this.cleanText(title),
                url: link,
                author: sourceName,
                contents: description, // Keep HTML for now, frontend strips it for preview
                feedlabel: 'Global News',
                date: Math.floor(pubDate / 1000), // Unix timestamp in seconds
                feedname: sourceName,
                appId: '0'
            });
        }

        return items;
    }

    private cleanText(text: string): string {
        return text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    }
}
