import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Battery, Wifi, Settings, User, Play, Cpu, Activity, Star, Library, Clock } from 'lucide-react';
import { useSystemStats } from '../../hooks/useSystemStats';
import { useSound } from '../../hooks/useSound';

interface BigPictureLayoutProps {
    onExit: () => void;
}

type GameRow = {
    title: string;
    icon: React.ReactNode;
    games: any[];
};

const BigPictureLayout: React.FC<BigPictureLayoutProps> = ({ onExit }) => {
    const { games, loadGames, loadWeeklyActivity, launchGame } = useGameStore();
    const stats = useSystemStats(5000);
    const { playMove, playSelect, playBack } = useSound();

    // Navigation State: 2D Grid
    const [activeRow, setActiveRow] = useState(0);
    const [activeCol, setActiveCol] = useState(0);

    // Refs for scrolling
    const rowContainerRef = useRef<HTMLDivElement>(null);
    const activeRowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadGames();
        loadWeeklyActivity();
    }, []);

    // Organize Games into Rows
    const gameRows = useMemo<GameRow[]>(() => {
        if (!games.length) return [];

        const recent = [...games].sort((a, b) =>
            (new Date(b.lastPlayed || 0).getTime()) - (new Date(a.lastPlayed || 0).getTime())
        ).slice(0, 15);

        const favorites = games.filter(g => g.isFavorite);

        // Only show rows that have games
        const rows = [
            { title: 'Jump Back In', icon: <Clock size={20} />, games: recent },
            { title: 'Favorites', icon: <Star size={20} />, games: favorites },
            { title: 'All Games', icon: <Library size={20} />, games: games }
        ];

        return rows.filter(r => r.games.length > 0);
    }, [games]);

    // Derive selected game from coordinates
    const selectedGame = useMemo(() => {
        if (!gameRows[activeRow]) return null;
        return gameRows[activeRow].games[activeCol];
    }, [gameRows, activeRow, activeCol]);

    // Handle Navigation
    const handleNavigate = (direction: 'Up' | 'Down' | 'Left' | 'Right' | 'Enter' | 'Back') => {
        if (!gameRows.length) return;

        if (direction === 'Up') {
            if (activeRow > 0) {
                setActiveRow(prev => prev - 1);
                setActiveCol(0);
                playMove();
            }
        } else if (direction === 'Down') {
            if (activeRow < gameRows.length - 1) {
                setActiveRow(prev => prev + 1);
                setActiveCol(0);
                playMove();
            }
        } else if (direction === 'Left') {
            if (activeCol > 0) {
                setActiveCol(prev => prev - 1);
                playMove();
            }
        } else if (direction === 'Right') {
            const maxCol = gameRows[activeRow].games.length - 1;
            if (activeCol < maxCol) {
                setActiveCol(prev => prev + 1);
                playMove();
            }
        } else if (direction === 'Enter') {
            if (selectedGame) {
                playSelect();
                launchGame(selectedGame.id);
            }
        } else if (direction === 'Back') {
            playBack();
            onExit();
        }
    };

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleNavigate('Back');
            if (e.key === 'ArrowUp') handleNavigate('Up');
            if (e.key === 'ArrowDown') handleNavigate('Down');
            if (e.key === 'ArrowLeft') handleNavigate('Left');
            if (e.key === 'ArrowRight') handleNavigate('Right');
            if (e.key === 'Enter') handleNavigate('Enter');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameRows, activeRow, activeCol, selectedGame]);

    // Gamepad Listeners (via Custom Event from NavigationProvider)
    useEffect(() => {
        const handleNav = (e: CustomEvent) => {
            handleNavigate(e.detail.direction);
            if (e.detail.direction === 'B') handleNavigate('Back'); // Map B button if sent
        };
        window.addEventListener('nav-move' as any, handleNav);
        return () => window.removeEventListener('nav-move' as any, handleNav);
    }, [gameRows, activeRow, activeCol, selectedGame]);

    // Auto-scroll Row
    useEffect(() => {
        if (activeRowRef.current) {
            activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeRow]);

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white overflow-hidden font-sans selection:bg-transparent">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                {selectedGame?.videoUrl ? (
                    <video
                        key={selectedGame.videoUrl} // Force re-render on change
                        src={selectedGame.videoUrl}
                        autoPlay
                        muted
                        loop
                        className="w-full h-full object-cover opacity-40 blur-sm transition-all duration-1000 animate-fade-in"
                    />
                ) : selectedGame?.heroImage ? (
                    <img
                        src={selectedGame.heroImage}
                        className="w-full h-full object-cover opacity-30 blur-md transition-all duration-700 animate-fade-in"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900 to-slate-900 opacity-50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-950/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-transparent" />
            </div>

            {/* Top Bar */}
            <div className="relative z-10 flex justify-between items-center p-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <User size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold leading-none mb-1">Gamer</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">Online</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-gray-300 bg-black/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/5">
                    {stats && (
                        <>
                            <div className="flex items-center gap-2">
                                <Cpu size={18} className="text-blue-400" />
                                <span className="text-sm font-bold font-mono">{stats.cpu.temp}°C</span>
                            </div>
                            {stats.gpu[0] && (
                                <div className="flex items-center gap-2">
                                    <Activity size={18} className="text-green-400" />
                                    <span className="text-sm font-bold font-mono">{stats.gpu[0].temp}°C</span>
                                </div>
                            )}
                            <div className="w-px h-4 bg-white/10 mx-2"></div>
                        </>
                    )}
                    <span className="text-xl font-light tracking-widest font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <Wifi size={20} />
                    <Battery size={20} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex flex-col h-full pb-10">

                {/* Hero Details Area */}
                <div className="px-12 pt-4 pb-12 flex items-end h-[45vh] transition-all duration-500">
                    {selectedGame && (
                        <div className="max-w-4xl animate-slide-up">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 rounded bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest text-purple-300">
                                    {selectedGame.platform}
                                </span>
                                {selectedGame.genre && (
                                    <span className="px-3 py-1 rounded bg-white/5 backdrop-blur-md text-xs font-bold uppercase tracking-widest text-gray-400">
                                        {selectedGame.genre}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-7xl font-black mb-6 leading-tight tracking-tighter drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                                {selectedGame.title}
                            </h1>

                            <div className="flex gap-8 text-sm text-gray-300 mb-8 items-center">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Last Played</span>
                                    <span className="font-medium">{selectedGame.lastPlayed ? new Date(selectedGame.lastPlayed).toLocaleDateString() : 'Never'}</span>
                                </div>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Playtime</span>
                                    <span className="font-medium">{Math.round(selectedGame.playtime)} Hours</span>
                                </div>
                                <div className="w-px h-8 bg-white/10"></div>
                                {selectedGame.achievements && (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Achievements</span>
                                        <span className="font-medium text-yellow-500">{selectedGame.achievements.unlocked} / {selectedGame.achievements.total}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button className="group bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-purple-500 hover:text-white hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-white/10 hover:shadow-purple-500/50">
                                    <Play fill="currentColor" className="group-hover:fill-white transition-colors" />
                                    <span>Play Game</span>
                                </button>
                                <button className="bg-white/5 text-white px-6 py-4 rounded-full font-bold text-lg hover:bg-white/20 hover:scale-105 transition-all backdrop-blur-md border border-white/10">
                                    <Settings size={24} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Scrollable Rows Area */}
                <div
                    ref={rowContainerRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-20 pl-12 mask-image-linear-gradient"
                >
                    <div className="space-y-12">
                        {gameRows.map((row, rowIndex) => (
                            <div
                                key={row.title}
                                ref={rowIndex === activeRow ? activeRowRef : null}
                                className={`transition-opacity duration-500 ${rowIndex === activeRow ? 'opacity-100' : 'opacity-40'}`}
                            >
                                <h3 className="text-2xl font-bold mb-6 text-gray-200 flex items-center gap-3">
                                    {row.icon} {row.title}
                                </h3>

                                {/* Horizontal List for this Row */}
                                <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar pl-1" style={{ scrollSnapType: 'x mandatory' }}>
                                    {row.games.map((game, colIndex) => {
                                        // Logic to keep the active item in view horizontally
                                        const isActive = rowIndex === activeRow && colIndex === activeCol;

                                        // Auto-scroll horizontal logic using standard DOM
                                        const cardRef = (el: HTMLDivElement) => {
                                            if (isActive && el) {
                                                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                            }
                                        };

                                        return (
                                            <div
                                                key={game.id}
                                                ref={cardRef}
                                                className={`
                                                    relative flex-shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl transition-all duration-300
                                                    ${isActive
                                                        ? 'w-64 ring-4 ring-purple-500 z-20 scale-105 shadow-purple-900/50'
                                                        : 'w-56 scale-100 grayscale-[0.5] hover:grayscale-0'}
                                                `}
                                            >
                                                <img
                                                    src={game.cover || 'https://via.placeholder.com/300x450'}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                                {isActive && (
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 animate-fade-in">
                                                        <span className="font-bold text-white drop-shadow-md">{game.title}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Controls */}
            <div className="absolute bottom-0 left-0 right-0 px-12 py-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex justify-between items-center text-sm font-medium tracking-widest uppercase text-gray-400">
                <div className="flex gap-12">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-green-500 text-black flex items-center justify-center font-bold shadow-lg shadow-green-500/50">A</span>
                        <span>Select</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-red-500 text-black flex items-center justify-center font-bold shadow-lg shadow-red-500/50">B</span>
                        <span>Back</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={onExit} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full backdrop-blur-md border border-white/5 transition-all">
                        Exit Big Picture
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BigPictureLayout;
