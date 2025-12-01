import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Lock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AchievementCard from './AchievementCard';

interface Achievement {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  iconGrayUrl?: string;
  unlocked: boolean;
  unlockTime?: number;
  hidden: boolean;
  rarityPercent?: number;
}

interface AchievementsListProps {
  gameId: string;
  gameName?: string;
  platform?: string;
  platformId?: string;
}

const AchievementsList: React.FC<AchievementsListProps> = ({ gameId, gameName, platform, platformId }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<{ total: number; unlocked: number; percent: number }>({
    total: 0,
    unlocked: 0,
    percent: 0,
  });
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'unlock_time' | 'rarity'>('name');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadAchievements();

    // Listen for achievement updates
    const unsubscribe = window.ipcRenderer.on('achievements:update', (_event: any, data: any) => {
      if (data.gameId === gameId) {
        setAchievements(data.achievements);
        setStats(data.stats);
      }
    });

    return unsubscribe;
  }, [gameId]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const [achievementsData, statsData] = await Promise.all([
        window.ipcRenderer.invoke('achievements:getGameAchievements', gameId),
        window.ipcRenderer.invoke('achievements:getGameStats', gameId),
      ]);

      setAchievements(achievementsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!platform || !platformId || platform !== 'steam') {
      alert('Achievement sync is only available for Steam games with valid App IDs');
      return;
    }

    try {
      setSyncing(true);
      const success = await window.ipcRenderer.invoke('achievements:syncSteam', gameId, platformId);

      if (success) {
        await loadAchievements();
      } else {
        alert('Failed to sync achievements. Make sure Steam API key and Steam ID are configured in settings.');
      }
    } catch (error) {
      console.error('Failed to sync achievements:', error);
      alert('Failed to sync achievements');
    } finally {
      setSyncing(false);
    }
  };

  const filteredAchievements = achievements.filter((achievement) => {
    if (filter === 'unlocked') return achievement.unlocked;
    if (filter === 'locked') return !achievement.unlocked;
    return true;
  });

  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'unlock_time') {
      if (!a.unlockTime) return 1;
      if (!b.unlockTime) return -1;
      return b.unlockTime - a.unlockTime;
    } else if (sortBy === 'rarity') {
      const aRarity = a.rarityPercent ?? 100;
      const bRarity = b.rarityPercent ?? 100;
      return aRarity - bRarity;
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Trophy size={48} className="text-gray-600" />
        <p className="text-gray-400">No achievements available</p>
        {platform === 'steam' && platformId && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Steam Achievements'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <Trophy className="text-yellow-500" />
            Achievements
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-sm text-gray-400">
              <span className="text-white font-semibold">{stats.unlocked}</span> / {stats.total} Unlocked
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
              <TrendingUp size={14} />
              {stats.percent}%
            </div>
          </div>
        </div>

        {platform === 'steam' && platformId && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-3 bg-black/40 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.percent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
          />
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex items-center gap-3 mb-4">
        {/* Filter */}
        <div className="flex bg-black/20 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded text-sm transition-all ${
              filter === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({achievements.length})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-3 py-1.5 rounded text-sm transition-all ${
              filter === 'unlocked' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Trophy size={14} className="inline mr-1" />
            Unlocked ({stats.unlocked})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-3 py-1.5 rounded text-sm transition-all ${
              filter === 'locked' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lock size={14} className="inline mr-1" />
            Locked ({stats.total - stats.unlocked})
          </button>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-1.5 bg-black/20 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/30"
        >
          <option value="name">Sort by Name</option>
          <option value="unlock_time">Sort by Unlock Date</option>
          <option value="rarity">Sort by Rarity</option>
        </select>
      </div>

      {/* Achievement List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} size="medium" />
          ))}
        </AnimatePresence>

        {sortedAchievements.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p>No achievements match the current filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsList;
