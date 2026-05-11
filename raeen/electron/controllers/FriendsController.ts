
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

        ipcMain.handle('friends:sync', async () => {
            try {
                return await this.friendsManager.syncSteamFriendsRealTime();
            } catch (error) {
                console.error('Failed to sync friends:', error);
                return [];
            }
        });

        ipcMain.handle('friends:getMessages', (_, friendId: string) => {
            try {
                return this.friendsManager.getMessages(friendId);
            } catch (error) {
                console.error('Failed to get messages:', error);
                return [];
            }
        });

        ipcMain.handle('friends:sendMessage', (_, friendId: string, content: string) => {
            try {
                return this.friendsManager.sendMessage(friendId, content, 'me');
            } catch (error) {
                console.error('Failed to send message:', error);
                throw error;
            }
        });

        ipcMain.handle('friends:markRead', (_, friendId: string) => {
            try {
                return this.friendsManager.markRead(friendId);
            } catch (error) {
                console.error('Failed to mark read:', error);
                return false;
            }
        });

        ipcMain.handle('friends:getActivity', () => {
            try {
                return this.friendsManager.getActivityFeed();
            } catch (error) {
                console.error('Failed to get activity feed:', error);
                return [];
            }
        });

        ipcMain.handle('friends:shareCollection', (_, collectionId: string, friendIds: string[]) => {
            try {
                return this.friendsManager.shareCollection(collectionId, friendIds);
            } catch (error) {
                console.error('Failed to share collection:', error);
                throw error;
            }
        });

        ipcMain.handle('friends:getSharedCollections', () => {
            try {
                return this.friendsManager.getSharedCollections();
            } catch (error) {
                console.error('Failed to get shared collections:', error);
                return [];
            }
        });

        ipcMain.handle('friends:importSharedCollection', (_, sharedId: string) => {
            try {
                return this.friendsManager.importSharedCollection(sharedId);
            } catch (error) {
                console.error('Failed to import shared collection:', error);
                throw error;
            }
        });
    }
}
