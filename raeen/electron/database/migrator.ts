import Database from 'better-sqlite3';
import log from 'electron-log';

export interface Migration {
    version: number;
    name: string;
    up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
    {
        version: 1,
        name: 'initial_schema',
        up: (db) => {
            // Games table
            db.exec(`
                CREATE TABLE IF NOT EXISTS games (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    platform_id TEXT,
                    install_path TEXT,
                    executable TEXT,
                    launch_options TEXT,
                    icon_url TEXT,
                    cover_url TEXT,
                    background_url TEXT,
                    description TEXT,
                    genre TEXT,
                    release_date TEXT,
                    developer TEXT,
                    publisher TEXT,
                    tags TEXT,
                    playtime_seconds INTEGER DEFAULT 0,
                    last_played INTEGER,
                    is_favorite INTEGER DEFAULT 0,
                    is_installed INTEGER DEFAULT 1,
                    is_hidden INTEGER DEFAULT 0,
                    achievements_total INTEGER DEFAULT 0,
                    achievements_unlocked INTEGER DEFAULT 0,
                    play_status TEXT DEFAULT 'none',
                    rating INTEGER DEFAULT 0,
                    user_notes TEXT,
                    added_at INTEGER,
                    sort_order INTEGER DEFAULT 0,
                    logo_url TEXT
                )
            `);

            // Mods table
            db.exec(`
                CREATE TABLE IF NOT EXISTS mods (
                    id TEXT PRIMARY KEY,
                    game_id TEXT,
                    name TEXT,
                    description TEXT,
                    version TEXT,
                    enabled BOOLEAN DEFAULT 0,
                    install_path TEXT,
                    created_at INTEGER,
                    FOREIGN KEY(game_id) REFERENCES games(id)
                )
            `);

            // Collections table
            db.exec(`
                CREATE TABLE IF NOT EXISTS collections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    is_dynamic INTEGER DEFAULT 0,
                    filter_criteria TEXT,
                    created_at INTEGER
                )
            `);

            // Collection Games (Many-to-Many)
            db.exec(`
                CREATE TABLE IF NOT EXISTS collection_games (
                    collection_id TEXT,
                    game_id TEXT,
                    added_at INTEGER,
                    PRIMARY KEY (collection_id, game_id),
                    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
                )
            `);

            // Playtime Sessions
            db.exec(`
                CREATE TABLE IF NOT EXISTS playtime_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_id TEXT,
                    start_time INTEGER NOT NULL,
                    end_time INTEGER,
                    duration_seconds INTEGER,
                    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
                )
            `);

            // Settings/Preferences
            db.exec(`
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at INTEGER
                )
            `);

            // Friends table
            db.exec(`
                CREATE TABLE IF NOT EXISTS friends (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    avatar_url TEXT,
                    status TEXT DEFAULT 'offline',
                    activity TEXT,
                    last_seen TEXT,
                    platform TEXT,
                    created_at INTEGER
                )
            `);
        },
    },
    {
        version: 2,
        name: 'add_video_url',
        up: (db) => {
            db.exec('ALTER TABLE games ADD COLUMN video_url TEXT;');
        }
    }
];

export const runMigrations = (db: Database.Database) => {
    // Create migrations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT,
            applied_at INTEGER
        )
    `);

    // Get current version
    const currentVersion = db.prepare('SELECT MAX(version) as v FROM schema_migrations').get() as { v: number };
    const dbVersion = currentVersion.v || 0;

    log.info(`Current database version: ${dbVersion}`);

    for (const migration of migrations) {
        if (migration.version > dbVersion) {
            log.info(`Applying migration ${migration.version}: ${migration.name}`);

            const transaction = db.transaction(() => {
                migration.up(db);
                db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
                    migration.version,
                    migration.name,
                    Date.now()
                );
            });

            try {
                transaction();
                log.info(`Migration ${migration.version} applied successfully`);
            } catch (error) {
                log.error(`Failed to apply migration ${migration.version}:`, error);
                throw error;
            }
        }
    }
};
