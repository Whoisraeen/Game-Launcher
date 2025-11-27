import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Monitor, Battery, Wifi, Settings, User, Search, Play, Cpu, Activity } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useSystemStats } from '../../hooks/useSystemStats';

interface BigPictureLayoutProps {
    onExit: () => void;
}

const BigPictureLayout: React.FC<BigPictureLayoutProps> = ({ onExit }) => {
    const { games, loadGames, weeklyActivity, loadWeeklyActivity } = useGameStore();
    const [selectedGameIndex, setSelectedGameIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { setFocus } = useNavigation();
    const stats = useSystemStats(5000);

    useEffect(() => {
        loadGames();
        loadWeeklyActivity();
    }, []);

    const recentGames = games.slice(0, 10); // Mock "Recent" for now
    const selectedGame = recentGames[selectedGameIndex];

    // Handle Keyboard/Gamepad Navigation locally for this simplified view
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onExit();
            if (e.key === 'ArrowRight') {
                setSelectedGameIndex(prev => Math.min(prev + 1, recentGames.length - 1));
            }
            if (e.key === 'ArrowLeft') {
                setSelectedGameIndex(prev => Math.max(prev - 1, 0));
            }
            if (e.key === 'Enter') {
                 // Launch logic would go here
                 console.log("Launch", selectedGame?.title);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [recentGames, onExit, selectedGame]);

    // Listen for custom nav events from our hook
    useEffect(() => {
        const handleNav = (e: CustomEvent) => {
            if (e.detail.direction === 'Right') setSelectedGameIndex(prev => Math.min(prev + 1, recentGames.length - 1));
            if (e.detail.direction === 'Left') setSelectedGameIndex(prev => Math.max(prev - 1, 0));
            if (e.detail.direction === 'Down') {
                 // Focus Move to bottom bar?
            }
        };
        window.addEventListener('nav-move' as any, handleNav);
        return () => window.removeEventListener('nav-move' as any, handleNav);
    }, [recentGames]);
    
    // Auto scroll
    useEffect(() => {
        if (scrollContainerRef.current) {
            const cardWidth = 320; // Approx card width + gap
            scrollContainerRef.current.scrollTo({
                left: selectedGameIndex * cardWidth - (window.innerWidth / 2) + (cardWidth / 2),
                behavior: 'smooth'
            });
        }
    }, [selectedGameIndex]);

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white overflow-hidden font-sans selection:bg-transparent">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                {selectedGame?.heroImage ? (
                    <img 
                        src={selectedGame.heroImage} 
                        className="w-full h-full object-cover opacity-40 blur-sm transition-all duration-700"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900 to-slate-900 opacity-50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
            </div>

            {/* Top Bar */}
            <div className="relative z-10 flex justify-between items-center p-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                        <User size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Player 1</h2>
                        <span className="text-sm text-gray-400">Online</span>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-gray-300">
                    {stats && (
                        <>
                            <div className="flex items-center gap-2">
                                <Cpu size={18} className="text-blue-400" />
                                <span className="text-sm font-medium">{stats.cpu.temp}°C</span>
                            </div>
                            {stats.gpu[0] && (
                                <div className="flex items-center gap-2">
                                    <Activity size={18} className="text-green-400" />
                                    <span className="text-sm font-medium">{stats.gpu[0].temp}°C</span>
                                </div>
                            )}
                        </>
                    )}
                    <div className="w-px h-6 bg-white/10 mx-2"></div>
                    <span className="text-xl font-light">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <Wifi size={24} />
                    <Battery size={24} />
                    <Settings size={24} />
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col h-full justify-center pb-32 pl-12">
                
                {/* Selected Game Details */}
                <div className="mb-8 max-w-2xl transition-all duration-300">
                    {selectedGame && (
                        <>
                            <div className="flex items-center gap-2 mb-2 text-purple-400 uppercase tracking-widest text-xs font-bold">
                                {selectedGame.platform}
                            </div>
                            <h1 className="text-6xl font-black mb-4 leading-tight tracking-tight drop-shadow-lg">
                                {selectedGame.title}
                            </h1>
                            <div className="flex gap-6 text-sm text-gray-300 mb-6">
                                <span className="bg-white/10 px-3 py-1 rounded backdrop-blur-md">Last Played: {selectedGame.lastPlayed ? new Date(selectedGame.lastPlayed).toLocaleDateString() : 'Never'}</span>
                                <span className="bg-white/10 px-3 py-1 rounded backdrop-blur-md">{Math.round(selectedGame.playtime)} Hours</span>
                            </div>
                            <p className="text-gray-400 line-clamp-2 mb-8 text-lg">{selectedGame.description || "No description available."}</p>
                            
                            <button className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-500 hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-purple-900/50">
                                <Play fill="currentColor" /> Play Game
                            </button>
                        </>
                    )}
                </div>

                {/* Horizontal List */}
                <div className="w-full overflow-visible">
                    <h3 className="text-xl font-bold mb-4 text-gray-200 flex items-center gap-2">
                        <Monitor size={20} /> Recent Games
                    </h3>
                    <div 
                        ref={scrollContainerRef}
                        className="flex gap-6 overflow-x-hidden py-8 pl-4"
                        style={{ scrollSnapType: 'x mandatory' }}
                    >
                        {recentGames.map((game, index) => (
                            <div 
                                key={game.id}
                                id={`game-card-${index}`}
                                className={`
                                    relative flex-shrink-0 w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl transition-all duration-300
                                    ${index === selectedGameIndex ? 'scale-110 ring-4 ring-purple-500 z-20' : 'opacity-70 scale-100 grayscale-[0.3] hover:grayscale-0'}
                                `}
                                onClick={() => setSelectedGameIndex(index)}
                            >
                                <img 
                                    src={game.cover || 'https://via.placeholder.com/300x450'} 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                    <span className="font-bold">{game.title}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black to-transparent z-20 flex justify-between items-center text-sm font-medium tracking-widest uppercase text-gray-400">
                <div className="flex gap-8">
                    <span className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-green-500 text-black flex items-center justify-center font-bold text-xs shadow-lg shadow-green-500/50">A</span> Select</span>
                    <span className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-red-500 text-black flex items-center justify-center font-bold text-xs shadow-lg shadow-red-500/50">B</span> Back</span>
                </div>
                <div className="flex gap-4">
                    <span className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-md cursor-pointer hover:bg-white/20" onClick={onExit}>Exit Big Picture</span>
                </div>
            </div>
        </div>
    );
};

export default BigPictureLayout;
