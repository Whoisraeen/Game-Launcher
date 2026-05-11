import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Search, MessageSquare, RefreshCw, Trash2, Download, Cloud, Activity, Send, UserPlus } from 'lucide-react';
import { useFriendStore } from '../../stores/friendStore';
import { Friend } from '../../types';

const Friends: React.FC = () => {
    const { friends, loadFriends, addFriend, removeFriend, importSteamFriends, syncFriends } = useFriendStore();
    const [filter, setFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFriendName, setNewFriendName] = useState('');
    const [newFriendPlatform, setNewFriendPlatform] = useState('steam');
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
    const selectedFriendIdRef = useRef<string | null>(null);
    const [activityPreview, setActivityPreview] = useState<any[]>([]);

    const loadActivityPreview = useCallback(async () => {
        try {
            const ev = await window.ipcRenderer.invoke('friends:getActivity');
            setActivityPreview(Array.isArray(ev) ? ev.slice(0, 14) : []);
        } catch {
            setActivityPreview([]);
        }
    }, []);

    useEffect(() => {
        selectedFriendIdRef.current = selectedFriendId;
    }, [selectedFriendId]);

    useEffect(() => {
        loadFriends();

        const removeMsgListener = window.ipcRenderer.on('friends:message', (_: any, data: any) => {
            const sid = selectedFriendIdRef.current;
            if (data.friendId !== sid || !data.message?.id) return;
            setMessages(prev => {
                if (prev.some(m => m.id === data.message.id)) return prev;
                return [...prev, data.message];
            });
            if (data.message.sender !== 'me' && sid) {
                window.ipcRenderer.invoke('friends:markRead', sid);
            }
        });

        const removeUpdateListener = window.ipcRenderer.on('friends:update', () => {
            loadFriends();
            loadActivityPreview();
        });

        loadActivityPreview();

        return () => {
            removeMsgListener();
            removeUpdateListener();
        };
    }, [loadFriends, loadActivityPreview]);

    const filteredFriends = useMemo<Friend[]>(() => {
        if (!filter) return friends;
        return friends.filter(f => f.username.toLowerCase().includes(filter.toLowerCase()));
    }, [friends, filter]);

    const onlineFriends = filteredFriends.filter(f => f.status !== 'offline');
    const offlineFriends = filteredFriends.filter(f => f.status === 'offline');

    const selectedFriend = friends.find(f => f.id === selectedFriendId);

    useEffect(() => {
        if (selectedFriendId) {
            loadMessages(selectedFriendId);
        }
    }, [selectedFriendId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadMessages = async (friendId: string) => {
        try {
            const msgs = await window.ipcRenderer.invoke('friends:getMessages', friendId);
            setMessages(msgs);
            await window.ipcRenderer.invoke('friends:markRead', friendId);
        } catch (error) {
            console.error('Failed to load messages', error);
        }
    };

    const sendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!selectedFriendId || !newMessage.trim()) return;

        try {
            const text = newMessage.trim();
            await window.ipcRenderer.invoke('friends:sendMessage', selectedFriendId, text);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message', error);
        }
    };

    const handleAddFriend = async () => {
        const name = newFriendName.trim();
        if (!name) return;
        await addFriend(name, newFriendPlatform);
        setNewFriendName('');
        setShowAddModal(false);
    };

    return (
        <div className="glass-panel flex-1 h-full flex overflow-hidden relative">
            {/* Sidebar List */}
            <div className="w-80 border-r border-white/5 flex flex-col bg-black/20">
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Friends</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={syncFriends}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                title="Sync presence from Steam Web API (needs API key & Steam ID in Settings)"
                            >
                                <Cloud size={18} />
                            </button>
                            <button
                                onClick={() => importSteamFriends()}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                title="Import friend names from Steam (local config)"
                            >
                                <Download size={18} />
                            </button>
                            <button
                                onClick={() => loadFriends()}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                title="Reload list from database"
                            >
                                <RefreshCw size={18} />
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                title="Add friend manually"
                            >
                                <UserPlus size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Filter friends..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Activity Feed Section */}
                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={12} /> Recent activity
                    </div>
                    <div className="px-4 pb-4 space-y-2">
                        {activityPreview.length === 0 ? (
                            <p className="text-xs text-gray-600 px-1">
                                Sync Steam presence (cloud icon) or chat — playing and online states come from your linked accounts, not simulated feeds.
                            </p>
                        ) : (
                            activityPreview.map((ev: any) => (
                                <div key={ev.id} className="bg-white/5 rounded-lg p-2 text-xs border border-white/5">
                                    <span className="font-bold text-white">{ev.friendName}</span>
                                    <span className="text-gray-400">
                                        {ev.type === 'playing' && ev.detail ? <> playing <span className="text-purple-400 font-bold">{ev.detail}</span></> : null}
                                        {ev.type === 'online' && <> came online</>}
                                        {ev.type === 'achievement' && <> — {ev.detail}</>}
                                        {ev.type === 'message' && <> messaged: "{ev.detail}"</>}
                                        {!['playing', 'online', 'achievement', 'message'].includes(ev.type) && <> — {ev.detail || ev.type}</>}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Online — {onlineFriends.length}</div>
                    {onlineFriends.map(friend => (
                        <FriendRow
                            key={friend.id}
                            friend={friend}
                            isSelected={selectedFriendId === friend.id}
                            onClick={() => setSelectedFriendId(friend.id)}
                            online
                        />
                    ))}

                    <div className="px-4 py-2 mt-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Offline — {offlineFriends.length}</div>
                    {offlineFriends.map(friend => (
                        <FriendRow
                            key={friend.id}
                            friend={friend}
                            isSelected={selectedFriendId === friend.id}
                            onClick={() => setSelectedFriendId(friend.id)}
                        />
                    ))}

                    {friends.length === 0 && (
                        <div className="px-6 py-8 text-center text-gray-500 space-y-3">
                            <p>No friends yet.</p>
                            <p className="text-sm text-gray-600">
                                Add someone with <span className="text-gray-400">+</span>, or use{' '}
                                <span className="text-gray-400">Import</span> for Steam names and{' '}
                                <span className="text-gray-400">Cloud</span> for live Steam presence (API key + Steam ID in Settings → Integrations).
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat / Activity Area */}
            <div className="flex-1 flex flex-col bg-slate-900/20 relative">
                {selectedFriend ? (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/5 backdrop-blur-md z-10">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <img
                                        src={selectedFriend.avatar}
                                        alt={selectedFriend.username}
                                        className={`w-10 h-10 rounded-full bg-slate-700 ${selectedFriend.status === 'offline' ? 'grayscale opacity-70' : ''}`}
                                    />
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${selectedFriend.status === 'online' ? 'bg-green-500' :
                                        selectedFriend.status === 'playing' ? 'bg-purple-500' :
                                            selectedFriend.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                                        }`}></div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{selectedFriend.username}</h3>
                                    <p className="text-xs text-gray-400">
                                        {selectedFriend.status === 'playing' ? `Playing ${selectedFriend.activity}` :
                                            selectedFriend.status === 'online' ? 'Online' :
                                                `Last seen ${selectedFriend.lastSeen}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (confirm(`Remove ${selectedFriend.username} from friends?`)) {
                                            removeFriend(selectedFriend.id);
                                            setSelectedFriendId(null);
                                        }
                                    }}
                                    className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-full transition-colors"
                                    title="Remove Friend"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-900/50">
                             {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                    <MessageSquare size={48} className="mb-4" />
                                    <p>Start a conversation with {selectedFriend.username}</p>
                                </div>
                             )}
                             
                             {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                                        msg.sender === 'me' 
                                            ? 'bg-blue-600 text-white rounded-tr-none' 
                                            : 'bg-slate-700 text-gray-200 rounded-tl-none'
                                    }`}>
                                        <p>{msg.content}</p>
                                        <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-blue-200' : 'text-gray-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                             ))}
                             <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={sendMessage} className="p-4 bg-black/20 border-t border-white/5 backdrop-blur-md">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Message ${selectedFriend.username}...`}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-full py-3 pl-5 pr-12 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all placeholder:text-gray-500"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="absolute right-2 top-1.5 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center">
                            <MessageSquare size={40} />
                        </div>
                        <p className="text-lg font-medium">Select a friend to start chatting</p>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Add friend</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Manual entries are stored locally. Steam friends can be enriched via Import / Cloud sync.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                                <input
                                    type="text"
                                    value={newFriendName}
                                    onChange={(e) => setNewFriendName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="Display name or gamertag"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Platform</label>
                                <select
                                    value={newFriendPlatform}
                                    onChange={(e) => setNewFriendPlatform(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="steam">Steam</option>
                                    <option value="epic">Epic Games</option>
                                    <option value="xbox">Xbox</option>
                                    <option value="psn">PlayStation</option>
                                    <option value="riot">Riot Games</option>
                                    <option value="battlenet">Battle.net</option>
                                    <option value="gog">GOG</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddFriend}
                                disabled={!newFriendName.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FriendRow = ({ friend, isSelected, onClick, online }: { friend: Friend, isSelected: boolean, onClick: () => void, online?: boolean }) => (
    <div
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2 ${isSelected ? 'bg-white/10 border-blue-500' : 'hover:bg-white/5 border-transparent hover:border-white/20'
            }`}
    >
        <div className="relative">
            <img src={friend.avatar} alt={friend.username} className={`w-10 h-10 rounded-full bg-slate-700 ${online ? '' : 'grayscale opacity-70'}`} />
            {online && (
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${friend.status === 'playing' ? 'bg-purple-500' :
                    friend.status === 'away' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
            )}
        </div>
        <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center">
                <span className={`text-sm font-bold truncate ${online ? 'text-white' : 'text-gray-400'}`}>{friend.username}</span>
                {friend.platform && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 uppercase">{friend.platform.slice(0, 3)}</span>
                )}
            </div>
            <span className="text-xs text-gray-500 truncate block">
                {friend.status === 'playing' ? `Playing ${friend.activity}` :
                    friend.status === 'away' ? 'Away' :
                        online ? 'Online' :
                            friend.lastSeen ? `Last seen ${friend.lastSeen}` : 'Offline'}
            </span>
        </div>
    </div>
);

export default Friends;
