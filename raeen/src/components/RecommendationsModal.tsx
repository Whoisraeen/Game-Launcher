import React, { useEffect, useState } from 'react';
import { X, Sparkles, Play, Star, Gamepad2, Swords, Users, BookOpen, Timer, Trophy } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { Game } from '../types';

interface RecommendationsModalProps {
    onClose: () => void;
    onPlay: (game: Game) => void;
}

interface MoodOption {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
}

const MOODS: MoodOption[] = [
    { id: 'Chill',        label: 'Relaxed',      icon: <Gamepad2 size={20} />, color: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30 hover:border-teal-400/50 text-teal-400',       description: 'Calm and cozy vibes' },
    { id: 'Action',       label: 'Competitive',   icon: <Swords size={20} />,   color: 'from-red-500/20 to-orange-500/20 border-red-500/30 hover:border-red-400/50 text-red-400',         description: 'Intense PvP action' },
    { id: 'Social',       label: 'Social',        icon: <Users size={20} />,    color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 hover:border-blue-400/50 text-blue-400',     description: 'Play with friends' },
    { id: 'Story',        label: 'Story-driven',  icon: <BookOpen size={20} />, color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-400/50 text-purple-400', description: 'Rich narratives' },
    { id: 'Action',       label: 'Quick session',  icon: <Timer size={20} />,    color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30 hover:border-yellow-400/50 text-yellow-400', description: 'Under 30 minutes' },
    { id: 'Challenge',    label: 'Challenge',     icon: <Trophy size={20} />,   color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30 hover:border-emerald-400/50 text-emerald-400', description: 'Test your skills' },
];

const RecommendationsModal: React.FC<RecommendationsModalProps> = ({ onClose, onPlay }) => {
    const { recommendations, loadRecommendations, isLoading } = useGameStore();
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [moodResults, setMoodResults] = useState<Game[]>([]);
    const [moodLoading, setMoodLoading] = useState(false);

    useEffect(() => {
        loadRecommendations();
    }, [loadRecommendations]);

    const handleMoodSelect = async (mood: MoodOption) => {
        setSelectedMood(mood.id);
        setMoodLoading(true);
        try {
            const timeConstraint = mood.label === 'Quick session' ? 'Short' : 'Any';
            const results = await window.ipcRenderer.invoke('games:getMoodRecommendations', mood.id, timeConstraint);
            setMoodResults(results || []);
        } catch (e) {
            console.error('Mood recommendations failed:', e);
            setMoodResults([]);
        } finally {
            setMoodLoading(false);
        }
    };

    const clearMood = () => {
        setSelectedMood(null);
        setMoodResults([]);
    };

    const displayGames = selectedMood ? moodResults : recommendations;
    const loading = selectedMood ? moodLoading : isLoading;

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
                            <p className="text-sm text-gray-400">AI-curated picks based on your play history and mood</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Mood Selector */}
                <div className="px-6 pt-5 pb-3">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">What's your mood?</h3>
                        {selectedMood && (
                            <button onClick={clearMood} className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                                <X size={12} /> Clear filter
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {MOODS.map((mood, idx) => (
                            <button
                                key={`${mood.id}-${idx}`}
                                onClick={() => handleMoodSelect(mood)}
                                className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                                    selectedMood === mood.id
                                        ? `bg-gradient-to-b ${mood.color} scale-[1.05] shadow-lg`
                                        : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 text-gray-400 hover:text-white'
                                }`}
                            >
                                <span className={selectedMood === mood.id ? '' : 'group-hover:scale-110 transition-transform'}>
                                    {mood.icon}
                                </span>
                                <span className="text-[11px] font-bold tracking-tight">{mood.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-3">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                        </div>
                    ) : displayGames.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayGames.map((game, index) => (
                                <div key={game.id} className="group relative h-48 rounded-xl overflow-hidden border border-white/5 hover:border-purple-500/50 transition-all hover:scale-[1.02]">
                                    <div className="absolute inset-0">
                                        {game.heroImage || game.cover ? (
                                            <img src={game.heroImage || game.cover} alt={game.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                    </div>

                                    <div className="absolute inset-0 p-5 flex flex-col justify-end">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {index === 0 && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase rounded border border-yellow-500/20">Top Pick</span>}
                                                    {selectedMood && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase rounded border border-purple-500/20">{selectedMood} Mood</span>}
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
                            <p className="text-xl">{selectedMood ? 'No matches for this mood.' : 'No recommendations yet.'}</p>
                            <p className="text-sm mt-2">
                                {selectedMood
                                    ? 'Try a different mood or install more games matching this vibe.'
                                    : 'Play more games and rate them to get better suggestions!'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecommendationsModal;
