import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Search, UserPlus, MessageCircle, Gamepad2, Filter, Clock, Trophy, X, ChevronDown, Check } from 'lucide-react';

type Profile = {
    id: string;
    username: string;
    avatar_url: string | null;
    status: 'online' | 'offline' | 'away' | 'playing';
    current_game: string | null;
    last_seen: string;
    games?: string[];
    skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    availability?: string[];
};

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'pro'] as const;
const SCHEDULE_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Night', 'Weekends'] as const;

const BuddyFinder: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [myProfile, setMyProfile] = useState<Profile | null>(null);
    const [friends, setFriends] = useState<Profile[]>([]);
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [filterGame, setFilterGame] = useState('');
    const [filterSkill, setFilterSkill] = useState<string>('');
    const [filterSchedule, setFilterSchedule] = useState<Set<string>>(new Set());
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

    // Derived game list from friends for the filter dropdown
    const allGames = useMemo(() => {
        const games = new Set<string>();
        friends.forEach(f => {
            if (f.current_game) games.add(f.current_game);
            f.games?.forEach(g => games.add(g));
        });
        return Array.from(games).sort();
    }, [friends]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchData(session.user.id);
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchData(session.user.id);
            else { setMyProfile(null); setFriends([]); }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!session) return;
        const channel = supabase
            .channel('buddy_finder')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                setFriends(prev => prev.map(f => f.id === payload.new.id ? { ...f, ...payload.new } : f));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [session, friends]);

    const fetchData = async (userId: string) => {
        setLoading(true);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (profile) setMyProfile(profile);

        const { data: allProfiles } = await supabase.from('profiles').select('*').neq('id', userId).limit(20);
        if (allProfiles) {
            const enriched: Profile[] = allProfiles.map(p => ({
                ...p,
                games: p.games || ['Valorant', 'CS2', 'Apex Legends'].slice(0, Math.floor(Math.random() * 3) + 1),
                skill_level: p.skill_level || SKILL_LEVELS[Math.floor(Math.random() * 4)],
                availability: p.availability || ['Evening', 'Night'].slice(0, Math.floor(Math.random() * 2) + 1),
            }));
            setFriends(enriched);
        }
        setLoading(false);
    };

    const updateStatus = async (status: Profile['status']) => {
        if (!session || !myProfile) return;
        const { error } = await supabase.from('profiles').update({ status, last_seen: new Date().toISOString() }).eq('id', session.user.id);
        if (!error) setMyProfile({ ...myProfile, status });
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        const { data } = await supabase.from('profiles').select('*').ilike('username', `%${searchQuery}%`).neq('id', session?.user.id).limit(5);
        if (data) setSearchResults(data);
        setSearching(false);
    };

    const handleSendRequest = (userId: string) => {
        setSentRequests(prev => new Set(prev).add(userId));
    };

    const toggleScheduleFilter = (s: string) => {
        setFilterSchedule(prev => {
            const next = new Set(prev);
            next.has(s) ? next.delete(s) : next.add(s);
            return next;
        });
    };

    const clearFilters = () => {
        setFilterGame('');
        setFilterSkill('');
        setFilterSchedule(new Set());
    };

    const hasFilters = filterGame || filterSkill || filterSchedule.size > 0;

    const filteredFriends = useMemo(() => {
        return friends.filter(f => {
            if (filterGame && !f.games?.includes(filterGame) && f.current_game !== filterGame) return false;
            if (filterSkill && f.skill_level !== filterSkill) return false;
            if (filterSchedule.size > 0 && !f.availability?.some(a => filterSchedule.has(a))) return false;
            return true;
        });
    }, [friends, filterGame, filterSkill, filterSchedule]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'playing': return 'bg-purple-500';
            case 'away': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const getSkillBadge = (level?: string) => {
        const colors: Record<string, string> = {
            beginner: 'bg-green-500/15 text-green-300 border-green-500/30',
            intermediate: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
            advanced: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
            pro: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
        };
        return level ? colors[level] || '' : '';
    };

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
                    <User size={48} className="text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Sign in to find buddies</h2>
                <p className="text-gray-400 max-w-md">
                    Connect with friends, see what they're playing, and join their games.
                    Head to Settings to create your account or sign in.
                </p>
            </div>
        );
    }

    if (loading) {
        return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-blue-500 rounded-full border-t-transparent" /></div>;
    }

    return (
        <div className="h-full flex flex-col bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black text-white tracking-tight">BUDDY FINDER</h2>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(myProfile?.status || 'offline')} shadow-[0_0_10px_currentColor]`} />
                        <select
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-xs text-white focus:outline-none"
                            value={myProfile?.status || 'offline'}
                            onChange={e => updateStatus(e.target.value as any)}
                        >
                            <option value="online">Online</option>
                            <option value="playing">Looking to Play</option>
                            <option value="away">Away</option>
                            <option value="offline">Invisible</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        {searching ? (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-gray-400 rounded-full border-t-transparent" />
                        ) : (
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        )}
                        <input
                            type="text"
                            placeholder="Find friends..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </form>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-4 rounded-xl border text-sm font-bold transition ${
                            showFilters || hasFilters
                                ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                                : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        <Filter size={14} />
                        Filters
                        {hasFilters && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mt-3 p-4 bg-black/30 rounded-xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter By</span>
                            {hasFilters && (
                                <button onClick={clearFilters} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                    <X size={10} /> Clear all
                                </button>
                            )}
                        </div>

                        {/* Game Filter */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Games in Common</label>
                            <select
                                value={filterGame}
                                onChange={e => setFilterGame(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                            >
                                <option value="">All Games</option>
                                {allGames.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        {/* Skill Level Filter */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Skill Level</label>
                            <div className="flex gap-1.5 mt-1">
                                {SKILL_LEVELS.map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setFilterSkill(filterSkill === level ? '' : level)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition border ${
                                            filterSkill === level
                                                ? getSkillBadge(level)
                                                : 'bg-white/5 text-gray-500 border-transparent hover:text-white'
                                        }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Schedule Filter */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Availability</label>
                            <div className="flex gap-1.5 mt-1 flex-wrap">
                                {SCHEDULE_OPTIONS.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => toggleScheduleFilter(s)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
                                            filterSchedule.has(s)
                                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                                : 'bg-white/5 text-gray-500 border-transparent hover:text-white'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Search Results</h3>
                        {searchResults.map(user => (
                            <UserCard key={user.id} user={user} isFriend={false} onMatch={handleSendRequest} matched={sentRequests.has(user.id)} />
                        ))}
                        <div className="w-full h-px bg-white/5 my-4" />
                    </div>
                )}

                {/* Online Friends */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                        Online — {filteredFriends.filter(f => f.status !== 'offline').length}
                        {hasFilters && <span className="text-gray-600 normal-case font-normal ml-1">(filtered)</span>}
                    </h3>
                    {filteredFriends.filter(f => f.status !== 'offline').length === 0 ? (
                        <p className="text-sm text-gray-500 px-2 italic">No matches online.</p>
                    ) : (
                        filteredFriends.filter(f => f.status !== 'offline').map(friend => (
                            <UserCard key={friend.id} user={friend} isFriend={true} onMatch={handleSendRequest} matched={sentRequests.has(friend.id)} />
                        ))
                    )}
                </div>

                {/* Offline Friends */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                        Offline — {filteredFriends.filter(f => f.status === 'offline').length}
                    </h3>
                    {filteredFriends.filter(f => f.status === 'offline').map(friend => (
                        <UserCard key={friend.id} user={friend} isFriend={true} onMatch={handleSendRequest} matched={sentRequests.has(friend.id)} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const UserCard = ({ user, isFriend, onMatch, matched }: { user: Profile; isFriend: boolean; onMatch: (id: string) => void; matched: boolean }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'playing': return 'bg-purple-500';
            case 'away': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const skillColors: Record<string, string> = {
        beginner: 'text-green-400',
        intermediate: 'text-blue-400',
        advanced: 'text-purple-400',
        pro: 'text-yellow-400',
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                            user.username[0].toUpperCase()
                        )}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#121212] ${getStatusColor(user.status)}`} />
                </div>
                <div className="min-w-0">
                    <h4 className="text-white font-medium text-sm">{user.username}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                        {user.status === 'playing' && user.current_game ? (
                            <span className="text-xs text-purple-400 flex items-center gap-1">
                                <Gamepad2 size={10} /> {user.current_game}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400 capitalize">{user.status}</span>
                        )}
                        {user.skill_level && (
                            <span className={`text-[10px] font-bold capitalize ${skillColors[user.skill_level] || 'text-gray-400'}`}>
                                <Trophy size={9} className="inline mr-0.5" />{user.skill_level}
                            </span>
                        )}
                        {user.availability && user.availability.length > 0 && (
                            <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                                <Clock size={9} /> {user.availability.join(', ')}
                            </span>
                        )}
                    </div>
                    {user.games && user.games.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                            {user.games.slice(0, 3).map(g => (
                                <span key={g} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-gray-500">{g}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isFriend && !matched && (
                    <button
                        onClick={() => onMatch(user.id)}
                        className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                        title="Add Friend"
                    >
                        <UserPlus size={16} />
                    </button>
                )}
                {matched && (
                    <span className="flex items-center gap-1 px-2 py-1 text-green-400 text-xs font-bold">
                        <Check size={12} /> Sent
                    </span>
                )}
                <button
                    onClick={() => onMatch(user.id)}
                    className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
                    title="Match — send friend request"
                >
                    <Gamepad2 size={16} />
                </button>
                <button className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-colors" title="Message">
                    <MessageCircle size={16} />
                </button>
            </div>
        </div>
    );
};

export default BuddyFinder;
