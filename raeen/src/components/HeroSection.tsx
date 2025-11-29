import React, { useEffect } from 'react';
import { Play, Clock, Trophy } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { getPlatformIcon, getPlatformName } from '../data/LauncherData';
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

    if (!lastPlayed) return null;

    return (
        <div className="relative h-80 w-full rounded-2xl overflow-hidden shrink-0 group">
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0">
                {lastPlayed.heroImage ? (
                    <CachedImage 
                        src={lastPlayed.heroImage} 
                        alt="Hero Background" 
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-8 w-full flex items-end justify-between z-10">
                <div className="flex items-end gap-6">
                    {/* Game Cover */}
                    <div className="w-32 h-48 rounded-lg overflow-hidden shadow-2xl border border-white/10 transform group-hover:scale-105 transition-transform duration-500 origin-bottom-left hidden md:block">
                        <CachedImage 
                            src={lastPlayed.cover || ''} 
                            alt={lastPlayed.title} 
                            className="w-full h-full object-cover"
                            placeholderSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="
                        />
                    </div>

                    {/* Text Info */}
                    <div className="mb-2 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                                <img src={getPlatformIcon(lastPlayed.platform)} alt={lastPlayed.platform} className="w-4 h-4" />
                                <span className="text-xs font-bold tracking-wider text-white uppercase">{getPlatformName(lastPlayed.platform)}</span>
                            </div>
                            {lastPlayed.lastPlayed && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock size={12} />
                                    Last played {new Date(lastPlayed.lastPlayed).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        
                        <div>
                            <h1 className="text-5xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-lg line-clamp-1">
                                {lastPlayed.title}
                            </h1>
                            <p className="text-gray-300 max-w-xl line-clamp-2 text-sm">
                                {lastPlayed.description || "Ready to jump back in? This game is waiting for you."}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => launchGame(lastPlayed.id)}
                                className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                            >
                                <Play size={18} fill="currentColor" />
                                Resume
                            </button>
                            <button 
                                onClick={() => setSelectedGame(lastPlayed)}
                                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-bold backdrop-blur-md border border-white/10 transition-all"
                            >
                                Details
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats / Recommendations */}
                <div className="hidden xl:flex flex-col gap-4 items-end">
                    <div className="flex gap-4">
                        <div className="text-right">
                            <div className="text-3xl font-black text-white">{Math.round(lastPlayed.playtime || 0)}h</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Playtime</div>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-green-400">{lastPlayed.achievements?.unlocked || 0}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Achievements</div>
                        </div>
                    </div>

                    {recommendations.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-right">Recommended For You</h3>
                            <div className="flex gap-3">
                                {recommendations.slice(0, 3).map(rec => (
                                    <div 
                                        key={rec.id} 
                                        onClick={() => setSelectedGame(rec)}
                                        className="w-12 h-16 rounded-md overflow-hidden border border-white/10 hover:border-white/50 transition-colors cursor-pointer relative group/rec" 
                                        title={rec.title}
                                    >
                                        <CachedImage 
                                            src={rec.cover || ''} 
                                            className="w-full h-full object-cover" 
                                            placeholderSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="
                                        />
                                        <div className="absolute bottom-0 right-0 p-0.5 bg-black/60 backdrop-blur-sm">
                                            <img src={getPlatformIcon(rec.platform)} alt={rec.platform} className="w-3 h-3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HeroSection;