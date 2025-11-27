import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, Play, Settings, Trash2, Box, Layers, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModPack {
    id: string;
    name: string;
    version: string;
    author: string;
    description: string;
    logo?: string;
    loader: 'forge' | 'fabric' | 'quilt' | 'neoforge';
    mcVersion: string;
    mods: any[];
}

interface Mod {
    id: string;
    name: string;
    summary: string;
    author: string;
    logo: string;
    url: string;
    source: 'curseforge' | 'modrinth';
    downloads: number;
    updated: string;
}

const ModsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'my-packs' | 'curseforge' | 'modrinth'>('my-packs');
    const [packs, setPacks] = useState<ModPack[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Mod[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newPackData, setNewPackData] = useState({ name: '', mcVersion: '1.20.1', loader: 'fabric', loaderVersion: 'latest' });

    useEffect(() => {
        loadPacks();
    }, []);

    useEffect(() => {
        if (activeTab !== 'my-packs' && searchQuery) {
            const delayDebounceFn = setTimeout(() => {
                searchMods();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery, activeTab]);

    const loadPacks = async () => {
        try {
            const result = await window.ipcRenderer.invoke('mods:getAll');
            setPacks(result);
        } catch (error) {
            console.error('Failed to load modpacks:', error);
        }
    };

    const searchMods = async () => {
        try {
            const result = await window.ipcRenderer.invoke('mods:search', { query: searchQuery, source: activeTab });
            setSearchResults(result);
        } catch (error) {
            console.error('Failed to search mods:', error);
        }
    };

    const handleCreatePack = async () => {
        try {
            await window.ipcRenderer.invoke('mods:create', newPackData);
            setIsCreating(false);
            loadPacks();
        } catch (error) {
            console.error('Failed to create pack:', error);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Mods & Modpacks</h1>
                    <p className="text-gray-400">Manage your instances and discover new content</p>
                </div>

                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
                    <TabButton active={activeTab === 'my-packs'} onClick={() => setActiveTab('my-packs')} icon={<Box size={16} />} label="My Modpacks" />
                    <TabButton active={activeTab === 'curseforge'} onClick={() => setActiveTab('curseforge')} icon={<Globe size={16} />} label="Curseforge" />
                    <TabButton active={activeTab === 'modrinth'} onClick={() => setActiveTab('modrinth')} icon={<Layers size={16} />} label="Modrinth" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {activeTab === 'my-packs' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {/* Create New Card */}
                            <button
                                onClick={() => setIsCreating(true)}
                                className="aspect-[4/3] rounded-xl border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 flex flex-col items-center justify-center gap-4 group transition-all"
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <Plus size={24} />
                                </div>
                                <span className="text-gray-400 font-medium group-hover:text-white">Create New Instance</span>
                            </button>

                            {/* Pack Cards */}
                            {packs.map(pack => (
                                <div key={pack.id} className="aspect-[4/3] bg-slate-800/50 rounded-xl border border-white/5 p-4 flex flex-col relative group hover:border-white/20 transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-2xl font-bold text-gray-500">
                                            {pack.name.charAt(0)}
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><Settings size={16} /></button>
                                            <button className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <h3 className="text-lg font-bold text-white mb-1 truncate">{pack.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                                            <span className="px-2 py-0.5 bg-white/5 rounded capitalize">{pack.loader}</span>
                                            <span>{pack.mcVersion}</span>
                                        </div>

                                        <button className="w-full py-2 bg-white/5 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                            <Play size={16} /> Play
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab === 'curseforge' ? 'Curseforge' : 'Modrinth'}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                            />
                        </div>

                        {/* Search Results */}
                        <div className="grid grid-cols-1 gap-4">
                            {searchResults.map(mod => (
                                <div key={mod.id} className="bg-slate-800/30 border border-white/5 rounded-xl p-4 flex gap-4 hover:bg-slate-800/50 transition-colors">
                                    <img src={mod.logo || 'https://via.placeholder.com/64'} alt={mod.name} className="w-16 h-16 rounded-lg bg-slate-700 object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-bold text-white truncate">{mod.name}</h3>
                                                <p className="text-sm text-gray-400 mb-2 line-clamp-1">{mod.summary}</p>
                                            </div>
                                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
                                                <Download size={16} /> Install
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span>by {mod.author}</span>
                                            <span>{mod.downloads.toLocaleString()} downloads</span>
                                            <span className="capitalize">{mod.source}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {searchResults.length === 0 && searchQuery && (
                                <div className="text-center py-12 text-gray-500">
                                    No mods found matching "{searchQuery}"
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Pack Modal */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <h2 className="text-2xl font-bold text-white mb-6">Create New Instance</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Name</label>
                                    <input
                                        type="text"
                                        value={newPackData.name}
                                        onChange={(e) => setNewPackData({ ...newPackData, name: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        placeholder="My Awesome Modpack"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Minecraft Version</label>
                                        <select
                                            value={newPackData.mcVersion}
                                            onChange={(e) => setNewPackData({ ...newPackData, mcVersion: e.target.value })}
                                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 appearance-none"
                                        >
                                            <option value="1.20.4">1.20.4</option>
                                            <option value="1.20.1">1.20.1</option>
                                            <option value="1.19.2">1.19.2</option>
                                            <option value="1.18.2">1.18.2</option>
                                            <option value="1.16.5">1.16.5</option>
                                            <option value="1.12.2">1.12.2</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Mod Loader</label>
                                        <select
                                            value={newPackData.loader}
                                            onChange={(e) => setNewPackData({ ...newPackData, loader: e.target.value as any })}
                                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 appearance-none"
                                        >
                                            <option value="fabric">Fabric</option>
                                            <option value="forge">Forge</option>
                                            <option value="neoforge">NeoForge</option>
                                            <option value="quilt">Quilt</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreatePack}
                                    disabled={!newPackData.name}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                                >
                                    Create Instance
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-slate-700 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
        {icon}
        {label}
    </button>
);

export default ModsPage;
