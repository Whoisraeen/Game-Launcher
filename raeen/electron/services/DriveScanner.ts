import fs from 'fs';
import path from 'path';
import si from 'systeminformation';
import { getDb } from '../database';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface DriveInfo {
    letter: string;
    label: string;
    totalGb: number;
    freeGb: number;
    usedGb: number;
    usePercent: number;
    type: 'SSD' | 'HDD' | 'NVMe' | 'Unknown';
    fs: string;
}

export class DriveScanner {
    /**
     * Returns a list of available drive letters (e.g., ['C:\\', 'D:\\', 'E:\\'])
     */
    static getDrives(): string[] {
        const drives: string[] = [];
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        for (let i = 0; i < letters.length; i++) {
            const drive = `${letters[i]}:\\`;
            try {
                if (fs.existsSync(drive)) {
                    drives.push(drive);
                }
            } catch (e) {
                // Ignore drives that throw errors
            }
        }

        return drives;
    }

    static async getDrivesDetailed(): Promise<DriveInfo[]> {
        try {
            const [diskLayout, fsSize, blockDevices] = await Promise.all([
                si.diskLayout(),
                si.fsSize(),
                si.blockDevices(),
            ]);

            const driveTypeMap = new Map<string, 'SSD' | 'HDD' | 'NVMe' | 'Unknown'>();
            for (const disk of diskLayout) {
                const name = (disk.name || '').toLowerCase();
                let dtype: 'SSD' | 'HDD' | 'NVMe' | 'Unknown' = 'Unknown';
                if (disk.type === 'NVMe' || name.includes('nvme')) dtype = 'NVMe';
                else if (disk.type === 'SSD' || name.includes('ssd')) dtype = 'SSD';
                else if (disk.type === 'HD' || name.includes('hdd')) dtype = 'HDD';
                driveTypeMap.set(disk.device, dtype);
            }

            const drives: DriveInfo[] = [];

            for (const fs_ of fsSize) {
                if (!fs_.fs || fs_.size === 0) continue;
                const letter = fs_.mount?.charAt(0)?.toUpperCase();
                if (!letter || !/[A-Z]/.test(letter)) continue;

                const matchingBlock = blockDevices.find(b =>
                    b.mount === fs_.mount || b.label === fs_.mount
                );
                let type: 'SSD' | 'HDD' | 'NVMe' | 'Unknown' = 'Unknown';
                if (matchingBlock?.physical) {
                    const phys = matchingBlock.physical.toLowerCase();
                    if (phys.includes('nvme')) type = 'NVMe';
                    else if (phys.includes('ssd') || phys === 'ssd') type = 'SSD';
                    else if (phys.includes('hdd') || phys === 'hd') type = 'HDD';
                }
                if (type === 'Unknown') {
                    for (const [, dtype] of driveTypeMap) {
                        if (dtype !== 'Unknown') { type = dtype; break; }
                    }
                }

                drives.push({
                    letter: `${letter}:\\`,
                    label: matchingBlock?.label || fs_.fs,
                    totalGb: Math.round((fs_.size / (1024 ** 3)) * 10) / 10,
                    freeGb: Math.round(((fs_.size - fs_.used) / (1024 ** 3)) * 10) / 10,
                    usedGb: Math.round((fs_.used / (1024 ** 3)) * 10) / 10,
                    usePercent: Math.round(fs_.use),
                    type,
                    fs: fs_.type || 'NTFS',
                });
            }

            return drives;
        } catch (error) {
            console.error('Failed to get detailed drives:', error);
            const basic = DriveScanner.getDrives();
            return basic.map(d => ({
                letter: d,
                label: d,
                totalGb: 0,
                freeGb: 0,
                usedGb: 0,
                usePercent: 0,
                type: 'Unknown' as const,
                fs: 'NTFS',
            }));
        }
    }

    static async getGameSizes(): Promise<{ gameId: string; title: string; installPath: string; sizeBytes: number }[]> {
        try {
            const db = getDb();
            const games = db.prepare('SELECT id, title, install_path FROM games WHERE install_path IS NOT NULL').all() as any[];
            const results: { gameId: string; title: string; installPath: string; sizeBytes: number }[] = [];

            for (const game of games) {
                if (!game.install_path || !fs.existsSync(game.install_path)) continue;
                try {
                    const size = await DriveScanner.getFolderSize(game.install_path);
                    results.push({
                        gameId: game.id,
                        title: game.title,
                        installPath: game.install_path,
                        sizeBytes: size,
                    });
                } catch {
                    // skip inaccessible
                }
            }

            return results.sort((a, b) => b.sizeBytes - a.sizeBytes);
        } catch (error) {
            console.error('Failed to get game sizes:', error);
            return [];
        }
    }

    static async getFolderSize(dirPath: string): Promise<number> {
        let totalSize = 0;
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    totalSize += await DriveScanner.getFolderSize(fullPath);
                } else {
                    try {
                        const stat = fs.statSync(fullPath);
                        totalSize += stat.size;
                    } catch {
                        // skip
                    }
                }
            }
        } catch {
            // skip inaccessible dirs
        }
        return totalSize;
    }

    static async moveGame(gameId: string, targetDrive: string): Promise<{ success: boolean; newPath?: string; error?: string }> {
        try {
            const db = getDb();
            const game = db.prepare('SELECT id, title, install_path FROM games WHERE id = ?').get(gameId) as any;
            if (!game || !game.install_path) {
                return { success: false, error: 'Game not found or no install path' };
            }

            const srcPath = game.install_path;
            if (!fs.existsSync(srcPath)) {
                return { success: false, error: 'Source path does not exist' };
            }

            const gameFolderName = path.basename(srcPath);
            const destPath = path.join(targetDrive, 'Games', gameFolderName);

            if (fs.existsSync(destPath)) {
                return { success: false, error: 'Destination folder already exists' };
            }

            const destParent = path.dirname(destPath);
            if (!fs.existsSync(destParent)) {
                fs.mkdirSync(destParent, { recursive: true });
            }

            await execAsync(`robocopy "${srcPath}" "${destPath}" /E /MOVE /R:1 /W:1`, { timeout: 600000 });

            db.prepare('UPDATE games SET install_path = ? WHERE id = ?').run(destPath, gameId);

            return { success: true, newPath: destPath };
        } catch (error: any) {
            if (error?.status === 1 || error?.code === 1) {
                // robocopy exit code 1 = success with files copied
                try {
                    const db = getDb();
                    const game = db.prepare('SELECT install_path FROM games WHERE id = ?').get(gameId) as any;
                    const gameFolderName = path.basename(game.install_path);
                    const destPath = path.join(targetDrive, 'Games', gameFolderName);
                    db.prepare('UPDATE games SET install_path = ? WHERE id = ?').run(destPath, gameId);
                    return { success: true, newPath: destPath };
                } catch {
                    // fallthrough
                }
            }
            console.error('Failed to move game:', error);
            return { success: false, error: String(error?.message || error) };
        }
    }
}
