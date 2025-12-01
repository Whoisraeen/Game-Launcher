import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Upload, Download, Check, AlertCircle, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CloudAuthModal from './CloudAuthModal';

const CloudSyncWidget: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 0 });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    if (isAuthenticated) {
      loadStorageUsage();
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

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Sync profile
      await window.ipcRenderer.invoke('cloud:syncProfileToCloud');

      // Sync achievements
      await window.ipcRenderer.invoke('cloud:syncAchievements');

      setLastSync(new Date());
      setTimeout(() => setIsSyncing(false), 1000);
    } catch (error) {
      console.error('Failed to sync:', error);
      setIsSyncing(false);
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
          <CloudAuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              checkAuth();
              setShowAuthModal(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 rounded-xl transition-all shadow-lg backdrop-blur-sm"
        >
          {isSyncing ? (
            <RefreshCw size={18} className="text-green-400 animate-spin" />
          ) : (
            <Cloud size={18} className="text-green-400" />
          )}
          <span className="text-sm font-medium text-white">
            {isSyncing ? 'Syncing...' : 'Cloud Connected'}
          </span>
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
                    <p className="font-semibold text-white truncate">
                      {currentUser?.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      {lastSync ? `Last sync: ${formatTime(lastSync)}` : 'Not synced yet'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Storage Usage */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Storage Used</span>
                  <span className="text-sm text-white font-medium">
                    {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.limit)}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (storageUsage.used / storageUsage.limit) * 100,
                        100
                      )}%`
                    }}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-2 space-y-1">
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSyncing ? (
                    <RefreshCw size={16} className="animate-spin text-blue-400" />
                  ) : (
                    <RefreshCw size={16} className="text-blue-400" />
                  )}
                  <span>Sync Now</span>
                  {isSyncing && <span className="ml-auto text-xs text-gray-400">Syncing...</span>}
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

              {/* Sync Status */}
              <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {lastSync ? (
                    <>
                      <Check size={12} className="text-green-400" />
                      <span>All data synced</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} className="text-yellow-400" />
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
