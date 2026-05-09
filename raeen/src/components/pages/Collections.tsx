import React, { useState, useEffect } from 'react';
import { Plus, Folder, Trash2, Share2, Download, X, Check } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { useFriendStore } from '../../stores/friendStore';
import { CachedImage } from '../CachedImage';

interface SharedCollection {
    id: string;
    collectionId: string;
    collectionName: string;
    sharedBy: string;
    sharedWith: string[];
    gameTitles: string[];
    gameIds: string[];
    createdAt: number;
}

const Collections: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
    const { collections, games, loadCollections, createCollection, deleteCollection, setSelectedCollectionId } = useGameStore();
    const { friends, loadFriends } = useFriendStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionDesc, setNewCollectionDesc] = useState('');
    const [shareModalCollectionId, setShareModalCollectionId] = useState<string | null>(null);
    const [sharedCollections, setSharedCollections] = useState<SharedCollection[]>([]);
    const [showSharedTab, setShowSharedTab] = useState(false);

    useEffect(() => {
        loadCollections();
        loadFriends();
        loadSharedCollections();
    }, [loadCollections, loadFriends]);

    const loadSharedCollections = async () => {
        try {
            const result = await window.ipcRenderer.invoke('friends:getSharedCollections');
            setSharedCollections(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error('Failed to load shared collections:', error);
        }
    };

    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newCollectionName.trim()) {
            await createCollection(newCollectionName, newCollectionDesc);
            setNewCollectionName('');
            setNewCollectionDesc('');
            setIsCreateModalOpen(false);
        }
    };

    const handleCollectionClick = (id: string) => {
        setSelectedCollectionId(id);
        if (onNavigate) onNavigate('Library');
    };

    const handleImportShared = async (sharedId: string) => {
        try {
            await window.ipcRenderer.invoke('friends:importSharedCollection', sharedId);
            await loadCollections();
        } catch (error) {
            console.error('Failed to import collection:', error);
        }
    };

    const getCollectionCover = (gameIds: string[]) => {
        if (gameIds.length === 0) return null;
        const game = games.find(g => g.id === gameIds[0]);
        return game?.cover;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden p-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">
                        COLLECTIONS
                    </h1>
                    <p className="text-gray-400 font-medium">Organize your library your way</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-black/20 p-1 rounded-lg backdrop-blur-md border border-white/5">
                        <button
                            onClick={() => setShowSharedTab(false)}
                            className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${!showSharedTab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            My Collections
                        </button>
                        <button
                            onClick={() => setShowSharedTab(true)}
                            className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${showSharedTab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Share2 size={14} /> Shared
                            {sharedCollections.length > 0 && (
                                <span className="text-[10px] bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{sharedCollections.length}</span>
                            )}
                        </button>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        <Plus size={20} /> New Collection
                    </button>
                </div>
            </div>

            {!showSharedTab ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar pb-20">
                    {collections.map(collection => {
                        const cover = getCollectionCover(collection.gameIds);

                        return (
                            <div 
                                key={collection.id} 
                                onClick={() => handleCollectionClick(collection.id)}
                                className="group relative aspect-video bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all overflow-hidden cursor-pointer hover:scale-[1.02]"
                            >
                                <div className="absolute inset-0">
                                    {cover ? (
                                        <>
                                            <CachedImage src={cover} alt={collection.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                            <Folder size={48} className="text-white/10" />
                                        </div>
                                    )}
                                </div>

                                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-1">{collection.name}</h3>
                                            <p className="text-sm text-gray-400 font-medium">{collection.gameIds.length} games</p>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShareModalCollectionId(collection.id); }}
                                                className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                                                title="Share Collection"
                                            >
                                                <Share2 size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteCollection(collection.id); }}
                                                className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                                title="Delete Collection"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <SharedCollectionsView
                    sharedCollections={sharedCollections}
                    onImport={handleImportShared}
                />
            )}

            {/* Create Collection Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-6">Create Collection</h2>
                        <form onSubmit={handleCreateCollection} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                                    placeholder="e.g. RPGs, Backlog, Favorites"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Description (Optional)</label>
                                <textarea
                                    value={newCollectionDesc}
                                    onChange={(e) => setNewCollectionDesc(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 h-24 resize-none"
                                    placeholder="What's this collection about?"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newCollectionName.trim()}
                                    className="flex-1 px-4 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Share Collection Modal */}
            {shareModalCollectionId && (
                <ShareModal
                    collectionId={shareModalCollectionId}
                    collectionName={collections.find(c => c.id === shareModalCollectionId)?.name || ''}
                    friends={friends}
                    onClose={() => setShareModalCollectionId(null)}
                    onShared={loadSharedCollections}
                />
            )}
        </div>
    );
};

const SharedCollectionsView: React.FC<{ sharedCollections: SharedCollection[]; onImport: (id: string) => void }> = ({ sharedCollections, onImport }) => {
    if (sharedCollections.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <Share2 size={48} className="mb-4 opacity-30" />
                <p className="text-lg font-medium">No shared collections</p>
                <p className="text-sm mt-1">Share a collection with friends using the share button</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-20">
            {sharedCollections.map(shared => (
                <div key={shared.id} className="glass-card p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white">{shared.collectionName}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Shared by <span className="text-blue-400">{shared.sharedBy}</span> · {new Date(shared.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <button
                            onClick={() => onImport(shared.id)}
                            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500 hover:text-white transition-colors"
                            title="Import to my collections"
                        >
                            <Download size={18} />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {shared.gameTitles.slice(0, 5).map((title, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-white/5 rounded-md text-gray-300 border border-white/5">{title}</span>
                        ))}
                        {shared.gameTitles.length > 5 && (
                            <span className="text-xs px-2 py-1 bg-white/5 rounded-md text-gray-500">+{shared.gameTitles.length - 5} more</span>
                        )}
                    </div>

                    <p className="text-xs text-gray-500">{shared.gameTitles.length} games in collection</p>
                </div>
            ))}
        </div>
    );
};

const ShareModal: React.FC<{
    collectionId: string;
    collectionName: string;
    friends: any[];
    onClose: () => void;
    onShared: () => void;
}> = ({ collectionId, collectionName, friends, onClose, onShared }) => {
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [isSharing, setIsSharing] = useState(false);
    const [success, setSuccess] = useState(false);

    const toggleFriend = (id: string) => {
        setSelectedFriends(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const handleShare = async () => {
        if (selectedFriends.length === 0) return;
        setIsSharing(true);
        try {
            await window.ipcRenderer.invoke('friends:shareCollection', collectionId, selectedFriends);
            setSuccess(true);
            onShared();
            setTimeout(onClose, 1500);
        } catch (error) {
            console.error('Failed to share:', error);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                {success ? (
                    <div className="py-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <Check size={32} className="text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Collection Shared!</h2>
                        <p className="text-gray-400 text-sm mt-1">"{collectionName}" has been shared</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">Share Collection</h2>
                                <p className="text-sm text-gray-400 mt-0.5">"{collectionName}"</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-gray-400 mb-3">Select friends to share with:</p>
                        
                        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 mb-6">
                            {friends.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">No friends to share with</p>
                            ) : (
                                friends.map(friend => (
                                    <button
                                        key={friend.id}
                                        onClick={() => toggleFriend(friend.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                                            selectedFriends.includes(friend.id) ? 'bg-blue-500/20 border border-blue-500/40' : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        <img src={friend.avatar} alt={friend.username} className="w-8 h-8 rounded-full bg-slate-700" />
                                        <span className="text-sm font-medium text-white flex-1 text-left">{friend.username}</span>
                                        {selectedFriends.includes(friend.id) && (
                                            <Check size={16} className="text-blue-400" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={selectedFriends.length === 0 || isSharing}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Share2 size={16} />
                                {isSharing ? 'Sharing...' : `Share (${selectedFriends.length})`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Collections;
