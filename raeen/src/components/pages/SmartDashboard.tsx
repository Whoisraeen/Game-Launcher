import React, { useState, useEffect } from 'react';
import { Shuffle, Calendar as CalendarIcon, DollarSign, Clock, TrendingUp, Filter, Play } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SmartDashboard: React.FC = () => {
    const { games } = useGameStore();
    const [activeTab, setActiveTab] = useState<'randomizer' | 'planner' | 'expenses'>('randomizer');

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">SMART DASHBOARD</h1>
                    <p className="text-sm text-gray-400">AI-powered insights and productivity tools for your gaming life.</p>
                </div>
                <div className="flex bg-black/20 p-1 rounded-lg">
                    <TabButton
                        active={activeTab === 'randomizer'}
                        onClick={() => setActiveTab('randomizer')}
                        icon={<Shuffle size={16} />}
                        label="Randomizer"
                    />
                    <TabButton
                        active={activeTab === 'planner'}
                        onClick={() => setActiveTab('planner')}
                        icon={<CalendarIcon size={16} />}
                        label="Planner"
                    />
                    <TabButton
                        active={activeTab === 'expenses'}
                        onClick={() => setActiveTab('expenses')}
                        icon={<DollarSign size={16} />}
                        label="Expenses"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'randomizer' && <GameRandomizer games={games} />}
                {activeTab === 'planner' && <SessionPlanner />}
                {activeTab === 'expenses' && <ExpenseTracker />}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const GameRandomizer = ({ games }: { games: any[] }) => {
    const [step, setStep] = useState(0);
    const [filters, setFilters] = useState({
        time: 'Any',
        mood: 'Any'
    });
    const [suggestedGame, setSuggestedGame] = useState<any | null>(null);
    const [hltbData, setHltbData] = useState<any | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);

    const reset = () => {
        setStep(0);
        setFilters({ time: 'Any', mood: 'Any' });
        setSuggestedGame(null);
        setHltbData(null);
    };

    const handleTimeSelect = (time: string) => {
        setFilters(prev => ({ ...prev, time }));
        setStep(1);
    };

    const handleMoodSelect = (mood: string) => {
        const newFilters = { ...filters, mood };
        setFilters(newFilters);
        findGame(newFilters);
        setStep(2);
    };

    const findGame = async (currentFilters: typeof filters) => {
        setIsSpinning(true);
        
        // Artificial delay for "thinking" effect
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            let result: any = null;

            if (currentFilters.mood !== 'Any') {
                // Use AI-powered recommendation engine
                const recommendations = await window.ipcRenderer.invoke('games:getMoodRecommendations', currentFilters.mood, currentFilters.time);
                
                if (recommendations && recommendations.length > 0) {
                    // Pick random from top results to keep it fresh
                    result = recommendations[Math.floor(Math.random() * Math.min(recommendations.length, 3))];
                }
            } else {
                // Simple randomizer if no mood selected
                const filtered = games.filter(g => g.isInstalled && !g.isHidden);
                if (filtered.length > 0) {
                    result = filtered[Math.floor(Math.random() * filtered.length)];
                }
            }
            
            if (result) {
                setSuggestedGame(result);
                // Fetch HLTB data
                try {
                    const hltb = await window.ipcRenderer.invoke('games:hltbSearch', result.title);
                    setHltbData(hltb);
                } catch (e) {
                    console.error('Failed to fetch HLTB data', e);
                }
            } else {
                setSuggestedGame(null);
            }
        } catch (error) {
            console.error("Failed to get recommendations", error);
            setSuggestedGame(null);
        } finally {
            setIsSpinning(false);
        }
    };

    const launchGame = async () => {
        if (suggestedGame) {
            try {
                await window.ipcRenderer.invoke('games:launch', suggestedGame.id);
            } catch (error) {
                console.error("Failed to launch game", error);
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto text-center space-y-12 py-10 min-h-[400px] flex flex-col justify-center">
            {step === 0 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-4xl font-bold text-white">How much time do you have?</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {[
                            { label: 'Quick Session (< 30m)', value: 'Short', icon: <Clock size={20} /> },
                            { label: 'A Couple Hours (1-2h)', value: 'Medium', icon: <Clock size={20} /> },
                            { label: 'Deep Dive (3h+)', value: 'Long', icon: <Clock size={20} /> },
                            { label: "I'm free all day", value: 'Any', icon: <CalendarIcon size={20} /> }
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleTimeSelect(opt.value)}
                                className="bg-white/5 hover:bg-white/20 border border-white/10 px-8 py-6 rounded-xl flex flex-col items-center gap-3 transition-all hover:scale-105 w-48"
                            >
                                {opt.icon}
                                <span className="font-bold">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-4xl font-bold text-white">What's the vibe?</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {[
                            { label: 'Chill / Relaxing', value: 'Chill', color: 'bg-teal-500/20 hover:bg-teal-500/40' },
                            { label: 'High Octane Action', value: 'Action', color: 'bg-red-500/20 hover:bg-red-500/40' },
                            { label: 'Deep Story', value: 'Story', color: 'bg-purple-500/20 hover:bg-purple-500/40' },
                            { label: 'Challenge Me', value: 'Challenge', color: 'bg-orange-500/20 hover:bg-orange-500/40' },
                            { label: "Surprise Me", value: 'Any', color: 'bg-gray-500/20 hover:bg-gray-500/40' }
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleMoodSelect(opt.value)}
                                className={`${opt.color} border border-white/10 px-8 py-6 rounded-xl flex flex-col items-center gap-3 transition-all hover:scale-105 w-48`}
                            >
                                <span className="font-bold text-lg">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setStep(0)} className="text-gray-500 hover:text-white text-sm">Back</button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {isSpinning ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-xl text-gray-400 animate-pulse">Consulting the oracle...</p>
                        </div>
                    ) : suggestedGame ? (
                        <div className="flex flex-col items-center gap-6">
                            <h2 className="text-2xl text-gray-400">You should play...</h2>
                            <div className="relative group cursor-pointer">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative w-64 h-96 rounded-xl overflow-hidden shadow-2xl">
                                    <img src={suggestedGame.cover} alt={suggestedGame.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                                        <h1 className="text-2xl font-black text-white leading-none">{suggestedGame.title}</h1>
                                    </div>
                                </div>
                            </div>
                            
                            {hltbData && (
                                <div className="flex gap-6 bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/5 animate-in fade-in zoom-in duration-300">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Main Story</p>
                                        <p className="text-xl font-bold text-white">{hltbData.gameplayMain}h</p>
                                    </div>
                                    <div className="w-px bg-white/10"></div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Main + Extra</p>
                                        <p className="text-xl font-bold text-white">{hltbData.gameplayMainExtra}h</p>
                                    </div>
                                    <div className="w-px bg-white/10"></div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Completionist</p>
                                        <p className="text-xl font-bold text-white">{hltbData.gameplayCompletionist}h</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button 
                                    onClick={reset}
                                    className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                                >
                                    Try Again
                                </button>
                                <button onClick={launchGame} className="px-8 py-2 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2">
                                    <Play size={18} fill="black" /> Launch
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">No matching games found.</h2>
                            <p className="text-gray-400">Try different filters or expand your library!</p>
                            <button 
                                onClick={reset}
                                className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                            >
                                Start Over
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SessionPlanner = () => {
    // Mock calendar data
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const [events, setEvents] = useState<Record<string, string>>({});

    useEffect(() => {
        const saved = localStorage.getItem('raeen_planner_events');
        if (saved) {
            setEvents(JSON.parse(saved));
        }
    }, []);

    const handleDayClick = (dayIndex: number) => {
        const title = prompt("Enter session plan (e.g. 'Raid Night @ 8pm'):");
        if (title) {
            const newEvents = { ...events, [dayIndex]: title };
            setEvents(newEvents);
            localStorage.setItem('raeen_planner_events', JSON.stringify(newEvents));
        }
    };

    const removeEvent = (e: React.MouseEvent, dayIndex: number) => {
        e.stopPropagation();
        const newEvents = { ...events };
        delete newEvents[dayIndex];
        setEvents(newEvents);
        localStorage.setItem('raeen_planner_events', JSON.stringify(newEvents));
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Gaming Schedule</h2>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
                    + Schedule Session
                </button>
            </div>

            <div className="grid grid-cols-7 gap-4">
                {days.map(day => (
                    <div key={day} className="text-center text-gray-500 font-bold uppercase text-xs mb-2">{day}</div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => {
                    const isToday = i === 14; // Mock today
                    const hasEvent = !!events[i];
                    return (
                        <div 
                            key={i} 
                            onClick={() => handleDayClick(i)}
                            className={`aspect-square rounded-xl border cursor-pointer ${isToday ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-black/20'} p-2 relative group hover:border-white/20 transition-colors`}
                        >
                            <span className={`text-sm ${isToday ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>{i + 1}</span>
                            {hasEvent && (
                                <div className="mt-2 p-1.5 bg-purple-600/20 border border-purple-500/30 rounded text-[10px] text-purple-200 truncate relative group/event">
                                    {events[i]}
                                    <div 
                                        className="absolute top-0 right-0 bottom-0 left-0 bg-red-500/80 hidden group-hover/event:flex items-center justify-center text-white cursor-pointer"
                                        onClick={(e) => removeEvent(e, i)}
                                    >×</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="bg-black/20 rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Upcoming Sessions</h3>
                <div className="space-y-3">
                    {Object.entries(events).map(([day, title]) => (
                         <div key={day} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                            <div className="p-3 bg-purple-600/20 rounded-lg text-purple-400">
                                <CalendarIcon size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-medium">{title}</h4>
                                <p className="text-xs text-gray-400">Day {parseInt(day) + 1}</p>
                            </div>
                        </div>
                    ))}
                    {Object.keys(events).length === 0 && <p className="text-gray-500">No sessions planned.</p>}
                </div>
            </div>
        </div>
    );
};

const ExpenseTracker = () => {
    // Mock data for charts
    const data = [
        { name: 'Jan', amount: 60 },
        { name: 'Feb', amount: 0 },
        { name: 'Mar', amount: 120 },
        { name: 'Apr', amount: 45 },
        { name: 'May', amount: 20 },
        { name: 'Jun', amount: 70 },
    ];

    const genreData = [
        { name: 'RPG', value: 400 },
        { name: 'FPS', value: 300 },
        { name: 'Indie', value: 300 },
        { name: 'Strategy', value: 200 },
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><DollarSign size={20} /></div>
                        <span className="text-gray-400 text-sm">Total Spent (YTD)</span>
                    </div>
                    <div className="text-3xl font-bold text-white">$315.00</div>
                    <div className="text-xs text-green-400 mt-1 flex items-center gap-1"><TrendingUp size={12} /> +12% vs last year</div>
                </div>
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Clock size={20} /></div>
                        <span className="text-gray-400 text-sm">Cost per Hour</span>
                    </div>
                    <div className="text-3xl font-bold text-white">$0.42</div>
                    <div className="text-xs text-gray-500 mt-1">Based on 750h playtime</div>
                </div>
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Filter size={20} /></div>
                        <span className="text-gray-400 text-sm">Most Expensive Genre</span>
                    </div>
                    <div className="text-3xl font-bold text-white">RPG</div>
                    <div className="text-xs text-gray-500 mt-1">45% of total spend</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-black/20 p-6 rounded-xl border border-white/5 h-80">
                    <h3 className="text-lg font-bold text-white mb-6">Monthly Spending</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-black/20 p-6 rounded-xl border border-white/5 h-80">
                    <h3 className="text-lg font-bold text-white mb-6">Spending by Genre</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={genreData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {genreData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SmartDashboard;
