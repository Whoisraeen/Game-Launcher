import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Clock, CheckCircle2, ListTodo, Filter, Trash2, Play, X } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { CachedImage } from '../CachedImage';
import type { Game } from '../../types';

type Priority = 'critical' | 'high' | 'normal' | 'low';

interface BacklogEntry {
  gameId: string;
  priority: Priority;
  estimatedHours: number;
  addedAt: number;
  notes?: string;
}

const STORAGE_KEY = 'raeen.backlog.v1';

const priorityMeta: Record<Priority, { label: string; color: string; ring: string; weight: number }> = {
  critical: { label: 'Critical',  color: 'text-red-400 bg-red-500/15 border-red-500/30',     ring: 'ring-red-500/30',     weight: 4 },
  high:     { label: 'High',      color: 'text-orange-400 bg-orange-500/15 border-orange-500/30', ring: 'ring-orange-500/30', weight: 3 },
  normal:   { label: 'Normal',    color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',  ring: 'ring-blue-500/30',    weight: 2 },
  low:      { label: 'Low',       color: 'text-gray-400 bg-gray-500/15 border-gray-500/30',  ring: 'ring-gray-500/30',    weight: 1 },
};

const loadBacklog = (): BacklogEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveBacklog = (entries: BacklogEntry[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const Backlog: React.FC = () => {
  const { games, launchGame, updatePlayStatus } = useGameStore();
  const [entries, setEntries] = useState<BacklogEntry[]>([]);
  const [filter, setFilter] = useState<Priority | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { setEntries(loadBacklog()); }, []);
  useEffect(() => { saveBacklog(entries); }, [entries]);

  // Auto-seed from games marked playStatus === 'backlog' that aren't tracked yet
  useEffect(() => {
    if (!games.length) return;
    const tracked = new Set(entries.map(e => e.gameId));
    const additions = games
      .filter(g => g.playStatus === 'backlog' && !tracked.has(g.id))
      .map<BacklogEntry>(g => ({
        gameId: g.id,
        priority: 'normal',
        estimatedHours: estimateHours(g),
        addedAt: Date.now(),
      }));
    if (additions.length) setEntries(prev => [...prev, ...additions]);
  }, [games]);

  const gameMap = useMemo(() => new Map(games.map(g => [g.id, g])), [games]);

  const ranked = useMemo(() => {
    return [...entries]
      .filter(e => filter === 'all' ? true : e.priority === filter)
      .sort((a, b) => priorityMeta[b.priority].weight - priorityMeta[a.priority].weight || a.addedAt - b.addedAt);
  }, [entries, filter]);

  const totals = useMemo(() => {
    const totalHours = entries.reduce((sum, e) => sum + (e.estimatedHours || 0), 0);
    const completed = games.filter(g => g.playStatus === 'completed').length;
    return {
      count: entries.length,
      hours: totalHours,
      weeks: Math.ceil(totalHours / 8),
      completed,
    };
  }, [entries, games]);

  const updateEntry = (id: string, patch: Partial<BacklogEntry>) => {
    setEntries(prev => prev.map(e => e.gameId === id ? { ...e, ...patch } : e));
  };

  const removeEntry = (id: string) => setEntries(prev => prev.filter(e => e.gameId !== id));

  const markCompleted = async (id: string) => {
    await updatePlayStatus(id, 'completed');
    removeEntry(id);
  };

  const candidates = useMemo(
    () => games.filter(g => !entries.some(e => e.gameId === g.id) && g.playStatus !== 'completed'),
    [games, entries]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">BACKLOG</h1>
          <p className="text-gray-400 font-medium">Prioritize what to play next — with completion-time estimates</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
        >
          <ListTodo size={18} /> Add Game
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<ListTodo size={18} />} label="In Backlog" value={`${totals.count}`} />
        <StatCard icon={<Clock size={18} />}    label="Est. Hours" value={`${Math.round(totals.hours)}h`} />
        <StatCard icon={<Flame size={18} />}    label="Est. Weeks @ 8h/wk" value={`${totals.weeks}`} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={`${totals.completed}`} />
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-gray-500" />
        <FilterPill label="All" active={filter === 'all'} onClick={() => setFilter('all')} count={entries.length} />
        {(Object.keys(priorityMeta) as Priority[]).map(p => (
          <FilterPill
            key={p}
            label={priorityMeta[p].label}
            active={filter === p}
            onClick={() => setFilter(p)}
            count={entries.filter(e => e.priority === p).length}
            tone={priorityMeta[p].color}
          />
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
        {ranked.length === 0 ? (
          <EmptyState onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="space-y-2">
            {ranked.map(entry => {
              const game = gameMap.get(entry.gameId);
              if (!game) return null;
              return (
                <motion.div key={entry.gameId} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <BacklogRow
                    entry={entry}
                    game={game}
                    onPriorityChange={(p) => updateEntry(entry.gameId, { priority: p })}
                    onHoursChange={(h) => updateEntry(entry.gameId, { estimatedHours: h })}
                    onLaunch={() => launchGame(entry.gameId)}
                    onComplete={() => markCompleted(entry.gameId)}
                    onRemove={() => removeEntry(entry.gameId)}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddBacklogModal
            candidates={candidates}
            onClose={() => setShowAdd(false)}
            onAdd={(ids) => {
              setEntries(prev => [
                ...prev,
                ...ids.map<BacklogEntry>(id => ({
                  gameId: id,
                  priority: 'normal',
                  estimatedHours: estimateHours(gameMap.get(id)),
                  addedAt: Date.now(),
                })),
              ]);
              setShowAdd(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const estimateHours = (game?: Game): number => {
  if (!game) return 20;
  const genre = (game.genre || '').toLowerCase();
  if (genre.includes('rpg')) return 60;
  if (genre.includes('strategy') || genre.includes('simulation')) return 40;
  if (genre.includes('shooter') || genre.includes('action')) return 18;
  if (genre.includes('puzzle') || genre.includes('platform')) return 12;
  return 20;
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="glass-frosted rounded-2xl p-4">
    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">
      {icon} {label}
    </div>
    <div className="text-2xl font-black text-white tracking-tight">{value}</div>
  </div>
);

const FilterPill: React.FC<{ label: string; count: number; active: boolean; onClick: () => void; tone?: string }> = ({ label, count, active, onClick, tone }) => (
  <button
    onClick={onClick}
    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
      active
        ? (tone || 'text-white bg-white/10 border-white/20')
        : 'text-gray-400 border-white/5 hover:border-white/15 hover:text-white'
    }`}
  >
    {label} <span className="opacity-60 ml-1">{count}</span>
  </button>
);

const BacklogRow: React.FC<{
  entry: BacklogEntry;
  game: Game;
  onPriorityChange: (p: Priority) => void;
  onHoursChange: (h: number) => void;
  onLaunch: () => void;
  onComplete: () => void;
  onRemove: () => void;
}> = ({ entry, game, onPriorityChange, onHoursChange, onLaunch, onComplete, onRemove }) => {
  const meta = priorityMeta[entry.priority];
  return (
    <div className={`group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition-all ring-1 ${meta.ring}`}>
      <div className="w-12 h-16 rounded-md overflow-hidden bg-slate-800 flex-shrink-0">
        {game.cover ? <CachedImage src={game.cover} alt={game.title} className="w-full h-full object-cover" /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white truncate">{game.title}</div>
        <div className="text-xs text-gray-500 mt-0.5 capitalize">
          {game.platform} {game.genre ? `• ${game.genre}` : ''} {game.playtime ? `• ${Math.round(game.playtime)}h played` : ''}
        </div>
      </div>

      <select
        value={entry.priority}
        onChange={(e) => onPriorityChange(e.target.value as Priority)}
        className={`text-xs font-bold px-2.5 py-1.5 rounded-md border bg-black/30 ${meta.color} focus:outline-none`}
      >
        {(Object.keys(priorityMeta) as Priority[]).map(p => (
          <option key={p} value={p} className="bg-slate-900">{priorityMeta[p].label}</option>
        ))}
      </select>

      <div className="flex items-center gap-1.5 text-xs">
        <Clock size={12} className="text-gray-500" />
        <input
          type="number"
          min={0}
          value={entry.estimatedHours}
          onChange={(e) => onHoursChange(Math.max(0, parseInt(e.target.value || '0', 10)))}
          className="w-14 bg-black/30 border border-white/10 rounded-md px-2 py-1 text-white text-center focus:border-blue-500 focus:outline-none"
        />
        <span className="text-gray-500">hrs</span>
      </div>

      <button onClick={onLaunch} title="Launch" className="p-2 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 transition-colors">
        <Play size={14} />
      </button>
      <button onClick={onComplete} title="Mark complete" className="p-2 rounded-lg bg-green-600/15 hover:bg-green-600/30 text-green-300 transition-colors">
        <CheckCircle2 size={14} />
      </button>
      <button onClick={onRemove} title="Remove" className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );
};

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <ListTodo size={48} className="text-gray-600 mx-auto mb-4" />
      <p className="text-gray-300 text-lg font-bold">Nothing in your backlog yet</p>
      <p className="text-gray-500 text-sm mb-4">Add games and prioritize what to play next.</p>
      <button onClick={onAdd} className="px-5 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-gray-200">
        Add Game
      </button>
    </div>
  </div>
);

const AddBacklogModal: React.FC<{
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
          <h2 className="text-xl font-bold text-white">Add to Backlog</h2>
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
                {g.cover ? <CachedImage src={g.cover} alt={g.title} className="w-full h-full object-cover" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{g.title}</div>
                <div className="text-[10px] text-gray-500 capitalize">{g.platform}</div>
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

export default Backlog;
