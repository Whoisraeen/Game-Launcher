import React, { useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Trophy, Zap } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';

const COLORS = ['#60a5fa', '#4ade80', '#a855f7', '#f472b6', '#fb923c', '#f87171'];

const Analytics: React.FC = () => {
    const { games, weeklyActivity, avgSessionDuration, loadWeeklyActivity, loadAvgSessionDuration } = useGameStore();

    useEffect(() => {
        loadWeeklyActivity();
        loadAvgSessionDuration();
    }, []);

    const stats = useMemo(() => {
        const totalPlaytime = games.reduce((acc, game) => acc + (game.playtime || 0), 0);
        const totalGames = games.length;
        const installedGames = games.filter(g => g.status === 'installed').length;
        const totalAchievements = games.reduce((acc, game) => acc + (game.achievements?.unlocked || 0), 0);

        // Genre distribution
        const genreCounts: Record<string, number> = {};
        games.forEach(g => {
            const genre = g.genre || 'Uncategorized';
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });

        const genreDistribution = Object.entries(genreCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 genres

        return {
            totalPlaytime: Math.round(totalPlaytime),
            totalGames,
            installedGames,
            totalAchievements,
            genreDistribution
        };
    }, [games]);

    return (
        <div className="glass-panel flex-1 h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
            <h1 className="text-3xl font-bold text-white mb-6">Gaming Analytics</h1>

            {/* Top Stats */}
            <div className="grid grid-cols-3 gap-6">
                <StatCard icon={<Clock className="text-blue-400" />} label="Total Playtime" value={`${stats.totalPlaytime}h`} sub="Across all platforms" />
                <StatCard icon={<Trophy className="text-yellow-400" />} label="Achievements" value={`${stats.totalAchievements}`} sub="Unlocked so far" />
                <StatCard icon={<Zap className="text-purple-400" />} label="Avg Session" value={`${avgSessionDuration}h`} sub="Based on recent activity" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-80">
                {/* Weekly Activity */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 backdrop-blur-md flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4">Weekly Activity</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyActivity.length > 0 ? weeklyActivity : [{ name: 'No Data', hours: 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#60a5fa' }}
                                    cursor={{ fill: '#334155', opacity: 0.2 }}
                                />
                                <Bar dataKey="hours" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Genre Distribution */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 backdrop-blur-md flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4">Genre Preferences</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.genreDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.genreDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub: string }) => (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-start justify-between mb-2">
            <div className="p-3 bg-slate-700/50 rounded-lg">{icon}</div>
            <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Active</span>
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
        <div className="text-xs text-gray-500 mt-2">{sub}</div>
    </div>
);

export default Analytics;
