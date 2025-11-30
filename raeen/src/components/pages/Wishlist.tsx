import React, { useState, useEffect } from 'react';
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
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [newItemUrl, setNewItemUrl] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('raeen_wishlist');
        if (saved) {
            setItems(JSON.parse(saved));
        } else {
            setItems(MOCK_WISHLIST);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('raeen_wishlist', JSON.stringify(items));
    }, [items]);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemUrl) return;

        // Basic parser for Steam URLs to extract ID/Name
        let title = 'Unknown Game';
        let cover = '';
        
        try {
            const url = new URL(newItemUrl);
            if (url.hostname.includes('steampowered.com')) {
                // Path usually /app/123456/Name_Of_Game
                const parts = url.pathname.split('/');
                const appId = parts[2]; // index 2 is id
                const namePart = parts[3]; // index 3 is name
                if (namePart) title = namePart.replace(/_/g, ' ');
                if (appId) cover = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
            }
        } catch (err) {
            console.error("Invalid URL", err);
        }

        const newItem: WishlistItem = {
            id: Date.now().toString(),
            title: title,
            cover: cover,
            currentPrice: 0,
            lowestPrice: 0,
            storeUrl: newItemUrl,
            platform: newItemUrl.includes('epic') ? 'Epic' : 'Steam'
        };

        setItems([...items, newItem]);
        setNewItemUrl('');
    };

    const handleDeleteItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
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
                    <div key={item.id} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group relative">
                         <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                        >
                            <TrendingDown size={14} className="rotate-45" /> {/* Using TrendingDown as X icon alternative or Import X */}
                        </button>
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
                                <div className="flex justify-between items-start pr-6">
                                    <h3 className="text-xl font-bold text-white leading-tight mb-1 line-clamp-2">{item.title}</h3>
                                </div>
                                <span className="text-xs font-bold text-gray-500 bg-black/20 px-2 py-1 rounded uppercase">{item.platform}</span>
                                <p className="text-sm text-gray-400 mb-4 mt-2">{item.releaseDate ? `Release: ${item.releaseDate}` : 'Available Now'}</p>
                            </div>

                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 font-bold uppercase mb-1">Current Price</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-white">
                                            {item.currentPrice === 0 ? 'Free' : `$${item.currentPrice}`}
                                        </span>
                                        {item.currentPrice < item.lowestPrice && item.currentPrice > 0 && (
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
