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

    // BUG-069: handle both RSS <item> and Atom <entry>, namespaced tags
    // (content:encoded, dc:date), and multi-line CDATA. Each item is matched
    // by a depth-aware extraction so siblings don't cross-contaminate.
    private parseRSS(xml: string, sourceName: string): NewsItem[] {
        const items: NewsItem[] = [];
        // Match either <item>...</item> (RSS 2) or <entry>...</entry> (Atom).
        const blockRegex = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/g;
        let match: RegExpExecArray | null;

        while ((match = blockRegex.exec(xml)) !== null) {
            const isAtom = match[1] === 'entry';
            const inner = match[2];

            const title = this.extractTag(inner, ['title']);
            // RSS uses <link>url</link>, Atom uses <link href="url"/>.
            let link = this.extractTag(inner, ['link']);
            if (!link && isAtom) {
                const linkAttrMatch = /<link[^>]*\bhref\s*=\s*"([^"]+)"/i.exec(inner);
                if (linkAttrMatch) link = linkAttrMatch[1];
            }
            const pubDateRaw =
                this.extractTag(inner, ['pubDate', 'updated', 'published', 'dc:date']) || '';
            const description =
                this.extractTag(inner, ['content:encoded', 'description', 'summary', 'content']) || '';
            const guid = this.extractTag(inner, ['guid', 'id']) || link;

            const ts = pubDateRaw ? new Date(pubDateRaw).getTime() : NaN;
            const pubDate = Number.isFinite(ts) ? ts : Date.now();

            items.push({
                gid: guid || `${sourceName}_${pubDate}`,
                title: this.cleanText(title || 'No Title'),
                url: link || '',
                author: sourceName,
                contents: description,
                feedlabel: 'Global News',
                date: Math.floor(pubDate / 1000),
                feedname: sourceName,
                appId: '0'
            });
        }

        return items;
    }

    // Pulls the text content of the first matching tag, handling CDATA and
    // namespaced names (escapes the colon for the regex).
    private extractTag(xml: string, names: string[]): string {
        for (const raw of names) {
            const safe = raw.replace(/:/g, '\\:');
            // Capture either CDATA or plain text, allowing tag attributes.
            const re = new RegExp(`<${safe}\\b[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${safe}>`, 'i');
            const m = re.exec(xml);
            if (m) return (m[1] !== undefined ? m[1] : m[2] || '').trim();
        }
        return '';
    }

    private cleanText(text: string): string {
        // BUG-069: strip stray CDATA wrappers and decode common entities.
        return text
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    }
}
