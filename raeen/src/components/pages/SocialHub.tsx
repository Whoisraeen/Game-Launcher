import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Swords, MessageCircle, Hash, Twitter, Play, Activity, Gamepad2, Clock } from 'lucide-react';
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

    const statCounts = useMemo(() => {
        const playingIds = new Set(events.filter(e => e.type === 'playing').map(e => e.friendId));
        const onlineOrPlaying = new Set(
            events.filter(e => e.type === 'playing' || e.type === 'online').map(e => e.friendId)
        );
        return {
            friendsOnline: onlineOrPlaying.size,
            inGame: playingIds.size,
            achievements: events.filter(e => e.type === 'achievement').length,
        };
    }, [events]);

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
                        <p className="text-2xl font-black text-white">{statCounts.friendsOnline}</p>
                        <p className="text-xs text-gray-400 font-medium">Friends Online</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Gamepad2 size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white">{statCounts.inGame}</p>
                        <p className="text-xs text-gray-400 font-medium">In Game</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Trophy size={20} className="text-yellow-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white">{statCounts.achievements}</p>
                        <p className="text-xs text-gray-400 font-medium">Recent Achievements</p>
                    </div>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-blue-400" /> Activity Feed
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                    Built from synced friends, launcher chat, and achievements tracked in your library — no demo personas.
                </p>

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

interface Tournament {
    id: string;
    name: string;
    game: string;
    players: string[];
    bracket: Match[][];
    createdAt: number;
}

interface Match {
    id: string;
    player1: string | null;
    player2: string | null;
    winner: string | null;
    round: number;
    position: number;
}

const TOURNAMENT_KEY = 'raeen.tournaments.v1';

const loadTournaments = (): Tournament[] => {
    try { return JSON.parse(localStorage.getItem(TOURNAMENT_KEY) || '[]'); } catch { return []; }
};

const saveTournaments = (t: Tournament[]) => {
    localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(t));
};

const generateBracket = (players: string[]): Match[][] => {
    let size = 2;
    while (size < players.length) size *= 2;

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    while (shuffled.length < size) shuffled.push('BYE');

    const rounds: Match[][] = [];
    const numRounds = Math.log2(size);

    const firstRound: Match[] = [];
    for (let i = 0; i < size / 2; i++) {
        firstRound.push({
            id: crypto.randomUUID(),
            player1: shuffled[i * 2],
            player2: shuffled[i * 2 + 1],
            winner: null,
            round: 0,
            position: i,
        });
    }

    // Auto-advance BYE matches
    for (const match of firstRound) {
        if (match.player1 === 'BYE') match.winner = match.player2;
        else if (match.player2 === 'BYE') match.winner = match.player1;
    }
    rounds.push(firstRound);

    for (let r = 1; r < numRounds; r++) {
        const prevRound = rounds[r - 1];
        const currentRound: Match[] = [];
        for (let i = 0; i < prevRound.length / 2; i++) {
            const p1 = prevRound[i * 2].winner;
            const p2 = prevRound[i * 2 + 1].winner;
            currentRound.push({
                id: crypto.randomUUID(),
                player1: p1,
                player2: p2,
                winner: null,
                round: r,
                position: i,
            });
        }
        rounds.push(currentRound);
    }

    return rounds;
};

const TournamentSection = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>(loadTournaments);
    const [creating, setCreating] = useState(false);
    const [viewing, setViewing] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formGame, setFormGame] = useState('');
    const [formPlayers, setFormPlayers] = useState('');

    const persistTournaments = (next: Tournament[]) => {
        setTournaments(next);
        saveTournaments(next);
    };

    const handleCreate = () => {
        const players = formPlayers.split('\n').map(p => p.trim()).filter(Boolean);
        if (!formName.trim() || !formGame.trim() || players.length < 2 || players.length > 16) return;

        const bracket = generateBracket(players);
        const tournament: Tournament = {
            id: crypto.randomUUID(),
            name: formName.trim(),
            game: formGame.trim(),
            players,
            bracket,
            createdAt: Date.now(),
        };
        persistTournaments([tournament, ...tournaments]);
        setCreating(false);
        setViewing(tournament.id);
        setFormName('');
        setFormGame('');
        setFormPlayers('');
    };

    const recordWinner = (tournamentId: string, matchId: string, winner: string) => {
        const next = tournaments.map(t => {
            if (t.id !== tournamentId) return t;
            const bracket = t.bracket.map((round, rIdx) =>
                round.map(match => {
                    if (match.id !== matchId) return match;
                    const updated = { ...match, winner };
                    // Advance winner to next round
                    if (rIdx < t.bracket.length - 1) {
                        const nextRound = t.bracket[rIdx + 1];
                        const nextMatchIdx = Math.floor(match.position / 2);
                        const nextMatch = nextRound[nextMatchIdx];
                        if (match.position % 2 === 0) {
                            nextMatch.player1 = winner;
                        } else {
                            nextMatch.player2 = winner;
                        }
                    }
                    return updated;
                })
            );
            return { ...t, bracket };
        });
        persistTournaments(next);
    };

    const activeTournament = viewing ? tournaments.find(t => t.id === viewing) : null;

    if (creating) {
        return (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="glass-panel p-6 rounded-2xl max-w-xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Trophy size={22} className="text-yellow-400" /> Create Tournament
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">Tournament Name</label>
                            <input
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="Friday Night Cup"
                                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">Game</label>
                            <input
                                value={formGame}
                                onChange={e => setFormGame(e.target.value)}
                                placeholder="Rocket League"
                                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">
                                Players (one per line, 2-16)
                            </label>
                            <textarea
                                value={formPlayers}
                                onChange={e => setFormPlayers(e.target.value)}
                                placeholder={"Player1\nPlayer2\nPlayer3\nPlayer4"}
                                rows={6}
                                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:outline-none resize-none font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {formPlayers.split('\n').filter(p => p.trim()).length} players entered
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleCreate}
                                disabled={!formName.trim() || !formGame.trim() || formPlayers.split('\n').filter(p => p.trim()).length < 2}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-colors"
                            >
                                Generate Bracket
                            </button>
                            <button
                                onClick={() => setCreating(false)}
                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-xl border border-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (activeTournament) {
        const roundNames = activeTournament.bracket.map((_, i, arr) => {
            if (i === arr.length - 1) return 'Final';
            if (i === arr.length - 2) return 'Semis';
            return `Round ${i + 1}`;
        });

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <button onClick={() => setViewing(null)} className="text-xs text-gray-500 hover:text-white transition-colors mb-1">← Back to tournaments</button>
                        <h2 className="text-2xl font-bold text-white">{activeTournament.name}</h2>
                        <p className="text-sm text-gray-400">{activeTournament.game} • {activeTournament.players.length} players</p>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <div className="flex gap-6 min-w-max p-2">
                        {activeTournament.bracket.map((round, rIdx) => (
                            <div key={rIdx} className="flex flex-col gap-2 min-w-[200px]">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center mb-2">
                                    {roundNames[rIdx]}
                                </h3>
                                <div className="flex flex-col justify-around flex-1 gap-3">
                                    {round.map(match => (
                                        <div key={match.id} className="glass-card p-3 rounded-xl border border-white/5">
                                            <MatchCard
                                                match={match}
                                                onSelectWinner={(winner) => recordWinner(activeTournament.id, match.id, winner)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    onClick={() => setCreating(true)}
                    className="glass-card p-6 flex flex-col items-center justify-center text-center gap-4 border-dashed border-2 border-white/10 hover:border-white/30 transition-colors cursor-pointer group"
                >
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Trophy size={32} className="text-yellow-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Create Tournament</h3>
                        <p className="text-sm text-gray-400">Host a new bracket for your friends</p>
                    </div>
                </div>

                {tournaments.map(t => {
                    const totalMatches = t.bracket.flat().filter(m => m.player1 !== 'BYE' && m.player2 !== 'BYE').length;
                    const completed = t.bracket.flat().filter(m => m.winner && m.player1 !== 'BYE' && m.player2 !== 'BYE').length;
                    const champion = t.bracket[t.bracket.length - 1]?.[0]?.winner;

                    return (
                        <div key={t.id} onClick={() => setViewing(t.id)} className="glass-card p-0 overflow-hidden group cursor-pointer">
                            <div className="h-28 bg-gradient-to-br from-indigo-900 to-slate-900 relative">
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                <div className="absolute bottom-3 left-4">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase bg-black/50 px-2 py-0.5 rounded">{t.game}</span>
                                    <h3 className="text-lg font-bold text-white mt-1">{t.name}</h3>
                                </div>
                                {champion && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                                        <Trophy size={10} className="text-yellow-400" />
                                        <span className="text-[10px] font-bold text-yellow-300">{champion}</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
                                    <div className="flex items-center gap-2">
                                        <Users size={14} /> {t.players.length} Players
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Swords size={14} /> {completed}/{totalMatches}
                                    </div>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${totalMatches > 0 ? (completed / totalMatches) * 100 : 0}%` }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {tournaments.length === 0 && (
                <div className="glass-panel p-8 text-center">
                    <Trophy size={48} className="mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400 font-medium">No tournaments yet</p>
                    <p className="text-sm text-gray-500 mt-1">Create your first bracket above</p>
                </div>
            )}
        </div>
    );
};

const MatchCard: React.FC<{ match: Match; onSelectWinner: (winner: string) => void }> = ({ match, onSelectWinner }) => {
    const isBye = match.player1 === 'BYE' || match.player2 === 'BYE';
    const canSelect = match.player1 && match.player2 && !match.winner && !isBye;

    return (
        <div className="space-y-1.5">
            <PlayerSlot
                name={match.player1}
                isWinner={match.winner === match.player1}
                isLoser={!!match.winner && match.winner !== match.player1}
                canClick={!!canSelect}
                onClick={() => canSelect && match.player1 && onSelectWinner(match.player1)}
            />
            <div className="text-center text-[9px] font-bold text-gray-600 uppercase">vs</div>
            <PlayerSlot
                name={match.player2}
                isWinner={match.winner === match.player2}
                isLoser={!!match.winner && match.winner !== match.player2}
                canClick={!!canSelect}
                onClick={() => canSelect && match.player2 && onSelectWinner(match.player2)}
            />
        </div>
    );
};

const PlayerSlot: React.FC<{ name: string | null; isWinner: boolean; isLoser: boolean; canClick: boolean; onClick: () => void }> = ({ name, isWinner, isLoser, canClick, onClick }) => (
    <button
        onClick={onClick}
        disabled={!canClick}
        className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all truncate ${
            isWinner ? 'bg-green-500/20 border border-green-500/40 text-green-300' :
            isLoser ? 'bg-white/[0.02] border border-white/5 text-gray-600 line-through' :
            name === 'BYE' ? 'bg-white/[0.01] border border-white/5 text-gray-700 italic' :
            canClick ? 'bg-white/[0.04] border border-white/10 text-white hover:bg-white/[0.08] hover:border-blue-500/30 cursor-pointer' :
            'bg-white/[0.03] border border-white/5 text-gray-400'
        }`}
    >
        {isWinner && <span className="mr-1">👑</span>}
        {name || 'TBD'}
    </button>
);

export default SocialHub;
