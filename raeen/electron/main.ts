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
import { ObsService } from './services/ObsService'

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
let performanceService: PerformanceService;
let saveManagerService: SaveManagerService;
let videoEditorService: VideoEditorService;
let obsService: ObsService;

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
    
    // Send initial update immediately
    hardwareMonitor.getStats().then(stats => {
        overlayWin?.webContents.send('overlay:update', stats);
    });

    overlayInterval = setInterval(async () => {
        if (overlayWin && overlayWin.isVisible()) {
            try {
                const stats = await hardwareMonitor.getStats();
                overlayWin.webContents.send('overlay:update', stats);
            } catch (e) {
                console.error('Failed to update overlay stats:', e);
            }
        } else {
            stopOverlayUpdates();
        }
    }, 2000); // Update every 2 seconds
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
      sandbox: false
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

  ipcMain.handle('system:openExternal', async (_, url: string) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error('Failed to open external URL:', url, error);
      throw error;
    }
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
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
  gameManager = new GameManager()
  settingsManager = new SettingsManager()
  hardwareMonitor = new HardwareMonitor()
  friendsManager = new FriendsManager()
  universalModManager = new UniversalModManager()
  newsManager = new NewsManager()
  recommendationManager = new RecommendationManager()
  imageCacheService = new ImageCacheService()
  manualGameService = new ManualGameService() // Instantiate ManualGameService
  performanceService = new PerformanceService()
  saveManagerService = new SaveManagerService()
  videoEditorService = new VideoEditorService()
  obsService = new ObsService()

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
      cloudPath: saveManagerService.getCloudPath()
    };
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
