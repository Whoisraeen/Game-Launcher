
import { ipcMain } from 'electron';
import { FriendsManager } from '../services/friendsManager';

export class FriendsController {
    private friendsManager: FriendsManager;

    constructor(friendsManager: FriendsManager) {
        this.friendsManager = friendsManager;
        this.registerHandlers();
    }

    private registerHandlers() {
        ipcMain.handle('friends:getAll', () => {
            try {
                return this.friendsManager.getAll();
            } catch (error) {
                console.error('Failed to get friends:', error);
                return [];
            }
        });

        ipcMain.handle('friends:add', (_, username: string, platform: string) => {
            try {
                return this.friendsManager.addFriend(username, platform);
            } catch (error) {
                console.error('Failed to add friend:', error);
                throw error;
            }
        });

        ipcMain.handle('friends:remove', (_, id: string) => {
            try {
                return this.friendsManager.removeFriend(id);
            } catch (error) {
                console.error('Failed to remove friend:', error);
                return false;
            }
        });

        ipcMain.handle('friends:importSteam', async () => {
            try {
                return await this.friendsManager.importSteamFriends();
            } catch (error) {
                console.error('Failed to import Steam friends:', error);
                return [];
            }
        });
    }
}
