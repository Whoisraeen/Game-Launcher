import { BrowserWindow } from 'electron';
import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { SettingsManager } from './settingsManager';
import { NotificationService } from './notificationService';

export interface Friend {
    id: string;
    username: string;
    avatar: string;
    status: 'online' | 'offline' | 'playing' | 'away' | 'busy';
    activity?: string;
    lastSeen?: string;
    platform?: string;
}

export class FriendsManager {
    private simulationInterval: NodeJS.Timeout | null = null;
    private notificationService?: NotificationService;
    private previousFriendStates: Map<string, { status: string; activity: string | null }> = new Map();

    constructor(notificationService?: NotificationService) {
        this.notificationService = notificationService;
        // Production Mode: No fake seeding, no simulation
        // this.seedInitialData(); 
        this.loadPreviousStates();
        
        // Only start real-time sync loop
        this.startRealTimeSync();
    }

    /**
     * Load previous friend states for comparison
     */
    private loadPreviousStates() {
        const friends = this.getAll();
        friends.forEach(friend => {
            this.previousFriendStates.set(friend.id, {
                status: friend.status,
                activity: friend.activity || null,
            });
        });
    }

    private seedInitialData() {
        const db = getDb();
        try {
            const row = db.prepare('SELECT COUNT(*) as count FROM friends').get() as { count: number };
            if (row && row.count === 0) {
                const initialFriends = [
                    { username: 'Sarah_G', platform: 'xbox', status: 'playing', activity: 'Halo Infinite' },
                    { username: 'Mike_T', platform: 'psn', status: 'playing', activity: 'Spider-Man 2' },
                    { username: 'Alex_R', platform: 'steam', status: 'busy', activity: null },
                    { username: 'Jessica_W', platform: 'steam', status: 'away', activity: null },
                    { username: 'DriftKing_99', platform: 'steam', status: 'online', activity: null }
                ];

                initialFriends.forEach(f => {
                    const id = uuidv4();
                    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.username}`;
                    db.prepare(`
                    INSERT INTO friends (id, username, avatar_url, status, activity, last_seen, platform, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 `).run(id, f.username, avatar, f.status, f.activity, 'Just now', f.platform, Date.now());
                });
                console.log('Seeded initial friends data');
            }
        } catch (error) {
            console.error('Failed to seed initial friends:', error);
        }
    }

    getAll(): Friend[] {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM friends ORDER BY CASE WHEN status = \'playing\' THEN 1 WHEN status = \'online\' THEN 2 ELSE 3 END, username ASC').all();
        
        return rows.map((row: any) => ({
            id: row.id,
            username: row.username,
            avatar: row.avatar_url,
            status: row.status as any,
            activity: row.activity,
            lastSeen: row.last_seen,
            platform: row.platform
        }));
    }

    addFriend(username: string, platform: string = 'steam'): Friend {
        const db = getDb();
        const id = uuidv4();
        // Generate random avatar for now using DiceBear
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        
        const friend = {
            id,
            username,
            avatar_url: avatar,
            status: 'offline', // Default to offline initially
            activity: null,
            last_seen: 'Just now',
            platform,
            created_at: Date.now()
        };

        db.prepare(`
            INSERT INTO friends (id, username, avatar_url, status, activity, last_seen, platform, created_at)
            VALUES (@id, @username, @avatar_url, @status, @activity, @last_seen, @platform, @created_at)
        `).run(friend);

        this.broadcastUpdate();

        return {
            id: friend.id,
            username: friend.username,
            avatar: friend.avatar_url,
            status: friend.status as any,
            activity: friend.activity || undefined,
            lastSeen: friend.last_seen,
            platform: friend.platform
        };
    }

    removeFriend(id: string) {
        const db = getDb();
        db.prepare('DELETE FROM friends WHERE id = ?').run(id);
        this.broadcastUpdate();
        return true;
    }

    // Simulation method for demo purposes - sets random status
    simulateActivity() {
        const db = getDb();
        // Get all friends directly from DB to ensure we have the latest
        const rows = db.prepare('SELECT * FROM friends').all();

        const statuses = ['online', 'offline', 'playing', 'away', 'busy'];
        const activities = ['Halo Infinite', 'Elden Ring', 'Cyberpunk 2077', 'Valorant', 'Minecraft', 'Spotify', 'Visual Studio Code', 'Apex Legends', 'Fortnite', 'Call of Duty'];

        let changed = false;

        rows.forEach((friend: any) => {
            // 10% chance to change status per tick
            if (Math.random() > 0.9) {
                const previousState = this.previousFriendStates.get(friend.id);
                const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
                let newActivity = null;

                if (newStatus === 'playing') {
                    newActivity = activities[Math.floor(Math.random() * activities.length)];
                } else if (newStatus === 'online') {
                     // Small chance to be "Just chatting" or similar
                     newActivity = Math.random() > 0.8 ? 'Browsing Store' : null;
                }

                db.prepare('UPDATE friends SET status = ?, activity = ?, last_seen = ? WHERE id = ?')
                  .run(newStatus, newActivity, new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), friend.id);
                changed = true;

                // Trigger notifications for status changes
                if (this.notificationService && previousState) {
                    // Friend came online (from offline)
                    if (previousState.status === 'offline' && (newStatus === 'online' || newStatus === 'playing')) {
                        this.notificationService.notifyFriendOnline(friend.username, friend.platform || 'Unknown');
                    }

                    // Friend started playing a game
                    if (newStatus === 'playing' && newActivity && previousState.activity !== newActivity) {
                        this.notificationService.notifyFriendPlaying(friend.username, newActivity);
                    }
                }

                // Update previous state
                this.previousFriendStates.set(friend.id, {
                    status: newStatus,
                    activity: newActivity,
                });
            }

            // Simulate incoming message (1% chance if online/playing)
            if ((friend.status === 'online' || friend.status === 'playing') && Math.random() > 0.99) {
                const messages = [
                    "Hey, want to play?",
                    "Check out this new game!",
                    "I'm stuck on this level...",
                    "LOL did you see that?",
                    "Coming online in 5 mins",
                    "GG last night!",
                    "Are you getting the new DLC?",
                    "Wait for me!"
                ];
                const content = messages[Math.floor(Math.random() * messages.length)];
                this.sendMessage(friend.id, content, friend.username);
                
                if (this.notificationService) {
                    this.notificationService.notify(friend.username, content);
                }
            }
        });

        if (changed) {
            this.broadcastUpdate();
        }

        return this.getAll();
    }

    startRealTimeSync() {
        if (this.simulationInterval) clearInterval(this.simulationInterval);
        
        // Initial sync
        this.syncSteamFriendsRealTime();

        // Run every 60 seconds to respect API rate limits while keeping data fresh
        this.simulationInterval = setInterval(() => {
             this.syncSteamFriendsRealTime().then(friends => {
                 if (friends.length > 0) {
                     this.broadcastUpdate();
                 }
             });
        }, 60000);
    }

    private broadcastUpdate() {
        const friends = this.getAll();
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('friends:update', friends);
        });
    }

    async syncSteamFriendsRealTime(): Promise<Friend[]> {
        const settingsManager = new SettingsManager();
        const settings = settingsManager.getAllSettings();
        const apiKey = settings.integrations?.steamApiKey;
        const steamId = settings.integrations?.steamId;

        if (!apiKey || !steamId) {
            console.log('Steam sync skipped: Missing API Key or Steam ID');
            return [];
        }

        try {
            // 1. Get Friend List
            const friendListUrl = `http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${apiKey}&steamid=${steamId}&relationship=friend`;
            const friendListRes = await axios.get(friendListUrl);
            const friends = friendListRes.data?.friendslist?.friends || [];

            if (friends.length === 0) return [];

            const friendIds = friends.map((f: any) => f.steamid).join(',');

            // 2. Get Player Summaries (Status, Name, Avatar)
            const summariesUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${friendIds}`;
            const summariesRes = await axios.get(summariesUrl);
            const players = summariesRes.data?.response?.players || [];

            // 3. Update DB
            const db = getDb();
            const syncedFriends: Friend[] = [];

            const insertStmt = db.prepare(`
                INSERT INTO friends (id, username, avatar_url, status, activity, last_seen, platform, created_at)
                VALUES (@id, @username, @avatar_url, @status, @activity, @last_seen, @platform, @created_at)
                ON CONFLICT(id) DO UPDATE SET
                    username = excluded.username,
                    avatar_url = excluded.avatar_url,
                    status = excluded.status,
                    activity = excluded.activity,
                    last_seen = excluded.last_seen
            `);

            const dbTransaction = db.transaction((players) => {
                for (const player of players) {
                    // Map Steam Status to our Status
                    // personastate: 0 - Offline, 1 - Online, 2 - Busy, 3 - Away, 4 - Snooze, 5 - looking to trade, 6 - looking to play
                    let status: 'online' | 'offline' | 'away' | 'playing' | 'busy' = 'offline';
                    if (player.gameextrainfo) {
                        status = 'playing';
                    } else {
                        switch (player.personastate) {
                            case 0: status = 'offline'; break;
                            case 1: status = 'online'; break;
                            case 2: status = 'busy'; break;
                            case 3: status = 'away'; break;
                            case 4: status = 'away'; break; // Snooze -> Away
                            default: status = 'online';
                        }
                    }

                    const friendData = {
                        id: player.steamid, // Use SteamID as ID for uniqueness
                        username: player.personaname,
                        avatar_url: player.avatarfull,
                        status: status,
                        activity: player.gameextrainfo || null,
                        last_seen: new Date(player.lastlogoff * 1000).toISOString(),
                        platform: 'steam',
                        created_at: Date.now()
                    };

                    insertStmt.run(friendData);
                    
                    syncedFriends.push({
                        id: friendData.id,
                        username: friendData.username,
                        avatar: friendData.avatar_url,
                        status: friendData.status,
                        activity: friendData.activity || undefined,
                        lastSeen: friendData.last_seen,
                        platform: 'steam'
                    });
                }
            });

            dbTransaction(players);

            return syncedFriends;

        } catch (error) {
            console.error('Failed to sync Steam friends:', error);
            return [];
        }
    }

    async importSteamFriends(): Promise<Friend[]> {
        const steamPath = this.findSteamPath();
        if (!steamPath) return [];

        const userDataPath = path.join(steamPath, 'userdata');
        if (!fs.existsSync(userDataPath)) return [];

        const users = fs.readdirSync(userDataPath);
        const importedFriends: Friend[] = [];

        for (const userId of users) {
            const localConfigPath = path.join(userDataPath, userId, 'config', 'localconfig.vdf');
            if (fs.existsSync(localConfigPath)) {
                try {
                    const content = fs.readFileSync(localConfigPath, 'utf-8');
                    const friends = this.extractFriendsFromVdf(content);
                    
                    for (const friendName of friends) {
                        // Check if already exists
                        const db = getDb();
                        const existing = db.prepare('SELECT id FROM friends WHERE username = ? AND platform = ?').get(friendName, 'steam');
                        
                        if (!existing) {
                            importedFriends.push(this.addFriend(friendName, 'steam'));
                        }
                    }
                } catch (e) {
                    console.error(`Error reading localconfig for user ${userId}:`, e);
                }
            }
        }
        
        return importedFriends;
    }

    private findSteamPath(): string | undefined {
        const commonPaths = [
            'C:\\Program Files (x86)\\Steam',
            'C:\\Program Files\\Steam',
            'D:\\Steam',
            'E:\\Steam'
        ];
        return commonPaths.find(p => fs.existsSync(p));
    }

    private extractFriendsFromVdf(content: string): string[] {
        const friends: string[] = [];
        // Simple regex to find friends block
        // "friends"
        // {
        //   "id"
        //   {
        //     "name" "Name"
        //   }
        // }
        // This is simplified and might miss some edge cases but good for now
        
        // Find "friends" block start
        const friendsIndex = content.indexOf('"friends"');
        if (friendsIndex === -1) return [];

        const blockStart = content.indexOf('{', friendsIndex);
        if (blockStart === -1) return [];

        // Simple parsing: look for "name" "Value" inside the block
        // We need to be careful not to read outside the friends block.
        // A full VDF parser is better but for now let's try to grab names around the friends block area.
        
        // Let's use a regex that looks for "name" "X"
        // We'll limit the search scope to reasonable size after "friends"
        const searchScope = content.slice(blockStart, blockStart + 50000); // 50KB chunk
        
        const nameMatches = searchScope.matchAll(/"name"\s+"(.+?)"/g);
        for (const match of nameMatches) {
            // Filter out common non-friend names if any
            if (match[1] && match[1].length > 1) {
                friends.push(match[1]);
            }
        }

        // Deduplicate
        return [...new Set(friends)];
    }

    // Chat functionality
    
    getMessages(friendId: string): any[] {
        const db = getDb();
        return db.prepare('SELECT * FROM friend_messages WHERE friend_id = ? ORDER BY timestamp ASC').all(friendId);
    }

    sendMessage(friendId: string, content: string, sender: string = 'me') {
        const db = getDb();
        const id = uuidv4();
        const timestamp = Date.now();
        
        db.prepare(`
            INSERT INTO friend_messages (id, friend_id, sender, content, timestamp, is_read)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, friendId, sender, content, timestamp, sender === 'me' ? 1 : 0);

        // Notify renderer
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('friends:message', { 
                friendId, 
                message: { id, friend_id: friendId, sender, content, timestamp, is_read: sender === 'me' ? 1 : 0 } 
            });
        });

        return { id, friend_id: friendId, sender, content, timestamp, is_read: sender === 'me' ? 1 : 0 };
    }

    markRead(friendId: string) {
        const db = getDb();
        db.prepare('UPDATE friend_messages SET is_read = 1 WHERE friend_id = ?').run(friendId);
        return true;
    }
}
