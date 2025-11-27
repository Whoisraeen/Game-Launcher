import React, { useMemo, useState, useEffect } from 'react';
import { Search, UserPlus, MessageSquare, RefreshCw, Trash2, Gamepad2, Download } from 'lucide-react';
import { useFriendStore } from '../../stores/friendStore';
import { Friend } from '../../types';

const Friends: React.FC = () => {
    const { friends, loadFriends, addFriend, removeFriend, simulateActivity, importSteamFriends } = useFriendStore();
    const [filter, setFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFriendName, setNewFriendName] = useState('');
    const [newFriendPlatform, setNewFriendPlatform] = useState('steam');

    useEffect(() => {
        loadFriends();

        // Simulate activity updates every 30 seconds
        const interval = setInterval(() => {
            simulateActivity();
        }, 30000);

        return () => clearInterval(interval);
    }, [loadFriends, simulateActivity]);

    const filteredFriends = useMemo<Friend[]>(() => {
        if (!filter) return friends;
        return friends.filter(f => f.username.toLowerCase().includes(filter.toLowerCase()));
    }, [friends, filter]);

    const onlineFriends = filteredFriends.filter(f => f.status !== 'offline');
    const offlineFriends = filteredFriends.filter(f => f.status === 'offline');

    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
    const selectedFriend = friends.find(f => f.id === selectedFriendId);

    const handleAddFriend = () => {
        if (newFriendName.trim()) {
            addFriend(newFriendName, newFriendPlatform);
            setNewFriendName('');
            setShowAddModal(false);
        }
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
                                onClick={() => importSteamFriends()}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                title="Import Steam Friends"
                            >
                                <Download size={18} />
                            </button>
                            <button
                                onClick={simulateActivity}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                title="Simulate Activity"
                            >
                                <RefreshCw size={18} />
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <UserPlus size={20} className="text-blue-400" />
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
                        <div className="px-6 py-8 text-center text-gray-500">
                            <p className="mb-2">No friends yet.</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                                Add someone
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat / Activity Area */}
            <div className="flex-1 flex flex-col bg-slate-900/20">
                {selectedFriend ? (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/5 backdrop-blur-md">
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

                        {/* Messages Area (Placeholder) */}
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4 p-8">
                            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare size={32} />
                            </div>
                            <p className="text-lg font-medium">Chat with {selectedFriend.username}</p>
                            <p className="text-sm max-w-md text-center opacity-70">
                                This is a placeholder for the chat interface. In a real implementation,
                                this would connect to a messaging service or platform API.
                            </p>

                            {selectedFriend.status === 'playing' && (
                                <div className="mt-8 bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 flex items-center gap-4 max-w-md w-full">
                                    <Gamepad2 className="text-purple-400" size={24} />
                                    <div>
                                        <p className="text-xs text-purple-300 font-bold uppercase">Now Playing</p>
                                        <p className="text-white font-bold">{selectedFriend.activity}</p>
                                        <button className="mt-2 text-xs bg-purple-500 hover:bg-purple-400 text-white px-3 py-1 rounded transition-colors">
                                            Join Game
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-black/20 border-t border-white/5">
                            <input
                                type="text"
                                placeholder={`Message ${selectedFriend.username}...`}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                disabled
                            />
                        </div>
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

            {/* Add Friend Modal */}
            {showAddModal && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Add Friend</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                                <input
                                    type="text"
                                    value={newFriendName}
                                    onChange={(e) => setNewFriendName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="Enter username"
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
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddFriend}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Add Friend
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
