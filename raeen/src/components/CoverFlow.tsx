import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Game } from '../types';
import { CachedImage } from './CachedImage';
import { getPlatformIcon } from '../utils/platformUtils';

interface CoverFlowProps {
  games: Game[];
  onGameClick: (game: Game) => void;
  onLaunch?: (gameId: string) => void;
}

const CoverFlow: React.FC<CoverFlowProps> = ({ games, onGameClick, onLaunch }) => {
  const [centerIndex, setCenterIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Enter' && games[centerIndex]) {
        onGameClick(games[centerIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [centerIndex, games]);

  const goToPrevious = () => {
    setCenterIndex((prev) => (prev > 0 ? prev - 1 : games.length - 1));
  };

  const goToNext = () => {
    setCenterIndex((prev) => (prev < games.length - 1 ? prev + 1 : 0));
  };

  const goToIndex = (index: number) => {
    setCenterIndex(index);
  };

  // Calculate position and scale for each card
  const getCardTransform = (index: number) => {
    const diff = index - centerIndex;
    const absDiff = Math.abs(diff);

    // Center card
    if (diff === 0) {
      return {
        x: 0,
        z: 0,
        scale: 1.2,
        opacity: 1,
        rotateY: 0,
        blur: 0,
      };
    }

    // Side cards
    const side = diff > 0 ? 1 : -1;
    const spacing = 220; // Horizontal spacing
    const depthSpacing = 150; // Depth spacing

    return {
      x: side * spacing * Math.min(absDiff, 3),
      z: -depthSpacing * Math.min(absDiff, 3),
      scale: Math.max(0.6, 1 - absDiff * 0.2),
      opacity: Math.max(0.3, 1 - absDiff * 0.3),
      rotateY: side * Math.min(absDiff * 35, 50),
      blur: Math.min(absDiff * 2, 6),
    };
  };

  // Get visible range of cards
  const getVisibleRange = () => {
    const range = 4; // Show 4 cards on each side
    const start = Math.max(0, centerIndex - range);
    const end = Math.min(games.length, centerIndex + range + 1);
    return { start, end };
  };

  const { start, end } = getVisibleRange();
  const visibleGames = games.slice(start, end);
  const currentGame = games[centerIndex];

  if (games.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>No games to display</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col items-center justify-center relative overflow-hidden pb-20">
      {/* Cover Flow 3D Carousel */}
      <div className="relative h-[500px] w-full flex items-center justify-center perspective-1000">
        <div className="relative w-full h-full flex items-center justify-center">
          {visibleGames.map((game, idx) => {
            const actualIndex = start + idx;
            const transform = getCardTransform(actualIndex);

            return (
              <motion.div
                key={game.id}
                className="absolute cursor-pointer"
                style={{
                  transformStyle: 'preserve-3d',
                }}
                initial={false}
                animate={{
                  x: transform.x,
                  z: transform.z,
                  scale: transform.scale,
                  opacity: transform.opacity,
                  rotateY: transform.rotateY,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 30,
                }}
                onClick={() => {
                  if (actualIndex === centerIndex) {
                    onGameClick(game);
                  } else {
                    goToIndex(actualIndex);
                  }
                }}
              >
                <div
                  className="relative rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    width: '280px',
                    height: '400px',
                    filter: `blur(${transform.blur}px)`,
                    transition: 'filter 0.3s ease',
                  }}
                >
                  <CachedImage
                    src={game.cover || ''}
                    alt={game.title}
                    className="w-full h-full object-cover"
                    placeholderSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Platform badge */}
                  {actualIndex === centerIndex && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full p-2"
                    >
                      <img
                        src={getPlatformIcon(game.platform)}
                        alt={game.platform}
                        className="w-5 h-5"
                      />
                    </motion.div>
                  )}

                  {/* Title at bottom */}
                  {actualIndex === centerIndex && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-0 left-0 right-0 p-6"
                    >
                      <h3 className="text-xl font-bold text-white truncate">{game.title}</h3>
                      {game.genre && (
                        <p className="text-sm text-gray-300 mt-1">{game.genre}</p>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-32 left-0 right-0 flex items-center justify-center gap-6 z-10">
        <button
          onClick={goToPrevious}
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 transition-all"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Current Game Info */}
        <div className="flex flex-col items-center gap-2 min-w-[300px]">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {centerIndex + 1} / {games.length}
            </span>
            {currentGame && onLaunch && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLaunch(currentGame.id);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
              >
                <Play size={16} fill="white" />
                <span className="text-sm font-medium">Play</span>
              </button>
            )}
          </div>

          {/* Dot indicators */}
          <div className="flex gap-1.5">
            {games.slice(Math.max(0, centerIndex - 5), Math.min(games.length, centerIndex + 6)).map((game, idx) => {
              const actualIdx = Math.max(0, centerIndex - 5) + idx;
              return (
                <button
                  key={game.id}
                  onClick={() => goToIndex(actualIdx)}
                  className={`transition-all rounded-full ${
                    actualIdx === centerIndex
                      ? 'w-8 h-2 bg-white'
                      : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <button
          onClick={goToNext}
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 transition-all"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-xs text-gray-500">
        <span>Use arrow keys to navigate • Enter to view details</span>
      </div>
    </div>
  );
};

export default CoverFlow;
