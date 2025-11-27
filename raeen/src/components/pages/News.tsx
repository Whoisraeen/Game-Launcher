import React, { useEffect } from 'react';
import { Clock, Tag, ExternalLink, RefreshCw } from 'lucide-react';
import { useNewsStore, NewsItem } from '../../stores/newsStore';

const News: React.FC = () => {
    const { news, globalNews, loadNews, loadGlobalNews, isLoading } = useNewsStore();
    const [activeTab, setActiveTab] = React.useState<'library' | 'global'>('library');

    useEffect(() => {
        if (activeTab === 'library' && news.length === 0) loadNews();
        if (activeTab === 'global' && globalNews.length === 0) loadGlobalNews();
    }, [activeTab, loadNews, loadGlobalNews, news.length, globalNews.length]);

    // Format timestamp to relative time (e.g. "2 hours ago")
    const formatTime = (timestamp: number) => {
        const seconds = Math.floor((Date.now() / 1000) - timestamp);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    };

    // Strip HTML tags for preview
    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const displayedNews = activeTab === 'library' ? news : globalNews;

    return (
        <div className="glass-panel flex-1 h-full overflow-y-auto custom-scrollbar p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-6">
                    <h1 className="text-3xl font-bold text-white">News & Updates</h1>
                    <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => setActiveTab('library')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'library' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            Library
                        </button>
                        <button
                            onClick={() => setActiveTab('global')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'global' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            Global
                        </button>
                    </div>
                </div>
                <button 
                    onClick={() => activeTab === 'library' ? loadNews() : loadGlobalNews()}
                    className={`p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors ${isLoading ? 'animate-spin' : ''}`}
                    title="Refresh News"
                >
                    <RefreshCw size={20} className="text-blue-400" />
                </button>
            </div>
            
            {isLoading && displayedNews.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
            ) : displayedNews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedNews.map((item, index) => (
                        <NewsCard 
                            key={item.gid}
                            item={item}
                            timeAgo={formatTime(item.date)}
                            preview={stripHtml(item.contents)}
                            large={index === 0} // First item is large
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-20">
                    <p className="text-xl">No news found.</p>
                    <p className="text-sm mt-2">{activeTab === 'library' ? 'Try adding some Steam games to your library!' : 'Unable to fetch global news.'}</p>
                </div>
            )}
        </div>
    );
};

const NewsCard = ({ item, timeAgo, preview, large }: { item: NewsItem, timeAgo: string, preview: string, large?: boolean }) => {
    // Extract image from content if possible, or use game icon/default
    const extractImage = (content: string) => {
        const match = content.match(/<img[^>]+src="([^">]+)"/);
        return match ? match[1] : null;
    };
    
    const image = extractImage(item.contents) || 
                  (item.appId && item.appId !== '0' ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appId}/header.jpg` : null);

    return (
        <div className={`group bg-slate-800/50 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 flex flex-col ${large ? 'md:col-span-2 md:row-span-2' : ''}`}>
            {image && (
                <div className={`relative ${large ? 'h-64' : 'h-40'} overflow-hidden shrink-0`}>
                    <img src={image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-blue-400 uppercase tracking-wider border border-white/10 flex items-center gap-1">
                        <Tag size={10} />
                        {item.feedlabel || item.feedname || 'News'}
                    </div>
                </div>
            )}
            <div className="p-5 space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>{timeAgo}</span>
                    </div>
                    {item.gameTitle && <span className="text-blue-400 font-medium truncate max-w-[120px]">{item.gameTitle}</span>}
                </div>
                <h3 className={`font-bold text-white group-hover:text-blue-400 transition-colors ${large ? 'text-2xl' : 'text-lg'}`}>{item.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-3 flex-1">{preview}</p>
                
                <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider"
                >
                    Read Full Story <ExternalLink size={12} />
                </a>
            </div>
        </div>
    );
};

export default News;
