import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Supported extensions for scanning
const EXTENSIONS = [
    '.exe', '.lnk', '.url', // Windows
    '.iso', '.bin', '.cue', '.nes', '.snes', '.gba', '.gbc', '.n64', '.z64', '.v64', // Emulation
    '.chd', '.gcz', '.wbfs', '.rvz', '.ciso' // More Emulation
];

export class ManualGameService {
    
    /**
     * Recursive folder scanner
     */
    async scanFolder(folderPath: string): Promise<any[]> {
        if (!fs.existsSync(folderPath)) return [];

        const foundGames: any[] = [];
        
        // Recursive walk function
        const walk = (dir: string) => {
            const list = fs.readdirSync(dir);
            for (const file of list) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat && stat.isDirectory()) {
                    // Skip common junk folders
                    if (!['node_modules', '.git', 'Windows', 'Program Files', 'Program Files (x86)'].includes(file)) {
                        walk(filePath);
                    }
                } else {
                    // Check extension
                    const ext = path.extname(file).toLowerCase();
                    if (EXTENSIONS.includes(ext)) {
                        foundGames.push({
                            title: path.basename(file, ext), // File name as title
                            installPath: dir,
                            executable: file,
                            platform: 'manual'
                        });
                    }
                }
            }
        };

        try {
            walk(folderPath);
        } catch (e) {
            console.error('Scan failed:', e);
        }

        return foundGames;
    }

    async addGame(title: string, installPath: string, executable: string, platform: string = 'manual') {
        const db = getDb();
        const id = uuidv4();
        const fullPath = path.join(installPath, executable);

        if (!fs.existsSync(fullPath)) {
            throw new Error('Executable not found');
        }

        db.prepare(`
            INSERT INTO games (id, title, platform, platform_id, install_path, executable, added_at, is_installed)
            VALUES (@id, @title, @platform, @platformId, @installPath, @executable, @addedAt, 1)
        `).run({
            id,
            title,
            platform,
            platformId: id, // Use UUID as platform ID for manual games
            installPath,
            executable,
            addedAt: Date.now()
        });

        return id;
    }

    getGames(): any[] {
        const db = getDb();
        try {
            return db.prepare("SELECT * FROM games WHERE platform = 'manual'").all();
        } catch (e) {
            console.error('Failed to fetch manual games:', e);
            return [];
        }
    }
}