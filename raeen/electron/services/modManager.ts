import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ModConflict {
    file: string;
    modIds: string[];
    // BUG-037: distinguish between identical-content overrides (likely safe to
    // load-order resolve) and divergent-content overrides (need user choice).
    severity: 'identical' | 'divergent' | 'asset-overlap';
    detail?: string;
}

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

  // BUG-037: deeper conflict detection.
  //  - Hash file contents so identical drops are flagged as 'identical' (low severity).
  //  - For loose-asset formats (DDS textures, OGG audio, JSON/XML configs), flag
  //    name overlaps in known asset directories as 'asset-overlap' even when
  //    paths differ but the asset id matches.
  //  - All other path collisions with differing hashes are 'divergent'.
  checkConflicts(gameId: string): ModConflict[] {
      const db = getDb();
      const mods = db.prepare('SELECT id, install_path FROM mods WHERE game_id = ? AND enabled = 1').all(gameId) as { id: string, install_path: string }[];

      if (mods.length < 2) return [];

      type FileEntry = { modId: string; abs: string; size: number };
      const byPath = new Map<string, FileEntry[]>();         // relPath → entries
      const byAssetId = new Map<string, FileEntry[]>();      // assetId → entries

      const ASSET_DIRS = /(?:^|\/)(?:textures|sounds|materials|meshes|scripts|configs?)(?:\/|$)/i;

      const hashOf = (abs: string): string | null => {
          try {
              const buf = fs.readFileSync(abs);
              return crypto.createHash('sha1').update(buf).digest('hex');
          } catch { return null; }
      };

      for (const mod of mods) {
          if (!mod.install_path || !fs.existsSync(mod.install_path)) continue;

          const scan = (dir: string, relativeDir: string = '') => {
              const files = fs.readdirSync(dir);
              for (const file of files) {
                  const fullPath = path.join(dir, file);
                  const relativePath = path.join(relativeDir, file).replace(/\\/g, '/');
                  let stat: fs.Stats;
                  try { stat = fs.statSync(fullPath); } catch { continue; }

                  if (stat.isDirectory()) { scan(fullPath, relativePath); continue; }

                  const entry: FileEntry = { modId: mod.id, abs: fullPath, size: stat.size };
                  if (!byPath.has(relativePath)) byPath.set(relativePath, []);
                  byPath.get(relativePath)!.push(entry);

                  // Asset-overlap heuristic: same basename inside an asset dir
                  // even when full paths differ between mods (common for texture
                  // packs that organize differently).
                  if (ASSET_DIRS.test(relativePath)) {
                      const assetKey = path.basename(relativePath).toLowerCase();
                      if (!byAssetId.has(assetKey)) byAssetId.set(assetKey, []);
                      byAssetId.get(assetKey)!.push(entry);
                  }
              }
          };

          try { scan(mod.install_path); }
          catch (e) { console.warn(`Failed to scan mod ${mod.id}`, e); }
      }

      const conflicts: ModConflict[] = [];

      byPath.forEach((entries, file) => {
          if (entries.length < 2) return;
          // Quick size-based screen, then content hash to confirm identical.
          const sizes = new Set(entries.map(e => e.size));
          if (sizes.size === 1) {
              const hashes = new Set(entries.map(e => hashOf(e.abs) || `unknown:${e.modId}`));
              if (hashes.size === 1) {
                  conflicts.push({ file, modIds: entries.map(e => e.modId), severity: 'identical', detail: 'Identical contents' });
                  return;
              }
          }
          conflicts.push({ file, modIds: entries.map(e => e.modId), severity: 'divergent', detail: 'Different contents — last loaded mod wins' });
      });

      // Asset-overlap conflicts that didn't already show up as path collisions.
      const seenPaths = new Set<string>(conflicts.map(c => c.file));
      byAssetId.forEach((entries, asset) => {
          // Need entries from at least two distinct mods AND not already accounted for.
          const distinctMods = new Set(entries.map(e => e.modId));
          if (distinctMods.size < 2) return;
          const reps = entries.slice(0, 4).map(e => e.abs);
          const samplePath = path.basename(reps[0]);
          if (seenPaths.has(samplePath)) return;
          conflicts.push({
              file: `asset:${asset}`,
              modIds: [...distinctMods],
              severity: 'asset-overlap',
              detail: `Multiple mods ship "${asset}" in different folders`,
          });
      });

      return conflicts;
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

  // Helper to get all files recursively with relative paths
  private getAllFiles(dir: string, fileList: string[] = [], rootDir: string = dir): string[] {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            this.getAllFiles(fullPath, fileList, rootDir);
        } else {
            fileList.push(path.relative(rootDir, fullPath));
        }
    }
    return fileList;
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
          return false;
      }

      try {
          // 1. Get all files in mod directory (Recursive)
          const modFiles = this.getAllFiles(mod.install_path);
          
          // 2. Create Symlinks in Game Directory
          for (const file of modFiles) {
              const srcPath = path.join(mod.install_path, file);
              const destPath = path.join(game.install_path, file);
              const destDir = path.dirname(destPath);

              // Ensure destination directory exists
              if (!fs.existsSync(destDir)) {
                  fs.mkdirSync(destDir, { recursive: true });
              }

              // Backup existing file if it exists
              if (fs.existsSync(destPath)) {
                  if (!fs.lstatSync(destPath).isSymbolicLink()) {
                      const backupPath = `${destPath}.bak`;
                      if (!fs.existsSync(backupPath)) {
                          fs.renameSync(destPath, backupPath);
                      }
                  } else {
                      // If it's a symlink, overwrite it
                      fs.unlinkSync(destPath);
                  }
              }

              // Create Symlink (File)
              // We use 'file' type because we are linking files, not directories
              // If admin rights are missing, this might fail on Windows < 10 Creators Update or if Developer Mode is off
              fs.symlinkSync(srcPath, destPath, 'file');
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
          const modFiles = this.getAllFiles(mod.install_path);

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
              
              // Clean up empty directories (optional but good for hygiene)
              try {
                  let dir = path.dirname(destPath);
                  // Only remove directories inside game install path
                  while (dir !== game.install_path && dir.length > game.install_path.length) {
                      if (fs.readdirSync(dir).length === 0) {
                          fs.rmdirSync(dir);
                          dir = path.dirname(dir);
                      } else {
                          break;
                      }
                  }
              } catch (e) {
                  // Ignore cleanup errors
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
