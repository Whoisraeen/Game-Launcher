import React from 'react';
import { X, Play, Clock, Calendar, HardDrive, Tag, EyeOff, Eye, Heart, Terminal, Bookmark, Star, FileText, Download, Trophy, ChevronLeft } from 'lucide-react';
import { Game } from '../types';
import { getPlatformIcon } from '../utils/platformUtils';
import { useGameStore } from '../stores/gameStore';
import AchievementsList from './AchievementsList';

interface GameDetailsModalProps {
    game: Game;
    onClose: () => void;
    onPlay: () => void;
}

const GameDetailsModal: React.FC<GameDetailsModalProps> = ({ game, onClose, onPlay }) => {
    const { toggleHidden, toggleFavorite, updateTags, updateLaunchOptions, updatePlayStatus, updateRating, updateUserNotes, installGame, unmergeGame, games } = useGameStore();
    const [isEditingTags, setIsEditingTags] = React.useState(false);
    const [newTag, setNewTag] = React.useState('');
    const [launchOptions, setLaunchOptions] = React.useState(game.launchOptions || '');
    const [showLaunchOptions, setShowLaunchOptions] = React.useState(false);
    const [notes, setNotes] = React.useState(game.userNotes || '');
    const [isSavingNotes, setIsSavingNotes] = React.useState(false);
    const [showAchievements, setShowAchievements] = React.useState(false);
    const [achievementStats, setAchievementStats] = React.useState<{ total: number; unlocked: number; percent: number } | null>(null);

    // Find other games in the same group (merged duplicates)
    const mergedGames = React.useMemo(() => {
        if (!game.group_id) return [];
        return games.filter(g => g.group_id === game.group_id && g.id !== game.id);
    }, [games, game.group_id, game.id]);

    // Close on escape key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Load achievement stats
    React.useEffect(() => {
        const loadAchievementStats = async () => {
            try {
                const stats = await window.ipcRenderer.invoke('achievements:getGameStats', game.id);
                if (stats.total > 0) {
                    setAchievementStats(stats);
                }
            } catch (error) {
                console.error('Failed to load achievement stats:', error);
            }
        };

        loadAchievementStats();
    }, [game.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                {/* Hero Section */}
                <div className="relative h-64 md:h-80 w-full bg-slate-900">
                    {game.heroImage || game.cover ? (
                        <>
                            <img 
                                src={game.heroImage || game.cover} 
                                alt={game.title} 
                                className="w-full h-full object-cover opacity-60 mask-image-gradient-b"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
                    )}

                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors backdrop-blur-md"
                    >
                        <X size={24} />
                    </button>

                    {/* Header Content */}
                    <div className="absolute bottom-6 left-6 md:left-10 right-6 flex items-end gap-6">
                        {/* Cover Art */}
                        <div className="hidden md:block w-32 h-48 rounded-lg overflow-hidden shadow-2xl border border-white/10 bg-slate-800 flex-shrink-0">
                            {game.cover ? (
                                <img src={game.cover} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">?</div>
                            )}
                        </div>

                        {/* Title & Play */}
                        <div className="flex-1 mb-2">
                            <div className="flex items-center gap-3 mb-2">
                                <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-6 h-6 invert opacity-80" />
                                <span className="text-white/60 text-sm font-medium uppercase tracking-widest">{game.platform}</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-6 drop-shadow-lg leading-tight">{game.title}</h1>
                            
                            <div className="flex items-center gap-4">
                                {game.status === 'installed' ? (
                                    <button 
                                        onClick={onPlay}
                                        className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                    >
                                        <Play size={20} fill="currentColor" />
                                        Play Now
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => installGame(game.id)}
                                        className="bg-blue-600 text-white hover:bg-blue-500 px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                                    >
                                        <Download size={20} />
                                        Install
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => toggleFavorite(game.id, !game.isFavorite)}
                                    className={`p-3 rounded-full transition-all border ${game.isFavorite ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-black/40 border-white/10 text-white hover:bg-white/10'}`}
                                    title={game.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                                >
                                    <Heart size={20} fill={game.isFavorite ? "currentColor" : "none"} />
                                </button>

                                <button
                                    onClick={() => {
                                        toggleHidden(game.id, !game.isHidden);
                                        if (!game.isHidden) onClose(); // Close modal if hiding
                                    }}
                                    className={`p-3 rounded-full transition-all border ${game.isHidden ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/40 border-white/10 text-white hover:bg-white/10'}`}
                                    title={game.isHidden ? "Unhide Game" : "Hide Game"}
                                >
                                    {game.isHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar bg-[#0f172a]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* Left Column: Stats */}
                        <div className="col-span-1 space-y-6">
                            <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Game Stats</h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Bookmark size={18} className="text-yellow-400" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">Status</span>
                                            <select 
                                                value={game.playStatus || 'none'} 
                                                onChange={(e) => updatePlayStatus(game.id, e.target.value)}
                                                className="bg-transparent text-white font-mono text-sm focus:outline-none cursor-pointer -ml-1 border border-transparent hover:border-white/10 rounded px-1"
                                            >
                                                <option value="none" className="bg-slate-800">Uncategorized</option>
                                                <option value="playing" className="bg-slate-800">Playing</option>
                                                <option value="backlog" className="bg-slate-800">Backlog</option>
                                                <option value="completed" className="bg-slate-800">Completed</option>
                                                <option value="dropped" className="bg-slate-800">Dropped</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Star size={18} className="text-yellow-500" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">Rating</span>
                                            <div className="flex gap-1 mt-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button 
                                                        key={star}
                                                        onClick={() => updateRating(game.id, star)}
                                                        className={`hover:scale-110 transition-transform ${star <= (game.rating || 0) ? 'text-yellow-400' : 'text-gray-600'}`}
                                                    >
                                                        <Star size={14} fill={star <= (game.rating || 0) ? "currentColor" : "none"} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Clock size={18} className="text-blue-400" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">Playtime</span>
                                            <span className="font-mono">{Math.round(game.playtime || 0)} hours</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Calendar size={18} className="text-green-400" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">Last Played</span>
                                            <span className="font-mono">
                                                {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : 'Never'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-gray-300">
                                        <HardDrive size={18} className="text-purple-400" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">Install Location</span>
                                            <span className="font-mono text-xs truncate w-40" title={game.installPath}>
                                                {game.installPath || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Terminal size={18} className="text-orange-400" />
                                        <div className="flex flex-col w-full">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500">Launch Options</span>
                                                <button 
                                                    onClick={() => setShowLaunchOptions(!showLaunchOptions)}
                                                    className="text-[10px] text-blue-400 hover:text-blue-300"
                                                >
                                                    {showLaunchOptions ? 'Hide' : 'Edit'}
                                                </button>
                                            </div>
                                            {showLaunchOptions ? (
                                                <div className="mt-1 flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={launchOptions}
                                                        onChange={(e) => setLaunchOptions(e.target.value)}
                                                        placeholder="-console -novid"
                                                        className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            updateLaunchOptions(game.id, launchOptions);
                                                            setShowLaunchOptions(false);
                                                        }}
                                                        className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/40"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-xs truncate w-40 text-gray-400" title={game.launchOptions}>
                                                    {game.launchOptions || 'None'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Achievements Preview */}
                            {achievementStats && achievementStats.total > 0 && (
                                <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                            <Trophy size={14} className="text-yellow-500" />
                                            Achievements
                                        </h3>
                                        <button
                                            onClick={() => setShowAchievements(!showAchievements)}
                                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            {showAchievements ? 'Hide' : 'View All'}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Progress Bar */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-gray-400">Progress</span>
                                                <span className="text-white font-semibold">{achievementStats.unlocked} / {achievementStats.total}</span>
                                            </div>
                                            <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                                                    style={{ width: `${achievementStats.percent}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Completion Percentage */}
                                        <div className="flex items-center justify-center bg-black/40 rounded-lg p-3">
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                                                    {achievementStats.percent}%
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Complete</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Merged Games / Versions */}
                            {mergedGames.length > 0 && (
                                <div>
                                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="flex items-center gap-2">Linked Versions ({mergedGames.length})</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {mergedGames.map(merged => (
                                            <div key={merged.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <img src={getPlatformIcon(merged.platform)} alt={merged.platform} className="w-5 h-5 invert opacity-70" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-white">{merged.title}</span>
                                                        <span className="text-xs text-gray-500">{merged.platform} • {merged.status === 'installed' ? 'Installed' : 'Not Installed'}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm(`Are you sure you want to unmerge ${merged.title} from this group?`)) {
                                                            unmergeGame(merged.id);
                                                        }
                                                    }}
                                                    className="p-2 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Unmerge (Separate Game)"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            <div>
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                        <Tag size={14} /> Tags
                                    </div>
                                    <button 
                                        onClick={() => setIsEditingTags(!isEditingTags)}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer"
                                    >
                                        {isEditingTags ? 'Done' : 'Edit'}
                                    </button>
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {game.tags && game.tags.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 flex items-center gap-1 group">
                                            {tag}
                                            {isEditingTags && (
                                                <button 
                                                    onClick={() => updateTags(game.id, game.tags.filter(t => t !== tag))}
                                                    className="ml-1 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                    {isEditingTags && (
                                        <form 
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                if (newTag.trim()) {
                                                    const currentTags = game.tags || [];
                                                    if (!currentTags.includes(newTag.trim())) {
                                                        updateTags(game.id, [...currentTags, newTag.trim()]);
                                                    }
                                                    setNewTag('');
                                                }
                                            }}
                                            className="flex items-center"
                                        >
                                            <input 
                                                type="text" 
                                                value={newTag}
                                                onChange={(e) => setNewTag(e.target.value)}
                                                placeholder="Add tag..."
                                                className="px-3 py-1 bg-black/40 border border-white/20 rounded-full text-xs text-white focus:outline-none focus:border-blue-500 w-24"
                                            />
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Description & Details */}
                        <div className="col-span-1 md:col-span-2 space-y-6">
                            {/* Description */}
                            <div>
                                <h3 className="text-white text-lg font-bold mb-3">About</h3>
                                <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                                    {game.description || (
                                        <span className="italic opacity-50">No description available. Metadata fetching coming in future updates.</span>
                                    )}
                                </p>
                            </div>

                            {/* Genre */}
                            {game.genre && (
                                <div>
                                    <h3 className="text-white text-lg font-bold mb-3">Genre</h3>
                                    <span className="inline-block px-4 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium">
                                        {game.genre}
                                    </span>
                                </div>
                            )}

                            {/* User Notes */}
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        <FileText size={16} className="text-blue-400" />
                                        Personal Notes
                                    </h3>
                                    {notes !== (game.userNotes || '') && (
                                        <button 
                                            onClick={async () => {
                                                setIsSavingNotes(true);
                                                await updateUserNotes(game.id, notes);
                                                setIsSavingNotes(false);
                                            }}
                                            disabled={isSavingNotes}
                                            className="text-xs bg-blue-600 px-3 py-1.5 rounded-lg text-white hover:bg-blue-500 disabled:opacity-50 font-medium transition-colors"
                                        >
                                            {isSavingNotes ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    )}
                                </div>
                                <textarea 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add your personal review, goals, or settings notes here..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 min-h-[100px] resize-y placeholder:text-gray-600 custom-scrollbar"
                                />
                            </div>
                            
                            {/* Additional placeholders for Phase 2 features */}
                            <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-left group">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors">Achievements</h4>
                                        <span className="text-xs text-gray-400 font-mono">
                                            {game.achievements?.unlocked || 0} / {game.achievements?.total || 0}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mb-2">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ 
                                                width: `${(game.achievements?.total ? ((game.achievements.unlocked || 0) / game.achievements.total) * 100 : 0)}%` 
                                            }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500">
                                        {game.achievements?.total ? 'Track your progress' : 'No achievements detected'}
                                    </p>
                                </div>
                                <button className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-left group">
                                    <h4 className="text-white font-bold mb-1 group-hover:text-purple-400 transition-colors">Screenshots</h4>
                                    <p className="text-xs text-gray-500">Manage capture gallery</p>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Achievements Full View Modal */}
                {showAchievements && achievementStats && achievementStats.total > 0 && (
                    <div className="absolute inset-0 bg-[#0f172a] z-10 flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Trophy className="text-yellow-500" />
                                Achievements
                            </h2>
                            <button 
                                onClick={() => setShowAchievements(false)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-colors"
                            >
                                <ChevronLeft size={16} />
                                Back to Details
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden p-6">
                            <AchievementsList
                                gameId={game.id}
                                gameName={game.title}
                                platform={game.platform}
                                platformId={game.platformId}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameDetailsModal;
