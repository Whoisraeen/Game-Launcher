import { GameManager } from './gameManager';
import { DriveScanner } from './DriveScanner';
import { initDatabase } from '../database';

async function verifySync() {
    console.log('--- Verifying Drive Scanner ---');
    const drives = DriveScanner.getDrives();
    console.log('Detected Drives:', drives);

    console.log('\n--- Verifying Library Sync ---');
    initDatabase(); // Initialize DB
    const gameManager = new GameManager();

    try {
        const games = await gameManager.syncLibrary();
        console.log('---------------------------------------------------');
        console.log(`Total Games Synced: ${games.length}`);
        console.log('---------------------------------------------------');

        const byPlatform: Record<string, number> = {};
        games.forEach((g: any) => {
            byPlatform[g.platform] = (byPlatform[g.platform] || 0) + 1;
        });

        console.log('Breakdown by Platform:');
        console.table(byPlatform);

        console.log('---------------------------------------------------');
        console.log('Sample Games (up to 3 per platform):');

        const platforms = [...new Set(games.map((g: any) => g.platform))];

        for (const p of platforms) {
            console.log(`\n--- ${String(p).toUpperCase()} ---`);
            const pGames = games.filter((g: any) => g.platform === p).slice(0, 3);
            pGames.forEach((g: any) => {
                console.log(`[${g.platform}] ${g.title}`);
                console.log(`   Path: ${g.install_path}`);
                console.log(`   Exe:  ${g.executable}`);
            });
        }
        console.log('---------------------------------------------------');

    } catch (e) {
        console.error('Sync verification failed:', e);
    }
}

verifySync();
