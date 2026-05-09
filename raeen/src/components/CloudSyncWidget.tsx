import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, CloudOff, RefreshCw, Download, Check, AlertCircle, LogOut, Shield, Clock, Activity, Zap, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CloudAuthModal from './CloudAuthModal';

interface SyncHealth {
  successCount: number;
  errorCount: number;
  lastError: string | null;
}

const CloudSyncWidget: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 0 });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [syncHealth, setSyncHealth] = useState<SyncHealth>({ successCount: 0, errorCount: 0, lastError: null });
  const [forceSyncing, setForceSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    if (isAuthenticated) {
      loadStorageUsage();
      loadSyncHealth();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const authenticated = await window.ipcRenderer.invoke('cloud:isAuthenticated');
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const user = await window.ipcRenderer.invoke('cloud:getCurrentUser');
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Failed to check authentication:', error);
    }
  };

  const loadStorageUsage = async () => {
    try {
      const usage = await window.ipcRenderer.invoke('cloud:getStorageUsage');
      setStorageUsage(usage);
    } catch (error) {
      console.error('Failed to load storage usage:', error);
    }
  };

  const loadSyncHealth = () => {
    try {
      const raw = localStorage.getItem('raeen.sync.health');
      if (raw) setSyncHealth(JSON.parse(raw));
    } catch {}
  };

  const saveSyncHealth = (health: SyncHealth) => {
    setSyncHealth(health);
    localStorage.setItem('raeen.sync.health', JSON.stringify(health));
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await window.ipcRenderer.invoke('cloud:syncProfileToCloud');
      await window.ipcRenderer.invoke('cloud:syncAchievements');
      setLastSync(new Date());
      localStorage.setItem('raeen.sync.lastSync', new Date().toISOString());
      saveSyncHealth({ ...syncHealth, successCount: syncHealth.successCount + 1, lastError: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      setSyncError(msg);
      saveSyncHealth({ ...syncHealth, errorCount: syncHealth.errorCount + 1, lastError: msg });
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleForceSync = async () => {
    setForceSyncing(true);
    setSyncError(null);
    try {
      await window.ipcRenderer.invoke('cloud:syncProfileToCloud');
      await window.ipcRenderer.invoke('cloud:syncAchievements');
      await window.ipcRenderer.invoke('cloud:syncProfileFromCloud');
      setLastSync(new Date());
      localStorage.setItem('raeen.sync.lastSync', new Date().toISOString());
      saveSyncHealth({ ...syncHealth, successCount: syncHealth.successCount + 1, lastError: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Force sync failed';
      setSyncError(msg);
      saveSyncHealth({ ...syncHealth, errorCount: syncHealth.errorCount + 1, lastError: msg });
    } finally {
      setTimeout(() => setForceSyncing(false), 500);
    }
  };

  const handleSignOut = async () => {
    try {
      await window.ipcRenderer.invoke('cloud:signOut');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  // Load persisted last sync time
  useEffect(() => {
    try {
      const saved = localStorage.getItem('raeen.sync.lastSync');
      if (saved) setLastSync(new Date(saved));
    } catch {}
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const healthStatus = syncHealth.errorCount === 0
    ? 'healthy'
    : syncHealth.errorCount > syncHealth.successCount
      ? 'degraded'
      : 'warning';

  const healthColor = healthStatus === 'healthy' ? 'text-green-400' : healthStatus === 'warning' ? 'text-yellow-400' : 'text-red-400';
  const healthBg = healthStatus === 'healthy' ? 'bg-green-500/15 border-green-500/30' : healthStatus === 'warning' ? 'bg-yellow-500/15 border-yellow-500/30' : 'bg-red-500/15 border-red-500/30';

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-xl transition-all shadow-lg backdrop-blur-sm"
        >
          <CloudOff size={18} className="text-blue-400" />
          <span className="text-sm font-medium text-white">Cloud Sync (Sign In)</span>
        </button>
        {showAuthModal && (
          <CloudAuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => { checkAuth(); setShowAuthModal(false); }} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-all shadow-lg backdrop-blur-sm ${
            syncError
              ? 'bg-red-600/20 hover:bg-red-600/30 border-red-500/50'
              : 'bg-green-600/20 hover:bg-green-600/30 border-green-500/50'
          }`}
        >
          {isSyncing || forceSyncing ? (
            <RefreshCw size={18} className="text-green-400 animate-spin" />
          ) : syncError ? (
            <AlertTriangle size={18} className="text-red-400" />
          ) : (
            <Cloud size={18} className="text-green-400" />
          )}
          <span className="text-sm font-medium text-white">
            {isSyncing ? 'Syncing...' : forceSyncing ? 'Force syncing...' : syncError ? 'Sync Error' : 'Cloud Connected'}
          </span>
          {lastSync && !isSyncing && !syncError && (
            <span className="text-[10px] text-gray-500">{formatTime(lastSync)}</span>
          )}
        </button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 mb-2 w-80 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* User Info */}
              <div className="p-4 border-b border-white/10 bg-gradient-to-r from-green-600/20 to-blue-600/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {currentUser?.email?.[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{currentUser?.email}</p>
                    <p className="text-xs text-gray-400">
                      {lastSync ? `Last sync: ${formatTime(lastSync)}` : 'Not synced yet'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sync Health */}
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Activity size={10} /> Sync Health
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${healthBg} ${healthColor}`}>
                    {healthStatus === 'healthy' ? 'Healthy' : healthStatus === 'warning' ? 'Warning' : 'Degraded'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-lg font-black text-green-400">{syncHealth.successCount}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Success</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-red-400">{syncHealth.errorCount}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-white">{lastSync ? formatTime(lastSync) : '—'}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Last Sync</div>
                  </div>
                </div>
                {syncHealth.lastError && (
                  <div className="mt-2 text-[10px] text-red-400 bg-red-500/10 rounded-lg px-2 py-1 truncate">
                    Last error: {syncHealth.lastError}
                  </div>
                )}
              </div>

              {/* Storage Usage */}
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Storage Used</span>
                  <span className="text-sm text-white font-medium">
                    {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.limit)}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((storageUsage.used / storageUsage.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Error Banner */}
              {syncError && (
                <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle size={12} />
                    <span className="truncate">{syncError}</span>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="p-2 space-y-1">
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={`text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                  {isSyncing && <span className="ml-auto text-xs text-gray-400">Syncing...</span>}
                </button>

                <button
                  onClick={handleForceSync}
                  disabled={forceSyncing || isSyncing}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Zap size={16} className={`text-yellow-400 ${forceSyncing ? 'animate-pulse' : ''}`} />
                  <span>Force Full Sync</span>
                  {forceSyncing && <span className="ml-auto text-xs text-gray-400">Running...</span>}
                </button>

                <button
                  onClick={() => {
                    window.ipcRenderer.invoke('cloud:syncProfileFromCloud');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Download size={16} className="text-green-400" />
                  <span>Download Profile</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Sync Status Footer */}
              <div className="p-3 border-t border-white/10 bg-black/20">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {syncError ? (
                    <>
                      <AlertCircle size={12} className="text-red-400" />
                      <span>Last sync failed — try "Force Full Sync"</span>
                    </>
                  ) : lastSync ? (
                    <>
                      <Check size={12} className="text-green-400" />
                      <span>All data synced</span>
                      <span className="ml-auto text-gray-600">{lastSync.toLocaleTimeString()}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={12} className="text-yellow-400" />
                      <span>Click "Sync Now" to upload data</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default CloudSyncWidget;
