import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Mic, RefreshCw, CheckCircle, AlertCircle, Speaker } from 'lucide-react';

interface AudioDevice {
    id: string;
    name: string;
    type: 'playback' | 'recording';
    status: string;
    isDefault: boolean;
}

const AudioSwitcher: React.FC = () => {
    const [devices, setDevices] = useState<AudioDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [filter, setFilter] = useState<'all' | 'playback' | 'recording'>('all');

    const loadDevices = async () => {
        setLoading(true);
        try {
            const data = await window.ipcRenderer.invoke('audio:getDevices');
            setDevices(data);
        } catch (e) {
            console.error('Failed to load audio devices:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadDevices(); }, []);

    const handleSetDefault = async (deviceId: string) => {
        setSwitching(deviceId);
        setMessage(null);
        try {
            const result = await window.ipcRenderer.invoke('audio:setDefault', deviceId);
            if (result.success) {
                setMessage({ type: 'success', text: 'Default device changed successfully.' });
                await loadDevices();
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to set default device.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: String(e) });
        } finally {
            setSwitching(null);
        }
    };

    const filtered = devices.filter(d => filter === 'all' || d.type === filter);
    const playbackCount = devices.filter(d => d.type === 'playback').length;
    const recordingCount = devices.filter(d => d.type === 'recording').length;

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">AUDIO SWITCHER</h1>
                    <p className="text-sm text-gray-400">Manage and switch between audio devices.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={devices.length} />
                        <FilterBtn active={filter === 'playback'} onClick={() => setFilter('playback')} label="Playback" count={playbackCount} />
                        <FilterBtn active={filter === 'recording'} onClick={() => setFilter('recording')} label="Recording" count={recordingCount} />
                    </div>
                    <button
                        onClick={loadDevices}
                        disabled={loading}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {message && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 border ${
                        message.type === 'success'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm">{message.text}</span>
                    </div>
                )}

                {loading && devices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <RefreshCw size={32} className="animate-spin mb-4" />
                        <p className="text-sm">Scanning audio devices…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <VolumeX size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-semibold text-gray-400">No devices found</p>
                        <p className="text-sm mt-1">Try refreshing or check your audio connections.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 max-w-3xl mx-auto">
                        {filtered.map(device => (
                            <div
                                key={device.id}
                                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 ${
                                    device.isDefault
                                        ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    device.isDefault ? 'bg-blue-500/20' : 'bg-white/5'
                                }`}>
                                    {device.type === 'recording'
                                        ? <Mic size={22} className={device.isDefault ? 'text-blue-400' : 'text-gray-400'} />
                                        : <Speaker size={22} className={device.isDefault ? 'text-blue-400' : 'text-gray-400'} />
                                    }
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-white truncate">{device.name}</h3>
                                        {device.isDefault && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 uppercase tracking-wider">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-gray-500 capitalize">{device.type}</span>
                                        <span className={`text-xs ${device.status === 'OK' || device.status === 'Active' ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {device.status}
                                        </span>
                                    </div>
                                </div>

                                {!device.isDefault && (
                                    <button
                                        onClick={() => handleSetDefault(device.id)}
                                        disabled={switching === device.id}
                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait whitespace-nowrap"
                                    >
                                        {switching === device.id ? 'Switching…' : 'Set Default'}
                                    </button>
                                )}
                                {device.isDefault && (
                                    <CheckCircle size={20} className="text-blue-400 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const FilterBtn = ({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
    >
        {label}
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-white/20' : 'bg-white/5'}`}>{count}</span>
    </button>
);

export default AudioSwitcher;
