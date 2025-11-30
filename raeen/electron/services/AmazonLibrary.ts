import fs from 'fs';
import path from 'path';
import { DriveScanner } from './DriveScanner';

export interface AmazonGame {
    id: string;
    title: string;
    installPath: string;
    executable?: string;
}

export class AmazonLibrary {

    async getInstalledGames(): Promise<AmazonGame[]> {
        const games: AmazonGame[] = [];
        // Amazon Games stores metadata in a SQLite DB usually:
        // %LOCALAPPDATA%\Amazon Games\Data\Games\Sql\GameInstallInfo.sqlite
        // But we can also just scan the default library folder if we can find it.
        // Default is often `C:\Amazon Games\Library`.
        
        const libraryPaths = await this.getLibraryPaths();

        for (const libPath of libraryPaths) {
            if (!fs.existsSync(libPath)) continue;

            try {
                const folders = fs.readdirSync(libPath);
                for (const folder of folders) {
                    const gamePath = path.join(libPath, folder);
                    const stat = fs.statSync(gamePath);
                    
                    if (stat.isDirectory()) {
                        // Look for a .exe
                        const exe = this.findExecutable(gamePath);
                        if (exe) {
                            games.push({
                                id: `amazon:${folder}`,
                                title: folder,
                                installPath: gamePath,
                                executable: exe
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Error scanning Amazon Games library:', libPath, e);
            }
        }

        return games;
    }

    private async getLibraryPaths(): Promise<string[]> {
        const paths: string[] = [];
        
        // Check standard C: location
        paths.push('C:\Amazon Games\Library');

        // Check other drives
        const drives = DriveScanner.getDrives();
        for (const drive of drives) {
            paths.push(path.join(drive, 'Amazon Games', 'Library'));
        }

        return paths;
    }

    private findExecutable(dirPath: string): string | undefined {
        try {
            const files = fs.readdirSync(dirPath);
            const exes = files.filter(f => f.endsWith('.exe') && !f.includes('Uninstall'));
            if (exes.length > 0) return exes[0]; // Naive pick
        } catch { }
        return undefined;
    }

    getLaunchCommand(_gameId: string): string {
        // Amazon Games protocol: amazon-games://play/{productId}
        // But we don't have ProductID easily from folder scan.
        // So we rely on direct executable launch.
        return '';
    }
}
