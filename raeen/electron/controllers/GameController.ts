
import { ipcMain } from 'electron';
import { GameManager } from '../services/gameManager';
import { Game } from '../types'; // Assuming shared types

export class GameController {
    private gameManager: GameManager;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
        this.registerHandlers();
    }

    private registerHandlers() {
        // --- Library Management ---
        ipcMain.handle('games:sync', async () => {
            try {
                return await this.gameManager.syncLibrary();
            } catch (error) {
                console.error('Failed to sync library:', error);
                throw error;
            }
        });

        ipcMain.handle('games:getAll', () => {
            try {
                return this.gameManager.getAllGames();
            } catch (error) {
                console.error('Failed to get games:', error);
                return [];
            }
        });

        ipcMain.handle('games:getPage', (_, page: number, pageSize: number) => {
            try {
                return this.gameManager.getGamesPage(page, pageSize);
            } catch (error) {
                console.error('Failed to get games page:', error);
                return [];
            }
        });

        // --- Launch & Actions ---
        ipcMain.handle('games:launch', async (_, gameId: string) => {
            try {
                return await this.gameManager.launchGame(gameId);
            } catch (error) {
                console.error('Failed to launch game:', error);
                throw error;
            }
        });

        ipcMain.handle('games:install', async (_, gameId: string) => {
             try {
                 return await this.gameManager.installGame(gameId);
             } catch (error) {
                 console.error('Failed to install game:', error);
                 throw error;
             }
        });

        ipcMain.handle('games:verify', async (_, gameId: string) => {
             return await this.gameManager.verifyGame(gameId);
        });

        ipcMain.handle('games:kill', async (_, gameId: string) => {
             return await this.gameManager.killGame(gameId);
        });

        ipcMain.handle('games:uninstall', async (_, gameId: string) => {
            return await this.gameManager.uninstallGame(gameId);
        });
        
        ipcMain.handle('games:openPlatform', async (_, platform: string) => {
             return await this.gameManager.openPlatform(platform);
        });

        ipcMain.handle('games:openInstallFolder', async (_, gameId: string) => {
            return await this.gameManager.openInstallFolder(gameId);
        });

        ipcMain.handle('games:createShortcut', async (_, gameId: string) => {
            return await this.gameManager.createDesktopShortcut(gameId);
        });

        // --- Game Details Updates ---
        ipcMain.handle('games:updateTags', (_, gameId: string, tags: string[]) => {
            return this.gameManager.updateGameTags(gameId, tags);
        });

        ipcMain.handle('games:toggleHidden', (_, gameId: string, isHidden: boolean) => {
            return this.gameManager.toggleHidden(gameId, isHidden);
        });

        ipcMain.handle('games:toggleFavorite', (_, gameId: string, isFavorite: boolean) => {
             return this.gameManager.toggleFavorite(gameId, isFavorite);
        });

        ipcMain.handle('games:updatePlayStatus', (_, gameId: string, status: string) => {
            return this.gameManager.updatePlayStatus(gameId, status);
        });

        ipcMain.handle('games:updateLaunchOptions', (_, gameId: string, options: string) => {
            return this.gameManager.updateLaunchOptions(gameId, options);
        });

        ipcMain.handle('games:updateRating', (_, gameId: string, rating: number) => {
            return this.gameManager.updateRating(gameId, rating);
        });

        ipcMain.handle('games:updateUserNotes', (_, gameId: string, notes: string) => {
             return this.gameManager.updateUserNotes(gameId, notes);
        });
        
        ipcMain.handle('games:updateDetails', (_, gameId: string, updates: any) => {
            return this.gameManager.updateGameDetails(gameId, updates);
        });

        // --- Recommendations & Stats ---
        // Note: Some of these were calling recommendationManager directly in main.ts
        // We should ideally route them through GameManager if we want GameController to be the facade.
        // But GameManager doesn't have getRecommendations methods. 
        // For now, we will assume we inject or access recommendationManager separately or add methods to GameManager.
        // However, to keep it simple and "controller-like", let's leave the recommendation logic in main.ts for now 
        // OR assume we added methods to GameManager. 
        // Wait, the user asked to Refactor main.ts. 
        // So we should move them here. But we need access to RecommendationManager.
        // Let's assume we pass it in or instantiate it?
        // Or better, let GameManager own RecommendationManager.
        // The existing code in main.ts had `recommendationManager`.
        // I will SKIP recommendation handlers in this controller for now and leave them in main.ts 
        // to avoid breaking them (since I don't have access to recommendationManager here).
        
        ipcMain.handle('games:getWeeklyActivity', () => {
             return this.gameManager.getWeeklyActivity();
        });

        ipcMain.handle('games:getAverageSessionDuration', () => {
             return this.gameManager.getAverageSessionDuration();
        });

        // --- Ordering & Merging ---
        ipcMain.handle('games:reorder', (_, activeId: string, overId: string) => {
            return this.gameManager.reorderGames(activeId, overId);
        });
        
        ipcMain.handle('games:updateOrder', (_, gameIds: string[]) => {
             return this.gameManager.updateGameOrder(gameIds);
        });
        
        ipcMain.handle('games:merge', async (_, primaryId: string, secondaryId: string) => {
             return await this.gameManager.mergeGames(primaryId, secondaryId);
        });

        ipcMain.handle('games:unmerge', async (_, gameId: string) => {
             return await this.gameManager.unmergeGame(gameId);
        });

        ipcMain.handle('games:autoMerge', async () => {
             return await this.gameManager.autoMergeDuplicates();
        });
        
        ipcMain.handle('games:getNews', async () => {
             return await this.gameManager.getLibraryNews();
        });

        // --- Collections ---
        ipcMain.handle('collections:getAll', async () => {
             return await this.gameManager.getCollections();
        });

        ipcMain.handle('collections:create', async (_, name: string, description?: string) => {
             return await this.gameManager.createCollection(name, description);
        });

        ipcMain.handle('collections:delete', async (_, id: string) => {
             return await this.gameManager.deleteCollection(id);
        });

        ipcMain.handle('collections:addGame', async (_, collectionId: string, gameId: string) => {
             return await this.gameManager.addGameToCollection(collectionId, gameId);
        });

        ipcMain.handle('collections:removeGame', async (_, collectionId: string, gameId: string) => {
             return await this.gameManager.removeGameFromCollection(collectionId, gameId);
        });
    }
}
