import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import { Ghost, Settings as SettingsIcon, Bell, MonitorPlay, Activity } from 'lucide-react';
import { useSettingsStore } from './stores/settingsStore';
import { useGameStore } from './stores/gameStore';
import { NavigationProvider } from './context/NavigationContext';
import BigPictureLayout from './components/BigPicture/BigPictureLayout';
import { useTheme } from './hooks/useTheme';
import Overlay from './components/Overlay';
import { usePerformanceStore } from './stores/performanceStore';
import ThemeController from './components/ThemeController';
import GamepadMapper from './components/GamepadMapper';
import SystemStatus from './components/SystemStatus';
import UpdatesWidget from './components/UpdatesWidget';
import CloudSyncWidget from './components/CloudSyncWidget';

// Pages
import Library from './components/pages/Library';
import Store from './components/pages/Store';
import Friends from './components/pages/Friends';
import News from './components/pages/News';
import Analytics from './components/pages/Analytics';
import Mods from './components/pages/Mods';
import Settings from './components/pages/Settings';
import Collections from './components/pages/Collections';
import Wishlist from './components/pages/Wishlist';
import SocialHub from './components/pages/SocialHub';
import Widgets from './components/Widgets';
import SmartDashboard from './components/pages/SmartDashboard';
import SaveManager from './components/pages/SaveManager';
import Studio from './components/pages/Studio';
import HardwareLab from './components/pages/HardwareLab';
import Troubleshooter from './components/tools/Troubleshooter';
import Achievements from './components/pages/Achievements';
import Screenshots from './components/pages/Screenshots';
import DLCManager from './components/pages/DLCManager';
import Backlog from './components/pages/Backlog';
import PlaytimeGoals from './components/pages/PlaytimeGoals';
import ShaderCache from './components/pages/ShaderCache';
import DriverUpdater from './components/pages/DriverUpdater';
import AimTrainer from './components/pages/AimTrainer';
import CrosshairOverlay from './components/pages/CrosshairOverlay';
import Wellness from './components/pages/Wellness';
import Rotation from './components/pages/RotationScheduler';
import Reviews from './components/pages/Reviews';
import SessionPlanner from './components/pages/SessionPlanner';
import ReactionTest from './components/pages/ReactionTest';
import KeybindManager from './components/pages/KeybindManager';
import AudioSwitcher from './components/pages/AudioSwitcher';
import NetworkOptimizer from './components/pages/NetworkOptimizer';
import InputLagTest from './components/pages/InputLagTest';
import GameCalendar from './components/pages/GameCalendar';
import FOVCalculator from './components/pages/FOVCalculator';
import StreamSchedule from './components/pages/StreamSchedule';
import ChatOverlay from './components/pages/ChatOverlay';
import ThumbnailCreator from './components/pages/ThumbnailCreator';
import StreamOverlays from './components/pages/StreamOverlays';
import CommandPalette from './components/CommandPalette';
import ThemeStore from './components/pages/ThemeStore';
import ProUpgrade from './components/pages/ProUpgrade';
import ClanManager from './components/pages/ClanManager';
import BuddyFinder from './components/pages/BuddyFinder';
import MonitorCalibration from './components/MonitorCalibration';
import ParticleBackground from './components/ParticleBackground';
import { FALLBACK_LAUNCHER_BG } from './utils/backgroundAssetUrl';
import { useLauncherBackgroundSrc } from './hooks/useLauncherBackgroundSrc';

const RECENT_KEY = 'raeen.recentPages.v1';
const SECTION_HOTKEYS: Record<string, string> = {
  '1': 'Library',
  '2': 'Backlog',
  '3': 'SmartDashboard',
  '4': 'Friends',
  '5': 'Analytics',
  '6': 'HardwareLab',
};

function App() {
  const [activePage, setActivePage] = useState('Library');
  const [isBigPicture, setIsBigPicture] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { settings, loadSettings } = useSettingsStore();
  const { loadGames, initializeListeners } = useGameStore();
  const { toggleOverlay, isOverlayVisible } = usePerformanceStore();

  const backgroundSrc = useLauncherBackgroundSrc(settings?.appearance?.customBackground ?? '');

  // Track recently visited pages
  const recordRecent = (page: string) => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [page, ...list.filter(p => p !== page)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('raeen:recent-updated'));
    } catch {}
  };

  const handleNavigate = (page: string) => {
    recordRecent(page);
    setActivePage(page);
  };

  // Check for Overlay Window Mode
  if (window.location.hash === '#overlay') {
      return <Overlay />;
  }

  useTheme();

  useEffect(() => {
    loadSettings();
    loadGames();
    initializeListeners();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inField = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) ||
                       (e.target as HTMLElement)?.isContentEditable;

      // Ctrl/Cmd + K: Command Palette (works even in fields)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }
      if (inField) return;

      // Ctrl/Cmd + ,: Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        handleNavigate('Settings');
        return;
      }
      // Ctrl/Cmd + B: Backlog
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleNavigate('Backlog');
        return;
      }
      // Alt + 1..6: section hotkeys
      if (e.altKey && SECTION_HOTKEYS[e.key]) {
        e.preventDefault();
        handleNavigate(SECTION_HOTKEYS[e.key]);
        return;
      }
      // F11: Big Picture
      if (e.key === 'F11') {
        e.preventDefault();
        setIsBigPicture(p => !p);
      }
    };
    window.addEventListener('keydown', handler);

    // Settings → tool deeplinks
    const goCrosshair = () => handleNavigate('Crosshair');
    const goDrivers = () => handleNavigate('Drivers');
    const goShader = () => handleNavigate('ShaderCache');
    window.addEventListener('settings:goto-crosshair', goCrosshair);
    window.addEventListener('settings:goto-drivers', goDrivers);
    window.addEventListener('settings:goto-shadercache', goShader);

    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('settings:goto-crosshair', goCrosshair);
      window.removeEventListener('settings:goto-drivers', goDrivers);
      window.removeEventListener('settings:goto-shadercache', goShader);
    };
  }, []);

  const handleMinimize = () => {
    window.ipcRenderer.minimizeWindow()
  }

  const handleMaximize = () => {
    window.ipcRenderer.maximizeWindow()
  }

  const handleClose = () => {
    window.ipcRenderer.closeWindow()
  }

  const renderPage = () => {
    switch (activePage) {
      case 'Library': return <Library />;
      case 'Collections': return <Collections onNavigate={handleNavigate} />;
      case 'Wishlist': return <Wishlist />;
      case 'Store': return <Store />;
      case 'Friends': return <Friends />;
      case 'SocialHub': return <SocialHub />;
      case 'Widgets': return <Widgets />;
      case 'SmartDashboard': return <SmartDashboard />;
      case 'News': return <News />;
      case 'Analytics': return <Analytics />;
      case 'Achievements': return <Achievements />;
      case 'Mods': return <Mods />;
      case 'Screenshots': return <Screenshots />;
      case 'DLCManager': return <DLCManager />;
      case 'Backlog': return <Backlog />;
      case 'Goals': return <PlaytimeGoals />;
      case 'Rotation': return <Rotation />;
      case 'SessionPlanner': return <SessionPlanner />;
      case 'ShaderCache': return <ShaderCache />;
      case 'Drivers': return <DriverUpdater />;
      case 'AimTrainer': return <AimTrainer />;
      case 'Crosshair': return <CrosshairOverlay />;
      case 'ReactionTest': return <ReactionTest />;
      case 'KeybindManager': return <KeybindManager />;
      case 'Reviews': return <Reviews />;
      case 'Wellness': return <Wellness />;
      case 'SaveManager': return <SaveManager />;
      case 'Studio': return <Studio />;
      case 'HardwareLab': return <HardwareLab />;
      case 'Troubleshooter': return <Troubleshooter />;
      case 'AudioSwitcher': return <AudioSwitcher />;
      case 'NetworkOptimizer': return <NetworkOptimizer />;
      case 'InputLagTest': return <InputLagTest />;
      case 'Calendar': return <GameCalendar />;
      case 'Settings': return <Settings />;
      case 'FOVCalculator': return <FOVCalculator />;
      case 'StreamSchedule': return <StreamSchedule />;
      case 'ChatOverlay': return <ChatOverlay />;
      case 'ThumbnailCreator': return <ThumbnailCreator />;
      case 'StreamOverlays': return <StreamOverlays />;
      case 'ThemeStore': return <ThemeStore />;
      case 'ProUpgrade': return <ProUpgrade />;
      case 'ClanManager': return <ClanManager />;
      case 'BuddyFinder': return <BuddyFinder />;
      case 'MonitorCalibration': return <MonitorCalibration />;
      default: return <Library />;
    }
  };

  return (
    <NavigationProvider>
      <ThemeController />
      <GamepadMapper onToggleBigPicture={() => setIsBigPicture(prev => !prev)} />
      {isBigPicture ? (
        <BigPictureLayout onExit={() => setIsBigPicture(false)} />
      ) : (
        <div className="flex flex-col h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden selection:bg-[var(--accent)] selection:text-white font-sans relative transition-colors duration-500">

          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              key={backgroundSrc}
              src={backgroundSrc}
              alt="Background"
              loading="eager"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover scale-110 transition-all duration-1000"
              style={{
                  filter: `blur(${
                    settings?.appearance.blurLevel === 'high'
                      ? '64px'
                      : settings?.appearance.blurLevel === 'medium'
                        ? '32px'
                        : '8px'
                  })`,
                  opacity: 1,
              }}
              onLoad={(e) => {
                // BUG-020: guard against absurdly large user backgrounds (OOM on low-RAM systems).
                const img = e.currentTarget;
                const pixels = img.naturalWidth * img.naturalHeight;
                if (pixels > 50_000_000) { // > ~50 MP
                  console.warn(`Background image ${pixels} px is too large; falling back.`);
                  img.src = FALLBACK_LAUNCHER_BG;
                }
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_LAUNCHER_BG; }}
            />
            <div
                className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/40"
                style={{ opacity: settings?.appearance.overlayOpacity ?? 0 }}
            />
            {settings?.appearance?.enableParticles !== false && <ParticleBackground />}
          </div>

          {/* Top Bar */}
          <div className="relative z-50 h-11 flex items-center justify-between pl-5 pr-3 border-b border-white/5 bg-[var(--glass-bg)] backdrop-blur-2xl drag-region">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)]">
                <Ghost size={13} className="text-white" />
              </div>
              <span className="text-[11px] font-black tracking-[0.2em] text-white/90">RAEEN</span>
              <span className="text-[10px] font-medium tracking-wider text-gray-500">LAUNCHER</span>
            </div>
            <div className="flex items-center gap-1 no-drag">
              <div className="px-2"><SystemStatus /></div>
              <button
                onClick={() => setPaletteOpen(true)}
                title="Command Palette (Ctrl+K)"
                className="hidden md:flex items-center gap-2 px-2.5 py-1 text-[11px] text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 rounded-md transition-colors"
              >
                <span>Search</span>
                <kbd className="font-mono text-[10px] bg-white/5 border border-white/10 px-1 rounded">Ctrl K</kbd>
              </button>
              <TopBarBtn onClick={() => setIsBigPicture(true)} title="Enter Big Picture Mode" icon={<MonitorPlay size={14} />} />
              <TopBarBtn onClick={toggleOverlay} title="Toggle Performance Overlay"
                icon={<Activity size={14} />} active={isOverlayVisible} />
              <TopBarBtn title="Notifications" icon={<Bell size={14} />} />
              <TopBarBtn onClick={() => handleNavigate('Settings')} title="Settings" icon={<SettingsIcon size={14} />} />
              <div className="flex gap-1.5 ml-3 pl-3 border-l border-white/10">
                <button onClick={handleMinimize} aria-label="Minimize" className="w-3 h-3 rounded-full bg-yellow-500/30 hover:bg-yellow-400 border border-yellow-500/40 transition-colors" />
                <button onClick={handleMaximize} aria-label="Maximize" className="w-3 h-3 rounded-full bg-green-500/30 hover:bg-green-400 border border-green-500/40 transition-colors" />
                <button onClick={handleClose}    aria-label="Close"    className="w-3 h-3 rounded-full bg-red-500/30 hover:bg-red-400 border border-red-500/40 transition-colors" />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-1 overflow-hidden p-6 gap-6">
            <Sidebar activePage={activePage} onNavigate={handleNavigate} />

            <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden gap-6">
              {renderPage()}
            </main>

            <RightSidebar />
          </div>
          <Overlay />
          <UpdatesWidget />
          <CloudSyncWidget />
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            onNavigate={handleNavigate}
            onToggleBigPicture={() => setIsBigPicture(p => !p)}
            onToggleOverlay={toggleOverlay}
          />
        </div>
      )}
    </NavigationProvider>
  );
}

const TopBarBtn: React.FC<{ icon: React.ReactNode; title?: string; onClick?: () => void; active?: boolean }> = ({ icon, title, onClick, active }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-md transition-colors ${active ? 'text-[var(--accent)] bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
  >
    {icon}
  </button>
);

export default App;
