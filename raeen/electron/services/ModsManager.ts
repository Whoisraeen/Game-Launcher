import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export interface Mod {
    id: string;
    name: string;
    summary: string;
    author: string;
    logo: string;
    url: string;
    source: 'curseforge' | 'modrinth';
    downloads: number;
    updated: string;
}

export interface ModPack {
    id: string;
    name: string;
    version: string;
    author: string;
    description: string;
    logo?: string;
    mods: Mod[];
    loader: 'forge' | 'fabric' | 'quilt' | 'neoforge';
    loaderVersion: string;
    mcVersion: string;
    created: number;
    lastPlayed?: number;
}

export class ModsManager {
    private packsPath: string;

    constructor() {
        this.packsPath = path.join(app.getPath('userData'), 'modpacks');
        if (!fs.existsSync(this.packsPath)) {
            fs.mkdirSync(this.packsPath, { recursive: true });
        }
    }

    getAllPacks(): ModPack[] {
        if (!fs.existsSync(this.packsPath)) return [];

        const packs: ModPack[] = [];
        const files = fs.readdirSync(this.packsPath);

        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const content = fs.readFileSync(path.join(this.packsPath, file), 'utf-8');
                    packs.push(JSON.parse(content));
                } catch (e) {
                    console.error(`Failed to load modpack ${file}:`, e);
                }
            }
        }

        return packs.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
    }

    createPack(name: string, mcVersion: string, loader: 'forge' | 'fabric', loaderVersion: string): ModPack {
        const id = uuidv4();
        const pack: ModPack = {
            id,
            name,
            version: '1.0.0',
            author: 'User',
            description: 'Custom Modpack',
            mods: [],
            loader,
            loaderVersion,
            mcVersion,
            created: Date.now()
        };

        const filePath = path.join(this.packsPath, `${id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(pack, null, 2));

        // Create instance directory
        const instanceDir = path.join(this.packsPath, id);
        if (!fs.existsSync(instanceDir)) {
            fs.mkdirSync(instanceDir);
            fs.mkdirSync(path.join(instanceDir, 'mods'));
            fs.mkdirSync(path.join(instanceDir, 'config'));
        }

        return pack;
    }

    async searchModrinth(query: string): Promise<Mod[]> {
        try {
            const response = await axios.get(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=20`);
            return response.data.hits.map((hit: any) => ({
                id: hit.project_id,
                name: hit.title,
                summary: hit.description,
                author: hit.author,
                logo: hit.icon_url,
                url: `https://modrinth.com/mod/${hit.slug}`,
                source: 'modrinth',
                downloads: hit.downloads,
                updated: hit.date_modified
            }));
        } catch (error) {
            console.error('Modrinth search failed:', error);
            return [];
        }
    }

    // Mock Curseforge for now as it requires API Key
    async searchCurseforge(query: string): Promise<Mod[]> {
        // Return some mock data for demo purposes
        return [
            {
                id: 'jei',
                name: 'Just Enough Items (JEI)',
                summary: 'View Items and Recipes',
                author: 'mezz',
                logo: 'https://media.forgecdn.net/avatars/26/905/636142154619612371.png',
                url: 'https://www.curseforge.com/minecraft/mc-mods/jei',
                source: 'curseforge' as const,
                downloads: 250000000,
                updated: new Date().toISOString()
            },
            {
                id: 'mouse-tweaks',
                name: 'Mouse Tweaks',
                summary: 'Enhances inventory management',
                author: 'YaLTeR',
                logo: 'https://media.forgecdn.net/avatars/thumbnails/16/528/62/62/635736735397503750.png',
                url: 'https://www.curseforge.com/minecraft/mc-mods/mouse-tweaks',
                source: 'curseforge' as const,
                downloads: 150000000,
                updated: new Date().toISOString()
            }
        ].filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
    }
}
