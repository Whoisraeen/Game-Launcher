import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Eye, Moon, Activity as ActivityIcon, Bell, Clock, Pause } from 'lucide-react';

interface WellnessSettings {
  breakReminders: boolean;
  breakIntervalMin: number;
  postureReminders: boolean;
  postureIntervalMin: number;
  eyeStrain: boolean;
  eyeStrainIntervalMin: number;   // 20-20-20 default
  hydrationReminders: boolean;
  hydrationIntervalMin: number;
  hardLimit: boolean;
  hardLimitMinutes: number;
  warnAtMinutes: number;
}

const DEFAULTS: WellnessSettings = {
  breakReminders: true, breakIntervalMin: 60,
  postureReminders: true, postureIntervalMin: 45,
  eyeStrain: true, eyeStrainIntervalMin: 20,
  hydrationReminders: false, hydrationIntervalMin: 90,
  hardLimit: false, hardLimitMinutes: 240, warnAtMinutes: 210,
};

const STORAGE_KEY = 'raeen.wellness.v1';
const SESSION_KEY = 'raeen.wellness.session.v1';

const Wellness: React.FC = () => {
  const [settings, setSettings] = useState<WellnessSettings>(DEFAULTS);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [reminder, setReminder] = useState<{ type: string; message: string; tip?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      const ses = localStorage.getItem(SESSION_KEY);
      if (ses) setSessionStart(parseInt(ses, 10));
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => {
    if (sessionStart) localStorage.setItem(SESSION_KEY, String(sessionStart));
    else localStorage.removeItem(SESSION_KEY);
  }, [sessionStart]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Reminder driver
  useEffect(() => {
    if (!sessionStart) return;
    const elapsedMin = (now - sessionStart) / 60000;

    const checks: Array<{ enabled: boolean; interval: number; type: string; message: string; tip?: string }> = [
      { enabled: settings.breakReminders, interval: settings.breakIntervalMin, type: 'break', message: 'Time for a break', tip: 'Stand up, stretch, walk around for 2-5 minutes.' },
      { enabled: settings.postureReminders, interval: settings.postureIntervalMin, type: 'posture', message: 'Posture check', tip: 'Roll shoulders back, align ears over shoulders, relax jaw.' },
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
        setReminder({ type: c.type, message: c.message, tip: c.tip });
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(c.message, { body: c.tip });
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

  const requestNotifications = () => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  };

  const elapsedMs = sessionStart ? now - sessionStart : 0;
  const elapsedH = Math.floor(elapsedMs / 3600000);
  const elapsedM = Math.floor((elapsedMs / 60000) % 60);
  const elapsedS = Math.floor((elapsedMs / 1000) % 60);

  const update = <K extends keyof WellnessSettings>(key: K, value: WellnessSettings[K]) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">WELLNESS</h1>
          <p className="text-gray-400 font-medium">Break, posture, and time-limit reminders for healthier sessions</p>
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
          icon={<ActivityIcon className="text-pink-300" />}
          title="Posture Reminders"
          description="Quick posture reset prompts"
          enabled={settings.postureReminders}
          onToggle={(v) => update('postureReminders', v)}
        >
          <Stepper label="Every" min={15} max={180} step={5} value={settings.postureIntervalMin} onChange={(v) => update('postureIntervalMin', v)} unit="min" disabled={!settings.postureReminders} />
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
          title="Daily Time Limit"
          description="Cap daily session length"
          enabled={settings.hardLimit}
          onToggle={(v) => update('hardLimit', v)}
          fullWidth
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

      <AnimatePresence>
        {reminder && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm">
            <div className="glass-frosted rounded-2xl p-4 border border-white/15 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center">
                  <Bell size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white">{reminder.message}</div>
                  {reminder.tip && <div className="text-xs text-gray-400 mt-1">{reminder.tip}</div>}
                </div>
                <button onClick={() => setReminder(null)} className="text-gray-400 hover:text-white text-xs">Dismiss</button>
              </div>
            </div>
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
      onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value || '0', 10))))}
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
