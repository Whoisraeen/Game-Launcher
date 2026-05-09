import React, { useEffect, useState } from 'react';
import { Star, Tag, ShoppingCart, Search, Package, CheckCircle, AlertCircle } from 'lucide-react';

interface Deal {
    storeID: string;
    dealID: string;
    price: string;
    retailPrice: string;
    savings: string;
    title: string;
    thumb: string;
    metacriticScore?: string;
    steamRatingText?: string;
    steamRatingPercent?: string;
    steamAppID?: string;
    releaseDate?: number;
    isOnSale: string;
    dealRating: string;
}

interface BundleGame {
    title: string;
    price: string;
    retailPrice: string;
    owned: boolean;
    dealID?: string;
    steamAppID?: string;
    thumb?: string;
}

interface BundleAnalysis {
    bundleName: string;
    totalPrice: string;
    gamesOwned: BundleGame[];
    gamesNew: BundleGame[];
    effectivePricePerNew: string;
    savings: string;
    worthIt: boolean;
}

type StoreTab = 'deals' | 'bundles';

const Store: React.FC = () => {
    const [activeTab, setActiveTab] = useState<StoreTab>('deals');
    const [featuredDeals, setFeaturedDeals] = useState<Deal[]>([]);
    const [trendingDeals, setTrendingDeals] = useState<Deal[]>([]);
    const [topRatedDeals, setTopRatedDeals] = useState<Deal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Deal[]>([]);

    // Bundle Analyzer state
    const [bundleSearchQuery, setBundleSearchQuery] = useState('');
    const [bundleGames, setBundleGames] = useState<BundleGame[]>([]);
    const [bundlePrice, setBundlePrice] = useState('');
    const [bundleName, setBundleName] = useState('');
    const [bundleAnalysis, setBundleAnalysis] = useState<BundleAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [bundleSearchResults, setBundleSearchResults] = useState<Deal[]>([]);

    useEffect(() => {
        loadDeals();
    }, []);

    useEffect(() => {
        if (searchQuery.length > 2) {
            searchDeals();
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    useEffect(() => {
        if (bundleSearchQuery.length > 2) {
            searchBundleGames();
        } else {
            setBundleSearchResults([]);
        }
    }, [bundleSearchQuery]);

    const loadDeals = async () => {
        setIsLoading(true);
        try {
            const [featured, trending, topRated] = await Promise.all([
                window.ipcRenderer.invoke('store:getDeals', { pageSize: 5, sortBy: 'Savings', lowerPrice: 10 }),
                window.ipcRenderer.invoke('store:getDeals', { pageSize: 8, sortBy: 'Recent' }),
                window.ipcRenderer.invoke('store:getDeals', { pageSize: 8, sortBy: 'Metacritic', desc: 1 })
            ]);

            const heroCandidates = await window.ipcRenderer.invoke('store:getDeals', { pageSize: 5, sortBy: 'Deal Rating', lowerPrice: 20 });
            
            setFeaturedDeals(heroCandidates);
            setTrendingDeals(featured);
            setTopRatedDeals(topRated);
        } catch (error) {
            console.error('Failed to load store deals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const searchDeals = async () => {
        try {
            const results = await window.ipcRenderer.invoke('store:getDeals', { title: searchQuery, pageSize: 20 });
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    const searchBundleGames = async () => {
        try {
            const results = await window.ipcRenderer.invoke('store:getDeals', { title: bundleSearchQuery, pageSize: 10 });
            setBundleSearchResults(results);
        } catch (error) {
            console.error('Bundle search failed:', error);
        }
    };

    const addGameToBundle = (deal: Deal) => {
        if (bundleGames.find(g => g.title === deal.title)) return;
        setBundleGames(prev => [...prev, {
            title: deal.title,
            price: deal.price,
            retailPrice: deal.retailPrice,
            owned: false,
            dealID: deal.dealID,
            steamAppID: deal.steamAppID,
            thumb: deal.thumb,
        }]);
        setBundleSearchQuery('');
        setBundleSearchResults([]);
    };

    const toggleOwned = (index: number) => {
        setBundleGames(prev => prev.map((g, i) => i === index ? { ...g, owned: !g.owned } : g));
    };

    const removeFromBundle = (index: number) => {
        setBundleGames(prev => prev.filter((_, i) => i !== index));
    };

    const analyzeBundle = () => {
        if (bundleGames.length === 0 || !bundlePrice) return;
        setIsAnalyzing(true);

        const price = parseFloat(bundlePrice);
        const owned = bundleGames.filter(g => g.owned);
        const newGames = bundleGames.filter(g => !g.owned);
        const totalRetail = bundleGames.reduce((sum, g) => sum + parseFloat(g.retailPrice || '0'), 0);
        const newRetail = newGames.reduce((sum, g) => sum + parseFloat(g.retailPrice || '0'), 0);
        const effectivePrice = newGames.length > 0 ? (price / newGames.length) : 0;
        const savingsPercent = totalRetail > 0 ? ((1 - price / totalRetail) * 100) : 0;

        setBundleAnalysis({
            bundleName: bundleName || 'Custom Bundle',
            totalPrice: price.toFixed(2),
            gamesOwned: owned,
            gamesNew: newGames,
            effectivePricePerNew: effectivePrice.toFixed(2),
            savings: savingsPercent.toFixed(0),
            worthIt: newGames.length > 0 && effectivePrice < (newRetail / newGames.length) * 0.7,
        });

        setIsAnalyzing(false);
    };

    const openDeal = (dealID: string) => {
        window.ipcRenderer.invoke('system:openExternal', `https://www.cheapshark.com/redirect?dealID=${dealID}`);
    };

    if (isLoading && activeTab === 'deals') {
        return (
            <div className="glass-panel flex-1 h-full flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const heroDeal = featuredDeals[0];

    return (
        <div className="glass-panel flex-1 h-full overflow-y-auto custom-scrollbar p-6 space-y-6 relative">
            {/* Tab Bar */}
            <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md py-2 -mx-6 px-6 border-b border-white/5 flex items-center gap-4">
                <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                    <button
                        onClick={() => setActiveTab('deals')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'deals' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <ShoppingCart size={14} className="inline mr-2" />Deals
                    </button>
                    <button
                        onClick={() => setActiveTab('bundles')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'bundles' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Package size={14} className="inline mr-2" />Bundle Analyzer
                    </button>
                </div>

                {activeTab === 'deals' && (
                    <div className="relative flex-1 max-w-md ml-auto">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for games..." 
                            className="w-full bg-slate-800 border border-white/10 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                )}
                {activeTab === 'deals' && <div className="text-xs text-gray-500">Powered by CheapShark</div>}
            </div>

            {activeTab === 'deals' ? (
                <>
                    {searchQuery.length > 2 ? (
                        <StoreSection title={`Search Results for "${searchQuery}"`} deals={searchResults} onDealClick={openDeal} icon={<Search className="text-white" />} />
                    ) : (
                        <>
                            {heroDeal && (
                                <div className="relative h-96 rounded-2xl overflow-hidden group cursor-pointer shadow-2xl border border-white/10" onClick={() => openDeal(heroDeal.dealID)}>
                                    <img 
                                        src={heroDeal.steamAppID ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${heroDeal.steamAppID}/header.jpg` : heroDeal.thumb} 
                                        alt={heroDeal.title} 
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                                    <div className="absolute bottom-0 left-0 p-8 space-y-4 w-full">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <h1 className="text-4xl md:text-5xl font-black text-white mb-2 drop-shadow-lg tracking-tight">{heroDeal.title}</h1>
                                                {heroDeal.metacriticScore && (
                                                    <div className="inline-flex items-center px-2 py-1 rounded bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-bold mb-2">
                                                        Metacritic: {heroDeal.metacriticScore}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-gray-400 line-through text-lg">${heroDeal.retailPrice}</div>
                                                <div className="text-4xl font-bold text-white">${heroDeal.price}</div>
                                                <div className="text-green-400 font-bold">Save {Math.round(parseFloat(heroDeal.savings))}%</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 pt-4">
                                            <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/25">
                                                <ShoppingCart size={20} />Get Deal
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <StoreSection title="Special Offers" icon={<Tag className="text-green-400" />} deals={trendingDeals} onDealClick={openDeal} />
                            <StoreSection title="Top Rated" icon={<Star className="text-yellow-400" />} deals={topRatedDeals} onDealClick={openDeal} />
                        </>
                    )}
                </>
            ) : (
                <BundleAnalyzerTab
                    bundleName={bundleName}
                    setBundleName={setBundleName}
                    bundlePrice={bundlePrice}
                    setBundlePrice={setBundlePrice}
                    bundleSearchQuery={bundleSearchQuery}
                    setBundleSearchQuery={setBundleSearchQuery}
                    bundleSearchResults={bundleSearchResults}
                    bundleGames={bundleGames}
                    addGameToBundle={addGameToBundle}
                    toggleOwned={toggleOwned}
                    removeFromBundle={removeFromBundle}
                    analyzeBundle={analyzeBundle}
                    bundleAnalysis={bundleAnalysis}
                    isAnalyzing={isAnalyzing}
                />
            )}
        </div>
    );
};

const BundleAnalyzerTab: React.FC<{
    bundleName: string; setBundleName: (v: string) => void;
    bundlePrice: string; setBundlePrice: (v: string) => void;
    bundleSearchQuery: string; setBundleSearchQuery: (v: string) => void;
    bundleSearchResults: Deal[];
    bundleGames: BundleGame[];
    addGameToBundle: (deal: Deal) => void;
    toggleOwned: (i: number) => void;
    removeFromBundle: (i: number) => void;
    analyzeBundle: () => void;
    bundleAnalysis: BundleAnalysis | null;
    isAnalyzing: boolean;
}> = ({ bundleName, setBundleName, bundlePrice, setBundlePrice, bundleSearchQuery, setBundleSearchQuery, bundleSearchResults, bundleGames, addGameToBundle, toggleOwned, removeFromBundle, analyzeBundle, bundleAnalysis, isAnalyzing }) => (
    <div className="space-y-6 mt-4">
        <div>
            <h2 className="text-2xl font-black text-white mb-1">Bundle Analyzer</h2>
            <p className="text-gray-400 text-sm">Check if a bundle is worth it by marking games you already own</p>
        </div>

        {/* Bundle setup */}
        <div className="glass-frosted rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Bundle Name</label>
                    <input value={bundleName} onChange={(e) => setBundleName(e.target.value)}
                        placeholder="e.g. Humble Choice May 2026"
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Bundle Price ($)</label>
                    <input type="number" step="0.01" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)}
                        placeholder="11.99"
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                </div>
            </div>

            {/* Search to add games */}
            <div className="relative">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Add games to bundle</label>
                <Search className="absolute left-3 top-[38px] text-gray-400" size={16} />
                <input value={bundleSearchQuery} onChange={(e) => setBundleSearchQuery(e.target.value)}
                    placeholder="Search games to add..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                {bundleSearchResults.length > 0 && (
                    <div className="absolute z-30 mt-1 w-full bg-slate-800 border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                        {bundleSearchResults.map(deal => (
                            <button key={deal.dealID} onClick={() => addGameToBundle(deal)}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition text-left">
                                <img src={deal.thumb} alt="" className="w-10 h-6 object-cover rounded" />
                                <span className="text-sm text-white flex-1 truncate">{deal.title}</span>
                                <span className="text-xs text-gray-400">${deal.retailPrice}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Games list */}
        {bundleGames.length > 0 && (
            <div className="glass-frosted rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white">Games in Bundle ({bundleGames.length})</h3>
                    <span className="text-xs text-gray-400">Click the check to mark as owned</span>
                </div>
                {bundleGames.map((game, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition ${game.owned ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                        <button onClick={() => toggleOwned(i)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${game.owned ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                            <CheckCircle size={18} />
                        </button>
                        {game.thumb && <img src={game.thumb} alt="" className="w-12 h-7 object-cover rounded" />}
                        <span className={`flex-1 text-sm font-medium ${game.owned ? 'text-yellow-300 line-through' : 'text-white'}`}>{game.title}</span>
                        <span className="text-xs text-gray-400">${game.retailPrice}</span>
                        {game.owned && <span className="text-[10px] font-bold uppercase text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">Owned</span>}
                        <button onClick={() => removeFromBundle(i)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                    </div>
                ))}
                <button onClick={analyzeBundle} disabled={isAnalyzing || !bundlePrice}
                    className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold transition disabled:opacity-50">
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Bundle Value'}
                </button>
            </div>
        )}

        {/* Analysis Results */}
        {bundleAnalysis && (
            <div className="glass-frosted rounded-2xl p-6 space-y-4 border border-white/10">
                <div className="flex items-center gap-3">
                    {bundleAnalysis.worthIt ? (
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="text-green-400" size={24} />
                        </div>
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <AlertCircle className="text-orange-400" size={24} />
                        </div>
                    )}
                    <div>
                        <h3 className="text-xl font-black text-white">{bundleAnalysis.bundleName}</h3>
                        <p className={`text-sm font-bold ${bundleAnalysis.worthIt ? 'text-green-400' : 'text-orange-400'}`}>
                            {bundleAnalysis.worthIt ? 'Good value!' : 'May not be worth it'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatBox label="Bundle Price" value={`$${bundleAnalysis.totalPrice}`} />
                    <StatBox label="Games You Own" value={`${bundleAnalysis.gamesOwned.length}`} color="text-yellow-400" />
                    <StatBox label="New Games" value={`${bundleAnalysis.gamesNew.length}`} color="text-green-400" />
                    <StatBox label="Effective $/Game" value={`$${bundleAnalysis.effectivePricePerNew}`} color="text-blue-400" />
                </div>

                <div className="bg-white/[0.03] rounded-xl p-4">
                    <div className="text-xs uppercase font-bold text-gray-400 mb-2">Overall Savings vs Retail</div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                                style={{ width: `${Math.min(100, parseFloat(bundleAnalysis.savings))}%` }} />
                        </div>
                        <span className="text-green-400 font-bold text-sm">{bundleAnalysis.savings}%</span>
                    </div>
                </div>

                {bundleAnalysis.gamesNew.length > 0 && (
                    <div>
                        <div className="text-xs uppercase font-bold text-gray-400 mb-2">New games you'd get</div>
                        <div className="flex flex-wrap gap-2">
                            {bundleAnalysis.gamesNew.map((g, i) => (
                                <span key={i} className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-300 font-medium">{g.title}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
);

const StatBox: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-white' }) => (
    <div className="bg-white/[0.03] rounded-xl p-3 text-center">
        <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{label}</div>
        <div className={`text-lg font-black ${color}`}>{value}</div>
    </div>
);

const StoreSection = ({ title, icon, deals, onDealClick }: { title: string, icon: React.ReactNode, deals: Deal[], onDealClick: (id: string) => void }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
            {icon}
            <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {deals.map((deal) => (
                <div key={deal.dealID} onClick={() => onDealClick(deal.dealID)} className="bg-slate-800/50 rounded-xl overflow-hidden hover:bg-slate-700/50 transition-all cursor-pointer group border border-white/5 hover:border-white/10 hover:-translate-y-1 shadow-lg">
                    <div className="aspect-video relative">
                         <img 
                            src={deal.steamAppID ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${deal.steamAppID}/header.jpg` : deal.thumb} 
                            alt={deal.title} 
                            className="w-full h-full object-cover" 
                            loading="lazy"
                        />
                         {parseFloat(deal.savings) > 0 && (
                            <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
                                -{Math.round(parseFloat(deal.savings))}%
                            </div>
                         )}
                    </div>
                    <div className="p-3">
                        <h3 className="text-white font-bold truncate group-hover:text-blue-400 transition-colors" title={deal.title}>{deal.title}</h3>
                        <div className="flex justify-between items-center mt-2">
                            {deal.steamRatingPercent ? (
                                <span className={`text-xs ${parseInt(deal.steamRatingPercent) > 70 ? 'text-blue-400' : 'text-gray-400'}`}>
                                    {deal.steamRatingPercent}% Positive
                                </span>
                            ) : <span className="text-xs text-gray-500">Deal Rating: {deal.dealRating}</span>}
                            
                            <div className="text-right">
                                <span className="text-xs text-gray-500 line-through mr-2">${deal.retailPrice}</span>
                                <span className="text-sm font-bold text-white">${deal.price}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default Store;
