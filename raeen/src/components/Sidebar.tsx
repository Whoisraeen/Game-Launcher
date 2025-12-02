import React, { useEffect, useState } from 'react';
import {
    LayoutGrid,
    ShoppingBag,
    Users,
    Newspaper,
    BarChart2,
    Settings as SettingsIcon,
    Folder,
    Plus,
    Trash2,
    Heart,
    Trophy,
    Wrench,
    BrainCircuit,
    Download,
    Video,
    Cpu,
    AlertTriangle,
    Sparkles,
    MessagesSquare,
    Camera,
    Package
} from 'lucide-react';

import { useSettingsStore } from '../stores/settingsStore';
import { useGameStore } from '../stores/gameStore';
import DecisionHelperModal from './DecisionHelperModal';

interface SidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
    const { settings } = useSettingsStore();
    const { launchGame, collections, loadCollections, createCollection, deleteCollection, addGameToCollection, selectedCollectionId, setSelectedCollectionId } = useGameStore();
    const [showDecisionHelper, setShowDecisionHelper] = useState(false);

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
        <>
            <div className="glass-frosted w-72 h-full flex flex-col p-4 gap-6 z-20 relative border-r border-white/5">
                {/* User Profile */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 shadow-xl hover:bg-white/10 transition-colors cursor-pointer group">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-br from-blue-500 to-purple-600 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-shadow">
                            <img
                                src={settings?.account.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"}
                                alt="User"
                                className="w-full h-full rounded-full bg-slate-900 object-cover"
                            />
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-sm ${settings?.account.status === 'online' ? 'bg-green-500' :
                            settings?.account.status === 'playing' ? 'bg-purple-500' :
                                settings?.account.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                            }`}></div>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-white truncate tracking-tight group-hover:text-blue-200 transition-colors">{settings?.account.username || "Guest"}</span>
                        <span className="text-[10px] font-medium text-green-400 truncate flex items-center gap-1.5 uppercase tracking-wider">
                            <div className={`w-1.5 h-1.5 rounded-full ${settings?.account.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                            {settings?.account.status === 'playing' ? 'Playing...' :
                                settings?.account.status === 'online' ? 'Online' :
                                    settings?.account.status === 'away' ? 'Away' : 'Offline'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                    <NavItem
                        icon={<LayoutGrid size={20} />}
                        label="All Games"
                        active={activePage === 'Library' && selectedCollectionId === null}
                        onClick={handleLibraryClick}
                    />
                    <NavItem
                        icon={<Folder size={20} />}
                        label="Collections"
                        active={activePage === 'Collections'}
                        onClick={() => onNavigate('Collections')}
                    />

                    {/* Collections Section */}
                    <div className="pt-4 pb-2">
                        <div className="flex items-center justify-between px-3 mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Access</span>
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

                    {/* Smart Features */}
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 mt-2">Smart Tools</div>
                    <button
                        onClick={() => setShowDecisionHelper(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 transition-all duration-200 group hover:translate-x-1"
                    >
                        <Sparkles size={20} />
                        <span>Decision Helper</span>
                    </button>

                    <div className="h-px bg-white/5 my-2 mx-3"></div>

                    <NavItem icon={<ShoppingBag size={20} />} label="Store" active={activePage === 'Store'} onClick={() => onNavigate('Store')} />
                    <NavItem icon={<Heart size={20} />} label="Wishlist" active={activePage === 'Wishlist'} onClick={() => onNavigate('Wishlist')} />
                    <NavItem icon={<Users size={20} />} label="Friends" active={activePage === 'Friends'} badge="3" onClick={() => onNavigate('Friends')} />
                    <NavItem icon={<MessagesSquare size={20} />} label="Social Hub" active={activePage === 'SocialHub'} onClick={() => onNavigate('SocialHub')} />
                    <NavItem icon={<LayoutGrid size={20} />} label="Widgets" active={activePage === 'Widgets'} onClick={() => onNavigate('Widgets')} />
                    <NavItem icon={<BrainCircuit size={20} />} label="Smart Dash" active={activePage === 'SmartDashboard'} onClick={() => onNavigate('SmartDashboard')} />
                    <NavItem icon={<Newspaper size={20} />} label="News" active={activePage === 'News'} onClick={() => onNavigate('News')} />
                    <NavItem icon={<BarChart2 size={20} />} label="Analytics" active={activePage === 'Analytics'} onClick={() => onNavigate('Analytics')} />
                    <NavItem icon={<Trophy size={20} />} label="Achievements" active={activePage === 'Achievements'} onClick={() => onNavigate('Achievements')} />
                    <NavItem icon={<Wrench size={20} />} label="Mods" active={activePage === 'Mods'} badge="New" onClick={() => onNavigate('Mods')} />
                    <NavItem icon={<Package size={20} />} label="DLC Manager" active={activePage === 'DLCManager'} onClick={() => onNavigate('DLCManager')} />
                    <NavItem icon={<Camera size={20} />} label="Screenshots" active={activePage === 'Screenshots'} onClick={() => onNavigate('Screenshots')} />
                    <NavItem icon={<Video size={20} />} label="Studio" active={activePage === 'Studio'} onClick={() => onNavigate('Studio')} />
                    <NavItem icon={<Cpu size={20} />} label="Hardware" active={activePage === 'HardwareLab'} onClick={() => onNavigate('HardwareLab')} />
                    <NavItem icon={<AlertTriangle size={20} />} label="Fix Issues" active={activePage === 'Troubleshooter'} onClick={() => onNavigate('Troubleshooter')} />
                    <NavItem icon={<Download size={20} />} label="Save Manager" active={activePage === 'SaveManager'} onClick={() => onNavigate('SaveManager')} />
                    <NavItem icon={<SettingsIcon size={20} />} label="Settings" active={activePage === 'Settings'} onClick={() => onNavigate('Settings')} />
                </div>
            </div>

            {/* Modals */}
            {showDecisionHelper && (
                <DecisionHelperModal 
                    onClose={() => setShowDecisionHelper(false)} 
                    onLaunch={(id) => { launchGame(id); setShowDecisionHelper(false); }}
                />
            )}
        </>
    );
};

const NavItem = ({ icon, label, active, onClick, badge }: any) => (
    <div
        onClick={onClick}
        className={`
            group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden
            ${active 
                ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white shadow-[inset_0_0_20px_rgba(59,130,246,0.1)] border border-white/10' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1'}
        `}
    >
        {/* Active Indicator Line */}
        {active && (
            <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
        )}

        <span className={`transition-colors duration-300 relative z-10 ${active ? 'text-blue-400' : 'group-hover:text-blue-400'}`}>
            {React.cloneElement(icon, { 
                size: 18, 
                className: active ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "" 
            })}
        </span>
        
        <span className="font-medium text-sm flex-1 truncate relative z-10">{label}</span>
        
        {badge && (
            <span className={`
                text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm relative z-10
                ${active ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 group-hover:bg-white/20'}
            `}>
                {badge}
            </span>
        )}
        
        {/* Hover Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
);

export default Sidebar;