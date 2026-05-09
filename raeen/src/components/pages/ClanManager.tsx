import React, { useEffect, useState } from 'react';
import { Users, Plus, Shield, Crown, Trash2, UserPlus, MessageCircle, Gamepad2, X, Send } from 'lucide-react';
import { useFriendStore } from '../../stores/friendStore';

interface Clan {
  id: string;
  name: string;
  tag: string;
  game_focus: string;
  created_at: number;
}

interface ClanMember {
  clan_id: string;
  friend_id: string;
  role: 'leader' | 'officer' | 'member';
  username?: string;
  avatar?: string;
  status?: string;
}

interface ChatMessage {
  id: string;
  clan_id: string;
  sender: string;
  content: string;
  timestamp: number;
}

const ClanManager: React.FC = () => {
  const { friends, loadFriends } = useFriendStore();
  const [clans, setClans] = useState<Clan[]>([]);
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'chat'>('members');
  const [loading, setLoading] = useState(true);

  const [newClan, setNewClan] = useState({ name: '', tag: '', game_focus: '' });

  useEffect(() => {
    loadClans();
    loadFriends();
  }, []);

  useEffect(() => {
    if (selectedClan) {
      loadMembers(selectedClan.id);
      loadChat(selectedClan.id);
    }
  }, [selectedClan?.id]);

  const loadClans = async () => {
    setLoading(true);
    try {
      const result = await window.ipcRenderer.invoke('clans:getAll');
      setClans(Array.isArray(result) ? result : []);
      if (result?.length && !selectedClan) setSelectedClan(result[0]);
    } catch {
      setClans([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (clanId: string) => {
    try {
      const result = await window.ipcRenderer.invoke('clans:getMembers', clanId);
      setMembers(Array.isArray(result) ? result : []);
    } catch {
      setMembers([]);
    }
  };

  const loadChat = async (clanId: string) => {
    try {
      const result = await window.ipcRenderer.invoke('clans:getChat', clanId);
      setChatMessages(Array.isArray(result) ? result : []);
    } catch {
      setChatMessages([]);
    }
  };

  const handleCreate = async () => {
    if (!newClan.name.trim() || !newClan.tag.trim()) return;
    try {
      const clan = await window.ipcRenderer.invoke('clans:create', newClan);
      setClans(prev => [...prev, clan]);
      setSelectedClan(clan);
      setShowCreate(false);
      setNewClan({ name: '', tag: '', game_focus: '' });
    } catch (err) {
      console.error('Failed to create clan:', err);
    }
  };

  const handleAddMember = async (friendId: string) => {
    if (!selectedClan) return;
    try {
      await window.ipcRenderer.invoke('clans:addMember', selectedClan.id, friendId);
      loadMembers(selectedClan.id);
      setShowAddMember(false);
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const handleRemoveMember = async (friendId: string) => {
    if (!selectedClan) return;
    try {
      await window.ipcRenderer.invoke('clans:removeMember', selectedClan.id, friendId);
      setMembers(prev => prev.filter(m => m.friend_id !== friendId));
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleSendChat = async () => {
    if (!selectedClan || !chatInput.trim()) return;
    try {
      await window.ipcRenderer.invoke('clans:sendChat', selectedClan.id, chatInput.trim());
      setChatInput('');
      loadChat(selectedClan.id);
    } catch (err) {
      console.error('Failed to send chat:', err);
    }
  };

  const memberFriendIds = new Set(members.map(m => m.friend_id));
  const availableFriends = friends.filter(f => !memberFriendIds.has(f.id));

  const getRoleIcon = (role: string) => {
    if (role === 'leader') return <Crown size={12} className="text-yellow-400" />;
    if (role === 'officer') return <Shield size={12} className="text-blue-400" />;
    return null;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">CLANS</h1>
          <p className="text-gray-400 font-medium">Manage your gaming teams & squads</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white transition text-sm"
        >
          <Plus size={16} /> Create Clan
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Clan List */}
        <div className="w-64 flex-shrink-0 glass-frosted rounded-2xl border border-white/5 p-3 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 mb-1">Your Clans</div>
          {loading && <p className="text-xs text-gray-500 px-2">Loading…</p>}
          {!loading && clans.length === 0 && (
            <p className="text-xs text-gray-500 px-2 py-4 text-center">No clans yet. Create one to get started!</p>
          )}
          {clans.map(clan => (
            <button
              key={clan.id}
              onClick={() => setSelectedClan(clan)}
              className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                selectedClan?.id === clan.id
                  ? 'bg-blue-600/20 border border-blue-500/30 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <div className="font-bold text-sm truncate">{clan.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded">[{clan.tag}]</span>
                {clan.game_focus && (
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                    <Gamepad2 size={9} /> {clan.game_focus}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Clan Detail */}
        {selectedClan ? (
          <div className="flex-1 glass-frosted rounded-2xl border border-white/5 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">{selectedClan.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">[{selectedClan.tag}]</span>
                    {selectedClan.game_focus && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Gamepad2 size={11} /> {selectedClan.game_focus}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{members.length} members</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition"
                >
                  <UserPlus size={13} /> Add Member
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'members' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <Users size={12} className="inline mr-1" /> Members
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <MessageCircle size={12} className="inline mr-1" /> Chat
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {activeTab === 'members' && (
                <div className="space-y-2">
                  {members.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8">No members yet. Add friends to your clan!</p>
                  )}
                  {members.map(member => (
                    <div key={member.friend_id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {member.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white">{member.username || member.friend_id.slice(0, 8)}</span>
                            {getRoleIcon(member.role)}
                          </div>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{member.role}</span>
                        </div>
                      </div>
                      {member.role !== 'leader' && (
                        <button
                          onClick={() => handleRemoveMember(member.friend_id)}
                          className="p-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                          title="Remove member"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="space-y-3">
                  {chatMessages.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>
                  )}
                  {chatMessages.map(msg => (
                    <div key={msg.id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {msg.sender[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{msg.sender}</span>
                          <span className="text-[10px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-gray-300 mt-0.5">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Input */}
            {activeTab === 'chat' && (
              <div className="p-3 border-t border-white/5">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    placeholder="Type a message…"
                    className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg text-white transition"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users size={48} className="text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-500">No Clan Selected</h3>
              <p className="text-sm text-gray-600 mt-1">Create or select a clan to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Clan Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[420px] glass-frosted rounded-2xl border border-white/10 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white">Create Clan</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clan Name</label>
                <input
                  value={newClan.name} onChange={e => setNewClan(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Shadow Legion"
                  className="w-full mt-1 px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tag (2-5 chars)</label>
                <input
                  value={newClan.tag} onChange={e => setNewClan(prev => ({ ...prev, tag: e.target.value.toUpperCase().slice(0, 5) }))}
                  placeholder="SL"
                  className="w-full mt-1 px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Game Focus (optional)</label>
                <input
                  value={newClan.game_focus} onChange={e => setNewClan(prev => ({ ...prev, game_focus: e.target.value }))}
                  placeholder="Valorant, CS2, etc."
                  className="w-full mt-1 px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!newClan.name.trim() || !newClan.tag.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-xl font-bold text-white transition text-sm mt-2"
              >
                Create Clan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[380px] glass-frosted rounded-2xl border border-white/10 p-6 max-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white">Add Member</h3>
              <button onClick={() => setShowAddMember(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {availableFriends.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No friends available to add</p>
              )}
              {availableFriends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                      {friend.username[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-white">{friend.username}</span>
                  </div>
                  <button
                    onClick={() => handleAddMember(friend.id)}
                    className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClanManager;
