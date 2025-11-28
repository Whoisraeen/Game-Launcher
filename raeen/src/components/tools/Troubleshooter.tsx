import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Search, Shield, AlertOctagon, Terminal } from 'lucide-react';

const Troubleshooter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'crash' | 'drivers' | 'logs'>('crash');

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">TROUBLESHOOTER</h1>
                    <p className="text-sm text-gray-400">Diagnose crashes, fix driver issues, and analyze logs.</p>
                </div>
                <div className="flex bg-black/20 p-1 rounded-lg">
                    <TabButton
                        active={activeTab === 'crash'}
                        onClick={() => setActiveTab('crash')}
                        icon={<AlertTriangle size={16} />}
                        label="Crash Analyzer"
                    />
                    <TabButton
                        active={activeTab === 'drivers'}
                        onClick={() => setActiveTab('drivers')}
                        icon={<Shield size={16} />}
                        label="Driver Health"
                    />
                    <TabButton
                        active={activeTab === 'logs'}
                        onClick={() => setActiveTab('logs')}
                        icon={<Terminal size={16} />}
                        label="Log Viewer"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'crash' && <CrashAnalyzer />}
                {activeTab === 'drivers' && <DriverHealth />}
                {activeTab === 'logs' && <LogViewer />}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${active ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const CrashAnalyzer = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);

    const handleScan = () => {
        setIsScanning(true);
        setScanComplete(false);
        setTimeout(() => {
            setIsScanning(false);
            setScanComplete(true);
        }, 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-800/30 rounded-xl p-8 border border-white/5 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={40} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Game Crash Analyzer</h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                    Automatically scan game directories and system logs to identify the root cause of recent crashes.
                </p>

                {!isScanning && !scanComplete && (
                    <button
                        onClick={handleScan}
                        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
                    >
                        Start Diagnostics
                    </button>
                )}

                {isScanning && (
                    <div className="flex flex-col items-center gap-4">
                        <RefreshCw size={32} className="text-red-500 animate-spin" />
                        <span className="text-gray-300">Scanning system logs...</span>
                    </div>
                )}

                {scanComplete && (
                    <div className="bg-black/20 rounded-lg p-6 border border-white/5 text-left animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3 mb-4 text-green-400">
                            <CheckCircle size={20} />
                            <span className="font-bold">Scan Complete - 1 Issue Found</span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white">Cyberpunk 2077 - GPU Driver Timeout</h4>
                                    <span className="text-xs text-gray-500">2 hours ago</span>
                                </div>
                                <p className="text-sm text-gray-300 mb-3">
                                    The game crashed because the graphics driver stopped responding. This is often caused by unstable overclocks or outdated drivers.
                                </p>
                                <div className="flex gap-3">
                                    <button className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded">
                                        Update Drivers
                                    </button>
                                    <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded">
                                        View Log File
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Recent Stability</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <span className="text-green-400 font-medium">Elden Ring</span>
                            <span className="text-xs text-green-500 bg-green-500/20 px-2 py-1 rounded">Stable</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <span className="text-green-400 font-medium">Valorant</span>
                            <span className="text-xs text-green-500 bg-green-500/20 px-2 py-1 rounded">Stable</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <span className="text-red-400 font-medium">Cyberpunk 2077</span>
                            <span className="text-xs text-red-500 bg-red-500/20 px-2 py-1 rounded">Crashed</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Common Fixes</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
                            <AlertOctagon size={14} className="text-orange-500" /> Verify Game Files Integrity
                        </li>
                        <li className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
                            <AlertOctagon size={14} className="text-orange-500" /> Clear DirectX Shader Cache
                        </li>
                        <li className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
                            <AlertOctagon size={14} className="text-orange-500" /> Reinstall Visual C++ Redistributables
                        </li>
                        <li className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
                            <AlertOctagon size={14} className="text-orange-500" /> Disable Fullscreen Optimizations
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

const DriverHealth = () => {
    return (
        <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 rounded-full text-green-400">
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">System Drivers Up to Date</h2>
                        <p className="text-green-400/80 text-sm">Last checked: Just now</p>
                    </div>
                </div>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">
                    Check for Updates
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-black rounded flex items-center justify-center border border-white/10">
                            <span className="font-bold text-green-500">NV</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">NVIDIA GeForce</h3>
                            <p className="text-xs text-gray-400">RTX 4090</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Installed:</span>
                            <span className="text-white">536.23</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Latest:</span>
                            <span className="text-white">536.23</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className="text-green-400">Healthy</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-black rounded flex items-center justify-center border border-white/10">
                            <span className="font-bold text-blue-500">INT</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Intel Chipset</h3>
                            <p className="text-xs text-gray-400">Z790</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Installed:</span>
                            <span className="text-white">10.1.19</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Latest:</span>
                            <span className="text-white">10.1.19</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className="text-green-400">Healthy</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LogViewer = () => {
    return (
        <div className="flex flex-col h-full bg-black/40 rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
            <div className="bg-slate-900/80 p-3 border-b border-white/5 flex justify-between items-center">
                <div className="flex gap-2">
                    <span className="px-2 py-1 bg-white/10 rounded text-gray-300">System</span>
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded">Application</span>
                    <span className="px-2 py-1 bg-white/10 rounded text-gray-300">Security</span>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="bg-black/40 border border-white/10 rounded-full pl-9 pr-4 py-1 text-xs text-white focus:outline-none focus:border-blue-500 w-48"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1 text-gray-300">
                <div className="flex gap-4 hover:bg-white/5 p-1 rounded">
                    <span className="text-gray-500 select-none">[10:42:15]</span>
                    <span className="text-blue-400">INFO</span>
                    <span>Application started successfully. Version 1.0.0</span>
                </div>
                <div className="flex gap-4 hover:bg-white/5 p-1 rounded">
                    <span className="text-gray-500 select-none">[10:42:16]</span>
                    <span className="text-blue-400">INFO</span>
                    <span>Connected to Discord RPC.</span>
                </div>
                <div className="flex gap-4 hover:bg-white/5 p-1 rounded">
                    <span className="text-gray-500 select-none">[10:42:18]</span>
                    <span className="text-yellow-400">WARN</span>
                    <span>Failed to load cover art for game id: 4421. Using placeholder.</span>
                </div>
                <div className="flex gap-4 hover:bg-white/5 p-1 rounded">
                    <span className="text-gray-500 select-none">[10:45:00]</span>
                    <span className="text-blue-400">INFO</span>
                    <span>Game launched: Cyberpunk 2077 (Steam)</span>
                </div>
                <div className="flex gap-4 hover:bg-white/5 p-1 rounded">
                    <span className="text-gray-500 select-none">[12:30:22]</span>
                    <span className="text-red-500">ERROR</span>
                    <span>Process terminated unexpectedly. Exit code: 0xC0000005</span>
                </div>
            </div>
        </div>
    );
};

export default Troubleshooter;
