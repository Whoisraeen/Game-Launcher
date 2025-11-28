import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Database, HardDrive } from 'lucide-react';

interface SystemStats {
    cpu: { usage: number; temp: number; };
    memory: { used: number; total: number; percentage: number; };
    gpu: { usage: number; temp: number; model: string; }[];
}

const Overlay: React.FC = () => {
    const [stats, setStats] = useState<SystemStats | null>(null);

    useEffect(() => {
        // Listen for updates from main process
        const removeListener = window.ipcRenderer.on('overlay:update', (_, newStats) => {
            setStats(newStats);
        });

        return () => {
            removeListener();
        };
    }, []);

    if (!stats) return null;

    return (
        <div className="p-4 bg-black/60 backdrop-blur-md rounded-xl text-white font-mono text-xs border border-white/10 shadow-lg select-none pointer-events-none animate-in fade-in">
            <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold">
                <Activity size={14} /> PERFORMANCE
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-300">
                        <Cpu size={12} /> CPU
                    </div>
                    <div className="flex gap-2">
                        <span className={stats.cpu.usage > 80 ? 'text-red-400' : 'text-white'}>{stats.cpu.usage}%</span>
                        <span className="text-gray-500">{stats.cpu.temp}°C</span>
                    </div>
                </div>

                {stats.gpu.map((g, i) => (
                    <div key={i} className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-300">
                            <HardDrive size={12} /> GPU {i > 0 ? i : ''}
                        </div>
                        <div className="flex gap-2">
                            <span className={g.usage > 80 ? 'text-red-400' : 'text-white'}>{g.usage}%</span>
                            <span className="text-gray-500">{g.temp}°C</span>
                        </div>
                    </div>
                ))}

                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-300">
                        <Database size={12} /> RAM
                    </div>
                    <div>
                        <span className={stats.memory.percentage > 80 ? 'text-red-400' : 'text-white'}>
                            {stats.memory.percentage}%
                        </span>
                        <span className="text-gray-500 ml-1">
                            ({(stats.memory.used / 1024 / 1024 / 1024).toFixed(1)}GB)
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overlay;