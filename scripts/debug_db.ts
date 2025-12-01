
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Try to find the DB in common locations
const potentialPaths = [
    path.join(process.cwd(), 'userData', 'launcher.db'),
    path.join(process.cwd(), 'raeen', 'userData', 'launcher.db'),
    path.join('C:', 'Users', process.env.USERNAME || '', 'AppData', 'Roaming', 'raeen', 'launcher.db'), // Default electron appData
    path.join('C:', 'Users', process.env.USERNAME || '', 'AppData', 'Roaming', 'Electron', 'launcher.db') // Default electron appData if name not set
];

let dbPath = '';
for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
        dbPath = p;
        break;
    }
}

if (!dbPath) {
    console.error('Could not find launcher.db in any of these locations:');
    potentialPaths.forEach(p => console.log(` - ${p}`));
    process.exit(1);
}

console.log(`Opening DB at: ${dbPath}`);

try {
    const db = new Database(dbPath, { readonly: true });

    // 1. Count Games
    const count = db.prepare('SELECT COUNT(*) as c FROM games').get() as { c: number };
    console.log(`Total Games in DB: ${count.c}`);

    // 2. List Games (ID, Title, Platform, Installed)
    const games = db.prepare('SELECT id, title, platform, is_installed, install_path FROM games LIMIT 20').all() as any[];
    console.log('--- First 20 Games ---');
    games.forEach(g => {
        console.log(`[${g.platform}] ${g.title} (Installed: ${g.is_installed}) - ${g.install_path}`);
    });

    // 3. Check for duplicates
    const duplicates = db.prepare(`
        SELECT title, COUNT(*) as c 
        FROM games 
        GROUP BY title 
        HAVING c > 1
    `).all() as any[];
    
    if (duplicates.length > 0) {
        console.log('--- Duplicates Found ---');
        duplicates.forEach(d => console.log(`${d.title}: ${d.c} entries`));
    } else {
        console.log('No title duplicates found.');
    }

    // 4. Check Updates
    const updates = db.prepare('SELECT * FROM game_updates').all() as any[];
    console.log(`Total Updates Pending: ${updates.length}`);
    // Group updates by game name
    const updateMap = new Map<string, number>();
    updates.forEach(u => {
        const count = updateMap.get(u.gameName) || 0;
        updateMap.set(u.gameName, count + 1);
    });
    
    updateMap.forEach((count, name) => {
        console.log(`Update for ${name}: ${count} entries`);
    });

} catch (e) {
    console.error('Failed to read DB:', e);
}
