
import React, { useState, useMemo, useEffect } from 'react';
import { Play, Search, Filter, Heart, LayoutGrid, List as ListIcon, ArrowUpDown, Dices } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    useSortable,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGameStore } from '../stores/gameStore';
import { Game } from '../types';
import { getPlatformIcon } from '../data/LauncherData';
import GameDetailsModal from './GameDetailsModal';
import { GameContextMenu } from './GameContextMenu';
import { EditGameModal } from './EditGameModal';
import { CachedImage } from './CachedImage';

// GridCell temporarily unused due to virtualization regression
// const GridCell = ({ columnIndex, rowIndex, style, data }: any) => {
//     const { games, columnCount, itemWidth, itemHeight, onSelect, onContextMenu, onToggleFavorite, onLaunch } = data;
//     const index = rowIndex * columnCount + columnIndex;
//
//     if (index >= games.length) return null;
//
//     const game = games[index];
//
//     return (
//         <div style={style}>
//             <div style={{ width: itemWidth, height: itemHeight }}>
//                 <SortableGameCard
//                     game={game}
//                     onClick={onSelect}
//                     onContextMenu={onContextMenu}
//                     toggleFavorite={onToggleFavorite}
//                     launchGame={onLaunch}
//                 />
//             </div>
//         </div>
//     );
// };

const GameGrid: React.FC = () => {
    const { games, collections, selectedCollectionId, setSelectedCollectionId, loadGames, launchGame, toggleFavorite, reorderGames, saveGameOrder } = useGameStore();
    const [activeTab, setActiveTab] = useState('ALL GAMES');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [sortBy] = useState<'name' | 'playtime' | 'lastPlayed' | 'rating' | 'added'>('name');
    const [sortDirection] = useState<'asc' | 'desc'>('asc');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [selectedTags] = useState<string[]>([]);
    const [ratingFilter] = useState<number | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; game: Game } | null>(null);
    const [editingGame, setEditingGame] = useState<Game | null>(null);

    const handleContextMenu = (e: React.MouseEvent, game: Game) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, game });
    };

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    // Clear collection selection when changing tabs
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSelectedCollectionId(null);
        setSelectedGenre(null);
        setSelectedPlatform(null);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            reorderGames(active.id as string, over.id as string);
            saveGameOrder();
        }
    };

    // const pickRandomGame = () => {
    //     if (filteredGames.length > 0) {
    //         const randomGame = filteredGames[Math.floor(Math.random() * filteredGames.length)];
    //         setSelectedGame(randomGame);
    //     }
    // };

    // const availableTags = useMemo(() => {
    //     const tags = new Set<string>();
    //     games.forEach(g => {
    //         if (g.tags) g.tags.forEach(t => tags.add(t));
    //     });
    //     return Array.from(tags).sort();
    // }, [games]);

    const availableGenres = useMemo(() => {
        const genres = new Set<string>();
        games.forEach(g => {
            if (g.genre) genres.add(g.genre);
            if (g.tags) g.tags.forEach(t => genres.add(t));
        });
        return Array.from(genres).sort();
    }, [games]);

    const availablePlatforms = useMemo(() => {
        const platforms = new Set<string>();
        games.forEach(g => platforms.add(g.platform));
        return Array.from(platforms).sort();
    }, [games]);

    const filteredGames = useMemo<Game[]>(() => {
        let result: Game[] = [...games];

        // 0. Filter by Collection (Sidebar)
        if (selectedCollectionId) {
            const collection = collections.find(c => c.id === selectedCollectionId);
            if (collection) {
                result = result.filter(g => collection.gameIds.includes(g.id));
            }
        }

        // 1. Filter by Tab
        if (activeTab === 'INSTALLED') {
            result = result.filter(g => g.status === 'installed' || g.status === 'updating');
        } else if (activeTab === 'FAVORITES') {
            result = result.filter(g => g.isFavorite);
        } else if (activeTab === 'PLAYING') {
            result = result.filter(g => g.playStatus === 'playing');
        } else if (activeTab === 'BACKLOG') {
            result = result.filter(g => g.playStatus === 'backlog');
        } else if (activeTab === 'COMPLETED') {
            result = result.filter(g => g.playStatus === 'completed');
        } else if (activeTab === 'PLAY NEXT') {
            result = result.filter(g =>
                g.status === 'installed' &&
                !g.isHidden && (
                    g.playStatus === 'playing' ||
                    g.playStatus === 'backlog' ||
                    (!g.playtime || g.playtime < 2)
                )
            );
        } else if (activeTab === 'BY MOOD') {
            result = result.filter(g => g.tags.some(t => ['Cozy', 'Relaxing', 'Epic', 'Dark'].includes(t)));
        } else if (activeTab === 'HIDDEN') {
            result = result.filter(g => g.isHidden);
        }

        // Filter out hidden games unless in HIDDEN tab or specific collection
        if (activeTab !== 'HIDDEN' && !selectedCollectionId) {
            result = result.filter(g => !g.isHidden);
        }

        // 2. Filter by Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(g => g.title.toLowerCase().includes(query));
        }

        // 3. Filter by Genre
        if (selectedGenre) {
            result = result.filter(g => g.genre === selectedGenre || g.tags.includes(selectedGenre));
        }

        // 4. Filter by Platform
        if (selectedPlatform) {
            result = result.filter(g => g.platform === selectedPlatform);
        }

        // 5. Filter by Tags
        if (selectedTags.length > 0) {
            result = result.filter(g =>
                g.tags && selectedTags.every(tag => g.tags.includes(tag))
            );
        }

        // 6. Filter by Rating
        if (ratingFilter !== null) {
            result = result.filter(g => (g.rating || 0) >= ratingFilter);
        }

        // 7. Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'playtime':
                    comparison = (a.playtime || 0) - (b.playtime || 0);
                    break;
                case 'lastPlayed':
                    const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
                    const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
                case 'rating':
                    comparison = (a.rating || 0) - (b.rating || 0);
                    break;
                case 'added':
                    comparison = 0;
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [games, collections, selectedCollectionId, activeTab, searchQuery, selectedGenre, selectedPlatform, selectedTags, ratingFilter, sortBy, sortDirection]);

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden">
            {/* Header & Tabs */}
            <div className="flex-none px-6 pt-6 pb-2 space-y-4 z-10">
                <div className="flex justify-between items-end">
                    <div className="flex items-baseline gap-4">
                        <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
                            {activeTab}
                        </h1>
                        <span className="text-sm font-bold text-gray-500">{filteredGames.length} GAMES</span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg backdrop-blur-md border border-white/5">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mask-image-linear-gradient-right">
                    {['ALL GAMES', 'INSTALLED', 'FAVORITES', 'PLAYING', 'BACKLOG', 'COMPLETED', 'PLAY NEXT', 'BY MOOD', 'HIDDEN'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-black scale-105 shadow-lg shadow-white/10' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Filters & Search */}
                <div className="flex gap-4 items-center py-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${showFilterPanel ? 'bg-white/10 border-white/20 text-white' : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5'}`}
                        >
                            <Filter size={16} /> Filters
                        </button>
                        <button
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-black/20 border border-white/5 text-gray-400 hover:bg-white/5 transition-colors"
                        >
                            <ArrowUpDown size={16} /> Sort
                        </button>
                    </div>
                </div>

                {/* Expanded Filter Panel */}
                {showFilterPanel && (
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4 animate-slide-down mb-4">
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="text-xs font-bold text-gray-500 uppercase w-full mb-1">Platform</span>
                            {availablePlatforms.map(p => (
                                <Chip
                                    key={p}
                                    label={p}
                                    active={selectedPlatform === p}
                                    onClick={() => setSelectedPlatform(selectedPlatform === p ? null : p)}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase w-full mb-1">Genre</span>
                            {availableGenres.slice(0, 15).map(g => (
                                <Chip
                                    key={g}
                                    label={g}
                                    active={selectedGenre === g}
                                    onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-20">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    {filteredGames.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                            <Dices size={48} className="opacity-20" />
                            <p className="text-lg font-medium">No games found</p>
                            <button onClick={() => {
                                setSearchQuery('');
                                setSelectedGenre(null);
                                setSelectedPlatform(null);
                                setActiveTab('ALL GAMES');
                            }} className="text-blue-400 hover:underline">Clear filters</button>
                        </div>
                    ) : (
                        <div className={`
                            ${viewMode === 'grid'
                                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6'
                                : 'flex flex-col gap-2'}
                        `}>
                            {filteredGames.map((game) => (
                                viewMode === 'grid' ? (
                                    <div key={game.id} className="aspect-[2/3]">
                                        <SortableGameCard
                                            game={game}
                                            onClick={() => setSelectedGame(game)}
                                            onContextMenu={(e: any) => handleContextMenu(e, game)}
                                            toggleFavorite={toggleFavorite}
                                            launchGame={launchGame}
                                        />
                                    </div>
                                ) : (
                                    <div
                                        key={game.id}
                                        onClick={() => setSelectedGame(game)}
                                        onContextMenu={(e) => handleContextMenu(e, game)}
                                        className="group flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                                    >
                                        <div className="w-12 h-16 rounded bg-slate-800 overflow-hidden flex-shrink-0">
                                            {game.cover && <CachedImage src={game.cover} alt={game.title} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white truncate">{game.title}</h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span className="uppercase">{game.platform}</span>
                                                <span>•</span>
                                                <span>{Math.round(game.playtime || 0)}h played</span>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="p-2 hover:bg-green-500 hover:text-white rounded-full text-green-500"
                                                onClick={(e) => { e.stopPropagation(); launchGame(game.id); }}
                                            >
                                                <Play size={20} fill="currentColor" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </DndContext>
            </div>

            {/* Modals */}
            {selectedGame && (
                <GameDetailsModal
                    game={selectedGame}
                    onClose={() => setSelectedGame(null)}
                    onPlay={() => {
                        launchGame(selectedGame.id);
                        setSelectedGame(null);
                    }}
                />
            )}

            {contextMenu && (
                <GameContextMenu
                    game={contextMenu.game}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onEdit={() => setEditingGame(contextMenu.game)}
                />
            )}

            {editingGame && (
                <EditGameModal
                    game={editingGame}
                    onClose={() => setEditingGame(null)}
                />
            )}
        </div>
    );
};

const Chip = ({ label, active = false, onClick }: { label: string, active?: boolean, onClick?: () => void }) => (
    <button
        onClick={onClick}
        className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${active ? 'bg-white/10 border-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}
    >
        {label}
    </button>
);

const SortableGameCard = ({ game, onClick, onContextMenu, toggleFavorite, launchGame }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: game.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
        height: '100%', // Ensure it fills the virtualized cell
        width: '100%'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group relative glass-card cursor-pointer touch-none h-full w-full"
            onClick={() => onClick(game)}
            onContextMenu={(e) => onContextMenu(e, game)}
        >
            {game.cover ? (
                <CachedImage
                    src={game.cover}
                    alt={game.title}
                    className="w-full h-full object-cover rounded-xl"
                    placeholderSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4=" // Dark slate placeholder
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-700 text-gray-400 font-bold text-center p-2 rounded-xl">
                    {game.title}
                </div>
            )}

            {/* Platform Icon Badge */}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-3 h-3 invert" />
            </div>

            {/* Favorite Button */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                    className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${game.isFavorite ? 'bg-red-500/20 text-red-500' : 'bg-black/60 text-gray-400 hover:text-red-400'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(game.id, !game.isFavorite);
                    }}
                >
                    <Heart size={14} fill={game.isFavorite ? "currentColor" : "none"} />
                </button>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <button
                    className="bg-white text-black rounded-full p-3 transform scale-50 group-hover:scale-100 transition-transform duration-300 shadow-lg hover:bg-gray-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        launchGame(game.id);
                    }}
                >
                    <Play size={20} fill="currentColor" />
                </button>
            </div>
        </div>
    );
};

export default GameGrid;