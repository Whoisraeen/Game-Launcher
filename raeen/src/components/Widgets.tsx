import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Cloud, Cpu, StickyNote, X, GripVertical } from 'lucide-react';
import { usePerformanceStore } from '../stores/performanceStore';

interface WidgetItem {
    id: string;
    type: 'clock' | 'weather' | 'system' | 'notes';
    title: string;
}

const Widgets: React.FC = () => {
    const [widgets, setWidgets] = useState<WidgetItem[]>([
        { id: '1', type: 'clock', title: 'Clock' },
        { id: '2', type: 'system', title: 'System Specs' },
        { id: '3', type: 'weather', title: 'Weather' },
        { id: '4', type: 'notes', title: 'Quick Notes' },
    ]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setWidgets((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const removeWidget = (id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
    };

    const addWidget = (type: WidgetItem['type']) => {
        const newWidget: WidgetItem = {
            id: Date.now().toString(),
            type,
            title: type.charAt(0).toUpperCase() + type.slice(1)
        };
        setWidgets([...widgets, newWidget]);
    };

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden p-6 gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md">WIDGETS</h1>
                <div className="flex gap-2">
                    <button onClick={() => addWidget('clock')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title="Add Clock"><Clock size={20} /></button>
                    <button onClick={() => addWidget('system')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title="Add System Stats"><Cpu size={20} /></button>
                    <button onClick={() => addWidget('weather')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title="Add Weather"><Cloud size={20} /></button>
                    <button onClick={() => addWidget('notes')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title="Add Notes"><StickyNote size={20} /></button>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={widgets} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-10">
                        {widgets.map((widget) => (
                            <SortableWidget key={widget.id} widget={widget} onRemove={() => removeWidget(widget.id)} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

const SortableWidget = ({ widget, onRemove }: { widget: WidgetItem, onRemove: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="glass-panel p-0 flex flex-col h-64 relative group">
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners} className="cursor-grab text-gray-500 hover:text-white">
                        <GripVertical size={16} />
                    </div>
                    <span className="font-bold text-sm text-gray-300 uppercase">{widget.title}</span>
                </div>
                <button onClick={onRemove} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={16} />
                </button>
            </div>
            <div className="flex-1 p-4 overflow-hidden relative">
                {widget.type === 'clock' && <ClockWidget />}
                {widget.type === 'system' && <SystemWidget />}
                {widget.type === 'weather' && <WeatherWidget />}
                {widget.type === 'notes' && <NotesWidget />}
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
    // Mock data if stats are empty (e.g. not running in Electron or service not ready)
    const cpu = stats?.cpuLoad || 15;
    const ram = stats?.memUsed ? (stats.memUsed / stats.memTotal) * 100 : 42;
    const gpu = stats?.gpuLoad || 28;

    return (
        <div className="space-y-4 h-full flex flex-col justify-center">
            <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>CPU</span>
                    <span>{Math.round(cpu)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${cpu}%` }}></div>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>RAM</span>
                    <span>{Math.round(ram)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${ram}%` }}></div>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>GPU</span>
                    <span>{Math.round(gpu)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${gpu}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const WeatherWidget = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <Cloud size={48} className="text-white mb-2" />
            <div className="text-4xl font-bold text-white">72°F</div>
            <div className="text-sm text-gray-400">Partly Cloudy</div>
            <div className="text-xs text-gray-500 mt-4">New York, NY</div>
        </div>
    );
};

const NotesWidget = () => {
    return (
        <textarea
            className="w-full h-full bg-transparent text-gray-300 resize-none focus:outline-none text-sm placeholder-gray-600"
            placeholder="Type your notes here..."
            defaultValue="Remember to check out the new indie game release on Friday!"
        />
    );
};

export default Widgets;
