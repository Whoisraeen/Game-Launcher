import React, { useEffect, useState } from 'react';
import { Monitor, User, Shield, Keyboard, Bell, Volume2, Database, RefreshCw, FolderOpen, Link, Zap, Palette, Upload, Image as ImageIcon } from 'lucide-react';
import { useSettingsStore, UserSettings } from '../../stores/settingsStore';
import { useGameStore } from '../../stores/gameStore';

const Settings: React.FC = () => {
    const { settings, loadSettings, updateSetting, isLoading } = useSettingsStore();
    const { loadGames } = useGameStore();
    const [activeSection, setActiveSection] = useState('General');
    const [isScanning, setIsScanning] = useState(false);
    const [emulators, setEmulators] = useState<any[]>([]);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (activeSection === 'Emulation') {
            loadEmulators();
        }
    }, [activeSection]);

    const loadEmulators = async () => {
        try {
            // We need a get method, for now we can use autoDetect which returns list,
            // or add a specific get ipc.
            // Assuming autoDetect returns the list, or we can just fetch it.
            // Let's use autoDetect for now to populate if empty, or we need a simple 'get' IPC.
            // Re-using autoDetect is safe as it only adds new ones.
            const list = await window.ipcRenderer.invoke('emulators:autoDetect');
            setEmulators(list);
        } catch (e) {
            console.error('Failed to load emulators', e);
        }
    };

    if (isLoading || !settings) {
        return <div className="glass-panel flex-1 flex items-center justify-center">Loading settings...</div>;
    }

    const handleToggle = (category: keyof UserSettings, key: string, value: boolean) => {
        // @ts-ignore - Dynamic key access
        updateSetting(category, { [key]: value });
    };

    const handleSelect = (category: keyof UserSettings, key: string, value: string | number) => {
        // @ts-ignore - Dynamic key access
        updateSetting(category, { [key]: value });
    };

    const handleUploadBackground = async () => {
        try {
            const path = await window.ipcRenderer.invoke('settings:uploadBackground');
            if (path) {
                updateSetting('appearance', { customBackground: path });
            }
        } catch (error) {
            console.error('Failed to upload background', error);
        }
    };

    const handleScanFolder = async () => {
        try {
            const path = await window.ipcRenderer.invoke('dialog:openDirectory');
            if (!path) return;

            setIsScanning(true);
            const foundGames = await window.ipcRenderer.invoke('manual:scanDirectory', path);

            let importedCount = 0;
            for (const game of foundGames) {
                await window.ipcRenderer.invoke('manual:addGame', {
                    title: game.title,
                    installPath: game.installPath,
                    executable: game.executable
                });
                importedCount++;
            }

            setIsScanning(false);
            if (importedCount > 0) {
                alert(`Successfully imported ${importedCount} games from ${path}`);
                loadGames();
            } else {
                alert('No games found in the selected folder.');
            }
        } catch (error) {
            console.error(error);
            setIsScanning(false);
            alert('Failed to scan folder.');
        }
    };

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex gap-6 p-6">
            {/* Settings Nav */}
            <div className="w-64 space-y-1">
                <SettingsNav
                    icon={<Monitor size={18} />}
                    label="General"
                    active={activeSection === 'General'}
                    onClick={() => setActiveSection('General')}
                />
                <SettingsNav
                    icon={<Palette size={18} />}
                    label="Appearance"
                    active={activeSection === 'Appearance'}
                    onClick={() => setActiveSection('Appearance')}
                />
                <SettingsNav
                    icon={<Zap size={18} />}
                    label="Performance"
                    active={activeSection === 'Performance'}
                    onClick={() => setActiveSection('Performance')}
                />
                <SettingsNav
                    icon={<Database size={18} />}
                    label="Library"
                    active={activeSection === 'Library'}
                    onClick={() => setActiveSection('Library')}
                />
                <SettingsNav
                    icon={<User size={18} />}
                    label="Account"
                    active={activeSection === 'Account'}
                    onClick={() => setActiveSection('Account')}
                />
                <SettingsNav
                    icon={<Shield size={18} />}
                    label="Privacy & Security"
                    active={activeSection === 'Privacy & Security'}
                    onClick={() => setActiveSection('Privacy & Security')}
                />
                <SettingsNav
                    icon={<Keyboard size={18} />}
                    label="Input & Hotkeys"
                    active={activeSection === 'Input & Hotkeys'}
                    onClick={() => setActiveSection('Input & Hotkeys')}
                />
                <SettingsNav
                    icon={<Bell size={18} />}
                    label="Notifications"
                    active={activeSection === 'Notifications'}
                    onClick={() => setActiveSection('Notifications')}
                />
                <SettingsNav
                    icon={<Volume2 size={18} />}
                    label="Audio"
                    active={activeSection === 'Audio'}
                    onClick={() => setActiveSection('Audio')}
                />
                <SettingsNav
                    icon={<RefreshCw size={18} />}
                    label="Emulation"
                    active={activeSection === 'Emulation'}
                    onClick={() => setActiveSection('Emulation')}
                />
                <SettingsNav
                    icon={<Link size={18} />}
                    label="Integrations"
                    active={activeSection === 'Integrations'}
                    onClick={() => setActiveSection('Integrations')}
                />
            </div>

            {/* Content */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-slate-800/30 rounded-2xl border border-white/5 p-8 space-y-8">
                {activeSection === 'Account' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Account</h2>
                        <SupabaseAuth />
                    </div>
                )}

                {activeSection === 'General' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">General Settings</h2>
                        <div className="space-y-6">
                            <SettingGroup title="Startup Behavior">
                                <Toggle
                                    label="Launch Raeen Launcher on system startup"
                                    checked={settings.general.launchOnStartup}
                                    onChange={(v) => handleToggle('general', 'launchOnStartup', v)}
                                />
                                <Toggle
                                    label="Start minimized to tray"
                                    checked={settings.general.startMinimized}
                                    onChange={(v) => handleToggle('general', 'startMinimized', v)}
                                />
                                <Toggle
                                    label="Auto-detect new games"
                                    checked={settings.general.autoDetectGames}
                                    onChange={(v) => handleToggle('general', 'autoDetectGames', v)}
                                />
                            </SettingGroup>
                        </div>
                    </div>
                )}

                {activeSection === 'Appearance' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Appearance & Theming</h2>
                        <div className="space-y-8">
                            <SettingGroup title="Theme Presets">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {['dark', 'light', 'cyberpunk', 'midnight'].map((theme) => (
                                        <button
                                            key={theme}
                                            onClick={() => handleSelect('appearance', 'theme', theme)}
                                            className={`
                                                p-4 rounded-xl border transition-all relative overflow-hidden group
                                                ${settings.appearance.theme === theme 
                                                    ? 'border-blue-500 bg-blue-500/10' 
                                                    : 'border-white/10 bg-black/20 hover:border-white/30'}
                                            `}
                                        >
                                            <div className={`w-full h-16 rounded-lg mb-3 ${
                                                theme === 'light' ? 'bg-gray-200' : 
                                                theme === 'cyberpunk' ? 'bg-gradient-to-br from-yellow-400 to-purple-600' :
                                                theme === 'midnight' ? 'bg-gradient-to-br from-blue-900 to-black' :
                                                'bg-slate-900'
                                            }`}></div>
                                            <span className="capitalize font-medium text-sm text-white">{theme}</span>
                                            {settings.appearance.theme === theme && (
                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </SettingGroup>

                            <SettingGroup title="Custom Background">
                                <div className="bg-black/20 border border-white/10 rounded-xl p-6 flex flex-col items-center gap-4">
                                    {settings.appearance.customBackground ? (
                                        <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                                            <img 
                                                src={settings.appearance.customBackground} 
                                                alt="Custom Background" 
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <button 
                                                    onClick={handleUploadBackground}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-bold transition-colors backdrop-blur-md"
                                                >
                                                    <RefreshCw size={16} /> Change
                                                </button>
                                                <button 
                                                    onClick={() => handleSelect('appearance', 'customBackground', '')}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg text-sm font-bold transition-colors backdrop-blur-md"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-center py-8">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                                <ImageIcon size={32} className="text-gray-500" />
                                            </div>
                                            <h4 className="text-white font-medium">No Custom Background</h4>
                                            <p className="text-sm text-gray-400 max-w-xs">Upload an image to use as your global wallpaper. Recommended size: 1920x1080 or higher.</p>
                                            <button 
                                                onClick={handleUploadBackground}
                                                className="mt-4 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-blue-600/20"
                                            >
                                                <Upload size={18} /> Upload Image
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </SettingGroup>

                            <SettingGroup title="Visual Effects">
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-300">Background Blur</span>
                                            <span className="text-gray-400 capitalize">{settings.appearance.blurLevel || 'medium'}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['low', 'medium', 'high'].map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => handleSelect('appearance', 'blurLevel', level)}
                                                    className={`
                                                        py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
                                                        ${settings.appearance.blurLevel === level 
                                                            ? 'bg-white text-black' 
                                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                                                    `}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-300">Overlay Opacity</span>
                                            <span className="text-gray-400">{Math.round((settings.appearance.overlayOpacity || 0.6) * 100)}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="1" 
                                            step="0.05"
                                            value={settings.appearance.overlayOpacity || 0.6}
                                            onChange={(e) => handleSelect('appearance', 'overlayOpacity', parseFloat(e.target.value))}
                                            className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-300">Accent Color</span>
                                            <span className="text-gray-400">{settings.appearance.accentColor}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="color" 
                                                value={settings.appearance.accentColor || '#4f46e5'}
                                                onChange={(e) => handleSelect('appearance', 'accentColor', e.target.value)}
                                                className="w-10 h-10 rounded-lg border-0 p-0 cursor-pointer bg-transparent"
                                            />
                                            <div className="flex-1 flex gap-2 overflow-x-auto py-1 custom-scrollbar">
                                                {['#4f46e5', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#06b6d4'].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => handleSelect('appearance', 'accentColor', color)}
                                                        className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: color, borderColor: settings.appearance.accentColor === color ? 'white' : 'transparent' }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <Toggle
                                        label="Enable transparency effects"
                                        checked={settings.appearance.enableTransparency}
                                        onChange={(v) => handleToggle('appearance', 'enableTransparency', v)}
                                    />
                                    <Toggle
                                        label="Show animated backgrounds"
                                        checked={settings.appearance.animatedBackgrounds}
                                        onChange={(v) => handleToggle('appearance', 'animatedBackgrounds', v)}
                                    />
                                </div>
                            </SettingGroup>
                        </div>
                    </div>
                )}

                {activeSection === 'Performance' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Performance Settings</h2>
                        <div className="space-y-6">
                            <SettingGroup title="Optimization">
                                <Toggle
                                    label="Optimize System on Game Launch"
                                    checked={settings.performance.optimizeOnLaunch}
                                    onChange={(v) => handleToggle('performance', 'optimizeOnLaunch', v)}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Automatically clears RAM and sets high priority for game processes when launching a game.
                                </p>
                            </SettingGroup>

                            <SettingGroup title="Overlay">
                                <Toggle
                                    label="Show Performance Overlay"
                                    checked={settings.performance.showOverlay}
                                    onChange={(v) => handleToggle('performance', 'showOverlay', v)}
                                />
                                <div className="flex items-center justify-between py-2 mt-2">
                                    <span className="text-sm text-gray-300">Target FPS Cap</span>
                                    <input
                                        type="number"
                                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none w-24 text-center"
                                        value={settings.performance.targetFps || 60}
                                        onChange={(e) => handleSelect('performance', 'targetFps', e.target.value)}
                                    />
                                </div>
                            </SettingGroup>
                        </div>
                    </div>
                )}

                {activeSection === 'Emulation' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Emulation Settings</h2>
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg mb-4 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-blue-100">Auto-Detect Emulators</h4>
                                    <p className="text-xs text-blue-200/70 mt-1">
                                        Scan your system for installed emulators (RetroArch, Dolphin, etc.)
                                    </p>
                                </div>
                                <button
                                    onClick={loadEmulators}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                                >
                                    Scan Now
                                </button>
                            </div>

                            <SettingGroup title="Detected Emulators">
                                {emulators.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">No emulators detected yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {emulators.map((emu) => (
                                            <div key={emu.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                                <div>
                                                    <div className="text-sm font-bold text-white">{emu.name}</div>
                                                    <div className="text-xs text-gray-400 font-mono truncate max-w-md">{emu.executable}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {emu.platforms.map((p: string) => (
                                                        <span key={p} className="px-1.5 py-0.5 bg-black/40 rounded text-[10px] text-gray-400 uppercase">{p}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SettingGroup>

                            <SettingGroup title="ROM Folders">
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-300">Scan Folder for ROMs</span>
                                    <button
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-colors"
                                        onClick={async () => {
                                            const path = await window.ipcRenderer.invoke('dialog:openDirectory');
                                            if (path) {
                                                 // In a real implementation, we'd save this path to the emulation config
                                                 // For now, let's just scan it for games as a fallback
                                                 setIsScanning(true);
                                                 try {
                                                     const games = await window.ipcRenderer.invoke('manual:scanDirectory', path);
                                                     if (games.length > 0) {
                                                         if(confirm(`Found ${games.length} executables. Import them?`)) {
                                                             for (const g of games) {
                                                                 await window.ipcRenderer.invoke('manual:addGame', {
                                                                     title: g.title,
                                                                     installPath: g.installPath,
                                                                     executable: g.executable
                                                                 });
                                                             }
                                                             loadGames();
                                                         }
                                                     } else {
                                                         alert('No executables found. ROM scanning requires backend configuration.');
                                                     }
                                                 } catch(e) {
                                                     console.error(e);
                                                 } finally {
                                                     setIsScanning(false);
                                                 }
                                            }
                                        }}
                                    >
                                        <FolderOpen size={14} />
                                        Add ROM Folder
                                    </button>
                                </div>
                            </SettingGroup>
                        </div>
                    </div>
                )}

                {activeSection === 'Library' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Library Management</h2>

                        <div className="space-y-6">
                            <SettingGroup title="Local Library">
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-white font-medium">Scan Folder for Games</span>
                                        <span className="text-xs text-gray-400">Import games from a local directory (e.g. C:\Games)</span>
                                    </div>
                                    <button
                                        onClick={handleScanFolder}
                                        disabled={isScanning}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 rounded-lg text-sm font-medium text-white transition-colors"
                                    >
                                        {isScanning ? <RefreshCw size={16} className="animate-spin" /> : <FolderOpen size={16} />}
                                        {isScanning ? 'Scanning...' : 'Scan Folder'}
                                    </button>
                                </div>
                            </SettingGroup>

                            <SettingGroup title="Game Management">
                                <Toggle
                                    label="Automatically close launcher when game starts"
                                    checked={settings.gameManagement.closeOnLaunch}
                                    onChange={(v) => handleToggle('gameManagement', 'closeOnLaunch', v)}
                                />
                                <Toggle
                                    label="Sync game saves to cloud"
                                    checked={settings.gameManagement.cloudSync}
                                    onChange={(v) => handleToggle('gameManagement', 'cloudSync', v)}
                                />
                            </SettingGroup>
                        </div>
                    </div>
                )}

                {activeSection === 'Account' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
                        <SupabaseAuth />
                    </div>
                )}

                {activeSection === 'Integrations' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Integrations</h2>
                        <div className="space-y-6">
                            <SettingGroup title="Steam Integration">
                                <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg mb-4">
                                    <div className="flex gap-3">
                                        <div className="text-blue-400 mt-1"><Link size={20} /></div>
                                        <div>
                                            <h4 className="text-sm font-medium text-blue-100">Connect Steam Account</h4>
                                            <p className="text-xs text-blue-200/70 mt-1">
                                                Securely login to Steam to import your entire library (including uninstalled games), friends list, and achievements.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-white font-medium">Status</span>
                                        <span className={`text-xs ${settings.integrations.steamId ? 'text-green-400' : 'text-gray-500'}`}>
                                            {settings.integrations.steamId ? `Connected (ID: ${settings.integrations.steamId})` : 'Not Connected'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const success = await window.ipcRenderer.invoke('auth:steam');
                                            if (success) {
                                                loadSettings();
                                                alert('Steam connected successfully! Your library will sync shortly.');
                                            } else {
                                                alert('Steam login failed or was cancelled.');
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                            settings.integrations.steamId 
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                            : 'bg-[#171a21] text-white hover:bg-[#1b2838] border border-white/10'
                                        }`}
                                    >
                                        {settings.integrations.steamId ? 'Disconnect' : 'Login with Steam'}
                                    </button>
                                </div>
                            </SettingGroup>

                            <SettingGroup title="Other Platforms">
                                <div className="space-y-4">
                                    {/* Discord */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-[#5865F2]/20 rounded-lg text-[#5865F2]">
                                                <Monitor size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-300 font-medium">Discord</span>
                                                <span className="text-xs text-gray-500">Rich Presence & Status Updates</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Toggle 
                                                label="Enable RPC" 
                                                checked={settings.integrations.discordEnabled !== false}
                                                onChange={(v) => handleToggle('integrations', 'discordEnabled', v)}
                                            />
                                        </div>
                                    </div>

                                    {/* Epic Games */}
                                    <PlatformConnection 
                                        name="Epic Games"
                                        icon={<Database size={20} />}
                                        color="text-white"
                                        bgColor="bg-white/10"
                                        connectedId={settings.integrations.epicId}
                                        onConnect={() => {
                                            const id = prompt("Enter Epic Account ID:");
                                            if (id) handleSelect('integrations', 'epicId', id);
                                        }}
                                        onDisconnect={() => handleSelect('integrations', 'epicId', '')}
                                    />

                                    {/* GOG */}
                                    <PlatformConnection 
                                        name="GOG Galaxy"
                                        icon={<RefreshCw size={20} />}
                                        color="text-purple-400"
                                        bgColor="bg-purple-600/20"
                                        connectedId={settings.integrations.gogId}
                                        onConnect={() => {
                                            const id = prompt("Enter GOG Username:");
                                            if (id) handleSelect('integrations', 'gogId', id);
                                        }}
                                        onDisconnect={() => handleSelect('integrations', 'gogId', '')}
                                    />

                                    {/* Xbox */}
                                    <PlatformConnection 
                                        name="Xbox / Game Pass"
                                        icon={<Monitor size={20} />} // Using Monitor as generic controller icon substitute
                                        color="text-green-400"
                                        bgColor="bg-green-600/20"
                                        connectedId={settings.integrations.xboxId}
                                        onConnect={() => {
                                            const id = prompt("Enter Xbox Gamertag:");
                                            if (id) handleSelect('integrations', 'xboxId', id);
                                        }}
                                        onDisconnect={() => handleSelect('integrations', 'xboxId', '')}
                                    />
                                </div>
                            </SettingGroup>
                        </div>
                    </div>
                )}


                {/* Placeholder for other sections */}
                {!['General', 'Library', 'Account', 'Integrations'].includes(activeSection) && (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                        Section under construction
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsNav = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
    <div
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${active ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
    >
        {icon}
        <span className="text-sm font-medium">{label}</span>
    </div>
);

const SettingGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-3 pb-6 border-b border-white/5 last:border-0">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
        {children}
    </div>
);

const Toggle = ({ label, checked, onChange }: { label: string, checked?: boolean, onChange?: (val: boolean) => void }) => (
    <div
        className="flex items-center justify-between py-1 group cursor-pointer"
        onClick={() => onChange && onChange(!checked)}
    >
        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
        <div className={`w-10 h-6 rounded-full relative transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-5' : 'left-1'}`}></div>
        </div>
    </div>
);

import { supabase } from '../../lib/supabase';

const SupabaseAuth = () => {
    const [session, setSession] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'login' | 'signup'>('login');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) setError(error.message);
        setLoading(false);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        // 1. Sign Up
        const { error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: username,
                },
            },
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        // 2. Create Profile (handled by Trigger, but good to handle manual insert if trigger fails or for immediate feedback)
        // The trigger 'on_auth_user_created' should handle it.
        
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (session) {
        return (
            <div className="p-6 bg-white/5 rounded-xl border border-white/10 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                        {session.user.email?.[0].toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">{session.user.user_metadata?.full_name || 'Gamer'}</h3>
                        <p className="text-sm text-gray-400">{session.user.email}</p>
                    </div>
                </div>
                <div className="pt-4 border-t border-white/10">
                    <button 
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto bg-black/20 p-8 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                <button 
                    onClick={() => { setView('login'); setError(null); }}
                    className={`flex-1 pb-2 text-sm font-bold transition-colors ${view === 'login' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => { setView('signup'); setError(null); }}
                    className={`flex-1 pb-2 text-sm font-bold transition-colors ${view === 'signup' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Sign Up
                </button>
            </div>

            <form onSubmit={view === 'login' ? handleLogin : handleSignup} className="space-y-4">
                {view === 'signup' && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="GamerTag123"
                        />
                    </div>
                )}
                
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="you@example.com"
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1">Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-xs">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : (view === 'login' ? 'Sign In' : 'Create Account')}
                </button>
            </form>
        </div>
    );
};

const PlatformConnection = ({ name, icon, color, bgColor, connectedId, onConnect, onDisconnect }: {
    name: string,
    icon: React.ReactNode,
    color: string,
    bgColor: string,
    connectedId?: string,
    onConnect: () => void,
    onDisconnect: () => void
}) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bgColor} ${color}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="text-sm text-gray-300 font-medium">{name}</span>
                {connectedId ? (
                    <span className="text-xs text-green-400 flex items-center gap-1">● Connected as {connectedId}</span>
                ) : (
                    <span className="text-xs text-gray-500">Not connected</span>
                )}
            </div>
        </div>
        <button 
            onClick={connectedId ? onDisconnect : onConnect}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                connectedId 
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
        >
            {connectedId ? 'Disconnect' : 'Connect'}
        </button>
    </div>
);

export default Settings;
