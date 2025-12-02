import { useState, useEffect } from 'react';
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



function App() {
  const [activePage, setActivePage] = useState('Library');
  const [isBigPicture, setIsBigPicture] = useState(false);
  const { settings, loadSettings } = useSettingsStore();
  const { loadGames, initializeListeners } = useGameStore();
  const { toggleOverlay, isOverlayVisible } = usePerformanceStore();

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
      case 'Collections': return <Collections onNavigate={setActivePage} />;
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
      case 'SaveManager': return <SaveManager />;
      case 'Studio': return <Studio />;
      case 'HardwareLab': return <HardwareLab />;
      case 'Troubleshooter': return <Troubleshooter />;
      case 'Settings': return <Settings />;
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
              src={settings?.appearance.customBackground || "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1716740/library_hero.jpg"}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover scale-110 transition-all duration-1000"
              style={{ 
                  filter: `blur(${settings?.appearance.blurLevel === 'low' ? '8px' : settings?.appearance.blurLevel === 'high' ? '64px' : '32px'})`,
                  opacity: 0.2 // Base opacity for the image itself
              }}
            />
            <div 
                className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/40" 
                style={{ opacity: settings?.appearance.overlayOpacity ?? 0.6 }}
            />
          </div>

          {/* Top Bar */}
          <div className="relative z-50 h-10 flex items-center justify-between px-4 border-b border-white/5 bg-[var(--glass-bg)] backdrop-blur-md drag-region">
            <div className="flex items-center gap-2">
              <Ghost size={16} className="text-[var(--accent)]" />
              <span className="text-xs font-bold tracking-widest text-gray-300">RAEEN LAUNCHER</span>
            </div>
            <div className="flex items-center gap-4 no-drag">
              <SystemStatus />
              <button
                onClick={() => setIsBigPicture(true)}
                className="p-1 hover:text-[var(--accent)] transition-colors text-gray-400"
                title="Enter Big Picture Mode"
              >
                <MonitorPlay size={16} />
              </button>
              <button
                onClick={toggleOverlay}
                className={`p-1 hover:text-[var(--accent)] transition-colors ${isOverlayVisible ? 'text-[var(--accent)]' : 'text-gray-400'}`}
                title="Toggle Performance Overlay"
              >
                <Activity size={16} />
              </button>
              <Bell size={14} className="text-gray-400 hover:text-white cursor-pointer" />
              <SettingsIcon size={14} className="text-gray-400 hover:text-white cursor-pointer" onClick={() => setActivePage('Settings')} />
              <div className="flex gap-2 ml-2">
                <div onClick={handleMinimize} className="w-3 h-3 rounded-full bg-yellow-500/20 hover:bg-yellow-500 border border-yellow-500/50 cursor-pointer transition-colors duration-200"></div>
                <div onClick={handleMaximize} className="w-3 h-3 rounded-full bg-green-500/20 hover:bg-green-500 border border-green-500/50 cursor-pointer transition-colors duration-200"></div>
                <div onClick={handleClose} className="w-3 h-3 rounded-full bg-red-500/20 hover:bg-red-500 border border-red-500/50 cursor-pointer transition-colors duration-200"></div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-1 overflow-hidden p-6 gap-6">
            <Sidebar activePage={activePage} onNavigate={setActivePage} />

            <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden gap-6">
              {renderPage()}
            </main>

            <RightSidebar />
          </div>
          <Overlay />
          <UpdatesWidget />
          <CloudSyncWidget />
        </div>
      )}
    </NavigationProvider>
  );
}

export default App;
