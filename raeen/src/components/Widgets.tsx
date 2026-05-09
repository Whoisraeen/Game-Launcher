import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Cloud, Cpu, StickyNote, X, GripVertical, Rocket, Eye, EyeOff, Sun, Thermometer } from 'lucide-react';
import { usePerformanceStore } from '../stores/performanceStore';

type WidgetType = 'clock' | 'weather' | 'system' | 'notes' | 'quicklaunch' | 'countdown';

interface WidgetItem {
    id: string;
    type: WidgetType;
    title: string;
    visible: boolean;
}

const WIDGET_CATALOG: { type: WidgetType; title: string; icon: React.ReactNode; desc: string }[] = [
    { type: 'clock',       title: 'Clock',            icon: <Clock size={18} />,        desc: 'Current time & date' },
    { type: 'system',      title: 'System Stats',     icon: <Cpu size={18} />,          desc: 'CPU, RAM & GPU usage' },
    { type: 'weather',     title: 'Weather',          icon: <Cloud size={18} />,        desc: 'Current conditions' },
    { type: 'notes',       title: 'Quick Notes',      icon: <StickyNote size={18} />,   desc: 'Jot things down' },
    { type: 'quicklaunch', title: 'Quick Launch',     icon: <Rocket size={18} />,       desc: 'Launch frequent games' },
    { type: 'countdown',   title: 'Session Timer',    icon: <Thermometer size={18} />,  desc: 'Track gaming session time' },
];

const STORAGE_KEY = 'raeen.widgets.v2';

const defaultWidgets = (): WidgetItem[] => [
    { id: '1', type: 'clock',       title: 'Clock',        visible: true },
    { id: '2', type: 'system',      title: 'System Stats',  visible: true },
    { id: '3', type: 'weather',     title: 'Weather',       visible: true },
    { id: '4', type: 'notes',       title: 'Quick Notes',   visible: true },
    { id: '5', type: 'quicklaunch', title: 'Quick Launch',  visible: false },
    { id: '6', type: 'countdown',   title: 'Session Timer', visible: false },
];

const Widgets: React.FC = () => {
    const [widgets, setWidgets] = useState<WidgetItem[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : defaultWidgets();
        } catch { return defaultWidgets(); }
    });
    const [showCatalog, setShowCatalog] = useState(false);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    }, [widgets]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setWidgets(items => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const toggleVisibility = (id: string) => {
        setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
    };

    const addWidget = (type: WidgetType) => {
        const cat = WIDGET_CATALOG.find(c => c.type === type);
        const newWidget: WidgetItem = {
            id: Date.now().toString(),
            type,
            title: cat?.title || type,
            visible: true,
        };
        setWidgets(prev => [...prev, newWidget]);
    };

    const removeWidget = (id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    };

    const visibleWidgets = widgets.filter(w => w.visible);

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden p-6 gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md">WIDGETS</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCatalog(!showCatalog)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                            showCatalog ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                        {showCatalog ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showCatalog ? 'Hide Catalog' : 'Manage Widgets'}
                    </button>
                </div>
            </div>

            {/* Widget Catalog */}
            {showCatalog && (
                <div className="glass-frosted rounded-2xl border border-white/10 p-4">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Widget Catalog — toggle visibility or add new</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        {WIDGET_CATALOG.map(cat => {
                            const existing = widgets.filter(w => w.type === cat.type);
                            const anyVisible = existing.some(w => w.visible);
                            return (
                                <div key={cat.type} className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition">
                                    <div className="text-gray-400">{cat.icon}</div>
                                    <span className="text-xs font-bold text-white">{cat.title}</span>
                                    <span className="text-[10px] text-gray-500 text-center">{cat.desc}</span>
                                    <div className="flex gap-1 mt-1">
                                        {existing.length > 0 && (
                                            <button
                                                onClick={() => existing.forEach(w => toggleVisibility(w.id))}
                                                className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                                                    anyVisible ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-gray-500'
                                                }`}
                                            >
                                                {anyVisible ? 'On' : 'Off'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => addWidget(cat.type)}
                                            className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={visibleWidgets} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-10">
                        {visibleWidgets.map(widget => (
                            <SortableWidget key={widget.id} widget={widget} onRemove={() => removeWidget(widget.id)} onToggle={() => toggleVisibility(widget.id)} />
                        ))}
                        {visibleWidgets.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-600">
                                <Eye size={48} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No visible widgets. Click "Manage Widgets" to enable some.</p>
                            </div>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

const SortableWidget = ({ widget, onRemove, onToggle }: { widget: WidgetItem; onRemove: () => void; onToggle: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className="glass-panel p-0 flex flex-col h-64 relative group">
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners} className="cursor-grab text-gray-500 hover:text-white">
                        <GripVertical size={16} />
                    </div>
                    <span className="font-bold text-sm text-gray-300 uppercase">{widget.title}</span>
                </div>
                <div className="flex gap-1">
                    <button onClick={onToggle} className="text-gray-500 hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Hide widget">
                        <EyeOff size={14} />
                    </button>
                    <button onClick={onRemove} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={16} />
                    </button>
                </div>
            </div>
            <div className="flex-1 p-4 overflow-hidden relative">
                {widget.type === 'clock' && <ClockWidget />}
                {widget.type === 'system' && <SystemWidget />}
                {widget.type === 'weather' && <WeatherWidget />}
                {widget.type === 'notes' && <NotesWidget />}
                {widget.type === 'quicklaunch' && <QuickLaunchWidget />}
                {widget.type === 'countdown' && <CountdownWidget />}
            </div>
        </div>
    );
};

const ClockWidget = () => {
    const [time, setTime] = React.useState(new Date());
    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="text-5xl font-black text-white tracking-widest">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xl text-blue-400 font-medium mt-2">
                {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
        </div>
    );
};

const SystemWidget = () => {
    const { stats } = usePerformanceStore();
    const cpu = stats?.cpu.usage || 0;
    const ram = stats?.memory.percentage || 0;
    const gpu = stats?.gpu[0]?.usage || 0;

    return (
        <div className="space-y-4 h-full flex flex-col justify-center">
            {[
                { label: 'CPU', value: cpu, color: 'bg-blue-500' },
                { label: 'RAM', value: ram, color: 'bg-purple-500' },
                { label: 'GPU', value: gpu, color: 'bg-green-500' },
            ].map(m => (
                <div key={m.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                        <span>{m.label}</span><span>{Math.round(m.value)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className={`${m.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${m.value}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

const WeatherWidget = () => {
    const [weather, setWeather] = useState<{ temp: number; desc: string; city: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m,weather_code&temperature_unit=fahrenheit');
                const data = await res.json();
                const code = data.current?.weather_code || 0;
                const desc = code <= 3 ? 'Clear' : code <= 49 ? 'Cloudy' : code <= 69 ? 'Rain' : code <= 79 ? 'Snow' : 'Storm';
                setWeather({ temp: Math.round(data.current?.temperature_2m || 72), desc, city: 'New York, NY' });
            } catch {
                setWeather({ temp: 72, desc: 'Partly Cloudy', city: 'New York, NY' });
            } finally {
                setLoading(false);
            }
        };
        fetchWeather();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full">
            {loading ? (
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 rounded-full border-t-transparent" />
            ) : (
                <>
                    <Sun size={40} className="text-yellow-400 mb-2" />
                    <div className="text-4xl font-bold text-white">{weather?.temp}°F</div>
                    <div className="text-sm text-gray-400">{weather?.desc}</div>
                    <div className="text-xs text-gray-500 mt-3">{weather?.city}</div>
                </>
            )}
        </div>
    );
};

const NotesWidget = () => {
    const [text, setText] = useState(() => localStorage.getItem('raeen.widget.notes') || '');
    useEffect(() => { localStorage.setItem('raeen.widget.notes', text); }, [text]);

    return (
        <textarea
            className="w-full h-full bg-transparent text-gray-300 resize-none focus:outline-none text-sm placeholder-gray-600"
            placeholder="Type your notes here..."
            value={text}
            onChange={e => setText(e.target.value)}
        />
    );
};

const QuickLaunchWidget = () => {
    const [recentGames, setRecentGames] = useState<{ id: string; title: string }[]>([]);

    useEffect(() => {
        window.ipcRenderer.invoke('games:getAll').then((games: any[]) => {
            if (Array.isArray(games)) {
                const sorted = [...games].sort((a, b) => (b.last_played || 0) - (a.last_played || 0));
                setRecentGames(sorted.slice(0, 5).map(g => ({ id: g.id, title: g.title })));
            }
        }).catch(() => {});
    }, []);

    const launch = (id: string) => {
        window.ipcRenderer.invoke('games:launch', id).catch(() => {});
    };

    return (
        <div className="space-y-2 h-full flex flex-col justify-center">
            {recentGames.length === 0 && <p className="text-xs text-gray-600 text-center">No recent games</p>}
            {recentGames.map(g => (
                <button
                    key={g.id}
                    onClick={() => launch(g.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white font-medium transition text-left truncate"
                >
                    <Rocket size={12} className="text-blue-400 flex-shrink-0" />
                    <span className="truncate">{g.title}</span>
                </button>
            ))}
        </div>
    );
};

const CountdownWidget = () => {
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        if (!running) return;
        const timer = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, [running]);

    const fmt = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-4xl font-mono font-black text-white tracking-wider">{fmt(seconds)}</div>
            <div className="flex gap-2">
                <button
                    onClick={() => setRunning(!running)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${running ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                >
                    {running ? 'Pause' : 'Start'}
                </button>
                <button
                    onClick={() => { setRunning(false); setSeconds(0); }}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default Widgets;
