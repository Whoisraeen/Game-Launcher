import React, { useState, useEffect } from 'react';
import { Package, Download, Check, RefreshCw, Search, Filter, DollarSign, Calendar, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { CachedImage } from '../CachedImage';

interface DLC {
  id: string;
  gameId: string;
  platform: string;
  platformDlcId: string;
  name: string;
  description?: string;
  releaseDate?: number;
  price?: number;
  currency: string;
  owned: boolean;
  installed: boolean;
  coverUrl?: string;
  detectedAt: number;
}

interface DLCStats {
  total: number;
  owned: number;
  installed: number;
  totalValue: number;
  ownedValue: number;
}

const DLCManager: React.FC = () => {
  const [dlcs, setDlcs] = useState<DLC[]>([]);
  const [filteredDlcs, setFilteredDlcs] = useState<DLC[]>([]);
  const [stats, setStats] = useState<DLCStats>({ total: 0, owned: 0, installed: 0, totalValue: 0, ownedValue: 0 });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwned, setFilterOwned] = useState<'all' | 'owned' | 'unowned'>('all');
  const [filterInstalled, setFilterInstalled] = useState<'all' | 'installed' | 'uninstalled'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'releaseDate'>('name');

  useEffect(() => {
    loadDLCs();
    loadStats();
  }, []);

  useEffect(() => {
    filterAndSortDLCs();
  }, [dlcs, searchQuery, filterOwned, filterInstalled, sortBy]);

  const loadDLCs = async () => {
    setLoading(true);
    try {
      const allDlcs = await window.ipcRenderer.invoke('dlc:getAll');
      setDlcs(allDlcs.map((d: any) => ({
        ...d,
        owned: Boolean(d.owned),
        installed: Boolean(d.installed)
      })));
    } catch (error) {
      console.error('Failed to load DLCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const dlcStats = await window.ipcRenderer.invoke('dlc:getStats');
      setStats(dlcStats);
    } catch (error) {
      console.error('Failed to load DLC stats:', error);
    }
  };

  const scanForDLCs = async () => {
    setScanning(true);
    try {
      await window.ipcRenderer.invoke('dlc:scan');
      await loadDLCs();
      await loadStats();
    } catch (error) {
      console.error('Failed to scan for DLCs:', error);
    } finally {
      setScanning(false);
    }
  };

  const filterAndSortDLCs = () => {
    let filtered = [...dlcs];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Owned filter
    if (filterOwned === 'owned') {
      filtered = filtered.filter(d => d.owned);
    } else if (filterOwned === 'unowned') {
      filtered = filtered.filter(d => !d.owned);
    }

    // Installed filter
    if (filterInstalled === 'installed') {
      filtered = filtered.filter(d => d.installed);
    } else if (filterInstalled === 'uninstalled') {
      filtered = filtered.filter(d => !d.installed);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (b.price || 0) - (a.price || 0);
        case 'releaseDate':
          return (b.releaseDate || 0) - (a.releaseDate || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredDlcs(filtered);
  };

  const toggleOwned = async (dlcId: string) => {
    try {
      await window.ipcRenderer.invoke('dlc:markOwned', dlcId);
      setDlcs(dlcs.map(d =>
        d.id === dlcId ? { ...d, owned: !d.owned } : d
      ));
      await loadStats();
    } catch (error) {
      console.error('Failed to toggle owned status:', error);
    }
  };

  const toggleInstalled = async (dlcId: string) => {
    try {
      await window.ipcRenderer.invoke('dlc:markInstalled', dlcId);
      setDlcs(dlcs.map(d =>
        d.id === dlcId ? { ...d, installed: !d.installed } : d
      ));
      await loadStats();
    } catch (error) {
      console.error('Failed to toggle installed status:', error);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPrice = (price?: number, currency: string = 'USD') => {
    if (price === undefined || price === null) return 'Free';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">
            DLC MANAGER
          </h1>
          <p className="text-gray-400 font-medium">
            Track downloadable content for your games
          </p>
        </div>

        <button
          onClick={scanForDLCs}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-xl font-bold text-white transition-all"
        >
          <RefreshCw size={18} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning...' : 'Scan for DLCs'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Package size={24} className="text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.total}</p>
          <p className="text-sm text-gray-400">Total DLCs</p>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Check size={24} className="text-green-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.owned}</p>
          <p className="text-sm text-gray-400">Owned</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Download size={24} className="text-purple-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.installed}</p>
          <p className="text-sm text-gray-400">Installed</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={24} className="text-yellow-400" />
          </div>
          <p className="text-3xl font-black text-white">${stats.ownedValue.toFixed(2)}</p>
          <p className="text-sm text-gray-400">Collection Value</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search DLCs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Owned Filter */}
        <select
          value={filterOwned}
          onChange={(e) => setFilterOwned(e.target.value as any)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30"
        >
          <option value="all">All DLCs</option>
          <option value="owned">Owned Only</option>
          <option value="unowned">Unowned Only</option>
        </select>

        {/* Installed Filter */}
        <select
          value={filterInstalled}
          onChange={(e) => setFilterInstalled(e.target.value as any)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30"
        >
          <option value="all">All</option>
          <option value="installed">Installed</option>
          <option value="uninstalled">Not Installed</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30"
        >
          <option value="name">Sort by Name</option>
          <option value="price">Sort by Price</option>
          <option value="releaseDate">Sort by Release Date</option>
        </select>
      </div>

      {/* DLC List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw size={32} className="animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading DLCs...</p>
          </div>
        </div>
      ) : filteredDlcs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No DLCs found</p>
            <p className="text-gray-500 text-sm">Click "Scan for DLCs" to search for downloadable content</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto custom-scrollbar pb-6">
          {filteredDlcs.map((dlc) => (
            <motion.div
              key={dlc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all group"
            >
              {/* Cover */}
              <div className="w-32 h-20 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                {dlc.coverUrl ? (
                  <CachedImage
                    src={dlc.coverUrl}
                    alt={dlc.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="text-white/20" size={32} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-lg font-bold text-white truncate">{dlc.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-gray-500 bg-black/30 px-2 py-0.5 rounded uppercase">
                        {dlc.platform}
                      </span>
                      {dlc.releaseDate && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(dlc.releaseDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-white">
                      {formatPrice(dlc.price, dlc.currency)}
                    </p>
                  </div>
                </div>

                {dlc.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {dlc.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleOwned(dlc.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                      dlc.owned
                        ? 'bg-green-600 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    <Check size={16} />
                    {dlc.owned ? 'Owned' : 'Mark as Owned'}
                  </button>

                  {dlc.owned && (
                    <button
                      onClick={() => toggleInstalled(dlc.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                        dlc.installed
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      <Download size={16} />
                      {dlc.installed ? 'Installed' : 'Mark as Installed'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DLCManager;
