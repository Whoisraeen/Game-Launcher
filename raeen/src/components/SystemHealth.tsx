import React, { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { Cpu, CircuitBoard, MemoryStick } from 'lucide-react';
import { SystemStats } from '../types';

interface HealthData {
    cpu: number;
    ram: number;
    gpu: number;
    ram_used_gb?: number;
    ram_total_gb?: number;
}

const SystemHealth: React.FC = () => {
    const [data, setData] = useState<HealthData[]>([]);
    const [current, setCurrent] = useState<HealthData>({ cpu: 0, ram: 0, gpu: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // @ts-ignore
                const stats: SystemStats = await window.ipcRenderer.invoke('system:stats');
                
                if (stats) {
                    const newDataPoint: HealthData = {
                        cpu: stats.cpu.usage,
                        ram: stats.memory.percentage,
                        gpu: stats.gpu[0]?.usage || 0, // Fallback if GPU stats unavailable
                        ram_used_gb: parseFloat((stats.memory.used / 1024 / 1024 / 1024).toFixed(1)),
                        ram_total_gb: parseFloat((stats.memory.total / 1024 / 1024 / 1024).toFixed(1))
                    };

                    setCurrent(newDataPoint);
                    setData(prev => {
                        const newData = [...prev, newDataPoint];
                        return newData.slice(-20); // Keep last 20 points
                    });
                }
            } catch (error) {
                console.error('Failed to fetch system stats:', error);
            }
        };

        const interval = setInterval(fetchData, 2000); // Update every 2 seconds
        fetchData(); // Initial fetch

        return () => clearInterval(interval);
    }, []);

    // Mock temperature calculation based on load (since real temp requires admin/complex access)
    const getTemp = (load: number) => Math.floor(30 + (load / 2));

    return (
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 backdrop-blur-md shadow-inner">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white">System Health</h3>
                <span className="text-xs text-gray-500">Real-time</span>
            </div>

            <div className="space-y-4">
                <StatRow 
                    icon={<Cpu size={14} className="text-blue-400" />}
                    label="CPU" 
                    value={current.cpu} 
                    temp={getTemp(current.cpu)}
                    data={data} 
                    dataKey="cpu" 
                    color="#60a5fa" 
                />
                <StatRow 
                    icon={<CircuitBoard size={14} className="text-green-400" />}
                    label="GPU" 
                    value={current.gpu} 
                    temp={getTemp(current.gpu)}
                    data={data} 
                    dataKey="gpu" 
                    color="#4ade80" 
                />
                <StatRow 
                    icon={<MemoryStick size={14} className="text-purple-400" />}
                    label="RAM" 
                    value={current.ram} 
                    subText={`${current.ram_used_gb || 0}GB/${current.ram_total_gb || 0}GB`}
                    data={data} 
                    dataKey="ram" 
                    color="#a855f7" 
                />
            </div>
        </div>
    );
};

const StatRow = ({ icon, label, value, temp, subText, data, dataKey, color }: { 
    icon: React.ReactNode, 
    label: string, 
    value: number, 
    temp?: number,
    subText?: string,
    data: HealthData[], 
    dataKey: string, 
    color: string 
}) => (
    <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-400">
                {icon}
                <span>{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {temp && <span className="text-gray-400">{temp}°C,</span>}
                <span className="text-white font-medium">{subText || `${value}%`}</span>
            </div>
        </div>
        <div className="h-6 w-full bg-slate-900/50 rounded overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`color${label}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <YAxis domain={[0, 100]} hide />
                    <Area type="monotone" dataKey={dataKey} stroke={color} fillOpacity={1} fill={`url(#color${label})`} strokeWidth={1.5} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export default SystemHealth;
