import React from 'react';
import { Cpu, Database, Activity } from 'lucide-react';
import { useSystemStats } from '../hooks/useSystemStats';

const SystemStatus: React.FC = () => {
    const stats = useSystemStats(2000);

    if (!stats) return null;

    return (
        <div className="hidden md:flex items-center gap-4 px-3 py-1 bg-black/20 rounded-full border border-white/5 text-[10px] font-mono text-gray-400 mr-2">
            {/* CPU */}
            <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-help" title={`${stats.cpu.model} (${stats.cpu.temp}°C)`}>
                <Cpu size={10} className={stats.cpu.usage > 80 ? "text-red-400" : "text-blue-400"} />
                <span className={stats.cpu.usage > 80 ? "text-red-400" : ""}>
                    CPU {stats.cpu.usage}%
                </span>
            </div>

            <div className="w-px h-3 bg-white/10" />

            {/* RAM */}
            <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-help" title={`Used: ${(stats.memory.used / 1024 / 1024 / 1024).toFixed(1)}GB / ${(stats.memory.total / 1024 / 1024 / 1024).toFixed(1)}GB`}>
                <Database size={10} className={stats.memory.percentage > 80 ? "text-red-400" : "text-purple-400"} />
                <span className={stats.memory.percentage > 80 ? "text-red-400" : ""}>
                    RAM {stats.memory.percentage}%
                </span>
            </div>

            {/* GPU (Show first GPU) */}
            {stats.gpu.length > 0 && (
                <>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-help" title={`${stats.gpu[0].model} (${stats.gpu[0].temp}°C)`}>
                        <Activity size={10} className={stats.gpu[0].usage > 80 ? "text-red-400" : "text-green-400"} />
                        <span className={stats.gpu[0].usage > 80 ? "text-red-400" : ""}>
                            GPU {stats.gpu[0].usage}%
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};

export default SystemStatus;
