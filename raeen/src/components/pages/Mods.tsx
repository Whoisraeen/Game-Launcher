import React, { useState, useEffect } from 'react';
import { Check, FolderOpen, RefreshCw, Plus, Trash2, X } from 'lucide-react';
import { useModStore, Mod } from '../../stores/modStore';
import { useGameStore } from '../../stores/gameStore';

const Mods: React.FC = () => {
    const { mods, loadMods, addMod, deleteMod, toggleMod, isLoading } = useModStore();
    const { games, loadGames } = useGameStore();
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Add Mod Form State
    const [modName, setModName] = useState('');
    const [modDesc, setModDesc] = useState('');
    const [modVersion, setModVersion] = useState('');
    const [modPath, setModPath] = useState('');

    useEffect(() => {
        loadMods();
        if (games.length === 0) loadGames();
    }, [loadMods, loadGames, games.length]);

    const filteredMods = selectedGameId
        ? mods.filter(m => m.gameId === selectedGameId)
        : mods;

    // Get games that have mods

    const handleAddMod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGameId) return;

        await addMod(selectedGameId, modName, modDesc, modVersion, modPath);
        setIsAddModalOpen(false);
        // Reset form
        setModName('');
        setModDesc('');
        setModVersion('');
        setModPath('');
    };

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col p-6 space-y-6 relative">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Mod Manager</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => selectedGameId && setIsAddModalOpen(true)}
                        disabled={!selectedGameId}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={16} /> Add Mod
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                        <FolderOpen size={16} /> Open Folder
                    </button>
                </div>
            </div>

            {/* Game Selector Chips */}
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                <button
                    onClick={() => setSelectedGameId(null)}
                    className={`px-4 py-2 rounded-lg border transition-colors text-sm font-medium whitespace-nowrap ${!selectedGameId ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800/50 border-white/5 text-gray-400 hover:text-white'}`}
                >
                    All Games
                </button>
                {games.map(game => (
                    <button
                        key={game.id}
                        onClick={() => setSelectedGameId(game.id)}
                        className={`px-4 py-2 rounded-lg border transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-2 ${selectedGameId === game.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800/50 border-white/5 text-gray-400 hover:text-white'}`}
                    >
                        {game.title}
                        {mods.filter(m => m.gameId === game.id).length > 0 && (
                            <span className="bg-white/20 px-1.5 rounded text-xs">{mods.filter(m => m.gameId === game.id).length}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="flex-1 bg-slate-800/30 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                        {selectedGameId ? `Mods for ${games.find(g => g.id === selectedGameId)?.title}` : 'All Installed Mods'}
                        ({filteredMods.length})
                    </span>
                    <button onClick={() => loadMods()} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {filteredMods.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <p>No mods found.</p>
                            {selectedGameId && (
                                <button onClick={() => setIsAddModalOpen(true)} className="mt-2 text-blue-400 hover:text-blue-300 text-sm">
                                    Add your first mod
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredMods.map(mod => (
                            <ModItem
                                key={mod.id}
                                mod={mod}
                                onToggle={() => toggleMod(mod.id, !mod.enabled)}
                                onDelete={() => deleteMod(mod.id)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Add Mod Modal */}
            {isAddModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Add Mod</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddMod} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mod Name</label>
                                <input
                                    type="text"
                                    required
                                    value={modName}
                                    onChange={e => setModName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="e.g. HD Texture Pack"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Version</label>
                                    <input
                                        type="text"
                                        value={modVersion}
                                        onChange={e => setModVersion(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                                        placeholder="e.g. v1.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Author (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                                        placeholder="Mod Author"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                                <textarea
                                    value={modDesc}
                                    onChange={e => setModDesc(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 h-20 resize-none"
                                    placeholder="Brief description of the mod..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Install Path (Optional)</label>
                                <input
                                    type="text"
                                    value={modPath}
                                    onChange={e => setModPath(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="C:\Path\To\Mod"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                                >
                                    Add Mod
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const ModItem = ({ mod, onToggle, onDelete }: { mod: Mod, onToggle: () => void, onDelete: () => void }) => (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${mod.enabled ? 'bg-slate-800/50 border-white/5' : 'bg-slate-900/50 border-transparent opacity-60'}`}>
        <div className="flex items-center gap-4">
            <div
                onClick={onToggle}
                className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${mod.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-600 hover:border-gray-400'}`}
            >
                {mod.enabled && <Check size={14} className="text-white" />}
            </div>
            <div>
                <h3 className="font-bold text-white text-sm">{mod.name}</h3>
                <p className="text-xs text-gray-500">
                    {mod.version && <span className="mr-2">{mod.version}</span>}
                    {mod.gameTitle && <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">{mod.gameTitle}</span>}
                </p>
            </div>
        </div>
        <div className="flex gap-2 items-center">
            <button onClick={onToggle} className={`text-xs px-2 py-1 rounded-full ${mod.enabled ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-gray-700/50 text-gray-500 hover:bg-gray-700/70'}`}>
                {mod.enabled ? 'Active' : 'Disabled'}
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Delete Mod"
            >
                <Trash2 size={14} />
            </button>
        </div>
    </div>
);

export default Mods;