import fs from 'fs';
import path from 'path';
import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';

interface ShaderPreset {
    id: string;
    gameId: string;
    name: string;
    type: 'reshade' | 'enb' | 'custom';
    filePath: string;
    installedAt: number;
    active: boolean;
}

interface AvailablePreset {
    name: string;
    type: 'reshade' | 'enb';
    configFile: string;
    detected: boolean;
}

export class ShaderService {
    private presetsDir: string;

    constructor() {
        const { app } = require('electron');
        this.presetsDir = path.join(app.getPath('userData'), 'shader_presets');
        if (!fs.existsSync(this.presetsDir)) {
            fs.mkdirSync(this.presetsDir, { recursive: true });
        }
        this.ensureTable();
    }

    private ensureTable() {
        const db = getDb();
        db.exec(`
            CREATE TABLE IF NOT EXISTS shader_presets (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                installed_at INTEGER NOT NULL,
                active INTEGER DEFAULT 1,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            )
        `);
    }

    getShaderPresets(gameId: string): ShaderPreset[] {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM shader_presets WHERE game_id = ?').all(gameId) as any[];
        return rows.map(r => ({
            id: r.id,
            gameId: r.game_id,
            name: r.name,
            type: r.type,
            filePath: r.file_path,
            installedAt: r.installed_at,
            active: !!r.active,
        }));
    }

    async installPreset(gameId: string, presetPath: string): Promise<ShaderPreset> {
        if (!fs.existsSync(presetPath)) {
            throw new Error(`Preset file not found: ${presetPath}`);
        }

        const ext = path.extname(presetPath).toLowerCase();
        const baseName = path.basename(presetPath, ext);
        let type: 'reshade' | 'enb' | 'custom' = 'custom';

        if (baseName.toLowerCase().includes('reshade') || ext === '.ini' && baseName.toLowerCase().startsWith('reshade')) {
            type = 'reshade';
        } else if (baseName.toLowerCase().includes('enb') || baseName.toLowerCase().startsWith('enbseries')) {
            type = 'enb';
        }

        const id = uuidv4();
        const destDir = path.join(this.presetsDir, gameId);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const destPath = path.join(destDir, `${id}${ext}`);
        fs.copyFileSync(presetPath, destPath);

        const preset: ShaderPreset = {
            id,
            gameId,
            name: baseName,
            type,
            filePath: destPath,
            installedAt: Date.now(),
            active: true,
        };

        const db = getDb();
        db.prepare(
            'INSERT INTO shader_presets (id, game_id, name, type, file_path, installed_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(id, gameId, preset.name, preset.type, destPath, preset.installedAt, 1);

        return preset;
    }

    removePreset(gameId: string, presetId?: string): boolean {
        const db = getDb();

        if (presetId) {
            const row = db.prepare('SELECT file_path FROM shader_presets WHERE id = ? AND game_id = ?').get(presetId, gameId) as any;
            if (row && fs.existsSync(row.file_path)) {
                fs.unlinkSync(row.file_path);
            }
            db.prepare('DELETE FROM shader_presets WHERE id = ? AND game_id = ?').run(presetId, gameId);
        } else {
            const rows = db.prepare('SELECT file_path FROM shader_presets WHERE game_id = ?').all(gameId) as any[];
            for (const row of rows) {
                if (fs.existsSync(row.file_path)) {
                    fs.unlinkSync(row.file_path);
                }
            }
            db.prepare('DELETE FROM shader_presets WHERE game_id = ?').run(gameId);
        }

        return true;
    }

    getAvailablePresets(gameInstallPath?: string): AvailablePreset[] {
        const presets: AvailablePreset[] = [];

        if (!gameInstallPath || !fs.existsSync(gameInstallPath)) {
            return presets;
        }

        const reshadeIni = path.join(gameInstallPath, 'ReShade.ini');
        const enbIni = path.join(gameInstallPath, 'enbseries.ini');
        const enbLocal = path.join(gameInstallPath, 'enblocal.ini');

        presets.push({
            name: 'ReShade',
            type: 'reshade',
            configFile: reshadeIni,
            detected: fs.existsSync(reshadeIni),
        });

        presets.push({
            name: 'ENB Series',
            type: 'enb',
            configFile: enbIni,
            detected: fs.existsSync(enbIni) || fs.existsSync(enbLocal),
        });

        return presets;
    }
}
