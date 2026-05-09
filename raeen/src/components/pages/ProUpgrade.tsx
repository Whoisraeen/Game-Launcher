import React, { useEffect, useState } from 'react';
import { Crown, Check, X, Zap, Shield, Cloud, Palette, BarChart2, Gamepad2, ExternalLink } from 'lucide-react';

interface LicenseStatus {
  isPro: boolean;
  licenseKey: string | null;
  activatedAt: string | null;
}

const FREE_FEATURES = [
  'Game library management',
  'Basic performance overlay',
  'Screenshot manager',
  'Mod management',
  'Friend list & chat',
  'Basic analytics',
];

const PRO_FEATURES = [
  { icon: <Palette size={16} />, title: 'Premium Themes', desc: 'Exclusive color schemes & visual presets' },
  { icon: <Cloud size={16} />,   title: 'Unlimited Cloud Sync', desc: 'Sync saves, settings & screenshots across devices' },
  { icon: <BarChart2 size={16} />, title: 'Advanced Analytics', desc: 'Deep playtime insights, trends & reports' },
  { icon: <Shield size={16} />,  title: 'Priority Support', desc: 'Fast-track issue resolution & feature requests' },
  { icon: <Zap size={16} />,     title: 'Performance Profiles', desc: 'Auto-tune per-game graphics settings' },
  { icon: <Gamepad2 size={16} />, title: 'Clan Management', desc: 'Create clans, manage teams & schedule events' },
];

const COMPARISON: { feature: string; free: boolean | string; pro: boolean | string }[] = [
  { feature: 'Game Library',         free: true,           pro: true },
  { feature: 'Platform Scanners',    free: '3 platforms',  pro: 'Unlimited' },
  { feature: 'Cloud Sync Storage',   free: '500 MB',       pro: '10 GB' },
  { feature: 'Performance Overlay',  free: 'Basic',        pro: 'Advanced' },
  { feature: 'Themes',              free: '8 free themes', pro: 'All 15+ themes' },
  { feature: 'Analytics & Reports',  free: 'Basic',        pro: 'Full history' },
  { feature: 'Clan System',         free: false,           pro: true },
  { feature: 'Priority Support',    free: false,           pro: true },
  { feature: 'Auto Performance Tune', free: false,         pro: true },
  { feature: 'Custom Widgets',      free: '4 widgets',     pro: 'Unlimited' },
];

const ProUpgrade: React.FC = () => {
  const [license, setLicense] = useState<LicenseStatus>({ isPro: false, licenseKey: null, activatedAt: null });
  const [keyInput, setKeyInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.ipcRenderer.invoke('license:getStatus').then(setLicense).catch(() => {});
  }, []);

  const handleActivate = async () => {
    if (!keyInput.trim()) return;
    setActivating(true);
    setError('');
    try {
      const result = await window.ipcRenderer.invoke('license:activate', keyInput.trim());
      setLicense(result);
      if (!result.isPro) setError('Invalid license key');
    } catch {
      setError('Activation failed. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const handleUpgradeClick = () => {
    window.ipcRenderer.invoke('shell:openExternal', 'https://raeen.app/pro');
  };

  if (license.isPro) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="mb-6">
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">RAEEN PRO</h1>
          <p className="text-gray-400 font-medium">You're on the Pro plan</p>
        </div>
        <div className="glass-frosted rounded-2xl p-6 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Crown size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Pro Active</h2>
              <p className="text-sm text-gray-400">
                Activated {license.activatedAt ? new Date(license.activatedAt).toLocaleDateString() : 'recently'}
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-gray-500 bg-black/20 rounded-lg px-3 py-2">
            License: {license.licenseKey?.replace(/./g, '•').slice(0, -4)}{license.licenseKey?.slice(-4)}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3">
          {PRO_FEATURES.map((f, i) => (
            <div key={i} className="glass-frosted rounded-xl p-4 border border-white/5">
              <div className="text-yellow-400 mb-2">{f.icon}</div>
              <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
      {/* Hero */}
      <div className="text-center py-10 mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full mb-6">
          <Crown size={16} className="text-yellow-400" />
          <span className="text-sm font-bold text-yellow-300">Upgrade to Pro</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
          Unlock the Full<br />
          <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Raeen Experience</span>
        </h1>
        <p className="text-gray-400 max-w-lg mx-auto">
          Premium themes, unlimited cloud sync, advanced analytics, and more.
          Take your gaming setup to the next level.
        </p>
      </div>

      {/* Pro Features */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {PRO_FEATURES.map((f, i) => (
          <div key={i} className="glass-frosted rounded-xl p-4 border border-white/5 hover:border-yellow-500/20 transition-colors group">
            <div className="text-yellow-400 mb-2 group-hover:scale-110 transition-transform">{f.icon}</div>
            <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="glass-frosted rounded-2xl border border-white/5 overflow-hidden mb-8">
        <div className="grid grid-cols-3 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          <span>Feature</span>
          <span className="text-center">Free</span>
          <span className="text-center text-yellow-400">Pro</span>
        </div>
        {COMPARISON.map((row, i) => (
          <div key={i} className="grid grid-cols-3 px-4 py-3 border-t border-white/5 text-sm items-center">
            <span className="text-gray-300">{row.feature}</span>
            <div className="flex justify-center">
              {typeof row.free === 'boolean' ? (
                row.free ? <Check size={16} className="text-green-400" /> : <X size={16} className="text-gray-600" />
              ) : (
                <span className="text-gray-400 text-xs">{row.free}</span>
              )}
            </div>
            <div className="flex justify-center">
              {typeof row.pro === 'boolean' ? (
                row.pro ? <Check size={16} className="text-yellow-400" /> : <X size={16} className="text-gray-600" />
              ) : (
                <span className="text-yellow-300 text-xs font-medium">{row.pro}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA + License Input */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <button
          onClick={handleUpgradeClick}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black rounded-xl text-lg shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all hover:shadow-[0_0_40px_rgba(234,179,8,0.5)]"
        >
          <Crown size={20} /> Get Raeen Pro <ExternalLink size={14} />
        </button>
        <span className="text-xs text-gray-500">One-time purchase • No subscriptions</span>
      </div>

      {/* Activate Key */}
      <div className="glass-frosted rounded-2xl p-6 border border-white/5">
        <h3 className="font-bold text-white mb-3">Already have a license key?</h3>
        <div className="flex gap-2">
          <input
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="RAEEN-PRO-XXXX-XXXX"
            className="flex-1 px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/40"
          />
          <button
            onClick={handleActivate}
            disabled={activating || !keyInput.trim()}
            className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition-colors text-sm"
          >
            {activating ? 'Activating…' : 'Activate'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default ProUpgrade;
