import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Save, Trash2, Plus, Eye, EyeOff } from 'lucide-react';

type Shape = 'plus' | 'dot' | 'circle' | 'tshape' | 'chevron';

interface CrosshairConfig {
  id: string;
  name: string;
  shape: Shape;
  color: string;
  outline: boolean;
  outlineColor: string;
  thickness: number;
  length: number;
  gap: number;
  dotSize: number;
  opacity: number;
  showOnDesktop: boolean;
}

const DEFAULTS: CrosshairConfig = {
  id: 'default',
  name: 'Default',
  shape: 'plus',
  color: '#00ff88',
  outline: true,
  outlineColor: '#000000',
  thickness: 2,
  length: 8,
  gap: 4,
  dotSize: 2,
  opacity: 1,
  showOnDesktop: false,
};

const STORAGE_KEY = 'raeen.crosshair.v1';

const CrosshairOverlay: React.FC = () => {
  const [profiles, setProfiles] = useState<CrosshairConfig[]>([DEFAULTS]);
  const [activeId, setActiveId] = useState<string>('default');
  const [config, setConfig] = useState<CrosshairConfig>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setProfiles(data.profiles || [DEFAULTS]);
        setActiveId(data.activeId || 'default');
        const found = data.profiles?.find((p: CrosshairConfig) => p.id === (data.activeId || 'default'));
        if (found) setConfig(found);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeId }));
  }, [profiles, activeId]);

  useEffect(() => {
    // Try to drive a real overlay window if exposed via IPC
    window.ipcRenderer.invoke('crosshair:apply', config).catch(() => {});
  }, [config]);

  const update = <K extends keyof CrosshairConfig>(key: K, value: CrosshairConfig[K]) => {
    setConfig(prev => {
      const next = { ...prev, [key]: value };
      setProfiles(p => p.map(x => x.id === next.id ? next : x));
      return next;
    });
  };

  const newProfile = () => {
    const id = `c_${Date.now()}`;
    const p: CrosshairConfig = { ...config, id, name: `Profile ${profiles.length + 1}` };
    setProfiles(prev => [...prev, p]);
    setActiveId(id);
    setConfig(p);
  };

  const deleteProfile = (id: string) => {
    if (profiles.length <= 1) return;
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeId === id) {
      const next = profiles.find(p => p.id !== id)!;
      setActiveId(next.id);
      setConfig(next);
    }
  };

  const switchProfile = (id: string) => {
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    setActiveId(id);
    setConfig(p);
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `crosshair-${config.name.replace(/\s+/g, '_')}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">CROSSHAIR</h1>
          <p className="text-gray-400 font-medium">Build a custom universal crosshair overlay</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => update('showOnDesktop', !config.showOnDesktop)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${config.showOnDesktop ? 'bg-green-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {config.showOnDesktop ? <Eye size={16} /> : <EyeOff size={16} />}
            {config.showOnDesktop ? 'Overlay On' : 'Overlay Off'}
          </button>
          <button onClick={exportConfig} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white">
            <Save size={16} /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Preview */}
        <div className="lg:col-span-2 glass-frosted rounded-2xl p-4 flex flex-col">
          <div className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-3">Live Preview</div>
          <div className="flex-1 rounded-xl overflow-hidden relative bg-[url('https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1716740/library_hero.jpg')] bg-cover bg-center min-h-[400px]">
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <CrosshairPreview config={config} />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-frosted rounded-2xl p-4 flex flex-col overflow-hidden">
          {/* Profiles */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Profiles</span>
              <button onClick={newProfile} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"><Plus size={14} /></button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {profiles.map(p => (
                <div key={p.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${activeId === p.id ? 'bg-blue-600/15 border border-blue-500/30' : 'hover:bg-white/5'}`}
                  onClick={() => switchProfile(p.id)}>
                  <Crosshair size={12} style={{ color: p.color }} />
                  <input
                    value={p.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, name } : x));
                      if (activeId === p.id) setConfig(c => ({ ...c, name }));
                    }}
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                  />
                  {profiles.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }} className="text-gray-500 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
            <Field label="Shape">
              <div className="grid grid-cols-5 gap-1">
                {(['plus','dot','circle','tshape','chevron'] as Shape[]).map(s => (
                  <button key={s} onClick={() => update('shape', s)}
                    className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition ${config.shape === s ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200' : 'border border-white/10 text-gray-400 hover:text-white'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Color">
              <div className="flex items-center gap-2">
                <input type="color" value={config.color} onChange={(e) => update('color', e.target.value)} className="w-10 h-9 rounded cursor-pointer bg-transparent" />
                <input type="text" value={config.color} onChange={(e) => update('color', e.target.value)} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm" />
              </div>
            </Field>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Outline</span>
              <Toggle value={config.outline} onChange={(v) => update('outline', v)} />
            </div>

            {config.outline && (
              <Field label="Outline Color">
                <input type="color" value={config.outlineColor} onChange={(e) => update('outlineColor', e.target.value)} className="w-full h-9 rounded cursor-pointer bg-transparent" />
              </Field>
            )}

            <Slider label="Thickness" value={config.thickness} min={1} max={10} onChange={(v) => update('thickness', v)} />
            <Slider label="Length" value={config.length} min={2} max={30} onChange={(v) => update('length', v)} />
            <Slider label="Gap" value={config.gap} min={0} max={20} onChange={(v) => update('gap', v)} />
            <Slider label="Dot size" value={config.dotSize} min={0} max={10} onChange={(v) => update('dotSize', v)} />
            <Slider label="Opacity" value={Math.round(config.opacity * 100)} min={10} max={100} step={5}
              onChange={(v) => update('opacity', v / 100)} format={(v) => `${v}%`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const CrosshairPreview: React.FC<{ config: CrosshairConfig; size?: number }> = ({ config, size = 80 }) => {
  const { shape, color, outline, outlineColor, thickness, length, gap, dotSize, opacity } = config;
  const half = size / 2;
  const stroke = outline ? outlineColor : 'transparent';
  const strokeWidth = outline ? 1 : 0;

  return (
    <svg width={size} height={size} style={{ opacity }} className="drop-shadow-lg">
      {(shape === 'plus' || shape === 'tshape') && (
        <>
          {/* horizontal */}
          <rect x={half - gap - length} y={half - thickness / 2} width={length} height={thickness} fill={color} stroke={stroke} strokeWidth={strokeWidth} />
          <rect x={half + gap} y={half - thickness / 2} width={length} height={thickness} fill={color} stroke={stroke} strokeWidth={strokeWidth} />
          {/* vertical (top suppressed for T shape) */}
          {shape === 'plus' && (
            <rect x={half - thickness / 2} y={half - gap - length} width={thickness} height={length} fill={color} stroke={stroke} strokeWidth={strokeWidth} />
          )}
          <rect x={half - thickness / 2} y={half + gap} width={thickness} height={length} fill={color} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )}
      {shape === 'circle' && (
        <circle cx={half} cy={half} r={length} fill="none" stroke={color} strokeWidth={thickness} />
      )}
      {shape === 'chevron' && (
        <polyline points={`${half - length},${half + length / 2} ${half},${half - length / 2} ${half + length},${half + length / 2}`}
          fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {dotSize > 0 && <circle cx={half} cy={half} r={dotSize} fill={color} stroke={stroke} strokeWidth={strokeWidth / 2} />}
    </svg>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }> = ({ label, value, min, max, step = 1, onChange, format }) => (
  <div>
    <div className="flex justify-between mb-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</label>
      <span className="text-xs text-white font-mono">{format ? format(value) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-blue-500" />
  </div>
);

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-white/10'}`}>
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
  </button>
);

export default CrosshairOverlay;
