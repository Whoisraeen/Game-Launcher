import React from 'react';
import { Trophy, Lock, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

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

interface AchievementCardProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, size = 'medium' }) => {
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRarityColor = (percent?: number) => {
    if (!percent) return 'text-gray-400';
    if (percent < 1) return 'text-purple-400';
    if (percent < 5) return 'text-red-400';
    if (percent < 15) return 'text-orange-400';
    if (percent < 30) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getRarityText = (percent?: number) => {
    if (!percent) return '';
    if (percent < 1) return 'Ultra Rare';
    if (percent < 5) return 'Rare';
    if (percent < 15) return 'Uncommon';
    if (percent < 30) return 'Common';
    return 'Very Common';
  };

  const sizeClasses = {
    small: 'h-16 w-16',
    medium: 'h-20 w-20',
    large: 'h-28 w-28',
  };

  const containerClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  };

  if (achievement.hidden && !achievement.unlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`glass-card ${containerClasses[size]} relative group`}
      >
        <div className="flex items-center gap-3">
          <div className={`${sizeClasses[size]} rounded-xl bg-black/40 flex items-center justify-center`}>
            <Lock className="text-gray-600" size={size === 'small' ? 24 : size === 'medium' ? 32 : 40} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-gray-500 ${size === 'small' ? 'text-sm' : 'text-base'}`}>
              Hidden Achievement
            </h4>
            <p className={`text-gray-600 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
              Keep playing to unlock
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card ${containerClasses[size]} relative group transition-all duration-300 ${
        achievement.unlocked ? 'hover:shadow-lg hover:shadow-blue-500/20' : 'opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Achievement Icon */}
        <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shrink-0 relative`}>
          {achievement.iconUrl ? (
            <img
              src={achievement.unlocked ? achievement.iconUrl : achievement.iconGrayUrl || achievement.iconUrl}
              alt={achievement.name}
              className={`w-full h-full object-cover ${!achievement.unlocked ? 'grayscale opacity-50' : ''}`}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${
              achievement.unlocked
                ? 'from-blue-500 to-purple-600'
                : 'from-gray-600 to-gray-700'
            } flex items-center justify-center`}>
              <Trophy className="text-white" size={size === 'small' ? 24 : size === 'medium' ? 32 : 40} />
            </div>
          )}

          {/* Unlocked Badge */}
          {achievement.unlocked && (
            <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
              <Trophy size={size === 'small' ? 10 : 12} className="text-white" />
            </div>
          )}
        </div>

        {/* Achievement Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold ${achievement.unlocked ? 'text-white' : 'text-gray-400'} ${
              size === 'small' ? 'text-sm' : size === 'medium' ? 'text-base' : 'text-lg'
            } truncate`}>
              {achievement.name}
            </h4>

            {/* Rarity Badge */}
            {achievement.rarityPercent !== undefined && (
              <span className={`${
                size === 'small' ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'
              } rounded-full bg-black/40 ${getRarityColor(achievement.rarityPercent)} font-medium shrink-0`}>
                {achievement.rarityPercent.toFixed(1)}%
              </span>
            )}
          </div>

          {/* Description */}
          {achievement.description && (
            <p className={`${achievement.unlocked ? 'text-gray-300' : 'text-gray-500'} ${
              size === 'small' ? 'text-xs' : 'text-sm'
            } mt-1 line-clamp-2`}>
              {achievement.description}
            </p>
          )}

          {/* Unlock Info */}
          <div className="flex items-center gap-3 mt-2">
            {achievement.unlocked && achievement.unlockTime && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock size={12} />
                <span>{formatDate(achievement.unlockTime)}</span>
              </div>
            )}

            {achievement.rarityPercent !== undefined && (
              <span className={`text-xs ${getRarityColor(achievement.rarityPercent)}`}>
                {getRarityText(achievement.rarityPercent)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Shine effect on hover for unlocked achievements */}
      {achievement.unlocked && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </div>
      )}
    </motion.div>
  );
};

export default AchievementCard;
