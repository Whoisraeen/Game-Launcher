import React, { useEffect, useState } from 'react';
import { Star, TrendingUp, Tag, ShoppingCart, Search, ExternalLink } from 'lucide-react';

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

const Store: React.FC = () => {
    const [featuredDeals, setFeaturedDeals] = useState<Deal[]>([]);
    const [trendingDeals, setTrendingDeals] = useState<Deal[]>([]);
    const [topRatedDeals, setTopRatedDeals] = useState<Deal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Deal[]>([]);

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

    const loadDeals = async () => {
        setIsLoading(true);
        try {
            // Parallel fetching for different sections
            const [featured, trending, topRated] = await Promise.all([
                window.ipcRenderer.invoke('store:getDeals', { pageSize: 5, sortBy: 'Savings', lowerPrice: 10 }), // High savings on paid games
                window.ipcRenderer.invoke('store:getDeals', { pageSize: 8, sortBy: 'Recent' }), // Actually 'Recent' isn't valid sort in CheapShark, use 'Release'? 'Deal Rating'?
                // Valid sorts: Savings, Price, Title, Metacritic, Reviews, Release, Store, Deal Rating
                // Let's use 'Deal Rating' for Featured/Trending and 'Metacritic' for Top Rated
                window.ipcRenderer.invoke('store:getDeals', { pageSize: 8, sortBy: 'Metacritic', desc: 1 })
            ]);

            // For featured hero, let's pick the best rated deal with an image
            const heroCandidates = await window.ipcRenderer.invoke('store:getDeals', { pageSize: 5, sortBy: 'Deal Rating', lowerPrice: 20 });
            
            setFeaturedDeals(heroCandidates);
            setTrendingDeals(featured); // "Special Offers" (High Savings)
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

    const openDeal = (dealID: string) => {
        window.ipcRenderer.invoke('system:openExternal', `https://www.cheapshark.com/redirect?dealID=${dealID}`);
    };

    if (isLoading) {
        return (
            <div className="glass-panel flex-1 h-full flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const heroDeal = featuredDeals[0];

    return (
        <div className="glass-panel flex-1 h-full overflow-y-auto custom-scrollbar p-6 space-y-8 relative">
             {/* Search Bar */}
             <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md py-2 -mx-6 px-6 mb-4 border-b border-white/5 flex justify-between items-center">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for games..." 
                        className="w-full bg-slate-800 border border-white/10 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="text-xs text-gray-500">Powered by CheapShark</div>
            </div>

            {searchQuery.length > 2 ? (
                <StoreSection title={`Search Results for "${searchQuery}"`} deals={searchResults} onDealClick={openDeal} icon={<Search className="text-white" />} />
            ) : (
                <>
                    {/* Featured Hero */}
                    {heroDeal && (
                        <div className="relative h-96 rounded-2xl overflow-hidden group cursor-pointer shadow-2xl border border-white/10" onClick={() => openDeal(heroDeal.dealID)}>
                            {/* Use high-res image if available, else thumb. CheapShark thumbs are small, but sometimes we can guess Steam header. */}
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
                                        <ShoppingCart size={20} />
                                        Get Deal
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sections */}
                    <StoreSection title="Special Offers" icon={<Tag className="text-green-400" />} deals={trendingDeals} onDealClick={openDeal} />
                    <StoreSection title="Top Rated" icon={<Star className="text-yellow-400" />} deals={topRatedDeals} onDealClick={openDeal} />
                </>
            )}
        </div>
    );
};

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