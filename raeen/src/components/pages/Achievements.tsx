import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Zap, Clock, Star, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import AchievementCard from '../AchievementCard';

interface Achievement {
  id: string;
  gameId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  iconGrayUrl?: string;
  unlocked: boolean;
  unlockTime?: number;
  hidden: boolean;
  rarityPercent?: number;
}

interface OverallProgress {
  totalGames: number;
  gamesWithAchievements: number;
  totalAchievements: number;
  unlockedAchievements: number;
  percent: number;
}

const Achievements: React.FC = () => {
  const [overallProgress, setOverallProgress] = useState<OverallProgress>({
    totalGames: 0,
    gamesWithAchievements: 0,
    totalAchievements: 0,
    unlockedAchievements: 0,
    percent: 0,
  });
  const [recentlyUnlocked, setRecentlyUnlocked] = useState<Achievement[]>([]);
  const [rarestUnlocked, setRarestUnlocked] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [progress, recent, rarest] = await Promise.all([
        window.ipcRenderer.invoke('achievements:getOverallProgress'),
        window.ipcRenderer.invoke('achievements:getRecentlyUnlocked', 10),
        window.ipcRenderer.invoke('achievements:getRarestUnlocked', 10),
      ]);

      setOverallProgress(progress);
      setRecentlyUnlocked(recent);
      setRarestUnlocked(rarest);
    } catch (error) {
      console.error('Failed to load achievements data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!confirm('This will sync achievements for all Steam games in your library. This may take a while. Continue?')) {
      return;
    }

    try {
      setSyncing(true);
      const result = await window.ipcRenderer.invoke('achievements:syncAllSteam');
      alert(`Sync complete! ${result.success} games synced successfully, ${result.failed} failed.`);
      await loadData();
    } catch (error) {
      console.error('Failed to sync achievements:', error);
      alert('Failed to sync achievements');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-gray-400">Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-4">
            <Trophy className="text-yellow-500" size={40} />
            Achievement Center
          </h1>
          <p className="text-gray-400 mt-2">Track your gaming accomplishments across all platforms</p>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
          <span>{syncing ? 'Syncing All...' : 'Sync All Steam Games'}</span>
        </button>
      </div>

      {/* Overall Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Trophy className="text-blue-400" size={28} />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{overallProgress.totalAchievements}</div>
              <div className="text-sm text-gray-400">Total Achievements</div>
            </div>
          </div>
        </motion.div>

        {/* Unlocked */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <Zap className="text-green-400" size={28} />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{overallProgress.unlockedAchievements}</div>
              <div className="text-sm text-gray-400">Unlocked</div>
            </div>
          </div>
        </motion.div>

        {/* Completion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <TrendingUp className="text-purple-400" size={28} />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{overallProgress.percent}%</div>
              <div className="text-sm text-gray-400">Completion</div>
            </div>
          </div>
        </motion.div>

        {/* Games Tracked */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <Star className="text-yellow-400" size={28} />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{overallProgress.gamesWithAchievements}</div>
              <div className="text-sm text-gray-400">Games Tracked</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress Bar */}
      {overallProgress.totalAchievements > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Overall Progress</h3>
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              {overallProgress.percent}%
            </span>
          </div>
          <div className="h-4 bg-black/40 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress.percent}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>{overallProgress.unlockedAchievements} unlocked</span>
            <span>{overallProgress.totalAchievements - overallProgress.unlockedAchievements} remaining</span>
          </div>
        </motion.div>
      )}

      {/* Achievement Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
        {/* Recently Unlocked */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Recently Unlocked</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {recentlyUnlocked.length > 0 ? (
              recentlyUnlocked.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} size="medium" />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Trophy size={48} className="opacity-20 mb-4" />
                <p>No achievements unlocked yet</p>
                <p className="text-sm mt-2">Start playing to unlock achievements!</p>
              </div>
            )}
          </div>
        </div>

        {/* Rarest Unlocked */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <Star className="text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Rarest Unlocked</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {rarestUnlocked.length > 0 ? (
              rarestUnlocked.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} size="medium" />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Star size={48} className="opacity-20 mb-4" />
                <p>No rare achievements unlocked yet</p>
                <p className="text-sm mt-2">Keep playing to unlock rare achievements!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
