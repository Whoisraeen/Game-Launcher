import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Swords, MessageCircle, Hash, Twitter, Play, Activity, Gamepad2, Clock } from 'lucide-react';
import BuddyFinder from './BuddyFinder';

interface ActivityEvent {
    id: string;
    type: 'playing' | 'online' | 'offline' | 'achievement' | 'message';
    friendId: string;
    friendName: string;
    friendAvatar: string;
    platform: string;
    detail: string | null;
    timestamp: string;
}

const SocialHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'activity' | 'tournaments' | 'buddy-finder' | 'web-chat'>('activity');

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden p-6 gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md">SOCIAL HUB</h1>
                <div className="flex bg-black/20 p-1 rounded-lg backdrop-blur-md border border-white/5">
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'activity' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Activity Feed
                    </button>
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
                    <button
                        onClick={() => setActiveTab('web-chat')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'web-chat' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Web Chat
                    </button>
                </div>
            </div>

            {activeTab === 'activity' && <ActivityFeedSection />}
            {activeTab === 'tournaments' && <TournamentSection />}
            {activeTab === 'buddy-finder' && <BuddyFinder />}
            {activeTab === 'web-chat' && <WebChatSection />}
        </div>
    );
};

const ActivityFeedSection: React.FC = () => {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadActivity = async () => {
        try {
            const result = await window.ipcRenderer.invoke('friends:getActivity');
            setEvents(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error('Failed to load activity:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadActivity();
        const interval = setInterval(loadActivity, 15000);

        const handler = () => { loadActivity(); };
        window.ipcRenderer.on('friends:update', handler);

        return () => {
            clearInterval(interval);
            window.ipcRenderer.off('friends:update', handler);
        };
    }, []);

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'playing': return <Gamepad2 size={16} className="text-purple-400" />;
            case 'online': return <Activity size={16} className="text-green-400" />;
            case 'achievement': return <Trophy size={16} className="text-yellow-400" />;
            case 'message': return <MessageCircle size={16} className="text-blue-400" />;
            default: return <Activity size={16} className="text-gray-400" />;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'playing': return 'border-l-purple-500';
            case 'online': return 'border-l-green-500';
            case 'achievement': return 'border-l-yellow-500';
            case 'message': return 'border-l-blue-500';
            default: return 'border-l-gray-500';
        }
    };

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Loading activity feed...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Users size={20} className="text-green-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white">{events.filter(e => e.type === 'online' || e.type === 'playing').length}</p>
                        <p className="text-xs text-gray-400 font-medium">Friends Online</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Gamepad2 size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white">{events.filter(e => e.type === 'playing').length}</p>
                        <p className="text-xs text-gray-400 font-medium">In Game</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Trophy size={20} className="text-yellow-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white">{events.filter(e => e.type === 'achievement').length}</p>
                        <p className="text-xs text-gray-400 font-medium">Recent Achievements</p>
                    </div>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-blue-400" /> Live Activity Feed
                </h2>

                {events.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        <Activity size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-medium">No recent activity</p>
                        <p className="text-sm mt-1">Activity from friends will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {events.map(event => (
                            <div
                                key={event.id}
                                className={`flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border-l-2 ${getEventColor(event.type)} hover:bg-white/[0.06] transition-colors`}
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    {event.friendAvatar ? (
                                        <img
                                            src={event.friendAvatar}
                                            alt={event.friendName}
                                            className="w-10 h-10 rounded-full bg-slate-700"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                            <Users size={18} className="text-gray-400" />
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
                                        {getEventIcon(event.type)}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">{event.friendName}</span>
                                        {event.platform && event.platform !== 'raeen' && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 uppercase">{event.platform}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">
                                        {event.type === 'playing' && <>Playing <span className="text-purple-300 font-medium">{event.detail}</span></>}
                                        {event.type === 'online' && 'Came online'}
                                        {event.type === 'achievement' && <span className="text-yellow-300">{event.detail}</span>}
                                        {event.type === 'message' && <span className="italic">"{event.detail}"</span>}
                                    </p>
                                </div>

                                {/* Timestamp */}
                                <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500">
                                    <Clock size={12} />
                                    {formatTimestamp(event.timestamp)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const WebChatSection = () => {
    const [activeService, setActiveService] = useState('discord');
    const services = [
        { id: 'discord', name: 'Discord', url: 'https://discord.com/app', icon: <MessageCircle size={18} /> },
        { id: 'steam', name: 'Steam Chat', url: 'https://steamcommunity.com/chat', icon: <Users size={18} /> },
        { id: 'reddit', name: 'Reddit', url: 'https://reddit.com', icon: <Hash size={18} /> },
        { id: 'twitter', name: 'X (Twitter)', url: 'https://x.com', icon: <Twitter size={18} /> },
        { id: 'twitch', name: 'Twitch', url: 'https://twitch.tv', icon: <Play size={18} /> },
        { id: 'whatsapp', name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: <MessageCircle size={18} /> },
        { id: 'telegram', name: 'Telegram', url: 'https://web.telegram.org', icon: <MessageCircle size={18} /> },
        { id: 'instagram', name: 'Instagram', url: 'https://instagram.com', icon: <Users size={18} /> },
    ];
    
    return (
        <div className="flex-1 flex overflow-hidden glass-panel rounded-xl border border-white/10">
             <div className="w-48 bg-black/40 border-r border-white/10 flex flex-col pt-4 overflow-y-auto custom-scrollbar">
                {services.map(s => (
                    <button 
                        key={s.id}
                        onClick={() => setActiveService(s.id)}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors border-l-2 ${activeService === s.id ? 'bg-white/10 text-white border-blue-500' : 'text-gray-400 hover:bg-white/5 hover:text-white border-transparent'}`}
                    >
                        {s.icon}
                        <span className="font-medium text-sm">{s.name}</span>
                    </button>
                ))}
             </div>
             <div className="flex-1 relative bg-slate-900">
                {services.map(s => (
                    <div key={s.id} className={`absolute inset-0 ${activeService === s.id ? 'z-10' : 'z-0 opacity-0 pointer-events-none'}`}>
                        {/* @ts-ignore - webview is an Electron specific tag */}
                        <webview
                            src={s.url}
                            className="w-full h-full"
                            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            allowpopups={true}
                            partition="persist:social"
                        />
                    </div>
                ))}
             </div>
        </div>
    );
};

const TournamentSection = () => {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-4 border-dashed border-2 border-white/10 hover:border-white/30 transition-colors cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Trophy size={32} className="text-yellow-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Create Tournament</h3>
                        <p className="text-sm text-gray-400">Host a new bracket for your friends</p>
                    </div>
                </div>

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

export default SocialHub;
