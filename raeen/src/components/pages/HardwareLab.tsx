import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Fan, Thermometer, Activity, Palette, Power, Settings, Monitor, HardDrive } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import MonitorCalibration from '../MonitorCalibration';
import StorageOptimizer from '../StorageOptimizer';

const HardwareLab: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cooling' | 'power' | 'rgb' | 'calibration' | 'storage'>('cooling');
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await window.ipcRenderer.invoke('system:stats');
                setStats(data);
            } catch (e) {
                console.error("Failed to fetch stats", e);
            }
        };
        
        fetchStats();
        const interval = setInterval(fetchStats, 2000);
        return () => clearInterval(interval);
    }, []);

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
                {activeTab === 'power' && <PowerMonitor stats={stats} />}
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
    const [fanData, setFanData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFanId, setSelectedFanId] = useState<string | null>(null);
    
    // Fan Curve State
    const [curvePoints, setCurvePoints] = useState([
        { temp: 30, speed: 20 },
        { temp: 40, speed: 30 },
        { temp: 50, speed: 45 },
        { temp: 60, speed: 60 },
        { temp: 70, speed: 80 },
        { temp: 80, speed: 100 },
        { temp: 90, speed: 100 },
    ]);

    // const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchFanData = async () => {
            try {
                const data = await window.ipcRenderer.invoke('fans:getData');
                setFanData(data || []);
            } catch (e) {
                console.error("Failed to fetch fan data", e);
            } finally {
                setLoading(false);
            }
        };

        fetchFanData();
        const interval = setInterval(fetchFanData, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleFanControl = async (id: string, value: number) => {
        try {
            await window.ipcRenderer.invoke('fans:setSpeed', id, value);
        } catch (e) {
            console.error("Failed to set fan speed", e);
        }
    };

    const handlePointChange = (index: number, field: 'temp' | 'speed', value: number) => {
        const newPoints = [...curvePoints];
        newPoints[index] = { ...newPoints[index], [field]: value };
        // Sort by temp to maintain curve logic
        newPoints.sort((a, b) => a.temp - b.temp);
        setCurvePoints(newPoints);
    };

    const applyCurve = async () => {
        if (!selectedFanId) {
            alert("Please select a fan to apply the curve to.");
            return;
        }
        try {
            await window.ipcRenderer.invoke('fans:setCurve', selectedFanId, curvePoints);
            const button = document.getElementById('apply-curve-btn');
            if (button) {
                const originalText = button.innerText;
                button.innerText = "Applied!";
                setTimeout(() => button.innerText = originalText, 2000);
            }
        } catch (e) {
            console.error("Failed to apply curve", e);
            alert("Failed to apply curve.");
        }
    };

    // Flatten sensors for easy access
    const allSensors = fanData.flatMap(hw => hw.Sensors || []);
    const fans = allSensors.filter((s: any) => s.Type === 'Fan');
    const temps = allSensors.filter((s: any) => s.Type === 'Temperature');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 bg-slate-800/30 rounded-xl border border-white/5 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-orange-500" /> Fan Control
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurvePoints([
                                { temp: 30, speed: 0 }, { temp: 45, speed: 0 }, { temp: 60, speed: 30 }, 
                                { temp: 70, speed: 50 }, { temp: 80, speed: 70 }, { temp: 90, speed: 100 }, { temp: 100, speed: 100 }
                            ])}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white transition-colors"
                        >
                            Silent
                        </button>
                        <button 
                            onClick={() => setCurvePoints([
                                { temp: 30, speed: 30 }, { temp: 40, speed: 45 }, { temp: 50, speed: 60 }, 
                                { temp: 60, speed: 75 }, { temp: 70, speed: 90 }, { temp: 80, speed: 100 }, { temp: 90, speed: 100 }
                            ])}
                            className="px-3 py-1 bg-orange-600 text-white rounded text-xs shadow-lg shadow-orange-600/20 transition-colors"
                        >
                            Performance
                        </button>
                        <button 
                            onClick={() => setCurvePoints([
                                { temp: 30, speed: 60 }, { temp: 40, speed: 70 }, { temp: 50, speed: 80 }, 
                                { temp: 60, speed: 90 }, { temp: 70, speed: 100 }, { temp: 80, speed: 100 }, { temp: 90, speed: 100 }
                            ])}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white transition-colors"
                        >
                            Turbo
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar pr-2 mb-6" style={{ maxHeight: '300px' }}>
                    {loading && <div className="text-center text-gray-500 col-span-2">Loading fan data...</div>}
                    {!loading && fans.length === 0 && <div className="text-center text-gray-500 col-span-2">No controllable fans detected.</div>}
                    
                    {fans.map((fan: any, idx: number) => (
                        <div 
                            key={fan.Id || idx} 
                            onClick={() => setSelectedFanId(fan.Id)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedFanId === fan.Id ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5'}`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <Fan size={16} className={selectedFanId === fan.Id ? "text-orange-400" : "text-blue-400"} />
                                    <span className="text-sm font-medium text-white">{fan.Name}</span>
                                </div>
                                <span className="text-xs font-bold text-blue-400">{fan.Value} RPM</span>
                            </div>
                            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                <span className="text-xs text-gray-500">0%</span>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    defaultValue={50} 
                                    onChange={(e) => handleFanControl(fan.Id, parseInt(e.target.value))}
                                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="text-xs text-gray-500">100%</span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-auto pt-6 border-t border-white/5">
                     <div className="flex justify-between items-end mb-3">
                        <h4 className="text-sm font-bold text-gray-400">Fan Curve Editor</h4>
                        <button 
                            id="apply-curve-btn"
                            onClick={applyCurve}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-lg transition-all"
                        >
                            Apply Curve
                        </button>
                     </div>
                     <div className="h-48 relative group">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={curvePoints}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="temp" stroke="#666" label={{ value: 'Temp (°C)', position: 'insideBottom', offset: -5, fontSize: 12 }} type="number" domain={[0, 100]} />
                                <YAxis stroke="#666" label={{ value: 'Speed (%)', angle: -90, position: 'insideLeft', fontSize: 12 }} domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                <Line 
                                    type="monotone" 
                                    dataKey="speed" 
                                    stroke="#f97316" 
                                    strokeWidth={3} 
                                    dot={{ r: 6, fill: '#f97316', cursor: 'pointer' }} 
                                    activeDot={{ r: 8 }} 
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                     </div>
                     
                     {/* Simple Point Editor */}
                     <div className="flex justify-between mt-4 overflow-x-auto custom-scrollbar pb-2 gap-2">
                        {curvePoints.map((point, idx) => (
                            <div key={idx} className="flex flex-col items-center bg-black/20 p-2 rounded border border-white/5 min-w-[60px]">
                                <span className="text-[10px] text-gray-500 mb-1">Point {idx + 1}</span>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-red-400">T</span>
                                        <input 
                                            type="number" 
                                            value={point.temp} 
                                            onChange={(e) => handlePointChange(idx, 'temp', parseInt(e.target.value))}
                                            className="w-8 bg-transparent border-b border-white/20 text-xs text-center focus:outline-none focus:border-white"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-blue-400">S</span>
                                        <input 
                                            type="number" 
                                            value={point.speed} 
                                            onChange={(e) => handlePointChange(idx, 'speed', parseInt(e.target.value))}
                                            className="w-8 bg-transparent border-b border-white/20 text-xs text-center focus:outline-none focus:border-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">System Temperatures</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                         {temps.length === 0 && <div className="text-gray-500 text-sm">No temperature sensors found.</div>}
                         {temps.map((temp: any, idx: number) => (
                            <div key={temp.Id || idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Thermometer size={20} className="text-red-500" />
                                    <span className="text-gray-300 truncate max-w-[150px]" title={temp.Name}>{temp.Name}</span>
                                </div>
                                <span className="text-xl font-bold text-white">{temp.Value}°C</span>
                            </div>
                         ))}
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

const PowerMonitor = ({ stats }: { stats: any }) => {
    const handleOptimize = async () => {
        try {
            const result = await window.ipcRenderer.invoke('performance:optimize');
            if (result.success) {
                alert(result.message || 'System Optimized');
            } else {
                alert('Optimization failed');
            }
        } catch (e) {
            console.error(e);
            alert('Optimization error');
        }
    };

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
            <div className="flex justify-end">
                <button 
                    onClick={handleOptimize}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg transition-all"
                >
                    <Zap size={16} />
                    <span>Optimize System</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Zap size={20} /></div>
                        <span className="text-gray-400 text-sm">Total Memory</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats ? formatBytes(stats.memory.total) : '--'}</div>
                    <div className="text-xs text-yellow-400 mt-1">Used: {stats ? formatBytes(stats.memory.used) : '--'}</div>
                </div>
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Cpu size={20} /></div>
                        <span className="text-gray-400 text-sm">CPU Load</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats?.cpu?.usage || 0}%</div>
                    <div className="text-xs text-gray-500 mt-1">Model: {stats?.cpu?.model || 'Unknown'}</div>
                </div>
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Activity size={20} /></div>
                        <span className="text-gray-400 text-sm">GPU Usage</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats?.gpu?.[0]?.usage || 0}%</div>
                    <div className="text-xs text-gray-500 mt-1">{stats?.gpu?.[0]?.model || 'Unknown'}</div>
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

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const RGBControl = () => {
    const [devices, setDevices] = useState<any[]>([]);
    const [color, setColor] = useState('#a855f7'); // Purple default
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeEffect, setActiveEffect] = useState('Static');
    const [speed, setSpeed] = useState(50);

    useEffect(() => {
        const initRGB = async () => {
            setLoading(true);
            try {
                await window.ipcRenderer.invoke('rgb:connect');
                const devs = await window.ipcRenderer.invoke('rgb:getDevices');
                setDevices(devs);
                setConnected(devs && devs.length > 0);
            } catch (error) {
                console.error("Failed to init RGB", error);
                setConnected(false);
            } finally {
                setLoading(false);
            }
        };
        initRGB();
    }, []);

    const applyColor = async () => {
        const rgb = hexToRgb(color);
        if (rgb) {
            await window.ipcRenderer.invoke('rgb:setStatic', rgb.r, rgb.g, rgb.b);
            setActiveEffect('Static');
        }
    };

    const applyEffect = async (effect: string) => {
        setActiveEffect(effect);
        const rgb = hexToRgb(color);
        await window.ipcRenderer.invoke('rgb:setEffect', effect, speed, rgb);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Palette size={20} className="text-purple-500" /> Lighting Effects
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        {['Rainbow Wave', 'Breathing', 'Static', 'Color Cycle', 'Starry Night', 'Audio Viz'].map(effect => (
                            <button 
                                key={effect} 
                                onClick={() => applyEffect(effect)}
                                className={`aspect-video bg-black/40 rounded-lg border transition-all flex items-center justify-center text-sm font-medium group relative overflow-hidden ${activeEffect === effect ? 'border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-white/5 text-gray-300 hover:border-purple-500/50 hover:bg-purple-500/10'}`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-purple-500/5 opacity-0 transition-opacity ${activeEffect === effect ? 'opacity-100' : 'group-hover:opacity-100'}`}></div>
                                {effect}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Device Sync {loading && <span className="text-xs text-gray-500 ml-2">(Scanning...)</span>}</h3>
                    <div className="space-y-3">
                        {!loading && devices.length === 0 && (
                             <div className="text-gray-500 text-center py-4">
                                {connected ? "No RGB devices found." : "OpenRGB server not detected. Ensure OpenRGB SDK is running."}
                             </div>
                        )}
                        {devices.map((device, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                    <span className="text-white font-medium">{device.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: color }}></div>
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
                <div className="relative mb-8">
                    <input 
                        type="color" 
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-32 h-32 rounded-full cursor-pointer opacity-0 absolute inset-0 z-10"
                    />
                    <div 
                        className="w-32 h-32 rounded-full shadow-xl border-4 border-white/10 flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: color }}
                    >
                         <span className="text-white/50 text-xs font-bold mix-blend-difference">CLICK TO CHANGE</span>
                    </div>
                </div>

                <div className="w-full space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Brightness</label>
                        <input type="range" className="w-full mt-1 accent-purple-500" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Speed ({speed}%)</label>
                        <input 
                            type="range" 
                            min="1" max="100" 
                            value={speed} 
                            onChange={(e) => {
                                setSpeed(parseInt(e.target.value));
                                if (activeEffect !== 'Static') {
                                    applyEffect(activeEffect); // Real-time update
                                }
                            }}
                            className="w-full mt-1 accent-purple-500" 
                        />
                    </div>
                </div>

                <button 
                    onClick={applyColor}
                    className="mt-auto w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                    <Power size={18} /> Apply Static Color
                </button>
            </div>
        </div>
    );
};

export default HardwareLab;
