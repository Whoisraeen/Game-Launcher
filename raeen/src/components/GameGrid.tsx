import React, { useState, useMemo, useEffect } from 'react';
import { Play, Search, Filter, Heart, LayoutGrid, List as ListIcon, Dices } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
import { Skeleton } from './Skeleton';

const GameGrid: React.FC = () => {
    const { games, collections, selectedCollectionId, setSelectedCollectionId, loadGames, launchGame, toggleFavorite, reorderGames, mergeGames, isLoading } = useGameStore();
    const { setDynamicAccentColor, selectedGame, setSelectedGame } = useUIStore(); // UI Store
    const [activeTab, setActiveTab] = useState('ALL GAMES');

    // Sync activeTab with selectedCollectionId from store (e.g. from Collections page navigation)
    useEffect(() => {
        if (selectedCollectionId) {
            setActiveTab(selectedCollectionId);
        }
    }, [selectedCollectionId]);

    // When changing tabs manually, update/clear store selection
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        if (tab !== 'ALL GAMES' && tab !== 'FAVORITES') {
            setSelectedCollectionId(tab);
        } else {
            setSelectedCollectionId(null);
        }
    };
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    // const [selectedGame, setSelectedGame] = useState<Game | null>(null); // Moved to UI Store
    const [sortBy] = useState<'title' | 'playtime' | 'lastPlayed' | 'rating' | 'addedAt'>('title');
    const [sortDirection] = useState<'asc' | 'desc'>('asc');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; game: Game } | null>(null);
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    
    // Merge Modal State
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [mergingGame, setMergingGame] = useState<Game | null>(null);
    const [mergeSearch, setMergeSearch] = useState('');

    // Advanced Filters
    // const [moodFilter, setMoodFilter] = useState('');
    // const [multiplayerFilter, setMultiplayerFilter] = useState('all'); // all, local, online, coop

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
        } else if (activeTab === 'ARCHIVED') {
            result = result.filter(g => g.isHidden);
        } else if (activeTab !== 'ALL GAMES') {
            const collection = collections.find(c => c.id === activeTab);
            if (collection) {
                result = result.filter(g => collection.gameIds.includes(g.id));
            }
        }

        // Hide hidden games unless in ARCHIVED tab
        if (activeTab !== 'ARCHIVED') {
            result = result.filter(g => !g.isHidden);
        }

        // 3. Filter by Genre
        if (selectedGenre) {
            result = result.filter(g => g.genre === selectedGenre);
        }

        // 4. Filter by Platform
        if (selectedPlatform) {
            result = result.filter(g => g.platform === selectedPlatform);
        }

        // 5. Group Merged Games (Duplicate Merging)
        const groupedGames: Game[] = [];
        const groupMap = new Map<string, Game[]>();

        // First pass: Group games by group_id
        result.forEach(game => {
            if (game.group_id) {
                if (!groupMap.has(game.group_id)) {
                    groupMap.set(game.group_id, []);
                }
                groupMap.get(game.group_id)?.push(game);
            } else {
                groupedGames.push(game);
            }
        });

        // Second pass: Select primary game for each group
        groupMap.forEach((group) => {
            // Priority: Installed > Favorite > Recent > Playtime
            const primary = group.reduce((prev, current) => {
                const prevScore = (prev.status === 'installed' ? 10 : 0) + (prev.isFavorite ? 5 : 0);
                const currScore = (current.status === 'installed' ? 10 : 0) + (current.isFavorite ? 5 : 0);
                
                if (currScore > prevScore) return current;
                if (currScore < prevScore) return prev;
                
                // Tie breaker: Last played
                const prevDate = new Date(prev.lastPlayed || 0).getTime();
                const currDate = new Date(current.lastPlayed || 0).getTime();
                return currDate > prevDate ? current : prev;
            });
            
            // Attach other versions to the primary game object for UI
            (primary as any)._mergedCount = group.length;
            
            groupedGames.push(primary);
        });
        
        result = groupedGames;

        // 7. Sorting
        return [...result].sort((a, b) => {
            let valA: any = a[sortBy];
            let valB: any = b[sortBy];

            if (sortBy === 'addedAt' || sortBy === 'lastPlayed') {
                valA = new Date(valA || 0).getTime();
                valB = new Date(valB || 0).getTime();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [games, searchQuery, activeTab, selectedGenre, selectedPlatform, sortBy, sortDirection, fuse, collections]);

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
        if (active.id !== over?.id && over) {
            reorderGames(active.id as string, over.id as string);
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
                <Chip label="ALL GAMES" active={activeTab === 'ALL GAMES'} onClick={() => handleTabChange('ALL GAMES')} />
                <Chip label="FAVORITES" active={activeTab === 'FAVORITES'} onClick={() => handleTabChange('FAVORITES')} />
                <Chip label="ARCHIVED" active={activeTab === 'ARCHIVED'} onClick={() => handleTabChange('ARCHIVED')} />
                {collections.map(c => (
                    <Chip key={c.id} label={c.name} active={activeTab === c.id} onClick={() => handleTabChange(c.id)} />
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
                        ) : isLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto">
                                {[...Array(12)].map((_, i) => (
                                    <Skeleton key={i} className="h-[300px]" />
                                ))}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-y-auto content-start">
                                <AnimatePresence mode='popLayout'>
                                    {filteredGames.map(game => (
                                        <motion.div
                                            layout
                                            key={game.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.2 }}
                                            className="h-[300px]"
                                        >
                                            <SortableGameCard
                                                game={game}
                                                onClick={handleGameClick}
                                                onContextMenu={handleContextMenu}
                                                toggleFavorite={toggleFavorite}
                                                launchGame={launchGame}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        ) : (
                            <motion.div layout className="flex flex-col gap-2 p-4 overflow-y-auto">
                                <AnimatePresence mode='popLayout'>
                                    {filteredGames.map(game => (
                                        <motion.div
                                            layout
                                            key={game.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex items-center gap-4 p-3 glass-card hover:bg-white/5 rounded-xl cursor-pointer group"
                                            onClick={() => handleGameClick(game)}
                                            onContextMenu={(e) => handleContextMenu(e, game)}
                                        >
                                            <CachedImage
                                                src={game.cover || ''}
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
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
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
                    onMerge={() => {
                        setMergingGame(contextMenu.game);
                        setMergeModalOpen(true);
                    }}
                />
            )}

            {editingGame && (
                <EditGameModal
                    game={editingGame}
                    onClose={() => setEditingGame(null)}
                />
            )}

            {/* Merge Game Modal */}
            {mergeModalOpen && mergingGame && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setMergeModalOpen(false)}>
                    <div className="bg-slate-900 rounded-xl border border-white/10 p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white mb-4">Merge "{mergingGame.title}" with...</h3>
                        <p className="text-sm text-gray-400 mb-4">Select a duplicate game to merge into this one. The selected game will be hidden and grouped under "{mergingGame.title}".</p>
                        
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search games to merge..." 
                                className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:border-purple-500 outline-none"
                                onChange={(e) => setMergeSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {games
                                .filter(g => g.id !== mergingGame.id && !g.isHidden && g.title.toLowerCase().includes(mergeSearch.toLowerCase()))
                                .slice(0, 20) // Limit results for performance
                                .map(g => (
                                <div 
                                    key={g.id} 
                                    onClick={async () => {
                                        await mergeGames(mergingGame.id, g.id);
                                        setMergeModalOpen(false);
                                        setMergingGame(null);
                                    }} 
                                    className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-white/5"
                                >
                                    <CachedImage src={g.cover || ''} alt={g.title} className="w-10 h-12 object-cover rounded" />
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium">{g.title}</span>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <img src={getPlatformIcon(g.platform)} className="w-3 h-3 invert opacity-70" />
                                            <span>{g.platform}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {games.filter(g => g.id !== mergingGame.id && !g.isHidden && g.title.toLowerCase().includes(mergeSearch.toLowerCase())).length === 0 && (
                                <div className="text-center text-gray-500 py-8">No matching games found</div>
                            )}
                        </div>
                         <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/5">
                            <button onClick={() => setMergeModalOpen(false)} className="px-4 py-2 rounded hover:bg-white/10 text-gray-300 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
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
                    src={game.cover || ''}
                    alt={game.title}
                    className="w-full h-full object-cover rounded-xl"
                    placeholderSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="
                    draggable={false}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-700 text-gray-400 font-bold text-center p-2 rounded-xl">
                    {game.title}
                </div>
            )}

            {/* Badges Container */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 {/* Merged Count Badge */}
                {(game as any)._mergedCount > 1 && (
                    <div className="bg-blue-600/80 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white border border-blue-400/30 shadow-sm">
                        +{(game as any)._mergedCount - 1}
                    </div>
                )}
                
                {/* Platform Icon Badge */}
                <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full">
                    <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-3 h-3 invert" />
                </div>
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