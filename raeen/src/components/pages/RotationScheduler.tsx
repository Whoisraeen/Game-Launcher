import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Shuffle, Lock, Plus, Trash2, Play, Sparkles } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { CachedImage } from '../CachedImage';
import type { Game } from '../../types';

type Slot = { day: string; gameId?: string; locked: boolean };

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STORAGE_KEY = 'raeen.rotation.v1';

const Rotation: React.FC = () => {
  const { games, launchGame } = useGameStore();
  const [slots, setSlots] = useState<Slot[]>(DAYS.map(d => ({ day: d, locked: false })));
  const [pool, setPool] = useState<string[]>([]); // gameIds eligible for rotation
  const [poolSearch, setPoolSearch] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setSlots(data.slots || DAYS.map(d => ({ day: d, locked: false })));
        setPool(data.pool || []);
      }
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots, pool })); }, [slots, pool]);

  // Default-build a "neglected" pool: lowest playtime, not completed, not hidden
  useEffect(() => {
    if (pool.length || !games.length) return;
    const candidates = [...games]
      .filter(g => !g.isHidden && g.playStatus !== 'completed' && g.playStatus !== 'dropped')
      .sort((a, b) => (a.playtime || 0) - (b.playtime || 0))
      .slice(0, 14)
      .map(g => g.id);
    setPool(candidates);
  }, [games]);

  const gameMap = useMemo(() => new Map(games.map(g => [g.id, g])), [games]);

  const filteredCandidates = useMemo(() =>
    games.filter(g =>
      !pool.includes(g.id) &&
      !g.isHidden &&
      g.title.toLowerCase().includes(poolSearch.toLowerCase())
    ).slice(0, 50),
    [games, pool, poolSearch]
  );

  const generate = () => {
    const eligibleIds = pool.length ? pool : games.map(g => g.id);
    const available = [...eligibleIds].sort(() => Math.random() - 0.5);
    setSlots(prev => prev.map(s => {
      if (s.locked && s.gameId) return s;
      const id = available.pop();
      return { ...s, gameId: id };
    }));
  };

  const clear = () => setSlots(prev => prev.map(s => s.locked ? s : { ...s, gameId: undefined }));

  const toggleLock = (i: number) => setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, locked: !s.locked } : s));
  const setSlotGame = (i: number, gameId?: string) => setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, gameId } : s));

  const addToPool = (id: string) => setPool(prev => prev.includes(id) ? prev : [...prev, id]);
  const removeFromPool = (id: string) => setPool(prev => prev.filter(x => x !== id));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">ROTATION</h1>
          <p className="text-gray-400 font-medium">Weekly schedule that rotates neglected games into your week</p>
        </div>
        <div className="flex gap-2">
          <button onClick={clear} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-gray-300 hover:bg-white/5">
            Clear unlocked
          </button>
          <button onClick={generate} className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200">
            <Sparkles size={16} /> Auto-fill week
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-3 mb-6">
        {slots.map((slot, i) => {
          const game = slot.gameId ? gameMap.get(slot.gameId) : undefined;
          return (
            <motion.div key={slot.day} layout
              className={`relative rounded-2xl border overflow-hidden transition ${slot.locked ? 'border-yellow-500/40 ring-1 ring-yellow-500/20' : 'border-white/10 hover:border-white/20'} bg-white/[0.03]`}>
              <div className="px-3 py-2 flex items-center justify-between border-b border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{slot.day}</span>
                <button onClick={() => toggleLock(i)} title={slot.locked ? 'Unlock' : 'Lock'}
                  className={`p-1 rounded ${slot.locked ? 'text-yellow-300 bg-yellow-500/15' : 'text-gray-500 hover:text-white'}`}>
                  <Lock size={12} />
                </button>
              </div>
              <div className="aspect-[3/4] relative">
                {game ? (
                  <>
                    {game.cover ? <CachedImage src={game.cover} alt={game.title} className="w-full h-full object-cover" /> : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="text-xs font-bold text-white truncate">{game.title}</div>
                      <div className="text-[10px] text-gray-300 capitalize truncate">{game.platform}</div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button onClick={() => launchGame(game.id)} title="Launch"
                        className="p-1.5 rounded-md bg-black/60 hover:bg-blue-600 text-white">
                        <Play size={12} />
                      </button>
                      <button onClick={() => setSlotGame(i, undefined)} title="Clear"
                        className="p-1.5 rounded-md bg-black/60 hover:bg-red-600 text-white">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Shuffle size={20} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Pool */}
        <div className="glass-frosted rounded-2xl p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-300" />
              <span className="text-sm font-bold text-white">Rotation Pool</span>
              <span className="text-xs text-gray-500">{pool.length}</span>
            </div>
            <button onClick={() => setPool([])} className="text-xs text-gray-500 hover:text-red-300">Clear</button>
          </div>
          <p className="text-xs text-gray-400 mb-3">Games eligible for the auto-fill. Defaults to your most neglected titles.</p>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
            {pool.map(id => {
              const g = gameMap.get(id);
              if (!g) return null;
              return (
                <PoolRow key={id} game={g} onRemove={() => removeFromPool(id)} />
              );
            })}
            {pool.length === 0 && <p className="text-xs text-gray-500 py-4 text-center">Pool is empty.</p>}
          </div>
        </div>

        {/* Library to add */}
        <div className="glass-frosted rounded-2xl p-4 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Plus size={16} className="text-green-300" />
            <span className="text-sm font-bold text-white">Add From Library</span>
          </div>
          <input
            value={poolSearch}
            onChange={(e) => setPoolSearch(e.target.value)}
            placeholder="Search games…"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none mb-3"
          />
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
            {filteredCandidates.map(g => (
              <PoolRow key={g.id} game={g} action={
                <button onClick={() => addToPool(g.id)} className="p-1.5 rounded-md bg-blue-600/20 hover:bg-blue-600 text-blue-200 hover:text-white">
                  <Plus size={12} />
                </button>
              } />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PoolRow: React.FC<{ game: Game; action?: React.ReactNode; onRemove?: () => void }> = ({ game, action, onRemove }) => (
  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/5 transition">
    <div className="w-8 h-10 rounded overflow-hidden bg-slate-800 flex-shrink-0">
      {game.cover ? <CachedImage src={game.cover} alt={game.title} className="w-full h-full object-cover" /> : null}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm text-white truncate">{game.title}</div>
      <div className="text-[10px] text-gray-500 capitalize">{game.platform} • {Math.round(game.playtime || 0)}h</div>
    </div>
    {action}
    {onRemove && (
      <button onClick={onRemove} className="p-1.5 rounded-md text-gray-500 hover:text-red-300 hover:bg-red-500/10">
        <Trash2 size={12} />
      </button>
    )}
  </div>
);

export default Rotation;
