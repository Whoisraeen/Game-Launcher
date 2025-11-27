import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { initDatabase } from './database'
import { GameManager } from './services/gameManager'
import { SettingsManager } from './services/settingsManager'
import { HardwareMonitor } from './services/hardwareMonitor'
import { FriendsManager } from './services/friendsManager'
import { ModsManager } from './services/ModsManager'
import { NewsManager } from './services/newsManager'
import { RecommendationManager } from './services/recommendationManager'

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
let modsManager: ModsManager;
let newsManager: NewsManager;
let recommendationManager: RecommendationManager;

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

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
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Window control IPC handlers
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

  ipcMain.handle('games:getRecommendations', () => {
    try {
      const games = gameManager.getAllGames() as any[];
      return recommendationManager.getRecommendations(games);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
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

  ipcMain.handle('friends:simulate', () => {
    return friendsManager.simulateActivity();
  });

  // Mods IPC Handlers
  ipcMain.handle('mods:getAll', () => {
    return modsManager.getAllPacks();
  });

  ipcMain.handle('mods:create', (_, { name, mcVersion, loader, loaderVersion }) => {
    return modsManager.createPack(name, mcVersion, loader, loaderVersion);
  });

  ipcMain.handle('mods:search', async (_, { query, source }) => {
    if (source === 'modrinth') {
      return await modsManager.searchModrinth(query);
    } else {
      return await modsManager.searchCurseforge(query);
    }
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
  modsManager = new ModsManager()
  newsManager = new NewsManager()
  recommendationManager = new RecommendationManager()
  createWindow()

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);
})
