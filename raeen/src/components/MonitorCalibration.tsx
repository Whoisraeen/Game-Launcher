import React, { useState, useEffect, useRef } from 'react';
import { Maximize, X, Monitor, Zap, Eye, Grid, Sun, Contrast } from 'lucide-react';

type PatternId = 'color-bars' | 'gradient' | 'sharpness' | 'gamma' | 'black-level' | 'white-level' | 'brightness' | 'dead-pixel' | 'color-gradient' | 'response-time';

const MonitorCalibration: React.FC = () => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activePattern, setActivePattern] = useState<PatternId>('color-bars');

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

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const patterns: { id: PatternId; label: string; icon?: React.ReactNode; group: string }[] = [
        { id: 'color-bars',     label: 'Color Bars',      group: 'Basic' },
        { id: 'gradient',       label: 'Gradient',         group: 'Basic' },
        { id: 'sharpness',      label: 'Sharpness',        group: 'Basic' },
        { id: 'gamma',          label: 'Gamma',             group: 'Basic' },
        { id: 'black-level',    label: 'Black Level',      group: 'Basic' },
        { id: 'white-level',    label: 'White Level',      group: 'Basic' },
        { id: 'brightness',     label: 'Brightness',       icon: <Sun size={10} />,      group: 'Advanced' },
        { id: 'dead-pixel',     label: 'Dead Pixel',       icon: <Eye size={10} />,       group: 'Advanced' },
        { id: 'color-gradient', label: 'Color Sweep',      icon: <Grid size={10} />,      group: 'Advanced' },
        { id: 'response-time',  label: 'Response Time',    icon: <Zap size={10} />,       group: 'Advanced' },
    ];

    const groups = ['Basic', 'Advanced'];

    return (
        <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-[100] bg-black' : 'bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden'}`}>
            <div className={`flex items-center justify-between p-4 bg-black/50 backdrop-blur-md transition-opacity duration-300 ${isFullscreen ? 'absolute top-0 left-0 right-0 opacity-0 hover:opacity-100 z-10' : ''}`}>
                <div className="flex items-center gap-2">
                    <Monitor className="text-blue-400" />
                    <span className="font-bold text-white">Monitor Calibration</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                    {groups.map(group => (
                        <React.Fragment key={group}>
                            {patterns.filter(p => p.group === group).map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePattern(p.id)}
                                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                                        activePattern === p.id ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                                >
                                    {p.icon} {p.label}
                                </button>
                            ))}
                            {group !== groups[groups.length - 1] && <div className="w-px h-6 bg-white/10 self-center mx-1" />}
                        </React.Fragment>
                    ))}
                </div>
                <button onClick={toggleFullscreen} className="p-2 bg-white/10 hover:bg-white/20 rounded text-white">
                    {isFullscreen ? <X size={18} /> : <Maximize size={18} />}
                </button>
            </div>

            <div className="flex-1 relative w-full h-full flex items-center justify-center overflow-hidden">
                {activePattern === 'color-bars' && <ColorBars />}
                {activePattern === 'gradient' && <GradientTest />}
                {activePattern === 'sharpness' && <SharpnessTest />}
                {activePattern === 'gamma' && <GammaTest />}
                {activePattern === 'black-level' && <BlackLevelTest />}
                {activePattern === 'white-level' && <WhiteLevelTest />}
                {activePattern === 'brightness' && <BrightnessContrastTest />}
                {activePattern === 'dead-pixel' && <DeadPixelScanner />}
                {activePattern === 'color-gradient' && <ColorGradientSweep />}
                {activePattern === 'response-time' && <ResponseTimeTest />}
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
            <div className="w-64 h-64 border border-black" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
            <div className="w-64 h-64 border border-black" style={{ backgroundImage: 'repeating-radial-gradient(circle at 0 0, transparent 0, #000 1px)', backgroundSize: '10px 10px' }} />
            <div className="w-64 h-64 border border-black flex flex-col items-center justify-center gap-2">
                <p className="text-4xl font-mono text-black">TEXT TEST</p>
                <p className="text-xl font-serif text-black">Serif Font</p>
                <p className="text-xs text-black">The quick brown fox jumps over the lazy dog.</p>
            </div>
            <div className="w-64 h-64 border border-black bg-black flex items-center justify-center">
                <div className="w-32 h-32 bg-white rounded-full border-4 border-gray-500" />
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
                        <div className="absolute inset-0" style={{ opacity: 0.5, backgroundImage: 'repeating-linear-gradient(to bottom, #000 0, #000 1px, #fff 1px, #fff 2px)' }} />
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

const BrightnessContrastTest = () => (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center gap-6 p-8">
        <p className="text-white text-sm font-bold mb-2">Brightness: You should see distinct steps below. Contrast: All squares should be distinguishable.</p>
        <div className="flex gap-0">
            {Array.from({ length: 32 }).map((_, i) => {
                const v = Math.round((i / 31) * 255);
                return <div key={i} className="w-6 h-24" style={{ backgroundColor: `rgb(${v},${v},${v})` }} />;
            })}
        </div>
        <div className="flex gap-4 mt-4">
            {[5, 10, 15, 20, 25].map(v => (
                <div key={v} className="flex flex-col items-center gap-1">
                    <div className="w-20 h-20 rounded-lg border border-white/10" style={{ backgroundColor: `rgb(${v},${v},${v})` }} />
                    <span className="text-[10px] text-gray-500">Level {v}</span>
                </div>
            ))}
        </div>
        <p className="text-gray-500 text-xs mt-2">If you can't see the darkest squares, increase your monitor's brightness.</p>
    </div>
);

const DeadPixelScanner = () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000', '#ffff00', '#ff00ff', '#00ffff'];
    const [colorIndex, setColorIndex] = useState(0);

    return (
        <div
            className="w-full h-full cursor-pointer select-none flex items-end justify-center pb-8"
            style={{ backgroundColor: colors[colorIndex] }}
            onClick={() => setColorIndex((colorIndex + 1) % colors.length)}
        >
            <p className={`text-sm font-bold px-4 py-2 rounded-lg backdrop-blur-sm ${colorIndex === 4 || colorIndex === 2 ? 'bg-white/20 text-white' : 'bg-black/20 text-black'}`}>
                Click to cycle colors ({colorIndex + 1}/{colors.length}) — Look for stuck pixels
            </p>
        </div>
    );
};

const ColorGradientSweep = () => (
    <div className="w-full h-full flex flex-col bg-black">
        <div className="flex-1" style={{ background: 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))' }} />
        <div className="flex-1" style={{ background: 'linear-gradient(to right, hsl(0,100%,50%), hsl(0,100%,25%), hsl(0,100%,50%), hsl(0,50%,50%), hsl(0,0%,50%))' }} />
        <div className="flex-1 flex">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(hue => (
                <div key={hue} className="flex-1 flex flex-col">
                    {[100, 75, 50, 25].map(light => (
                        <div key={light} className="flex-1" style={{ backgroundColor: `hsl(${hue}, 100%, ${light}%)` }} />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

const ResponseTimeTest = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const [speed, setSpeed] = useState(3);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let x = 0;
        let direction = 1;
        const boxSize = 60;

        const resize = () => {
            canvas.width = canvas.clientWidth * window.devicePixelRatio;
            canvas.height = canvas.clientHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, w, h);

            // Track lines
            for (let i = 0; i < w; i += 80) {
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, h);
                ctx.stroke();
            }

            // Moving box
            ctx.fillStyle = '#3b82f6';
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 20;
            ctx.fillRect(x, h / 2 - boxSize / 2, boxSize, boxSize);
            ctx.shadowBlur = 0;

            // Trail ghost boxes
            for (let t = 1; t <= 3; t++) {
                ctx.fillStyle = `rgba(59, 130, 246, ${0.15 / t})`;
                ctx.fillRect(x - direction * t * 15, h / 2 - boxSize / 2, boxSize, boxSize);
            }

            // Instruction
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '12px system-ui';
            ctx.fillText('Track the moving box. Blurring or ghosting indicates slower response time.', 20, h - 20);

            x += speed * direction;
            if (x + boxSize > w || x < 0) direction *= -1;

            animRef.current = requestAnimationFrame(draw);
        };

        animRef.current = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [speed]);

    return (
        <div className="w-full h-full relative">
            <canvas ref={canvasRef} className="w-full h-full" />
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg">
                <span className="text-xs text-gray-400">Speed:</span>
                {[2, 4, 8, 12].map(s => (
                    <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-2 py-1 rounded text-xs font-bold transition ${speed === s ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400 hover:text-white'}`}
                    >
                        {s}x
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MonitorCalibration;
