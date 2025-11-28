import React, { useState, useEffect } from 'react';
import { HardDrive, Archive, AlertTriangle, Trash2, ArrowRight } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const StorageOptimizer: React.FC = () => {
    const { games, loadGames } = useGameStore();
    const [driveStats, setDriveStats] = useState<any[]>([]);
    const [unusedGames, setUnusedGames] = useState<any[]>([]);

    useEffect(() => {
        loadGames();
        analyzeStorage();
    }, [games]);

    const analyzeStorage = () => {
        // Group games by drive (Windows only for now, based on first char)
        const drives: any = {};
        const unused: any[] = [];
        const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);

        games.forEach(game => {
            if (game.status === 'installed' && game.installPath) {
                // Drive detection
                const drive = game.installPath.charAt(0).toUpperCase();
                if (!drives[drive]) drives[drive] = { name: drive, size: 0, count: 0 };
                
                // Mock size if we don't have it (we need 'du' logic in backend really, assuming 20GB avg for now if unknown)
                // Ideally we'd fetch size. Let's use a random size for demo visualization if undefined
                const size = 20 * 1024 * 1024 * 1024; 
                drives[drive].size += size; 
                drives[drive].count++;

                // Unused logic
                if ((!game.lastPlayed || game.lastPlayed < sixMonthsAgo) && (game.playtime || 0) > 0) {
                    unused.push(game);
                }
            }
        });

        setDriveStats(Object.values(drives));
        setUnusedGames(unused);
    };

    const data = driveStats.map(d => ({ name: `Drive ${d.name}`, value: d.size }));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Storage Overview */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <HardDrive size={20} className="text-blue-500" /> Storage Distribution
                </h3>
                <div className="flex-1 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    {driveStats.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                <span className="text-white font-bold">Drive {d.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-400">{d.count} Games</div>
                                <div className="text-sm font-mono text-blue-400">~{(d.size / 1024 / 1024 / 1024).toFixed(1)} GB</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Archive Candidates */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Archive size={20} className="text-orange-500" /> Archive Candidates
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                    These games haven't been played in over 6 months. Consider moving them to a slower drive or uninstalling.
                </p>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {unusedGames.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <div className="p-4 bg-white/5 rounded-full mb-2"><Archive size={24} /></div>
                            <p>No unused games found. Great job!</p>
                        </div>
                    ) : (
                        unusedGames.map(game => (
                            <div key={game.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5 hover:bg-black/30 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-10 bg-slate-700 rounded flex-shrink-0 overflow-hidden">
                                        {game.cover && <img src={game.cover} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-white truncate">{game.title}</div>
                                        <div className="text-xs text-gray-500">Last played: {new Date(game.lastPlayed).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                                        title="Move to Archive"
                                    >
                                        <ArrowRight size={16} />
                                    </button>
                                    <button 
                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Uninstall"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default StorageOptimizer;
