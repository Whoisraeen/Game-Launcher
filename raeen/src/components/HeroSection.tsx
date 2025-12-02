import React, { useEffect } from 'react';
import { Play, Clock, Gamepad2, Users, TrendingUp, Trophy } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { getPlatformIcon, getPlatformName } from '../utils/platformUtils';
import { CachedImage } from './CachedImage';

const HeroSection: React.FC = () => {
    const { games, recommendations, loadRecommendations, launchGame } = useGameStore();
    const { setSelectedGame } = useUIStore();

    useEffect(() => {
        loadRecommendations();
    }, [loadRecommendations]);

    // Find the most recently played game
    const lastPlayed = [...games].sort((a, b) => {
        const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
        const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
        return dateB - dateA;
    })[0];

    // Get Play Next suggestions (use recommendations or fallback to recent games)
    const playNextGames = recommendations.length > 0 
        ? recommendations.slice(0, 3) 
        : games.filter(g => g.id !== lastPlayed?.id).slice(0, 3);

    const getRecommendationReason = (index: number, game: any) => {
        if (game.playStatus === 'backlog') return { text: 'Finish your backlog', icon: <Clock size={12} /> };
        if (game.isFavorite) return { text: 'Jump back in', icon: <TrendingUp size={12} /> };
        
        const reasons = [
            { text: 'Based on your history', icon: <Gamepad2 size={12} /> },
            { text: 'Friends are playing', icon: <Users size={12} /> },
            { text: 'Trending now', icon: <TrendingUp size={12} /> }
        ];
        return reasons[index % reasons.length];
    };

    if (!lastPlayed) return null;

    const hasVideo = lastPlayed.backgroundVideo || (lastPlayed.heroImage && /\.(mp4|webm)$/i.test(lastPlayed.heroImage));

    return (
        <div className="relative h-[500px] w-full rounded-2xl overflow-hidden shrink-0 group shadow-2xl ring-1 ring-white/10">
            {/* Background Media */}
            <div className="absolute inset-0 z-0">
                {hasVideo ? (
                    <video
                        src={lastPlayed.backgroundVideo || lastPlayed.heroImage}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[20s]"
                    />
                ) : lastPlayed.heroImage ? (
                    <CachedImage 
                        src={lastPlayed.heroImage} 
                        alt="Hero Background" 
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[20s]"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-950" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/40 to-transparent" />
            </div>

            {/* Main Content Container */}
            <div className="absolute inset-0 z-10 p-10 flex flex-col justify-end md:flex-row md:items-end md:justify-between gap-8">
                
                {/* Left Side: Main Game Info */}
                <div className="flex-1 space-y-6 max-w-2xl">
                    {/* Logo or Title */}
                    {lastPlayed.logo ? (
                         <img src={lastPlayed.logo} alt={lastPlayed.title} className="max-h-32 object-contain origin-left drop-shadow-2xl" />
                    ) : (
                        <h1 className="text-6xl font-black text-white tracking-tighter leading-none drop-shadow-2xl">
                            {lastPlayed.title}
                        </h1>
                    )}

                    {/* Meta Tags */}
                    <div className="flex items-center gap-4 text-sm font-medium text-gray-300">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-md border border-white/10">
                            <img src={getPlatformIcon(lastPlayed.platform)} alt={lastPlayed.platform} className="w-4 h-4" />
                            <span className="uppercase tracking-wider text-xs">{getPlatformName(lastPlayed.platform)}</span>
                        </div>
                        {lastPlayed.playtime > 0 && (
                            <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-md border border-white/5">
                                <Clock size={14} className="text-gray-400" />
                                {Math.round(lastPlayed.playtime)}h Played
                            </span>
                        )}
                        {lastPlayed.achievements && lastPlayed.achievements.total > 0 && (
                            <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-md border border-white/5">
                                <Trophy size={14} className="text-yellow-500" />
                                {lastPlayed.achievements.unlocked}/{lastPlayed.achievements.total}
                            </span>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 pt-2">
                        <button 
                            onClick={() => launchGame(lastPlayed.id)}
                            className="bg-white text-black hover:bg-gray-200 px-10 py-4 rounded-xl font-bold flex items-center gap-3 transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)] group/btn"
                        >
                            <Play size={24} fill="currentColor" className="group-hover/btn:fill-black" />
                            <span className="text-lg">RESUME</span>
                        </button>
                        <button 
                            onClick={() => setSelectedGame(lastPlayed)}
                            className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-xl font-bold backdrop-blur-md border border-white/10 transition-all hover:border-white/30"
                        >
                            DETAILS
                        </button>
                    </div>
                </div>

                {/* Right Side: Play Next Recommendations */}
                <div className="flex flex-col gap-4 w-full md:w-auto min-w-[300px]">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                        <Gamepad2 size={16} />
                        Play Next
                    </h3>
                    
                    <div className="flex flex-col gap-3">
                        {playNextGames.map((game, idx) => {
                            const reason = getRecommendationReason(idx, game);
                            return (
                                <div 
                                    key={game.id}
                                    onClick={() => setSelectedGame(game)}
                                    className="group/card relative flex items-center gap-4 bg-black/40 hover:bg-white/10 backdrop-blur-md border border-white/5 hover:border-white/20 p-3 rounded-xl transition-all cursor-pointer w-full md:w-80"
                                >
                                    {/* Small Cover */}
                                    <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 relative">
                                        <CachedImage 
                                            src={game.heroImage || game.cover || ''} 
                                            className="w-full h-full object-cover transition-transform group-hover/card:scale-110" 
                                        />
                                        <div className="absolute inset-0 bg-black/20" />
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                                            {reason.icon}
                                            {reason.text}
                                        </div>
                                        <h4 className="text-white font-bold truncate leading-tight group-hover/card:text-blue-400 transition-colors">
                                            {game.title}
                                        </h4>
                                    </div>

                                    {/* Platform Icon */}
                                    <div className="opacity-50 group-hover/card:opacity-100 transition-opacity">
                                        <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-5 h-5" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HeroSection;