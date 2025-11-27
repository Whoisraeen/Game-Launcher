import React, { useEffect } from 'react';
import { X, Sparkles, Play, Star } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { Game } from '../types';

interface RecommendationsModalProps {
    onClose: () => void;
    onPlay: (game: Game) => void;
}

const RecommendationsModal: React.FC<RecommendationsModalProps> = ({ onClose, onPlay }) => {
    const { recommendations, loadRecommendations, isLoading } = useGameStore();

    useEffect(() => {
        loadRecommendations();
    }, [loadRecommendations]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Recommended for You</h2>
                            <p className="text-sm text-gray-400">AI-curated picks based on your play history and ratings</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                        </div>
                    ) : recommendations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {recommendations.map((game, index) => (
                                <div key={game.id} className="group relative h-48 rounded-xl overflow-hidden border border-white/5 hover:border-purple-500/50 transition-all hover:scale-[1.02]">
                                    {/* Background Image */}
                                    <div className="absolute inset-0">
                                        {game.heroImage || game.cover ? (
                                            <img src={game.heroImage || game.cover} alt={game.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                    </div>

                                    {/* Content */}
                                    <div className="absolute inset-0 p-5 flex flex-col justify-end">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {index === 0 && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase rounded border border-yellow-500/20">Top Pick</span>}
                                                    <span className="text-xs text-gray-300 bg-white/10 px-2 py-0.5 rounded">{game.genre || 'Game'}</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-1">{game.title}</h3>
                                                <div className="flex items-center gap-1 text-yellow-500">
                                                    <Star size={12} fill="currentColor" />
                                                    <span className="text-xs font-medium">{game.rating ? game.rating.toFixed(1) : 'NR'}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    onPlay(game);
                                                    onClose();
                                                }}
                                                className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg shadow-purple-600/30 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300"
                                            >
                                                <Play size={20} fill="currentColor" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-20">
                            <p className="text-xl">No recommendations yet.</p>
                            <p className="text-sm mt-2">Play more games and rate them to get better suggestions!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecommendationsModal;
