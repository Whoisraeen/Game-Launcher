import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Wifi, User, Play, Clock, Gamepad2, Trophy } from 'lucide-react';
import { useSound } from '../../hooks/useSound';
import { useInputDevice } from '../../hooks/useInputDevice';
import { getDominantColor } from '../../utils/colorUtils';
import { Game } from '../../types';

interface BigPictureLayoutProps {
    onExit: () => void;
}

const CATEGORIES = ['All', 'Recent', 'Favorites', 'Steam', 'Epic', 'RPG', 'Action', 'Multiplayer'] as const;
type Category = typeof CATEGORIES[number];

const BigPictureLayout: React.FC<BigPictureLayoutProps> = ({ onExit }) => {
    const { games, loadGames, launchGame } = useGameStore();
    const { settings } = useSettingsStore();
    const { playMove, playSelect, playBack } = useSound();
    const { glyphs, deviceType, controllerName } = useInputDevice();

    const [activeIndex, setActiveIndex] = useState(0);
    const [activeCategory, setActiveCategory] = useState<Category>('All');
    const [accentColor, setAccentColor] = useState('#4f46e5');
    const [clockTime, setClockTime] = useState(new Date());
    const [bgLoaded, setBgLoaded] = useState(false);

    const carouselRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    useEffect(() => {
        loadGames();
        const timer = setInterval(() => setClockTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const filteredGames = useMemo(() => {
        if (!games.length) return [];
        const installed = games.filter(g => !g.isHidden && g.status === 'installed');

        switch (activeCategory) {
            case 'Recent':
                return [...installed].filter(g => g.lastPlayed).sort((a, b) =>
                    new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime()
                ).slice(0, 20);
            case 'Favorites':
                return installed.filter(g => g.isFavorite);
            case 'Steam':
                return installed.filter(g => g.platform === 'steam');
            case 'Epic':
                return installed.filter(g => g.platform === 'epic');
            case 'RPG':
                return installed.filter(g => g.genre?.toLowerCase().includes('rpg') || g.tags?.includes('rpg'));
            case 'Action':
                return installed.filter(g => g.genre?.toLowerCase().includes('action') || g.tags?.includes('action'));
            case 'Multiplayer':
                return installed.filter(g => g.multiplayer?.online || g.multiplayer?.local);
            default:
                return installed;
        }
    }, [games, activeCategory]);

    const selectedGame = useMemo(() => {
        return filteredGames[activeIndex] || null;
    }, [filteredGames, activeIndex]);

    useEffect(() => {
        let mounted = true;
        if (selectedGame?.cover) {
            getDominantColor(selectedGame.cover).then(c => { if (mounted) setAccentColor(c); });
        } else {
            setAccentColor('#4f46e5');
        }
        return () => { mounted = false; };
    }, [selectedGame?.id]);

    useEffect(() => {
        setBgLoaded(false);
    }, [selectedGame?.id]);

    const navigate = useCallback((dir: 'left' | 'right' | 'enter' | 'back' | 'lb' | 'rb') => {
        if (dir === 'back') {
            playBack(); onExit();
            return;
        }

        if (!filteredGames.length) return;

        switch (dir) {
            case 'left':
                if (activeIndex > 0) { setActiveIndex(i => i - 1); playMove(); }
                break;
            case 'right':
                if (activeIndex < filteredGames.length - 1) { setActiveIndex(i => i + 1); playMove(); }
                break;
            case 'enter':
                if (selectedGame) { playSelect(); launchGame(selectedGame.id); }
                break;
            case 'lb': {
                const idx = CATEGORIES.indexOf(activeCategory);
                if (idx > 0) {
                    setActiveCategory(CATEGORIES[idx - 1]);
                    setActiveIndex(0);
                    playMove();
                }
                break;
            }
            case 'rb': {
                const idx = CATEGORIES.indexOf(activeCategory);
                if (idx < CATEGORIES.length - 1) {
                    setActiveCategory(CATEGORIES[idx + 1]);
                    setActiveIndex(0);
                    playMove();
                }
                break;
            }
        }
    }, [filteredGames, activeIndex, activeCategory, selectedGame, playMove, playSelect, playBack, launchGame, onExit]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const map: Record<string, 'left' | 'right' | 'enter' | 'back' | 'lb' | 'rb'> = {
                ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right',
                Enter: 'enter', Escape: 'back',
                q: 'lb', e: 'rb',
            };
            const action = map[e.key];
            if (action) { e.preventDefault(); navigate(action); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [navigate]);

    useEffect(() => {
        const handler = (e: CustomEvent) => {
            const dirMap: Record<string, 'left' | 'right' | 'enter' | 'back' | 'lb' | 'rb'> = {
                Left: 'left', Right: 'right', Enter: 'enter', Back: 'back', B: 'back',
                LB: 'lb', RB: 'rb',
            };
            const action = dirMap[e.detail.direction];
            if (action) navigate(action);
        };
        window.addEventListener('nav-move' as any, handler);
        return () => window.removeEventListener('nav-move' as any, handler);
    }, [navigate]);

    // Scroll active card into view
    useEffect(() => {
        const card = cardRefs.current.get(activeIndex);
        card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [activeIndex]);

    const username = settings?.account?.username || 'Player';

    return (
        <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden select-none cursor-default">

            {/* === FULL SCREEN GAME BACKGROUND === */}
            <div className="absolute inset-0 z-0">
                {selectedGame && (selectedGame.heroImage || selectedGame.cover) && (
                    <img
                        key={selectedGame.id}
                        src={selectedGame.heroImage || selectedGame.cover}
                        onLoad={() => setBgLoaded(true)}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
                    />
                )}
                {/* Vignette & readability gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/30" />
                <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-black to-transparent" />
            </div>

            {/* === TOP BAR === */}
            <header className="relative z-30 flex items-center justify-between px-10 pt-7 pb-4">
                {/* Left: User */}
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/20 bg-white/10 flex items-center justify-center">
                        {settings?.account?.avatar ? (
                            <img src={settings.account.avatar} className="w-full h-full object-cover" />
                        ) : (
                            <User size={18} className="text-white/60" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">{username}</span>
                        <span className="text-[10px] text-white/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            Online
                        </span>
                    </div>
                </div>

                {/* Center: Category Tabs */}
                <nav className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/[0.08]">
                    {CATEGORIES.map(cat => {
                        const isActive = cat === activeCategory;
                        return (
                            <button
                                key={cat}
                                onClick={() => { setActiveCategory(cat); setActiveIndex(0); playMove(); }}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200
                                    ${isActive
                                        ? 'bg-white text-black shadow-lg'
                                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
                                    }`}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </nav>

                {/* Right: Clock & System */}
                <div className="flex items-center gap-4 text-white/50">
                    <Wifi size={16} />
                    <span className="text-base font-light font-mono tracking-widest">
                        {clockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {settings?.account?.avatar && (
                        <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10">
                            <img src={settings.account.avatar} className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            </header>

            {/* === GAME INFO OVERLAY (Left Side) === */}
            <div className="absolute left-10 bottom-[220px] z-20 max-w-xl">
                {selectedGame && (
                    <div key={selectedGame.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
                        {/* Platform pill */}
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/10 backdrop-blur-md border border-white/10 text-white/70">
                                {selectedGame.platform}
                            </span>
                            {selectedGame.genre && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    {selectedGame.genre}
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl font-black leading-[1.1] tracking-tight drop-shadow-2xl">
                            {selectedGame.title}
                        </h1>

                        {/* Description */}
                        {selectedGame.description && (
                            <p className="text-sm text-white/50 leading-relaxed line-clamp-2 max-w-md">
                                {selectedGame.description}
                            </p>
                        )}

                        {/* Meta stats */}
                        <div className="flex items-center gap-5 text-xs text-white/40">
                            {selectedGame.playtime > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <Clock size={12} /> {Math.round(selectedGame.playtime)}h played
                                </span>
                            )}
                            {selectedGame.achievements && selectedGame.achievements.total > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <Trophy size={12} className="text-yellow-400" />
                                    {selectedGame.achievements.unlocked}/{selectedGame.achievements.total}
                                </span>
                            )}
                            {selectedGame.lastPlayed && (
                                <span>Last: {formatRelative(selectedGame.lastPlayed)}</span>
                            )}
                        </div>

                        {/* Play button */}
                        <button
                            onClick={() => { playSelect(); launchGame(selectedGame.id); }}
                            className="mt-2 flex items-center gap-3 pl-5 pr-7 py-3 rounded-full font-bold text-sm bg-white text-black hover:scale-[1.04] active:scale-[0.97] transition-all shadow-2xl"
                            style={{ boxShadow: `0 8px 40px -8px rgba(255,255,255,0.3)` }}
                        >
                            <Play size={18} fill="black" />
                            Play
                        </button>
                    </div>
                )}
            </div>

            {/* === GAME CAROUSEL (Bottom) === */}
            <div className="absolute bottom-0 left-0 right-0 z-20 pb-16 pt-6">
                {/* Carousel scroll area */}
                <div
                    ref={carouselRef}
                    className="flex items-end gap-3 overflow-x-auto px-10 scrollbar-hide scroll-smooth"
                    style={{ maskImage: 'linear-gradient(to right, transparent, black 60px, black calc(100% - 60px), transparent)' }}
                >
                    {filteredGames.map((game, idx) => {
                        const isActive = idx === activeIndex;
                        return (
                            <div
                                key={`${game.id}-${idx}`}
                                ref={el => { if (el) cardRefs.current.set(idx, el); }}
                                onClick={() => { setActiveIndex(idx); playMove(); }}
                                onDoubleClick={() => { playSelect(); launchGame(game.id); }}
                                className={`
                                    relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 cursor-pointer
                                    ${isActive
                                        ? 'w-[130px] h-[174px] ring-[3px] ring-white shadow-2xl shadow-white/20 scale-110 z-10'
                                        : 'w-[110px] h-[147px] opacity-60 hover:opacity-90 hover:scale-105'
                                    }
                                `}
                            >
                                {game.cover ? (
                                    <img
                                        src={game.cover}
                                        alt={game.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                        <Gamepad2 size={24} className="text-white/20" />
                                    </div>
                                )}
                                {/* Active indicator dot */}
                                {isActive && (
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* === BOTTOM CONTROLS BAR === */}
            <div className="absolute bottom-0 left-0 right-0 z-30 px-10 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <ControlHint glyph={glyphs.confirm} label="Select" deviceType={deviceType} />
                    <ControlHint glyph={glyphs.back} label="Back" deviceType={deviceType} />
                    <ControlHint glyph={glyphs.navigate} label="Navigate" deviceType={deviceType} />
                    <ControlHint glyph={glyphs.lb} label="Prev Tab" deviceType={deviceType} />
                    <ControlHint glyph={glyphs.rb} label="Next Tab" deviceType={deviceType} />
                </div>
                <div className="flex items-center gap-4">
                    {controllerName && (
                        <span className="text-[10px] text-white/20 font-mono truncate max-w-[200px]">
                            {deviceType === 'playstation' ? '🎮 PlayStation' : deviceType === 'xbox' ? '🎮 Xbox' : '⌨️ Keyboard'}
                        </span>
                    )}
                    <button
                        onClick={onExit}
                        className="text-[11px] text-white/30 hover:text-white/60 font-medium uppercase tracking-wider transition-colors"
                    >
                        {glyphs.back} Exit
                    </button>
                </div>
            </div>
        </div>
    );
};

const ControlHint: React.FC<{ glyph: string; label: string; deviceType: string }> = ({ glyph, label, deviceType }) => {
    const isController = deviceType !== 'keyboard';
    return (
        <div className="flex items-center gap-2 text-white/40">
            <span className={`
                inline-flex items-center justify-center font-bold text-[11px] transition-all
                ${isController
                    ? 'min-w-[28px] h-[28px] px-1.5 rounded-full bg-white/10 border border-white/20 text-white/70'
                    : 'min-w-[24px] h-[22px] px-1.5 rounded-md bg-white/[0.08] border border-white/[0.12] text-white/60 font-mono text-[10px]'
                }
            `}>
                {glyph}
            </span>
            <span className="text-[11px] font-medium tracking-wide">{label}</span>
        </div>
    );
};

function formatRelative(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default BigPictureLayout;
