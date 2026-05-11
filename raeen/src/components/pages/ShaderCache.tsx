import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, RefreshCw, Trash2, AlertTriangle, ShieldCheck, Zap, FolderOpen } from 'lucide-react';

type CacheStatus = 'healthy' | 'large' | 'corrupt' | 'empty';

interface ShaderCacheEntry {
  id: string;
  game: string;
  platform: 'Steam' | 'Epic' | 'GOG' | 'NVIDIA' | 'AMD' | 'DirectX';
  path: string;
  sizeBytes: number;
  fileCount: number;
  lastModified: number;
  status: CacheStatus;
}

const STORAGE_KEY = 'raeen.shadercache.v1';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};

const statusMeta: Record<CacheStatus, { label: string; color: string; icon: React.ReactNode }> = {
  healthy: { label: 'Healthy', color: 'text-green-400 bg-green-500/15 border-green-500/30',     icon: <ShieldCheck size={12} /> },
  large:   { label: 'Large',   color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30', icon: <HardDrive size={12} /> },
  corrupt: { label: 'Corrupt', color: 'text-red-400 bg-red-500/15 border-red-500/30',         icon: <AlertTriangle size={12} /> },
  empty:   { label: 'Empty',   color: 'text-gray-400 bg-gray-500/15 border-gray-500/30',      icon: <Zap size={12} /> },
};

const ShaderCache: React.FC = () => {
  const [entries, setEntries] = useState<ShaderCacheEntry[]>([]);
  const [persistReady, setPersistReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<CacheStatus | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ipcRows = await window.ipcRenderer.invoke('shaderCache:scan').catch(() => []);
      if (cancelled) return;
      if (Array.isArray(ipcRows) && ipcRows.length > 0) {
        setEntries(ipcRows as ShaderCacheEntry[]);
      } else {
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) setEntries(JSON.parse(cached));
        } catch {
          setEntries([]);
        }
      }
      setPersistReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!persistReady) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, persistReady]);

  const filtered = useMemo(() => filter === 'all' ? entries : entries.filter(e => e.status === filter), [entries, filter]);
  const totals = useMemo(() => {
    const totalSize = entries.reduce((s, e) => s + e.sizeBytes, 0);
    const corrupt = entries.filter(e => e.status === 'corrupt').length;
    const large = entries.filter(e => e.status === 'large').length;
    return { totalSize, corrupt, large, count: entries.length };
  }, [entries]);

  const scan = async () => {
    setScanning(true);
    try {
      const result = await window.ipcRenderer.invoke('shaderCache:scan').catch(() => null);
      if (Array.isArray(result) && result.length) {
        setEntries(result as ShaderCacheEntry[]);
      }
    } finally {
      setScanning(false);
    }
  };

  const clear = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Clear ${ids.length} shader cache${ids.length === 1 ? '' : 's'}? Games will rebuild caches on next launch.`)) return;
    await window.ipcRenderer.invoke('shaderCache:clear', ids).catch(() => {});
    setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, sizeBytes: 0, fileCount: 0, status: 'empty' } : e));
    setSelected(new Set());
  };

  const repair = async (id: string) => {
    await window.ipcRenderer.invoke('shaderCache:repair', id).catch(() => {});
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'healthy' } : e));
  };

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">SHADER CACHE</h1>
          <p className="text-gray-400 font-medium">Inspect, repair, and clear per-game shader caches</p>
        </div>
        <div className="flex gap-2">
          <button onClick={scan} disabled={scanning} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-xl font-bold text-white transition">
            <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} /> {scanning ? 'Scanning…' : 'Scan System'}
          </button>
          <button onClick={() => clear([...selected])} disabled={!selected.size}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-bold text-white transition">
            <Trash2 size={16} /> Clear Selected
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat icon={<HardDrive size={18} />} label="Total Size" value={formatBytes(totals.totalSize)} />
        <Stat icon={<HardDrive size={18} />} label="Caches" value={`${totals.count}`} />
        <Stat icon={<HardDrive size={18} />} label="Large" value={`${totals.large}`} tone="text-yellow-300" />
        <Stat icon={<AlertTriangle size={18} />} label="Corrupt" value={`${totals.corrupt}`} tone={totals.corrupt > 0 ? 'text-red-300' : ''} />
      </div>

      {/* Visual size bar */}
      <div className="glass-frosted rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Cache footprint</span>
          <span className="text-xs text-gray-500">{formatBytes(totals.totalSize)}</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
          {totals.totalSize > 0 && entries.filter(e => e.sizeBytes > 0).map((e, i) => (
            <div
              key={e.id}
              title={`${e.game}: ${formatBytes(e.sizeBytes)}`}
              style={{ width: `${(e.sizeBytes / totals.totalSize) * 100}%` }}
              className={['bg-blue-500','bg-purple-500','bg-pink-500','bg-cyan-500','bg-amber-500','bg-emerald-500','bg-fuchsia-500'][i % 7]}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <FilterPill label="All" active={filter === 'all'} onClick={() => setFilter('all')} count={entries.length} />
        {(Object.keys(statusMeta) as CacheStatus[]).map(s => (
          <FilterPill key={s} label={statusMeta[s].label} active={filter === s} onClick={() => setFilter(s)}
            count={entries.filter(e => e.status === s).length} tone={statusMeta[s].color} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6 space-y-2">
        {filtered.map(e => {
          const meta = statusMeta[e.status];
          return (
            <motion.div key={e.id} layout
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition">
              <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} className="accent-blue-500 ml-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-white truncate">{e.game}</span>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">{e.platform}</span>
                </div>
                <div className="text-xs text-gray-500 truncate font-mono">{e.path}</div>
              </div>
              <div className="hidden md:block text-right">
                <div className="text-sm font-bold text-white">{formatBytes(e.sizeBytes)}</div>
                <div className="text-[10px] text-gray-500">{e.fileCount.toLocaleString()} files</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 ${meta.color}`}>
                {meta.icon} {meta.label}
              </span>
              <button onClick={() => window.ipcRenderer.invoke('shell:openPath', e.path).catch(() => {})}
                title="Open folder" className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
                <FolderOpen size={14} />
              </button>
              {e.status === 'corrupt' && (
                <button onClick={() => repair(e.id)} title="Rebuild"
                  className="p-2 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/30 text-yellow-300">
                  <RefreshCw size={14} />
                </button>
              )}
              <button onClick={() => clear([e.id])} title="Clear"
                className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-center py-8 text-sm">
            {entries.length === 0
              ? 'No shader caches loaded yet — click Scan System to detect NVIDIA/AMD/DirectX and Steam locations.'
              : 'No caches match this filter.'}
          </p>
        )}
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

const FilterPill: React.FC<{ label: string; count: number; active: boolean; onClick: () => void; tone?: string }> = ({ label, count, active, onClick, tone }) => (
  <button onClick={onClick}
    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${active ? (tone || 'text-white bg-white/10 border-white/20') : 'text-gray-400 border-white/5 hover:border-white/15 hover:text-white'}`}>
    {label} <span className="opacity-60 ml-1">{count}</span>
  </button>
);

export default ShaderCache;
