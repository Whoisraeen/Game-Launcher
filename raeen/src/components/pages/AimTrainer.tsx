import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Play, RotateCcw, Trophy, Target, Zap } from 'lucide-react';

type Mode = 'flick' | 'tracking' | 'reaction';

interface RunResult {
  id: string;
  mode: Mode;
  score: number;
  accuracy: number;
  avgReactionMs: number;
  timestamp: number;
}

const MODES: { id: Mode; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'flick',    label: 'Flick Shots',  description: 'Targets appear in random spots — click them as fast as you can.', icon: <Target size={18} /> },
  { id: 'tracking', label: 'Tracking',     description: 'Stay on a moving target. Hold left mouse to score.',              icon: <Crosshair size={18} /> },
  { id: 'reaction', label: 'Reaction Test', description: 'Click the moment the screen turns green.',                       icon: <Zap size={18} /> },
];

const STORAGE_KEY = 'raeen.aimtrainer.v1';

const AimTrainer: React.FC = () => {
  const [mode, setMode] = useState<Mode>('flick');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);

  useEffect(() => { try { setResults(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch {} }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, 100))); }, [results]);

  const onComplete = (r: RunResult) => { setResults(prev => [r, ...prev]); setRunning(false); };

  const best = results.filter(r => r.mode === mode).reduce((max, r) => r.score > max ? r.score : max, 0);
  const recent = results.filter(r => r.mode === mode).slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">AIM TRAINER</h1>
          <p className="text-gray-400 font-medium">Train flick shots, tracking, and reaction time</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase font-bold tracking-wider text-gray-500">Best ({MODES.find(m => m.id === mode)?.label})</div>
          <div className="text-3xl font-black text-white">{best}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { if (!running) setMode(m.id); }}
            className={`text-left p-4 rounded-2xl border transition ${mode === m.id ? 'bg-blue-600/15 border-blue-500/40 ring-1 ring-blue-500/30' : 'glass-frosted hover:border-white/15'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={mode === m.id ? 'text-blue-300' : 'text-gray-400'}>{m.icon}</span>
              <span className="font-bold text-white">{m.label}</span>
            </div>
            <p className="text-xs text-gray-400">{m.description}</p>
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        <div className="lg:col-span-2 glass-frosted rounded-2xl overflow-hidden relative min-h-[420px]">
          {!running ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Crosshair size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-300 font-bold mb-3">Ready to train?</p>
                <button onClick={() => setRunning(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-gray-200">
                  <Play size={16} /> Start {MODES.find(m => m.id === mode)?.label}
                </button>
              </div>
            </div>
          ) : (
            <TrainerArena mode={mode} onComplete={onComplete} onCancel={() => setRunning(false)} />
          )}
        </div>

        <div className="glass-frosted rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-yellow-400" />
            <span className="text-sm font-bold text-white">Recent Runs</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {recent.length === 0 ? (
              <p className="text-xs text-gray-500">No runs yet for this mode.</p>
            ) : recent.map(r => (
              <div key={r.id} className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-white">{r.score} pts</span>
                  <span className="text-[10px] text-gray-500">{new Date(r.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 flex gap-3">
                  <span>Accuracy: <span className="text-white">{r.accuracy.toFixed(0)}%</span></span>
                  <span>Reaction: <span className="text-white">{r.avgReactionMs.toFixed(0)}ms</span></span>
                </div>
              </div>
            ))}
          </div>
          {recent.length > 0 && (
            <button onClick={() => setResults([])} className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-red-300">
              <RotateCcw size={12} /> Clear history
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TrainerArena: React.FC<{ mode: Mode; onComplete: (r: RunResult) => void; onCancel: () => void }> = ({ mode, onComplete, onCancel }) => {
  if (mode === 'reaction') return <ReactionGame onComplete={onComplete} onCancel={onCancel} />;
  if (mode === 'tracking') return <TrackingGame onComplete={onComplete} onCancel={onCancel} />;
  return <FlickGame onComplete={onComplete} onCancel={onCancel} />;
};

const DURATION_MS = 30_000;

const FlickGame: React.FC<{ onComplete: (r: RunResult) => void; onCancel: () => void }> = ({ onComplete, onCancel }) => {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState({ x: 50, y: 50, t: Date.now() });
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [reactions, setReactions] = useState<number[]>([]);
  const [remaining, setRemaining] = useState(DURATION_MS);
  const start = useRef(Date.now());

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - start.current;
      const left = Math.max(0, DURATION_MS - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        const acc = hits + misses === 0 ? 0 : (hits / (hits + misses)) * 100;
        const avgR = reactions.length === 0 ? 0 : reactions.reduce((a, b) => a + b, 0) / reactions.length;
        onComplete({ id: `r_${Date.now()}`, mode: 'flick', score: hits * 10, accuracy: acc, avgReactionMs: avgR, timestamp: Date.now() });
      }
    }, 100);
    return () => clearInterval(tick);
  }, [hits, misses, reactions, onComplete]);

  const newTarget = () => {
    const x = 8 + Math.random() * 84;
    const y = 8 + Math.random() * 84;
    setTarget({ x, y, t: Date.now() });
  };

  const onClickArena = (e: React.MouseEvent) => {
    setMisses(m => m + 1);
  };

  const onHit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHits(h => h + 1);
    setReactions(prev => [...prev, Date.now() - target.t]);
    newTarget();
  };

  const acc = hits + misses === 0 ? 0 : (hits / (hits + misses)) * 100;

  return (
    <div ref={arenaRef} onClick={onClickArena} className="absolute inset-0 cursor-crosshair select-none">
      <ArenaHud remaining={remaining} hits={hits} acc={acc} onCancel={onCancel} />
      <button onClick={onHit}
        style={{ left: `${target.x}%`, top: `${target.y}%` }}
        className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-red-400 to-pink-500 shadow-[0_0_30px_rgba(244,114,182,0.6)] hover:scale-110 transition-transform" />
    </div>
  );
};

const TrackingGame: React.FC<{ onComplete: (r: RunResult) => void; onCancel: () => void }> = ({ onComplete, onCancel }) => {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);
  const [holding, setHolding] = useState(false);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [ticks, setTicks] = useState(0);
  const [remaining, setRemaining] = useState(DURATION_MS);
  const start = useRef(Date.now());

  useEffect(() => {
    let tx = 50, ty = 50, vx = 0.4, vy = 0.4;
    const move = setInterval(() => {
      tx += vx; ty += vy;
      if (tx > 90 || tx < 10) vx = -vx + (Math.random() - 0.5) * 0.2;
      if (ty > 90 || ty < 10) vy = -vy + (Math.random() - 0.5) * 0.2;
      setPos({ x: tx, y: ty });
    }, 16);
    const score = setInterval(() => {
      setTicks(t => t + 1);
      if (hovering && holding) { setHits(h => h + 1); setScore(s => s + 1); }
    }, 50);
    const tick = setInterval(() => {
      const left = Math.max(0, DURATION_MS - (Date.now() - start.current));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(move); clearInterval(score); clearInterval(tick);
        onComplete({ id: `r_${Date.now()}`, mode: 'tracking', score: 0, accuracy: 0, avgReactionMs: 0, timestamp: Date.now() });
      }
    }, 100);
    return () => { clearInterval(move); clearInterval(score); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovering, holding]);

  // Final completion w/ correct numbers when timer ends
  useEffect(() => {
    if (remaining > 0) return;
    const acc = ticks === 0 ? 0 : (hits / ticks) * 100;
    onComplete({ id: `r_${Date.now()}`, mode: 'tracking', score: hits, accuracy: acc, avgReactionMs: 0, timestamp: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const acc = ticks === 0 ? 0 : (hits / ticks) * 100;

  return (
    <div onMouseDown={() => setHolding(true)} onMouseUp={() => setHolding(false)} onMouseLeave={() => setHolding(false)}
      className="absolute inset-0 cursor-crosshair select-none">
      <ArenaHud remaining={remaining} hits={hits} acc={acc} onCancel={onCancel} />
      <div onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        className={`absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full transition-shadow ${hovering && holding ? 'bg-green-400 shadow-[0_0_30px_rgba(74,222,128,0.7)]' : 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]'}`} />
    </div>
  );
};

const ReactionGame: React.FC<{ onComplete: (r: RunResult) => void; onCancel: () => void }> = ({ onComplete, onCancel }) => {
  const [phase, setPhase] = useState<'wait' | 'go' | 'too-soon' | 'done'>('wait');
  const [readyAt, setReadyAt] = useState<number>(0);
  const [reactions, setReactions] = useState<number[]>([]);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (phase === 'wait' && round < 5) {
      const delay = 800 + Math.random() * 2400;
      const t = setTimeout(() => { setReadyAt(Date.now()); setPhase('go'); }, delay);
      return () => clearTimeout(t);
    }
    if (phase === 'done' || round >= 5) {
      const avg = reactions.length === 0 ? 0 : reactions.reduce((a, b) => a + b, 0) / reactions.length;
      onComplete({ id: `r_${Date.now()}`, mode: 'reaction', score: Math.max(0, Math.round(1000 - avg)), accuracy: 100, avgReactionMs: avg, timestamp: Date.now() });
    }
  }, [phase, round]);

  const handleClick = () => {
    if (phase === 'wait') { setPhase('too-soon'); return; }
    if (phase === 'go') {
      const r = Date.now() - readyAt;
      setReactions(prev => [...prev, r]);
      const next = round + 1;
      setRound(next);
      setPhase(next >= 5 ? 'done' : 'wait');
    }
    if (phase === 'too-soon') {
      setPhase('wait');
    }
  };

  const bg =
    phase === 'wait' ? 'bg-red-500/40' :
    phase === 'go' ? 'bg-green-500/40' :
    phase === 'too-soon' ? 'bg-yellow-500/40' : 'bg-slate-800/40';

  const message =
    phase === 'wait' ? 'Wait for green…' :
    phase === 'go' ? 'CLICK!' :
    phase === 'too-soon' ? 'Too soon — click to retry' : 'Done';

  const avg = reactions.length === 0 ? 0 : reactions.reduce((a, b) => a + b, 0) / reactions.length;

  return (
    <div onClick={handleClick} className={`absolute inset-0 transition-colors flex items-center justify-center cursor-pointer ${bg}`}>
      <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="absolute top-3 right-3 text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-md bg-black/30">Cancel</button>
      <div className="text-center">
        <div className="text-5xl font-black text-white drop-shadow-lg">{message}</div>
        <div className="mt-3 text-sm text-white/70">Round {Math.min(round + 1, 5)} of 5 • Avg {avg.toFixed(0)}ms</div>
      </div>
    </div>
  );
};

const ArenaHud: React.FC<{ remaining: number; hits: number; acc: number; onCancel: () => void }> = ({ remaining, hits, acc, onCancel }) => (
  <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between text-white text-sm font-bold pointer-events-none">
    <div className="flex gap-3">
      <span className="bg-black/40 px-2.5 py-1 rounded-md">⏱ {(remaining / 1000).toFixed(1)}s</span>
      <span className="bg-black/40 px-2.5 py-1 rounded-md">🎯 {hits}</span>
      <span className="bg-black/40 px-2.5 py-1 rounded-md">{acc.toFixed(0)}%</span>
    </div>
    <button onClick={onCancel} className="pointer-events-auto bg-black/40 hover:bg-black/60 px-3 py-1 rounded-md">Cancel</button>
  </div>
);

export default AimTrainer;
