import React, { useState, useEffect } from 'react';
import { Star, Plus, Trash2, Edit3, Clock, Smile, X } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { Game } from '../../types';

interface GameReview {
    id: string;
    gameId: string;
    gameTitle: string;
    gameCover?: string;
    title: string;
    content: string;
    rating: number;
    sessionHours?: number;
    mood?: string;
    createdAt: number;
    updatedAt: number;
}

const MOODS = ['Relaxed', 'Excited', 'Frustrated', 'Immersed', 'Bored', 'Thrilled', 'Competitive', 'Nostalgic'];

const Reviews: React.FC = () => {
    const { games } = useGameStore();
    const [reviews, setReviews] = useState<GameReview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingReview, setEditingReview] = useState<GameReview | null>(null);
    const [filterGame, setFilterGame] = useState<string | null>(null);

    const loadReviews = async () => {
        try {
            const result = await window.ipcRenderer.invoke('reviews:getAll', filterGame || undefined);
            setReviews(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error('Failed to load reviews:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReviews();
    }, [filterGame]);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this review?')) return;
        await window.ipcRenderer.invoke('reviews:delete', id);
        setReviews(prev => prev.filter(r => r.id !== id));
    };

    const handleSave = async (review: GameReview) => {
        setReviews(prev => {
            const exists = prev.find(r => r.id === review.id);
            if (exists) return prev.map(r => r.id === review.id ? review : r);
            return [review, ...prev];
        });
    };

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden p-6 gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-md">REVIEWS & NOTES</h1>
                    <p className="text-gray-400 text-sm mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''} written</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Game Filter */}
                    <select
                        value={filterGame || ''}
                        onChange={(e) => setFilterGame(e.target.value || null)}
                        className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none cursor-pointer"
                    >
                        <option value="">All Games</option>
                        {games.filter(g => !g.isHidden).map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => { setEditingReview(null); setShowAddModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        <Plus size={18} /> Write Review
                    </button>
                </div>
            </div>

            {/* Reviews List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-pulse text-gray-500">Loading reviews...</div>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <Star size={48} className="mb-4 opacity-30" />
                        <p className="text-lg font-medium">No reviews yet</p>
                        <p className="text-sm mt-1">Write your first game review or session notes</p>
                        <button
                            onClick={() => { setEditingReview(null); setShowAddModal(true); }}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
                        >
                            Write a Review
                        </button>
                    </div>
                ) : (
                    reviews.map(review => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            onEdit={() => { setEditingReview(review); setShowAddModal(true); }}
                            onDelete={() => handleDelete(review.id)}
                        />
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <ReviewModal
                    games={games}
                    review={editingReview}
                    onClose={() => { setShowAddModal(false); setEditingReview(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

const ReviewCard: React.FC<{ review: GameReview; onEdit: () => void; onDelete: () => void }> = ({ review, onEdit, onDelete }) => {
    return (
        <div className="glass-card p-5 group hover:border-white/20 transition-all">
            <div className="flex gap-4">
                {/* Game Cover */}
                {review.gameCover && (
                    <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                        <img src={review.gameCover} alt={review.gameTitle} className="w-full h-full object-cover" />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white">{review.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-blue-400 font-medium">{review.gameTitle}</span>
                                <RatingStars rating={review.rating} size={14} />
                                {review.mood && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                                        {review.mood}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={onEdit} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                <Edit3 size={14} />
                            </button>
                            <button onClick={onDelete} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    <p className="text-sm text-gray-300 mt-3 leading-relaxed whitespace-pre-wrap line-clamp-4">{review.content}</p>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        {review.sessionHours && (
                            <span className="flex items-center gap-1">
                                <Clock size={12} /> {review.sessionHours}h played
                            </span>
                        )}
                        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RatingStars: React.FC<{ rating: number; size?: number; interactive?: boolean; onChange?: (r: number) => void }> = ({ rating, size = 16, interactive = false, onChange }) => {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    onClick={() => onChange?.(star)}
                    className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
                >
                    <Star
                        size={size}
                        className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                    />
                </button>
            ))}
        </div>
    );
};

const ReviewModal: React.FC<{
    games: Game[];
    review: GameReview | null;
    onClose: () => void;
    onSave: (review: GameReview) => void;
}> = ({ games, review, onClose, onSave }) => {
    const [gameId, setGameId] = useState(review?.gameId || '');
    const [title, setTitle] = useState(review?.title || '');
    const [content, setContent] = useState(review?.content || '');
    const [rating, setRating] = useState(review?.rating || 0);
    const [sessionHours, setSessionHours] = useState(review?.sessionHours?.toString() || '');
    const [mood, setMood] = useState(review?.mood || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gameId || !title.trim() || !content.trim()) return;

        setIsSaving(true);
        try {
            let result: GameReview;
            if (review) {
                await window.ipcRenderer.invoke('reviews:update', review.id, { title, content, rating, mood: mood || undefined });
                result = { ...review, title, content, rating, mood: mood || undefined, updatedAt: Date.now() };
            } else {
                result = await window.ipcRenderer.invoke('reviews:add', {
                    gameId,
                    title,
                    content,
                    rating,
                    sessionHours: sessionHours ? parseFloat(sessionHours) : undefined,
                    mood: mood || undefined,
                });
            }
            onSave(result);
            onClose();
        } catch (error) {
            console.error('Failed to save review:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">{review ? 'Edit Review' : 'Write Review'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Game Selector */}
                    {!review && (
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-1">Game</label>
                            <select
                                value={gameId}
                                onChange={(e) => setGameId(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                                required
                            >
                                <option value="">Select a game...</option>
                                {games.filter(g => !g.isHidden).map(g => (
                                    <option key={g.id} value={g.id}>{g.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. 'Amazing story, weak combat' or 'Session #3 notes'"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                            required
                        />
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Rating</label>
                        <RatingStars rating={rating} size={24} interactive onChange={setRating} />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-1">Review / Notes</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your thoughts, session notes, or review..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 h-40 resize-none"
                            required
                        />
                    </div>

                    {/* Session Hours + Mood */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-1 flex items-center gap-1">
                                <Clock size={14} /> Session Hours
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={sessionHours}
                                onChange={(e) => setSessionHours(e.target.value)}
                                placeholder="e.g. 2.5"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-1 flex items-center gap-1">
                                <Smile size={14} /> Mood
                            </label>
                            <select
                                value={mood}
                                onChange={(e) => setMood(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                            >
                                <option value="">Select mood...</option>
                                {MOODS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !gameId || !title.trim() || !content.trim()}
                            className="flex-1 px-4 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : review ? 'Update' : 'Post Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Reviews;
