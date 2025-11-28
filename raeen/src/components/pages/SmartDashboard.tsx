import React, { useState } from 'react';
import { Shuffle, Calendar as CalendarIcon, DollarSign, Clock, TrendingUp, Filter } from 'lucide-react';
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
    const [suggestedGame, setSuggestedGame] = useState<any | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [filters, setFilters] = useState({
        genre: 'All',
        time: 'Any', // Short (< 2h), Medium (2-10h), Long (> 10h)
        mood: 'Any'
    });

    const handleSpin = () => {
        setIsSpinning(true);
        setSuggestedGame(null);

        // Simulate spinning effect
        setTimeout(() => {
            const filtered = games.filter(g => {
                if (filters.genre !== 'All' && g.genre !== filters.genre) return false;
                // Add more logic for time/mood if metadata exists
                return true;
            });

            if (filtered.length > 0) {
                const random = filtered[Math.floor(Math.random() * filtered.length)];
                setSuggestedGame(random);
            }
            setIsSpinning(false);
        }, 1500);
    };

    return (
        <div className="max-w-4xl mx-auto text-center space-y-12 py-10">
            <div className="space-y-4">
                <h2 className="text-4xl font-bold text-white">What should I play today?</h2>
                <p className="text-xl text-gray-400">Let the algorithm decide your next adventure.</p>
            </div>

            <div className="flex justify-center gap-4">
                <select
                    className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                    value={filters.genre}
                    onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
                >
                    <option value="All">All Genres</option>
                    <option value="Action">Action</option>
                    <option value="RPG">RPG</option>
                    <option value="Strategy">Strategy</option>
                </select>
                <select
                    className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                    value={filters.time}
                    onChange={(e) => setFilters({ ...filters, time: e.target.value })}
                >
                    <option value="Any">Any Duration</option>
                    <option value="Short">Short Session (&lt; 30m)</option>
                    <option value="Long">Marathon (&gt; 2h)</option>
                </select>
            </div>

            <div className="relative h-64 flex items-center justify-center">
                {isSpinning ? (
                    <div className="animate-spin text-blue-500">
                        <Shuffle size={64} />
                    </div>
                ) : suggestedGame ? (
                    <div className="animate-in fade-in zoom-in duration-500 bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-8 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full">
                        <img src={suggestedGame.cover || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070'} alt={suggestedGame.title} className="w-full h-48 object-cover rounded-lg mb-4 shadow-lg" />
                        <h3 className="text-2xl font-bold text-white mb-2">{suggestedGame.title}</h3>
                        <div className="flex justify-center gap-2 mb-6">
                            <span className="px-2 py-1 bg-black/40 rounded text-xs text-gray-300">{suggestedGame.genre}</span>
                            <span className="px-2 py-1 bg-black/40 rounded text-xs text-gray-300">PC</span>
                        </div>
                        <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors">
                            Launch Game
                        </button>
                    </div>
                ) : (
                    <div className="text-gray-600 border-2 border-dashed border-gray-700 rounded-2xl p-12 w-full max-w-md flex flex-col items-center">
                        <Shuffle size={48} className="mb-4 opacity-50" />
                        <span className="text-lg">Ready to roll?</span>
                    </div>
                )}
            </div>

            {!suggestedGame && !isSpinning && (
                <button
                    onClick={handleSpin}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-lg font-bold rounded-full shadow-lg hover:shadow-blue-500/25 transition-all transform hover:scale-105"
                >
                    Spin the Wheel
                </button>
            )}

            {suggestedGame && !isSpinning && (
                <button
                    onClick={handleSpin}
                    className="text-gray-400 hover:text-white underline"
                >
                    Spin Again
                </button>
            )}
        </div>
    );
};

const SessionPlanner = () => {
    // Mock calendar data
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
                    const hasEvent = [14, 16, 20].includes(i);
                    return (
                        <div key={i} className={`aspect-square rounded-xl border ${isToday ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-black/20'} p-2 relative group hover:border-white/20 transition-colors`}>
                            <span className={`text-sm ${isToday ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>{i + 1}</span>
                            {hasEvent && (
                                <div className="mt-2 p-1.5 bg-purple-600/20 border border-purple-500/30 rounded text-[10px] text-purple-200 truncate">
                                    Raid Night
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="bg-black/20 rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Upcoming Sessions</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                        <div className="p-3 bg-purple-600/20 rounded-lg text-purple-400">
                            <CalendarIcon size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-white font-medium">Destiny 2 Raid</h4>
                            <p className="text-xs text-gray-400">Today, 8:00 PM - 11:00 PM</p>
                        </div>
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-slate-900"></div>
                            <div className="w-8 h-8 rounded-full bg-gray-600 border-2 border-slate-900"></div>
                            <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white">+3</div>
                        </div>
                    </div>
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
