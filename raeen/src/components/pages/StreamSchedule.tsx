import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Clock, Gamepad2, Tv } from 'lucide-react';

interface StreamSlot {
    id: string;
    day: string;
    time: string;
    game: string;
    title: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STORAGE_KEY = 'raeen.streamSchedule';

const StreamSchedule: React.FC = () => {
    const [slots, setSlots] = useState<StreamSlot[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newSlot, setNewSlot] = useState<Omit<StreamSlot, 'id'>>({ day: 'Monday', time: '19:00', game: '', title: '' });

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try { setSlots(JSON.parse(stored)); } catch {}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    }, [slots]);

    const addSlot = () => {
        if (!newSlot.game.trim()) return;
        const slot: StreamSlot = { ...newSlot, id: Date.now().toString(36) + Math.random().toString(36).slice(2) };
        setSlots(prev => [...prev, slot]);
        setNewSlot({ day: 'Monday', time: '19:00', game: '', title: '' });
        setShowForm(false);
    };

    const removeSlot = (id: string) => {
        setSlots(prev => prev.filter(s => s.id !== id));
    };

    const getUpcoming = (): StreamSlot[] => {
        const now = new Date();
        const todayIndex = (now.getDay() + 6) % 7;
        return slots
            .map(s => ({ ...s, _dayIdx: DAYS.indexOf(s.day) }))
            .sort((a, b) => {
                const da = (a._dayIdx - todayIndex + 7) % 7;
                const db = (b._dayIdx - todayIndex + 7) % 7;
                if (da !== db) return da - db;
                return a.time.localeCompare(b.time);
            })
            .slice(0, 5);
    };

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col p-6 gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Calendar className="text-orange-400" size={32} />
                    Stream Schedule
                </h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
                >
                    <Plus size={16} /> Add Stream
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Grid */}
                <div className="lg:col-span-2 grid grid-cols-7 gap-2">
                    {DAYS.map(day => (
                        <div key={day} className="flex flex-col gap-2">
                            <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2 border-b border-white/10">
                                {day.slice(0, 3)}
                            </div>
                            <div className="flex flex-col gap-1.5 min-h-[200px]">
                                {slots.filter(s => s.day === day).sort((a, b) => a.time.localeCompare(b.time)).map(slot => (
                                    <div
                                        key={slot.id}
                                        className="group relative bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/10 rounded-lg p-2 hover:border-white/20 transition-all"
                                    >
                                        <div className="text-[10px] text-blue-300 font-mono">{slot.time}</div>
                                        <div className="text-xs text-white font-medium truncate">{slot.game}</div>
                                        {slot.title && <div className="text-[10px] text-gray-400 truncate">{slot.title}</div>}
                                        <button
                                            onClick={() => removeSlot(slot.id)}
                                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300 transition-opacity"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Upcoming Sidebar */}
                <div className="bg-black/20 border border-white/10 rounded-xl p-4 h-fit">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Clock size={14} className="text-orange-400" /> Upcoming Streams
                    </h3>
                    <div className="space-y-3">
                        {getUpcoming().length === 0 && (
                            <p className="text-xs text-gray-500">No streams scheduled yet.</p>
                        )}
                        {getUpcoming().map(slot => (
                            <div key={slot.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                <div className="w-8 h-8 rounded-md bg-purple-600/30 flex items-center justify-center flex-shrink-0">
                                    <Tv size={14} className="text-purple-300" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate">{slot.game}</div>
                                    <div className="text-[10px] text-gray-400">{slot.day} at {slot.time}</div>
                                    {slot.title && <div className="text-[10px] text-blue-300 truncate">{slot.title}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-blue-400" /> Add Stream Slot
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Day</label>
                                <select
                                    value={newSlot.day}
                                    onChange={e => setNewSlot(prev => ({ ...prev, day: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50"
                                >
                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Time</label>
                                <input
                                    type="time"
                                    value={newSlot.time}
                                    onChange={e => setNewSlot(prev => ({ ...prev, time: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Game</label>
                                <div className="relative">
                                    <Gamepad2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        value={newSlot.game}
                                        onChange={e => setNewSlot(prev => ({ ...prev, game: e.target.value }))}
                                        placeholder="Game name..."
                                        className="w-full pl-9 bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Stream Title (optional)</label>
                                <input
                                    type="text"
                                    value={newSlot.title}
                                    onChange={e => setNewSlot(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Catchy title..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={addSlot}
                                    disabled={!newSlot.game.trim()}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add to Schedule
                                </button>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StreamSchedule;
