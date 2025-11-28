import React, { useState } from 'react';
import { Plus, ShoppingCart, ExternalLink, TrendingDown } from 'lucide-react';
import { CachedImage } from '../CachedImage';

interface WishlistItem {
    id: string;
    title: string;
    cover?: string;
    currentPrice: number;
    lowestPrice: number;
    storeUrl: string;
    platform: 'Steam' | 'Epic' | 'GOG';
    releaseDate?: string;
}

// Mock data for now
const MOCK_WISHLIST: WishlistItem[] = [
    {
        id: '1',
        title: 'Hollow Knight: Silksong',
        cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1030300/header.jpg',
        currentPrice: 0,
        lowestPrice: 0,
        storeUrl: 'https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/',
        platform: 'Steam',
        releaseDate: 'TBA'
    },
    {
        id: '2',
        title: 'Hades II',
        cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145350/header.jpg',
        currentPrice: 29.99,
        lowestPrice: 29.99,
        storeUrl: 'https://store.steampowered.com/app/1145350/Hades_II/',
        platform: 'Steam'
    }
];

const Wishlist: React.FC = () => {
    const [items] = useState<WishlistItem[]>(MOCK_WISHLIST);
    const [newItemUrl, setNewItemUrl] = useState('');

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement scraping/fetching logic
        alert('Auto-fetch not implemented yet. This is a UI demo.');
        setNewItemUrl('');
    };

    return (
        <div className="flex flex-col h-full overflow-hidden p-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md mb-2">
                        WISHLIST
                    </h1>
                    <p className="text-gray-400 font-medium">Track prices and upcoming releases</p>
                </div>

                <form onSubmit={handleAddItem} className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Paste Steam/Epic URL..."
                        value={newItemUrl}
                        onChange={(e) => setNewItemUrl(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/30 w-64"
                    />
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        <Plus size={20} /> Add
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pb-20">
                {items.map(item => (
                    <div key={item.id} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                        {/* Cover */}
                        <div className="w-32 aspect-[2/3] rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                            {item.cover ? (
                                <CachedImage src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingCart className="text-white/20" />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold text-white leading-tight mb-1">{item.title}</h3>
                                    <span className="text-xs font-bold text-gray-500 bg-black/20 px-2 py-1 rounded uppercase">{item.platform}</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">{item.releaseDate ? `Release: ${item.releaseDate}` : 'Available Now'}</p>
                            </div>

                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 font-bold uppercase mb-1">Current Price</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-white">
                                            {item.currentPrice === 0 ? 'Free' : `$${item.currentPrice}`}
                                        </span>
                                        {item.currentPrice < item.lowestPrice && (
                                            <span className="flex items-center text-xs font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                                                <TrendingDown size={12} className="mr-1" />
                                                LOWEST
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <a
                                    href={item.storeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-3 bg-white/10 text-white rounded-xl hover:bg-white hover:text-black transition-colors"
                                >
                                    <ExternalLink size={20} />
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Wishlist;
