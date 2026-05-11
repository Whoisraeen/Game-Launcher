import React, { useState } from 'react';
import { Palette, Check, Crown, Sparkles } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';

interface ThemePreset {
  id: string;
  name: string;
  accent: string;
  bgStyle: string;
  gradient: string;
  premium: boolean;
  category: 'dark' | 'vibrant' | 'minimal' | 'neon';
}

const THEME_PRESETS: ThemePreset[] = [
  { id: 'midnight-blue',   name: 'Midnight Blue',     accent: '#3b82f6', bgStyle: 'dark',    gradient: 'from-slate-900 via-blue-950 to-slate-900',        premium: false, category: 'dark' },
  { id: 'cyberpunk-pink',  name: 'Cyberpunk Pink',    accent: '#ec4899', bgStyle: 'dark',    gradient: 'from-gray-900 via-pink-950 to-purple-950',        premium: false, category: 'neon' },
  { id: 'forest-green',    name: 'Forest Green',      accent: '#22c55e', bgStyle: 'dark',    gradient: 'from-gray-900 via-emerald-950 to-gray-900',       premium: false, category: 'dark' },
  { id: 'sunset-orange',   name: 'Sunset Blaze',      accent: '#f97316', bgStyle: 'dark',    gradient: 'from-gray-900 via-orange-950 to-red-950',         premium: false, category: 'vibrant' },
  { id: 'arctic-ice',      name: 'Arctic Ice',        accent: '#06b6d4', bgStyle: 'dark',    gradient: 'from-slate-900 via-cyan-950 to-blue-950',         premium: false, category: 'minimal' },
  { id: 'royal-purple',    name: 'Royal Purple',      accent: '#8b5cf6', bgStyle: 'dark',    gradient: 'from-gray-900 via-violet-950 to-purple-950',      premium: true,  category: 'vibrant' },
  { id: 'blood-moon',      name: 'Blood Moon',        accent: '#ef4444', bgStyle: 'dark',    gradient: 'from-black via-red-950 to-gray-900',              premium: true,  category: 'dark' },
  { id: 'golden-hour',     name: 'Golden Hour',       accent: '#eab308', bgStyle: 'dark',    gradient: 'from-gray-900 via-yellow-950 to-amber-950',       premium: true,  category: 'vibrant' },
  { id: 'neon-synthwave',  name: 'Neon Synthwave',    accent: '#d946ef', bgStyle: 'dark',    gradient: 'from-indigo-950 via-purple-950 to-pink-950',      premium: true,  category: 'neon' },
  { id: 'deep-ocean',      name: 'Deep Ocean',        accent: '#0ea5e9', bgStyle: 'dark',    gradient: 'from-slate-950 via-sky-950 to-blue-950',          premium: false, category: 'dark' },
  { id: 'cherry-blossom',  name: 'Cherry Blossom',    accent: '#f472b6', bgStyle: 'dark',    gradient: 'from-gray-900 via-rose-950 to-pink-950',          premium: true,  category: 'vibrant' },
  { id: 'matrix-green',    name: 'Matrix',            accent: '#4ade80', bgStyle: 'dark',    gradient: 'from-black via-green-950 to-black',               premium: false, category: 'neon' },
  { id: 'aurora-borealis', name: 'Aurora Borealis',   accent: '#2dd4bf', bgStyle: 'dark',    gradient: 'from-blue-950 via-teal-950 to-emerald-950',       premium: true,  category: 'vibrant' },
  { id: 'stealth-dark',    name: 'Stealth',           accent: '#64748b', bgStyle: 'dark',    gradient: 'from-gray-950 via-slate-900 to-gray-950',         premium: false, category: 'minimal' },
  { id: 'volcanic-ember',  name: 'Volcanic Ember',    accent: '#fb923c', bgStyle: 'dark',    gradient: 'from-stone-950 via-orange-950 to-red-950',        premium: true,  category: 'neon' },
];

const CATEGORIES = ['all', 'dark', 'vibrant', 'minimal', 'neon'] as const;

// BUG-030: schema validation for theme manifests. Returns structured errors
// rather than throwing so callers (UI, future external-theme importer) can
// surface a clear message without crashing the renderer.
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const VALID_CATEGORIES = new Set<ThemePreset['category']>(['dark', 'vibrant', 'minimal', 'neon']);
const ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
function validateThemeManifest(t: any): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!t || typeof t !== 'object') return { ok: false, errors: ['Manifest must be an object'] };
  if (typeof t.id !== 'string' || !ID_RE.test(t.id))         errors.push('id must be lowercase kebab, ≤40 chars');
  if (typeof t.name !== 'string' || t.name.length > 60)      errors.push('name must be ≤60 chars');
  if (typeof t.accent !== 'string' || !HEX_RE.test(t.accent))errors.push('accent must be a hex color');
  if (typeof t.gradient !== 'string' || t.gradient.length > 200 || /[<>"'`]/.test(t.gradient)) errors.push('gradient must be a short Tailwind class string');
  if (typeof t.bgStyle !== 'string' || t.bgStyle.length > 16)errors.push('bgStyle must be a short token');
  if (typeof t.premium !== 'boolean')                        errors.push('premium must be boolean');
  if (!VALID_CATEGORIES.has(t.category))                     errors.push(`category must be one of: ${[...VALID_CATEGORIES].join(', ')}`);
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

const ThemeStore: React.FC = () => {
  const { settings, updateSetting } = useSettingsStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [applying, setApplying] = useState<string | null>(null);

  const currentAccent = settings?.appearance?.accentColor || '#4f46e5';

  const filtered = activeCategory === 'all'
    ? THEME_PRESETS
    : THEME_PRESETS.filter(t => t.category === activeCategory);

  const applyTheme = async (theme: ThemePreset) => {
    setApplying(theme.id);
    try {
      // BUG-030: validate the manifest shape before handing it to the global
      // theme system. A malformed theme (string id, missing accent, bad hex)
      // could otherwise crash the renderer or inject CSS via a bad gradient.
      const v = validateThemeManifest(theme);
      if (!v.ok) {
        console.warn('Theme manifest invalid:', v.errors);
        setApplying(null);
        return;
      }
      await updateSetting('appearance', {
        theme: theme.id as any,
        accentColor: theme.accent,
      });
    } finally {
      setTimeout(() => setApplying(null), 600);
    }
  };

  const currentTheme = settings?.appearance?.theme || 'dark';
  const isActive = (theme: ThemePreset) => currentTheme === theme.id || currentAccent === theme.accent;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">THEME STORE</h1>
          <p className="text-gray-400 font-medium">Personalize your launcher with curated color schemes</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
          <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ backgroundColor: currentAccent }} />
          <span className="text-xs font-bold text-gray-300">Current</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeCategory === cat
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Theme Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(theme => {
            const active = isActive(theme);
            return (
              <div
                key={theme.id}
                className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${
                  active
                    ? 'border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                    : 'border-white/5 hover:border-white/15'
                }`}
              >
                {/* Preview gradient */}
                <div className={`h-32 bg-gradient-to-br ${theme.gradient} relative`}>
                  {/* Accent dot preview */}
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <div className="w-6 h-6 rounded-lg shadow-lg" style={{ backgroundColor: theme.accent }} />
                    <div className="w-6 h-6 rounded-lg bg-white/10 backdrop-blur" />
                    <div className="w-6 h-6 rounded-lg bg-black/30 backdrop-blur" />
                  </div>

                  {theme.premium && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg">
                      <Crown size={10} className="text-yellow-400" />
                      <span className="text-[9px] font-bold text-yellow-300 uppercase tracking-wider">Pro</span>
                    </div>
                  )}

                  {active && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg">
                      <Check size={10} className="text-green-400" />
                      <span className="text-[9px] font-bold text-green-300 uppercase tracking-wider">Active</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white text-sm">{theme.name}</h3>
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{theme.category}</span>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-white/10" style={{ backgroundColor: theme.accent }} />
                  </div>

                  <button
                    onClick={() => applyTheme(theme)}
                    disabled={active || applying === theme.id}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-green-600/20 text-green-300 border border-green-500/30 cursor-default'
                        : applying === theme.id
                          ? 'bg-white/5 text-gray-400 border border-white/10'
                          : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {active ? (
                      <span className="flex items-center justify-center gap-1.5"><Check size={12} /> Applied</span>
                    ) : applying === theme.id ? (
                      <span className="flex items-center justify-center gap-1.5"><Sparkles size={12} className="animate-spin" /> Applying…</span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5"><Palette size={12} /> Apply Theme</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemeStore;
