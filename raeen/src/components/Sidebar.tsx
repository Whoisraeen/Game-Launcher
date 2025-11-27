import React, { useEffect } from 'react';
import { LayoutGrid, ShoppingBag, Users, Settings, Newspaper, BarChart2, Wrench, Folder, Plus, Trash2 } from 'lucide-react';

import { useSettingsStore } from '../stores/settingsStore';
import { useGameStore } from '../stores/gameStore';

interface SidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
    const { settings } = useSettingsStore();
    const { collections, loadCollections, createCollection, deleteCollection, addGameToCollection, selectedCollectionId, setSelectedCollectionId } = useGameStore();

    useEffect(() => {
        loadCollections();
    }, []);

    const handleCreateCollection = async () => {
        const name = window.prompt("Enter collection name:");
        if (name) {
            await createCollection(name);
        }
    };

    const handleDrop = async (e: React.DragEvent, collectionId: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-500/30');
        const gameId = e.dataTransfer.getData("gameId");
        if (gameId) {
            await addGameToCollection(collectionId, gameId);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-blue-500/30');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-blue-500/30');
    };

    const handleDeleteCollection = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this collection?")) {
            if (selectedCollectionId === id) setSelectedCollectionId(null);
            await deleteCollection(id);
        }
    };

    const handleCollectionClick = (id: string) => {
        setSelectedCollectionId(id);
        onNavigate('Library');
    };

    const handleLibraryClick = () => {
        setSelectedCollectionId(null);
        onNavigate('Library');
    };

    return (
        <div className="glass-panel w-72 h-full flex flex-col p-4 gap-6 z-20 relative">
            {/* User Profile */}
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 shadow-lg">
                <div className="relative">
                    <img
                        src={settings?.account.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"}
                        alt="User"
                        className="w-10 h-10 rounded-full bg-slate-700"
                    />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${settings?.account.status === 'online' ? 'bg-green-500' :
                            settings?.account.status === 'playing' ? 'bg-purple-500' :
                                settings?.account.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}></div>
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-white truncate">{settings?.account.username || "Guest"}</span>
                    <span className="text-xs text-green-400 truncate flex items-center gap-1">
                        {settings?.account.status === 'playing' ? 'Playing...' :
                            settings?.account.status === 'online' ? 'Online' :
                                settings?.account.status === 'away' ? 'Away' : 'Offline'}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                <NavItem
                    icon={<LayoutGrid size={20} />}
                    label="All Games"
                    active={activePage === 'Library' && selectedCollectionId === null}
                    onClick={handleLibraryClick}
                />

                {/* Collections Section */}
                <div className="pt-4 pb-2">
                    <div className="flex items-center justify-between px-3 mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Collections</span>
                        <button
                            onClick={handleCreateCollection}
                            className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                            title="Create Collection"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {collections.map(collection => (
                        <div
                            key={collection.id}
                            onClick={() => handleCollectionClick(collection.id)}
                            onDrop={(e) => handleDrop(e, collection.id)}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 group relative ${activePage === 'Library' && selectedCollectionId === collection.id
                                    ? 'bg-gradient-to-r from-blue-500/20 to-transparent text-white border-l-2 border-blue-500'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className={`transition-colors ${activePage === 'Library' && selectedCollectionId === collection.id ? 'text-blue-400' : 'group-hover:text-blue-400'}`}>
                                <Folder size={18} />
                            </span>
                            <span className="font-medium text-sm flex-1 truncate">{collection.name}</span>
                            <span className="text-[10px] text-gray-500">{collection.gameIds.length}</span>

                            <button
                                onClick={(e) => handleDeleteCollection(e, collection.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>

                            {activePage === 'Library' && selectedCollectionId === collection.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="h-px bg-white/5 my-2 mx-3"></div>

                <NavItem icon={<ShoppingBag size={20} />} label="Store" active={activePage === 'Store'} onClick={() => onNavigate('Store')} />
                <NavItem icon={<Users size={20} />} label="Friends" active={activePage === 'Friends'} badge="3" onClick={() => onNavigate('Friends')} />
                <NavItem icon={<Newspaper size={20} />} label="News" active={activePage === 'News'} onClick={() => onNavigate('News')} />
                <NavItem icon={<BarChart2 size={20} />} label="Analytics" active={activePage === 'Analytics'} onClick={() => onNavigate('Analytics')} />
                <NavItem icon={<Wrench size={20} />} label="Mods" active={activePage === 'Mods'} badge="New" onClick={() => onNavigate('Mods')} />
                <NavItem icon={<Settings size={20} />} label="Settings" active={activePage === 'Settings'} onClick={() => onNavigate('Settings')} />
            </div>

            <div className="mt-auto">
                {/* System Health removed to avoid duplication */}
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active = false, badge, onClick }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string, onClick?: () => void }) => (
    <div onClick={onClick} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 group relative ${active ? 'bg-gradient-to-r from-blue-500/20 to-transparent text-white border-l-2 border-blue-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
        <span className={`transition-colors ${active ? 'text-blue-400' : 'group-hover:text-blue-400'}`}>
            {icon}
        </span>
        <span className="font-medium text-sm">{label}</span>
        {badge && (
            <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-500 text-white' : 'bg-slate-700 text-gray-300 group-hover:bg-slate-600'}`}>
                {badge}
            </span>
        )}
        {active && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
        )}
    </div>
);

export default Sidebar;