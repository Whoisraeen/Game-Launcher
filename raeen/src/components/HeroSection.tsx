import React, { useMemo } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { getPlatformIcon, getPlatformName } from '../data/LauncherData';
import { useGameStore } from '../stores/gameStore';
import { Game } from '../types';

const HeroSection: React.FC = () => {
    const { games, launchGame, openPlatform, syncLibrary, isLoading } = useGameStore();

    const lastPlayed = useMemo<Game | null>(() => {
        if (games.length === 0) return null;
        // Sort by lastPlayed descending
        const sorted = [...games].sort((a, b) => (b.lastPlayed?.getTime() || 0) - (a.lastPlayed?.getTime() || 0));
        // Return most recent, or just the first one if none played
        return sorted[0];
    }, [games]);

    const recommendations = useMemo<{ game: Game, reason: string }[]>(() => {
        if (games.length < 2) return [];
        
        // Simple recommendation logic
        // 1. Backlog (installed but low playtime)
        const backlog = games.filter(g => g.status === 'installed' && g.playtime < 2 && g.id !== lastPlayed?.id);
        
        // 2. Random pick
        const others = games.filter(g => g.id !== lastPlayed?.id);
        
        const result: { game: Game, reason: string }[] = [];
        
        if (backlog.length > 0) {
            result.push({ game: backlog[0], reason: 'Finish your backlog' });
        }
        
        // Fill rest with random
        others.forEach(g => {
            if (result.length < 3 && !result.find(r => r.game.id === g.id)) {
                result.push({ game: g, reason: 'Recommended for you' });
            }
        });
        
        return result.slice(0, 3);
    }, [games, lastPlayed]);

    if (games.length === 0) {
        return (
             <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shrink-0 group border border-white/5 bg-slate-800/50 flex flex-col items-center justify-center text-center p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                <h1 className="text-4xl font-bold text-white mb-4 relative z-10">Welcome to Raeen Launcher</h1>
                <p className="text-gray-400 text-lg mb-8 max-w-md relative z-10">
                    Your library is currently empty. Sync your games to get started and see your collection come to life.
                </p>
                <button 
                    onClick={() => syncLibrary()}
                    disabled={isLoading}
                    className="relative z-10 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                    <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                    {isLoading ? "Scanning..." : "Sync Library"}
                </button>
             </div>
        );
    }

    if (!lastPlayed) return null;

    return (
        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shrink-0 group">
            {/* Background Image */}
            <img 
                src={lastPlayed.heroImage || lastPlayed.cover} 
                alt={lastPlayed.title} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between">
                {/* Game Logo / Title Area */}
                <div className="mt-8 ml-4">
                    {lastPlayed.logo ? (
                        <img src={lastPlayed.logo} alt={lastPlayed.title} className="h-32 object-contain drop-shadow-2xl" />
                    ) : (
                        <h1 className="text-6xl font-black text-white tracking-wider uppercase drop-shadow-2xl" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                            {lastPlayed.title}
                        </h1>
                    )}
                </div>

                {/* Actions & Play Next */}
                <div className="flex flex-col gap-8">
                    {/* Buttons */}
                    <div className="flex items-center gap-4 ml-4">
                        <button 
                            onClick={() => launchGame(lastPlayed.id)}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white px-8 py-3 rounded-lg flex items-center gap-2 font-bold text-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95"
                        >
                            <Play className="fill-current" size={20} />
                            PLAY NOW
                        </button>
                        <button 
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg font-medium backdrop-blur-md transition-colors flex items-center gap-2 border border-white/10"
                            onClick={() => openPlatform(lastPlayed.platform)}
                        >
                            <img src={getPlatformIcon(lastPlayed.platform)} alt={lastPlayed.platform} className="w-5 h-5" />
                            {getPlatformName(lastPlayed.platform)}
                        </button>
                    </div>

                    {/* Play Next Row */}
                    <div className="flex items-center gap-4">
                        <div className="text-white font-bold w-20 leading-tight">Play<br/>Next</div>
                        
                        {recommendations.map((rec) => (
                            <PlayNextCard 
                                key={rec.game.id}
                                title={rec.game.title} 
                                desc={rec.reason} 
                                image={rec.game.heroImage || rec.game.cover || ''}
                                icon={getPlatformIcon(rec.game.platform)}
                                onClick={() => launchGame(rec.game.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PlayNextCard = ({ title, desc, image, icon, onClick }: { title: string, desc: string, image: string, icon: string, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className="relative h-16 w-64 rounded-xl overflow-hidden bg-slate-800/80 border border-white/10 flex items-center group cursor-pointer hover:border-white/30 transition-all"
    >
        <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
        
        <div className="relative z-10 p-3 flex items-center gap-3 w-full">
            <img src={image} alt="Icon" className="w-10 h-10 rounded-lg object-cover shadow-lg border border-white/10" />
            <div className="flex-1 overflow-hidden">
                <h4 className="text-white font-bold text-sm truncate">{title}</h4>
                <p className="text-gray-400 text-[10px] truncate">{desc}</p>
            </div>
             <div className="bg-white/10 p-1 rounded-full">
                <img src={icon} alt="Platform" className="w-3 h-3 invert" />
            </div>
        </div>
    </div>
);

export default HeroSection;
