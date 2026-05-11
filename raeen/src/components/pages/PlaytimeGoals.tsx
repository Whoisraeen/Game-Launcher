import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Trophy, Calendar, TrendingUp, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { CachedImage } from '../CachedImage';

type GoalScope = 'weekly' | 'monthly' | 'lifetime';
type GoalKind = 'playtime-game' | 'playtime-total' | 'completions' | 'achievements';

interface Goal {
  id: string;
  scope: GoalScope;
  kind: GoalKind;
  target: number;        // hours OR count
  gameId?: string;       // for playtime-game
  label: string;
  createdAt: number;
  baselineHours?: number;
  baselineCount?: number;
}

const STORAGE_KEY = 'raeen.goals.v1';
const loadGoals = (): Goal[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveGoals = (goals: Goal[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));

const PlaytimeGoals: React.FC = () => {
  const { games, weeklyActivity, loadWeeklyActivity } = useGameStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  useEffect(() => { setGoals(loadGoals()); loadWeeklyActivity(); }, []);
  useEffect(() => { saveGoals(goals); }, [goals]);

  const weeklyHours = weeklyActivity.reduce((sum, d) => sum + (Number(d.hours) || 0), 0);
  const totalLifetime = games.reduce((sum, g) => sum + (Number(g.playtime) || 0), 0);
  const totalCompleted = games.filter(g => g.playStatus === 'completed').length;
  const totalAchievements = games.reduce((sum, g) => sum + (g.achievements?.unlocked || 0), 0);

  const computeProgress = (goal: Goal): number => {
    switch (goal.kind) {
      case 'playtime-game': {
        const game = games.find(g => g.id === goal.gameId);
        const current = game?.playtime || 0;
        const baseline = goal.baselineHours || 0;
        return Math.min(100, ((current - baseline) / goal.target) * 100);
      }
      case 'playtime-total': {
        if (goal.scope === 'weekly') return Math.min(100, (weeklyHours / goal.target) * 100);
        return Math.min(100, ((totalLifetime - (goal.baselineHours || 0)) / goal.target) * 100);
      }
      case 'completions':
        return Math.min(100, ((totalCompleted - (goal.baselineCount || 0)) / goal.target) * 100);
      case 'achievements':
        return Math.min(100, ((totalAchievements - (goal.baselineCount || 0)) / goal.target) * 100);
    }
  };

  const removeGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));
  const upsertGoal = (g: Goal) => setGoals(prev => {
    const idx = prev.findIndex(x => x.id === g.id);
    if (idx === -1) return [...prev, g];
    const next = [...prev]; next[idx] = g; return next;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">PLAYTIME GOALS</h1>
          <p className="text-gray-400 font-medium">Set targets and track progress across your library</p>
        </div>
        <button onClick={() => { setEditing(null); setShowCreate(true); }} className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200">
          <Plus size={18} /> New Goal
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat icon={<Calendar size={18} />}   label="This Week"     value={`${(Number.isFinite(weeklyHours) ? weeklyHours : 0).toFixed(1)}h`} />
        <Stat icon={<TrendingUp size={18} />} label="Lifetime"      value={`${Math.round(totalLifetime)}h`} />
        <Stat icon={<Trophy size={18} />}     label="Completed"     value={`${totalCompleted}`} />
        <Stat icon={<Target size={18} />}     label="Active Goals"  value={`${goals.length}`} />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
        {goals.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Target size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-300 text-lg font-bold">No goals set</p>
              <p className="text-gray-500 text-sm mb-4">Set a weekly playtime goal or finish a long backlog.</p>
              <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-gray-200">
                Create First Goal
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => {
              const pct = Math.max(0, Math.min(100, computeProgress(goal)));
              const game = goal.gameId ? games.find(g => g.id === goal.gameId) : undefined;
              return (
                <motion.div key={goal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-frosted rounded-2xl p-5 group">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {game?.cover && (
                        <div className="w-10 h-14 rounded-md overflow-hidden bg-slate-800 flex-shrink-0">
                          <CachedImage src={game.cover} alt={game.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{goal.label}</div>
                        <div className="text-xs uppercase tracking-wider text-gray-500 mt-0.5">{goal.scope} • {goalKindLabel(goal.kind)}</div>
                      </div>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditing(goal); setShowCreate(true); }} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"><Pencil size={14} /></button>
                      <button onClick={() => removeGoal(goal.id)} className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden mb-2">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${pct >= 100 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{pct.toFixed(0)}% complete</span>
                    <span className="text-white font-bold">{progressLabel(goal, games, weeklyHours, totalLifetime, totalCompleted, totalAchievements)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <GoalEditor
            existing={editing}
            games={games}
            onClose={() => setShowCreate(false)}
            onSave={(g) => { upsertGoal(g); setShowCreate(false); }}
            currentBaselines={{ weeklyHours, totalLifetime, totalCompleted, totalAchievements }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const goalKindLabel = (kind: GoalKind) => ({
  'playtime-game': 'Game playtime',
  'playtime-total': 'Total playtime',
  'completions': 'Games completed',
  'achievements': 'Achievements',
}[kind]);

const progressLabel = (goal: Goal, games: any[], weekly: number, lifetime: number, done: number, achievements: number) => {
  switch (goal.kind) {
    case 'playtime-game': {
      const g = games.find(x => x.id === goal.gameId);
      const current = (g?.playtime || 0) - (goal.baselineHours || 0);
      return `${current.toFixed(1)} / ${goal.target}h`;
    }
    case 'playtime-total': {
      const cur = goal.scope === 'weekly' ? weekly : lifetime - (goal.baselineHours || 0);
      return `${cur.toFixed(1)} / ${goal.target}h`;
    }
    case 'completions': return `${done - (goal.baselineCount || 0)} / ${goal.target}`;
    case 'achievements': return `${achievements - (goal.baselineCount || 0)} / ${goal.target}`;
  }
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="glass-frosted rounded-2xl p-4">
    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">{icon} {label}</div>
    <div className="text-2xl font-black text-white tracking-tight">{value}</div>
  </div>
);

const GoalEditor: React.FC<{
  existing: Goal | null;
  games: any[];
  onClose: () => void;
  onSave: (g: Goal) => void;
  currentBaselines: { weeklyHours: number; totalLifetime: number; totalCompleted: number; totalAchievements: number };
}> = ({ existing, games, onClose, onSave, currentBaselines }) => {
  const [scope, setScope] = useState<GoalScope>(existing?.scope || 'weekly');
  const [kind, setKind] = useState<GoalKind>(existing?.kind || 'playtime-total');
  const [target, setTarget] = useState<number>(existing?.target || 10);
  const [gameId, setGameId] = useState<string | undefined>(existing?.gameId);
  const [label, setLabel] = useState(existing?.label || '');

  const submit = () => {
    const g = games.find(x => x.id === gameId);
    const baselineHours = kind === 'playtime-game' ? (g?.playtime || 0) :
                          kind === 'playtime-total' && scope !== 'weekly' ? currentBaselines.totalLifetime : 0;
    const baselineCount = kind === 'completions' ? currentBaselines.totalCompleted :
                          kind === 'achievements' ? currentBaselines.totalAchievements : 0;
    const goal: Goal = {
      id: existing?.id || `goal_${Date.now()}`,
      scope, kind, target,
      gameId: kind === 'playtime-game' ? gameId : undefined,
      label: label || autoLabel(scope, kind, target, g?.title),
      createdAt: existing?.createdAt || Date.now(),
      baselineHours: existing?.baselineHours ?? baselineHours,
      baselineCount: existing?.baselineCount ?? baselineCount,
    };
    onSave(goal);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{existing ? 'Edit Goal' : 'New Goal'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Type">
            <select value={kind} onChange={(e) => setKind(e.target.value as GoalKind)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white">
              <option value="playtime-total">Total playtime</option>
              <option value="playtime-game">Playtime in a specific game</option>
              <option value="completions">Games completed</option>
              <option value="achievements">Achievements unlocked</option>
            </select>
          </Field>
          <Field label="Scope">
            <div className="grid grid-cols-3 gap-2">
              {(['weekly','monthly','lifetime'] as GoalScope[]).map(s => (
                <button key={s} onClick={() => setScope(s)} className={`px-3 py-2 rounded-lg text-sm font-bold capitalize border transition ${scope === s ? 'bg-blue-600/20 border-blue-500/50 text-blue-200' : 'border-white/10 text-gray-400 hover:text-white'}`}>{s}</button>
              ))}
            </div>
          </Field>
          {kind === 'playtime-game' && (
            <Field label="Game">
              <select value={gameId || ''} onChange={(e) => setGameId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white">
                <option value="">Select a game…</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </Field>
          )}
          <Field label={`Target (${kind.startsWith('playtime') ? 'hours' : 'count'})`}>
            <input type="number" min={1} value={target} onChange={(e) => setTarget(parseFloat(e.target.value || '0'))}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" />
          </Field>
          <Field label="Label (optional)">
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Beat Elden Ring"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" />
          </Field>
        </div>
        <div className="p-5 border-t border-white/10 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">Cancel</button>
          <button onClick={submit} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white">Save Goal</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const autoLabel = (scope: GoalScope, kind: GoalKind, target: number, gameTitle?: string) => {
  const noun = kind === 'playtime-game' ? `${gameTitle || 'a game'}` : kind === 'playtime-total' ? 'gaming' : kind === 'completions' ? 'completions' : 'achievements';
  const unit = kind.startsWith('playtime') ? 'hrs' : '';
  return `${scope === 'weekly' ? 'This week' : scope === 'monthly' ? 'This month' : 'Lifetime'}: ${target}${unit} of ${noun}`;
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</label>
    {children}
  </div>
);

export default PlaytimeGoals;
