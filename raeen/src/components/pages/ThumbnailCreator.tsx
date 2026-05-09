import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image, Type, Download, RefreshCw, Layers, PaintBucket } from 'lucide-react';

interface TextLayer {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    shadowColor: string;
    shadowBlur: number;
    fontWeight: 'normal' | 'bold';
}

interface Screenshot {
    id: string;
    path: string;
    gameName: string;
    timestamp: string;
}

const ThumbnailCreator: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
    const [backgroundSrc, setBackgroundSrc] = useState<string>('');
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [textLayers, setTextLayers] = useState<TextLayer[]>([
        { id: '1', text: 'EPIC GAMING', x: 640, y: 200, fontSize: 72, color: '#ffffff', shadowColor: '#000000', shadowBlur: 8, fontWeight: 'bold' },
        { id: '2', text: 'Stream Highlights', x: 640, y: 300, fontSize: 36, color: '#ffdd57', shadowColor: '#000000', shadowBlur: 4, fontWeight: 'normal' },
    ]);
    const [selectedLayer, setSelectedLayer] = useState<string | null>('1');
    const [canvasWidth] = useState(1280);
    const [canvasHeight] = useState(720);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        loadScreenshots();
    }, []);

    const loadScreenshots = async () => {
        try {
            const all = await window.ipcRenderer.invoke('screenshots:getAll', 20, 0);
            setScreenshots(all || []);
        } catch (e) {
            console.error('Failed to load screenshots:', e);
        }
    };

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        if (backgroundImage) {
            const scale = Math.max(canvasWidth / backgroundImage.width, canvasHeight / backgroundImage.height);
            const w = backgroundImage.width * scale;
            const h = backgroundImage.height * scale;
            ctx.drawImage(backgroundImage, (canvasWidth - w) / 2, (canvasHeight - h) / 2, w, h);
        } else {
            const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            grad.addColorStop(0, '#1a1a2e');
            grad.addColorStop(1, '#16213e');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        for (const layer of textLayers) {
            ctx.save();
            ctx.font = `${layer.fontWeight} ${layer.fontSize}px Inter, Arial, sans-serif`;
            ctx.fillStyle = layer.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (layer.shadowBlur > 0) {
                ctx.shadowColor = layer.shadowColor;
                ctx.shadowBlur = layer.shadowBlur;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
            ctx.fillText(layer.text, layer.x, layer.y);
            ctx.restore();
        }

        if (selectedLayer) {
            const layer = textLayers.find(l => l.id === selectedLayer);
            if (layer) {
                ctx.save();
                ctx.font = `${layer.fontWeight} ${layer.fontSize}px Inter, Arial, sans-serif`;
                const metrics = ctx.measureText(layer.text);
                const w = metrics.width + 16;
                const h = layer.fontSize + 12;
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(layer.x - w / 2, layer.y - h / 2, w, h);
                ctx.restore();
            }
        }
    }, [backgroundImage, textLayers, selectedLayer, canvasWidth, canvasHeight]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    const handleBackgroundFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const img = new window.Image();
            img.onload = () => {
                setBackgroundImage(img);
                setBackgroundSrc(img.src);
            };
            img.src = URL.createObjectURL(file);
        }
    };

    const handleScreenshotSelect = (path: string) => {
        const img = new window.Image();
        img.onload = () => {
            setBackgroundImage(img);
            setBackgroundSrc(path);
        };
        img.onerror = () => console.error('Failed to load screenshot');
        img.src = `file://${path.replace(/\\/g, '/')}`;
    };

    const updateLayer = (id: string, updates: Partial<TextLayer>) => {
        setTextLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const addTextLayer = () => {
        const newLayer: TextLayer = {
            id: Date.now().toString(36),
            text: 'New Text',
            x: canvasWidth / 2,
            y: canvasHeight / 2 + textLayers.length * 60,
            fontSize: 32,
            color: '#ffffff',
            shadowColor: '#000000',
            shadowBlur: 4,
            fontWeight: 'normal',
        };
        setTextLayers(prev => [...prev, newLayer]);
        setSelectedLayer(newLayer.id);
    };

    const removeLayer = (id: string) => {
        setTextLayers(prev => prev.filter(l => l.id !== id));
        if (selectedLayer === id) setSelectedLayer(null);
    };

    const exportPNG = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsExporting(true);

        const prevSelected = selectedLayer;
        setSelectedLayer(null);

        await new Promise(r => setTimeout(r, 50));

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) { setIsExporting(false); return; }

        if (backgroundImage) {
            const scale = Math.max(canvasWidth / backgroundImage.width, canvasHeight / backgroundImage.height);
            const w = backgroundImage.width * scale;
            const h = backgroundImage.height * scale;
            ctx.drawImage(backgroundImage, (canvasWidth - w) / 2, (canvasHeight - h) / 2, w, h);
        } else {
            const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            grad.addColorStop(0, '#1a1a2e');
            grad.addColorStop(1, '#16213e');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        for (const layer of textLayers) {
            ctx.save();
            ctx.font = `${layer.fontWeight} ${layer.fontSize}px Inter, Arial, sans-serif`;
            ctx.fillStyle = layer.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (layer.shadowBlur > 0) {
                ctx.shadowColor = layer.shadowColor;
                ctx.shadowBlur = layer.shadowBlur;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
            ctx.fillText(layer.text, layer.x, layer.y);
            ctx.restore();
        }

        tempCanvas.toBlob(blob => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `thumbnail_${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }
            setIsExporting(false);
            setSelectedLayer(prevSelected);
        }, 'image/png');
    };

    const current = textLayers.find(l => l.id === selectedLayer);

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col p-6 gap-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Image className="text-pink-400" size={32} />
                Thumbnail Creator
            </h1>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Canvas Area */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="relative bg-black/30 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center p-2">
                        <canvas
                            ref={canvasRef}
                            width={canvasWidth}
                            height={canvasHeight}
                            className="max-w-full h-auto rounded-lg border border-white/5"
                            style={{ maxHeight: '420px' }}
                        />
                    </div>

                    {/* Background Selection */}
                    <div className="bg-black/20 border border-white/10 rounded-xl p-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                            <PaintBucket size={12} /> Background
                        </h3>
                        <div className="flex gap-2 items-center flex-wrap">
                            <input type="file" accept="image/*" onChange={handleBackgroundFile} className="hidden" id="bg-upload" />
                            <label htmlFor="bg-upload" className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white cursor-pointer transition-colors">
                                Upload Image
                            </label>
                            <span className="text-[10px] text-gray-500">or pick a screenshot:</span>
                            <div className="flex gap-1 overflow-x-auto">
                                {screenshots.slice(0, 8).map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleScreenshotSelect(s.path)}
                                        className="flex-shrink-0 w-12 h-8 rounded border border-white/10 hover:border-blue-500/50 overflow-hidden transition-colors"
                                        title={s.gameName}
                                    >
                                        <img src={`file://${s.path.replace(/\\/g, '/')}`} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls Panel */}
                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    {/* Layers */}
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Layers size={14} className="text-blue-400" /> Text Layers
                            </h3>
                            <button onClick={addTextLayer} className="text-xs px-2 py-1 bg-blue-600/30 text-blue-300 rounded-lg hover:bg-blue-600/50 transition-colors">
                                + Add
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {textLayers.map(layer => (
                                <div
                                    key={layer.id}
                                    onClick={() => setSelectedLayer(layer.id)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                                        selectedLayer === layer.id ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06]'
                                    }`}
                                >
                                    <span className="text-xs text-white truncate flex-1">{layer.text}</span>
                                    <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} className="text-red-400 hover:text-red-300 ml-2">
                                        <Type size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Layer Editor */}
                    {current && (
                        <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Type size={14} className="text-yellow-400" /> Edit Layer
                            </h3>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Text</label>
                                <input type="text" value={current.text} onChange={e => updateLayer(current.id, { text: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">X</label>
                                    <input type="range" min={0} max={canvasWidth} value={current.x}
                                        onChange={e => updateLayer(current.id, { x: Number(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Y</label>
                                    <input type="range" min={0} max={canvasHeight} value={current.y}
                                        onChange={e => updateLayer(current.id, { y: Number(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Font Size: {current.fontSize}px</label>
                                <input type="range" min={12} max={120} value={current.fontSize}
                                    onChange={e => updateLayer(current.id, { fontSize: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color</label>
                                    <input type="color" value={current.color} onChange={e => updateLayer(current.id, { color: e.target.value })}
                                        className="w-full h-8 rounded-lg cursor-pointer border border-white/10" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Shadow</label>
                                    <input type="color" value={current.shadowColor} onChange={e => updateLayer(current.id, { shadowColor: e.target.value })}
                                        className="w-full h-8 rounded-lg cursor-pointer border border-white/10" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Shadow Blur: {current.shadowBlur}</label>
                                <input type="range" min={0} max={20} value={current.shadowBlur}
                                    onChange={e => updateLayer(current.id, { shadowBlur: Number(e.target.value) })}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateLayer(current.id, { fontWeight: 'bold' })}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${current.fontWeight === 'bold' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-300'}`}
                                >Bold</button>
                                <button
                                    onClick={() => updateLayer(current.id, { fontWeight: 'normal' })}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${current.fontWeight === 'normal' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-300'}`}
                                >Normal</button>
                            </div>
                        </div>
                    )}

                    {/* Export */}
                    <button
                        onClick={exportPNG}
                        disabled={isExporting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    >
                        {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                        {isExporting ? 'Exporting...' : 'Export as PNG'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThumbnailCreator;
