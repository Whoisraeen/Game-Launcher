import React, { useState, useEffect } from 'react';
import { Keyboard, FolderArchive, RotateCcw, Search, RefreshCw, CheckCircle2, AlertCircle, Clock, HardDrive } from 'lucide-react';

interface ConfigFile {
  game: string;
  path: string;
  fileName: string;
  size: number;
  lastModified: number;
}

interface Backup {
  id: string;
  game: string;
  originalPath: string;
  backupPath: string;
  timestamp: number;
  size: number;
}

const KeybindManager: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigFile[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const scan = async () => {
    setScanning(true);
    try {
      const result = await window.ipcRenderer.invoke('keybinds:scan');
      setConfigs(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Scan failed:', err);
      showMessage('error', 'Failed to scan for config files');
    } finally {
      setScanning(false);
    }
  };

  const loadBackups = async () => {
    try {
      const result = await window.ipcRenderer.invoke('keybinds:getBackups');
      setBackups(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  };

  const backup = async (config: ConfigFile) => {
    try {
      await window.ipcRenderer.invoke('keybinds:backup', config.path, config.game);
      showMessage('success', `Backed up ${config.game} config`);
      await loadBackups();
    } catch (err) {
      showMessage('error', `Failed to backup ${config.game}`);
    }
  };

  const restore = async (b: Backup) => {
    try {
      await window.ipcRenderer.invoke('keybinds:restore', b.id);
      showMessage('success', `Restored ${b.game} config`);
    } catch (err) {
      showMessage('error', `Failed to restore ${b.game}`);
    }
  };

  useEffect(() => {
    scan();
    loadBackups();
  }, []);

  const filtered = configs.filter(c =>
    c.game.toLowerCase().includes(search.toLowerCase()) ||
    c.fileName.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ts: number) => {
    if (!ts) return 'Unknown';
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">KEYBIND MANAGER</h1>
          <p className="text-gray-400 font-medium">Backup and restore your game keybind configurations</p>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white transition-all text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} /> {scanning ? 'Scanning...' : 'Rescan'}
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
          message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Keyboard size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{configs.length}</p>
            <p className="text-xs text-gray-400 font-medium">Configs Found</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <FolderArchive size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{backups.length}</p>
            <p className="text-xs text-gray-400 font-medium">Backups Saved</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <HardDrive size={20} className="text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{formatSize(backups.reduce((s, b) => s + b.size, 0))}</p>
            <p className="text-xs text-gray-400 font-medium">Backup Size</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Config Files Panel */}
        <div className="flex-1 glass-panel p-5 rounded-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Keyboard size={18} className="text-blue-400" /> Detected Configs
            </h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter..."
                className="pl-9 pr-3 py-1.5 bg-black/25 border border-white/8 rounded-lg text-sm text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:outline-none w-48"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {scanning && configs.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <RefreshCw size={20} className="animate-spin mr-2" /> Scanning for config files...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Keyboard size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-medium">No config files found</p>
                <p className="text-sm mt-1">Try running a rescan</p>
              </div>
            ) : (
              filtered.map((config, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center flex-shrink-0">
                    <Keyboard size={18} className="text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{config.game}</h4>
                    <p className="text-xs text-gray-500 truncate" title={config.path}>{config.fileName}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-xs text-gray-500">{formatSize(config.size)}</p>
                    <p className="text-[10px] text-gray-600">{formatDate(config.lastModified)}</p>
                  </div>
                  <button
                    onClick={() => backup(config)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 text-xs font-bold transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Backup
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Backups Panel */}
        <div className="w-80 glass-panel p-5 rounded-2xl flex flex-col overflow-hidden">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FolderArchive size={18} className="text-green-400" /> Saved Backups
          </h2>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {backups.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <FolderArchive size={36} className="mx-auto mb-3 opacity-30" />
                <p>No backups yet</p>
                <p className="text-xs mt-1">Click "Backup" on a config to save it</p>
              </div>
            ) : (
              backups.map(b => (
                <div key={b.id} className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-white text-sm truncate">{b.game}</h4>
                    <span className="text-[10px] text-gray-500">{formatSize(b.size)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2">
                    <Clock size={10} /> {formatDate(b.timestamp)}
                  </div>
                  <button
                    onClick={() => restore(b)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/15 hover:bg-green-600/30 border border-green-500/20 text-green-300 text-xs font-bold transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeybindManager;
