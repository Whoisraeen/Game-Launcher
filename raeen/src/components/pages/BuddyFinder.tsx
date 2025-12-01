import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Search, UserPlus, MessageCircle, Gamepad2 } from 'lucide-react';

type Profile = {
    id: string;
    username: string;
    avatar_url: string | null;
    status: 'online' | 'offline' | 'away' | 'playing';
    current_game: string | null;
    last_seen: string;
};

const BuddyFinder: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [myProfile, setMyProfile] = useState<Profile | null>(null);
    const [friends, setFriends] = useState<Profile[]>([]);
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchData(session.user.id);
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchData(session.user.id);
            else {
                setMyProfile(null);
                setFriends([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Real-time presence
    useEffect(() => {
        if (!session) return;

        const channel = supabase
            .channel('buddy_finder')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                // Update friend status if they are in the list
                setFriends(prev => prev.map(f => f.id === payload.new.id ? { ...f, ...payload.new } : f));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, friends]);

    const fetchData = async (userId: string) => {
        setLoading(true);
        
        // Fetch my profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (profile) setMyProfile(profile);

        // Fetch friends (simplified query - normally requires join table logic)
        // For now, we'll just fetch all profiles that are NOT me as "potential friends" 
        // In a real app, you'd query the 'friendships' table.
        
        /*
         const { data: friendIds } = await supabase
             .from('friendships')
             .select('friend_id')
             .eq('user_id', userId);
        */

        // Try to fetch random profiles to populate the list if empty
        const { data: allProfiles } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', userId)
            .limit(10);
            
        if (allProfiles) setFriends(allProfiles);

        setLoading(false);
    };

    const updateStatus = async (status: Profile['status']) => {
        if (!session || !myProfile) return;
        
        const { error } = await supabase
            .from('profiles')
            .update({ status, last_seen: new Date().toISOString() })
            .eq('id', session.user.id);
            
        if (!error) {
            setMyProfile({ ...myProfile, status });
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setSearching(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${searchQuery}%`)
            .neq('id', session?.user.id)
            .limit(5);
            
        if (data) setSearchResults(data);
        setSearching(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'playing': return 'bg-purple-500';
            case 'away': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
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
        return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-blue-500 rounded-full border-t-transparent"></div></div>;
    }

    return (
        <div className="h-full flex flex-col bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
            {/* Header / My Status */}
            <div className="p-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-white tracking-tight">BUDDY FINDER</h2>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(myProfile?.status || 'offline')} shadow-[0_0_10px_currentColor]`}></div>
                        <select 
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-xs text-white focus:outline-none"
                            value={myProfile?.status || 'offline'}
                            onChange={(e) => updateStatus(e.target.value as any)}
                        >
                            <option value="online">Online</option>
                            <option value="playing">Looking to Play</option>
                            <option value="away">Away</option>
                            <option value="offline">Invisible</option>
                        </select>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="relative">
                    {searching ? (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-gray-400 rounded-full border-t-transparent"></div>
                    ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    )}
                    <input
                        type="text"
                        placeholder="Find friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </form>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Search Results</h3>
                        {searchResults.map(user => (
                            <UserCard key={user.id} user={user} isFriend={false} />
                        ))}
                        <div className="w-full h-px bg-white/5 my-4"></div>
                    </div>
                )}

                {/* Online Friends */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                        Online — {friends.filter(f => f.status !== 'offline').length}
                    </h3>
                    {friends.filter(f => f.status !== 'offline').length === 0 ? (
                        <p className="text-sm text-gray-500 px-2 italic">No friends online.</p>
                    ) : (
                        friends.filter(f => f.status !== 'offline').map(friend => (
                            <UserCard key={friend.id} user={friend} isFriend={true} />
                        ))
                    )}
                </div>

                {/* Offline Friends */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                        Offline — {friends.filter(f => f.status === 'offline').length}
                    </h3>
                    {friends.filter(f => f.status === 'offline').map(friend => (
                        <UserCard key={friend.id} user={friend} isFriend={true} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const UserCard = ({ user, isFriend }: { user: Profile, isFriend: boolean }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'playing': return 'bg-purple-500';
            case 'away': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                            user.username[0].toUpperCase()
                        )}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#121212] ${getStatusColor(user.status)}`}></div>
                </div>
                <div>
                    <h4 className="text-white font-medium text-sm">{user.username}</h4>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                        {user.status === 'playing' && user.current_game ? (
                            <span className="text-purple-400 flex items-center gap-1">
                                <Gamepad2 size={10} /> Playing {user.current_game}
                            </span>
                        ) : (
                            <span className="capitalize">{user.status}</span>
                        )}
                    </p>
                </div>
            </div>
            
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isFriend && (
                    <button className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="Add Friend">
                        <UserPlus size={16} />
                    </button>
                )}
                <button className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-colors" title="Message">
                    <MessageCircle size={16} />
                </button>
            </div>
        </div>
    );
};

export default BuddyFinder;
