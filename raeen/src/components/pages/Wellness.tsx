import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Eye, Moon, Activity as ActivityIcon, Bell, Clock, Pause, Shield, Dumbbell, CheckCircle2 } from 'lucide-react';

interface WellnessSettings {
  breakReminders: boolean;
  breakIntervalMin: number;
  postureReminders: boolean;
  postureIntervalMin: number;
  eyeStrain: boolean;
  eyeStrainIntervalMin: number;
  hydrationReminders: boolean;
  hydrationIntervalMin: number;
  hardLimit: boolean;
  hardLimitMinutes: number;
  warnAtMinutes: number;
  dailyLimitHours: number;
  dailyLimitEnabled: boolean;
}

const DEFAULTS: WellnessSettings = {
  breakReminders: true, breakIntervalMin: 60,
  postureReminders: true, postureIntervalMin: 45,
  eyeStrain: true, eyeStrainIntervalMin: 20,
  hydrationReminders: false, hydrationIntervalMin: 90,
  hardLimit: false, hardLimitMinutes: 240, warnAtMinutes: 210,
  dailyLimitHours: 4, dailyLimitEnabled: false,
};

const STORAGE_KEY = 'raeen.wellness.v1';
const SESSION_KEY = 'raeen.wellness.session.v1';
const POSTURE_LOG_KEY = 'raeen.wellness.posture.log.v1';

const STRETCHES = [
  { name: 'Neck Rolls', description: 'Slowly roll your head in a circle, 5 times each direction.' },
  { name: 'Shoulder Shrugs', description: 'Raise shoulders to ears, hold 3 seconds, release. Repeat 10x.' },
  { name: 'Chest Opener', description: 'Clasp hands behind back, push chest forward, hold 15s.' },
  { name: 'Wrist Circles', description: 'Extend arms, rotate wrists 10 times each direction.' },
  { name: 'Seated Twist', description: 'Cross right leg over left, twist torso right. Hold 15s each side.' },
  { name: 'Cat-Cow Stretch', description: 'Arch your back, then round it. Repeat 8 times slowly.' },
  { name: 'Standing Quad Stretch', description: 'Pull heel to glute, hold 20s each leg.' },
  { name: 'Hip Flexor Stretch', description: 'Lunge position, push hips forward gently. Hold 20s each side.' },
];

const Wellness: React.FC = () => {
  const [settings, setSettings] = useState<WellnessSettings>(DEFAULTS);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [reminder, setReminder] = useState<{ type: string; message: string; tip?: string; stretch?: typeof STRETCHES[0] } | null>(null);
  const [showLimitOverlay, setShowLimitOverlay] = useState(false);
  const [limitPercentage, setLimitPercentage] = useState(0);
  const [postureLog, setPostureLog] = useState<Array<{ time: number; acknowledged: boolean }>>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      const ses = localStorage.getItem(SESSION_KEY);
      if (ses) setSessionStart(parseInt(ses, 10));
      const log = localStorage.getItem(POSTURE_LOG_KEY);
      if (log) setPostureLog(JSON.parse(log));
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => {
    if (sessionStart) localStorage.setItem(SESSION_KEY, String(sessionStart));
    else localStorage.removeItem(SESSION_KEY);
  }, [sessionStart]);
  useEffect(() => { localStorage.setItem(POSTURE_LOG_KEY, JSON.stringify(postureLog.slice(-50))); }, [postureLog]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Daily limit checker
  useEffect(() => {
    if (!sessionStart || !settings.dailyLimitEnabled) return;
    const elapsedMin = (now - sessionStart) / 60000;
    const limitMin = settings.dailyLimitHours * 60;
    const pct = Math.min(100, (elapsedMin / limitMin) * 100);
    setLimitPercentage(pct);

    if (pct >= 100 && !showLimitOverlay) {
      setShowLimitOverlay(true);
    }
  }, [now, sessionStart, settings.dailyLimitEnabled, settings.dailyLimitHours]);

  // Reminder driver
  useEffect(() => {
    if (!sessionStart) return;
    const elapsedMin = (now - sessionStart) / 60000;

    const checks: Array<{ enabled: boolean; interval: number; type: string; message: string; tip?: string; isPosture?: boolean }> = [
      { enabled: settings.breakReminders, interval: settings.breakIntervalMin, type: 'break', message: 'Time for a break', tip: 'Stand up, stretch, walk around for 2-5 minutes.' },
      { enabled: settings.postureReminders, interval: settings.postureIntervalMin, type: 'posture', message: 'Posture check', tip: 'Roll shoulders back, align ears over shoulders, relax jaw.', isPosture: true },
      { enabled: settings.eyeStrain, interval: settings.eyeStrainIntervalMin, type: 'eye', message: '20-20-20 break', tip: 'Look at something 20 feet away for 20 seconds.' },
      { enabled: settings.hydrationReminders, interval: settings.hydrationIntervalMin, type: 'hydrate', message: 'Hydrate', tip: 'Take a sip of water — your reflexes will thank you.' },
    ];

    for (const c of checks) {
      if (!c.enabled || c.interval <= 0) continue;
      const lastFiredKey = `raeen.wellness.last.${c.type}`;
      const last = parseFloat(localStorage.getItem(lastFiredKey) || '0');
      const minsSince = (Date.now() - last) / 60000;
      if (minsSince >= c.interval && elapsedMin >= c.interval) {
        localStorage.setItem(lastFiredKey, String(Date.now()));
        const stretch = c.isPosture ? STRETCHES[Math.floor(Math.random() * STRETCHES.length)] : undefined;
        setReminder({ type: c.type, message: c.message, tip: c.tip, stretch });
        if (c.isPosture) {
          setPostureLog(prev => [...prev, { time: Date.now(), acknowledged: false }]);
        }
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(c.message, { body: stretch ? `${stretch.name}: ${stretch.description}` : c.tip });
        }
        break;
      }
    }

    if (settings.hardLimit) {
      const total = elapsedMin;
      if (total >= settings.warnAtMinutes && total < settings.hardLimitMinutes) {
        const lastFiredKey = `raeen.wellness.last.warn`;
        const last = parseFloat(localStorage.getItem(lastFiredKey) || '0');
        if (Date.now() - last > 60_000 * 5) {
          localStorage.setItem(lastFiredKey, String(Date.now()));
          setReminder({ type: 'warn', message: `Approaching session limit`, tip: `Hard limit at ${settings.hardLimitMinutes} minutes. Save your progress.` });
        }
      }
      if (total >= settings.hardLimitMinutes) {
        setReminder({ type: 'limit', message: 'Daily limit reached', tip: 'Time to step away. Your eyes and back will thank you tomorrow.' });
      }
    }
  }, [now, sessionStart, settings]);

  const acknowledgePosture = useCallback(() => {
    setPostureLog(prev => {
      const updated = [...prev];
      if (updated.length > 0) updated[updated.length - 1].acknowledged = true;
      return updated;
    });
    setReminder(null);
  }, []);

  const requestNotifications = () => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  };

  const elapsedMs = sessionStart ? now - sessionStart : 0;
  const elapsedH = Math.floor(elapsedMs / 3600000);
  const elapsedM = Math.floor((elapsedMs / 60000) % 60);
  const elapsedS = Math.floor((elapsedMs / 1000) % 60);

  const postureCompliance = useMemo(() => {
    const recent = postureLog.filter(l => Date.now() - l.time < 24 * 60 * 60 * 1000);
    if (recent.length === 0) return 100;
    const acked = recent.filter(l => l.acknowledged).length;
    return Math.round((acked / recent.length) * 100);
  }, [postureLog, now]);

  const update = <K extends keyof WellnessSettings>(key: K, value: WellnessSettings[K]) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">WELLNESS</h1>
          <p className="text-gray-400 font-medium">Break, posture, time-limit reminders and healthy session habits</p>
        </div>
      </div>

      {/* Session card */}
      <div className="glass-frosted rounded-2xl p-5 mb-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Clock size={26} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase font-bold tracking-wider text-gray-400">Current session</div>
          <div className="text-3xl font-black text-white font-mono">
            {String(elapsedH).padStart(2, '0')}:{String(elapsedM).padStart(2, '0')}:{String(elapsedS).padStart(2, '0')}
          </div>
          {settings.dailyLimitEnabled && sessionStart && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[200px]">
                <div className={`h-full rounded-full transition-all ${limitPercentage >= 100 ? 'bg-red-500' : limitPercentage >= 80 ? 'bg-orange-400' : 'bg-green-400'}`}
                  style={{ width: `${Math.min(100, limitPercentage)}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">{Math.round(limitPercentage)}% of daily limit</span>
            </div>
          )}
        </div>
        {sessionStart ? (
          <button onClick={() => setSessionStart(null)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition">
            <Pause size={16} /> End Session
          </button>
        ) : (
          <button onClick={() => { setSessionStart(Date.now()); requestNotifications(); }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200">
            <ActivityIcon size={16} /> Start Tracking
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Daily Limit Section */}
        <ToggleCard
          icon={<Shield className="text-red-300" />}
          title="Daily Time Limit"
          description="Set max hours per day with gentle warnings"
          enabled={settings.dailyLimitEnabled}
          onToggle={(v) => update('dailyLimitEnabled', v)}
          fullWidth
        >
          <div className="space-y-3">
            <Stepper label="Max hours/day" min={1} max={16} step={0.5} value={settings.dailyLimitHours} onChange={(v) => update('dailyLimitHours', v)} unit="hrs" disabled={!settings.dailyLimitEnabled} />
            <p className="text-[11px] text-gray-500">Warning at 80% • Overlay at 100% (no forced quit)</p>
          </div>
        </ToggleCard>

        {/* Posture Reminder - Enhanced */}
        <ToggleCard
          icon={<Dumbbell className="text-pink-300" />}
          title="Posture Reminders"
          description="Stretching exercises + compliance tracking"
          enabled={settings.postureReminders}
          onToggle={(v) => update('postureReminders', v)}
          fullWidth
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[30, 45, 60].map(interval => (
                <button key={interval} onClick={() => update('postureIntervalMin', interval)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${settings.postureIntervalMin === interval ? 'bg-pink-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  Every {interval} min
                </button>
              ))}
              <Stepper label="Custom" min={15} max={180} step={5} value={settings.postureIntervalMin} onChange={(v) => update('postureIntervalMin', v)} unit="min" disabled={!settings.postureReminders} />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <CheckCircle2 size={16} className={postureCompliance >= 70 ? 'text-green-400' : 'text-orange-400'} />
              <div className="flex-1">
                <div className="text-xs text-gray-400">Today's compliance</div>
                <div className="text-sm font-bold text-white">{postureCompliance}% acknowledged</div>
              </div>
              <div className="w-16 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${postureCompliance >= 70 ? 'bg-green-400' : 'bg-orange-400'}`}
                  style={{ width: `${postureCompliance}%` }} />
              </div>
            </div>
          </div>
        </ToggleCard>

        <ToggleCard
          icon={<Coffee className="text-amber-300" />}
          title="Break Reminders"
          description="Stand up, stretch, walk around"
          enabled={settings.breakReminders}
          onToggle={(v) => update('breakReminders', v)}
        >
          <Stepper label="Every" min={15} max={180} step={5} value={settings.breakIntervalMin} onChange={(v) => update('breakIntervalMin', v)} unit="min" disabled={!settings.breakReminders} />
        </ToggleCard>

        <ToggleCard
          icon={<Eye className="text-cyan-300" />}
          title="Eye Strain (20-20-20)"
          description="Look at something 20ft away for 20s"
          enabled={settings.eyeStrain}
          onToggle={(v) => update('eyeStrain', v)}
        >
          <Stepper label="Every" min={10} max={60} step={5} value={settings.eyeStrainIntervalMin} onChange={(v) => update('eyeStrainIntervalMin', v)} unit="min" disabled={!settings.eyeStrain} />
        </ToggleCard>

        <ToggleCard
          icon={<Coffee className="text-blue-300" />}
          title="Hydration"
          description="Take a sip of water"
          enabled={settings.hydrationReminders}
          onToggle={(v) => update('hydrationReminders', v)}
        >
          <Stepper label="Every" min={30} max={240} step={15} value={settings.hydrationIntervalMin} onChange={(v) => update('hydrationIntervalMin', v)} unit="min" disabled={!settings.hydrationReminders} />
        </ToggleCard>

        <ToggleCard
          icon={<Moon className="text-purple-300" />}
          title="Session Hard Limit"
          description="Cap individual session length"
          enabled={settings.hardLimit}
          onToggle={(v) => update('hardLimit', v)}
        >
          <div className="flex flex-wrap gap-4">
            <Stepper label="Warn at" min={30} max={600} step={15} value={settings.warnAtMinutes} onChange={(v) => update('warnAtMinutes', v)} unit="min" disabled={!settings.hardLimit} />
            <Stepper label="Hard limit" min={30} max={720} step={15} value={settings.hardLimitMinutes} onChange={(v) => update('hardLimitMinutes', v)} unit="min" disabled={!settings.hardLimit} />
          </div>
        </ToggleCard>

        <div className="glass-frosted rounded-2xl p-5 md:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="text-yellow-300" size={20} />
            <span className="font-bold text-white">System Notifications</span>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Allow desktop notifications so reminders pop even when Raeen is in the background.
          </p>
          <button onClick={requestNotifications}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition">
            {('Notification' in window && Notification.permission === 'granted') ? 'Notifications enabled' : 'Enable notifications'}
          </button>
        </div>
      </div>

      {/* Posture/Break Reminder Toast */}
      <AnimatePresence>
        {reminder && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm">
            <div className="glass-frosted rounded-2xl p-4 border border-white/15 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center shrink-0">
                  {reminder.type === 'posture' ? <Dumbbell size={18} className="text-white" /> : <Bell size={18} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white">{reminder.message}</div>
                  {reminder.tip && <div className="text-xs text-gray-400 mt-1">{reminder.tip}</div>}
                  {reminder.stretch && (
                    <div className="mt-2 p-2 rounded-lg bg-white/[0.04] border border-white/10">
                      <div className="text-xs font-bold text-pink-300">{reminder.stretch.name}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{reminder.stretch.description}</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {reminder.type === 'posture' && (
                    <button onClick={acknowledgePosture} className="text-green-400 hover:text-green-300 text-[10px] font-bold bg-green-500/10 px-2 py-1 rounded">Done</button>
                  )}
                  <button onClick={() => setReminder(null)} className="text-gray-400 hover:text-white text-[10px]">Dismiss</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Limit Reached Overlay */}
      <AnimatePresence>
        {showLimitOverlay && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-frosted rounded-3xl p-8 max-w-md w-full mx-4 border border-red-500/20 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Daily Limit Reached</h2>
              <p className="text-gray-400 mb-6">
                You've used your full {settings.dailyLimitHours} hours today. Time to step away — your body and eyes will thank you!
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowLimitOverlay(false)}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition">
                  I'll stop soon
                </button>
                <button onClick={() => { setShowLimitOverlay(false); setSessionStart(null); }}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition">
                  End Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ToggleCard: React.FC<{
  icon: React.ReactNode; title: string; description: string;
  enabled: boolean; onToggle: (v: boolean) => void;
  children?: React.ReactNode; fullWidth?: boolean;
}> = ({ icon, title, description, enabled, onToggle, children, fullWidth }) => (
  <div className={`glass-frosted rounded-2xl p-5 ${fullWidth ? 'md:col-span-2' : ''}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">{icon}</div>
        <div>
          <div className="font-bold text-white">{title}</div>
          <div className="text-xs text-gray-400">{description}</div>
        </div>
      </div>
      <Toggle value={enabled} onChange={onToggle} />
    </div>
    {children && <div className={enabled ? '' : 'opacity-50 pointer-events-none'}>{children}</div>}
  </div>
);

const Stepper: React.FC<{ label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string; disabled?: boolean }> = ({ label, value, onChange, min, max, step = 1, unit, disabled }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs uppercase font-bold tracking-wider text-gray-400">{label}</span>
    <input type="number" min={min} max={max} step={step} value={value} disabled={disabled}
      onChange={(e) => onChange(Math.max(min, Math.min(max, parseFloat(e.target.value || '0'))))}
      className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white text-sm" />
    {unit && <span className="text-xs text-gray-500">{unit}</span>}
  </div>
);

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-white/10'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : ''}`} />
  </button>
);

export default Wellness;
