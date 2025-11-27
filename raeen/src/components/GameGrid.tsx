import React, { useState, useMemo, useEffect } from 'react';
import { Play, Search, Filter, Move, RefreshCw, Heart, LayoutGrid, List as ListIcon, Clock, ArrowUpDown, Calendar, Star, X, Dices } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPlatformIcon } from '../data/LauncherData';
import { useGameStore } from '../stores/gameStore';
import { Game } from '../types';
import GameDetailsModal from './GameDetailsModal';
import { GameContextMenu } from './GameContextMenu';
import { EditGameModal } from './EditGameModal';

const GameGrid: React.FC = () => {
    const { games, collections, selectedCollectionId, setSelectedCollectionId, loadGames, syncLibrary, launchGame, toggleFavorite, isLoading, reorderGames, saveGameOrder } = useGameStore();
    const [activeTab, setActiveTab] = useState('ALL GAMES');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'playtime' | 'lastPlayed' | 'rating' | 'added'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [ratingFilter, setRatingFilter] = useState<number | null>(null);
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
        // Don't clear advanced filters automatically, or maybe we should?
        // Let's keep them for now, user can clear manually.
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

    const pickRandomGame = () => {
        if (filteredGames.length > 0) {
            const randomGame = filteredGames[Math.floor(Math.random() * filteredGames.length)];
            setSelectedGame(randomGame);
        }
    };

    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        games.forEach(g => {
            if (g.tags) g.tags.forEach(t => tags.add(t));
        });
        return Array.from(tags).sort();
    }, [games]);

    const availableGenres = useMemo(() => {
        const genres = new Set<string>();
        games.forEach(g => {
            if (g.genre) genres.add(g.genre);
            // Handle tags that might be genres if genre field is missing
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
        // Use store games instead of static GAMES_LIBRARY
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
            // Suggest games: Currently Playing OR Backlog OR (Installed & New)
            result = result.filter(g =>
                g.status === 'installed' &&
                !g.isHidden && (
                    g.playStatus === 'playing' ||
                    g.playStatus === 'backlog' ||
                    (!g.playtime || g.playtime < 2)
                )
            );
        } else if (activeTab === 'BY MOOD') {
            // Show games with specific mood-related tags
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
                    // Assuming we might have added date, but if not fallback to something else or 0
                    // For now let's just use 0 as we don't have addedAt field in interface explicitly yet, 
                    // or we can use ID if sequential, but let's assume 0 for safety if field missing
                    comparison = 0;
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [games, activeTab, searchQuery, selectedGenre, selectedPlatform, selectedCollectionId, collections, sortBy, sortDirection]);

    return (
        <div className="glass-panel flex-1 flex flex-col h-full overflow-hidden p-6" onClick={() => setShowSortMenu(false)}>

            {/* Header / Tabs */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-6 overflow-x-auto pb-2 custom-scrollbar">
                    {['ALL GAMES', 'INSTALLED', 'FAVORITES', 'PLAYING', 'BACKLOG', 'COMPLETED', 'PLAY NEXT', 'BY MOOD', 'HIDDEN'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`text-sm font-bold tracking-wider transition-colors whitespace-nowrap ${activeTab === tab && !selectedCollectionId ? 'text-white border-b-2 border-white pb-1' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab}
                        </button>
                    ))}
                    {selectedCollectionId && (
                        <div className="flex items-center gap-2 text-white border-b-2 border-blue-500 pb-1">
                            <span className="text-sm font-bold tracking-wider text-blue-400">
                                {collections.find(c => c.id === selectedCollectionId)?.name}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 w-64 transition-all"
                        />
                    </div>

                    <button
                        onClick={pickRandomGame}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Pick Random Game"
                    >
                        <Dices size={18} />
                    </button>

                    <button
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className={`p-2 rounded-lg border border-white/10 transition-colors ${showFilterPanel || selectedTags.length > 0 || ratingFilter !== null ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}
                        title="Filter Games"
                    >
                        <Filter size={18} />
                    </button>

                    {/* View Toggle */}
                    <div className="flex bg-white/5 rounded-lg border border-white/10 p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            title="List View"
                        >
                            <ListIcon size={16} />
                        </button>
                    </div>

                    <button
                        onClick={() => syncLibrary()}
                        disabled={isLoading}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                        title="Sync Library"
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>

                    {/* Sort Menu */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSortMenu(!showSortMenu);
                            }}
                            className={`p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors ${showSortMenu ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}`}
                            title="Sort Games"
                        >
                            <ArrowUpDown size={18} />
                        </button>

                        {showSortMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                                <div className="p-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-gray-500 px-2 uppercase tracking-wider">Sort By</span>
                                </div>
                                <div className="p-1">
                                    <button
                                        onClick={() => { setSortBy('name'); setShowSortMenu(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${sortBy === 'name' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                                    >
                                        <span>Name</span>
                                        {sortBy === 'name' && <ArrowUpDown size={14} />}
                                    </button>
                                    <button
                                        onClick={() => { setSortBy('playtime'); setShowSortMenu(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${sortBy === 'playtime' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                                    >
                                        <span>Time Played</span>
                                        {sortBy === 'playtime' && <Clock size={14} />}
                                    </button>
                                    <button
                                        onClick={() => { setSortBy('lastPlayed'); setShowSortMenu(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${sortBy === 'lastPlayed' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                                    >
                                        <span>Last Played</span>
                                        {sortBy === 'lastPlayed' && <Calendar size={14} />}
                                    </button>
                                    <button
                                        onClick={() => { setSortBy('rating'); setShowSortMenu(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${sortBy === 'rating' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                                    >
                                        <span>Rating</span>
                                        {sortBy === 'rating' && <Star size={14} />}
                                    </button>
                                </div>
                                <div className="p-2 border-t border-white/5">
                                    <span className="text-xs font-bold text-gray-500 px-2 uppercase tracking-wider">Direction</span>
                                </div>
                                <div className="p-1">
                                    <button
                                        onClick={() => { setSortDirection('asc'); setShowSortMenu(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${sortDirection === 'asc' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                                    >
                                        <span>Ascending</span>
                                    </button>
                                    <button
                                        onClick={() => { setSortDirection('desc'); setShowSortMenu(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${sortDirection === 'desc' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                                    >
                                        <span>Descending</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Advanced Filter Panel */}
            {showFilterPanel && (
                <div className="mb-6 p-4 bg-black/20 border border-white/10 rounded-xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col gap-4">
                        {/* Rating Filter */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-gray-400 w-20">Rating</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                                        className={`p-1 rounded transition-transform hover:scale-110 ${ratingFilter && star <= ratingFilter ? 'text-yellow-400' : 'text-gray-600'}`}
                                    >
                                        <Star size={20} fill={ratingFilter && star <= ratingFilter ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>
                            {ratingFilter && (
                                <span className="text-xs text-yellow-400 font-bold ml-2">& Up</span>
                            )}
                        </div>

                        {/* Tags Filter */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-400">Tags</span>
                                <span className="text-xs text-gray-500">{selectedTags.length} selected</span>
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => {
                                            if (selectedTags.includes(tag)) {
                                                setSelectedTags(selectedTags.filter(t => t !== tag));
                                            } else {
                                                setSelectedTags([...selectedTags, tag]);
                                            }
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedTags.includes(tag)
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-2 border-t border-white/5">
                            <button
                                onClick={() => {
                                    setRatingFilter(null);
                                    setSelectedTags([]);
                                    setSelectedGenre(null);
                                    setSelectedPlatform(null);
                                }}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                                <X size={12} /> Clear All Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chips / Filters */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                {/* Clear Filters */}
                {(selectedGenre || selectedPlatform || selectedTags.length > 0 || ratingFilter !== null) && (
                    <Chip label="Clear Filters" active onClick={() => { setSelectedGenre(null); setSelectedPlatform(null); setSelectedTags([]); setRatingFilter(null); }} />
                )}

                {/* Platform Chips */}
                {availablePlatforms.map(platform => (
                    <Chip
                        key={platform}
                        label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                        active={selectedPlatform === platform}
                        onClick={() => setSelectedPlatform(selectedPlatform === platform ? null : platform)}
                    />
                ))}

                <div className="w-px h-6 bg-white/10 mx-2" />

                {/* Genre Chips (Top 8 + selected) */}
                {availableGenres.slice(0, 8).map(genre => (
                    <Chip
                        key={genre}
                        label={genre}
                        active={selectedGenre === genre}
                        onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                    />
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {isLoading && games.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">Loading library...</div>
                ) : filteredGames.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <p className="mb-4">No games found.</p>
                        {games.length === 0 && (
                            <button
                                onClick={() => syncLibrary()}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                            >
                                <RefreshCw size={16} /> Sync Library
                            </button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    /* GRID VIEW */
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={filteredGames.map(g => g.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 pb-10">
                                {filteredGames.map(game => (
                                    <SortableGameCard
                                        key={game.id}
                                        game={game}
                                        onClick={setSelectedGame}
                                        onContextMenu={handleContextMenu}
                                        toggleFavorite={toggleFavorite}
                                        launchGame={launchGame}
                                    />
                                ))}

                                {/* Placeholder for "Add Game" or empty slots to fill grid visually if needed */}
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group cursor-pointer hover:bg-white/10 transition-colors">
                                        <span className="text-gray-600 text-4xl group-hover:text-gray-500">+</span>
                                    </div>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    /* LIST VIEW */
                    <div className="flex flex-col gap-2 pb-10">
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-5">Name</div>
                            <div className="col-span-2">Platform</div>
                            <div className="col-span-2">Time Played</div>
                            <div className="col-span-2">Last Played</div>
                            <div className="col-span-1 text-right">Actions</div>
                        </div>
                        {filteredGames.map(game => (
                            <div
                                key={game.id}
                                className="group grid grid-cols-12 gap-4 items-center px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                                onClick={() => setSelectedGame(game)}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, game)}
                                onContextMenu={(e) => handleContextMenu(e, game)}
                            >
                                <div className="col-span-5 flex items-center gap-3">
                                    <div className="w-10 h-14 bg-slate-800 rounded overflow-hidden flex-shrink-0">
                                        {game.cover ? (
                                            <img src={game.cover} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">?</div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{game.title}</span>
                                        <span className="text-xs text-gray-500">{game.genre || 'Unknown Genre'}</span>
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-center gap-2 text-sm text-gray-400">
                                    <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-4 h-4 opacity-70" />
                                    <span className="capitalize">{game.platform}</span>
                                </div>
                                <div className="col-span-2 flex items-center gap-2 text-sm text-gray-400">
                                    <Clock size={14} />
                                    <span>{Math.round(game.playtime || 0)}h</span>
                                </div>
                                <div className="col-span-2 text-sm text-gray-400">
                                    {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : 'Never'}
                                </div>
                                <div className="col-span-1 flex justify-end gap-2">
                                    <button
                                        className={`p-2 rounded-full transition-colors ${game.isFavorite ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-red-400 hover:bg-white/10'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(game.id, !game.isFavorite);
                                        }}
                                    >
                                        <Heart size={16} fill={game.isFavorite ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-full transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            launchGame(game.id);
                                        }}
                                    >
                                        <Play size={16} fill="currentColor" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Drag Drop Indicator */}
            <div className="mt-4 flex justify-center">
                <div className="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 text-gray-500 text-xs font-medium">
                    <Move size={12} />
                    Drag-and-Drop to Organize
                </div>
            </div>

            {/* Game Details Modal */}
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
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group relative aspect-[3/4] glass-card cursor-pointer touch-none"
            onClick={() => onClick(game)}
            onContextMenu={(e) => onContextMenu(e, game)}
        >
            {game.cover ? (
                <img
                    src={game.cover}
                    alt={game.title}
                    className="w-full h-full object-cover rounded-xl"
                    loading="lazy"
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