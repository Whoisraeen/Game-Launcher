import React, { useState, useMemo, useEffect } from 'react';
import { Play, Search, Filter, Heart, LayoutGrid, List as ListIcon, Dices, Layers3, ArrowUp, ArrowDown } from 'lucide-react';
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
import { getPlatformIcon } from '../utils/platformUtils';
import GameDetailsModal from './GameDetailsModal';
import { GameContextMenu } from './GameContextMenu';
import { EditGameModal } from './EditGameModal';
import { CachedImage } from './CachedImage';
import Fuse from 'fuse.js';
import { useUIStore } from '../stores/uiStore';
import { getDominantColor } from '../utils/colorUtils';
import { Skeleton } from './Skeleton';
import CoverFlow from './CoverFlow';
import HealthCheckModal from './HealthCheckModal';
import { useLaunchGame } from '../hooks/useLaunchGame';

const GameGrid: React.FC = () => {
    const { games, collections, selectedCollectionId, setSelectedCollectionId, loadGames, loadCollections, toggleFavorite, reorderGames, saveGameOrder, mergeGames, isLoading } = useGameStore();
    const { setDynamicAccentColor, selectedGame, setSelectedGame } = useUIStore(); // UI Store
    const { initiateLaunch, continueLaunch, closeHealthCheck, launchState } = useLaunchGame();
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
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'coverFlow'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    // const [selectedGame, setSelectedGame] = useState<Game | null>(null); // Moved to UI Store
    const [sortBy, setSortBy] = useState<'title' | 'playtime' | 'lastPlayed' | 'rating' | 'addedAt' | 'manual'>('title');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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
        loadCollections();
    }, [loadGames, loadCollections]);

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
        if (sortBy === 'manual') {
            return result;
        }

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
        if (active.id !== over?.id && over) {
            // BUG-005: persisting custom order is meaningless while another sort
            // dictates the displayed order. Auto-switch to 'manual' so the new
            // order actually shows up and survives reload.
            if (sortBy !== 'manual') {
                setSortBy('manual');
            }
            reorderGames(active.id as string, over.id as string);
            saveGameOrder();
        }
    };

    // Removed virtualized grid/list components

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-3">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white drop-shadow-md">Library</h1>
                        <p className="text-[11px] text-gray-500 uppercase tracking-[0.18em] font-bold mt-0.5">{filteredGames.length} games</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-black/30 rounded-xl p-0.5 border border-white/10">
                        <ViewToggle active={viewMode === 'grid'}      onClick={() => setViewMode('grid')}      icon={<LayoutGrid size={14} />} title="Grid" />
                        <ViewToggle active={viewMode === 'list'}      onClick={() => setViewMode('list')}      icon={<ListIcon size={14} />}    title="List" />
                        <ViewToggle active={viewMode === 'coverFlow'} onClick={() => setViewMode('coverFlow')} icon={<Layers3 size={14} />}     title="Cover Flow" />
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="Search games…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-2 w-64 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className={`p-2 rounded-xl border transition-all ${showFilterPanel ? 'bg-white text-black border-white' : 'bg-black/30 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                        title="Filters"
                    >
                        <Filter size={14} />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilterPanel && (
                <div className="px-8 pb-6 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Sort by:</span>
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:outline-none"
                            >
                                <option value="title">Title</option>
                                <option value="playtime">Playtime</option>
                                <option value="lastPlayed">Last Played</option>
                                <option value="addedAt">Date Added</option>
                                <option value="rating">Rating</option>
                                <option value="manual">Custom Order</option>
                            </select>
                            <button 
                                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-1.5 rounded-lg bg-black/20 border border-white/10 text-gray-400 hover:text-white"
                            >
                                {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="px-6 pb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                        ) : viewMode === 'coverFlow' ? (
                            <CoverFlow
                                games={filteredGames}
                                onGameClick={handleGameClick}
                                onLaunch={initiateLaunch}
                            />
                        ) : viewMode === 'grid' ? (
                            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 p-4 overflow-y-auto content-start custom-scrollbar h-full">
                                <AnimatePresence mode='popLayout'>
                                    {filteredGames.map(game => (
                                        <motion.div
                                            layout
                                            key={game.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.2 }}
                                            className="aspect-[2/3] w-full"
                                        >
                                            <SortableGameCard
                                                game={game}
                                                onClick={handleGameClick}
                                                onContextMenu={handleContextMenu}
                                                toggleFavorite={toggleFavorite}
                                                launchGame={initiateLaunch}
                                                disabled={sortBy !== 'manual'}
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
                                            className="flex items-center gap-4 p-2.5 pr-4 bg-white/[0.025] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 rounded-2xl cursor-pointer group transition-all"
                                            onClick={() => handleGameClick(game)}
                                            onContextMenu={(e) => handleContextMenu(e, game)}
                                        >
                                            <CachedImage
                                                src={game.cover || ''}
                                                alt={game.title}
                                                className="w-14 h-20 object-cover rounded-lg shadow-md"
                                                placeholderSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-base text-white tracking-tight truncate">{game.title}</h3>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                    <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-3.5 h-3.5 invert opacity-70" />
                                                    <span className="capitalize">{game.platform}</span>
                                                    <span className="opacity-40">•</span>
                                                    <span>{game.playtime ? Math.round(game.playtime) + 'h played' : 'Never played'}</span>
                                                    {game.isFavorite && (
                                                        <>
                                                            <span className="opacity-40">•</span>
                                                            <Heart size={11} className="text-red-400" fill="currentColor" />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                className="p-2.5 rounded-full bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 shadow-md"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    initiateLaunch(game.id);
                                                }}
                                            >
                                                <Play size={16} fill="currentColor" />
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
                        initiateLaunch(selectedGame.id);
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

            {/* Health Check Modal */}
            {launchState.showHealthCheck && (
                <HealthCheckModal
                    gameName={launchState.pendingGameName || undefined}
                    onClose={closeHealthCheck}
                    onContinue={continueLaunch}
                />
            )}
        </div>
    );
};

const Chip = ({ label, active = false, onClick }: { label: string, active?: boolean, onClick?: () => void }) => (
    <button
        onClick={onClick}
        className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${active ? 'bg-white text-black border-white shadow-[0_0_16px_rgba(255,255,255,0.15)]' : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/30 hover:text-white hover:bg-white/5'}`}
    >
        {label}
    </button>
);

const ViewToggle = ({ active, onClick, icon, title }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string }) => (
    <button
        onClick={onClick}
        title={title}
        className={`p-2 rounded-lg transition-all ${active ? 'bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]' : 'text-gray-500 hover:text-white'}`}
    >
        {icon}
    </button>
);

const SortableGameCard = ({ game, onClick, onContextMenu, toggleFavorite, launchGame, disabled }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: game.id, disabled });

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
            className="group relative cursor-pointer touch-none h-full w-full rounded-2xl overflow-hidden ring-1 ring-white/5 hover:ring-white/20 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] transition-all duration-300"
            onClick={() => onClick(game)}
            onContextMenu={(e) => onContextMenu(e, game)}
        >
            {game.cover ? (
                <CachedImage
                    src={game.cover || ''}
                    alt={game.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    placeholderSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4="
                    draggable={false}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-gray-300 font-bold text-center p-3">
                    {game.title}
                </div>
            )}

            {/* Always-visible bottom gradient + meta */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none">
                <div className="text-white text-sm font-bold tracking-tight leading-tight line-clamp-2 drop-shadow">
                    {game.title}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] uppercase tracking-wider text-gray-300/90">
                    <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-3 h-3 invert opacity-80" />
                    <span className="capitalize">{game.platform}</span>
                    {game.playtime > 0 && (
                        <>
                            <span className="opacity-40">•</span>
                            <span>{Math.round(game.playtime)}h</span>
                        </>
                    )}
                </div>
            </div>

            {/* Top-right badges */}
            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                {(game as any)._mergedCount > 1 && (
                    <div className="bg-blue-600/90 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white border border-blue-400/30 shadow">
                        +{(game as any)._mergedCount - 1}
                    </div>
                )}
                {game.status === 'not_installed' && (
                    <div className="bg-amber-600/90 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white uppercase tracking-wider border border-amber-300/30">
                        Not Installed
                    </div>
                )}
            </div>

            {/* Favorite Button */}
            <div className={`absolute top-2 left-2 transition-opacity z-10 ${game.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                    className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${game.isFavorite ? 'bg-red-500/30 text-red-300' : 'bg-black/50 text-gray-200 hover:text-red-300'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(game.id, !game.isFavorite);
                    }}
                >
                    <Heart size={13} fill={game.isFavorite ? "currentColor" : "none"} />
                </button>
            </div>

            {/* Hover Play Button */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                    className="pointer-events-auto bg-white/95 text-black rounded-full p-3.5 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-white"
                    onClick={(e) => {
                        e.stopPropagation();
                        launchGame(game.id);
                    }}
                >
                    <Play size={18} fill="currentColor" />
                </button>
            </div>
        </div>
    );
};

export default GameGrid;