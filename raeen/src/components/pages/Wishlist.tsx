import React, { useState, useEffect } from 'react';
import { Plus, ShoppingCart, ExternalLink, TrendingDown, Bell, BellOff, RefreshCw, X, Trash2, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CachedImage } from '../CachedImage';

interface WishlistGame {
  id: string;
  title: string;
  platform: string;
  platformId: string;
  coverUrl?: string;
  currentPrice?: number;
  originalPrice?: number;
  discountPercent: number;
  currency: string;
  lowestPrice?: number;
  targetPrice?: number;
  priceHistory: Array<{ price: number; timestamp: number }>;
  addedAt: number;
  lastChecked?: number;
  priceAlertEnabled: boolean;
}

interface PriceAlert {
  id: string;
  wishlistGameId: string;
  gameName: string;
  targetPrice: number;
  currentPrice: number;
  discountPercent: number;
  triggered: boolean;
  triggeredAt?: number;
}

const Wishlist: React.FC = () => {
  const [wishlistGames, setWishlistGames] = useState<WishlistGame[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGameUrl, setNewGameUrl] = useState('');
  const [selectedGame, setSelectedGame] = useState<WishlistGame | null>(null);
  const [targetPrice, setTargetPrice] = useState<string>('');

  useEffect(() => {
    loadWishlist();
    loadAlerts();
  }, []);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const games = await window.ipcRenderer.invoke('wishlist:getAll');
      setWishlistGames(games.map((g: any) => ({
        ...g,
        priceHistory: g.priceHistory ? JSON.parse(g.priceHistory) : [],
        priceAlertEnabled: Boolean(g.priceAlertEnabled)
      })));
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const alerts = await window.ipcRenderer.invoke('wishlist:getAlerts');
      setPriceAlerts(alerts.map((a: any) => ({
        ...a,
        triggered: Boolean(a.triggered)
      })));
    } catch (error) {
      console.error('Failed to load price alerts:', error);
    }
  };

  const checkPrices = async () => {
    setChecking(true);
    try {
      const newAlerts = await window.ipcRenderer.invoke('wishlist:checkPrices');
      await loadWishlist();
      await loadAlerts();
    } catch (error) {
      console.error('Failed to check prices:', error);
    } finally {
      setChecking(false);
    }
  };

  const addToWishlist = async () => {
    if (!newGameUrl) return;

    try {
      // Parse URL to extract platform and ID
      const url = new URL(newGameUrl);
      let platform = 'Steam';
      let platformId = '';
      let title = 'Unknown Game';

      if (url.hostname.includes('steampowered.com') || url.hostname.includes('steamcommunity.com')) {
        platform = 'Steam';
        const pathParts = url.pathname.split('/');
        const appIndex = pathParts.indexOf('app');
        if (appIndex !== -1 && pathParts[appIndex + 1]) {
          platformId = pathParts[appIndex + 1];
          if (pathParts[appIndex + 2]) {
            title = pathParts[appIndex + 2].replace(/_/g, ' ');
          }
        }
      } else if (url.hostname.includes('epicgames.com')) {
        platform = 'Epic';
        const pathParts = url.pathname.split('/');
        platformId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
      } else if (url.hostname.includes('gog.com')) {
        platform = 'GOG';
        const pathParts = url.pathname.split('/');
        platformId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
      }

      if (!platformId) {
        alert('Could not parse game URL. Please use a valid Steam, Epic, or GOG URL.');
        return;
      }

      const newGame = {
        title,
        platform,
        platformId,
        coverUrl: platform === 'Steam' ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${platformId}/header.jpg` : undefined
      };

      await window.ipcRenderer.invoke('wishlist:add', newGame);
      await loadWishlist();
      setNewGameUrl('');
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      alert('Failed to add game to wishlist. Please check the URL and try again.');
    }
  };

  const removeFromWishlist = async (wishlistGameId: string) => {
    try {
      await window.ipcRenderer.invoke('wishlist:remove', wishlistGameId);
      setWishlistGames(wishlistGames.filter(g => g.id !== wishlistGameId));
      setSelectedGame(null);
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  const setTargetPriceAlert = async (wishlistGameId: string, price: number, enabled: boolean) => {
    try {
      await window.ipcRenderer.invoke('wishlist:setTargetPrice', wishlistGameId, price, enabled);
      await loadWishlist();
      setSelectedGame(null);
    } catch (error) {
      console.error('Failed to set target price:', error);
    }
  };

  const formatPrice = (price?: number, currency: string = 'USD') => {
    if (price === undefined || price === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDiscountColor = (discount: number) => {
    if (discount >= 75) return 'text-green-400 bg-green-400/20';
    if (discount >= 50) return 'text-blue-400 bg-blue-400/20';
    if (discount >= 25) return 'text-yellow-400 bg-yellow-400/20';
    return 'text-gray-400 bg-gray-400/20';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">
            WISHLIST
          </h1>
          <p className="text-gray-400 font-medium">
            Track prices and get alerts for your favorite games
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={checkPrices}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-xl font-bold text-white transition-all"
          >
            <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking...' : 'Check Prices'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            <Plus size={20} /> Add Game
          </button>
        </div>
      </div>

      {/* Price Alerts Banner */}
      {priceAlerts.filter(a => a.triggered).length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Bell className="text-green-400" size={24} />
            <div>
              <h3 className="font-bold text-white text-lg">
                {priceAlerts.filter(a => a.triggered).length} Price Alert{priceAlerts.filter(a => a.triggered).length !== 1 ? 's' : ''}!
              </h3>
              <p className="text-sm text-gray-300">
                Games on your wishlist have reached your target price
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw size={32} className="animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading wishlist...</p>
          </div>
        </div>
      ) : wishlistGames.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ShoppingCart size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">Your wishlist is empty</p>
            <p className="text-gray-500 text-sm mb-4">Add games to track prices and get alerts</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              Add Your First Game
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pb-6">
          {wishlistGames.map(game => {
            const alert = priceAlerts.find(a => a.wishlistGameId === game.id && a.triggered);
            const isAtTargetPrice = alert !== undefined;

            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
              >
                {/* Alert Badge */}
                {isAtTargetPrice && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                      <Bell size={12} />
                      Target Price!
                    </div>
                  </div>
                )}

                {/* Cover */}
                <div className="w-32 aspect-[2/3] rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                  {game.coverUrl ? (
                    <CachedImage src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="text-white/20" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="text-xl font-bold text-white leading-tight mb-1 line-clamp-2 pr-6">
                      {game.title}
                    </h3>
                    <span className="text-xs font-bold text-gray-500 bg-black/20 px-2 py-1 rounded uppercase">
                      {game.platform}
                    </span>

                    {/* Discount Badge */}
                    {game.discountPercent > 0 && (
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${getDiscountColor(game.discountPercent)}`}>
                          <TrendingDown size={12} />
                          {game.discountPercent}% OFF
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    {/* Price */}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">
                          {formatPrice(game.currentPrice, game.currency)}
                        </span>
                        {game.originalPrice && game.originalPrice > (game.currentPrice || 0) && (
                          <span className="text-sm text-gray-500 line-through">
                            {formatPrice(game.originalPrice, game.currency)}
                          </span>
                        )}
                      </div>
                      {game.lowestPrice !== undefined && game.currentPrice !== undefined && game.currentPrice <= game.lowestPrice && (
                        <p className="text-xs text-green-400 font-bold mt-1">LOWEST PRICE EVER</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedGame(game)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                      >
                        {game.priceAlertEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                        Price Alert
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Remove "${game.title}" from wishlist?`)) {
                            removeFromWishlist(game.id);
                          }
                        }}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Game Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Add to Wishlist</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game Store URL
                </label>
                <input
                  type="text"
                  placeholder="https://store.steampowered.com/app/..."
                  value={newGameUrl}
                  onChange={(e) => setNewGameUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Supports Steam, Epic Games Store, and GOG
                </p>

                <button
                  onClick={addToWishlist}
                  className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white transition-all"
                >
                  Add to Wishlist
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price Alert Modal */}
      <AnimatePresence>
        {selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedGame(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Price Alert</h2>
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-bold text-white mb-4">{selectedGame.title}</h3>

                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-1">Current Price</p>
                  <p className="text-3xl font-black text-white">
                    {formatPrice(selectedGame.currentPrice, selectedGame.currency)}
                  </p>
                </div>

                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Price (notify me when price drops to or below)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={selectedGame.targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      const price = parseFloat(targetPrice || selectedGame.targetPrice?.toString() || '0');
                      if (price > 0) {
                        setTargetPriceAlert(selectedGame.id, price, true);
                      }
                    }}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white transition-all"
                  >
                    Enable Alert
                  </button>

                  {selectedGame.priceAlertEnabled && (
                    <button
                      onClick={() => setTargetPriceAlert(selectedGame.id, 0, false)}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition-all"
                    >
                      Disable
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Wishlist;
