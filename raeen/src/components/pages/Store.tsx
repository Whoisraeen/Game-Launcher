import React from 'react';
import { Star, TrendingUp, Tag, ShoppingCart } from 'lucide-react';

const Store: React.FC = () => {
    return (
        <div className="glass-panel flex-1 h-full overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* Featured Hero */}
            <div className="relative h-96 rounded-2xl overflow-hidden group cursor-pointer">
                <img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg" alt="Elden Ring" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 space-y-4">
                    <h1 className="text-5xl font-bold text-white mb-2">ELDEN RING</h1>
                    <p className="text-gray-300 max-w-xl text-lg shadow-black drop-shadow-md">The Golden Order has been broken. Rise, Tarnished, and be guided by grace to brandish the Elden Ring and become the Elden Lord.</p>
                    <div className="flex items-center gap-4 pt-4">
                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all">
                            <ShoppingCart size={20} />
                            $59.99
                        </button>
                        <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-lg font-medium transition-all">
                            Add to Wishlist
                        </button>
                    </div>
                </div>
            </div>

            {/* Sections */}
            <StoreSection title="New & Trending" icon={<TrendingUp className="text-blue-400" />} />
            <StoreSection title="Special Offers" icon={<Tag className="text-green-400" />} />
            <StoreSection title="Top Rated" icon={<Star className="text-yellow-400" />} />
        </div>
    );
};

const StoreSection = ({ title, icon }: { title: string, icon: React.ReactNode }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
            {icon}
            <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl overflow-hidden hover:bg-slate-700/50 transition-all cursor-pointer group">
                    <div className="aspect-video relative">
                         <img src={`https://picsum.photos/seed/${title}${i}/400/225`} alt="Game" className="w-full h-full object-cover" />
                         <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white">
                            -20%
                         </div>
                    </div>
                    <div className="p-3">
                        <h3 className="text-white font-bold truncate group-hover:text-blue-400 transition-colors">Game Title {i}</h3>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-400">Action RPG</span>
                            <span className="text-sm font-bold text-green-400">$29.99</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default Store;