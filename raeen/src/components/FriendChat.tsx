import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, Phone, Video, Paperclip, Smile } from 'lucide-react';
import { Friend } from '../types';

interface FriendChatProps {
    friend: Friend;
    onClose: () => void;
}

interface ChatRow {
    id: string;
    content: string;
    sender: string;
    timestamp: number;
}

function mapDbRow(row: any): ChatRow {
    return {
        id: row.id,
        content: row.content ?? '',
        sender: row.sender ?? 'me',
        timestamp: typeof row.timestamp === 'number' ? row.timestamp : Number(row.timestamp),
    };
}

const FriendChat: React.FC<FriendChatProps> = ({ friend, onClose }) => {
    const [messages, setMessages] = useState<ChatRow[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const friendIdRef = useRef(friend.id);

    useEffect(() => {
        friendIdRef.current = friend.id;
    }, [friend.id]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rows = await window.ipcRenderer.invoke('friends:getMessages', friend.id);
                if (!cancelled && Array.isArray(rows)) {
                    setMessages(rows.map(mapDbRow));
                }
                await window.ipcRenderer.invoke('friends:markRead', friend.id);
            } catch (e) {
                console.error('FriendChat: failed to load messages', e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [friend.id]);

    useEffect(() => {
        const unsub = window.ipcRenderer.on('friends:message', (_: unknown, data: { friendId?: string; message?: any }) => {
            if (!data?.friendId || data.friendId !== friendIdRef.current || !data.message) return;
            const row = mapDbRow(data.message);
            setMessages(prev => {
                if (prev.some(m => m.id === row.id)) return prev;
                return [...prev, row];
            });
        });
        return () => {
            unsub();
        };
    }, []);

    useEffect(() => {
        if (!isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isMinimized]);

    const handleSend = async () => {
        const text = inputValue.trim();
        if (!text) return;

        setInputValue('');
        try {
            await window.ipcRenderer.invoke('friends:sendMessage', friend.id, text);
        } catch (e) {
            console.error('FriendChat: send failed', e);
            setInputValue(text);
        }
    };

    if (isMinimized) {
        return (
            <div 
                className="fixed bottom-4 right-80 z-50 bg-slate-800 border border-white/10 rounded-t-lg shadow-xl flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-700 transition-colors w-64"
                onClick={() => setIsMinimized(false)}
            >
                <div className="relative">
                    <img src={friend.avatar} alt={friend.username} className="w-6 h-6 rounded-full" />
                    <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-800 ${friend.status === 'online' ? 'bg-green-500' : friend.status === 'playing' ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                </div>
                <span className="text-sm font-bold text-white truncate">{friend.username}</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }} 
                    className="ml-auto text-gray-400 hover:text-white"
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-80 z-50 w-80 h-96 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
            <div className="h-14 bg-white/5 border-b border-white/5 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img src={friend.avatar} alt={friend.username} className="w-8 h-8 rounded-full bg-slate-700" />
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${friend.status === 'online' ? 'bg-green-500' : friend.status === 'playing' ? 'bg-purple-500' : friend.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-none">{friend.username}</h3>
                        <span className="text-[10px] text-gray-400">
                            {friend.activity ? `Playing ${friend.activity}` : friend.status}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <Phone size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <Video size={14} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => setIsMinimized(true)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                        <Minimize2 size={14} />
                    </button>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-black/20">
                {messages.length === 0 && (
                    <p className="text-center text-xs text-gray-500 pt-6 px-2">
                        Messages stay on this device — say hi to start the thread.
                    </p>
                )}
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                                msg.sender === 'me' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-slate-700 text-gray-200 rounded-bl-none'
                            }`}
                        >
                            <span>{msg.content}</span>
                            <div className={`text-[10px] mt-1 opacity-70 ${msg.sender === 'me' ? 'text-right' : ''}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white/5 border-t border-white/5">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={`Message ${friend.username}...`}
                        className="w-full bg-black/40 border border-white/10 rounded-full pl-4 pr-24 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all placeholder:text-gray-500"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                        <button type="button" className="p-1.5 text-gray-400 hover:text-white transition-colors">
                            <Smile size={16} />
                        </button>
                        <button type="button" className="p-1.5 text-gray-400 hover:text-white transition-colors">
                            <Paperclip size={16} />
                        </button>
                        <button 
                            type="button"
                            onClick={() => handleSend()}
                            disabled={!inputValue.trim()}
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FriendChat;
