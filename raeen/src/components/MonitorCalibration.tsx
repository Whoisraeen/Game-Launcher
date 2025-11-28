import React, { useState, useEffect, useCallback } from 'react';
import { Maximize, X, Monitor, Sliders } from 'lucide-react';

const MonitorCalibration: React.FC = () => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activePattern, setActivePattern] = useState<'color-bars' | 'gradient' | 'sharpness' | 'gamma' | 'black-level' | 'white-level'>('color-bars');

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // Exit handler for ESC key
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const patterns = [
        { id: 'color-bars', label: 'Color Bars' },
        { id: 'gradient', label: 'Gradient' },
        { id: 'sharpness', label: 'Sharpness' },
        { id: 'gamma', label: 'Gamma' },
        { id: 'black-level', label: 'Black Level' },
        { id: 'white-level', label: 'White Level' },
    ];

    return (
        <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-[100] bg-black' : 'bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden'}`}>
            {/* Toolbar (Visible only when not fullscreen or on hover) */}
            <div className={`flex items-center justify-between p-4 bg-black/50 backdrop-blur-md transition-opacity duration-300 ${isFullscreen ? 'absolute top-0 left-0 right-0 opacity-0 hover:opacity-100' : ''}`}>
                <div className="flex items-center gap-2">
                    <Monitor className="text-blue-400" />
                    <span className="font-bold text-white">Monitor Calibration</span>
                </div>
                <div className="flex gap-2">
                    {patterns.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setActivePattern(p.id as any)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activePattern === p.id ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={toggleFullscreen} className="p-2 bg-white/10 hover:bg-white/20 rounded text-white">
                        {isFullscreen ? <X size={18} /> : <Maximize size={18} />}
                    </button>
                </div>
            </div>

            {/* Pattern Canvas */}
            <div className="flex-1 relative w-full h-full flex items-center justify-center overflow-hidden">
                {activePattern === 'color-bars' && <ColorBars />}
                {activePattern === 'gradient' && <GradientTest />}
                {activePattern === 'sharpness' && <SharpnessTest />}
                {activePattern === 'gamma' && <GammaTest />}
                {activePattern === 'black-level' && <BlackLevelTest />}
                {activePattern === 'white-level' && <WhiteLevelTest />}
            </div>
        </div>
    );
};

const ColorBars = () => (
    <div className="w-full h-full flex flex-col">
        <div className="flex-1 flex">
            {['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff', '#000000'].map(c => (
                <div key={c} className="flex-1 h-full" style={{ backgroundColor: c }} />
            ))}
        </div>
        <div className="h-1/4 flex">
             {['#0000ff', '#131313', '#ff00ff', '#131313', '#00ffff', '#131313', '#ffffff'].map((c, i) => (
                <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
            ))}
        </div>
    </div>
);

const GradientTest = () => (
    <div className="w-full h-full flex flex-col justify-center gap-8 p-8 bg-black">
        <div className="h-32 w-full bg-gradient-to-r from-black via-gray-500 to-white" />
        <div className="h-32 w-full bg-gradient-to-r from-black via-red-500 to-white" />
        <div className="h-32 w-full bg-gradient-to-r from-black via-green-500 to-white" />
        <div className="h-32 w-full bg-gradient-to-r from-black via-blue-500 to-white" />
    </div>
);

const SharpnessTest = () => (
    <div className="w-full h-full bg-gray-500 flex items-center justify-center p-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-white">
            <div className="w-64 h-64 border border-black flex items-center justify-center text-black text-xs">
                <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>
            </div>
            <div className="w-64 h-64 border border-black flex items-center justify-center text-black text-xs">
                 <div className="w-full h-full" style={{ backgroundImage: 'repeating-radial-gradient(circle at 0 0, transparent 0, #000 1px)', backgroundSize: '10px 10px' }}></div>
            </div>
            <div className="w-64 h-64 border border-black flex flex-col items-center justify-center gap-2">
                <p className="text-4xl font-mono">TEXT TEST</p>
                <p className="text-xl font-serif">Serif Font</p>
                <p className="text-xs">The quick brown fox jumps over the lazy dog.</p>
            </div>
             <div className="w-64 h-64 border border-black bg-black flex items-center justify-center">
                <div className="w-32 h-32 bg-white rounded-full border-4 border-gray-500"></div>
            </div>
        </div>
    </div>
);

const GammaTest = () => (
    <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="flex gap-4">
            {[2.2, 2.0, 1.8].map(g => (
                <div key={g} className="flex flex-col items-center gap-2">
                    <div className="w-32 h-32 bg-gray-500 relative overflow-hidden">
                        <div className="absolute inset-0" style={{ opacity: 0.5, backgroundImage: 'repeating-linear-gradient(to bottom, #000 0, #000 1px, #fff 1px, #fff 2px)' }}></div>
                        <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-gray-500 flex items-center justify-center text-black font-bold shadow-xl">
                            {g}
                        </div>
                    </div>
                    <span className="text-white text-sm">Gamma {g}</span>
                </div>
            ))}
        </div>
    </div>
);

const BlackLevelTest = () => (
    <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-16 h-32 flex items-center justify-center text-gray-500 text-xs" style={{ backgroundColor: `rgb(${i * 2}, ${i * 2}, ${i * 2})` }}>
                    {i * 2}
                </div>
            ))}
        </div>
    </div>
);

const WhiteLevelTest = () => (
    <div className="w-full h-full bg-white flex items-center justify-center">
        <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 20 }).map((_, i) => {
                const val = 255 - (i * 2);
                return (
                    <div key={i} className="w-16 h-32 flex items-center justify-center text-gray-400 text-xs" style={{ backgroundColor: `rgb(${val}, ${val}, ${val})` }}>
                        {val}
                    </div>
                );
            })}
        </div>
    </div>
);

export default MonitorCalibration;
