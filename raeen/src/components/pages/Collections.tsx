import React, { useState, useEffect } from 'react';
import { Plus, Folder, Trash2 } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { CachedImage } from '../CachedImage';

const Collections: React.FC = () => {
    const { collections, games, loadCollections, createCollection, deleteCollection } = useGameStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionDesc, setNewCollectionDesc] = useState('');

    useEffect(() => {
        loadCollections();
    }, [loadCollections]);

    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newCollectionName.trim()) {
            await createCollection(newCollectionName, newCollectionDesc);
            setNewCollectionName('');
            setNewCollectionDesc('');
            setIsCreateModalOpen(false);
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
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                    <Plus size={20} /> New Collection
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar pb-20">
                {collections.map(collection => {
                    const cover = getCollectionCover(collection.gameIds);

                    return (
                        <div key={collection.id} className="group relative aspect-video bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all overflow-hidden cursor-pointer hover:scale-[1.02]">
                            {/* Background / Cover */}
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

                            {/* Content */}
                            <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-1">{collection.name}</h3>
                                        <p className="text-sm text-gray-400 font-medium">{collection.gameIds.length} games</p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
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
        </div>
    );
};

export default Collections;
