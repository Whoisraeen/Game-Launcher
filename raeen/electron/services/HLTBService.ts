import { HowLongToBeatService, HowLongToBeatEntry } from 'howlongtobeat';

export class HLTBService {
    private hltb: HowLongToBeatService;

    constructor() {
        this.hltb = new HowLongToBeatService();
    }

    async search(gameName: string): Promise<HowLongToBeatEntry | null> {
        try {
            // Sanitize game name (remove special chars, trademark symbols, etc for better hits)
            const cleanName = gameName
                .replace(/[^\w\s]/gi, '')
                .replace(/\s+/g, ' ')
                .trim();

            const results = await this.hltb.search(cleanName);
            
            if (results && results.length > 0) {
                // Sort by similarity to original name could be added here
                // For now, return the first result which is usually the best match
                return results[0];
            }
            return null;
        } catch (error) {
            console.error(`HLTB Search Error for ${gameName}:`, error);
            return null;
        }
    }
}
