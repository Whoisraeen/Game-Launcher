import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Plus, X, Play, Check, Timer, Hourglass } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { CachedImage } from '../CachedImage';
import type { Game } from '../../types';

interface HLTBData {
  gameplayMain: number;
  gameplayMainExtra: number;
  gameplayCompletionist: number;
}

interface PlannerEntry {
  gameId: string;
  hltb: HLTBData | null;
  loading: boolean;
}

const STORAGE_KEY = 'raeen.sessionPlanner.v1';

const loadSaved = (): { entries: string[]; availableTime: number } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { entries: [], availableTime: 120 };
  } catch { return { entries: [], availableTime: 120 }; }
};

const SessionPlanner: React.FC = () => {
  const { games, launchGame } = useGameStore();
  const [entries, setEntries] = useState<PlannerEntry[]>([]);
  const [availableTime, setAvailableTime] = useState(120);
  const [showPicker, setShowPicker] = useState(false);
  const [hltbCache, setHltbCache] = useState<Record<string, HLTBData | null>>({});

  useEffect(() => {
    const saved = loadSaved();
    setAvailableTime(saved.availableTime);
    if (saved.entries.length > 0) {
      setEntries(saved.entries.map(id => ({ gameId: id, hltb: null, loading: true })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      entries: entries.map(e => e.gameId),
      availableTime,
    }));
  }, [entries, availableTime]);

  const fetchHLTB = async (gameName: string, gameId: string) => {
    if (hltbCache[gameId] !== undefined) {
      return hltbCache[gameId];
    }
    try {
      const result = await window.ipcRenderer.invoke('hltb:search', gameName);
      const data: HLTBData | null = result ? {
        gameplayMain: result.gameplayMain || 0,
        gameplayMainExtra: result.gameplayMainExtra || 0,
        gameplayCompletionist: result.gameplayCompletionist || 0,
      } : null;
      setHltbCache(prev => ({ ...prev, [gameId]: data }));
      return data;
    } catch {
      setHltbCache(prev => ({ ...prev, [gameId]: null }));
      return null;
    }
  };

  useEffect(() => {
    entries.forEach(async (entry) => {
      if (!entry.loading) return;
      const game = games.find(g => g.id === entry.gameId);
      if (!game) return;
      const data = await fetchHLTB(game.title, entry.gameId);
      setEntries(prev => prev.map(e =>
        e.gameId === entry.gameId ? { ...e, hltb: data, loading: false } : e
      ));
    });
  }, [entries.map(e => e.gameId + e.loading).join(',')]);

  const gameMap = useMemo(() => new Map(games.map(g => [g.id, g])), [games]);

  const backlogGames = useMemo(() =>
    games.filter(g =>
      g.status === 'installed' &&
      !g.isHidden &&
      (g.playStatus === 'backlog' || g.playStatus === 'playing' || !g.playStatus || g.playStatus === 'none')
    ),
    [games]
  );

  const addGame = async (gameId: string) => {
    if (entries.some(e => e.gameId === gameId)) return;
    setEntries(prev => [...prev, { gameId, hltb: null, loading: true }]);
  };

  const removeGame = (gameId: string) => {
    setEntries(prev => prev.filter(e => e.gameId !== gameId));
  };

  const totalHours = useMemo(() => {
    return entries.reduce((sum, e) => {
      const hours = e.hltb?.gameplayMain || estimateFallback(gameMap.get(e.gameId));
      return sum + hours;
    }, 0);
  }, [entries, gameMap]);

  const fitsInSession = (entry: PlannerEntry): boolean => {
    const hours = entry.hltb?.gameplayMain || estimateFallback(gameMap.get(entry.gameId));
    return hours <= availableTime;
  };

  const timeLabels: Record<number, string> = {
    30: '30 min', 60: '1 hour', 90: '1.5 hours', 120: '2 hours',
    180: '3 hours', 240: '4 hours', 360: '6 hours', 480: '8 hours',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">SESSION PLANNER</h1>
          <p className="text-gray-400 font-medium">Plan your play session with real completion-time estimates</p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
        >
          <Plus size={18} /> Add Game
        </button>
      </div>

      {/* Time Budget */}
      <div className="glass-frosted rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 text-gray-300 font-bold text-sm">
            <Timer size={16} className="text-blue-400" />
            Available Time
          </div>
          <span className="text-lg font-black text-blue-400">
            {timeLabels[availableTime] || `${availableTime / 60}h`}
          </span>
        </div>
        <input
          type="range"
          min={30}
          max={480}
          step={30}
          value={availableTime}
          onChange={(e) => setAvailableTime(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between mt-2 text-[10px] text-gray-500 uppercase font-bold tracking-wider">
          <span>30m</span>
          <span>2h</span>
          <span>4h</span>
          <span>8h</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={<Calendar size={16} />}
          label="Games Planned"
          value={`${entries.length}`}
        />
        <StatCard
          icon={<Hourglass size={16} />}
          label="Total Est. Time"
          value={`${Math.round(totalHours)}h`}
          warn={totalHours > availableTime}
        />
        <StatCard
          icon={<Check size={16} />}
          label="Fits in Session"
          value={`${entries.filter(fitsInSession).length} / ${entries.length}`}
        />
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
        {entries.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Calendar size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-300 text-lg font-bold">No games in your session</p>
              <p className="text-gray-500 text-sm mb-4">Add games from your library to plan your play session.</p>
              <button onClick={() => setShowPicker(true)} className="px-5 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-gray-200">
                Add Game
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => {
              const game = gameMap.get(entry.gameId);
              if (!game) return null;
              const hours = entry.hltb?.gameplayMain || estimateFallback(game);
              const fits = hours <= availableTime;
              return (
                <motion.div
                  key={entry.gameId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className={`group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border transition-all ${
                    fits
                      ? 'border-green-500/20 hover:border-green-500/40 ring-1 ring-green-500/10'
                      : 'border-red-500/20 hover:border-red-500/40 ring-1 ring-red-500/10'
                  } hover:bg-white/[0.06]`}>
                    <div className="w-12 h-16 rounded-md overflow-hidden bg-slate-800 flex-shrink-0">
                      {game.cover && <CachedImage src={game.cover} alt={game.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{game.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 capitalize">
                        {game.platform} {game.genre ? `• ${game.genre}` : ''}
                      </div>
                    </div>

                    {/* HLTB Times */}
                    <div className="flex items-center gap-4 text-xs">
                      {entry.loading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          Loading…
                        </div>
                      ) : entry.hltb ? (
                        <>
                          <TimeChip label="Main" hours={entry.hltb.gameplayMain} highlight />
                          <TimeChip label="+ Extra" hours={entry.hltb.gameplayMainExtra} />
                          <TimeChip label="100%" hours={entry.hltb.gameplayCompletionist} />
                        </>
                      ) : (
                        <span className="text-gray-500 text-xs">~{estimateFallback(game)}h (est.)</span>
                      )}
                    </div>

                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      fits ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}>
                      {fits ? 'Fits' : 'Too long'}
                    </div>

                    <button
                      onClick={() => launchGame(entry.gameId)}
                      title="Launch"
                      className="p-2 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 transition-colors"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => removeGame(entry.gameId)}
                      title="Remove"
                      className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPicker && (
          <GamePickerModal
            candidates={backlogGames.filter(g => !entries.some(e => e.gameId === g.id))}
            onClose={() => setShowPicker(false)}
            onAdd={(ids) => { ids.forEach(addGame); setShowPicker(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const estimateFallback = (game?: Game): number => {
  if (!game) return 20;
  const genre = (game.genre || '').toLowerCase();
  if (genre.includes('rpg')) return 60;
  if (genre.includes('strategy') || genre.includes('simulation')) return 40;
  if (genre.includes('shooter') || genre.includes('action')) return 18;
  if (genre.includes('puzzle') || genre.includes('platform')) return 12;
  if (genre.includes('indie')) return 10;
  return 20;
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; warn?: boolean }> = ({ icon, label, value, warn }) => (
  <div className="glass-frosted rounded-2xl p-4">
    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">
      {icon} {label}
    </div>
    <div className={`text-2xl font-black tracking-tight ${warn ? 'text-red-400' : 'text-white'}`}>{value}</div>
  </div>
);

const TimeChip: React.FC<{ label: string; hours: number; highlight?: boolean }> = ({ label, hours, highlight }) => (
  <div className="flex flex-col items-center">
    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{label}</span>
    <span className={`font-bold ${highlight ? 'text-blue-400' : 'text-gray-300'}`}>
      {hours > 0 ? `${Math.round(hours)}h` : '—'}
    </span>
  </div>
);

const GamePickerModal: React.FC<{
  candidates: Game[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}> = ({ candidates, onClose, onAdd }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filtered = useMemo(() =>
    candidates.filter(g => g.title.toLowerCase().includes(search.toLowerCase())).slice(0, 200),
    [candidates, search]
  );
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add to Session</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your library..."
            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No games found.</p>
          ) : filtered.map(g => (
            <label key={g.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-white/5 rounded-lg px-2">
              <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)} className="accent-blue-500" />
              <div className="w-8 h-10 rounded overflow-hidden bg-slate-800 flex-shrink-0">
                {g.cover && <CachedImage src={g.cover} alt={g.title} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{g.title}</div>
                <div className="text-[10px] text-gray-500 capitalize">{g.platform} {g.genre ? `• ${g.genre}` : ''}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="p-4 border-t border-white/10 flex justify-between items-center">
          <span className="text-xs text-gray-500">{selected.size} selected</span>
          <button
            disabled={selected.size === 0}
            onClick={() => onAdd([...selected])}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-white transition"
          >
            Add {selected.size || ''} Game{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SessionPlanner;
