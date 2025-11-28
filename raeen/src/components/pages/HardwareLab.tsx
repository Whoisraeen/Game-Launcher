import React, { useState } from 'react';
import { Cpu, Zap, Fan, Thermometer, Activity, Palette, Power, Settings, Monitor, HardDrive } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import MonitorCalibration from '../MonitorCalibration';
import StorageOptimizer from '../StorageOptimizer';

const HardwareLab: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cooling' | 'power' | 'rgb' | 'calibration' | 'storage'>('cooling');

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">HARDWARE LAB</h1>
                    <p className="text-sm text-gray-400">Tune your system for maximum performance and aesthetics.</p>
                </div>
                <div className="flex bg-black/20 p-1 rounded-lg overflow-x-auto custom-scrollbar">
                    <TabButton
                        active={activeTab === 'cooling'}
                        onClick={() => setActiveTab('cooling')}
                        icon={<Fan size={16} />}
                        label="Cooling"
                    />
                    <TabButton
                        active={activeTab === 'power'}
                        onClick={() => setActiveTab('power')}
                        icon={<Zap size={16} />}
                        label="Power"
                    />
                    <TabButton
                        active={activeTab === 'rgb'}
                        onClick={() => setActiveTab('rgb')}
                        icon={<Palette size={16} />}
                        label="RGB"
                    />
                    <TabButton
                        active={activeTab === 'calibration'}
                        onClick={() => setActiveTab('calibration')}
                        icon={<Monitor size={16} />}
                        label="Display"
                    />
                    <TabButton
                        active={activeTab === 'storage'}
                        onClick={() => setActiveTab('storage')}
                        icon={<HardDrive size={16} />}
                        label="Storage"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'cooling' && <CoolingControl />}
                {activeTab === 'power' && <PowerMonitor />}
                {activeTab === 'rgb' && <RGBControl />}
                {activeTab === 'calibration' && <MonitorCalibration />}
                {activeTab === 'storage' && <StorageOptimizer />}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${active ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const CoolingControl = () => {
    // Mock data for fan curve
    const data = [
        { temp: 30, speed: 20 },
        { temp: 40, speed: 30 },
        { temp: 50, speed: 45 },
        { temp: 60, speed: 60 },
        { temp: 70, speed: 80 },
        { temp: 80, speed: 100 },
        { temp: 90, speed: 100 },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 bg-slate-800/30 rounded-xl border border-white/5 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-orange-500" /> Fan Curve Editor
                    </h3>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white">Silent</button>
                        <button className="px-3 py-1 bg-orange-600 text-white rounded text-xs">Performance</button>
                        <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white">Turbo</button>
                    </div>
                </div>

                <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="temp" stroke="#666" label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -5 }} />
                            <YAxis stroke="#666" label={{ value: 'Fan Speed (%)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                            <Line type="monotone" dataKey="speed" stroke="#f97316" strokeWidth={3} dot={{ r: 6, fill: '#f97316' }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Current Status</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Thermometer size={20} className="text-red-500" />
                                <span className="text-gray-300">CPU Temp</span>
                            </div>
                            <span className="text-xl font-bold text-white">62°C</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Thermometer size={20} className="text-red-500" />
                                <span className="text-gray-300">GPU Temp</span>
                            </div>
                            <span className="text-xl font-bold text-white">58°C</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Fan size={20} className="text-blue-500" />
                                <span className="text-gray-300">Fan Speed</span>
                            </div>
                            <span className="text-xl font-bold text-white">1250 RPM</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Presets</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors group">
                            <div className="text-white font-bold mb-1">Silent</div>
                            <div className="text-xs text-gray-500 group-hover:text-gray-400">Zero RPM mode active</div>
                        </button>
                        <button className="p-3 bg-orange-600/20 border border-orange-500/50 rounded-lg text-left transition-colors">
                            <div className="text-orange-400 font-bold mb-1">Gaming</div>
                            <div className="text-xs text-orange-300/70">Aggressive curve</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PowerMonitor = () => {
    const data = [
        { time: '0s', watts: 45 },
        { time: '10s', watts: 120 },
        { time: '20s', watts: 250 },
        { time: '30s', watts: 240 },
        { time: '40s', watts: 180 },
        { time: '50s', watts: 80 },
        { time: '60s', watts: 50 },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Zap size={20} /></div>
                        <span className="text-gray-400 text-sm">Total Power Draw</span>
                    </div>
                    <div className="text-3xl font-bold text-white">345 W</div>
                    <div className="text-xs text-yellow-400 mt-1">Peak: 450W</div>
                </div>
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Cpu size={20} /></div>
                        <span className="text-gray-400 text-sm">CPU Package</span>
                    </div>
                    <div className="text-3xl font-bold text-white">85 W</div>
                    <div className="text-xs text-gray-500 mt-1">TDP: 105W</div>
                </div>
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Activity size={20} /></div>
                        <span className="text-gray-400 text-sm">GPU Power</span>
                    </div>
                    <div className="text-3xl font-bold text-white">220 W</div>
                    <div className="text-xs text-gray-500 mt-1">TGP: 320W</div>
                </div>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5 h-96">
                <h3 className="text-lg font-bold text-white mb-6">Power Consumption History</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorWatts" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="time" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                        <Area type="monotone" dataKey="watts" stroke="#eab308" fillOpacity={1} fill="url(#colorWatts)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const RGBControl = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Palette size={20} className="text-purple-500" /> Lighting Effects
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        {['Rainbow Wave', 'Breathing', 'Static', 'Color Cycle', 'Starry Night', 'Audio Viz'].map(effect => (
                            <button key={effect} className="aspect-video bg-black/40 rounded-lg border border-white/5 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all flex items-center justify-center text-sm font-medium text-gray-300 hover:text-white group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                {effect}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Device Sync</h3>
                    <div className="space-y-3">
                        {['Motherboard', 'GPU', 'RAM', 'Keyboard', 'Mouse', 'LED Strip'].map(device => (
                            <div key={device} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                    <span className="text-white font-medium">{device}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-purple-600 border border-white/20"></div>
                                    <button className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                                        <Settings size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5 flex flex-col items-center">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-6 w-full text-left">Color Picker</h3>
                <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 shadow-xl mb-8 relative cursor-crosshair">
                    <div className="absolute top-1/2 left-1/2 w-4 h-4 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
                </div>

                <div className="w-full space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Brightness</label>
                        <input type="range" className="w-full mt-1 accent-purple-500" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Speed</label>
                        <input type="range" className="w-full mt-1 accent-purple-500" />
                    </div>
                </div>

                <button className="mt-auto w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2">
                    <Power size={18} /> Apply to All
                </button>
            </div>
        </div>
    );
};

export default HardwareLab;
