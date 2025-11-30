import React, { useState } from 'react';
import { Sparkles, Shuffle, History, Clock, Zap, X } from 'lucide-react';

interface DecisionHelperModalProps {
    onClose: () => void;
    onLaunch: (gameId: string) => void;
}

const DecisionHelperModal: React.FC<DecisionHelperModalProps> = ({ onClose, onLaunch }) => {
    const [suggestedGame, setSuggestedGame] = useState<any | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [timeAvailable, setTimeAvailable] = useState<number>(120); // Default 2 hours (essentially unlimited for filters)

    const handleRoll = async (criteria: 'backlog' | 'replay' | 'quick' | 'forgotten' | 'random') => {
        setIsRolling(true);
        setSuggestedGame(null);

        try {
            // Add a small delay for effect
            await new Promise(resolve => setTimeout(resolve, 800));
            // Pass timeAvailable (if 120+ treat as unlimited/undefined)
            const limit = timeAvailable >= 120 ? undefined : timeAvailable;
            const game = await window.ipcRenderer.invoke('games:getSmartSuggestion', criteria, limit);
            setSuggestedGame(game);
        } catch (e) {
            console.error('Failed to get suggestion', e);
        } finally {
            setIsRolling(false);
        }
    };

    const timeLabels = {
        15: '15m',
        30: '30m',
        60: '1h',
        120: 'Unlimited'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
                
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10">
                    <X size={20} />
                </button>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 mb-4 shadow-lg shadow-purple-500/20">
                            <Sparkles size={32} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">What should I play?</h2>
                        <p className="text-gray-400 mt-2">Let the algorithm decide based on your mood and time.</p>
                    </div>

                    {!suggestedGame && !isRolling && (
                        <>
                            {/* Time Selection */}
                            <div className="mb-8 bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-gray-300">Time Available</span>
                                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                                        {timeLabels[timeAvailable as keyof typeof timeLabels] || `${timeAvailable}m`}
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min="15" 
                                    max="120" 
                                    step="15" // Coarse steps
                                    value={timeAvailable} 
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        // Snap to specific values for better UX if needed, currently 15m steps
                                        setTimeAvailable(val);
                                    }}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="flex justify-between mt-2 text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                    <span>Quick (15m)</span>
                                    <span>Short (30m)</span>
                                    <span>Medium (1h)</span>
                                    <span>Any</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <SelectionCard 
                                    icon={<History size={24} className="text-amber-400" />}
                                    title="Backlog"
                                    description="Unplayed games sitting in your library"
                                    onClick={() => handleRoll('backlog')}
                                />
                                <SelectionCard 
                                    icon={<Zap size={24} className="text-yellow-400" />}
                                    title="Quick Play"
                                    description="Fast-paced, arcade, or roguelike"
                                    onClick={() => handleRoll('quick')}
                                />
                                <SelectionCard 
                                    icon={<Clock size={24} className="text-blue-400" />}
                                    title="Comfort Zone"
                                    description="Games you love and play often"
                                    onClick={() => handleRoll('replay')}
                                />
                                <SelectionCard 
                                    icon={<Shuffle size={24} className="text-green-400" />}
                                    title="Total Random"
                                    description="Spin the wheel, anything goes"
                                    onClick={() => handleRoll('random')}
                                />
                            </div>
                        </>
                    )}

                    {isRolling && (
                        <div className="h-64 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-white font-medium animate-pulse">Consulting the oracle...</p>
                        </div>
                    )}

                    {suggestedGame && (
                        <div className="animate-in slide-in-from-bottom-10 duration-500">
                            <div className="relative w-full h-64 rounded-xl overflow-hidden mb-6 shadow-2xl group">
                                {suggestedGame.hero ? (
                                    <img src={suggestedGame.hero} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-600">{suggestedGame.title}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-6">
                                    <div className="text-xs font-bold text-blue-400 mb-1 uppercase tracking-wider">Recommended For You</div>
                                    <h3 className="text-3xl font-bold text-white mb-2">{suggestedGame.title}</h3>
                                    <div className="flex gap-2">
                                        {suggestedGame.genre && <span className="px-2 py-1 bg-white/10 rounded text-xs text-white backdrop-blur-sm">{suggestedGame.genre}</span>}
                                        <span className="px-2 py-1 bg-white/10 rounded text-xs text-white backdrop-blur-sm">{suggestedGame.platform}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => { setSuggestedGame(null); }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors"
                                >
                                    Try Another
                                </button>
                                <button 
                                    onClick={() => { onLaunch(suggestedGame.id); onClose(); }}
                                    className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-transform hover:scale-[1.02]"
                                >
                                    Play Now
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SelectionCard = ({ icon, title, description, onClick }: any) => (
    <button 
        onClick={onClick}
        className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-left transition-all hover:border-white/20 hover:-translate-y-1 group"
    >
        <div className="mb-3 p-2 bg-black/20 rounded-lg w-fit group-hover:scale-110 transition-transform">{icon}</div>
        <div className="font-bold text-white mb-1">{title}</div>
        <div className="text-xs text-gray-400">{description}</div>
    </button>
);

export default DecisionHelperModal;
