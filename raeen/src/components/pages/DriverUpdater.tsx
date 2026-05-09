import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, RefreshCw, AlertTriangle, Cpu, MonitorSmartphone, Volume2, Network, ExternalLink } from 'lucide-react';

type DriverStatus = 'up-to-date' | 'update-available' | 'critical' | 'unknown';
type DriverKind = 'gpu' | 'chipset' | 'audio' | 'network';

interface DriverEntry {
  id: string;
  kind: DriverKind;
  vendor: string;
  device: string;
  current: string;
  latest: string;
  status: DriverStatus;
  releaseNotesUrl?: string;
  installerUrl?: string;
  size?: number;
}

const STORAGE_KEY = 'raeen.drivers.v1';

const seed = (): DriverEntry[] => ([
  { id: 'd_gpu',      kind: 'gpu',      vendor: 'NVIDIA',     device: 'GeForce RTX 4070',           current: '551.86',  latest: '566.14',   status: 'update-available', size: 800e6, releaseNotesUrl: 'https://www.nvidia.com/Download/index.aspx' },
  { id: 'd_chipset',  kind: 'chipset',  vendor: 'AMD',        device: 'Ryzen Chipset',              current: '5.10.0',  latest: '5.10.0',   status: 'up-to-date' },
  { id: 'd_audio',    kind: 'audio',    vendor: 'Realtek',    device: 'High Definition Audio',      current: '6.0.9285', latest: '6.0.9523', status: 'update-available', size: 220e6 },
  { id: 'd_net',      kind: 'network',  vendor: 'Intel',      device: 'Wi-Fi 6 AX211',              current: '22.180.0',latest: '22.260.0', status: 'critical',         size: 105e6 },
]);

const kindMeta: Record<DriverKind, { label: string; icon: React.ReactNode; tone: string }> = {
  gpu:     { label: 'GPU',     icon: <MonitorSmartphone size={16} />, tone: 'text-purple-300' },
  chipset: { label: 'Chipset', icon: <Cpu size={16} />,                tone: 'text-blue-300' },
  audio:   { label: 'Audio',   icon: <Volume2 size={16} />,            tone: 'text-pink-300' },
  network: { label: 'Network', icon: <Network size={16} />,            tone: 'text-cyan-300' },
};

const statusMeta: Record<DriverStatus, { label: string; color: string }> = {
  'up-to-date':       { label: 'Up to date',       color: 'text-green-300 bg-green-500/15 border-green-500/30' },
  'update-available': { label: 'Update available', color: 'text-blue-300 bg-blue-500/15 border-blue-500/30' },
  'critical':         { label: 'Critical update',  color: 'text-red-300 bg-red-500/15 border-red-500/30' },
  'unknown':          { label: 'Unknown',          color: 'text-gray-300 bg-gray-500/15 border-gray-500/30' },
};

const formatMb = (n?: number) => n ? `${(n / 1e6).toFixed(0)} MB` : '—';

const DriverUpdater: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverEntry[]>([]);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [autoUpdate, setAutoUpdate] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      setDrivers(cached ? JSON.parse(cached) : seed());
    } catch { setDrivers(seed()); }
    setAutoUpdate(localStorage.getItem('raeen.drivers.auto') === 'true');
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers)); }, [drivers]);
  useEffect(() => { localStorage.setItem('raeen.drivers.auto', String(autoUpdate)); }, [autoUpdate]);

  const summary = useMemo(() => {
    const updates = drivers.filter(d => d.status === 'update-available' || d.status === 'critical').length;
    const critical = drivers.filter(d => d.status === 'critical').length;
    const totalSize = drivers.filter(d => d.status !== 'up-to-date').reduce((s, d) => s + (d.size || 0), 0);
    return { updates, critical, totalSize };
  }, [drivers]);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const result = await window.ipcRenderer.invoke('drivers:check').catch(() => null);
      if (Array.isArray(result) && result.length) setDrivers(result);
    } finally {
      setChecking(false);
    }
  };

  const installDriver = async (id: string) => {
    setInstalling(prev => new Set(prev).add(id));
    try {
      await window.ipcRenderer.invoke('drivers:install', id).catch(() => {});
      await new Promise(r => setTimeout(r, 1200));
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, current: d.latest, status: 'up-to-date' } : d));
    } finally {
      setInstalling(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const installAll = async () => {
    const pending = drivers.filter(d => d.status === 'update-available' || d.status === 'critical');
    for (const d of pending) await installDriver(d.id);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">DRIVER UPDATER</h1>
          <p className="text-gray-400 font-medium">Keep gaming-critical drivers current — GPU, chipset, audio, network</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkForUpdates} disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-xl font-bold text-white transition">
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} /> {checking ? 'Checking…' : 'Check Updates'}
          </button>
          <button onClick={installAll} disabled={summary.updates === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-bold transition">
            <Download size={16} /> Install All ({summary.updates})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Drivers Tracked" value={`${drivers.length}`} icon={<Cpu size={18} />} />
        <Stat label="Updates Available" value={`${summary.updates}`} icon={<Download size={18} />} tone={summary.updates ? 'text-blue-300' : ''} />
        <Stat label="Critical" value={`${summary.critical}`} icon={<AlertTriangle size={18} />} tone={summary.critical ? 'text-red-300' : ''} />
        <Stat label="Download Size" value={formatMb(summary.totalSize)} icon={<Download size={18} />} />
      </div>

      <div className="glass-frosted rounded-2xl px-4 py-3 mb-6 flex items-center justify-between">
        <div>
          <div className="font-bold text-white text-sm">Auto-update gaming drivers</div>
          <div className="text-xs text-gray-400">Quietly download GPU/chipset updates and prompt before install.</div>
        </div>
        <Toggle value={autoUpdate} onChange={setAutoUpdate} />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6 space-y-2">
        {drivers.map(d => {
          const km = kindMeta[d.kind];
          const sm = statusMeta[d.status];
          const isInstalling = installing.has(d.id);
          return (
            <motion.div key={d.id} layout
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 ${km.tone}`}>{km.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase font-bold tracking-wider text-gray-500">{km.label}</span>
                  <span className="font-bold text-white truncate">{d.device}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {d.vendor} • Current <span className="text-gray-300 font-mono">{d.current}</span>
                  {d.status !== 'up-to-date' && <> → Latest <span className="text-blue-300 font-mono">{d.latest}</span></>}
                  {d.size ? <> • {formatMb(d.size)}</> : null}
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${sm.color}`}>{sm.label}</span>
              {d.releaseNotesUrl && (
                <button onClick={() => window.ipcRenderer.invoke('shell:openExternal', d.releaseNotesUrl)}
                  title="Release notes" className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white">
                  <ExternalLink size={14} />
                </button>
              )}
              {d.status === 'up-to-date' ? (
                <span className="text-green-300 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Latest
                </span>
              ) : (
                <button onClick={() => installDriver(d.id)} disabled={isInstalling}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg text-sm font-bold text-white transition">
                  {isInstalling ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  {isInstalling ? 'Installing…' : 'Install'}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; tone?: string }> = ({ icon, label, value, tone }) => (
  <div className="glass-frosted rounded-2xl p-4">
    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">{icon} {label}</div>
    <div className={`text-2xl font-black tracking-tight ${tone || 'text-white'}`}>{value}</div>
  </div>
);

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)}
    className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-white/10'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : ''}`} />
  </button>
);

export default DriverUpdater;
