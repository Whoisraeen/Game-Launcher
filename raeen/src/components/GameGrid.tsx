import React, { useState, useMemo, useEffect } from 'react';
import { Play, Search, Filter, Heart, LayoutGrid, List as ListIcon, ArrowUpDown, Dices, RefreshCw } from 'lucide-react';
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
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    SortableContext
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// Removed react-window virtualization for simplicity

import { useGameStore } from '../stores/gameStore';
import { Game } from '../types';
import { getPlatformIcon } from '../data/LauncherData';
import GameDetailsModal from './GameDetailsModal';
import { GameContextMenu } from './GameContextMenu';
import { EditGameModal } from './EditGameModal';
import { CachedImage } from './CachedImage';
import Fuse from 'fuse.js';
import { useUIStore } from '../stores/uiStore';
import { getDominantColor } from '../utils/colorUtils';

const GameGrid: React.FC = () => {
    const { games, collections, selectedCollectionId, setSelectedCollectionId, loadGames, launchGame, toggleFavorite, reorderGames, saveGameOrder, syncLibrary, isLoading } = useGameStore();
    const { setDynamicAccentColor } = useUIStore(); // UI Store
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

    // Advanced Filters
    const [moodFilter, setMoodFilter] = useState('');
    const [multiplayerFilter, setMultiplayerFilter] = useState('all'); // all, local, online, coop

    const handleContextMenu = (e: React.MouseEvent, game: Game) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, game });
    };

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    // Initialize Fuse.js for fuzzy search
    const fuse = useMemo(() => new Fuse(games, {
        keys: ['title', 'platform', 'tags', 'genre'],
        threshold: 0.3,
    }), [games]);

    const filteredGames = useMemo(() => {
        let result = games;

        // 1. Search
        if (searchQuery) {
            result = fuse.search(searchQuery).map(r => r.item);
        }

        // 2. Filter by Tab/Collection
        if (activeTab === 'FAVORITES') {
            result = result.filter(g => g.isFavorite);
        } else if (activeTab !== 'ALL GAMES') {
            const collection = collections.find(c => c.id === activeTab);
            if (collection) {
                result = result.filter(g => collection.gameIds.includes(g.id));
            }
        }

        // 3. Filter by Genre
        if (selectedGenre) {
            result = result.filter(g => g.genre === selectedGenre);
        }

        // 4. Filter by Platform
        if (selectedPlatform) {
            result = result.filter(g => g.platform === selectedPlatform);
        }

        // 7. Sorting
        return [...result].sort((a, b) => {
            let valA: any = a[sortBy];
            let valB: any = b[sortBy];

            if (sortBy === 'added' || sortBy === 'lastPlayed') {
                valA = new Date(valA || 0).getTime();
                valB = new Date(valB || 0).getTime();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [games, searchQuery, activeTab, selectedGenre, selectedPlatform, moodFilter, multiplayerFilter, sortBy, sortDirection, fuse, collections]);

    // Handle Game Selection (for color extraction)
    const handleGameClick = async (game: Game) => {
        setSelectedGame(game);

        // Extract Color
        if (game.cover) {
            const color = await getDominantColor(game.cover);
            setDynamicAccentColor(color);
        } else {
            setDynamicAccentColor(null);
        }
    };

    // Reset color when modal closes
    const handleCloseDetails = () => {
        setSelectedGame(null);
        setDynamicAccentColor(null); // Reset to default theme
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = games.findIndex((g) => g.id === active.id);
            const newIndex = games.findIndex((g) => g.id === over?.id);
            reorderGames(oldIndex, newIndex);
        }
    };

    // Removed virtualized grid/list components

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Library</h1>
                    <div className="flex bg-black/20 rounded-full p-1 border border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-white transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search games..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-full pl-10 pr-4 py-2 w-64 text-sm focus:outline-none focus:border-white/30 focus:bg-black/40 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className={`p-2.5 rounded-full border transition-all ${showFilterPanel ? 'bg-white text-black border-white' : 'bg-black/20 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                    >
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilterPanel && (
                <div className="px-8 pb-6 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-wrap gap-4">
                        {/* Add filter controls here if needed */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Sort by:</span>
                            {/* Sort controls */}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="px-8 pb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <Chip label="ALL GAMES" active={activeTab === 'ALL GAMES'} onClick={() => setActiveTab('ALL GAMES')} />
                <Chip label="FAVORITES" active={activeTab === 'FAVORITES'} onClick={() => setActiveTab('FAVORITES')} />
                {collections.map(c => (
                    <Chip key={c.id} label={c.name} active={activeTab === c.id} onClick={() => setActiveTab(c.id)} />
                ))}
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-hidden px-6 pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={filteredGames.map(g => g.id)} strategy={rectSortingStrategy}>
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
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto">
                                {filteredGames.map(game => (
                                    <div key={game.id} className="h-[300px]">
                                        <SortableGameCard
                                            game={game}
                                            onClick={handleGameClick}
                                            onContextMenu={handleContextMenu}
                                            toggleFavorite={toggleFavorite}
                                            launchGame={launchGame}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 p-4 overflow-y-auto">
                                {filteredGames.map(game => (
                                    <div
                                        key={game.id}
                                        className="flex items-center gap-4 p-3 glass-card hover:bg-white/5 rounded-xl cursor-pointer group"
                                        onClick={() => handleGameClick(game)}
                                        onContextMenu={(e) => handleContextMenu(e, game)}
                                    >
                                        <CachedImage
                                            src={game.cover}
                                            alt={game.title}
                                            className="w-16 h-24 object-cover rounded-lg"
                                            placeholderSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="
                                        />
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-white">{game.title}</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-4 h-4 invert opacity-70" />
                                                <span>{game.platform}</span>
                                                <span>•</span>
                                                <span>{game.playtime ? Math.round(game.playtime / 60) + 'h played' : 'Never played'}</span>
                                            </div>
                                        </div>
                                        <button
                                            className="p-3 rounded-full bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                launchGame(game.id);
                                            }}
                                        >
                                            <Play size={20} fill="currentColor" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SortableContext>
                </DndContext>
            </div>

            {/* Modals */}
            {selectedGame && (
                <GameDetailsModal
                    game={selectedGame}
                    onClose={handleCloseDetails} // Use new handler
                    onPlay={() => {
                        launchGame(selectedGame.id);
                        handleCloseDetails();
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
        height: '100%',
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
                    placeholderSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="
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