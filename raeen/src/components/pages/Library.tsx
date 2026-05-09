import React, { useCallback, useState } from 'react';
import { Zap } from 'lucide-react';
import GameGrid from '../GameGrid';
import HeroSection from '../HeroSection';
import { useGameStore } from '../../stores/gameStore';

const Library: React.FC = () => {
    const { games, launchGame } = useGameStore();
    const [quickPlayFeedback, setQuickPlayFeedback] = useState<string | null>(null);

    const handleQuickPlay = useCallback(() => {
        const eligible = games.filter(g => g.status === 'installed' && !g.isHidden);
        if (eligible.length === 0) {
            setQuickPlayFeedback('No installed games found');
            setTimeout(() => setQuickPlayFeedback(null), 2000);
            return;
        }
        const pick = eligible[Math.floor(Math.random() * eligible.length)];
        setQuickPlayFeedback(`Launching ${pick.title}…`);
        launchGame(pick.id);
        setTimeout(() => setQuickPlayFeedback(null), 3000);
    }, [games, launchGame]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-6 pt-6 pb-2 shrink-0 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                    <HeroSection />
                </div>
                <div className="flex flex-col items-center gap-2 pt-2 shrink-0">
                    <button
                        onClick={handleQuickPlay}
                        title="Launch a random installed game"
                        className="group relative flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30 hover:border-yellow-400/50 rounded-xl font-bold text-white transition-all hover:scale-[1.03] shadow-lg shadow-yellow-500/10"
                    >
                        <Zap size={18} className="text-yellow-400 group-hover:drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                        <span className="text-sm tracking-wider">QUICK PLAY</span>
                    </button>
                    {quickPlayFeedback && (
                        <span className="text-xs text-yellow-300/80 animate-pulse whitespace-nowrap">
                            {quickPlayFeedback}
                        </span>
                    )}
                </div>
            </div>
            <GameGrid />
        </div>
    );
};

export default Library;