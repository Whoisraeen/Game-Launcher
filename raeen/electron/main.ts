import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { initDatabase } from './database'
import { GameManager } from './services/gameManager'
import { SettingsManager } from './services/settingsManager'
import { HardwareMonitor } from './services/hardwareMonitor'
import { FriendsManager } from './services/friendsManager'
import { UniversalModManager } from './services/modManager'
import { NewsManager } from './services/newsManager'
import { RecommendationManager } from './services/recommendationManager'
import { ImageCacheService } from './services/ImageCacheService'
import { ManualGameService } from './services/ManualGameService'
import { DiscordManager } from './services/discordManager'
import { PerformanceService } from './services/PerformanceService'
import { SaveManagerService } from './services/SaveManagerService'
import { VideoEditorService } from './services/VideoEditorService'
import { ObsService, ObsConnectionConfig } from './services/ObsService'
import { RGBService } from './services/RGBService'
import { FanControlService } from './services/FanControlService'
import { HLTBService } from './services/HLTBService'
import { NotificationService } from './services/notificationService'
import { AchievementService } from './services/achievementService'
import { HealthCheckService } from './services/healthCheckService'
import { CrashAnalyzerService } from './services/crashAnalyzerService'
import { UpdateManagerService } from './services/updateManagerService'
import { ScreenshotService } from './services/screenshotService'
import { DLCTrackerService } from './services/dlcTrackerService'
import { PriceTrackerService } from './services/priceTrackerService'
import { SupabaseService } from './services/supabaseService'
import { GamingSessionService } from './services/gamingSessionService'
import { ExpenseTrackerService } from './services/expenseTrackerService'
import { StoreService } from './services/storeService'

// Configure Logger
log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'info';
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
console.info = log.info;

// Configure Auto-Updater
autoUpdater.logger = log;
autoUpdater.autoDownload = false; // Let user decide

// Services
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let overlayWin: BrowserWindow | null

function createOverlayWindow() {
  overlayWin = new BrowserWindow({
    width: 300,
    height: 150,
    x: 20,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: false, // Click-through
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false, // Hidden by default
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Allow click-through
  overlayWin.setIgnoreMouseEvents(true);

  if (VITE_DEV_SERVER_URL) {
    overlayWin.loadURL(`${VITE_DEV_SERVER_URL}#/overlay`);
  } else {
    overlayWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'overlay' });
  }

  overlayWin.on('closed', () => {
    overlayWin = null;
  });
}

let overlayInterval: NodeJS.Timeout | null = null;

function startOverlayUpdates() {
  if (overlayInterval) return;
  overlayInterval = setInterval(async () => {
    if (overlayWin && !overlayWin.isDestroyed() && overlayWin.isVisible()) {
      try {
        if (hardwareMonitor) {
            const stats = await hardwareMonitor.getStats();
            overlayWin.webContents.send('overlay:update', stats);
        }
      } catch (error) {
        console.error('Failed to send overlay update:', error);
      }
    } else {
      stopOverlayUpdates();
    }
  }, 1000);
}

function stopOverlayUpdates() {
  if (overlayInterval) {
    clearInterval(overlayInterval);
    overlayInterval = null;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    },
  })

  createOverlayWindow(); // Create overlay when main window is created

  // ... rest of window code ...

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

  // Game Library IPC Handlers
  ipcMain.handle('games:sync', async () => {
    try {
      return await gameManager.syncLibrary();
    } catch (error) {
      console.error('Failed to sync library:', error);
      throw error;
    }
  });

  ipcMain.handle('games:getAll', () => {
    try {
      return gameManager.getAllGames();
    } catch (error) {
      console.error('Failed to get games:', error);
      throw error;
    }
  });

  ipcMain.handle('games:getPage', (_, page: number, pageSize: number) => {
    try {
      return gameManager.getGamesPage(page, pageSize);
    } catch (error) {
      console.error('Failed to get games page:', error);
      throw error;
    }
  });

  ipcMain.handle('games:getRecommendations', () => {
    try {
      const games = gameManager.getAllGames() as any[];
      return recommendationManager.getRecommendations(games);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  });

  ipcMain.handle('games:getMoodRecommendations', (_, mood: string, timeConstraint?: string) => {
    try {
      const games = gameManager.getAllGames() as any[];
      return recommendationManager.getMoodRecommendations(games, mood, timeConstraint);
    } catch (error) {
      console.error('Failed to get mood recommendations:', error);
      throw error;
    }
  });

  // RGB IPC Handlers
  ipcMain.handle('rgb:connect', async () => {
    await rgbService.connect();
    return true;
  });

  ipcMain.handle('rgb:setStatic', async (_, r, g, b) => {
    await rgbService.setStaticColor(r, g, b);
    return true;
  });

  ipcMain.handle('rgb:setEffect', async (_, effect, speed, color) => {
    await rgbService.setEffect(effect, speed, color);
    return true;
  });

  ipcMain.handle('rgb:getDevices', async () => {
    return await rgbService.getDevices();
  });

  ipcMain.handle('games:getSmartSuggestion', (_, criteria: 'backlog' | 'replay' | 'quick' | 'forgotten' | 'random', maxMinutes?: number) => {
    try {
      const games = gameManager.getAllGames() as any[];
      return recommendationManager.getSmartSuggestion(games, criteria, maxMinutes);
    } catch (error) {
      console.error('Failed to get smart suggestion:', error);
      throw error;
    }
  });

  ipcMain.handle('games:launch', async (_, gameId: string) => {
    try {
      return await gameManager.launchGame(gameId);
    } catch (error) {
      console.error('Failed to launch game:', error);
      throw error;
    }
  });

  ipcMain.handle('games:install', async (_, gameId: string) => {
    try {
      return await gameManager.installGame(gameId);
    } catch (error) {
      console.error('Failed to install game:', error);
      throw error;
    }
  });

  ipcMain.handle('games:verify', async (_, gameId: string) => {
    try {
      return await gameManager.verifyGame(gameId);
    } catch (error) {
      console.error('Failed to verify game:', error);
      throw error;
    }
  });

  ipcMain.handle('games:kill', async (_, gameId: string) => {
    try {
      return await gameManager.killGame(gameId);
    } catch (error) {
      console.error('Failed to kill game:', error);
      throw error;
    }
  });

  ipcMain.handle('games:getWeeklyActivity', () => {
    try {
      return gameManager.getWeeklyActivity();
    } catch (error) {
      console.error('Failed to get weekly activity:', error);
      throw error;
    }
  });

  ipcMain.handle('games:toggleFavorite', (_, gameId: string, isFavorite: boolean) => {
    try {
      return gameManager.toggleFavorite(gameId, isFavorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  });

  ipcMain.handle('games:toggleHidden', (_, gameId: string, isHidden: boolean) => {
    try {
      return gameManager.toggleHidden(gameId, isHidden);
    } catch (error) {
      console.error('Failed to toggle hidden:', error);
      throw error;
    }
  });

  ipcMain.handle('games:updateTags', (_, gameId: string, tags: string[]) => {
    try {
      return gameManager.updateGameTags(gameId, tags);
    } catch (error) {
      console.error('Failed to update tags:', error);
      throw error;
    }
  });

  ipcMain.handle('games:updatePlayStatus', (_, gameId: string, status: string) => {
    try {
      return gameManager.updatePlayStatus(gameId, status);
    } catch (error) {
      console.error('Failed to update play status:', error);
      throw error;
    }
  });

  ipcMain.handle('games:getAverageSessionDuration', () => {
    try {
      return gameManager.getAverageSessionDuration();
    } catch (error) {
      console.error('Failed to get average session duration:', error);
      throw error;
    }
  });

  ipcMain.handle('games:autoMerge', async () => {
    try {
      return await gameManager.autoMergeDuplicates();
    } catch (error) {
      console.error('Failed to auto-merge games:', error);
      throw error;
    }
  });

  ipcMain.handle('games:updateLaunchOptions', (_, gameId: string, options: string) => {
    try {
      return gameManager.updateLaunchOptions(gameId, options);
    } catch (error) {
      console.error('Failed to update launch options:', error);
      throw error;
    }
  });

  ipcMain.handle('games:updateRating', (_, gameId: string, rating: number) => {
    try {
      return gameManager.updateRating(gameId, rating);
    } catch (error) {
      console.error('Failed to update rating:', error);
      throw error;
    }
  });

  ipcMain.handle('games:updateUserNotes', (_, gameId: string, notes: string) => {
    try {
      return gameManager.updateUserNotes(gameId, notes);
    } catch (error) {
      console.error('Failed to update user notes:', error);
      throw error;
    }
  });

  ipcMain.handle('games:openPlatform', async (_, platform: string) => {
    try {
      return await gameManager.openPlatform(platform);
    } catch (error) {
      console.error('Failed to open platform:', error);
      throw error;
    }
  });

  ipcMain.handle('games:getNews', async () => {
    try {
      return await gameManager.getLibraryNews();
    } catch (error) {
      console.error('Failed to get library news:', error);
      throw error;
    }
  });

  ipcMain.handle('games:openInstallFolder', async (_, gameId: string) => {
    try {
      return await gameManager.openInstallFolder(gameId);
    } catch (error) {
      console.error('Failed to open install folder:', error);
      throw error;
    }
  });

  ipcMain.handle('games:createShortcut', async (_, gameId: string) => {
    try {
      return await gameManager.createShortcut(gameId);
    } catch (error) {
      console.error('Failed to create shortcut:', error);
      throw error;
    }
  });

  ipcMain.handle('games:uninstall', async (_, gameId: string) => {
    try {
      return await gameManager.uninstallGame(gameId);
    } catch (error) {
      console.error('Failed to uninstall game:', error);
      throw error;
    }
  });

  ipcMain.handle('games:updateDetails', async (_, gameId: string, updates: any) => {
    try {
      return await gameManager.updateGameDetails(gameId, updates);
    } catch (error) {
      console.error('Failed to update game details:', error);
      throw error;
    }
  });

  ipcMain.handle('games:updateOrder', async (_, gameIds: string[]) => {
    try {
      return gameManager.updateGameOrder(gameIds);
    } catch (error) {
      console.error('Failed to update game order:', error);
      throw error;
    }
  });

  // Collection Handlers
  ipcMain.handle('collections:getAll', () => {
    return gameManager.getCollections();
  });

  ipcMain.handle('collections:create', (_, name: string, description?: string) => {
    return gameManager.createCollection(name, description);
  });

  ipcMain.handle('collections:delete', (_, id: string) => {
    return gameManager.deleteCollection(id);
  });

  ipcMain.handle('collections:addGame', (_, collectionId: string, gameId: string) => {
    return gameManager.addGameToCollection(collectionId, gameId);
  });

  ipcMain.handle('collections:removeGame', (_, collectionId: string, gameId: string) => {
    return gameManager.removeGameFromCollection(collectionId, gameId);
  });

  // Settings IPC Handlers
  ipcMain.handle('settings:getAll', () => {
    return settingsManager.getAllSettings();
  });

  ipcMain.handle('settings:update', (_, category: any, value: any) => {
    return settingsManager.updateSetting(category, value);
  });

  // System IPC Handlers
  ipcMain.handle('system:stats', async () => {
    return await hardwareMonitor.getStats();
  });

  ipcMain.on('overlay:toggle', () => {
    if (overlayWin) {
      if (overlayWin.isVisible()) {
        overlayWin.hide();
        stopOverlayUpdates();
      } else {
        overlayWin.show();
        startOverlayUpdates();
      }
    }
  });

  ipcMain.handle('system:openExternal', async (_, url: string) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error('Failed to open external URL:', url, error);
      throw error;
    }
  });

  ipcMain.handle('system:executeCommand', async (_, command: string) => {
    try {
      const { exec } = require('child_process');
      return new Promise((resolve, reject) => {
        exec(command, (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error('Command execution error:', error);
            reject(error);
            return;
          }
          resolve({ success: true, stdout, stderr });
        });
      });
    } catch (error) {
      console.error('Failed to execute command:', command, error);
      throw error;
    }
  });

  // Alias for system:executeCommand
  ipcMain.handle('system:execute', async (_, command: string) => {
    try {
      const { exec } = require('child_process');
      return new Promise((resolve, reject) => {
        exec(command, (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error('Command execution error:', error);
            reject(error);
            return;
          }
          resolve({ success: true, stdout, stderr });
        });
      });
    } catch (error) {
      console.error('Failed to execute command:', command, error);
      throw error;
    }
  });

  ipcMain.handle('system:getFolderSize', async (_, folderPath: string) => {
    try {
        // Use fast-folder-size or similar logic. For now, simple recursive Node.js fs
        const fs = require('fs');
        const path = require('path');

        const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
            const files = fs.readdirSync(dirPath);

            files.forEach((file: string) => {
                if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                    arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
                } else {
                    arrayOfFiles.push(path.join(dirPath, "/", file));
                }
            });

            return arrayOfFiles;
        };

        if (!fs.existsSync(folderPath)) return 0;

        let totalSize = 0;
        // Doing this synchronously on main thread for large folders is bad, 
        // but for prototype it's "real" logic vs mock. 
        // A better way is using 'du' or 'powershell'.
        
        // Let's use a lightweight recurse if path exists
        const files = getAllFiles(folderPath);
        files.forEach((filePath: string) => {
            totalSize += fs.statSync(filePath).size;
        });

        return totalSize;
    } catch (error) {
        console.error('Failed to get folder size:', error);
        return 0;
    }
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:openFile', async (_, filters: any[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Manual Game Handlers
  ipcMain.handle('manual:scan', async (_, folderPath: string) => {
    try {
      return await manualGameService.scanFolder(folderPath);
    } catch (error) {
      console.error('Failed to scan folder:', error);
      throw error;
    }
  });

  ipcMain.handle('manual:add', async (_, title, installPath, executable) => {
    try {
      const id = await manualGameService.addGame(title, installPath, executable);
      // Trigger cache for metadata if possible?
      // We can't easily do it here without circular dep or duplication.
      // Frontend can reload games which triggers cache if sync called?
      // Or we just add basic metadata now.
      return id;
    } catch (error) {
      console.error('Failed to add manual game:', error);
      throw error;
    }
  });

  // Friends IPC Handlers
  ipcMain.handle('friends:getAll', () => {
    return friendsManager.getAll();
  });

  ipcMain.handle('friends:add', (_, username: string, platform?: string) => {
    return friendsManager.addFriend(username, platform);
  });

  ipcMain.handle('friends:remove', (_, id: string) => {
    return friendsManager.removeFriend(id);
  });

  ipcMain.handle('friends:getMessages', (_, friendId: string) => {
      return friendsManager.getMessages(friendId);
  });

  ipcMain.handle('friends:sendMessage', (_, friendId: string, content: string) => {
      return friendsManager.sendMessage(friendId, content);
  });

  ipcMain.handle('friends:markRead', (_, friendId: string) => {
      return friendsManager.markRead(friendId);
  });

  ipcMain.handle('friends:importSteam', async () => {
    try {
      return await friendsManager.importSteamFriends();
    } catch (error) {
      console.error('Failed to import Steam friends:', error);
      throw error;
    }
  });

  ipcMain.handle('friends:sync', async () => {
    try {
      return await friendsManager.syncSteamFriendsRealTime();
    } catch (error) {
      console.error('Failed to sync Steam friends:', error);
      throw error;
    }
  });

  ipcMain.handle('friends:simulate', () => {
    return friendsManager.simulateActivity();
  });

  // Mods IPC Handlers (Universal)
  ipcMain.handle('mods:getAll', () => {
    return universalModManager.getAllMods();
  });

  ipcMain.handle('mods:add', (_, gameId, name, description, version, installPath) => {
    return universalModManager.addMod(gameId, name, description, version, installPath);
  });

  ipcMain.handle('mods:delete', (_, id) => {
    return universalModManager.deleteMod(id);
  });

  ipcMain.handle('mods:update', async (_, id, updates) => {
    // Handle enable/disable logic if present
    if (updates.enabled !== undefined) {
      if (updates.enabled) {
        await universalModManager.enableMod(id);
      } else {
        await universalModManager.disableMod(id);
      }
    }
    // Update DB record
    return universalModManager.updateMod(id, updates);
  });

  ipcMain.handle('mods:checkConflicts', (_, gameId: string) => {
    return universalModManager.checkConflicts(gameId);
  });

  // News IPC Handlers
  ipcMain.handle('news:getGlobal', async () => {
    try {
      return await newsManager.getGlobalNews();
    } catch (error) {
      console.error('Failed to get global news:', error);
      throw error;
    }
  });

  // Store IPC Handlers
  ipcMain.handle('store:getDeals', async (_, params) => {
    try {
        return await storeService.getDeals(params);
    } catch (error) {
        console.error('Failed to get deals:', error);
        return [];
    }
  });

  ipcMain.handle('store:getStores', async () => {
      try {
          return await storeService.getStores();
      } catch (error) {
          console.error('Failed to get stores:', error);
          return [];
      }
  });

  // Auto-Updater IPC Handlers
  ipcMain.handle('updater:check', () => {
    return autoUpdater.checkForUpdates();
  });

  ipcMain.handle('updater:download', () => {
    return autoUpdater.downloadUpdate();
  });

  ipcMain.handle('updater:install', () => {
    return autoUpdater.quitAndInstall();
  });

  // Auto-Updater Events
  autoUpdater.on('update-available', (info) => {
    win?.webContents.send('updater:available', info);
  });

  autoUpdater.on('update-not-available', () => {
    win?.webContents.send('updater:not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    win?.webContents.send('updater:progress', progress);
  });

  autoUpdater.on('update-downloaded', () => {
    win?.webContents.send('updater:downloaded');
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  initDatabase()
  notificationService = new NotificationService()
  achievementService = new AchievementService(notificationService)
  healthCheckService = new HealthCheckService()
  crashAnalyzerService = new CrashAnalyzerService()
  updateManagerService = new UpdateManagerService()
  screenshotService = new ScreenshotService()
  dlcTrackerService = new DLCTrackerService()
  priceTrackerService = new PriceTrackerService(notificationService)
  supabaseService = new SupabaseService()
  gamingSessionService = new GamingSessionService()
  expenseTrackerService = new ExpenseTrackerService()
  storeService = new StoreService()
  gameManager = new GameManager()
  settingsManager = new SettingsManager()
  hardwareMonitor = new HardwareMonitor()
  friendsManager = new FriendsManager(notificationService)
  universalModManager = new UniversalModManager()
  newsManager = new NewsManager()
  recommendationManager = new RecommendationManager()
  imageCacheService = new ImageCacheService()
  manualGameService = new ManualGameService() // Instantiate ManualGameService
  performanceService = new PerformanceService()
  gameManager.setPerformanceService(performanceService)

  // Game Manager Events
  gameManager.on('game-started', async (game) => {
      console.log(`Main: Game Started - ${game.title}`);
      const settings = settingsManager.getAllSettings();
      
      // Performance Overlay
      if (settings.performance.showOverlay) {
          if (!overlayWin || overlayWin.isDestroyed()) {
              createOverlayWindow();
          }
          if (overlayWin && !overlayWin.isDestroyed()) {
              overlayWin.show();
              startOverlayUpdates();
          }
      }
  });

  gameManager.on('game-ended', async (game) => {
      console.log(`Main: Game Ended - ${game.title}`);
      stopOverlayUpdates();
      if (overlayWin && !overlayWin.isDestroyed()) {
          overlayWin.hide();
      }
  });

  // Overlay IPC
  ipcMain.handle('overlay:toggle', (_, forceState?: boolean) => {
      if (!overlayWin || overlayWin.isDestroyed()) {
          createOverlayWindow();
      }
      
      if (overlayWin && !overlayWin.isDestroyed()) {
          if (forceState !== undefined) {
              if (forceState) {
                  overlayWin.show();
                  startOverlayUpdates();
              } else {
                  overlayWin.hide();
                  stopOverlayUpdates();
              }
          } else {
              if (overlayWin.isVisible()) {
                  overlayWin.hide();
                  stopOverlayUpdates();
              } else {
                  overlayWin.show();
                  startOverlayUpdates();
              }
          }
          return overlayWin.isVisible();
      }
      return false;
  });

  saveManagerService = new SaveManagerService()
  videoEditorService = new VideoEditorService()
  obsService = new ObsService()
  rgbService = new RGBService()
  fanControlService = new FanControlService()
  hltbService = new HLTBService()

  // HLTB IPC
  ipcMain.handle('games:hltbSearch', async (_, gameName: string) => {
    try {
      return await hltbService.search(gameName);
    } catch (error) {
      console.error('Failed to search HLTB:', error);
      return null;
    }
  });

  // Discord RPC
  DiscordManager.getInstance();

  // Notification IPC Handlers
  ipcMain.handle('notifications:getPreferences', () => {
    try {
      return notificationService.getPreferences();
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      throw error;
    }
  });

  ipcMain.handle('notifications:savePreferences', (_, preferences) => {
    try {
      notificationService.savePreferences(preferences);
      return true;
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      throw error;
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

  // ===== Gaming Session Handlers =====
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

  // ===== Expense Tracker Handlers =====
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
      // We use ensureCached to wait for the download if it's missing, 
      // so the UI gets the local path immediately if possible, or waits a bit.
      // For a list of 2000 games, this might be too slow if we do it for all.
      // But for the visible ones (virtualized), it's fine.
      // Actually cacheImage was the name in ImageCacheService.ts
      return await imageCacheService.cacheImage(url, 'temp_' + Date.now(), 'cover');
      // Note: This is a simplified wrapper for ad-hoc caching if needed by UI directly.
      // Real usage is in GameManager.syncLibrary.
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
      // Accessing metadataFetcher through gameManager is not ideal as it's private.
      // We should probably expose it or instantiate it here, but GameManager has it.
      // Better to add a method to GameManager to expose this or just make it public.
      // Since I can't easily change GameManager to public property without re-reading/writing,
      // I will use the `gameManager` instance and assume I can access it if I cast or modify GameManager.
      // Or simpler: Just use the new MetadataFetcher instance since it's stateless mostly (except cache which it doesn't have much of).
      // Actually, GameManager has logic for it.
      // Let's add a method to GameManager to `searchMetadata(title)` which calls the fetcher.
      return await gameManager.searchMetadata(title);
    } catch (error) {
      console.error('Failed to search metadata:', error);
      throw error;
    }
  });

  createWindow()

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);
})
