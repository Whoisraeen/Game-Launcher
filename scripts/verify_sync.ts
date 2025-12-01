
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

async function findSteamPath(): Promise<string | null> {
    const commonPaths = [
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam',
    ];

    for (const p of commonPaths) {
        if (fs.existsSync(p)) {
            console.log(`Found Steam at common path: ${p}`);
            return p;
        }
    }

    try {
        console.log('Checking registry for Steam path...');
        const { stdout } = await execAsync('reg query "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v "InstallPath"');
        const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
            const p = match[1].trim();
            console.log(`Found Steam in registry: ${p}`);
            return p;
        }
    } catch (e) {
        console.log('Registry check failed or empty.');
    }

    return null;
}

// Simple VDF parser for libraryfolders.vdf
function parseVdf(content: string): any {
    // Very naive parser, but sufficient for standard libraryfolders.vdf
    // We look for "path" "..." entries
    const paths: string[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
        const match = line.match(/"path"\s+"(.+?)"/);
        if (match && match[1]) {
            // VDF paths often have double backslashes escaped
            let p = match[1].replace(/\\\\/g, '\\');
            paths.push(p);
        }
    }
    return paths;
}

async function main() {
    console.log('--- Starting Standalone Steam Scan ---');
    
    const steamPath = await findSteamPath();
    if (!steamPath) {
        console.error('Could not find Steam installation.');
        return;
    }

    const libraryFolders = new Set<string>();
    libraryFolders.add(steamPath);

    const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
    if (fs.existsSync(vdfPath)) {
        console.log(`Reading VDF: ${vdfPath}`);
        const content = fs.readFileSync(vdfPath, 'utf-8');
        const paths = parseVdf(content);
        paths.forEach(p => libraryFolders.add(p));
    } else {
        console.warn(`VDF file not found at ${vdfPath}`);
    }

    console.log(`Library Folders found:`, Array.from(libraryFolders));

    for (const folder of libraryFolders) {
        const steamAppsPath = path.join(folder, 'steamapps');
        if (!fs.existsSync(steamAppsPath)) {
            console.log(`Skipping ${steamAppsPath} (not found)`);
            continue;
        }

        const files = fs.readdirSync(steamAppsPath);
        const manifests = files.filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'));
        console.log(`Scanning ${steamAppsPath}: Found ${manifests.length} manifests`);

        for (const manifest of manifests) {
            try {
                const content = fs.readFileSync(path.join(steamAppsPath, manifest), 'utf-8');
                const nameMatch = content.match(/"name"\s+"(.+?)"/);
                const idMatch = content.match(/"appid"\s+"(\d+)"/);
                
                if (nameMatch && idMatch) {
                    console.log(`  - [${idMatch[1]}] ${nameMatch[1]}`);
                }
            } catch (e) {
                console.error(`Error reading ${manifest}:`, e);
            }
        }
    }
}

main().catch(console.error);
