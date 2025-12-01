import React, { useState, useEffect } from 'react';
import { Download, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameUpdate {
  id: string;
  gameId: string;
  gameName: string;
  platform: string;
  version: string;
  newVersion: string;
  releaseNotes?: string;
  updateSize?: string;
  detectedAt: number;
  status: 'pending' | 'downloading' | 'downloaded' | 'installed' | 'failed';
  priority: 'critical' | 'high' | 'normal' | 'low';
  autoUpdate: boolean;
  progress?: number;
}

const UpdatesWidget: React.FC = () => {
  const [updates, setUpdates] = useState<GameUpdate[]>([]);
  const [checking, setChecking] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadPendingUpdates();

    // Refresh every 5 minutes
    const interval = setInterval(loadPendingUpdates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingUpdates = async () => {
    try {
      const pendingUpdates = await window.ipcRenderer.invoke('updates:getPending');
      setUpdates(pendingUpdates);
    } catch (error) {
      console.error('Failed to load pending updates:', error);
    }
  };

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const result = await window.ipcRenderer.invoke('updates:checkAll');
      setUpdates(result.updates);
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const triggerUpdate = async (updateId: string) => {
    try {
      await window.ipcRenderer.invoke('updates:trigger', updateId);
      // Reload to see status change
      setTimeout(loadPendingUpdates, 1000);
    } catch (error) {
      console.error('Failed to trigger update:', error);
    }
  };

  const dismissUpdate = async (updateId: string) => {
    try {
      await window.ipcRenderer.invoke('updates:dismiss', updateId);
      setUpdates(updates.filter(u => u.id !== updateId));
    } catch (error) {
      console.error('Failed to dismiss update:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 border-red-500/50';
      case 'high': return 'text-orange-400 border-orange-500/50';
      case 'normal': return 'text-blue-400 border-blue-500/50';
      case 'low': return 'text-gray-400 border-gray-500/50';
      default: return 'text-gray-400 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'downloading':
        return <RefreshCw size={14} className="animate-spin" />;
      case 'downloaded':
        return <Check size={14} />;
      case 'failed':
        return <AlertCircle size={14} />;
      default:
        return <Download size={14} />;
    }
  };

  if (updates.length === 0) {
    return null; // Don't show widget if no updates
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-40"
    >
      <div className="bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-w-md">
        {/* Header */}
        <div
          className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Download size={20} className="text-blue-400" />
                {updates.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                    {updates.length}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  {updates.length} Update{updates.length !== 1 ? 's' : ''} Available
                </h3>
                <p className="text-xs text-gray-400">Click to {expanded ? 'collapse' : 'expand'}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                checkForUpdates();
              }}
              disabled={checking}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Updates List */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="max-h-96 overflow-y-auto p-2 space-y-2">
                {updates.map((update) => (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-3 rounded-lg border-l-4 bg-white/5 ${getPriorityColor(update.priority)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm truncate">
                          {update.gameName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <span className="capitalize">{update.platform}</span>
                          <span>•</span>
                          <span>{update.version} → {update.newVersion}</span>
                        </div>
                        {update.updateSize && (
                          <div className="text-xs text-gray-500 mt-1">
                            Size: {update.updateSize}
                          </div>
                        )}
                        {update.releaseNotes && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                            {update.releaseNotes}
                          </p>
                        )}
                        {update.status === 'downloading' && update.progress !== undefined && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${update.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{update.progress}% complete</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {update.status === 'pending' && (
                          <button
                            onClick={() => triggerUpdate(update.id)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            title="Download Update"
                          >
                            {getStatusIcon(update.status)}
                          </button>
                        )}
                        <button
                          onClick={() => dismissUpdate(update.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                          title="Dismiss"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => setExpanded(false)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Collapse
                </button>
                <button
                  onClick={checkForUpdates}
                  disabled={checking}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
                  Check for Updates
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default UpdatesWidget;
