import React, { useEffect, useMemo, useState } from 'react';
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
    Package,
    ListTodo,
    Target,
    Calendar,
    Zap,
    HardDrive,
    MonitorSmartphone,
    Crosshair,
    HeartPulse,
    Search,
    ChevronDown,
    Clock,
    Timer,
    Keyboard,
    Volume2,
    Wifi,
    Gamepad2,
    CalendarDays,
    Eye,
    Tv2,
    MessageSquare,
    Image,
    Palette,
    Crown,
    Shield,
    Monitor,
    UserSearch,
} from 'lucide-react';

const RECENT_KEY = 'raeen.recentPages.v1';

import { useSettingsStore } from '../stores/settingsStore';
import { useGameStore } from '../stores/gameStore';
import { useFriendStore } from '../stores/friendStore';
import DecisionHelperModal from './DecisionHelperModal';

interface SidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

interface NavSection {
    id: string;
    title: string;
    items: Array<{ key: string; label: string; icon: React.ReactNode; badge?: string }>;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
    const { settings } = useSettingsStore();
    const {
        launchGame, collections, loadCollections, createCollection, deleteCollection,
        addGameToCollection, selectedCollectionId, setSelectedCollectionId,
    } = useGameStore();
    const { friends, loadFriends } = useFriendStore();
    const [showDecisionHelper, setShowDecisionHelper] = useState(false);
    const [search, setSearch] = useState('');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [recents, setRecents] = useState<string[]>([]);

    useEffect(() => {
        loadCollections();
        loadFriends();
        const load = () => {
            try {
                const raw = localStorage.getItem(RECENT_KEY);
                setRecents(raw ? JSON.parse(raw) : []);
            } catch { setRecents([]); }
        };
        load();
        const onUpdate = () => load();
        window.addEventListener('raeen:recent-updated', onUpdate);
        const dh = () => setShowDecisionHelper(true);
        window.addEventListener('open-decision-helper', dh);
        const removeFriendsUpdate = window.ipcRenderer.on('friends:update', () => {
            loadFriends();
        });
        return () => {
            window.removeEventListener('raeen:recent-updated', onUpdate);
            window.removeEventListener('open-decision-helper', dh);
            removeFriendsUpdate();
        };
    }, [loadCollections, loadFriends]);

    const baseSections: NavSection[] = useMemo(() => ([
        {
            id: 'library', title: 'Library', items: [
                { key: 'Wishlist',     label: 'Wishlist',     icon: <Heart size={18} /> },
                { key: 'Store',        label: 'Store',        icon: <ShoppingBag size={18} /> },
                { key: 'Backlog',      label: 'Backlog',      icon: <ListTodo size={18} /> },
                { key: 'Goals',        label: 'Goals',        icon: <Target size={18} /> },
                { key: 'Rotation',     label: 'Rotation',     icon: <Calendar size={18} /> },
                { key: 'SessionPlanner', label: 'Planner',   icon: <Clock size={18} /> },
                { key: 'Calendar',      label: 'Calendar',    icon: <CalendarDays size={18} /> },
            ],
        },
        {
            id: 'social', title: 'Social', items: [
                { key: 'Friends',      label: 'Friends',       icon: <Users size={18} /> },
                { key: 'SocialHub',    label: 'Social Hub',    icon: <MessagesSquare size={18} /> },
                { key: 'BuddyFinder',  label: 'Buddy Finder',  icon: <UserSearch size={18} /> },
                { key: 'ClanManager',  label: 'Clans',          icon: <Shield size={18} /> },
                { key: 'Reviews',      label: 'Reviews',        icon: <Sparkles size={18} /> },
                { key: 'News',         label: 'News',           icon: <Newspaper size={18} /> },
            ],
        },
        {
            id: 'insights', title: 'Insights', items: [
                { key: 'Analytics',     label: 'Analytics',     icon: <BarChart2 size={18} /> },
                { key: 'Achievements',  label: 'Achievements',  icon: <Trophy size={18} /> },
                { key: 'SmartDashboard',label: 'Smart Dash',    icon: <BrainCircuit size={18} /> },
                { key: 'Widgets',       label: 'Widgets',       icon: <LayoutGrid size={18} /> },
            ],
        },
        {
            id: 'content', title: 'Content', items: [
                { key: 'Mods',             label: 'Mods',           icon: <Wrench size={18} />, badge: 'New' },
                { key: 'DLCManager',       label: 'DLC Manager',    icon: <Package size={18} /> },
                { key: 'Screenshots',      label: 'Screenshots',    icon: <Camera size={18} /> },
                { key: 'Studio',           label: 'Studio',         icon: <Video size={18} /> },
                { key: 'SaveManager',      label: 'Save Manager',   icon: <Download size={18} /> },
                { key: 'ThumbnailCreator', label: 'Thumbnails',     icon: <Image size={18} /> },
            ],
        },
        {
            id: 'streaming', title: 'Streaming', items: [
                { key: 'StreamSchedule',  label: 'Schedule',       icon: <CalendarDays size={18} /> },
                { key: 'ChatOverlay',     label: 'Chat Overlay',   icon: <MessageSquare size={18} /> },
                { key: 'StreamOverlays',  label: 'Overlays',       icon: <Tv2 size={18} /> },
            ],
        },
        {
            id: 'gaming', title: 'Gaming Tools', items: [
                { key: 'AimTrainer',    label: 'Aim Trainer',   icon: <Zap size={18} /> },
                { key: 'ReactionTest',  label: 'Reaction Test', icon: <Timer size={18} /> },
                { key: 'Crosshair',     label: 'Crosshair',     icon: <Crosshair size={18} /> },
                { key: 'FOVCalculator', label: 'FOV Calc',      icon: <Eye size={18} /> },
                { key: 'InputLagTest',  label: 'Input Lag',     icon: <Gamepad2 size={18} /> },
                { key: 'Wellness',      label: 'Wellness',      icon: <HeartPulse size={18} /> },
            ],
        },
        {
            id: 'customize', title: 'Customize', items: [
                { key: 'ThemeStore',   label: 'Themes',      icon: <Palette size={18} /> },
                { key: 'ProUpgrade',   label: 'Pro',         icon: <Crown size={18} />, badge: 'Pro' },
            ],
        },
        {
            id: 'system', title: 'System', items: [
                { key: 'HardwareLab',         label: 'Hardware',         icon: <Cpu size={18} /> },
                { key: 'MonitorCalibration',   label: 'Monitor Cal.',     icon: <Monitor size={18} /> },
                { key: 'AudioSwitcher',        label: 'Audio',            icon: <Volume2 size={18} /> },
                { key: 'NetworkOptimizer',     label: 'Network',          icon: <Wifi size={18} /> },
                { key: 'KeybindManager',       label: 'Keybinds',         icon: <Keyboard size={18} /> },
                { key: 'ShaderCache',          label: 'Shader Cache',     icon: <HardDrive size={18} /> },
                { key: 'Drivers',              label: 'Drivers',          icon: <MonitorSmartphone size={18} /> },
                { key: 'Troubleshooter',       label: 'Fix Issues',       icon: <AlertTriangle size={18} /> },
                { key: 'Settings',             label: 'Settings',         icon: <SettingsIcon size={18} /> },
            ],
        },
    ]), []);

    const friendsOnlineCount = useMemo(
        () => friends.filter(f => f.status !== 'offline').length,
        [friends]
    );

    const sections: NavSection[] = useMemo(
        () =>
            baseSections.map((s) => ({
                ...s,
                items: s.items.map((i) =>
                    i.key === 'Friends' && friendsOnlineCount > 0
                        ? { ...i, badge: String(friendsOnlineCount) }
                        : i
                ),
            })),
        [baseSections, friendsOnlineCount]
    );

    const filteredSections = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return sections;
        return sections
            .map(s => ({ ...s, items: s.items.filter(i => i.label.toLowerCase().includes(q)) }))
            .filter(s => s.items.length > 0);
    }, [sections, search]);

    const handleCreateCollection = async () => {
        const name = window.prompt('Enter collection name:');
        if (name) await createCollection(name);
    };
    const handleDrop = async (e: React.DragEvent, collectionId: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-500/30');
        const gameId = e.dataTransfer.getData('gameId');
        if (gameId) await addGameToCollection(collectionId, gameId);
    };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-500/30'); };
    const handleDragLeave = (e: React.DragEvent) => e.currentTarget.classList.remove('bg-blue-500/30');
    const handleDeleteCollection = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this collection?')) {
            if (selectedCollectionId === id) setSelectedCollectionId(null);
            await deleteCollection(id);
        }
    };
    const handleCollectionClick = (id: string) => { setSelectedCollectionId(id); onNavigate('Library'); };
    const handleLibraryClick = () => { setSelectedCollectionId(null); onNavigate('Library'); };
    const toggleSection = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <>
            <div className="glass-frosted w-72 h-full flex flex-col p-3 gap-4 z-20 relative border-r border-white/5 rounded-3xl">

                {/* User Profile */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-colors cursor-pointer group">
                    <div className="relative">
                        <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-blue-500 to-purple-600 group-hover:shadow-[0_0_18px_rgba(59,130,246,0.55)] transition-shadow">
                            <img
                                src={settings?.account.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'}
                                alt="User"
                                className="w-full h-full rounded-full bg-slate-900 object-cover"
                            />
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                            settings?.account.status === 'online' ? 'bg-green-500' :
                            settings?.account.status === 'playing' ? 'bg-purple-500' :
                            settings?.account.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}></div>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-white truncate tracking-tight group-hover:text-blue-200 transition-colors">
                            {settings?.account.username || 'Guest'}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400 truncate uppercase tracking-wider">
                            {settings?.account.status === 'playing' ? 'In game' :
                             settings?.account.status === 'online' ? 'Online' :
                             settings?.account.status === 'away' ? 'Away' : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search nav…"
                        className="w-full pl-9 pr-3 py-2 bg-black/25 border border-white/8 rounded-xl text-sm text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                {/* Smart Tools */}
                <button
                    onClick={() => setShowDecisionHelper(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/40 hover:to-blue-600/40 border border-white/10 hover:border-white/20 transition-all"
                >
                    <Sparkles size={16} className="text-yellow-300" />
                    <span>Decision Helper</span>
                </button>

                <div className="flex-1 overflow-y-auto custom-scrollbar -mr-1 pr-1 space-y-3">
                    {/* Recents */}
                    {!search && recents.length > 1 && (
                        <div>
                            <div className="flex items-center gap-1.5 px-3 mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                                <Clock size={10} /> Recent
                            </div>
                            <div className="flex flex-wrap gap-1 px-2">
                                {recents.slice(0, 5).filter(p => p !== activePage).slice(0, 4).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => onNavigate(page)}
                                        className="text-[11px] px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/5 hover:border-white/15 transition truncate max-w-[90px]"
                                        title={page}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Games + Collections (always pinned) */}
                    {!search && (
                        <div className="space-y-1">
                            <NavItem
                                icon={<LayoutGrid size={18} />}
                                label="All Games"
                                active={activePage === 'Library' && selectedCollectionId === null}
                                onClick={handleLibraryClick}
                            />
                            <NavItem
                                icon={<Folder size={18} />}
                                label="Collections"
                                active={activePage === 'Collections'}
                                onClick={() => onNavigate('Collections')}
                            />
                            {collections.length > 0 && (
                                <div className="pl-2 pt-1 pb-1 space-y-0.5">
                                    {collections.map(collection => (
                                        <div
                                            key={collection.id}
                                            onClick={() => handleCollectionClick(collection.id)}
                                            onDrop={(e) => handleDrop(e, collection.id)}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 group relative ${
                                                activePage === 'Library' && selectedCollectionId === collection.id
                                                    ? 'bg-white/5 text-white'
                                                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                                            }`}
                                        >
                                            <Folder size={14} className={activePage === 'Library' && selectedCollectionId === collection.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-blue-300'} />
                                            <span className="text-sm flex-1 truncate">{collection.name}</span>
                                            <span className="text-[10px] text-gray-500">{collection.gameIds.length}</span>
                                            <button
                                                onClick={(e) => handleDeleteCollection(e, collection.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={handleCreateCollection}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-white hover:bg-white/[0.04] transition"
                            >
                                <Plus size={12} /> New collection
                            </button>
                        </div>
                    )}

                    {filteredSections.map(section => {
                        const isCollapsed = collapsed[section.id];
                        return (
                            <div key={section.id}>
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="flex items-center gap-1.5 w-full px-3 mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] hover:text-gray-300 transition-colors"
                                >
                                    <ChevronDown size={10} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                    {section.title}
                                </button>
                                {!isCollapsed && (
                                    <div className="space-y-0.5">
                                        {section.items.map(item => (
                                            <NavItem
                                                key={item.key}
                                                icon={item.icon}
                                                label={item.label}
                                                badge={item.badge}
                                                active={activePage === item.key}
                                                onClick={() => onNavigate(item.key)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredSections.length === 0 && search && (
                        <p className="text-center text-xs text-gray-500 py-6">No results.</p>
                    )}
                </div>
            </div>

            {showDecisionHelper && (
                <DecisionHelperModal
                    onClose={() => setShowDecisionHelper(false)}
                    onLaunch={(id) => { launchGame(id); setShowDecisionHelper(false); }}
                />
            )}
        </>
    );
};

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
    badge?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, badge }) => (
    <div
        onClick={onClick}
        className={`group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 relative
            ${active
                ? 'bg-gradient-to-r from-blue-600/25 via-purple-600/15 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'}`}
    >
        {active && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
        )}
        <span className={`relative z-10 transition-colors ${active ? 'text-blue-300' : 'group-hover:text-blue-300'}`}>
            {React.cloneElement(icon as React.ReactElement, {
                size: 18,
                className: active ? 'drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]' : '',
            })}
        </span>
        <span className="font-medium text-[13px] flex-1 truncate relative z-10 tracking-tight">{label}</span>
        {badge && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md relative z-10 uppercase tracking-wider ${
                active ? 'bg-blue-500/90 text-white' : 'bg-white/8 text-gray-300 group-hover:bg-white/15'
            }`}>
                {badge}
            </span>
        )}
    </div>
);

export default Sidebar;
