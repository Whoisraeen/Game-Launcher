
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';
import { DatabaseWorkerClient } from './database/dbClient';
import { initDatabase } from './database';

// Controllers
import { GameController } from './controllers/GameController';
import { SystemController } from './controllers/SystemController';

// Services
import { GameManager } from './services/gameManager';
import { SettingsManager } from './services/settingsManager';
import { HardwareMonitor } from './services/HardwareMonitor';
import { FriendsManager } from './services/friendsManager';
import { UniversalModManager } from './services/modManager';
import { NewsManager } from './services/newsManager';
import { RecommendationManager } from './services/RecommendationManager';
import { ImageCacheService } from './services/ImageCacheService';
import { ManualGameService } from './services/manualGameService';
import { SaveManagerService } from './services/SaveManagerService';
import { VideoEditorService } from './services/VideoEditorService';
import { ObsService } from './services/obsService';
import { RGBService } from './services/rgbService';
import { FanControlService } from './services/fanControlService';
import { HLTBService } from './services/hltbService';
import { PerformanceService } from './services/PerformanceService';
import { NotificationService } from './services/notificationService';
import { AchievementService } from './services/achievementService';
import { HealthCheckService } from './services/healthCheckService';
import { CrashAnalyzerService } from './services/crashAnalyzerService';
import { UpdateManagerService } from './services/updateManagerService';
import { ScreenshotService } from './services/screenshotService';
import { DLCTrackerService } from './services/dlcTrackerService';
import { PriceTrackerService } from './services/priceTrackerService';
import { SupabaseService } from './services/supabaseService';
import { GamingSessionService } from './services/gamingSessionService';
import { ExpenseTrackerService } from './services/expenseTrackerService';
import { StoreService } from './services/storeService';
import { ObsConnectionConfig } from './types';

// Services Instances
let gameManager: GameManager;
let settingsManager: SettingsManager;
let hardwareMonitor: HardwareMonitor;
let friendsManager: FriendsManager;
let universalModManager: UniversalModManager;
let newsManager: NewsManager;
let recommendationManager: RecommendationManager;
let imageCacheService: ImageCacheService;
let manualGameService: ManualGameService;
let saveManagerService: SaveManagerService;
let videoEditorService: VideoEditorService;
let obsService: ObsService;
let rgbService: RGBService;
let fanControlService: FanControlService;
let hltbService: HLTBService;
let performanceService: PerformanceService;
let notificationService: NotificationService;
let achievementService: AchievementService;
let healthCheckService: HealthCheckService;
let crashAnalyzerService: CrashAnalyzerService;
let updateManagerService: UpdateManagerService;
let screenshotService: ScreenshotService;
let dlcTrackerService: DLCTrackerService;
let priceTrackerService: PriceTrackerService;
let supabaseService: SupabaseService;
let gamingSessionService: GamingSessionService;
let expenseTrackerService: ExpenseTrackerService;
let storeService: StoreService;

// Controllers Instances
let gameController: GameController;
let systemController: SystemController;

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    frame: false, // Frameless for custom titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a', // Dark background to match theme
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // We might need this for some heavy lifting, but prefer contextBridge
      contextIsolation: false, // For now, to simplify IPC. Ideally true + contextBridge.
      webSecurity: false // Allow loading local images
    },
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
  })

  // Maximize by default for "launcher" feel
  win.maximize();

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// --- App Initialization ---
app.whenReady().then(async () => {
  try {
    // Initialize Database (Worker Client)
    // Note: initDatabase might still be needed for migration if migrator runs in main process?
    // Or we should move migration to worker too.
    // For now, let's assume initDatabase does basic setup or we rely on worker.
    // But initDatabase uses better-sqlite3 directly in main thread.
    // We should probably run it to ensure tables exist before worker starts or let worker handle it.
    // The worker does not currently run migrations.
    // So we keep initDatabase() here for now (synchronous, runs once on startup).
    initDatabase();

    // Initialize Managers/Services
    settingsManager = new SettingsManager();
    gameManager = new GameManager();
    hardwareMonitor = new HardwareMonitor();
    friendsManager = new FriendsManager();
    universalModManager = new UniversalModManager();
    newsManager = new NewsManager();
    recommendationManager = new RecommendationManager();
    imageCacheService = new ImageCacheService();
    manualGameService = new ManualGameService();
    saveManagerService = new SaveManagerService();
    videoEditorService = new VideoEditorService();
    obsService = new ObsService();
    rgbService = new RGBService();
    fanControlService = new FanControlService();
    hltbService = new HLTBService();
    performanceService = new PerformanceService();
    notificationService = new NotificationService();
    achievementService = new AchievementService();
    healthCheckService = new HealthCheckService();
    crashAnalyzerService = new CrashAnalyzerService();
    updateManagerService = new UpdateManagerService();
    screenshotService = new ScreenshotService();
    dlcTrackerService = new DLCTrackerService();
    priceTrackerService = new PriceTrackerService();
    supabaseService = new SupabaseService();
    gamingSessionService = new GamingSessionService();
    expenseTrackerService = new ExpenseTrackerService();
    storeService = new StoreService();

    // Initialize Controllers
    // This registers the game handlers!
    gameController = new GameController(gameManager);
    systemController = new SystemController();

    // --- IPC Handlers Registration ---
    
    // Window Controls
    ipcMain.on('minimize-window', () => {
      win?.minimize()
    })

    ipcMain.on('maximize-window', () => {
      if (win?.isMaximized()) {
        win?.unmaximize()
      } else {
        win?.maximize()
      }
    })

    ipcMain.on('close-window', () => {
      win?.close()
    })

    // NOTE: Game Library IPC Handlers are now registered by GameController.
    
    // Recommendations
    ipcMain.handle('games:getRecommendations', async () => {
      try {
        const games = await gameManager.getAllGames() as any[];
        return recommendationManager.getRecommendations(games);
      } catch (error) {
        console.error('Failed to get recommendations:', error);
        throw error;
      }
    });

    ipcMain.handle('games:getMoodRecommendations', async (_, mood: string, timeConstraint?: string) => {
      try {
        const games = await gameManager.getAllGames() as any[];
        return recommendationManager.getMoodRecommendations(games, mood, timeConstraint);
      } catch (error) {
        console.error('Failed to get mood recommendations:', error);
        throw error;
      }
    });
    
    ipcMain.handle('games:getSmartSuggestion', async (_, criteria: 'backlog' | 'replay' | 'quick' | 'forgotten' | 'random', maxMinutes?: number) => {
        try {
          const games = await gameManager.getAllGames() as any[];
          return recommendationManager.getSmartSuggestion(games, criteria, maxMinutes);
        } catch (error) {
          console.error('Failed to get smart suggestion:', error);
          throw error;
        }
      });

    // RGB IPC Handlers
    ipcMain.handle('rgb:getDevices', async () => {
      try {
        return await rgbService.getDevices();
      } catch (error) {
        console.error('Failed to get RGB devices:', error);
        return [];
      }
    });

    ipcMain.handle('rgb:setMode', async (_, deviceId: string, mode: string, color: string) => {
      try {
        return await rgbService.setMode(deviceId, mode, color);
      } catch (error) {
        console.error('Failed to set RGB mode:', error);
        return false;
      }
    });

    ipcMain.handle('rgb:syncGame', async (_, gameId: string) => {
      try {
        // Mock implementation for game sync
        console.log(`Syncing RGB for game ${gameId}`);
        return true;
      } catch (error) {
        console.error('Failed to sync RGB for game:', error);
        return false;
      }
    });

    // Settings IPC Handlers
    ipcMain.handle('settings:getAll', () => {
      return settingsManager.getAllSettings();
    });

    ipcMain.handle('settings:set', (_, key: string, value: any) => {
      return settingsManager.setSetting(key, value);
    });

    ipcMain.handle('settings:reset', () => {
      return settingsManager.resetSettings();
    });

    // System IPC Handlers
    ipcMain.handle('system:getStats', async () => {
      return await hardwareMonitor.getStats();
    });

    ipcMain.handle('system:getProcessList', async () => {
      return await hardwareMonitor.getProcessList();
    });

    // Friends IPC Handlers
    ipcMain.handle('friends:getAll', () => {
      return friendsManager.getAllFriends();
    });

    ipcMain.handle('friends:add', (_, friend: any) => {
      return friendsManager.addFriend(friend);
    });

    ipcMain.handle('friends:remove', (_, id: string) => {
      return friendsManager.removeFriend(id);
    });

    ipcMain.handle('friends:updateStatus', (_, id: string, status: string) => {
      return friendsManager.updateFriendStatus(id, status);
    });

    // Mod Manager IPC Handlers
    ipcMain.handle('mods:scan', async (_, gameId: string) => {
      try {
        const game = await gameManager.dbClient.get('SELECT * FROM games WHERE id = ?', gameId);
        if (!game) throw new Error('Game not found');
        return await universalModManager.scanMods(gameId, game.install_path);
      } catch (error) {
        console.error('Failed to scan mods:', error);
        throw error;
      }
    });

    ipcMain.handle('mods:install', async (_, gameId: string, modFilePath: string) => {
      try {
        return await universalModManager.installMod(gameId, modFilePath);
      } catch (error) {
        console.error('Failed to install mod:', error);
        throw error;
      }
    });

    ipcMain.handle('mods:toggle', async (_, modId: string, enabled: boolean) => {
      try {
        return await universalModManager.toggleMod(modId, enabled);
      } catch (error) {
        console.error('Failed to toggle mod:', error);
        throw error;
      }
    });

    ipcMain.handle('mods:uninstall', async (_, modId: string) => {
      try {
        return await universalModManager.uninstallMod(modId);
      } catch (error) {
        console.error('Failed to uninstall mod:', error);
        throw error;
      }
    });

    ipcMain.handle('mods:getLoadOrder', async (_, gameId: string) => {
      try {
        return await universalModManager.getLoadOrder(gameId);
      } catch (error) {
        console.error('Failed to get load order:', error);
        throw error;
      }
    });

    ipcMain.handle('mods:updateLoadOrder', async (_, gameId: string, modIds: string[]) => {
      try {
        return await universalModManager.updateLoadOrder(gameId, modIds);
      } catch (error) {
        console.error('Failed to update load order:', error);
        throw error;
      }
    });

    // News IPC Handlers
    ipcMain.handle('news:getForGame', async (_, gameId: string) => {
      try {
        const game = await gameManager.dbClient.get('SELECT * FROM games WHERE id = ?', gameId);
        if (!game) return [];
        return await newsManager.getGameNews(game.title);
      } catch (error) {
        console.error('Failed to get game news:', error);
        return [];
      }
    });

    ipcMain.handle('news:getGeneral', async () => {
      try {
        return await newsManager.getGeneralGamingNews();
      } catch (error) {
        console.error('Failed to get general news:', error);
        return [];
      }
    });

    // Manual Game IPC Handlers
    ipcMain.handle('manual:addGame', async (_, gameData: any) => {
      try {
        return await manualGameService.addManualGame(gameData);
      } catch (error) {
        console.error('Failed to add manual game:', error);
        throw error;
      }
    });

    ipcMain.handle('manual:scanDirectory', async (_, directory: string) => {
      try {
        return await manualGameService.scanDirectory(directory);
      } catch (error) {
        console.error('Failed to scan directory:', error);
        throw error;
      }
    });

    ipcMain.handle('manual:detectExecutable', async (_, directory: string) => {
      try {
        return await manualGameService.detectExecutable(directory);
      } catch (error) {
        console.error('Failed to detect executable:', error);
        throw error;
      }
    });
    
    // Notification IPC Handlers
    ipcMain.handle('notifications:send', (_, notification: any) => {
        try {
          notificationService.sendNotification(notification);
          return true;
        } catch (error) {
          console.error('Failed to send notification:', error);
          return false;
        }
    });
    
    ipcMain.handle('notifications:getHistory', () => {
        try {
          return notificationService.getHistory();
        } catch (error) {
          console.error('Failed to get notification history:', error);
          return [];
        }
    });
    
    ipcMain.handle('notifications:clearHistory', () => {
        try {
          notificationService.clearHistory();
          return true;
        } catch (error) {
          console.error('Failed to clear notification history:', error);
          return false;
        }
    });
    
    // Achievement IPC Handlers
    ipcMain.handle('achievements:getGameAchievements', (_, gameId: string) => {
        try {
          return achievementService.getGameAchievements(gameId);
        } catch (error) {
          console.error('Failed to get game achievements:', error);
          return [];
        }
    });
    
    ipcMain.handle('achievements:getGameStats', (_, gameId: string) => {
        try {
          return achievementService.getGameAchievementStats(gameId);
        } catch (error) {
          console.error('Failed to get game achievement stats:', error);
          return { total: 0, unlocked: 0, percent: 0 };
        }
    });
    
    ipcMain.handle('achievements:syncSteam', async (_, gameId: string, steamAppId: string) => {
        try {
          return await achievementService.syncSteamAchievements(gameId, steamAppId);
        } catch (error) {
          console.error('Failed to sync Steam achievements:', error);
          return false;
        }
    });
    
    ipcMain.handle('achievements:syncAllSteam', async () => {
        try {
          return await achievementService.syncAllSteamAchievements();
        } catch (error) {
          console.error('Failed to sync all Steam achievements:', error);
          return { success: 0, failed: 0 };
        }
    });
    
    ipcMain.handle('achievements:getRecentlyUnlocked', (_, limit: number = 10) => {
        try {
          return achievementService.getRecentlyUnlocked(limit);
        } catch (error) {
          console.error('Failed to get recently unlocked achievements:', error);
          return [];
        }
    });
    
    ipcMain.handle('achievements:getRarestUnlocked', (_, limit: number = 10) => {
        try {
          return achievementService.getRarestUnlocked(limit);
        } catch (error) {
          console.error('Failed to get rarest unlocked achievements:', error);
          return [];
        }
    });
    
    ipcMain.handle('achievements:getOverallProgress', () => {
        try {
          return achievementService.getOverallProgress();
        } catch (error) {
          console.error('Failed to get overall achievement progress:', error);
          return { totalGames: 0, gamesWithAchievements: 0, totalAchievements: 0, unlockedAchievements: 0, percent: 0 };
        }
    });
    
    // Health Check IPC Handlers
    ipcMain.handle('health:check', async (_, gameName?: string) => {
        try {
          return await healthCheckService.runHealthCheck(gameName);
        } catch (error) {
          console.error('Failed to run health check:', error);
          throw error;
        }
    });
    
    // Crash Analyzer IPC Handlers
    ipcMain.handle('crash:analyze', async (_, gameId: string, gameName: string) => {
        try {
          return await crashAnalyzerService.analyzeCrash(gameId, gameName);
        } catch (error) {
          console.error('Failed to analyze crash:', error);
          throw error;
        }
    });
    
    ipcMain.handle('crash:getReports', async (_, gameId: string) => {
        try {
          return crashAnalyzerService.getCrashReports(gameId);
        } catch (error) {
          console.error('Failed to get crash reports:', error);
          throw error;
        }
    });
    
    ipcMain.handle('crash:voteSolution', async (_, crashId: string, solutionId: string, isUpvote: boolean) => {
        try {
          crashAnalyzerService.voteSolution(crashId, solutionId, isUpvote);
          return { success: true };
        } catch (error) {
          console.error('Failed to vote solution:', error);
          throw error;
        }
    });
    
    // Update Manager IPC Handlers
    ipcMain.handle('updates:checkAll', async () => {
        try {
          return await updateManagerService.checkForUpdates();
        } catch (error) {
          console.error('Failed to check for updates:', error);
          throw error;
        }
    });
    
    ipcMain.handle('updates:getPending', async () => {
        try {
          return updateManagerService.getPendingUpdates();
        } catch (error) {
          console.error('Failed to get pending updates:', error);
          throw error;
        }
    });
    
    ipcMain.handle('updates:getHistory', async (_, gameId: string) => {
        try {
          return updateManagerService.getGameUpdateHistory(gameId);
        } catch (error) {
          console.error('Failed to get update history:', error);
          throw error;
        }
    });
    
    ipcMain.handle('updates:trigger', async (_, updateId: string) => {
        try {
          return await updateManagerService.triggerUpdate(updateId);
        } catch (error) {
          console.error('Failed to trigger update:', error);
          throw error;
        }
    });
    
    ipcMain.handle('updates:dismiss', async (_, updateId: string) => {
        try {
          updateManagerService.dismissUpdate(updateId);
          return { success: true };
        } catch (error) {
          console.error('Failed to dismiss update:', error);
          throw error;
        }
    });
    
    ipcMain.handle('updates:markInstalled', async (_, updateId: string) => {
        try {
          updateManagerService.markAsInstalled(updateId);
          return { success: true };
        } catch (error) {
          console.error('Failed to mark update as installed:', error);
          throw error;
        }
    });
    
    // Screenshot Manager IPC Handlers
    ipcMain.handle('screenshots:scan', async () => {
        try {
          return await screenshotService.scanForScreenshots();
        } catch (error) {
          console.error('Failed to scan for screenshots:', error);
          throw error;
        }
    });
    
    ipcMain.handle('screenshots:getAll', async (_, limit?: number, offset?: number) => {
        try {
          return screenshotService.getAllScreenshots(limit, offset);
        } catch (error) {
          console.error('Failed to get all screenshots:', error);
          throw error;
        }
    });
    
    ipcMain.handle('screenshots:getGame', async (_, gameId: string) => {
        try {
          return screenshotService.getGameScreenshots(gameId);
        } catch (error) {
          console.error('Failed to get game screenshots:', error);
          throw error;
        }
    });
    
    ipcMain.handle('screenshots:getFavorites', async () => {
        try {
          return screenshotService.getFavoriteScreenshots();
        } catch (error) {
          console.error('Failed to get favorite screenshots:', error);
          throw error;
        }
    });
    
    ipcMain.handle('screenshots:toggleFavorite', async (_, screenshotId: string) => {
        try {
          screenshotService.toggleFavorite(screenshotId);
          return { success: true };
        } catch (error) {
          console.error('Failed to toggle favorite:', error);
          throw error;
        }
    });
    
    ipcMain.handle('screenshots:addTags', async (_, screenshotId: string, tags: string[]) => {
        try {
          screenshotService.addTags(screenshotId, tags);
          return { success: true };
        } catch (error) {
          console.error('Failed to add tags:', error);
          throw error;
        }
    });
    
    ipcMain.handle('screenshots:updateCaption', async (_, screenshotId: string, caption: string) => {
        try {
          screenshotService.updateCaption(screenshotId, caption);
          return { success: true };
        } catch (error) {
          console.error('Failed to update caption:', error);
          throw error;
        }
    });
    
    ipcMain.handle('screenshots:delete', async (_, screenshotId: string, deleteFile: boolean) => {
        try {
          await screenshotService.deleteScreenshot(screenshotId, deleteFile);
          return { success: true };
        } catch (error) {
          console.error('Failed to delete screenshot:', error);
          throw error;
        }
    });
    
    ipcMain.handle('screenshots:search', async (_, query: string) => {
        try {
          return screenshotService.searchScreenshots(query);
        } catch (error) {
          console.error('Failed to search screenshots:', error);
          throw error;
        }
    });
    
    // DLC Tracker IPC Handlers
    ipcMain.handle('dlc:scan', async () => {
        try {
          return await dlcTrackerService.scanForDLCs();
        } catch (error) {
          console.error('Failed to scan for DLCs:', error);
          throw error;
        }
    });
    
    ipcMain.handle('dlc:scanGame', async (_, gameId: string, platform: string, platformId: string) => {
        try {
          return await dlcTrackerService.scanGameDLCs(gameId, platform, platformId);
        } catch (error) {
          console.error('Failed to scan game DLCs:', error);
          throw error;
        }
    });
    
    ipcMain.handle('dlc:getAll', async () => {
        try {
          return dlcTrackerService.getAllDLCs();
        } catch (error) {
          console.error('Failed to get all DLCs:', error);
          throw error;
        }
    });
    
    ipcMain.handle('dlc:getGame', async (_, gameId: string) => {
        try {
          return dlcTrackerService.getGameDLCs(gameId);
        } catch (error) {
          console.error('Failed to get game DLCs:', error);
          throw error;
        }
    });
    
    ipcMain.handle('dlc:getUnowned', async () => {
        try {
          return dlcTrackerService.getUnownedDLCs();
        } catch (error) {
          console.error('Failed to get unowned DLCs:', error);
          throw error;
        }
    });
    
    ipcMain.handle('dlc:markOwned', async (_, dlcId: string) => {
        try {
          dlcTrackerService.markAsOwned(dlcId);
          return { success: true };
        } catch (error) {
          console.error('Failed to mark DLC as owned:', error);
          throw error;
        }
    });
    
    ipcMain.handle('dlc:markInstalled', async (_, dlcId: string) => {
        try {
          dlcTrackerService.markAsInstalled(dlcId);
          return { success: true };
        } catch (error) {
          console.error('Failed to mark DLC as installed:', error);
          throw error;
        }
    });
    
    ipcMain.handle('dlc:getStats', async () => {
        try {
          return dlcTrackerService.getDLCStats();
        } catch (error) {
          console.error('Failed to get DLC stats:', error);
          throw error;
        }
    });
    
    ipcMain.handle('dlc:getRecent', async () => {
        try {
          return dlcTrackerService.getRecentDLCReleases();
        } catch (error) {
          console.error('Failed to get recent DLC releases:', error);
          throw error;
        }
    });
    
    // Wishlist & Price Tracker IPC Handlers
    ipcMain.handle('wishlist:add', async (_, game: any) => {
        try {
          return priceTrackerService.addToWishlist(game);
        } catch (error) {
          console.error('Failed to add to wishlist:', error);
          throw error;
        }
    });
    
    ipcMain.handle('wishlist:remove', async (_, wishlistGameId: string) => {
        try {
          priceTrackerService.removeFromWishlist(wishlistGameId);
          return { success: true };
        } catch (error) {
          console.error('Failed to remove from wishlist:', error);
          throw error;
        }
    });
    
    ipcMain.handle('wishlist:getAll', async () => {
        try {
          return priceTrackerService.getAllWishlistGames();
        } catch (error) {
          console.error('Failed to get wishlist games:', error);
          throw error;
        }
    });
    
    ipcMain.handle('wishlist:getDiscounted', async () => {
        try {
          return priceTrackerService.getDiscountedGames();
        } catch (error) {
          console.error('Failed to get discounted games:', error);
          throw error;
        }
    });
    
    ipcMain.handle('wishlist:setTargetPrice', async (_, wishlistGameId: string, targetPrice: number, enabled: boolean) => {
        try {
          priceTrackerService.setTargetPrice(wishlistGameId, targetPrice, enabled);
          return { success: true };
        } catch (error) {
          console.error('Failed to set target price:', error);
          throw error;
        }
    });
    
    ipcMain.handle('wishlist:checkPrices', async () => {
        try {
          return await priceTrackerService.checkPrices();
        } catch (error) {
          console.error('Failed to check prices:', error);
          throw error;
        }
    });
    
    ipcMain.handle('wishlist:getAlerts', async () => {
        try {
          return priceTrackerService.getPriceAlerts(true);
        } catch (error) {
          console.error('Failed to get price alerts:', error);
          throw error;
        }
    });
    
    ipcMain.handle('wishlist:dismissAlert', async (_, alertId: string) => {
        try {
          priceTrackerService.dismissAlert(alertId);
          return { success: true };
        } catch (error) {
          console.error('Failed to dismiss alert:', error);
          throw error;
        }
    });
    
    ipcMain.handle('wishlist:getStats', async () => {
        try {
          return priceTrackerService.getWishlistStats();
        } catch (error) {
          console.error('Failed to get wishlist stats:', error);
          throw error;
        }
    });
    
    // Supabase Cloud IPC Handlers
    ipcMain.handle('cloud:signUp', async (_, email: string, password: string, username: string) => {
        try {
          return await supabaseService.signUp(email, password, username);
        } catch (error) {
          console.error('Failed to sign up:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:signIn', async (_, email: string, password: string) => {
        try {
          return await supabaseService.signIn(email, password);
        } catch (error) {
          console.error('Failed to sign in:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:signOut', async () => {
        try {
          return await supabaseService.signOut();
        } catch (error) {
          console.error('Failed to sign out:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:getCurrentUser', async () => {
        try {
          return supabaseService.getCurrentUser();
        } catch (error) {
          console.error('Failed to get current user:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:isAuthenticated', async () => {
        try {
          return supabaseService.isAuthenticated();
        } catch (error) {
          console.error('Failed to check authentication:', error);
          return false;
        }
    });
    
    ipcMain.handle('cloud:syncProfileToCloud', async () => {
        try {
          return await supabaseService.syncProfileToCloud();
        } catch (error) {
          console.error('Failed to sync profile to cloud:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:syncProfileFromCloud', async () => {
        try {
          return await supabaseService.syncProfileFromCloud();
        } catch (error) {
          console.error('Failed to sync profile from cloud:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:uploadSaveGame', async (_, gameId: string, gameName: string, platform: string, filePath: string) => {
        try {
          return await supabaseService.uploadSaveGame(gameId, gameName, platform, filePath);
        } catch (error) {
          console.error('Failed to upload save game:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:downloadSaveGame', async (_, saveId: string, destinationPath: string) => {
        try {
          return await supabaseService.downloadSaveGame(saveId, destinationPath);
        } catch (error) {
          console.error('Failed to download save game:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:getGameCloudSaves', async (_, gameId: string) => {
        try {
          return await supabaseService.getGameCloudSaves(gameId);
        } catch (error) {
          console.error('Failed to get game cloud saves:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:uploadScreenshot', async (_, screenshot: any) => {
        try {
          return await supabaseService.uploadScreenshot(screenshot);
        } catch (error) {
          console.error('Failed to upload screenshot:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:getMyScreenshots', async () => {
        try {
          return await supabaseService.getMyCloudScreenshots();
        } catch (error) {
          console.error('Failed to get my screenshots:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:getPublicScreenshots', async (_, limit: number) => {
        try {
          return await supabaseService.getPublicScreenshots(limit);
        } catch (error) {
          console.error('Failed to get public screenshots:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:likeScreenshot', async (_, screenshotId: string) => {
        try {
          return await supabaseService.likeScreenshot(screenshotId);
        } catch (error) {
          console.error('Failed to like screenshot:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:syncAchievements', async () => {
        try {
          return await supabaseService.syncAchievementsToCloud();
        } catch (error) {
          console.error('Failed to sync achievements:', error);
          throw error;
        }
    });
    
    ipcMain.handle('cloud:getStorageUsage', async () => {
        try {
          return await supabaseService.getStorageUsage();
        } catch (error) {
          console.error('Failed to get storage usage:', error);
          throw error;
        }
    });
    
    // Gaming Session Handlers
    ipcMain.handle('session:create', async (_, session: any) => {
        try {
          return gamingSessionService.createSession(session);
        } catch (error) {
          console.error('Failed to create session:', error);
          throw error;
        }
    });
    
    ipcMain.handle('session:getAll', async () => {
        try {
          return gamingSessionService.getAllSessions();
        } catch (error) {
          console.error('Failed to get sessions:', error);
          throw error;
        }
    });
    
    ipcMain.handle('session:getUpcoming', async (_, limit: number) => {
        try {
          return gamingSessionService.getUpcomingSessions(limit);
        } catch (error) {
          console.error('Failed to get upcoming sessions:', error);
          throw error;
        }
    });
    
    ipcMain.handle('session:getForMonth', async (_, year: number, month: number) => {
        try {
          return gamingSessionService.getSessionsForMonth(year, month);
        } catch (error) {
          console.error('Failed to get sessions for month:', error);
          throw error;
        }
    });
    
    ipcMain.handle('session:update', async (_, id: string, updates: any) => {
        try {
          return gamingSessionService.updateSession(id, updates);
        } catch (error) {
          console.error('Failed to update session:', error);
          throw error;
        }
    });
    
    ipcMain.handle('session:delete', async (_, id: string) => {
        try {
          return gamingSessionService.deleteSession(id);
        } catch (error) {
          console.error('Failed to delete session:', error);
          throw error;
        }
    });
    
    // Expense Tracker Handlers
    ipcMain.handle('expenses:addPurchase', async (_, purchase: any) => {
        try {
          return expenseTrackerService.addPurchase(purchase);
        } catch (error) {
          console.error('Failed to add purchase:', error);
          throw error;
        }
    });
    
    ipcMain.handle('expenses:getAll', async () => {
        try {
          return expenseTrackerService.getAllPurchases();
        } catch (error) {
          console.error('Failed to get purchases:', error);
          throw error;
        }
    });
    
    ipcMain.handle('expenses:getStats', async (_, year?: number) => {
        try {
          return expenseTrackerService.getExpenseStats(year);
        } catch (error) {
          console.error('Failed to get expense stats:', error);
          throw error;
        }
    });
    
    ipcMain.handle('expenses:delete', async (_, id: string) => {
        try {
          return expenseTrackerService.deletePurchase(id);
        } catch (error) {
          console.error('Failed to delete purchase:', error);
          throw error;
        }
    });
    
    ipcMain.handle('expenses:importFromLibrary', async () => {
        try {
          return await expenseTrackerService.importFromLibrary();
        } catch (error) {
          console.error('Failed to import from library:', error);
          throw error;
        }
    });
    
    // Fan Control IPC
    ipcMain.handle('fans:getData', async () => {
        try {
          return await fanControlService.getFanData();
        } catch (error) {
          console.error('Failed to get fan data:', error);
          return [];
        }
    });
    
    ipcMain.handle('fans:setSpeed', async (_, id: string, value: number) => {
        try {
          return await fanControlService.setFanSpeed(id, value);
        } catch (error) {
          console.error('Failed to set fan speed:', error);
          return false;
        }
    });
    
    ipcMain.handle('fans:setCurve', async (_, id: string, points: any[]) => {
        try {
          return await fanControlService.setFanCurve(id, points);
        } catch (error) {
          console.error('Failed to set fan curve:', error);
          return false;
        }
    });
    
    // OBS IPC
    ipcMain.handle('obs:setConnectionConfig', (_, config: ObsConnectionConfig) => {
      obsService.setConnectionConfig(config);
    });
  
    ipcMain.handle('obs:getConnectionConfig', () => {
      return obsService.getConnectionConfig();
    });
  
    ipcMain.handle('obs:connect', () => {
      return obsService.connect();
    });
  
    ipcMain.handle('obs:disconnect', () => {
      return obsService.disconnect();
    });
  
    ipcMain.handle('obs:isConnected', () => {
      return obsService.isObsConnected();
    });
  
    ipcMain.handle('obs:getSceneList', () => {
      return obsService.getSceneList();
    });
  
    ipcMain.handle('obs:setCurrentScene', (_, sceneName: string) => {
      return obsService.setCurrentScene(sceneName);
    });
  
    ipcMain.handle('obs:getStreamStatus', () => {
      return obsService.getStreamStatus();
    });
  
    ipcMain.handle('obs:startStreaming', () => {
      return obsService.startStreaming();
    });
  
    ipcMain.handle('obs:stopStreaming', () => {
      return obsService.stopStreaming();
    });
  
    ipcMain.handle('obs:startRecording', () => {
      return obsService.startRecording();
    });
  
    ipcMain.handle('obs:stopRecording', () => {
      return obsService.stopRecording();
    });
  
    // Video Editor IPC
    ipcMain.handle('video:metadata', async (_, videoPath: string) => {
      try {
        return await videoEditorService.getVideoMetadata(videoPath);
      } catch (error) {
        console.error('Failed to get video metadata:', error);
        throw error;
      }
    });
  
    ipcMain.handle('video:cut', async (_, inputPath: string, outputPath: string, startTime: number, durationOrEndTime: number, useEndTime: boolean) => {
      try {
        return await videoEditorService.cutVideo(inputPath, outputPath, startTime, durationOrEndTime, useEndTime);
      } catch (error) {
        console.error('Failed to cut video:', error);
        throw error;
      }
    });
  
    // Save Manager IPC
    ipcMain.handle('saves:getConfig', () => {
      return {
        configs: saveManagerService.getConfigs(),
        cloudPath: saveManagerService.getCloudPath(),
        cloudSyncEnabled: saveManagerService.getCloudSyncEnabled()
      };
    });
  
    ipcMain.handle('saves:setCloudSyncEnabled', (_, enabled: boolean) => {
      return saveManagerService.setCloudSyncEnabled(enabled);
    });
  
    ipcMain.handle('saves:setConfig', (_, cloudPath: string) => {
      return saveManagerService.setCloudPath(cloudPath);
    });
  
    ipcMain.handle('saves:watch', (_, gameId: string, path: string) => {
      return saveManagerService.addGamePath(gameId, path);
    });
  
    ipcMain.handle('saves:unwatch', (_, gameId: string) => {
      return saveManagerService.removeGamePath(gameId);
    });
  
    ipcMain.handle('saves:backup', (_, gameId: string) => {
      return saveManagerService.createBackup(gameId, false);
    });
  
    ipcMain.handle('saves:getHistory', (_, gameId: string) => {
      return saveManagerService.getBackups(gameId);
    });
  
    ipcMain.handle('saves:restore', (_, backupPath: string, targetPath: string) => {
      return saveManagerService.restoreBackup(backupPath, targetPath);
    });
  
    ipcMain.handle('saves:detect', (_, title: string, developer?: string) => {
      return saveManagerService.detectSavePath(title, developer);
    });
  
    ipcMain.handle('saves:getSize', (_, gameId: string) => {
      return saveManagerService.getTotalBackupSize(gameId);
    });
  
    // Image Cache IPC
    ipcMain.handle('images:cache', async (_, url: string) => {
      try {
        return await imageCacheService.cacheImage(url, 'temp_' + Date.now(), 'cover');
      } catch (error) {
        console.error('Failed to cache image:', error);
        return url; // Fallback to original
      }
    });
  
    // File System IPC (For INI Editor)
    ipcMain.handle('fs:readText', async (_, filePath: string) => {
        const fs = await import('fs');
        if (!fs.existsSync(filePath)) throw new Error('File not found');
        return fs.readFileSync(filePath, 'utf-8');
    });
  
    ipcMain.handle('fs:writeText', async (_, filePath: string, content: string) => {
        const fs = await import('fs');
        // Backup first
        if (fs.existsSync(filePath)) {
            fs.copyFileSync(filePath, `${filePath}.bak`);
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    });
  
    // Emulation Auto-Detect
    ipcMain.handle('emulators:autoDetect', async () => {
      try {
        await gameManager.autoDetectEmulators();
        return gameManager.getEmulators();
      } catch (error) {
        console.error('Failed to auto-detect emulators:', error);
        throw error;
      }
    });
  
    // Metadata Search
    ipcMain.handle('metadata:search', async (_, title: string) => {
      try {
        return await gameManager.searchMetadata(title);
      } catch (error) {
        console.error('Failed to search metadata:', error);
        throw error;
      }
    });
    
    // Connect Services
    gameManager.setPerformanceService(performanceService);
    
    // Check for updates after a short delay
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000);

    createWindow()
  } catch (error) {
    console.error('Failed to initialize services:', error);
    app.quit();
  }
})
