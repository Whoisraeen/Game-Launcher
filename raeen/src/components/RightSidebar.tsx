import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, MessageCircle, Radio, Gauge, Sliders, Trophy, Cpu, Activity, Zap, Users, RefreshCw, PlayCircle } from 'lucide-react';
import { getPlatformName } from '../data/LauncherData';
import { useGameStore } from '../stores/gameStore';
import { SystemStats, Friend, RecentAchievement } from '../types';
import FriendChat from './FriendChat';

const RightSidebar: React.FC = () => {
    const { friends, achievements, games, loadFriends, loadAchievements, importSteamFriends, openExternal } = useGameStore();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [showFriendsMenu, setShowFriendsMenu] = useState(false);
    const [activeChatFriend, setActiveChatFriend] = useState<Friend | null>(null);

    useEffect(() => {
        loadFriends();
        loadAchievements();
        // Try to import automatically once on load
        importSteamFriends();
 
        // Listen for real-time friend updates
        const removeListener = window.ipcRenderer.on('friends:update', (newFriends: Friend[]) => {
            // We could update the store here, or just use a local state if we wanted to bypass the store.
            // But ideally, we should update the store. Since the store logic is inside a hook, 
            // we can't easily call store actions from outside without `useGameStore.getState()`.
            // For now, we'll just trigger a reload of the friends list in the store
            // or simpler: directly update the store state if we had a setter exposed,
            // but loadFriends fetches from backend anyway, so let's just use that if the event sends data.
            
            // Actually, the event sends the data. We should use it to avoid an extra fetch.
            // We can use the store's setState if we export it or access it via the hook, but here we are in the component.
            // A quick hack to update the UI instantly:
            if (Array.isArray(newFriends)) {
                useGameStore.setState({ friends: newFriends });
            } else {
                console.warn('Received invalid friends update payload:', newFriends);
            }
        }) as unknown as () => void;

        return () => {
            removeListener();
        };
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await window.ipcRenderer.invoke('system:stats');
                setStats(data);
            } catch (e) {
                console.error("Failed to fetch system stats", e);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="glass-panel w-72 h-full flex flex-col p-4 gap-6 z-20 relative">

            {/* Friends & Activity */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                <div className="relative">
                    <Section
                        title="Friends & Activity"
                        action={
                            <button
                                onClick={() => setShowFriendsMenu(!showFriendsMenu)}
                                className="hover:text-white transition-colors"
                            >
                                <MoreHorizontal size={16} />
                            </button>
                        }
                    >
                        <div className="flex justify-between items-center text-xs text-gray-400 mb-2 px-1">
                            <span>Cross-platform list</span>
                            <Plus size={14} className="cursor-pointer hover:text-white" />
                        </div>

                        <div className="space-y-3">
                            {friends.map((friend: Friend) => {
                                const isJoinable = !!(friend.status === 'playing' && friend.activity && games.find(g => g.title === friend.activity && g.status === 'installed'));
                                return (
                                    <FriendItem
                                        key={friend.id}
                                        friend={friend}
                                        isJoinable={isJoinable}
                                        onChat={() => setActiveChatFriend(friend)}
                                    />
                                );
                            })}
                        </div>
                    </Section>

                    {/* Friends Menu Dropdown */}
                    {showFriendsMenu && (
                        <div className="absolute top-8 right-0 bg-slate-800 border border-white/10 rounded-lg shadow-xl p-1 z-50 w-48 backdrop-blur-xl">
                            <button
                                onClick={() => { importSteamFriends(); setShowFriendsMenu(false); }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 rounded flex items-center gap-2"
                            >
                                <Users size={14} /> Import Steam Friends
                            </button>
                            <button
                                onClick={() => { loadFriends(); setShowFriendsMenu(false); }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 rounded flex items-center gap-2"
                            >
                                <RefreshCw size={14} /> Refresh List
                            </button>
                        </div>
                    )}
                </div>

                {/* Unified Achievements */}
                <Section title="Unified Achievements" action={<MoreHorizontal size={16} />}>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400">
                                <Trophy size={16} />
                            </div>
                            <div>
                                <span className="text-2xl font-bold text-white block leading-none">19,324</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Total Score</span>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-[75%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.4)]"></div>
                        </div>

                        <div className="space-y-3">
                            {achievements.map((achievement: RecentAchievement) => (
                                <AchievementItem
                                    key={achievement.id}
                                    game={achievement.gameTitle}
                                    title={achievement.achievementTitle}
                                    user={achievement.user}
                                    icon={achievement.icon}
                                />
                            ))}
                        </div>
                    </div>
                </Section>

                {/* System Health */}
                <Section title="System Health" action={<Gauge size={16} />}>
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5 space-y-3">
                        {/* CPU */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-1"><Cpu size={12} /> CPU</span>
                                <span>{stats?.cpu.temp || 0}°C</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${stats?.cpu.usage || 0}%` }} />
                            </div>
                        </div>

                        {/* RAM */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-1"><Activity size={12} /> RAM</span>
                                <span>{Math.round((stats?.memory.used || 0) / 1024 / 1024 / 1024)}GB</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${stats?.memory.percentage || 0}%` }} />
                            </div>
                        </div>

                        {/* GPU (First one) */}
                        {stats?.gpu && stats.gpu[0] && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Zap size={12} /> GPU</span>
                                    <span>{stats.gpu[0].temp || 0}°C</span>
                                </div>
                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${stats.gpu[0].usage || 0}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                </Section>
            </div>

            {/* Quick Launch */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 mt-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Launch</h3>
                    <MoreHorizontal size={14} className="text-gray-500" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <QuickLaunchItem
                        icon={<MessageCircle size={20} />}
                        label="Discord"
                        onClick={() => openExternal('https://discord.com/app')}
                    />
                    <QuickLaunchItem
                        icon={<Radio size={20} />}
                        label="OBS"
                        onClick={() => openExternal('obs://start')} // Requires OBS WebSocket or similar, fallback to website or just launch app if path known
                    />
                    <QuickLaunchItem
                        icon={<Gauge size={20} />}
                        label="Overlay"
                        onClick={() => { }} // Placeholder for internal overlay toggle
                    />
                    <QuickLaunchItem
                        icon={<Sliders size={20} />}
                        label="Mods"
                        onClick={() => openExternal('https://www.curseforge.com/')}
                    />
                </div>
            </div>

            {activeChatFriend && (
                <FriendChat
                    friend={activeChatFriend}
                    onClose={() => setActiveChatFriend(null)}
                />
            )}

        </div>
    );
};

const Section = ({ title, children, action }: { title: string, children: React.ReactNode, action?: React.ReactNode }) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
            {action && <div className="text-gray-500 cursor-pointer hover:text-white">{action}</div>}
        </div>
        <div className="space-y-1">
            {children}
        </div>
    </div>
);

const FriendItem = ({ friend, isJoinable, onChat }: { friend: Friend, isJoinable?: boolean, onChat: () => void }) => {
    const platformName = friend.platform ? getPlatformName(friend.platform) : 'Online';
    const gameText = friend.activity || (friend.lastSeen ? `Last seen ${friend.lastSeen}` : '');

    let statusColor = 'bg-gray-500';
    switch (friend.status) {
        case 'online': statusColor = 'bg-green-500'; break;
        case 'playing': statusColor = 'bg-purple-500'; break;
        case 'busy': statusColor = 'bg-red-500'; break;
        case 'away': statusColor = 'bg-yellow-500'; break;
        case 'offline': statusColor = 'bg-gray-500'; break;
        default: statusColor = 'bg-gray-500';
    }

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group relative" onClick={onChat}>
            <div className="relative">
                <img src={friend.avatar} alt={friend.username} className="w-9 h-9 rounded-full bg-slate-700 object-cover" />
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${statusColor}`}></div>
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white truncate">{friend.username} <span className="text-xs text-gray-500">({platformName})</span></span>
                </div>
                <span className={`text-xs truncate block transition-colors ${friend.status === 'playing' ? 'text-purple-400' : 'text-gray-400 group-hover:text-blue-400'}`}>
                    {gameText}
                </span>
            </div>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 rounded p-1 backdrop-blur-sm">
                {isJoinable && (
                    <button
                        className="p-1.5 hover:bg-white/10 rounded text-green-400 hover:text-green-300 transition-colors"
                        title={`Join ${friend.activity}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log(`Joining ${friend.username} in ${friend.activity}`);
                        }}
                    >
                        <PlayCircle size={14} />
                    </button>
                )}
                <button
                    className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                    title="Send Message"
                    onClick={(e) => {
                        e.stopPropagation();
                        onChat();
                    }}
                >
                    <MessageCircle size={14} />
                </button>
            </div>
        </div>
    );
};

const AchievementItem = ({ game, title, user, icon }: { game: string, title: string, user: string, icon: string }) => (
    <div className="flex items-center gap-3">
        <img src={icon} alt="Achievement" className="w-8 h-8 rounded bg-slate-700" />
        <div className="flex-1 overflow-hidden">
            <span className="text-xs font-medium text-white block truncate">{user} ({game})</span>
            <span className="text-[10px] text-gray-500 truncate">{title}</span>
        </div>
    </div>
);

const QuickLaunchItem = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => (
    <div onClick={onClick} className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group">
        <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center text-blue-400 group-hover:text-white group-hover:bg-blue-500 transition-all shadow-lg group-hover:shadow-blue-500/20">
            {icon}
        </div>
        <span className="text-[10px] text-gray-400 text-center leading-tight group-hover:text-white">{label}</span>
    </div>
);

export default RightSidebar;
