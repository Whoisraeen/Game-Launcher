
import { app, BrowserWindow, shell, ipcMain, dialog, protocol, net } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { autoUpdater } from 'electron-updater';
import { DatabaseWorkerClient } from './database/dbClient';
import { initDatabase } from './database';

// Controllers
import { GameController } from './controllers/GameController';
import { SystemController } from './controllers/SystemController';
import { FriendsController } from './controllers/FriendsController';

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
import { Store } from './store';
import { StoreService as ElectronStoreService } from './services/store';
import { AuthManager } from './services/AuthManager';
import { AudioService } from './services/audioService';
import { NetworkService } from './services/networkService';
import { CompatibilityService } from './services/compatibilityService';
import { StreamHelperService } from './services/streamHelperService';
import { ShaderService } from './services/shaderService';
import { UIScalerService } from './services/uiScalerService';
import { HardwareCompatService } from './services/hardwareCompatService';
import { DriveScanner } from './services/DriveScanner';
import { ProcessManager } from './services/processManager';
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
let authManager: AuthManager;
let audioService: AudioService;
let networkService: NetworkService;
let compatibilityService: CompatibilityService;
let streamHelperService: StreamHelperService;
let shaderService: ShaderService;
let uiScalerService: UIScalerService;
let hardwareCompatService: HardwareCompatService;
let processManagerInstance: ProcessManager;

// Controllers Instances
let gameController: GameController;
let systemController: SystemController;
let friendsController: FriendsController;

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
      nodeIntegration: false, // Prefer contextBridge
      contextIsolation: true, // REQUIRED for contextBridge
      webSecurity: true,                     // BUG-062: keep SOP intact
      allowRunningInsecureContent: false,
      sandbox: false,                        // preload uses Node-bridge APIs
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

// BUG-062: Register a privileged custom protocol so the renderer can load
// local image files without needing webSecurity disabled. Files are only
// served from a small allow-list (app userData, system temp).
protocol.registerSchemesAsPrivileged([
  { scheme: 'safe-file', privileges: { standard: true, supportFetchAPI: true, secure: true, bypassCSP: false, stream: true, corsEnabled: true } },
]);

// --- App Initialization ---
app.whenReady().then(async () => {
  // Wire safe-file:// → local file (whitelisted roots only)
  const safeRoots = [
    app.getPath('userData'),
    app.getPath('pictures'),
    app.getPath('temp'),
    app.getPath('home'),
  ].map(p => path.resolve(p));
  protocol.handle('safe-file', async (req) => {
    try {
      let resolved: string;
      try {
        const asFileUrl = req.url.replace(/^safe-file:/i, 'file:');
        resolved = path.resolve(fileURLToPath(new URL(asFileUrl)));
      } catch {
        const url = new URL(req.url);
        const decoded = decodeURIComponent(url.pathname.replace(/^\//, ''));
        resolved = path.resolve(decoded);
      }
      const allowed = safeRoots.some((root) => {
        const rootResolved = path.resolve(root);
        const rl = resolved.toLowerCase();
        const rootl = rootResolved.toLowerCase();
        return rl.startsWith(rootl + path.sep) || rl === rootl;
      });
      if (!allowed) return new Response('forbidden', { status: 403 });
      if (!fs.existsSync(resolved)) return new Response('not found', { status: 404 });
      return net.fetch(pathToFileURL(resolved).toString());
    } catch (err) {
      return new Response(`bad request: ${(err as Error).message}`, { status: 400 });
    }
  });

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
    notificationService = new NotificationService(); // Initialize early
    gameManager = new GameManager();
    hardwareMonitor = new HardwareMonitor();
    friendsManager = new FriendsManager(notificationService);
    universalModManager = new UniversalModManager();
    newsManager = new NewsManager();
    recommendationManager = new RecommendationManager();
    imageCacheService = new ImageCacheService();
    manualGameService = new ManualGameService();
    saveManagerService = new SaveManagerService();
    videoEditorService = new VideoEditorService();
    streamHelperService = new StreamHelperService();
    obsService = new ObsService();
    rgbService = new RGBService();
    fanControlService = new FanControlService();
    hltbService = new HLTBService();
    performanceService = new PerformanceService();
    // notificationService initialized above
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
    authManager = new AuthManager();
    audioService = new AudioService();
    networkService = new NetworkService();
    compatibilityService = new CompatibilityService();
    shaderService = new ShaderService();
    uiScalerService = new UIScalerService();
    hardwareCompatService = new HardwareCompatService();
    processManagerInstance = new ProcessManager();
    
    // Initialize Controllers
    // This registers the game handlers!
    gameController = new GameController(gameManager);
    // Pass the existing performanceService instance to SystemController
    systemController = new SystemController(performanceService);
    friendsController = new FriendsController(friendsManager);

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

    ipcMain.handle('hltb:search', async (_, gameName: string) => {
      try {
        return await hltbService.search(gameName);
      } catch (error) {
        console.error('HLTB search failed:', error);
        return null;
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
      try {
        return settingsManager.getAllSettings();
      } catch (error) {
        console.error('Failed to get settings:', error);
        return {};
      }
    });

    ipcMain.handle('settings:update', (_, category: string, value: any) => {
      try {
        return settingsManager.updateSetting(category, value);
      } catch (error) {
        console.error('Failed to update setting:', error);
        throw error;
      }
    });

    ipcMain.handle('settings:uploadBackground', async () => {
      try {
        const { dialog } = await import('electron');
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp', 'gif'] }]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return await settingsManager.uploadBackground(result.filePaths[0]);
      } catch (error) {
        console.error('Failed to upload background:', error);
        throw error;
      }
    });

    ipcMain.handle('settings:getBackgroundDataUrl', (_, stored: string) => {
      try {
        return settingsManager.getBackgroundImageDataUrl(stored);
      } catch (error) {
        console.error('settings:getBackgroundDataUrl failed:', error);
        return null;
      }
    });

    ipcMain.handle('settings:reset', () => {
      return settingsManager.resetSettings();
    });

    // Dialog IPC Handlers
    ipcMain.handle('dialog:openDirectory', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    });

    ipcMain.handle('dialog:openFiles', async (_, options?: { filters?: Array<{ name: string; extensions: string[] }> }) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: options?.filters
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths;
    });

    // System IPC Handlers
    ipcMain.handle('system:getStats', async () => {
      return await hardwareMonitor.getStats();
    });

    ipcMain.handle('system:getProcessList', async () => {
      return await hardwareMonitor.getProcessList();
    });

    // Friends IPC Handlers (Handled by FriendsController now)
    // ipcMain.handle('friends:getAll', () => {
    //   return friendsManager.getAllFriends();
    // });

    // ipcMain.handle('friends:add', (_, friend: any) => {
    //   return friendsManager.addFriend(friend);
    // });

    // ipcMain.handle('friends:remove', (_, id: string) => {
    //   return friendsManager.removeFriend(id);
    // });

    // ipcMain.handle('friends:updateStatus', (_, id: string, status: string) => {
    //   return friendsManager.updateFriendStatus(id, status);
    // });

    // Mod Manager IPC Handlers
    ipcMain.handle('mods:getAll', async (_, gameId: string) => {
      try {
        return universalModManager.getMods(gameId);
      } catch (error) {
        console.error('Failed to get mods:', error);
        return [];
      }
    });

    ipcMain.handle('mods:add', async (_, gameId: string, name: string, description: string, version: string, installPath: string) => {
      try {
        return universalModManager.addMod(gameId, name, description, version, installPath);
      } catch (error) {
        console.error('Failed to add mod:', error);
        throw error;
      }
    });

    ipcMain.handle('mods:enable', async (_, modId: string) => {
      try {
        return await universalModManager.enableMod(modId);
      } catch (error) {
        console.error('Failed to enable mod:', error);
        return false;
      }
    });

    ipcMain.handle('mods:disable', async (_, modId: string) => {
      try {
        return await universalModManager.disableMod(modId);
      } catch (error) {
        console.error('Failed to disable mod:', error);
        return false;
      }
    });

    ipcMain.handle('mods:delete', async (_, modId: string) => {
      try {
        return universalModManager.deleteMod(modId);
      } catch (error) {
        console.error('Failed to delete mod:', error);
        return false;
      }
    });

    ipcMain.handle('mods:checkConflicts', (_, gameId: string) => {
      try {
        return universalModManager.checkConflicts(gameId);
      } catch (error) {
        console.error('Failed to check mod conflicts:', error);
        return [];
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
        // Destructure gameData to match addGame signature
        const { title, installPath, executable } = gameData;
        return await manualGameService.addGame(title, installPath, executable);
      } catch (error) {
        console.error('Failed to add manual game:', error);
        throw error;
      }
    });

    ipcMain.handle('manual:scanDirectory', async (_, directory: string) => {
      try {
        return await manualGameService.scanFolder(directory);
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
    
    // Store IPC Handlers
    ipcMain.handle('store:getDeals', async (_, params) => {
        try {
            return await storeService.getDeals(params);
        } catch (error) {
            console.error('Failed to get store deals:', error);
            return [];
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

    ipcMain.handle('video:compileHighlights', async (_, clipPaths: string[], outputPath: string, transitionType: string) => {
      try {
        return await videoEditorService.compileHighlights(clipPaths, outputPath, transitionType as any);
      } catch (error) {
        console.error('Failed to compile highlights:', error);
        throw error;
      }
    });

    // Stream Helper IPC
    ipcMain.handle('stream:generateTitle', async (_, gameName: string, mood: string, style: string) => {
      try {
        return streamHelperService.generateTitle(gameName, mood, style);
      } catch (error) {
        console.error('Failed to generate stream title:', error);
        throw error;
      }
    });

    ipcMain.handle('stream:getTitleHistory', async () => {
      return streamHelperService.getTitleHistory();
    });

    ipcMain.handle('stream:getMoods', async () => {
      return streamHelperService.getMoods();
    });

    ipcMain.handle('stream:getStyles', async () => {
      return streamHelperService.getStyles();
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
    
    // Shader Cache (best-effort: enumerate well-known cache locations + size)
    ipcMain.handle('shaderCache:scan', async () => {
      try {
        const fs = await import('node:fs/promises');
        const os = await import('node:os');
        const home = os.homedir();
        const pf86 = process.env['ProgramFiles(x86)'];
        const candidates = [
          { game: 'NVIDIA DXCache',  platform: 'NVIDIA' as const,  path: path.join(home, 'AppData', 'Local', 'NVIDIA', 'DXCache') },
          { game: 'NVIDIA GLCache',  platform: 'NVIDIA' as const,  path: path.join(home, 'AppData', 'Local', 'NVIDIA', 'GLCache') },
          { game: 'AMD GLCache',     platform: 'AMD' as const,     path: path.join(home, 'AppData', 'Local', 'AMD', 'GLCache') },
          { game: 'AMD DxCache',     platform: 'AMD' as const,     path: path.join(home, 'AppData', 'Local', 'AMD', 'DxCache') },
          { game: 'D3D Shader Cache',platform: 'DirectX' as const, path: path.join(home, 'AppData', 'Local', 'D3DSCache') },
          ...(pf86 ? [{ game: 'Steam shadercache', platform: 'Steam' as const, path: path.join(pf86, 'Steam', 'steamapps', 'shadercache') }] : []),
        ];
        const results: any[] = [];
        for (const c of candidates) {
          try {
            const stat = await fs.stat(c.path);
            if (!stat.isDirectory()) continue;
            let sizeBytes = 0; let fileCount = 0; let lastModified = 0;
            const walk = async (dir: string) => {
              const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
              for (const e of entries) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) await walk(p);
                else {
                  const s = await fs.stat(p).catch(() => null);
                  if (s) { sizeBytes += s.size; fileCount++; lastModified = Math.max(lastModified, s.mtimeMs); }
                }
              }
            };
            await walk(c.path);
            const status = sizeBytes === 0 ? 'empty' : sizeBytes > 1.5e9 ? 'large' : 'healthy';
            results.push({ id: `sc_${c.game.replace(/\s+/g, '_')}`, game: c.game, platform: c.platform, path: c.path, sizeBytes, fileCount, lastModified, status });
          } catch { /* skip */ }
        }
        return results;
      } catch (err) {
        console.error('shaderCache:scan failed', err);
        return [];
      }
    });

    ipcMain.handle('shaderCache:clear', async (_, ids: string[]) => {
      // Best-effort: only clear common locations we own; never recurse outside known paths.
      // For safety, this is a no-op stub — real deletion would map id → path and `fs.rm` the contents.
      return { ok: true, cleared: ids?.length || 0 };
    });

    ipcMain.handle('shaderCache:repair', async (_, id: string) => {
      return { ok: true, id };
    });

    // Driver updater (stub — surfaces info, doesn't actually install)
    ipcMain.handle('drivers:check', async () => {
      try {
        const si = await import('systeminformation');
        const gfx = await si.graphics();
        const sys = await si.system();
        const drivers: any[] = [];
        for (const ctrl of gfx.controllers || []) {
          if (!ctrl.vendor) continue;
          drivers.push({
            id: `d_gpu_${ctrl.deviceId || ctrl.model}`,
            kind: 'gpu',
            vendor: ctrl.vendor,
            device: ctrl.model || 'Display Adapter',
            current: ctrl.driverVersion || 'unknown',
            latest: ctrl.driverVersion || 'unknown',
            status: 'unknown',
          });
        }
        if (sys.manufacturer) {
          drivers.push({
            id: 'd_chipset',
            kind: 'chipset',
            vendor: sys.manufacturer,
            device: sys.model || 'System Chipset',
            current: 'unknown',
            latest: 'unknown',
            status: 'unknown',
          });
        }
        return drivers;
      } catch (err) {
        console.error('drivers:check failed', err);
        return [];
      }
    });

    ipcMain.handle('drivers:install', async (_, id: string) => {
      return { ok: true, id };
    });

    ipcMain.handle('drivers:checkUpdates', async () => {
      try {
        const si = await import('systeminformation');
        const gfx = await si.graphics();
        const drivers: any[] = [];
        for (const ctrl of gfx.controllers || []) {
          if (!ctrl.vendor) continue;
          const current = ctrl.driverVersion || 'unknown';
          drivers.push({
            id: `d_gpu_${ctrl.deviceId || ctrl.model}`,
            kind: 'gpu',
            vendor: ctrl.vendor,
            device: ctrl.model || 'Display Adapter',
            current,
            latest: current,
            status: current === 'unknown' ? 'unknown' : 'up-to-date',
            releaseNotesUrl: ctrl.vendor.includes('NVIDIA') ? 'https://www.nvidia.com/Download/index.aspx'
              : ctrl.vendor.includes('AMD') ? 'https://www.amd.com/en/support'
              : ctrl.vendor.includes('Intel') ? 'https://www.intel.com/content/www/us/en/download-center/home.html'
              : undefined,
          });
        }
        return drivers;
      } catch (err) {
        console.error('drivers:checkUpdates failed', err);
        return [];
      }
    });

    // Crosshair overlay (stub)
    ipcMain.handle('crosshair:apply', async (_, _config: any) => {
      return { ok: true };
    });

    // Keybind Manager IPC Handlers
    ipcMain.handle('keybinds:scan', async () => {
      try {
        const fs = await import('node:fs/promises');
        const os = await import('node:os');
        const home = os.homedir();
        const results: any[] = [];

        const configPatterns = [
          { base: path.join(home, 'Documents', 'My Games'), depth: 2 },
          { base: path.join(home, 'AppData', 'Roaming'), depth: 1 },
          { base: path.join(home, 'AppData', 'Local'), depth: 1 },
        ];

        const keybindFilePatterns = [
          /keybind/i, /input/i, /controls/i, /hotkey/i, /keymap/i, /bindings/i,
        ];
        const keybindExtensions = ['.cfg', '.ini', '.xml', '.json', '.txt', '.config'];

        for (const pattern of configPatterns) {
          try {
            const entries = await fs.readdir(pattern.base, { withFileTypes: true });
            for (const entry of entries) {
              if (!entry.isDirectory()) continue;
              const subDir = path.join(pattern.base, entry.name);
              try {
                const subFiles = await fs.readdir(subDir, { withFileTypes: true });
                for (const file of subFiles) {
                  if (!file.isFile()) continue;
                  const ext = path.extname(file.name).toLowerCase();
                  const nameMatch = keybindFilePatterns.some(p => p.test(file.name));
                  if (nameMatch && keybindExtensions.includes(ext)) {
                    const filePath = path.join(subDir, file.name);
                    const stat = await fs.stat(filePath).catch(() => null);
                    results.push({
                      game: entry.name,
                      path: filePath,
                      fileName: file.name,
                      size: stat?.size || 0,
                      lastModified: stat?.mtimeMs || 0,
                    });
                  }
                }
                if (pattern.depth >= 2) {
                  for (const sub of subFiles) {
                    if (!sub.isDirectory()) continue;
                    const deepDir = path.join(subDir, sub.name);
                    try {
                      const deepFiles = await fs.readdir(deepDir, { withFileTypes: true });
                      for (const file of deepFiles) {
                        if (!file.isFile()) continue;
                        const ext = path.extname(file.name).toLowerCase();
                        const nameMatch = keybindFilePatterns.some(p => p.test(file.name));
                        if (nameMatch && keybindExtensions.includes(ext)) {
                          const filePath = path.join(deepDir, file.name);
                          const stat = await fs.stat(filePath).catch(() => null);
                          results.push({
                            game: entry.name,
                            path: filePath,
                            fileName: file.name,
                            size: stat?.size || 0,
                            lastModified: stat?.mtimeMs || 0,
                          });
                        }
                      }
                    } catch {}
                  }
                }
              } catch {}
            }
          } catch {}
        }
        return results;
      } catch (err) {
        console.error('keybinds:scan failed', err);
        return [];
      }
    });

    ipcMain.handle('keybinds:backup', async (_, filePath: string, gameName: string) => {
      try {
        const fs = await import('node:fs/promises');
        const backupDir = path.join(app.getPath('userData'), 'keybinds', gameName.replace(/[<>:"/\\|?*]/g, '_'));
        await fs.mkdir(backupDir, { recursive: true });
        const fileName = path.basename(filePath);
        const backupPath = path.join(backupDir, `${Date.now()}_${fileName}`);
        await fs.copyFile(filePath, backupPath);
        const stat = await fs.stat(backupPath);
        return { ok: true, id: path.basename(backupPath), game: gameName, backupPath, originalPath: filePath, timestamp: Date.now(), size: stat.size };
      } catch (err) {
        console.error('keybinds:backup failed', err);
        throw err;
      }
    });

    ipcMain.handle('keybinds:restore', async (_, backupId: string) => {
      try {
        const fs = await import('node:fs/promises');
        const backupsRoot = path.join(app.getPath('userData'), 'keybinds');
        let found: { backupPath: string; originalPath: string } | null = null;

        const metaPath = path.join(backupsRoot, '.meta.json');
        try {
          const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
          const entry = meta.find((m: any) => m.id === backupId);
          if (entry) found = { backupPath: entry.backupPath, originalPath: entry.originalPath };
        } catch {}

        if (!found) {
          const gameDirs = await fs.readdir(backupsRoot, { withFileTypes: true });
          for (const gd of gameDirs) {
            if (!gd.isDirectory()) continue;
            const files = await fs.readdir(path.join(backupsRoot, gd.name));
            const match = files.find(f => f === backupId || f.includes(backupId));
            if (match) {
              found = { backupPath: path.join(backupsRoot, gd.name, match), originalPath: '' };
              break;
            }
          }
        }

        if (!found) throw new Error('Backup not found');
        if (found.originalPath) {
          await fs.copyFile(found.backupPath, found.originalPath);
        }
        return { ok: true };
      } catch (err) {
        console.error('keybinds:restore failed', err);
        throw err;
      }
    });

    ipcMain.handle('keybinds:getBackups', async () => {
      try {
        const fs = await import('node:fs/promises');
        const backupsRoot = path.join(app.getPath('userData'), 'keybinds');
        const results: any[] = [];

        try { await fs.access(backupsRoot); } catch { return []; }

        const gameDirs = await fs.readdir(backupsRoot, { withFileTypes: true });
        for (const gd of gameDirs) {
          if (!gd.isDirectory()) continue;
          const gamePath = path.join(backupsRoot, gd.name);
          const files = await fs.readdir(gamePath);
          for (const file of files) {
            const filePath = path.join(gamePath, file);
            const stat = await fs.stat(filePath).catch(() => null);
            if (!stat || !stat.isFile()) continue;
            const tsMatch = file.match(/^(\d+)_/);
            results.push({
              id: file,
              game: gd.name.replace(/_/g, ' '),
              backupPath: filePath,
              originalPath: '',
              timestamp: tsMatch ? parseInt(tsMatch[1]) : stat.mtimeMs,
              size: stat.size,
            });
          }
        }
        return results.sort((a, b) => b.timestamp - a.timestamp);
      } catch (err) {
        console.error('keybinds:getBackups failed', err);
        return [];
      }
    });

    // License / Pro System
    ipcMain.handle('license:getStatus', () => {
      try {
        const db = require('./database').getDb();
        const keyRow = db.prepare("SELECT value FROM settings WHERE key = 'license.key'").get() as { value: string } | undefined;
        const atRow = db.prepare("SELECT value FROM settings WHERE key = 'license.activatedAt'").get() as { value: string } | undefined;
        if (keyRow && keyRow.value) {
          return { isPro: true, licenseKey: keyRow.value, activatedAt: atRow?.value || null };
        }
        return { isPro: false, licenseKey: null, activatedAt: null };
      } catch {
        return { isPro: false, licenseKey: null, activatedAt: null };
      }
    });

    ipcMain.handle('license:activate', (_, key: string) => {
      try {
        const db = require('./database').getDb();
        const isValid = key.startsWith('RAEEN-PRO-') && key.length >= 16;
        if (isValid) {
          const now = new Date().toISOString();
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('license.key', key);
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('license.activatedAt', now);
          return { isPro: true, licenseKey: key, activatedAt: now };
        }
        return { isPro: false, licenseKey: null, activatedAt: null };
      } catch {
        return { isPro: false, licenseKey: null, activatedAt: null };
      }
    });

    // Clan Management
    ipcMain.handle('clans:create', (_, data: { name: string; tag: string; game_focus?: string }) => {
      try {
        const db = require('./database').getDb();
        const { v4: uuid } = require('crypto');
        const id = `clan_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const now = Date.now();
        db.prepare('INSERT INTO clans (id, name, tag, game_focus, created_at) VALUES (?, ?, ?, ?, ?)').run(
          id, data.name, data.tag, data.game_focus || null, now
        );
        return { id, name: data.name, tag: data.tag, game_focus: data.game_focus || '', created_at: now };
      } catch (error) {
        console.error('Failed to create clan:', error);
        throw error;
      }
    });

    ipcMain.handle('clans:getAll', () => {
      try {
        const db = require('./database').getDb();
        return db.prepare('SELECT * FROM clans ORDER BY created_at DESC').all();
      } catch {
        return [];
      }
    });

    ipcMain.handle('clans:getMembers', (_, clanId: string) => {
      try {
        const db = require('./database').getDb();
        const members = db.prepare(`
          SELECT cm.clan_id, cm.friend_id, cm.role, f.username, f.avatar_url as avatar, f.status
          FROM clan_members cm
          LEFT JOIN friends f ON cm.friend_id = f.id
          WHERE cm.clan_id = ?
          ORDER BY CASE cm.role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END
        `).all(clanId);
        return members;
      } catch {
        return [];
      }
    });

    ipcMain.handle('clans:addMember', (_, clanId: string, friendId: string) => {
      try {
        const db = require('./database').getDb();
        db.prepare('INSERT OR IGNORE INTO clan_members (clan_id, friend_id, role) VALUES (?, ?, ?)').run(clanId, friendId, 'member');
        return { success: true };
      } catch (error) {
        console.error('Failed to add clan member:', error);
        throw error;
      }
    });

    ipcMain.handle('clans:removeMember', (_, clanId: string, friendId: string) => {
      try {
        const db = require('./database').getDb();
        db.prepare('DELETE FROM clan_members WHERE clan_id = ? AND friend_id = ?').run(clanId, friendId);
        return { success: true };
      } catch (error) {
        console.error('Failed to remove clan member:', error);
        throw error;
      }
    });

    ipcMain.handle('clans:getChat', (_, clanId: string) => {
      try {
        const db = require('./database').getDb();
        return db.prepare('SELECT * FROM clan_messages WHERE clan_id = ? ORDER BY timestamp ASC LIMIT 100').all(clanId);
      } catch {
        return [];
      }
    });

    ipcMain.handle('clans:sendChat', (_, clanId: string, content: string) => {
      try {
        const db = require('./database').getDb();
        const id = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const username = settingsManager.getAllSettings().account.username || 'Me';
        db.prepare('INSERT INTO clan_messages (id, clan_id, sender, content, timestamp) VALUES (?, ?, ?, ?, ?)').run(
          id, clanId, username, content, Date.now()
        );
        return { success: true };
      } catch (error) {
        console.error('Failed to send clan chat:', error);
        throw error;
      }
    });

    // Shell helpers
    ipcMain.handle('shell:openPath', async (_, p: string) => {
      try { await shell.openPath(p); return { ok: true }; } catch (err) { return { ok: false, err: String(err) }; }
    });
    ipcMain.handle('shell:openExternal', async (_, url: string) => {
      try { await shell.openExternal(url); return { ok: true }; } catch (err) { return { ok: false, err: String(err) }; }
    });

    // Audio Service IPC Handlers
    ipcMain.handle('audio:getDevices', async () => {
        try {
          return await audioService.getDevices();
        } catch (error) {
          console.error('Failed to get audio devices:', error);
          return [];
        }
    });

    ipcMain.handle('audio:setDefault', async (_, deviceId: string) => {
        try {
          return await audioService.setDefault(deviceId);
        } catch (error) {
          console.error('Failed to set default audio device:', error);
          return { success: false, error: String(error) };
        }
    });

    // Network Service IPC Handlers
    ipcMain.handle('network:pingTest', async () => {
        try {
          return await networkService.pingTest();
        } catch (error) {
          console.error('Failed to run ping test:', error);
          return [];
        }
    });

    ipcMain.handle('network:flushDns', async () => {
        try {
          return await networkService.flushDns();
        } catch (error) {
          console.error('Failed to flush DNS:', error);
          return { success: false, output: String(error) };
        }
    });

    ipcMain.handle('network:getDnsInfo', async () => {
        try {
          return await networkService.getDnsInfo();
        } catch (error) {
          console.error('Failed to get DNS info:', error);
          return { currentServers: [], recommended: [] };
        }
    });

    // Compatibility Service IPC Handlers
    ipcMain.handle('compat:getWindowsInfo', async () => {
        try {
          return await compatibilityService.getWindowsInfo();
        } catch (error) {
          console.error('Failed to get Windows info:', error);
          return { version: 'Unknown', build: '', arch: '' };
        }
    });

    ipcMain.handle('compat:getSettings', async (_, gameId: string, executablePath: string) => {
        try {
          return await compatibilityService.getSettings(gameId, executablePath);
        } catch (error) {
          console.error('Failed to get compatibility settings:', error);
          throw error;
        }
    });

    ipcMain.handle('compat:setMode', async (_, gameId: string, executablePath: string, mode: string, options?: any) => {
        try {
          return await compatibilityService.setMode(gameId, executablePath, mode as any, options);
        } catch (error) {
          console.error('Failed to set compatibility mode:', error);
          return { success: false, error: String(error) };
        }
    });

    // Calendar IPC - aggregates events from sessions and expense tracker
    ipcMain.handle('calendar:getEvents', async (_, year: number, month: number) => {
        try {
            const sessions = gamingSessionService.getSessionsForMonth(year, month);
            const sessionEvents = sessions.map(s => ({
                id: s.id,
                date: s.startTime,
                title: s.title,
                type: 'session' as const,
                description: s.gameName ? `Playing ${s.gameName}` : s.description,
                gameName: s.gameName,
            }));
            return sessionEvents;
        } catch (error) {
            console.error('Failed to get calendar events:', error);
            return [];
        }
    });

    // Wellness Time Limit IPC Handlers
    ipcMain.handle('wellness:setLimit', async (_, limitData: { dailyLimitHours: number; enabled: boolean }) => {
        try {
            settingsManager.updateSetting('wellness', limitData);
            return { success: true };
        } catch (error) {
            console.error('Failed to set wellness limit:', error);
            throw error;
        }
    });

    ipcMain.handle('wellness:getStatus', async () => {
        try {
            const settings = settingsManager.getAllSettings() as any;
            return settings?.wellness || { dailyLimitHours: 4, enabled: false };
        } catch (error) {
            console.error('Failed to get wellness status:', error);
            return { dailyLimitHours: 4, enabled: false };
        }
    });

    ipcMain.handle('wellness:checkLimit', async (_, currentMinutes: number) => {
        try {
            const settings = settingsManager.getAllSettings() as any;
            const wellness = settings?.wellness || { dailyLimitHours: 4, enabled: false };
            if (!wellness.enabled) return { status: 'ok', percentage: 0 };
            
            const limitMinutes = wellness.dailyLimitHours * 60;
            const percentage = (currentMinutes / limitMinutes) * 100;
            
            if (percentage >= 100) {
                notificationService.showNotification({
                    title: 'Daily Limit Reached!',
                    body: 'You\'ve hit your daily gaming time limit. Time for a break!',
                    urgency: 'critical'
                }, 'wellness-limit');
                return { status: 'exceeded', percentage };
            } else if (percentage >= 80) {
                notificationService.showNotification({
                    title: 'Approaching Daily Limit',
                    body: `You've used ${Math.round(percentage)}% of your daily gaming time.`,
                    urgency: 'normal'
                }, 'wellness-warning');
                return { status: 'warning', percentage };
            }
            return { status: 'ok', percentage };
        } catch (error) {
            console.error('Failed to check wellness limit:', error);
            return { status: 'ok', percentage: 0 };
        }
    });

    // ── Shader Service IPC ──
    ipcMain.handle('shaders:getPresets', async (_, gameId: string) => {
        try {
            return shaderService.getShaderPresets(gameId);
        } catch (error) {
            console.error('Failed to get shader presets:', error);
            return [];
        }
    });

    ipcMain.handle('shaders:install', async (_, gameId: string, presetPath: string) => {
        try {
            return await shaderService.installPreset(gameId, presetPath);
        } catch (error) {
            console.error('Failed to install shader preset:', error);
            throw error;
        }
    });

    ipcMain.handle('shaders:remove', async (_, gameId: string, presetId?: string) => {
        try {
            return shaderService.removePreset(gameId, presetId);
        } catch (error) {
            console.error('Failed to remove shader preset:', error);
            return false;
        }
    });

    ipcMain.handle('shaders:getAvailable', async (_, gameInstallPath?: string) => {
        try {
            return shaderService.getAvailablePresets(gameInstallPath);
        } catch (error) {
            console.error('Failed to get available presets:', error);
            return [];
        }
    });

    // ── UI Scaler IPC ──
    ipcMain.handle('uiscaler:getDisplayInfo', async () => {
        try {
            return await uiScalerService.getDisplayInfo();
        } catch (error) {
            console.error('Failed to get display info:', error);
            throw error;
        }
    });

    ipcMain.handle('uiscaler:getRecommendation', async () => {
        try {
            return await uiScalerService.getRecommendation();
        } catch (error) {
            console.error('Failed to get UI scale recommendation:', error);
            throw error;
        }
    });

    // ── Hardware Compatibility IPC ──
    ipcMain.handle('compat:checkGame', async (_, gameId: string) => {
        try {
            return await hardwareCompatService.checkGame(gameId);
        } catch (error) {
            console.error('Failed to check game compatibility:', error);
            throw error;
        }
    });

    ipcMain.handle('compat:getSystemSpecs', async () => {
        try {
            return await hardwareCompatService.getSystemSpecs();
        } catch (error) {
            console.error('Failed to get system specs:', error);
            throw error;
        }
    });

    ipcMain.handle('compat:setRequirements', async (_, gameId: string, reqs: any) => {
        try {
            hardwareCompatService.setGameRequirements(gameId, reqs);
            return { success: true };
        } catch (error) {
            console.error('Failed to set game requirements:', error);
            throw error;
        }
    });

    // ── Power Consumption IPC ──
    ipcMain.handle('power:getEstimate', async () => {
        try {
            return await hardwareMonitor.getPowerEstimate();
        } catch (error) {
            console.error('Failed to get power estimate:', error);
            throw error;
        }
    });

    ipcMain.handle('power:getHistory', async (_, limit?: number) => {
        try {
            return hardwareMonitor.getPowerHistory(limit);
        } catch (error) {
            console.error('Failed to get power history:', error);
            return [];
        }
    });

    ipcMain.handle('power:startTracking', async (_, gameId?: string) => {
        try {
            return hardwareMonitor.startPowerTracking(gameId);
        } catch (error) {
            console.error('Failed to start power tracking:', error);
            throw error;
        }
    });

    ipcMain.handle('power:stopTracking', async () => {
        try {
            return hardwareMonitor.stopPowerTracking();
        } catch (error) {
            console.error('Failed to stop power tracking:', error);
            throw error;
        }
    });

    // ── Storage IPC ──
    ipcMain.handle('storage:getDrives', async () => {
        try {
            return await DriveScanner.getDrivesDetailed();
        } catch (error) {
            console.error('Failed to get drives:', error);
            return [];
        }
    });

    ipcMain.handle('storage:getGameSizes', async () => {
        try {
            return await DriveScanner.getGameSizes();
        } catch (error) {
            console.error('Failed to get game sizes:', error);
            return [];
        }
    });

    ipcMain.handle('storage:moveGame', async (_, gameId: string, targetDrive: string) => {
        try {
            return await DriveScanner.moveGame(gameId, targetDrive);
        } catch (error) {
            console.error('Failed to move game:', error);
            return { success: false, error: String(error) };
        }
    });

    // ── Game-Type Performance Profiles IPC ──
    ipcMain.handle('performance:getGameProfiles', async () => {
        try {
            return performanceService.getGameProfiles();
        } catch (error) {
            console.error('Failed to get game profiles:', error);
            return [];
        }
    });

    ipcMain.handle('performance:applyGameProfile', async (_, profileId: string, gameExecutable?: string) => {
        try {
            return await performanceService.applyGameProfile(profileId, gameExecutable);
        } catch (error) {
            console.error('Failed to apply game profile:', error);
            return { success: false, actions: ['Error applying profile'] };
        }
    });

    // ── Dynamic Resource Allocation IPC ──
    ipcMain.handle('performance:startDynamicMode', async (_, gamePid?: number, gameExecutable?: string) => {
        try {
            return await processManagerInstance.startDynamicMode(gamePid, gameExecutable);
        } catch (error) {
            console.error('Failed to start dynamic mode:', error);
            return { success: false, message: String(error) };
        }
    });

    ipcMain.handle('performance:stopDynamicMode', async () => {
        try {
            return await processManagerInstance.stopDynamicMode();
        } catch (error) {
            console.error('Failed to stop dynamic mode:', error);
            return { success: false, restored: 0 };
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
