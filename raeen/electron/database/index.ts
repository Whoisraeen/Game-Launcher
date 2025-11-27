import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrator';

let db: Database.Database;

export const initDatabase = () => {
  let userDataPath: string;
  try {
    userDataPath = app.getPath('userData');
  } catch (e) {
    // Fallback for testing/Node environment
    userDataPath = path.join(process.cwd(), 'userData');
  }
  const dbPath = path.join(userDataPath, 'launcher.db');

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`Initializing database at ${dbPath}`);

  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  runMigrations(db);

  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
