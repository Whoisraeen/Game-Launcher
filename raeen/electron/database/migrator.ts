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
                    rating REAL DEFAULT 0,
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
    },
    {
        version: 3,
        name: 'add_merged_group_id',
        up: (db) => {
            db.exec('ALTER TABLE games ADD COLUMN group_id TEXT;');
        }
    },
    {
        version: 4,
        name: 'create_achievements_table',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS achievements (
                    id TEXT PRIMARY KEY,
                    game_id TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    platform_achievement_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    icon_url TEXT,
                    icon_gray_url TEXT,
                    unlocked INTEGER DEFAULT 0,
                    unlock_time INTEGER,
                    hidden INTEGER DEFAULT 0,
                    rarity_percent REAL,
                    created_at INTEGER,
                    updated_at INTEGER,
                    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                    UNIQUE(game_id, platform, platform_achievement_id)
                )
            `);

            // Index for faster queries
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_achievements_game_id ON achievements(game_id);
                CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(unlocked);
            `);
        }
    },
    {
        version: 5,
        name: 'create_crash_reports_table',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS crash_reports (
                    id TEXT PRIMARY KEY,
                    game_id TEXT NOT NULL,
                    game_name TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    crash_type TEXT NOT NULL,
                    error_code TEXT,
                    error_message TEXT,
                    stack_trace TEXT,
                    system_info TEXT NOT NULL,
                    relevant_logs TEXT NOT NULL,
                    solutions TEXT NOT NULL,
                    status TEXT DEFAULT 'new',
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
                )
            `);

            // Index for faster queries
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_crash_reports_game_id ON crash_reports(game_id);
                CREATE INDEX IF NOT EXISTS idx_crash_reports_timestamp ON crash_reports(timestamp);
                CREATE INDEX IF NOT EXISTS idx_crash_reports_status ON crash_reports(status);
            `);
        }
    },
    {
        version: 6,
        name: 'create_game_updates_table',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS game_updates (
                    id TEXT PRIMARY KEY,
                    gameId TEXT NOT NULL,
                    gameName TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    version TEXT NOT NULL,
                    newVersion TEXT NOT NULL,
                    releaseNotes TEXT,
                    updateSize TEXT,
                    detected_at INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    priority TEXT DEFAULT 'normal',
                    -- BUG-028: numeric companion so we sort by priority order
                    -- (4 critical, 3 high, 2 normal, 1 low) instead of alpha.
                    priority_rank INTEGER DEFAULT 2,
                    autoUpdate INTEGER DEFAULT 0,
                    progress INTEGER DEFAULT 0,
                    downloadSpeed TEXT,
                    estimatedTime TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
                )
            `);

            // Index for faster queries
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_game_updates_gameId ON game_updates(gameId);
                CREATE INDEX IF NOT EXISTS idx_game_updates_status ON game_updates(status);
                CREATE INDEX IF NOT EXISTS idx_game_updates_detected_at ON game_updates(detected_at);
            `);
        }
    },
    {
        version: 7,
        name: 'create_screenshots_table',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS screenshots (
                    id TEXT PRIMARY KEY,
                    gameId TEXT,
                    gameName TEXT NOT NULL,
                    filePath TEXT UNIQUE NOT NULL,
                    thumbnailPath TEXT,
                    fileName TEXT NOT NULL,
                    fileSize INTEGER NOT NULL,
                    width INTEGER NOT NULL,
                    height INTEGER NOT NULL,
                    takenAt INTEGER NOT NULL,
                    isFavorite INTEGER DEFAULT 0,
                    tags TEXT DEFAULT '[]',
                    caption TEXT,
                    platform TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE SET NULL
                )
            `);

            // Index for faster queries
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_screenshots_gameId ON screenshots(gameId);
                CREATE INDEX IF NOT EXISTS idx_screenshots_takenAt ON screenshots(takenAt);
                CREATE INDEX IF NOT EXISTS idx_screenshots_isFavorite ON screenshots(isFavorite);
                CREATE INDEX IF NOT EXISTS idx_screenshots_platform ON screenshots(platform);
            `);
        }
    },
    {
        version: 8,
        name: 'create_dlcs_table',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS dlcs (
                    id TEXT PRIMARY KEY,
                    gameId TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    platformDlcId TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    releaseDate INTEGER,
                    price REAL,
                    currency TEXT DEFAULT 'USD',
                    owned INTEGER DEFAULT 0,
                    installed INTEGER DEFAULT 0,
                    coverUrl TEXT,
                    detectedAt INTEGER NOT NULL,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE,
                    UNIQUE(gameId, platformDlcId)
                )
            `);

            // Index for faster queries
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_dlcs_gameId ON dlcs(gameId);
                CREATE INDEX IF NOT EXISTS idx_dlcs_owned ON dlcs(owned);
                CREATE INDEX IF NOT EXISTS idx_dlcs_releaseDate ON dlcs(releaseDate);
            `);
        }
    },
    {
        version: 9,
        name: 'create_wishlist_and_price_alerts_tables',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS wishlist (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    platformId TEXT NOT NULL,
                    coverUrl TEXT,
                    currentPrice REAL,
                    originalPrice REAL,
                    discountPercent INTEGER DEFAULT 0,
                    currency TEXT DEFAULT 'USD',
                    lowestPrice REAL,
                    targetPrice REAL,
                    priceHistory TEXT DEFAULT '[]',
                    addedAt INTEGER NOT NULL,
                    lastChecked INTEGER,
                    priceAlertEnabled INTEGER DEFAULT 0,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    UNIQUE(platform, platformId)
                )
            `);

            db.exec(`
                CREATE TABLE IF NOT EXISTS price_alerts (
                    id TEXT PRIMARY KEY,
                    wishlistGameId TEXT NOT NULL,
                    gameName TEXT NOT NULL,
                    targetPrice REAL NOT NULL,
                    currentPrice REAL NOT NULL,
                    discountPercent INTEGER DEFAULT 0,
                    triggered INTEGER DEFAULT 0,
                    triggeredAt INTEGER,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (wishlistGameId) REFERENCES wishlist(id) ON DELETE CASCADE
                )
            `);

            // Indexes
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_price_alerts_triggered ON price_alerts(triggered);
                CREATE INDEX IF NOT EXISTS idx_price_alerts_triggeredAt ON price_alerts(triggeredAt);
            `);
        }
    },
    {
        version: 10,
        name: 'create_friend_messages_table',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS friend_messages (
                    id TEXT PRIMARY KEY,
                    friend_id TEXT NOT NULL,
                    sender TEXT NOT NULL, -- 'me' or friend username
                    content TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    is_read INTEGER DEFAULT 0,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
                )
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_friend_messages_friend_id ON friend_messages(friend_id);
                CREATE INDEX IF NOT EXISTS idx_friend_messages_timestamp ON friend_messages(timestamp);
            `);
        }
    },
    {
        version: 11,
        name: 'create_performance_tables',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS game_performance_profiles (
                    id TEXT PRIMARY KEY,
                    game_id TEXT NOT NULL,
                    target_fps INTEGER NOT NULL DEFAULT 60,
                    quality_level INTEGER NOT NULL DEFAULT 3,
                    resolution_scale REAL NOT NULL DEFAULT 1.0,
                    vsync INTEGER NOT NULL DEFAULT 1,
                    shadow_quality INTEGER NOT NULL DEFAULT 3,
                    texture_quality INTEGER NOT NULL DEFAULT 3,
                    anti_aliasing INTEGER NOT NULL DEFAULT 2,
                    post_processing INTEGER NOT NULL DEFAULT 3,
                    view_distance INTEGER NOT NULL DEFAULT 3,
                    last_avg_fps REAL,
                    last_adjusted_at INTEGER,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                    UNIQUE(game_id)
                )
            `);

            db.exec(`
                CREATE TABLE IF NOT EXISTS graphics_profiles (
                    id TEXT PRIMARY KEY,
                    game_id TEXT NOT NULL,
                    profile_name TEXT NOT NULL,
                    settings_json TEXT NOT NULL DEFAULT '{}',
                    -- BUG-013: platform identity snapshot so a profile can be
                    -- re-attached even if the game row is recreated (after a
                    -- delete + re-import, or a path change that drops the row).
                    platform_snapshot TEXT,
                    platform_id_snapshot TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
                )
            `);

            db.exec(`
                CREATE TABLE IF NOT EXISTS performance_reports (
                    id TEXT PRIMARY KEY,
                    game_id TEXT NOT NULL,
                    session_id INTEGER,
                    avg_fps REAL,
                    min_fps REAL,
                    max_fps REAL,
                    max_cpu_temp REAL,
                    max_gpu_temp REAL,
                    avg_cpu_usage REAL,
                    avg_memory_usage REAL,
                    duration_seconds INTEGER,
                    stutter_count INTEGER DEFAULT 0,
                    frame_drops INTEGER DEFAULT 0,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
                )
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_game_perf_profiles_game_id ON game_performance_profiles(game_id);
                CREATE INDEX IF NOT EXISTS idx_graphics_profiles_game_id ON graphics_profiles(game_id);
                CREATE INDEX IF NOT EXISTS idx_performance_reports_game_id ON performance_reports(game_id);
                CREATE INDEX IF NOT EXISTS idx_performance_reports_session_id ON performance_reports(session_id);
            `);
        }
    },
    {
        version: 12,
        name: 'create_clans_tables',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS clans (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    tag TEXT NOT NULL,
                    game_focus TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
                )
            `);

            db.exec(`
                CREATE TABLE IF NOT EXISTS clan_members (
                    clan_id TEXT NOT NULL,
                    friend_id TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'member',
                    joined_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    PRIMARY KEY (clan_id, friend_id),
                    FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE,
                    FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
                )
            `);

            db.exec(`
                CREATE TABLE IF NOT EXISTS clan_messages (
                    id TEXT PRIMARY KEY,
                    clan_id TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE
                )
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON clan_members(clan_id);
                CREATE INDEX IF NOT EXISTS idx_clan_messages_clan_id ON clan_messages(clan_id);
                CREATE INDEX IF NOT EXISTS idx_clan_messages_timestamp ON clan_messages(timestamp);
            `);
        }
    },
    {
        version: 13,
        name: 'platform_oauth_tokens',
        up: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS platform_oauth_tokens (
                    provider TEXT PRIMARY KEY,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT,
                    expires_at INTEGER NOT NULL,
                    meta_json TEXT DEFAULT '{}',
                    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
                )
            `);
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
