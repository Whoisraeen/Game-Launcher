import React, { useState } from 'react';
import { Trophy, Users, Search, Calendar, Swords, UserPlus } from 'lucide-react';

const SocialHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tournaments' | 'buddy-finder'>('tournaments');

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden p-6 gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md">SOCIAL HUB</h1>
                <div className="flex bg-black/20 p-1 rounded-lg backdrop-blur-md border border-white/5">
                    <button
                        onClick={() => setActiveTab('tournaments')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'tournaments' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Tournaments
                    </button>
                    <button
                        onClick={() => setActiveTab('buddy-finder')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'buddy-finder' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Buddy Finder
                    </button>
                </div>
            </div>

            {activeTab === 'tournaments' ? <TournamentSection /> : <BuddyFinderSection />}
        </div>
    );
};

const TournamentSection = () => {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create Tournament Card */}
                <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-4 border-dashed border-2 border-white/10 hover:border-white/30 transition-colors cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Trophy size={32} className="text-yellow-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Create Tournament</h3>
                        <p className="text-sm text-gray-400">Host a new bracket for your friends</p>
                    </div>
                </div>

                {/* Active Tournament Card */}
                <div className="glass-card p-0 overflow-hidden group cursor-pointer">
                    <div className="h-32 bg-gradient-to-br from-blue-900 to-slate-900 relative">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-blue-400 uppercase bg-black/50 px-2 py-1 rounded">Rocket League</span>
                            <h3 className="text-xl font-bold text-white mt-1">Friday Night Cup</h3>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                            <div className="flex items-center gap-2">
                                <Users size={14} /> 8/16 Teams
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} /> Starts in 2h
                            </div>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 mb-2">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '50%' }}></div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-slate-700 border border-slate-900" />
                                ))}
                                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-900 flex items-center justify-center text-[8px] text-gray-400">+5</div>
                            </div>
                            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors">
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Swords size={20} className="text-red-500" /> Recent Results
                </h2>
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center font-bold text-gray-500">#1</div>
                                <div>
                                    <h4 className="font-bold text-white">Tekken 8 Weekly</h4>
                                    <p className="text-xs text-gray-400">Won by <span className="text-yellow-500">PlayerOne</span></p>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">2 days ago</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const BuddyFinderSection = () => {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="glass-panel p-6 mb-6">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Find players for..."
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <select className="bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:outline-none">
                        <option>Any Region</option>
                        <option>NA East</option>
                        <option>EU West</option>
                    </select>
                    <select className="bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:outline-none">
                        <option>Any Skill</option>
                        <option>Casual</option>
                        <option>Competitive</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="glass-card p-4 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-700 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-white text-lg">GamerTag{i}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase font-bold">Apex Legends</span>
                                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded uppercase font-bold">Mic ON</span>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">2m ago</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-2 line-clamp-1">Looking for a third for ranked grind. Platinum rank.</p>
                        </div>
                        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
                            <UserPlus size={20} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SocialHub;
