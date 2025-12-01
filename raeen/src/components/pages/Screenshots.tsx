import React, { useState, useEffect } from 'react';
import { Camera, Heart, Tag, Search, Filter, Download, Trash2, RefreshCw, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Screenshot {
  id: string;
  gameId?: string;
  gameName: string;
  filePath: string;
  thumbnailPath?: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  takenAt: number;
  isFavorite: boolean;
  tags: string[];
  caption?: string;
  platform?: string;
}

const Screenshots: React.FC = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [filteredScreenshots, setFilteredScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [games, setGames] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadScreenshots();
  }, []);

  useEffect(() => {
    filterScreenshots();
  }, [screenshots, searchQuery, filterFavorites, selectedGame]);

  const loadScreenshots = async () => {
    setLoading(true);
    try {
      const allScreenshots = await window.ipcRenderer.invoke('screenshot:getAll', 1000, 0);
      setScreenshots(allScreenshots.map((s: any) => ({
        ...s,
        tags: s.tags ? JSON.parse(s.tags) : [],
        isFavorite: Boolean(s.isFavorite)
      })));

      // Extract unique game names
      const gameSet = new Set(allScreenshots.map((s: any) => s.gameName));
      setGames(gameSet);
    } catch (error) {
      console.error('Failed to load screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const scanForScreenshots = async () => {
    setScanning(true);
    try {
      await window.ipcRenderer.invoke('screenshot:scan');
      await loadScreenshots();
    } catch (error) {
      console.error('Failed to scan for screenshots:', error);
    } finally {
      setScanning(false);
    }
  };

  const filterScreenshots = () => {
    let filtered = [...screenshots];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.gameName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Favorites filter
    if (filterFavorites) {
      filtered = filtered.filter(s => s.isFavorite);
    }

    // Game filter
    if (selectedGame !== 'all') {
      filtered = filtered.filter(s => s.gameName === selectedGame);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => b.takenAt - a.takenAt);

    setFilteredScreenshots(filtered);
  };

  const toggleFavorite = async (screenshotId: string) => {
    try {
      await window.ipcRenderer.invoke('screenshot:toggleFavorite', screenshotId);
      setScreenshots(screenshots.map(s =>
        s.id === screenshotId ? { ...s, isFavorite: !s.isFavorite } : s
      ));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const deleteScreenshot = async (screenshotId: string, deleteFile: boolean) => {
    try {
      await window.ipcRenderer.invoke('screenshot:delete', screenshotId, deleteFile);
      setScreenshots(screenshots.filter(s => s.id !== screenshotId));
      setSelectedScreenshot(null);
    } catch (error) {
      console.error('Failed to delete screenshot:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openScreenshotInExplorer = async (filePath: string) => {
    try {
      await window.ipcRenderer.invoke('system:execute', `explorer /select,"${filePath}"`);
    } catch (error) {
      console.error('Failed to open in explorer:', error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">
            SCREENSHOTS
          </h1>
          <p className="text-gray-400 font-medium">
            {filteredScreenshots.length} of {screenshots.length} screenshots
          </p>
        </div>

        <button
          onClick={scanForScreenshots}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-xl font-bold text-white transition-all"
        >
          <RefreshCw size={18} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning...' : 'Scan for Screenshots'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search screenshots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Game Filter */}
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30"
        >
          <option value="all">All Games</option>
          {Array.from(games).sort().map(game => (
            <option key={game} value={game}>{game}</option>
          ))}
        </select>

        {/* Favorites Toggle */}
        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            filterFavorites
              ? 'bg-pink-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Heart size={18} fill={filterFavorites ? 'currentColor' : 'none'} />
          Favorites Only
        </button>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw size={32} className="animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading screenshots...</p>
          </div>
        </div>
      ) : filteredScreenshots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Camera size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No screenshots found</p>
            <p className="text-gray-500 text-sm">Click "Scan for Screenshots" to search your system</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto custom-scrollbar pb-6">
          {filteredScreenshots.map((screenshot) => (
            <motion.div
              key={screenshot.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group cursor-pointer"
              onClick={() => setSelectedScreenshot(screenshot)}
            >
              {/* Screenshot Card */}
              <div className="aspect-video bg-black/40 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all">
                <img
                  src={`raeen-file://${screenshot.filePath}`}
                  alt={screenshot.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">
                      {screenshot.width}x{screenshot.height}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(screenshot.id);
                      }}
                      className="p-1.5 bg-black/50 rounded-full hover:bg-pink-600 transition-colors"
                    >
                      <Heart
                        size={16}
                        className="text-white"
                        fill={screenshot.isFavorite ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  <div>
                    <p className="text-white font-bold text-sm truncate mb-1">
                      {screenshot.gameName}
                    </p>
                    <p className="text-gray-300 text-xs">
                      {formatDate(screenshot.takenAt)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Screenshot Detail Modal */}
      <AnimatePresence>
        {selectedScreenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedScreenshot(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-6xl max-h-full flex gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="flex-1 flex items-center justify-center">
                <img
                  src={`raeen-file://${selectedScreenshot.filePath}`}
                  alt={selectedScreenshot.fileName}
                  className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
                />
              </div>

              {/* Info Panel */}
              <div className="w-80 bg-[#0f172a] rounded-xl p-6 border border-white/10 overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-white">{selectedScreenshot.gameName}</h2>
                  <button
                    onClick={() => setSelectedScreenshot(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Date */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Date Taken</p>
                    <p className="text-white">{new Date(selectedScreenshot.takenAt).toLocaleString()}</p>
                  </div>

                  {/* Dimensions */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Resolution</p>
                    <p className="text-white">{selectedScreenshot.width} × {selectedScreenshot.height}</p>
                  </div>

                  {/* File Size */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">File Size</p>
                    <p className="text-white">{formatBytes(selectedScreenshot.fileSize)}</p>
                  </div>

                  {/* Platform */}
                  {selectedScreenshot.platform && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Platform</p>
                      <p className="text-white capitalize">{selectedScreenshot.platform}</p>
                    </div>
                  )}

                  {/* File Name */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">File Name</p>
                    <p className="text-white text-sm break-all">{selectedScreenshot.fileName}</p>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <button
                      onClick={() => toggleFavorite(selectedScreenshot.id)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                        selectedScreenshot.isFavorite
                          ? 'bg-pink-600 hover:bg-pink-700 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      <Heart size={18} fill={selectedScreenshot.isFavorite ? 'currentColor' : 'none'} />
                      {selectedScreenshot.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </button>

                    <button
                      onClick={() => openScreenshotInExplorer(selectedScreenshot.filePath)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white transition-all"
                    >
                      <ImageIcon size={18} />
                      Show in Explorer
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Delete this screenshot? This action cannot be undone.')) {
                          deleteScreenshot(selectedScreenshot.id, true);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-all"
                    >
                      <Trash2 size={18} />
                      Delete Screenshot
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Screenshots;
