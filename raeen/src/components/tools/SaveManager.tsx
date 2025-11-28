import React, { useState } from 'react';
import { Cloud, Download, Upload, Save, RefreshCw, Check } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';

const SaveManager: React.FC = () => {
    const { games } = useGameStore();
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const handleSync = () => {
        if (!selectedGameId) return;
        setIsSyncing(true);
        // Simulate sync delay
        setTimeout(() => {
            setIsSyncing(false);
            setLastSync(new Date());
        }, 2000);
    };

    const handleBackup = () => {
        if (!selectedGameId) return;
        alert(`Backup created for ${games.find(g => g.id === selectedGameId)?.title}`);
    };

    const handleRestore = () => {
        if (!selectedGameId) return;
        if (confirm('Are you sure you want to restore? Current progress will be overwritten.')) {
            alert(`Save restored for ${games.find(g => g.id === selectedGameId)?.title}`);
        }
    };

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Save Manager</h1>
                    <p className="text-sm text-gray-400">Backup, restore, and sync your game saves to the cloud.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-medium">
                    <Cloud size={14} /> Cloud Sync Active
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                {/* Game List */}
                <div className="bg-slate-800/30 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/5 bg-slate-900/50">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Select Game</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {games.map(game => (
                            <button
                                key={game.id}
                                onClick={() => setSelectedGameId(game.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${selectedGameId === game.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <Save size={18} className={selectedGameId === game.id ? 'text-white' : 'text-gray-500'} />
                                <span className="font-medium truncate">{game.title}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions Panel */}
                <div className="lg:col-span-2 bg-slate-800/30 rounded-2xl border border-white/5 p-8 flex flex-col items-center justify-center text-center">
                    {selectedGameId ? (
                        <div className="max-w-md w-full space-y-8">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">{games.find(g => g.id === selectedGameId)?.title}</h2>
                                <p className="text-gray-400 text-sm">
                                    Last Synced: {lastSync ? lastSync.toLocaleString() : 'Never'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className="col-span-2 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                                </button>

                                <button
                                    onClick={handleBackup}
                                    className="py-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium flex flex-col items-center gap-2 transition-colors"
                                >
                                    <Download size={24} className="text-blue-400" />
                                    <span>Create Backup</span>
                                </button>

                                <button
                                    onClick={handleRestore}
                                    className="py-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium flex flex-col items-center gap-2 transition-colors"
                                >
                                    <Upload size={24} className="text-green-400" />
                                    <span>Restore Save</span>
                                </button>
                            </div>

                            <div className="bg-black/20 rounded-lg p-4 text-left space-y-3 border border-white/5">
                                <h4 className="text-xs font-bold text-gray-500 uppercase">Recent Activity</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Check size={14} className="text-green-500" />
                                        <span className="text-gray-300">Cloud sync completed successfully</span>
                                        <span className="text-xs text-gray-600 ml-auto">2h ago</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Download size={14} className="text-blue-500" />
                                        <span className="text-gray-300">Local backup created</span>
                                        <span className="text-xs text-gray-600 ml-auto">Yesterday</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500 space-y-4">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                                <Save size={32} className="opacity-50" />
                            </div>
                            <p>Select a game to manage its save files.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaveManager;
