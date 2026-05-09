import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RotateCcw, TrendingUp, Timer, Trophy, Activity } from 'lucide-react';

type GameState = 'idle' | 'waiting' | 'ready' | 'clicked' | 'too-early';

interface Attempt {
  id: string;
  time: number;
  timestamp: number;
}

const STORAGE_KEY = 'raeen.reactiontest.v1';

const loadAttempts = (): Attempt[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

const ReactionTest: React.FC = () => {
  const [state, setState] = useState<GameState>('idle');
  const [attempts, setAttempts] = useState<Attempt[]>(loadAttempts);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number>(0);

  const persist = (next: Attempt[]) => {
    setAttempts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 50)));
  };

  const startRound = useCallback(() => {
    setState('waiting');
    setCurrentTime(null);
    const delay = 1000 + Math.random() * 4000;
    timeoutRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setState('ready');
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (state === 'waiting') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState('too-early');
    } else if (state === 'ready') {
      const elapsed = Math.round(performance.now() - startRef.current);
      setCurrentTime(elapsed);
      setState('clicked');
      const attempt: Attempt = { id: crypto.randomUUID(), time: elapsed, timestamp: Date.now() };
      persist([attempt, ...attempts]);
    } else if (state === 'idle' || state === 'clicked' || state === 'too-early') {
      startRound();
    }
  }, [state, attempts, startRound]);

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState('idle');
    setCurrentTime(null);
    persist([]);
  };

  const last10 = attempts.slice(0, 10);
  const avg = last10.length > 0 ? Math.round(last10.reduce((s, a) => s + a.time, 0) / last10.length) : 0;
  const best = last10.length > 0 ? Math.min(...last10.map(a => a.time)) : 0;
  const improving = last10.length >= 3 && last10[0].time < last10[last10.length - 1].time;

  const getStateConfig = () => {
    switch (state) {
      case 'idle': return { bg: 'from-slate-800 to-slate-900', text: 'Click to Start', sub: 'Test your reaction time' };
      case 'waiting': return { bg: 'from-red-900/60 to-red-950/80', text: 'Wait...', sub: 'Click when the screen turns green' };
      case 'ready': return { bg: 'from-green-500 to-emerald-600', text: 'CLICK NOW!', sub: '' };
      case 'clicked': return { bg: 'from-blue-900/60 to-indigo-950/80', text: `${currentTime} ms`, sub: 'Click to try again' };
      case 'too-early': return { bg: 'from-orange-900/60 to-amber-950/80', text: 'Too Early!', sub: 'Click to try again' };
    }
  };

  const config = getStateConfig();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">REACTION TEST</h1>
          <p className="text-gray-400 font-medium">Train your reflexes — click the moment the screen turns green</p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-sm font-medium"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Timer size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{avg || '—'}<span className="text-sm font-medium text-gray-400">ms</span></p>
            <p className="text-xs text-gray-400 font-medium">Average (10)</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Trophy size={20} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{best || '—'}<span className="text-sm font-medium text-gray-400">ms</span></p>
            <p className="text-xs text-gray-400 font-medium">Best</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <TrendingUp size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{last10.length}</p>
            <p className="text-xs text-gray-400 font-medium">Attempts</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Activity size={20} className="text-purple-400" />
          </div>
          <div>
            <p className={`text-2xl font-black ${improving ? 'text-green-400' : last10.length >= 3 ? 'text-orange-400' : 'text-gray-500'}`}>
              {last10.length < 3 ? '—' : improving ? '↑' : '↓'}
            </p>
            <p className="text-xs text-gray-400 font-medium">Trend</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Game Area */}
        <motion.div
          onClick={handleClick}
          className={`flex-1 rounded-2xl flex flex-col items-center justify-center cursor-pointer select-none border border-white/10 bg-gradient-to-br ${config.bg} transition-colors relative overflow-hidden`}
          whileTap={{ scale: 0.98 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-2"
            >
              {state === 'ready' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  <Zap size={64} className="text-white drop-shadow-[0_0_30px_rgba(34,197,94,0.8)]" />
                </motion.div>
              )}
              <span className={`font-black tracking-tight ${state === 'clicked' ? 'text-6xl' : 'text-4xl'} text-white`}>
                {config.text}
              </span>
              {config.sub && <span className="text-lg text-white/60 font-medium">{config.sub}</span>}
            </motion.div>
          </AnimatePresence>

          {state === 'ready' && (
            <motion.div
              className="absolute inset-0 bg-green-400/10 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* History Panel */}
        <div className="w-72 glass-panel p-4 rounded-2xl flex flex-col overflow-hidden">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Activity size={14} className="text-blue-400" /> Last 10 Attempts
          </h3>

          {/* Mini Chart */}
          {last10.length > 1 && (
            <div className="h-24 flex items-end gap-1 mb-4 px-1">
              {[...last10].reverse().map((a, i) => {
                const maxTime = Math.max(...last10.map(x => x.time));
                const height = Math.max(10, (a.time / maxTime) * 100);
                const isRecent = i === last10.length - 1;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className={`flex-1 rounded-t-md ${isRecent ? 'bg-blue-500' : a.time <= (avg || 999) ? 'bg-green-500/60' : 'bg-orange-500/60'}`}
                    title={`${a.time}ms`}
                  />
                );
              })}
            </div>
          )}

          {/* History List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {last10.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No attempts yet</div>
            ) : (
              last10.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                  <span className="text-xs text-gray-500 font-mono w-5">#{i + 1}</span>
                  <span className={`font-bold text-sm ${a.time === best ? 'text-yellow-400' : 'text-white'}`}>
                    {a.time}ms
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {a.time <= 200 ? '🔥' : a.time <= 300 ? '⚡' : a.time <= 400 ? '👍' : '🐢'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Rating */}
          {avg > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 text-center">
              <div className="text-xs text-gray-400 font-medium mb-1">Rating</div>
              <div className={`text-lg font-black ${avg <= 200 ? 'text-yellow-400' : avg <= 250 ? 'text-green-400' : avg <= 350 ? 'text-blue-400' : 'text-orange-400'}`}>
                {avg <= 200 ? 'Elite' : avg <= 250 ? 'Fast' : avg <= 350 ? 'Average' : 'Warming Up'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReactionTest;
