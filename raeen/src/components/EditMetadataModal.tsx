import React, { useState, useEffect } from 'react';
import { X, Search, Check, Image, Download } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

interface EditMetadataModalProps {
    gameId: string;
    onClose: () => void;
}

interface MetadataCandidate {
    cover?: string;
    hero?: string;
    description?: string;
    releaseDate?: string;
    genres?: string[];
    developer?: string;
    title?: string; // Derived if not explicitly returned
}

const EditMetadataModal: React.FC<EditMetadataModalProps> = ({ gameId, onClose }) => {
    const store = useGameStore();
    const game = store.games.find(g => g.id === gameId);
    const [searchTerm, setSearchTerm] = useState(game?.title || '');
    const [candidates, setCandidates] = useState<MetadataCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<MetadataCandidate | null>(null);

    useEffect(() => {
        if (game?.title) {
            handleSearch(game.title);
        }
    }, []);

    const handleSearch = async (term: string) => {
        setIsLoading(true);
        try {
            const results = await window.ipcRenderer.invoke('metadata:search', term);
            setCandidates(results || []);
        } catch (error) {
            console.error('Failed to search metadata:', error);
            setCandidates([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async () => {
        if (!game) return;
        
        const updates: any = {};

        if (selectedCandidate) {
             updates.description = selectedCandidate.description;
             updates.cover = selectedCandidate.cover;
             updates.heroImage = selectedCandidate.hero;
             updates.releaseDate = selectedCandidate.releaseDate;
             updates.genre = selectedCandidate.genres?.[0];
             updates.developer = selectedCandidate.developer;
        }
        
        if (customBackground) {
            updates.heroImage = customBackground;
        }

        try {
            await store.updateGameDetails(game.id, updates);
            onClose();
        } catch (error) {
            console.error('Failed to apply metadata:', error);
        }
    };
    
    const [customBackground, setCustomBackground] = useState<string | null>(null);
    const handleBackgroundUpload = async () => {
         // In a real app, we'd use a file dialog here
         // For this demo, let's prompt for a URL or use a dummy path if we had a file picker
         const url = prompt("Enter URL for custom background:");
         if (url) setCustomBackground(url);
    };

    if (!game) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl h-[80vh] bg-slate-900 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white">Edit Metadata: {game.title}</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Search & Results */}
                    <div className="w-1/3 border-r border-white/10 flex flex-col bg-slate-900/30">
                        <div className="p-4 border-b border-white/5 space-y-4">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                    placeholder="Search game title..."
                                />
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                             <button 
                                onClick={handleBackgroundUpload}
                                className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-medium text-gray-300 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Image size={14} />
                                Set Custom Background (URL)
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {isLoading ? (
                                <div className="flex justify-center p-4 text-gray-500 text-sm">Searching...</div>
                            ) : candidates.length === 0 ? (
                                <div className="flex justify-center p-4 text-gray-500 text-sm">No results found</div>
                            ) : (
                                candidates.map((c, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedCandidate(c)}
                                        className={`p-3 rounded-lg cursor-pointer flex gap-3 items-center transition-colors ${selectedCandidate === c ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className="w-10 h-14 bg-slate-800 rounded overflow-hidden flex-shrink-0">
                                            {c.cover ? (
                                                <img src={c.cover} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600"><Image size={16} /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-white truncate">{c.title || searchTerm}</div>
                                            <div className="text-xs text-gray-400 truncate">{c.releaseDate || 'Unknown Date'}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="flex-1 flex flex-col bg-slate-950/50 relative">
                        {(selectedCandidate || customBackground) ? (
                            <>
                                {/* Hero Background */}
                                <div className="absolute inset-0 z-0 opacity-40">
                                    {(customBackground || selectedCandidate?.hero) && <img src={customBackground || selectedCandidate?.hero} alt="" className="w-full h-full object-cover blur-sm transition-all duration-500" />}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                                </div>

                                <div className="relative z-10 p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
                                    <div className="flex gap-6">
                                        <div className="w-48 h-72 bg-slate-800 rounded-lg shadow-2xl overflow-hidden flex-shrink-0 border border-white/10">
                                            {selectedCandidate?.cover ? (
                                                <img src={selectedCandidate.cover} alt="Cover" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500">No Cover</div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <h1 className="text-3xl font-bold text-white">{game.title}</h1>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedCandidate?.genres?.map(g => (
                                                    <span key={g} className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300">{g}</span>
                                                ))}
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-300">
                                                <p><strong className="text-gray-500">Release Date:</strong> {selectedCandidate?.releaseDate || 'Unknown'}</p>
                                                <p><strong className="text-gray-500">Developer:</strong> {selectedCandidate?.developer || 'Unknown'}</p>
                                                <div className="pt-4">
                                                    <strong className="text-gray-500 block mb-1">Description</strong>
                                                    <p className="leading-relaxed line-clamp-6">{selectedCandidate?.description || 'No description available.'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="p-6 border-t border-white/10 bg-slate-900/80 flex justify-end gap-3">
                                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">Cancel</button>
                                    <button 
                                        onClick={handleApply}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105"
                                    >
                                        <Check size={16} />
                                        Apply Changes
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                                <Search size={48} className="mb-4 opacity-50" />
                                <p>Select a match or set a custom background to preview</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditMetadataModal;
