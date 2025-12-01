import React, { useEffect, useState } from 'react';
import { Download, Upload, RefreshCw, FolderOpen, History, Archive, Save, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';

interface BackupEntry {
    id: string;
    gameId: string;
    filename: string;
    timestamp: number;
    size: number;
    path: string;
}

interface SaveConfig {
    gameId: string;
    path: string;
    autoBackup: boolean;
    lastBackup?: number;
}

const SaveManager: React.FC = () => {
    const { games } = useGameStore();
    const [configs, setConfigs] = useState<SaveConfig[]>([]);
    const [cloudPath, setCloudPath] = useState<string | null>(null);
    const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [backups, setBackups] = useState<BackupEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [detectedPath, setDetectedPath] = useState<string | null>(null);
    const [totalSize, setTotalSize] = useState<number>(0);

    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        if (selectedGameId) {
            loadBackups(selectedGameId);
            checkDetection(selectedGameId);
            loadSize(selectedGameId);
        } else {
            setBackups([]);
            setDetectedPath(null);
            setTotalSize(0);
        }
    }, [selectedGameId]);

    const loadConfig = async () => {
        const config = await window.ipcRenderer.invoke('saves:getConfig');
        setConfigs(config.configs || []);
        setCloudPath(config.cloudPath);
        setCloudSyncEnabled(config.cloudSyncEnabled);
    };

    const handleToggleCloudSync = async () => {
        const newValue = !cloudSyncEnabled;
        setCloudSyncEnabled(newValue);
        await window.ipcRenderer.invoke('saves:setCloudSyncEnabled', newValue);
        loadConfig();
    };

    const loadBackups = async (gameId: string) => {
        setIsLoading(true);
        try {
            const history = await window.ipcRenderer.invoke('saves:getHistory', gameId);
            setBackups(history);
        } catch (e) {
            console.error('Failed to load backups', e);
        } finally {
            setIsLoading(false);
        }
    };

    const checkDetection = async (gameId: string) => {
        const game = games.find(g => g.id === gameId);
        const config = configs.find(c => c.gameId === gameId);
        if (game && !config) {
            const path = await window.ipcRenderer.invoke('saves:detect', game.title, game.developer);
            setDetectedPath(path);
        } else {
            setDetectedPath(null);
        }
    };

    const loadSize = async (gameId: string) => {
        const size = await window.ipcRenderer.invoke('saves:getSize', gameId);
        setTotalSize(size);
    };

    const handleSetCloudPath = async () => {
        const path = await window.ipcRenderer.invoke('dialog:openDirectory');
        if (path) {
            await window.ipcRenderer.invoke('saves:setConfig', path);
            loadConfig();
        }
    };

    const handleAddGamePath = async (gameId: string, path?: string) => {
        const targetPath = path || await window.ipcRenderer.invoke('dialog:openDirectory');
        if (targetPath) {
            await window.ipcRenderer.invoke('saves:watch', gameId, targetPath);
            loadConfig();
            setSelectedGameId(gameId);
            setDetectedPath(null); // Clear suggestion after adding
        }
    };

    // ... existing backup/restore handlers ...
    const handleBackupNow = async (gameId: string) => {
        setIsLoading(true);
        try {
            await window.ipcRenderer.invoke('saves:backup', gameId);
            await loadBackups(gameId);
            await loadConfig(); // update lastBackup time
            await loadSize(gameId);
        } catch (e) {
            alert('Backup failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (backup: BackupEntry, targetPath: string) => {
        if (confirm(`Are you sure you want to restore this backup? It will overwrite current saves in ${targetPath}`)) {
            setIsLoading(true);
            try {
                await window.ipcRenderer.invoke('saves:restore', backup.path, targetPath);
                alert('Restore successful!');
            } catch (e) {
                alert('Restore failed');
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Format bytes
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Filter games to those that have config or are installed
    const installedGames = games.filter(g => g.status === 'installed');
    const selectedConfig = configs.find(c => c.gameId === selectedGameId);
    const selectedGame = games.find(g => g.id === selectedGameId);

    return (
        <div className="h-full flex flex-col p-6 gap-6 overflow-hidden">
            {/* ... Header ... */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                        <Save className="text-blue-500" size={32} />
                        SAVE MANAGER
                    </h1>
                    <p className="text-gray-400 mt-1">Manage game saves, backups, and cloud sync.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-lg border border-white/5">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-500 uppercase">Auto Cloud Sync</span>
                            <span className={`text-sm font-medium ${cloudSyncEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                                {cloudSyncEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <button 
                            onClick={handleToggleCloudSync}
                            className={`w-10 h-5 rounded-full relative transition-colors ${cloudSyncEnabled ? 'bg-green-500' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${cloudSyncEnabled ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 bg-black/20 px-4 py-2 rounded-lg border border-white/5">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-500 uppercase">Cloud Sync Folder</span>
                            <span className="text-sm text-white truncate max-w-xs" title={cloudPath || ''}>
                                {cloudPath || 'Not Configured'}
                            </span>
                        </div>
                        <button 
                            onClick={handleSetCloudPath}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                        >
                            <FolderOpen size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Left: Game List */}
                <div className="w-1/3 bg-black/20 border border-white/10 rounded-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/5 font-bold text-gray-400 text-xs uppercase tracking-wider">
                        Configured Games
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {installedGames.map(game => {
                            const config = configs.find(c => c.gameId === game.id);
                            return (
                                <div
                                    key={game.id}
                                    onClick={() => setSelectedGameId(game.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedGameId === game.id ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    <div className="w-8 h-10 bg-slate-800 rounded overflow-hidden flex-shrink-0">
                                        {game.cover && <img src={game.cover} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{game.title}</div>
                                        <div className="text-xs flex items-center gap-2">
                                            {config ? (
                                                <span className="text-green-400 flex items-center gap-1"><RefreshCw size={10} className="animate-spin-slow" /> Syncing</span>
                                            ) : (
                                                <span className="text-gray-500">Not configured</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Details & History */}
                <div className="flex-1 bg-black/20 border border-white/10 rounded-xl flex flex-col overflow-hidden p-6 relative">
                    {selectedGameId ? (
                        <>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedGame?.title}</h2>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <FolderOpen size={14} />
                                            <span className="font-mono bg-black/30 px-2 py-0.5 rounded truncate max-w-md">
                                                {selectedConfig?.path || 'No save path configured'}
                                            </span>
                                        </div>
                                        {totalSize > 0 && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Archive size={12} />
                                                <span>Total Backup Size: {formatSize(totalSize)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleAddGamePath(selectedGameId)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {selectedConfig ? 'Change Path' : 'Select Save Folder'}
                                    </button>
                                    {selectedConfig && (
                                        <button 
                                            onClick={() => handleBackupNow(selectedGameId)}
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-colors"
                                        >
                                            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                                            Backup Now
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Auto-Detection Suggestion */}
                            {!selectedConfig && detectedPath && (
                                <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                                            <AlertTriangle size={16} /> Suggested Save Location Found
                                        </div>
                                        <div className="text-xs text-emerald-200/70 font-mono truncate max-w-md">
                                            {detectedPath}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleAddGamePath(selectedGameId, detectedPath)}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition-colors"
                                    >
                                        Use This Folder
                                    </button>
                                </div>
                            )}

                            {/* History List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <History size={16} /> Backup History
                                    </h3>
                                    <span className="text-xs text-gray-500">{backups.length} backups found</span>
                                </div>

                                {backups.length === 0 ? (
                                    <div className="h-32 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                                        <Archive size={32} className="mb-2 opacity-50" />
                                        <p>No backups available</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {backups.map(backup => (
                                            <div key={backup.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                                        <Archive size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white">{new Date(backup.timestamp).toLocaleString()}</div>
                                                        <div className="text-xs text-gray-400 flex gap-2">
                                                            <span>{formatSize(backup.size)}</span>
                                                            <span>•</span>
                                                            <span>{backup.filename.includes('auto') ? 'Auto-Backup' : 'Manual'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => selectedConfig && handleRestore(backup, selectedConfig.path)}
                                                    disabled={isLoading || !selectedConfig}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-green-500/20 hover:text-green-400 text-gray-400 rounded text-xs font-medium transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
                                                >
                                                    <Upload size={14} />
                                                    Restore
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <Save size={64} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Select a game to manage saves</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaveManager;
