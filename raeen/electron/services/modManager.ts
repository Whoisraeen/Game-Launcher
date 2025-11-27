import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';

export class ModManager {
  getMods(gameId: string) {
    const db = getDb();
    return db.prepare('SELECT * FROM mods WHERE game_id = ? ORDER BY created_at DESC').all(gameId);
  }

  getAllMods() {
    const db = getDb();
    // Join with games to get game title
    return db.prepare(`
      SELECT mods.*, games.title as game_title, games.platform as game_platform 
      FROM mods 
      LEFT JOIN games ON mods.game_id = games.id 
      ORDER BY mods.created_at DESC
    `).all();
  }

  addMod(gameId: string, name: string, description: string = '', version: string = '', installPath: string = '') {
    const db = getDb();
    const id = uuidv4();
    const createdAt = Date.now();
    db.prepare('INSERT INTO mods (id, game_id, name, description, version, install_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, gameId, name, description, version, installPath, createdAt);
    return { id, gameId, name, description, version, enabled: false, installPath, createdAt };
  }

  updateMod(id: string, updates: any) {
    const db = getDb();
    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'game_id' && k !== 'created_at');
    if (keys.length === 0) return false;
    
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    
    db.prepare(`UPDATE mods SET ${setClause} WHERE id = ?`).run(...values, id);
    return true;
  }

  deleteMod(id: string) {
    const db = getDb();
    db.prepare('DELETE FROM mods WHERE id = ?').run(id);
    return true;
  }
}
