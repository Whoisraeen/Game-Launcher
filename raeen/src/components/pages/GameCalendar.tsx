import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Gamepad2, Clock, CreditCard, Rocket } from 'lucide-react';

interface CalendarEvent {
    id: string;
    date: number;
    title: string;
    type: 'release' | 'session' | 'subscription';
    description?: string;
    gameName?: string;
}

const GameCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<number | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    useEffect(() => {
        loadEvents();
    }, [year, month]);

    const loadEvents = async () => {
        try {
            const [sessions, releases] = await Promise.all([
                window.ipcRenderer.invoke('session:getForMonth', year, month).catch(() => []),
                window.ipcRenderer.invoke('games:getCalendarReleasesForMonth', year, month).catch(() => []),
            ]);

            const sessionEvents: CalendarEvent[] = (sessions || []).map((s: any) => ({
                id: s.id,
                date: s.startTime,
                title: s.title,
                type: 'session' as const,
                description: s.gameName ? `Playing ${s.gameName}` : s.description,
                gameName: s.gameName,
            }));

            const releaseEvents: CalendarEvent[] = (releases || []).map((r: any) => ({
                id: r.id,
                date: r.date,
                title: r.title,
                type: 'release' as const,
                description: r.description,
                gameName: r.gameName,
            }));

            setEvents([...releaseEvents, ...sessionEvents]);
        } catch (error) {
            console.error('Failed to load calendar events:', error);
        }
    };

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    const calendarDays = useMemo(() => {
        const days: Array<{ day: number | null; events: CalendarEvent[] }> = [];
        for (let i = 0; i < firstDayOfWeek; i++) days.push({ day: null, events: [] });
        for (let d = 1; d <= daysInMonth; d++) {
            const dayStart = new Date(year, month, d).getTime();
            const dayEnd = new Date(year, month, d, 23, 59, 59, 999).getTime();
            const dayEvents = events.filter(e => e.date >= dayStart && e.date <= dayEnd);
            days.push({ day: d, events: dayEvents });
        }
        return days;
    }, [events, year, month, daysInMonth, firstDayOfWeek]);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const today = new Date();
    const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    const selectedDayEvents = useMemo(() => {
        if (!selectedDate) return [];
        const dayStart = new Date(year, month, selectedDate).getTime();
        const dayEnd = new Date(year, month, selectedDate, 23, 59, 59, 999).getTime();
        return events.filter(e => e.date >= dayStart && e.date <= dayEnd);
    }, [selectedDate, events, year, month]);

    const upcomingEvents = useMemo(() => {
        const now = Date.now();
        return events
            .filter(e => e.date >= now)
            .sort((a, b) => a.date - b.date)
            .slice(0, 8);
    }, [events]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">CALENDAR</h1>
                    <p className="text-gray-400 font-medium">
                        Releases from your library metadata & DLC tracker, plus planned sessions
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Grid */}
                    <div className="lg:col-span-2 glass-frosted rounded-2xl p-5">
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition">
                                <ChevronLeft size={20} />
                            </button>
                            <h2 className="text-xl font-black text-white">{monthName} {year}</h2>
                            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider py-1">{d}</div>
                            ))}
                        </div>

                        {/* Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((cell, i) => (
                                <button
                                    key={i}
                                    onClick={() => cell.day && setSelectedDate(cell.day === selectedDate ? null : cell.day)}
                                    disabled={!cell.day}
                                    className={`relative aspect-square rounded-xl p-1 flex flex-col items-center justify-start transition-all text-sm
                                        ${!cell.day ? 'opacity-0 pointer-events-none' : ''}
                                        ${cell.day && isToday(cell.day) ? 'bg-blue-600/20 border border-blue-500/40' : ''}
                                        ${cell.day === selectedDate ? 'bg-purple-600/20 border border-purple-500/40 ring-1 ring-purple-500/30' : ''}
                                        ${cell.day && !isToday(cell.day) && cell.day !== selectedDate ? 'hover:bg-white/5 border border-transparent' : ''}
                                    `}
                                >
                                    <span className={`text-xs font-bold mt-1 ${isToday(cell.day!) ? 'text-blue-400' : 'text-gray-300'}`}>
                                        {cell.day}
                                    </span>
                                    {cell.events.length > 0 && (
                                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                                            {cell.events.slice(0, 3).map((e, j) => (
                                                <div key={j} className={`w-1.5 h-1.5 rounded-full ${
                                                    e.type === 'release' ? 'bg-green-400' :
                                                    e.type === 'session' ? 'bg-blue-400' : 'bg-orange-400'
                                                }`} />
                                            ))}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <div className="w-2 h-2 rounded-full bg-green-400" /> Release
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <div className="w-2 h-2 rounded-full bg-blue-400" /> Session
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <div className="w-2 h-2 rounded-full bg-orange-400" /> Subscription
                            </div>
                        </div>

                        {/* Selected day detail */}
                        {selectedDate && selectedDayEvents.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                <h3 className="text-sm font-bold text-gray-300">{monthName} {selectedDate}</h3>
                                {selectedDayEvents.map(e => (
                                    <EventCard key={e.id} event={e} />
                                ))}
                            </div>
                        )}
                        {selectedDate && selectedDayEvents.length === 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-sm text-gray-500">No events on {monthName} {selectedDate}</p>
                            </div>
                        )}
                    </div>

                    {/* Upcoming sidebar */}
                    <div className="space-y-4">
                        <div className="glass-frosted rounded-2xl p-5">
                            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                <Rocket size={16} className="text-green-400" /> Upcoming
                            </h3>
                            <div className="space-y-2">
                                {upcomingEvents.map(e => (
                                    <EventCard key={e.id} event={e} compact />
                                ))}
                                {upcomingEvents.length === 0 && (
                                    <p className="text-sm text-gray-500">No upcoming events</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EventCard: React.FC<{ event: CalendarEvent; compact?: boolean }> = ({ event, compact }) => {
    const icon = event.type === 'release' ? <Gamepad2 size={14} /> :
                 event.type === 'session' ? <Clock size={14} /> :
                 <CreditCard size={14} />;
    const color = event.type === 'release' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                  event.type === 'session' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                  'text-orange-400 bg-orange-500/10 border-orange-500/20';

    const dateStr = new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${color} transition hover:brightness-110`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
            <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold truncate ${compact ? 'text-white' : ''}`}>{event.title}</div>
                {event.description && <div className="text-[11px] text-gray-400 truncate">{event.description}</div>}
            </div>
            {compact && <span className="text-[10px] text-gray-500 whitespace-nowrap">{dateStr}</span>}
        </div>
    );
};

export default GameCalendar;
