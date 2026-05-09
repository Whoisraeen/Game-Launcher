import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Scissors, Upload, Film, Wifi, WifiOff, Tv, Video as VideoIcon, Radio, Disc, AlertTriangle, RefreshCw, Combine, Plus, Trash2, Sparkles } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';

interface VideoMetadata {
    duration: number; // in seconds
    codec: string;
    width: number;
    height: number;
    fps: number;
}

interface ObsScene {
    sceneName: string;
    sceneIndex: number;
}

interface ObsStreamStatus {
    isStreaming: boolean;
    isRecording: boolean;
    streamTimecode: string;
    recTimecode: string;
}

const Studio: React.FC = () => {
    const { settings, updateSetting } = useSettingsStore();
    // Video Editor States
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const [isCutting, setIsCutting] = useState(false);
    const [cutOutput, setCutOutput] = useState<string | null>(null);

    // OBS Integration States
    const [obsAddress, setObsAddress] = useState(settings?.obs?.address || 'localhost:4444');
    const [obsPassword, setObsPassword] = useState(settings?.obs?.password || '');
    const [obsConnected, setObsConnected] = useState(false);
    const [obsScenes, setObsScenes] = useState<ObsScene[]>([]);
    const [currentScene, setCurrentScene] = useState<string | null>(null);
    const [streamStatus, setStreamStatus] = useState<ObsStreamStatus | null>(null);
    const [obsIsLoading, setObsIsLoading] = useState(false);

    // Highlight Compiler States
    const [highlightClips, setHighlightClips] = useState<string[]>([]);
    const [highlightTransition, setHighlightTransition] = useState('none');
    const [isCompiling, setIsCompiling] = useState(false);
    const [compileOutput, setCompileOutput] = useState<string | null>(null);

    // Stream Title Generator States
    const [titleGame, setTitleGame] = useState('');
    const [titleMood, setTitleMood] = useState('chill');
    const [titleStyle, setTitleStyle] = useState('minimal');
    const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
    const [titleHistory, setTitleHistory] = useState<Array<{ title: string; gameName: string; createdAt: string }>>([]);

    useEffect(() => {
        checkObsConnectionStatus();
    }, []);

    const checkObsConnectionStatus = async () => {
        setObsIsLoading(true);
        try {
            const connected = await window.ipcRenderer.invoke('obs:isConnected');
            setObsConnected(connected);
            if (connected) {
                await fetchObsScenes();
                await fetchStreamStatus();
            } else {
                setObsScenes([]);
                setCurrentScene(null);
                setStreamStatus(null);
            }
        } catch (e) {
            console.error('Error checking OBS connection:', e);
            setObsConnected(false);
        } finally {
            setObsIsLoading(false);
        }
    };

    const handleObsConnect = async () => {
        setObsIsLoading(true);
        try {
            await updateSetting('obs', { address: obsAddress, password: obsPassword });
            await window.ipcRenderer.invoke('obs:setConnectionConfig', { address: obsAddress, password: obsPassword });
            const success = await window.ipcRenderer.invoke('obs:connect');
            setObsConnected(success);
            if (success) {
                await fetchObsScenes();
                await fetchStreamStatus();
            }
        } catch (e: any) {
            alert(`Failed to connect to OBS: ${e.message}`);
            setObsConnected(false);
        } finally {
            setObsIsLoading(false);
        }
    };

    const handleObsDisconnect = async () => {
        setObsIsLoading(true);
        try {
            await window.ipcRenderer.invoke('obs:disconnect');
            setObsConnected(false);
            setObsScenes([]);
            setCurrentScene(null);
            setStreamStatus(null);
        } catch (e) {
            console.error('Failed to disconnect from OBS:', e);
        } finally {
            setObsIsLoading(false);
        }
    };

    const fetchObsScenes = async () => {
        try {
            const scenes = await window.ipcRenderer.invoke('obs:getSceneList');
            setObsScenes(scenes);
            // Optionally set current scene
            // const current = await window.ipcRenderer.invoke('obs:getCurrentScene');
            // setCurrentScene(current.name);
        } catch (e) {
            console.error('Failed to fetch OBS scenes:', e);
            setObsScenes([]);
        }
    };

    const fetchStreamStatus = async () => {
        try {
            const status = await window.ipcRenderer.invoke('obs:getStreamStatus');
            setStreamStatus(status);
        } catch (e) {
            console.error('Failed to fetch OBS stream status:', e);
            setStreamStatus(null);
        }
    };

    const handleSceneChange = async (sceneName: string) => {
        try {
            await window.ipcRenderer.invoke('obs:setCurrentScene', sceneName);
            setCurrentScene(sceneName);
        } catch (e) {
            console.error('Failed to switch OBS scene:', e);
        }
    };

    const handleToggleStreaming = async () => {
        try {
            if (streamStatus?.isStreaming) {
                await window.ipcRenderer.invoke('obs:stopStreaming');
            } else {
                await window.ipcRenderer.invoke('obs:startStreaming');
            }
            await fetchStreamStatus();
        } catch (e) {
            console.error('Failed to toggle streaming:', e);
            alert('Failed to toggle streaming. Check OBS logs.');
        }
    };

    const handleToggleRecording = async () => {
        try {
            if (streamStatus?.isRecording) {
                await window.ipcRenderer.invoke('obs:stopRecording');
            } else {
                await window.ipcRenderer.invoke('obs:startRecording');
            }
            await fetchStreamStatus();
        } catch (e) {
            console.error('Failed to toggle recording:', e);
            alert('Failed to toggle recording. Check OBS logs.');
        }
    };

    // Video Editor Effects & Handlers (unchanged)
    // ...

    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile);
            setVideoSrc(url);
            // Cleanup previous URL if any
            return () => { URL.revokeObjectURL(url); };
        }
    }, [videoFile]);

    useEffect(() => {
        if (videoSrc && videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
                if (videoRef.current) {
                    setEndTime(videoRef.current.duration);
                    // Get metadata from backend for more accurate info
                    window.ipcRenderer.invoke('video:metadata', videoFile?.path)
                        .then(setVideoMetadata)
                        .catch(e => console.error("Failed to get video metadata:", e));
                }
            };
        }
    }, [videoSrc, videoFile]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setCutOutput(null); // Clear previous output
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleCut = async () => {
        if (!videoFile || !videoMetadata) return;

        const outputFileName = `clip_${videoFile.name.split('.').slice(0, -1).join('.')}_${Math.floor(startTime)}-${Math.floor(endTime)}.mp4`;
        const defaultVideosPath = await window.ipcRenderer.invoke('dialog:openDirectory');
        // Fallback to a simple concatenation if path is not working, or rely on main process. 
        // Since we can't access app.getPath in renderer, we'll just use the selected path or a default string.
        const basePath = defaultVideosPath || 'C:\\Videos';
        const outputPath = `${basePath}\\${outputFileName}`;

        setIsCutting(true);
        try {
            const resultPath = await window.ipcRenderer.invoke(
                'video:cut',
                videoFile.path,
                outputPath,
                startTime,
                endTime,
                true
            );
            setCutOutput(resultPath);
            alert(`Clip saved to: ${resultPath}`);
        } catch (e) {
            console.error('Video cutting failed:', e);
            alert('Failed to cut video. See console for details.');
        } finally {
            setIsCutting(false);
        }
    };

    // Highlight Compiler Handlers
    const handleAddClips = async () => {
        try {
            const result = await window.ipcRenderer.invoke('dialog:openFiles', { filters: [{ name: 'Video', extensions: ['mp4', 'mkv', 'avi', 'webm', 'mov'] }] });
            if (result && result.length > 0) {
                setHighlightClips(prev => [...prev, ...result]);
            }
        } catch (e) {
            console.error('Failed to select clips:', e);
        }
    };

    const handleRemoveClip = (index: number) => {
        setHighlightClips(prev => prev.filter((_, i) => i !== index));
    };

    const handleCompileHighlights = async () => {
        if (highlightClips.length < 2) return;
        const outputDir = await window.ipcRenderer.invoke('dialog:openDirectory');
        if (!outputDir) return;

        const outputPath = `${outputDir}\\highlights_${Date.now()}.mp4`;
        setIsCompiling(true);
        setCompileOutput(null);
        try {
            const result = await window.ipcRenderer.invoke('video:compileHighlights', highlightClips, outputPath, highlightTransition);
            setCompileOutput(result);
        } catch (e) {
            console.error('Highlight compilation failed:', e);
            alert('Failed to compile highlights. See console for details.');
        } finally {
            setIsCompiling(false);
        }
    };

    // Stream Title Generator Handlers
    const handleGenerateTitle = async () => {
        if (!titleGame.trim()) return;
        try {
            const title = await window.ipcRenderer.invoke('stream:generateTitle', titleGame, titleMood, titleStyle);
            setGeneratedTitle(title);
            const history = await window.ipcRenderer.invoke('stream:getTitleHistory');
            setTitleHistory(history.slice(0, 10));
        } catch (e) {
            console.error('Failed to generate title:', e);
        }
    };

    const copyTitle = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const ms = Math.floor((timeInSeconds - Math.floor(timeInSeconds)) * 100);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };


    return (
        <div className="glass-panel flex-1 h-full overflow-y-auto custom-scrollbar flex flex-col p-6 gap-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Film className="text-purple-500" size={32} />
                Clip Studio
            </h1>

            <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left Panel: Video Editor */}
                <div className="flex flex-col bg-black/20 border border-white/10 rounded-xl p-4">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <VideoIcon size={24} className="text-blue-400" /> Video Editor
                    </h2>
                    <div className="flex flex-col gap-4">
                        <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" id="video-upload" />
                        <label
                            htmlFor="video-upload"
                            className="flex items-center justify-center p-4 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/40 transition-colors bg-black/20 text-gray-400"
                        >
                            <Upload size={24} className="mr-2" /> Select a Video to Edit
                        </label>
                    </div>

                    {videoSrc && (
                        <div className="flex-1 flex flex-col gap-4 mt-4">
                            <div className="relative w-full h-40 bg-black rounded-xl overflow-hidden">
                                <video
                                    ref={videoRef}
                                    src={videoSrc}
                                    controls
                                    onTimeUpdate={handleTimeUpdate}
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-x-0 bottom-0 p-2 bg-black/70 flex items-center justify-between text-xs font-mono">
                                    <span>Start: {formatTime(startTime)}</span>
                                    <span>Current: {formatTime(currentTime)}</span>
                                    <span>End: {formatTime(endTime)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {videoMetadata && (
                                    <div className="text-sm text-gray-400">
                                        Duration: {formatTime(videoMetadata.duration)} | {videoMetadata.width}x{videoMetadata.height} | {videoMetadata.fps} FPS
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={() => videoRef.current?.play()} className="p-3 bg-blue-600 rounded-lg hover:bg-blue-500"><Play size={18} /></button>
                                    <button onClick={() => videoRef.current?.pause()} className="p-3 bg-blue-600 rounded-lg hover:bg-blue-500"><Pause size={18} /></button>
                                    <button onClick={() => videoRef.current && (videoRef.current.currentTime = 0)} className="p-3 bg-blue-600 rounded-lg hover:bg-blue-500"><RotateCcw size={18} /></button>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-300">Start Time</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max={videoMetadata?.duration || 0}
                                        step="0.1"
                                        value={startTime}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setStartTime(Math.min(val, endTime));
                                            if (videoRef.current) videoRef.current.currentTime = Math.min(val, endTime);
                                        }}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <label className="text-sm text-gray-300">End Time</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max={videoMetadata?.duration || 0}
                                        step="0.1"
                                        value={endTime}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setEndTime(Math.max(val, startTime));
                                            if (videoRef.current) videoRef.current.currentTime = Math.max(val, startTime);
                                        }}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                </div>

                                <button
                                    onClick={handleCut}
                                    disabled={isCutting || !videoFile || startTime >= endTime}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCutting ? <RotateCcw size={20} className="animate-spin" /> : <Scissors size={20} />}
                                    {isCutting ? 'Cutting...' : 'Cut Clip'}
                                </button>

                                {cutOutput && (
                                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-sm text-green-200 flex items-center justify-between">
                                        Clip saved! <span className="font-mono truncate">{cutOutput}</span>
                                        <button
                                            onClick={() => window.ipcRenderer.invoke('system:openExternal', cutOutput)}
                                            className="ml-2 px-3 py-1 bg-green-500/20 hover:bg-green-500/30 rounded text-xs"
                                        >
                                            Open
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!videoFile && (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <p>No video selected. Upload a video to start editing.</p>
                        </div>
                    )}
                </div>

                {/* Right Panel: OBS Integration */}
                <div className="flex flex-col bg-black/20 border border-white/10 rounded-xl p-4">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Tv size={24} className="text-red-500" /> OBS Integration
                    </h2>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">OBS WebSocket Address</label>
                            <input
                                type="text"
                                value={obsAddress}
                                onChange={(e) => setObsAddress(e.target.value)}
                                placeholder="localhost:4444"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">OBS WebSocket Password (Optional)</label>
                            <input
                                type="password"
                                value={obsPassword}
                                onChange={(e) => setObsPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            {obsConnected ? (
                                <button
                                    onClick={handleObsDisconnect}
                                    disabled={obsIsLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    <WifiOff size={16} /> Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={handleObsConnect}
                                    disabled={obsIsLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    {obsIsLoading ? <RotateCcw size={16} className="animate-spin" /> : <Wifi size={16} />} Connect
                                </button>
                            )}
                            <button
                                onClick={checkObsConnectionStatus}
                                disabled={obsIsLoading}
                                className="p-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                                title="Refresh Status"
                            >
                                <RefreshCw size={16} className={obsIsLoading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {obsConnected && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Current Scene</label>
                                <select
                                    value={currentScene || ''}
                                    onChange={(e) => handleSceneChange(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none"
                                >
                                    <option value="">Select a scene</option>
                                    {obsScenes.map(scene => (
                                        <option key={scene.sceneName} value={scene.sceneName}>{scene.sceneName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleToggleStreaming}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${streamStatus?.isStreaming ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {streamStatus?.isStreaming ? <Radio size={16} className="text-white animate-pulse" /> : <Radio size={16} />}
                                    {streamStatus?.isStreaming ? 'Stop Streaming' : 'Start Streaming'}
                                </button>
                                <button
                                    onClick={handleToggleRecording}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${streamStatus?.isRecording ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {streamStatus?.isRecording ? <Disc size={16} className="text-white animate-pulse" /> : <Disc size={16} />}
                                    {streamStatus?.isRecording ? 'Stop Recording' : 'Start Recording'}
                                </button>
                            </div>
                            {streamStatus && (
                                <div className="text-xs text-gray-400 flex justify-between">
                                    <span>Stream Time: {streamStatus.streamTimecode}</span>
                                    <span>Rec Time: {streamStatus.recTimecode}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {!obsConnected && !obsIsLoading && (
                        <div className="flex flex-col items-center justify-center text-gray-500 flex-1">
                            <AlertTriangle size={48} className="opacity-20 mb-3" />
                            <p className="text-lg font-medium text-center">Not connected to OBS. <br /> Please ensure OBS is running and WebSocket Server is enabled.</p>
                            <p className="text-xs mt-2 text-gray-600 text-center">
                                OBS &rarr; Tools &rarr; WebSocket Server Settings &rarr; Enable WebSocket Server
                            </p>
                            <button
                                onClick={handleObsConnect}
                                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                Reconnect
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section: Highlights + Title Generator */}
            <div className="grid grid-cols-2 gap-6 mt-2">
                {/* Compile Highlights */}
                <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                    <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <Combine size={20} className="text-amber-400" /> Compile Highlights
                    </h2>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddClips}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white transition-colors"
                            >
                                <Plus size={12} /> Add Clips
                            </button>
                            <select
                                value={highlightTransition}
                                onChange={e => setHighlightTransition(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                            >
                                <option value="none">No Transition</option>
                                <option value="fade">Fade</option>
                                <option value="dissolve">Dissolve</option>
                                <option value="wipe">Wipe</option>
                            </select>
                        </div>

                        {highlightClips.length > 0 && (
                            <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1">
                                {highlightClips.map((clip, i) => (
                                    <div key={i} className="flex items-center gap-2 px-2 py-1 bg-white/[0.03] rounded text-xs text-gray-300">
                                        <Film size={10} className="text-amber-400 flex-shrink-0" />
                                        <span className="truncate flex-1">{clip.split(/[/\\]/).pop()}</span>
                                        <button onClick={() => handleRemoveClip(i)} className="text-red-400 hover:text-red-300">
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleCompileHighlights}
                            disabled={isCompiling || highlightClips.length < 2}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCompiling ? <RotateCcw size={14} className="animate-spin" /> : <Combine size={14} />}
                            {isCompiling ? 'Compiling...' : `Compile ${highlightClips.length} Clips`}
                        </button>

                        {compileOutput && (
                            <div className="p-2 bg-green-900/20 border border-green-500/30 rounded-lg text-xs text-green-200 truncate">
                                Saved: {compileOutput}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stream Title Generator */}
                <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                    <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <Sparkles size={20} className="text-yellow-300" /> Stream Title Generator
                    </h2>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={titleGame}
                            onChange={e => setTitleGame(e.target.value)}
                            placeholder="Game name..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500/40"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <select value={titleMood} onChange={e => setTitleMood(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none">
                                <option value="chill">Chill</option>
                                <option value="competitive">Competitive</option>
                                <option value="first-time">First Time</option>
                                <option value="speedrun">Speedrun</option>
                                <option value="funny">Funny</option>
                                <option value="horror">Horror</option>
                                <option value="grinding">Grinding</option>
                            </select>
                            <select value={titleStyle} onChange={e => setTitleStyle(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none">
                                <option value="minimal">Minimal</option>
                                <option value="energetic">Energetic</option>
                                <option value="professional">Professional</option>
                                <option value="clickbait">Clickbait</option>
                            </select>
                        </div>
                        <button
                            onClick={handleGenerateTitle}
                            disabled={!titleGame.trim()}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            <Sparkles size={14} /> Generate Title
                        </button>

                        {generatedTitle && (
                            <div
                                onClick={() => copyTitle(generatedTitle)}
                                className="p-2.5 bg-purple-900/20 border border-purple-500/30 rounded-lg text-sm text-purple-200 cursor-pointer hover:bg-purple-900/30 transition-colors"
                                title="Click to copy"
                            >
                                {generatedTitle}
                            </div>
                        )}

                        {titleHistory.length > 0 && (
                            <div className="max-h-16 overflow-y-auto custom-scrollbar space-y-0.5">
                                {titleHistory.slice(1, 5).map((h, i) => (
                                    <div key={i} onClick={() => copyTitle(h.title)}
                                        className="text-[10px] text-gray-400 truncate cursor-pointer hover:text-white px-1 py-0.5 rounded hover:bg-white/5 transition-colors">
                                        {h.title}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Studio;