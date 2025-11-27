import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export interface Friend {
    id: string;
    username: string;
    avatar: string;
    status: 'online' | 'offline' | 'playing' | 'away';
    activity?: string;
    lastSeen?: string;
    platform?: string;
}

export class FriendsManager {
    getAll(): Friend[] {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM friends ORDER BY status DESC, username ASC').all();
        
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
        return true;
    }

    // Simulation method for demo purposes - sets random status
    simulateActivity() {
        const db = getDb();
        const friends = this.getAll();
        
        const statuses = ['online', 'offline', 'playing', 'away'];
        const activities = ['Halo Infinite', 'Elden Ring', 'Cyberpunk 2077', 'Valorant', 'Minecraft', 'Spotify', 'Visual Studio Code'];
        
        friends.forEach(friend => {
            // 30% chance to change status
            if (Math.random() > 0.7) {
                const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
                let newActivity = null;
                
                if (newStatus === 'playing') {
                    newActivity = activities[Math.floor(Math.random() * activities.length)];
                }
                
                db.prepare('UPDATE friends SET status = ?, activity = ?, last_seen = ? WHERE id = ?')
                  .run(newStatus, newActivity, new Date().toLocaleTimeString(), friend.id);
            }
        });
        
        return this.getAll();
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
}
