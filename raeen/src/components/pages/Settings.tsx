import React, { useEffect, useState } from 'react';
import { Monitor, User, Shield, Keyboard, Bell, Volume2, Database, RefreshCw, FolderOpen } from 'lucide-react';
import { useSettingsStore, UserSettings } from '../../stores/settingsStore';
import { useGameStore } from '../../stores/gameStore';

const Settings: React.FC = () => {
    const { settings, loadSettings, updateSetting, isLoading } = useSettingsStore();
    const { loadGames } = useGameStore();
    const [activeSection, setActiveSection] = useState('General');
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    if (isLoading || !settings) {
        return <div className="glass-panel flex-1 flex items-center justify-center">Loading settings...</div>;
    }

    const handleToggle = (category: keyof UserSettings, key: string, value: boolean) => {
        // @ts-ignore - Dynamic key access
        updateSetting(category, { [key]: value });
    };

    const handleSelect = (category: keyof UserSettings, key: string, value: string) => {
        // @ts-ignore - Dynamic key access
        updateSetting(category, { [key]: value });
    };

    const handleScanFolder = async () => {
        try {
            const path = await window.ipcRenderer.invoke('dialog:openDirectory');
            if (!path) return;

            setIsScanning(true);
            const foundGames = await window.ipcRenderer.invoke('manual:scan', path);
            
            let importedCount = 0;
            for (const game of foundGames) {
                await window.ipcRenderer.invoke('manual:add', game.title, game.installPath, game.executable);
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
            </div>

            {/* Content */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-slate-800/30 rounded-2xl border border-white/5 p-8 space-y-8">
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

                            <SettingGroup title="Appearance">
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-300">Theme</span>
                                    <select 
                                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                        value={settings.appearance.theme}
                                        onChange={(e) => handleSelect('appearance', 'theme', e.target.value)}
                                    >
                                        <option value="dark">Dark (Default)</option>
                                        <option value="light">Light</option>
                                        <option value="cyberpunk">Cyberpunk</option>
                                        <option value="midnight">Midnight</option>
                                    </select>
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
                        <SettingGroup title="Profile">
                             <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-gray-300">Username</span>
                                <input 
                                    type="text" 
                                    value={settings.account.username}
                                    onChange={(e) => handleSelect('account', 'username', e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-gray-300">Avatar URL</span>
                                <input 
                                    type="text" 
                                    value={settings.account.avatar}
                                    onChange={(e) => handleSelect('account', 'avatar', e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-64 truncate"
                                />
                            </div>
                             <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-gray-300">Status</span>
                                <select 
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                    value={settings.account.status}
                                    onChange={(e) => handleSelect('account', 'status', e.target.value)}
                                >
                                    <option value="online">Online</option>
                                    <option value="away">Away</option>
                                    <option value="offline">Invisible</option>
                                    <option value="playing">Playing</option>
                                </select>
                            </div>
                        </SettingGroup>
                    </div>
                )}
                
                {/* Placeholder for other sections */}
                {!['General', 'Library', 'Account'].includes(activeSection) && (
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

export default Settings;
