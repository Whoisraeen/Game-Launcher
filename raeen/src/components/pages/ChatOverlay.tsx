import React, { useState, useEffect } from 'react';
import { MessageSquare, Copy, Check, Eye, Palette, Type, Move, Sparkles } from 'lucide-react';

interface OverlaySettings {
    fontSize: number;
    fontColor: string;
    bgColor: string;
    bgOpacity: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    animation: 'none' | 'slide' | 'fade' | 'bounce';
    fontFamily: string;
    maxMessages: number;
    showBadges: boolean;
    borderRadius: number;
}

const STORAGE_KEY = 'raeen.chatOverlay';

const DEFAULT_SETTINGS: OverlaySettings = {
    fontSize: 14,
    fontColor: '#ffffff',
    bgColor: '#000000',
    bgOpacity: 0.6,
    position: 'bottom-left',
    animation: 'slide',
    fontFamily: 'Inter, sans-serif',
    maxMessages: 15,
    showBadges: true,
    borderRadius: 8,
};

const ANIMATIONS: Record<string, string> = {
    none: '',
    slide: `@keyframes chatSlide { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`,
    fade: `@keyframes chatSlide { from { opacity: 0; } to { opacity: 1; } }`,
    bounce: `@keyframes chatSlide { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }`,
};

const FONT_OPTIONS = [
    'Inter, sans-serif',
    'Roboto, sans-serif',
    'Fira Code, monospace',
    'Comic Sans MS, cursive',
    'Georgia, serif',
];

const ChatOverlay: React.FC = () => {
    const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
    const [copied, setCopied] = useState(false);
    const [showPreview, setShowPreview] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); } catch {}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const update = <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const generateHTML = (): string => {
        const posStyles: Record<string, string> = {
            'top-left': 'top: 10px; left: 10px;',
            'top-right': 'top: 10px; right: 10px;',
            'bottom-left': 'bottom: 10px; left: 10px;',
            'bottom-right': 'bottom: 10px; right: 10px;',
        };

        return `<!DOCTYPE html>
<html>
<head>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: transparent; overflow: hidden; }
${ANIMATIONS[settings.animation]}
#chat-container {
  position: fixed;
  ${posStyles[settings.position]}
  width: 350px;
  max-height: 500px;
  overflow: hidden;
  display: flex;
  flex-direction: column-reverse;
  font-family: ${settings.fontFamily};
  font-size: ${settings.fontSize}px;
  color: ${settings.fontColor};
}
.chat-msg {
  padding: 6px 10px;
  margin: 2px 0;
  background: ${settings.bgColor}${Math.round(settings.bgOpacity * 255).toString(16).padStart(2, '0')};
  border-radius: ${settings.borderRadius}px;
  ${settings.animation !== 'none' ? 'animation: chatSlide 0.3s ease-out;' : ''}
  word-wrap: break-word;
}
.chat-msg .username { font-weight: bold; margin-right: 6px; }
</style>
</head>
<body>
<div id="chat-container"></div>
<script>
const container = document.getElementById('chat-container');
const MAX = ${settings.maxMessages};

function addMessage(username, message, color) {
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = '<span class="username" style="color:' + (color || '#9b59b6') + '">' + username + ':</span>' + message;
  container.prepend(div);
  while (container.children.length > MAX) container.removeChild(container.lastChild);
}

// Connect to your chat service here (Twitch IRC, YouTube, etc.)
// Example: addMessage('Viewer123', 'Hello world!', '#e91e63');
</script>
</body>
</html>`;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateHTML());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const PREVIEW_MESSAGES = [
        { user: 'StreamFan42', msg: 'This game looks amazing!', color: '#e91e63' },
        { user: 'GamerDude', msg: 'Nice play! GG', color: '#2196f3' },
        { user: 'ChillViewer', msg: 'Love the stream vibes 🎮', color: '#4caf50' },
        { user: 'ProPlayer', msg: 'What settings are you using?', color: '#ff9800' },
    ];

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col p-6 gap-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <MessageSquare className="text-green-400" size={32} />
                Chat Overlay Customizer
            </h1>

            <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Settings Panel */}
                <div className="space-y-5">
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Type size={14} className="text-blue-400" /> Typography
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Font Size</label>
                                <input
                                    type="range" min={10} max={24} value={settings.fontSize}
                                    onChange={e => update('fontSize', Number(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="text-[10px] text-gray-500">{settings.fontSize}px</span>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Font</label>
                                <select
                                    value={settings.fontFamily}
                                    onChange={e => update('fontFamily', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-white text-xs focus:outline-none"
                                >
                                    {FONT_OPTIONS.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Palette size={14} className="text-purple-400" /> Colors & Background
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Text Color</label>
                                <input type="color" value={settings.fontColor} onChange={e => update('fontColor', e.target.value)}
                                    className="w-full h-8 rounded-lg cursor-pointer border border-white/10" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Background</label>
                                <input type="color" value={settings.bgColor} onChange={e => update('bgColor', e.target.value)}
                                    className="w-full h-8 rounded-lg cursor-pointer border border-white/10" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Background Opacity</label>
                            <input type="range" min={0} max={1} step={0.05} value={settings.bgOpacity}
                                onChange={e => update('bgOpacity', Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                            <span className="text-[10px] text-gray-500">{Math.round(settings.bgOpacity * 100)}%</span>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Border Radius</label>
                            <input type="range" min={0} max={20} value={settings.borderRadius}
                                onChange={e => update('borderRadius', Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                            <span className="text-[10px] text-gray-500">{settings.borderRadius}px</span>
                        </div>
                    </div>

                    <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Move size={14} className="text-orange-400" /> Position & Behavior
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Position</label>
                                <select value={settings.position} onChange={e => update('position', e.target.value as OverlaySettings['position'])}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-white text-xs focus:outline-none">
                                    <option value="top-left">Top Left</option>
                                    <option value="top-right">Top Right</option>
                                    <option value="bottom-left">Bottom Left</option>
                                    <option value="bottom-right">Bottom Right</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Max Messages</label>
                                <input type="number" min={5} max={50} value={settings.maxMessages}
                                    onChange={e => update('maxMessages', Number(e.target.value))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-white text-xs focus:outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Sparkles size={14} className="text-yellow-400" /> Animation
                        </h3>
                        <div className="grid grid-cols-4 gap-2">
                            {(['none', 'slide', 'fade', 'bounce'] as const).map(anim => (
                                <button
                                    key={anim}
                                    onClick={() => update('animation', anim)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                                        settings.animation === anim
                                            ? 'bg-blue-600 text-white border border-blue-500'
                                            : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {anim}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Export */}
                    <button
                        onClick={copyToClipboard}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied to Clipboard!' : 'Copy HTML for OBS Browser Source'}
                    </button>
                </div>

                {/* Preview */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Eye size={14} className="text-green-400" /> Live Preview
                        </h3>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            {showPreview ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    {showPreview && (
                        <div className="flex-1 relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden min-h-[300px]">
                            <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs">
                                Game Capture Area
                            </div>
                            <div
                                className="absolute w-[280px] flex flex-col gap-0.5"
                                style={{
                                    ...(settings.position.includes('top') ? { top: 10 } : { bottom: 10 }),
                                    ...(settings.position.includes('left') ? { left: 10 } : { right: 10 }),
                                    fontFamily: settings.fontFamily,
                                    fontSize: settings.fontSize,
                                    color: settings.fontColor,
                                }}
                            >
                                {PREVIEW_MESSAGES.map((m, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            background: `${settings.bgColor}${Math.round(settings.bgOpacity * 255).toString(16).padStart(2, '0')}`,
                                            borderRadius: settings.borderRadius,
                                            padding: '4px 8px',
                                        }}
                                    >
                                        <span style={{ color: m.color, fontWeight: 'bold', marginRight: 6 }}>{m.user}:</span>
                                        {m.msg}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-3">
                        In OBS: Sources → + → Browser → paste the copied HTML as local file or use the URL.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatOverlay;
