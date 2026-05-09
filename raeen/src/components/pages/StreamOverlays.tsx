import React, { useState } from 'react';
import { Tv2, Copy, Check, Palette, Layout, Monitor, AlertCircle, Download } from 'lucide-react';

interface OverlayTemplate {
    id: string;
    name: string;
    description: string;
    type: 'webcam-frame' | 'game-info' | 'alerts' | 'lower-third';
}

interface TemplateSettings {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    textColor: string;
    opacity: number;
    borderWidth: number;
    borderRadius: number;
    gameName: string;
    streamerName: string;
    fontSize: number;
}

const TEMPLATES: OverlayTemplate[] = [
    { id: 'webcam', name: 'Webcam Frame', description: 'Decorative border around your webcam capture', type: 'webcam-frame' },
    { id: 'gameinfo', name: 'Game Info Bar', description: 'Bottom bar showing game name and streamer info', type: 'game-info' },
    { id: 'alerts', name: 'Alert Box', description: 'Notification popup for follows, subs, and donations', type: 'alerts' },
    { id: 'lowerthird', name: 'Lower Third', description: 'Professional lower-third name tag overlay', type: 'lower-third' },
];

const DEFAULT_SETTINGS: TemplateSettings = {
    primaryColor: '#6366f1',
    secondaryColor: '#1a1a2e',
    accentColor: '#f59e0b',
    textColor: '#ffffff',
    opacity: 0.9,
    borderWidth: 3,
    borderRadius: 12,
    gameName: 'Elden Ring',
    streamerName: 'YourName',
    fontSize: 16,
};

const StreamOverlays: React.FC = () => {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('webcam');
    const [settings, setSettings] = useState<TemplateSettings>(DEFAULT_SETTINGS);
    const [copied, setCopied] = useState(false);

    const update = <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const generateOverlayHTML = (): string => {
        const template = TEMPLATES.find(t => t.id === selectedTemplate);
        if (!template) return '';

        const baseStyle = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: transparent; overflow: hidden; font-family: Inter, sans-serif; }`;

        switch (template.type) {
            case 'webcam-frame':
                return `<!DOCTYPE html><html><head><style>
${baseStyle}
.frame {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 320px; height: 240px;
  border: ${settings.borderWidth}px solid ${settings.primaryColor};
  border-radius: ${settings.borderRadius}px;
  box-shadow: 0 0 20px ${settings.primaryColor}44, inset 0 0 20px ${settings.primaryColor}22;
  opacity: ${settings.opacity};
}
.frame::before {
  content: ''; position: absolute; top: -8px; left: -8px; right: -8px; bottom: -8px;
  border: 1px solid ${settings.accentColor}44;
  border-radius: ${settings.borderRadius + 4}px;
}
.name-tag {
  position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%);
  background: ${settings.secondaryColor}ee;
  color: ${settings.textColor};
  padding: 4px 16px; border-radius: 4px;
  font-size: 12px; font-weight: bold;
  border: 1px solid ${settings.primaryColor}66;
}
</style></head><body>
<div class="frame"><div class="name-tag">${settings.streamerName}</div></div>
</body></html>`;

            case 'game-info':
                return `<!DOCTYPE html><html><head><style>
${baseStyle}
.bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 48px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  background: linear-gradient(90deg, ${settings.secondaryColor}${Math.round(settings.opacity * 255).toString(16).padStart(2, '0')}, ${settings.primaryColor}${Math.round(settings.opacity * 0.5 * 255).toString(16).padStart(2, '0')});
  border-top: 2px solid ${settings.primaryColor};
  color: ${settings.textColor}; font-size: ${settings.fontSize}px;
}
.game { font-weight: bold; }
.streamer { opacity: 0.8; font-size: ${settings.fontSize - 2}px; }
.accent-dot { width: 8px; height: 8px; border-radius: 50%; background: ${settings.accentColor}; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style></head><body>
<div class="bar">
  <div class="game">🎮 ${settings.gameName}</div>
  <div style="display:flex;align-items:center;gap:8px;"><div class="accent-dot"></div><span class="streamer">${settings.streamerName}</span></div>
</div>
</body></html>`;

            case 'alerts':
                return `<!DOCTYPE html><html><head><style>
${baseStyle}
.alert {
  position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
  background: ${settings.secondaryColor}ee;
  border: 2px solid ${settings.primaryColor};
  border-radius: ${settings.borderRadius}px;
  padding: 20px 40px; text-align: center;
  color: ${settings.textColor}; font-size: ${settings.fontSize}px;
  box-shadow: 0 8px 32px ${settings.primaryColor}44;
  animation: alertIn 0.5s ease-out;
  opacity: ${settings.opacity};
}
.alert-title { font-weight: bold; font-size: ${settings.fontSize + 4}px; color: ${settings.accentColor}; margin-bottom: 8px; }
@keyframes alertIn { from { transform: translateX(-50%) scale(0.8); opacity: 0; } to { transform: translateX(-50%) scale(1); opacity: 1; } }
</style></head><body>
<div class="alert">
  <div class="alert-title">🎉 New Follower!</div>
  <div>Username just followed!</div>
</div>
<script>
// Connect to your alert service and call showAlert(type, username)
</script>
</body></html>`;

            case 'lower-third':
                return `<!DOCTYPE html><html><head><style>
${baseStyle}
.lower-third {
  position: fixed; bottom: 80px; left: 40px;
  display: flex; align-items: stretch; opacity: ${settings.opacity};
  animation: slideIn 0.6s ease-out;
}
.accent-bar { width: 4px; background: ${settings.accentColor}; border-radius: 2px; }
.content { margin-left: 12px; }
.name { font-size: ${settings.fontSize + 4}px; font-weight: bold; color: ${settings.textColor}; }
.title { font-size: ${settings.fontSize - 2}px; color: ${settings.primaryColor}; margin-top: 2px; }
@keyframes slideIn { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
</style></head><body>
<div class="lower-third">
  <div class="accent-bar"></div>
  <div class="content">
    <div class="name">${settings.streamerName}</div>
    <div class="title">Playing ${settings.gameName}</div>
  </div>
</div>
</body></html>`;
        }
    };

    const copyHTML = () => {
        navigator.clipboard.writeText(generateOverlayHTML());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadHTML = () => {
        const blob = new Blob([generateOverlayHTML()], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `overlay_${selectedTemplate}_${Date.now()}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col p-6 gap-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Tv2 className="text-indigo-400" size={32} />
                Streaming Overlays
            </h1>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Template Selection */}
                <div className="space-y-4">
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Layout size={14} className="text-indigo-400" /> Templates
                        </h3>
                        <div className="space-y-2">
                            {TEMPLATES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                                        selectedTemplate === t.id
                                            ? 'bg-indigo-600/20 border border-indigo-500/30'
                                            : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06]'
                                    }`}
                                >
                                    <div className="text-xs font-bold text-white">{t.name}</div>
                                    <div className="text-[10px] text-gray-400">{t.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Settings */}
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Palette size={14} className="text-purple-400" /> Colors
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Primary</label>
                                <input type="color" value={settings.primaryColor} onChange={e => update('primaryColor', e.target.value)}
                                    className="w-full h-8 rounded cursor-pointer border border-white/10" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Background</label>
                                <input type="color" value={settings.secondaryColor} onChange={e => update('secondaryColor', e.target.value)}
                                    className="w-full h-8 rounded cursor-pointer border border-white/10" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Accent</label>
                                <input type="color" value={settings.accentColor} onChange={e => update('accentColor', e.target.value)}
                                    className="w-full h-8 rounded cursor-pointer border border-white/10" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Text</label>
                                <input type="color" value={settings.textColor} onChange={e => update('textColor', e.target.value)}
                                    className="w-full h-8 rounded cursor-pointer border border-white/10" />
                            </div>
                        </div>
                    </div>

                    {/* Content Settings */}
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Monitor size={14} className="text-green-400" /> Content
                        </h3>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Streamer Name</label>
                            <input type="text" value={settings.streamerName} onChange={e => update('streamerName', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Game Name</label>
                            <input type="text" value={settings.gameName} onChange={e => update('gameName', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Opacity: {Math.round(settings.opacity * 100)}%</label>
                            <input type="range" min={0.1} max={1} step={0.05} value={settings.opacity}
                                onChange={e => update('opacity', Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Font Size: {settings.fontSize}px</label>
                            <input type="range" min={10} max={28} value={settings.fontSize}
                                onChange={e => update('fontSize', Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                    </div>
                </div>

                {/* Preview & Export */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="flex-1 bg-black/30 border border-white/10 rounded-xl overflow-hidden relative">
                        <div className="absolute top-3 left-3 flex items-center gap-2 text-[10px] text-gray-500">
                            <AlertCircle size={10} /> Preview (approximate)
                        </div>
                        <iframe
                            srcDoc={generateOverlayHTML()}
                            className="w-full h-full min-h-[400px] border-0"
                            sandbox="allow-scripts"
                            title="Overlay Preview"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={copyHTML}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied!' : 'Copy HTML'}
                        </button>
                        <button
                            onClick={downloadHTML}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                            <Download size={16} /> Download .html
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StreamOverlays;
