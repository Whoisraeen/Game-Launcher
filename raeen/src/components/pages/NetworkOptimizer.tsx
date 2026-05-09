import React, { useState, useEffect } from 'react';
import { Wifi, RefreshCw, Globe, Shield, Zap, AlertCircle, CheckCircle, Trash2, Server, ArrowRight } from 'lucide-react';

interface PingResult {
    host: string;
    label: string;
    ip: string;
    latency: number;
    packetLoss: number;
    status: 'good' | 'fair' | 'poor' | 'timeout';
}

interface DnsInfo {
    currentServers: string[];
    recommended: { name: string; primary: string; secondary: string }[];
}

const NetworkOptimizer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ping' | 'dns'>('ping');
    const [pingResults, setPingResults] = useState<PingResult[]>([]);
    const [dnsInfo, setDnsInfo] = useState<DnsInfo | null>(null);
    const [testing, setTesting] = useState(false);
    const [flushing, setFlushing] = useState(false);
    const [flushResult, setFlushResult] = useState<string | null>(null);

    const runPingTest = async () => {
        setTesting(true);
        setPingResults([]);
        try {
            const results = await window.ipcRenderer.invoke('network:pingTest');
            setPingResults(results);
        } catch (e) {
            console.error('Ping test failed:', e);
        } finally {
            setTesting(false);
        }
    };

    const loadDnsInfo = async () => {
        try {
            const info = await window.ipcRenderer.invoke('network:getDnsInfo');
            setDnsInfo(info);
        } catch (e) {
            console.error('Failed to get DNS info:', e);
        }
    };

    const handleFlushDns = async () => {
        setFlushing(true);
        setFlushResult(null);
        try {
            const result = await window.ipcRenderer.invoke('network:flushDns');
            setFlushResult(result.success ? 'DNS cache flushed successfully!' : `Failed: ${result.output}`);
        } catch (e) {
            setFlushResult(`Error: ${e}`);
        } finally {
            setFlushing(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'dns') loadDnsInfo();
    }, [activeTab]);

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">NETWORK OPTIMIZER</h1>
                    <p className="text-sm text-gray-400">Test latency, optimize DNS, and reduce lag.</p>
                </div>
                <div className="flex bg-black/20 p-1 rounded-lg">
                    <TabButton active={activeTab === 'ping'} onClick={() => setActiveTab('ping')} icon={<Wifi size={16} />} label="Ping Test" />
                    <TabButton active={activeTab === 'dns'} onClick={() => setActiveTab('dns')} icon={<Globe size={16} />} label="DNS" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'ping' && <PingTab results={pingResults} testing={testing} onRun={runPingTest} />}
                {activeTab === 'dns' && (
                    <DnsTab
                        info={dnsInfo}
                        flushing={flushing}
                        flushResult={flushResult}
                        onFlush={handleFlushDns}
                        onReload={loadDnsInfo}
                    />
                )}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${active ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const PingTab = ({ results, testing, onRun }: { results: PingResult[]; testing: boolean; onRun: () => void }) => {
    const bestLatency = results.length > 0 ? Math.min(...results.filter(r => r.latency > 0).map(r => r.latency)) : 0;
    const avgLatency = results.length > 0
        ? Math.round(results.filter(r => r.latency > 0).reduce((s, r) => s + r.latency, 0) / Math.max(results.filter(r => r.latency > 0).length, 1))
        : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Start button */}
            <div className="bg-slate-800/30 rounded-2xl p-8 border border-white/5 text-center">
                <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wifi size={40} className="text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Latency Test</h2>
                <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                    Ping popular game server regions and DNS providers to measure your connection quality.
                </p>
                <button
                    onClick={onRun}
                    disabled={testing}
                    className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl font-bold transition-colors inline-flex items-center gap-2"
                >
                    {testing ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
                    {testing ? 'Testing…' : 'Run Ping Test'}
                </button>
            </div>

            {/* Summary */}
            {results.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <StatCard label="Best Latency" value={`${bestLatency}ms`} color="text-green-400" />
                    <StatCard label="Average" value={`${avgLatency}ms`} color="text-yellow-400" />
                    <StatCard label="Servers Tested" value={String(results.length)} color="text-cyan-400" />
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1">Results</h3>
                    {results.map((r, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                            <div className={`w-3 h-3 rounded-full ${
                                r.status === 'good' ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' :
                                r.status === 'fair' ? 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]' :
                                r.status === 'poor' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' :
                                'bg-gray-600'
                            }`} />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white">{r.label}</div>
                                <div className="text-xs text-gray-500">{r.ip}</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-lg font-black tabular-nums ${
                                    r.latency === -1 ? 'text-gray-600' :
                                    r.latency <= 30 ? 'text-green-400' :
                                    r.latency <= 80 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {r.latency === -1 ? 'Timeout' : `${r.latency}ms`}
                                </div>
                                {r.packetLoss > 0 && (
                                    <div className="text-[10px] text-red-400">{r.packetLoss}% loss</div>
                                )}
                            </div>
                            {/* Latency bar */}
                            <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        r.latency === -1 ? 'bg-gray-600' :
                                        r.latency <= 30 ? 'bg-green-500' :
                                        r.latency <= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${r.latency === -1 ? 100 : Math.min((r.latency / 200) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const DnsTab = ({ info, flushing, flushResult, onFlush, onReload }: {
    info: DnsInfo | null; flushing: boolean; flushResult: string | null;
    onFlush: () => void; onReload: () => void;
}) => (
    <div className="max-w-3xl mx-auto space-y-6">
        {/* Current DNS */}
        <div className="bg-slate-800/30 rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Server size={18} className="text-cyan-400" />
                    Current DNS Servers
                </h3>
                <button onClick={onReload} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                    <RefreshCw size={14} />
                </button>
            </div>
            {info?.currentServers && info.currentServers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {info.currentServers.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white/5 rounded-lg text-sm font-mono text-white border border-white/10">{s}</span>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-500">Unable to detect current DNS servers.</p>
            )}
        </div>

        {/* Flush DNS */}
        <div className="bg-slate-800/30 rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Trash2 size={18} className="text-orange-400" />
                        Flush DNS Cache
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">Clear the local DNS resolver cache to fix stale lookups.</p>
                </div>
                <button
                    onClick={onFlush}
                    disabled={flushing}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors"
                >
                    {flushing ? 'Flushing…' : 'Flush DNS'}
                </button>
            </div>
            {flushResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${
                    flushResult.includes('success') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                    {flushResult}
                </div>
            )}
        </div>

        {/* Recommended DNS */}
        <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Recommended DNS Providers</h3>
            <div className="space-y-2">
                {info?.recommended.map((r, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                        <Shield size={20} className="text-cyan-400 shrink-0" />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-white">{r.name}</div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-mono text-gray-300">
                            <span className="px-2 py-1 bg-white/5 rounded">{r.primary}</span>
                            <ArrowRight size={12} className="text-gray-600" />
                            <span className="px-2 py-1 bg-white/5 rounded">{r.secondary}</span>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-600 mt-3 px-1">
                To change DNS: Settings → Network → Change adapter options → IPv4 Properties → Preferred DNS server
            </p>
        </div>
    </div>
);

const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5 text-center">
        <div className={`text-2xl font-black ${color} tabular-nums`}>{value}</div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
);

export default NetworkOptimizer;
