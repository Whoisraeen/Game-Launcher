import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export class UniversalModManager {
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
    
    // Validate path if provided
    if (installPath && !fs.existsSync(installPath)) {
      // throw new Error('Mod path does not exist');
      // For now, allow it but log warning
      console.warn(`Mod path not found: ${installPath}`);
    }

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
    // If enabled, disable first (remove symlinks)
    const mod = db.prepare('SELECT * FROM mods WHERE id = ?').get(id) as any;
    if (mod && mod.enabled) {
        this.disableMod(id);
    }
    db.prepare('DELETE FROM mods WHERE id = ?').run(id);
    return true;
  }

  async enableMod(modId: string): Promise<boolean> {
      const db = getDb();
      const mod = db.prepare('SELECT * FROM mods WHERE id = ?').get(modId) as any;
      if (!mod) return false;
      
      const game = db.prepare('SELECT install_path FROM games WHERE id = ?').get(mod.game_id) as any;
      if (!game || !game.install_path) {
          console.error("Cannot enable mod: Game path not found");
          return false;
      }

      if (!mod.install_path || !fs.existsSync(mod.install_path)) {
          console.error("Cannot enable mod: Mod files not found");
          return false; // Or true if we just want to toggle the flag without files
      }

      try {
          // 1. Get all files in mod directory
          const modFiles = fs.readdirSync(mod.install_path);
          
          // 2. Create Symlinks in Game Directory
          // This is a simplified strategy: We symlink files at root of mod folder to root of game folder
          // A real manager would handle nested structures or specific 'Data' folders.
          
          for (const file of modFiles) {
              const srcPath = path.join(mod.install_path, file);
              const destPath = path.join(game.install_path, file);

              // Backup existing file if it exists and isn't a symlink
              if (fs.existsSync(destPath)) {
                  if (!fs.lstatSync(destPath).isSymbolicLink()) {
                      const backupPath = `${destPath}.bak`;
                      if (!fs.existsSync(backupPath)) {
                          fs.renameSync(destPath, backupPath);
                      }
                  } else {
                      // If it's a symlink, maybe it's from another mod or previous install. 
                      // We overwrite it.
                      fs.unlinkSync(destPath);
                  }
              }

              // Create Symlink (Junction for dirs, File for files)
              const type = fs.statSync(srcPath).isDirectory() ? 'junction' : 'file';
              fs.symlinkSync(srcPath, destPath, type);
              console.log(`Symlinked ${srcPath} -> ${destPath}`);
          }

          // Update DB
          db.prepare('UPDATE mods SET enabled = 1 WHERE id = ?').run(modId);
          return true;

      } catch (error) {
          console.error("Failed to enable mod:", error);
          return false;
      }
  }

  async disableMod(modId: string): Promise<boolean> {
      const db = getDb();
      const mod = db.prepare('SELECT * FROM mods WHERE id = ?').get(modId) as any;
      if (!mod) return false;
      
      const game = db.prepare('SELECT install_path FROM games WHERE id = ?').get(mod.game_id) as any;
      if (!game || !game.install_path) return false;

       if (!mod.install_path || !fs.existsSync(mod.install_path)) {
           // Just update flag if files missing
           db.prepare('UPDATE mods SET enabled = 0 WHERE id = ?').run(modId);
           return true;
       }

      try {
          const modFiles = fs.readdirSync(mod.install_path);

          for (const file of modFiles) {
              const destPath = path.join(game.install_path, file);

              if (fs.existsSync(destPath) && fs.lstatSync(destPath).isSymbolicLink()) {
                  fs.unlinkSync(destPath);
                  console.log(`Removed symlink: ${destPath}`);

                  // Restore backup if exists
                  const backupPath = `${destPath}.bak`;
                  if (fs.existsSync(backupPath)) {
                      fs.renameSync(backupPath, destPath);
                      console.log(`Restored backup: ${backupPath}`);
                  }
              }
          }

          db.prepare('UPDATE mods SET enabled = 0 WHERE id = ?').run(modId);
          return true;

      } catch (error) {
          console.error("Failed to disable mod:", error);
          return false;
      }
  }
}
