import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gamepad2, RotateCcw, BarChart3, Clock, Zap, Target } from 'lucide-react';

interface TestResult {
    timestamp: number;
    lagMs: number;
    button: string;
}

const MAX_HISTORY = 50;

const InputLagTest: React.FC = () => {
    const [connected, setConnected] = useState(false);
    const [controllerName, setControllerName] = useState('');
    const [results, setResults] = useState<TestResult[]>([]);
    const [waiting, setWaiting] = useState(false);
    const [targetVisible, setTargetVisible] = useState(false);
    const [targetShowTime, setTargetShowTime] = useState(0);
    const [lastLag, setLastLag] = useState<number | null>(null);
    const [tooEarly, setTooEarly] = useState(false);
    const rafRef = useRef<number>(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const prevButtonsRef = useRef<boolean[]>([]);

    const pollGamepads = useCallback(() => {
        const gamepads = navigator.getGamepads();
        let found = false;

        for (const gp of gamepads) {
            if (!gp) continue;
            found = true;
            if (!connected) {
                setConnected(true);
                setControllerName(gp.id);
            }

            const prevButtons = prevButtonsRef.current;
            for (let i = 0; i < gp.buttons.length; i++) {
                const pressed = gp.buttons[i].pressed;
                const wasPressed = prevButtons[i] || false;

                if (pressed && !wasPressed) {
                    if (targetVisible) {
                        const now = performance.now();
                        const lag = Math.round(now - targetShowTime);
                        setLastLag(lag);
                        setResults(prev => [{ timestamp: Date.now(), lagMs: lag, button: `Button ${i}` }, ...prev].slice(0, MAX_HISTORY));
                        setTargetVisible(false);
                        setWaiting(false);
                    } else if (waiting) {
                        setTooEarly(true);
                        setWaiting(false);
                        setTargetVisible(false);
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    }
                }
            }
            prevButtonsRef.current = gp.buttons.map(b => b.pressed);
            break;
        }

        if (!found && connected) {
            setConnected(false);
            setControllerName('');
        }

        rafRef.current = requestAnimationFrame(pollGamepads);
    }, [connected, waiting, targetVisible, targetShowTime]);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(pollGamepads);
        return () => cancelAnimationFrame(rafRef.current);
    }, [pollGamepads]);

    useEffect(() => {
        const onConnect = () => {};
        window.addEventListener('gamepadconnected', onConnect);
        window.addEventListener('gamepaddisconnected', onConnect);
        return () => {
            window.removeEventListener('gamepadconnected', onConnect);
            window.removeEventListener('gamepaddisconnected', onConnect);
        };
    }, []);

    const startTest = () => {
        setTooEarly(false);
        setLastLag(null);
        setWaiting(true);
        setTargetVisible(false);

        const delay = 1500 + Math.random() * 3000;
        timeoutRef.current = setTimeout(() => {
            setTargetShowTime(performance.now());
            setTargetVisible(true);
        }, delay);
    };

    const resetResults = () => {
        setResults([]);
        setLastLag(null);
    };

    const avgLag = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.lagMs, 0) / results.length) : 0;
    const bestLag = results.length > 0 ? Math.min(...results.map(r => r.lagMs)) : 0;
    const worstLag = results.length > 0 ? Math.max(...results.map(r => r.lagMs)) : 0;

    const graphData = [...results].reverse().slice(-20);
    const graphMax = Math.max(200, worstLag + 20);

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">INPUT LAG TESTER</h1>
                    <p className="text-sm text-gray-400">Measure controller response time with visual reaction tests.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                        connected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/10 text-gray-500'
                    }`}>
                        <Gamepad2 size={16} />
                        {connected ? controllerName.split('(')[0].trim().slice(0, 30) : 'No controller detected'}
                    </div>
                    {results.length > 0 && (
                        <button onClick={resetResults} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors" title="Reset results">
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Test area */}
                    <div
                        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 h-64 flex flex-col items-center justify-center cursor-pointer select-none ${
                            targetVisible
                                ? 'bg-green-500/20 border-green-500/50'
                                : waiting
                                ? 'bg-yellow-500/10 border-yellow-500/30'
                                : tooEarly
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        }`}
                        onClick={() => {
                            if (!waiting && !targetVisible) startTest();
                        }}
                    >
                        {targetVisible ? (
                            <>
                                <div className="w-24 h-24 rounded-full bg-green-500 shadow-[0_0_40px_rgba(34,197,94,0.6)] animate-pulse flex items-center justify-center">
                                    <Zap size={40} className="text-white" />
                                </div>
                                <p className="text-green-400 font-bold mt-4 text-lg">PRESS ANY BUTTON NOW!</p>
                            </>
                        ) : waiting ? (
                            <>
                                <Clock size={48} className="text-yellow-400 mb-4" />
                                <p className="text-yellow-400 font-bold text-lg">Wait for the green target…</p>
                                <p className="text-yellow-400/50 text-sm mt-1">Don't press yet!</p>
                            </>
                        ) : tooEarly ? (
                            <>
                                <Target size={48} className="text-red-400 mb-4" />
                                <p className="text-red-400 font-bold text-lg">Too early!</p>
                                <p className="text-gray-400 text-sm mt-1">Click here to try again.</p>
                            </>
                        ) : (
                            <>
                                <Target size={48} className="text-gray-500 mb-4" />
                                {lastLag !== null ? (
                                    <>
                                        <p className={`text-4xl font-black tabular-nums ${
                                            lastLag < 50 ? 'text-green-400' : lastLag < 100 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                            {lastLag}ms
                                        </p>
                                        <p className="text-gray-400 text-sm mt-2">Click here to test again.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-white font-bold text-lg">
                                            {connected ? 'Click here to start the test' : 'Connect a controller to begin'}
                                        </p>
                                        <p className="text-gray-500 text-sm mt-1">A green target will appear — press any button as fast as you can.</p>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    {/* Stats */}
                    {results.length > 0 && (
                        <div className="grid grid-cols-4 gap-4">
                            <LagStat label="Last" value={`${lastLag ?? 0}ms`} color={lagColor(lastLag ?? 0)} />
                            <LagStat label="Average" value={`${avgLag}ms`} color={lagColor(avgLag)} />
                            <LagStat label="Best" value={`${bestLag}ms`} color="text-green-400" />
                            <LagStat label="Tests" value={String(results.length)} color="text-cyan-400" />
                        </div>
                    )}

                    {/* Graph */}
                    {graphData.length > 1 && (
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-white/5">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <BarChart3 size={14} /> Latency History
                            </h3>
                            <div className="relative h-40">
                                <svg viewBox={`0 0 ${graphData.length * 30} 160`} className="w-full h-full" preserveAspectRatio="none">
                                    {/* Grid lines */}
                                    {[0, 50, 100, 150, 200].filter(v => v <= graphMax).map(v => (
                                        <line key={v} x1={0} y1={160 - (v / graphMax) * 160} x2={graphData.length * 30} y2={160 - (v / graphMax) * 160}
                                            stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                                    ))}
                                    {/* Line */}
                                    <polyline
                                        fill="none"
                                        stroke="url(#lagGrad)"
                                        strokeWidth={2.5}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                        points={graphData.map((d, i) => `${i * 30 + 15},${160 - (d.lagMs / graphMax) * 160}`).join(' ')}
                                    />
                                    {/* Dots */}
                                    {graphData.map((d, i) => (
                                        <circle key={i} cx={i * 30 + 15} cy={160 - (d.lagMs / graphMax) * 160} r={4}
                                            fill={d.lagMs < 50 ? '#22c55e' : d.lagMs < 100 ? '#eab308' : '#ef4444'}
                                            stroke="rgba(0,0,0,0.3)" strokeWidth={1.5} />
                                    ))}
                                    <defs>
                                        <linearGradient id="lagGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#06b6d4" />
                                            <stop offset="100%" stopColor="#8b5cf6" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                {/* Y-axis labels */}
                                <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-[9px] text-gray-600 font-mono -ml-1 py-1">
                                    <span>{graphMax}ms</span>
                                    <span>{Math.round(graphMax / 2)}ms</span>
                                    <span>0ms</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent results */}
                    {results.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Recent Tests</h3>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                {results.slice(0, 15).map((r, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-sm">
                                        <div className={`w-2 h-2 rounded-full ${r.lagMs < 50 ? 'bg-green-500' : r.lagMs < 100 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                        <span className="text-gray-400 flex-1">{r.button}</span>
                                        <span className={`font-black tabular-nums ${lagColor(r.lagMs)}`}>{r.lagMs}ms</span>
                                        <span className="text-[10px] text-gray-600">{new Date(r.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const lagColor = (ms: number) => ms < 50 ? 'text-green-400' : ms < 100 ? 'text-yellow-400' : 'text-red-400';

const LagStat = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5 text-center">
        <div className={`text-2xl font-black tabular-nums ${color}`}>{value}</div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
);

export default InputLagTest;
