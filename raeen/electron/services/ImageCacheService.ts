import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import axios from 'axios';
import crypto from 'crypto';

export class ImageCacheService {
    private cachePath: string;

    constructor() {
        const userDataPath = (app && app.getPath) ? app.getPath('userData') : '.';
        this.cachePath = path.join(userDataPath, 'image_cache');
        if (!fs.existsSync(this.cachePath)) {
            fs.mkdirSync(this.cachePath, { recursive: true });
        }
    }

    /**
     * Downloads an image from a URL and saves it locally.
     * Returns the local file path (protocol formatted for Electron).
     */
    async cacheImage(url: string, gameId: string, type: 'cover' | 'hero' | 'icon' | 'logo'): Promise<string | null> {
        if (!url) return null;

        try {
            // Generate a unique filename based on URL hash to avoid duplicates
            const hash = crypto.createHash('md5').update(url).digest('hex');
            const ext = path.extname(url).split('?')[0] || '.jpg'; // Default to jpg if no extension
            const filename = `${gameId}_${type}_${hash}${ext}`;
            const filePath = path.join(this.cachePath, filename);

            // If file already exists, return it immediately
            if (fs.existsSync(filePath)) {
                return `file://${filePath}`;
            }

            console.log(`Downloading image: ${url} -> ${filename}`);

            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(`file://${filePath}`));
                writer.on('error', reject);
            });

        } catch (error) {
            console.error(`Failed to cache image (${type}) for game ${gameId}:`, error);
            return url; // Fallback to original URL if download fails
        }
    }

    /**
     * Checks if a local image exists for a game.
     */
    getLocalImagePath(gameId: string, type: 'cover' | 'hero'): string | null {
        // This is tricky because of the hash. 
        // We might need to store the local path in the DB instead of just checking existence.
        // For now, this service relies on the caller storing the returned path.
        return null;
    }
}