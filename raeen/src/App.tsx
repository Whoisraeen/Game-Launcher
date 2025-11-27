import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import { Ghost, Settings as SettingsIcon, Bell, MonitorPlay } from 'lucide-react';
import { useSettingsStore } from './stores/settingsStore';
import { useGameStore } from './stores/gameStore';
import { NavigationProvider } from './context/NavigationContext';
import BigPictureLayout from './components/BigPicture/BigPictureLayout';
import { useGamepad } from './hooks/useGamepad';
import { useTheme } from './hooks/useTheme';

// Pages
import Library from './components/pages/Library';
import Store from './components/pages/Store';
import Friends from './components/pages/Friends';
import News from './components/pages/News';
import Analytics from './components/pages/Analytics';
import Mods from './components/pages/Mods';
import Settings from './components/pages/Settings';



function App() {
  const [activePage, setActivePage] = useState('Library');
  const [isBigPicture, setIsBigPicture] = useState(false);
  const { loadSettings } = useSettingsStore();
  const { loadGames } = useGameStore();
  
  useTheme();

  useEffect(() => {
    loadSettings();
    loadGames();
  }, []);

  // Global Gamepad Listener for Guide Button (Home)
  useGamepad({
    onButtonDown: (btn) => {
      if (btn === 'Home') {
        setIsBigPicture(prev => !prev);
      }
    }
  });

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
      case 'Store': return <Store />;
      case 'Friends': return <Friends />;
      case 'News': return <News />;
      case 'Analytics': return <Analytics />;
      case 'Mods': return <Mods />;
      case 'Settings': return <Settings />;
      default: return <Library />;
    }
  };

  return (
    <NavigationProvider>
      {isBigPicture ? (
        <BigPictureLayout onExit={() => setIsBigPicture(false)} />
      ) : (
        <div className="flex flex-col h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden selection:bg-[var(--accent)] selection:text-white font-sans relative transition-colors duration-500">

          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1716740/library_hero.jpg"
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/40" />
          </div>

          {/* Top Bar */}
          <div className="relative z-50 h-10 flex items-center justify-between px-4 border-b border-white/5 bg-[var(--glass-bg)] backdrop-blur-md drag-region">
            <div className="flex items-center gap-2">
              <Ghost size={16} className="text-[var(--accent)]" />
              <span className="text-xs font-bold tracking-widest text-gray-300">RAEEN LAUNCHER</span>
            </div>
            <div className="flex items-center gap-4 no-drag">
              <button 
                onClick={() => setIsBigPicture(true)}
                className="p-1 hover:text-[var(--accent)] transition-colors text-gray-400"
                title="Enter Big Picture Mode"
              >
                <MonitorPlay size={16} />
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
        </div>
      )}
    </NavigationProvider>
  );
}

export default App;
