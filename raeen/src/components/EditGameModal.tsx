import React, { useState } from 'react';
import { X, Save, Image as ImageIcon, Folder, Star, EyeOff } from 'lucide-react';
import { Game } from '../types';
import { useGameStore } from '../stores/gameStore';

interface EditGameModalProps {
    game: Game;
    onClose: () => void;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({ game, onClose }) => {
    const [formData, setFormData] = useState<Partial<Game>>({ ...game });
    const [activeTab, setActiveTab] = useState<'general' | 'media' | 'advanced'>('general');
    // Actually, we need a generic updateGame action in the store. I'll add it later.
    // For now, let's just simulate it or use the specific ones we added.

    // Wait, I didn't add a generic updateGame action to the store. 
    // I should probably add one to the store to handle all these updates in one go.
    // But for now, I'll just use the existing specific actions for the parts that are supported
    // and maybe add a generic one if needed.

    // Actually, looking at the requirements, "Edit..." opens a dialog to edit EVERYTHING.
    // So I really should have a `updateGame(gameId, updates)` action.
    // I'll add that to the store in the next step.

    const handleChange = (field: keyof Game, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            await useGameStore.getState().updateGameDetails(game.id, formData);
            onClose();
        } catch (error) {
            console.error('Failed to update game details:', error);
            // Optionally show error to user
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1b26] w-full max-w-4xl max-h-[90vh] rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-blue-400">Edit Game</span>
                        <span className="text-gray-500">/</span>
                        <span>{game.title}</span>
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 px-4">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('media')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'media' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        Media
                    </button>
                    <button
                        onClick={() => setActiveTab('advanced')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'advanced' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        Advanced
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Title</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Sort Title</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''} // Placeholder for sort title if we had it
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Description</label>
                                <textarea
                                    value={formData.userNotes || ''} // Using userNotes as description for now or we need a real description field
                                    onChange={(e) => handleChange('userNotes', e.target.value)}
                                    rows={5}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
                                    placeholder="Add your notes here..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Genre</label>
                                    <input
                                        type="text"
                                        value={formData.genre || ''}
                                        onChange={(e) => handleChange('genre', e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Developer</label>
                                    <input
                                        type="text"
                                        value="Unknown" // Placeholder
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Tags</label>
                                <div className="flex flex-wrap gap-2 p-2 bg-black/20 border border-white/10 rounded-lg min-h-[42px]">
                                    {formData.tags?.map((tag, i) => (
                                        <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs flex items-center gap-1">
                                            {tag}
                                            <button
                                                onClick={() => handleChange('tags', formData.tags?.filter(t => t !== tag))}
                                                className="hover:text-white"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder="Add tag..."
                                        className="bg-transparent text-sm text-white focus:outline-none min-w-[80px]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value.trim();
                                                if (val && !formData.tags?.includes(val)) {
                                                    handleChange('tags', [...(formData.tags || []), val]);
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Cover Image</label>
                                    <div className="aspect-[2/3] bg-black/20 border border-white/10 rounded-lg overflow-hidden relative group">
                                        {formData.cover ? (
                                            <img src={formData.cover} alt="Cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                <ImageIcon size={32} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm">Change</button>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.cover || ''}
                                        onChange={(e) => handleChange('cover', e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:border-blue-500 focus:outline-none"
                                        placeholder="URL..."
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium text-gray-400">Background Image</label>
                                    <div className="aspect-video bg-black/20 border border-white/10 rounded-lg overflow-hidden relative group">
                                        {formData.heroImage ? (
                                            <img src={formData.heroImage} alt="Background" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                <ImageIcon size={32} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm">Change</button>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.heroImage || ''}
                                        onChange={(e) => handleChange('heroImage', e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:border-blue-500 focus:outline-none"
                                        placeholder="URL..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-16 bg-black/20 border border-white/10 rounded-lg overflow-hidden relative group flex items-center justify-center">
                                        {formData.logo ? (
                                            <img src={formData.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <ImageIcon size={20} className="text-gray-600" />
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.logo || ''}
                                        onChange={(e) => handleChange('logo', e.target.value)}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        placeholder="Logo URL..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'advanced' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Installation Path</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.installPath || ''}
                                        onChange={(e) => handleChange('installPath', e.target.value)}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none font-mono text-sm"
                                    />
                                    <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white">
                                        <Folder size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Executable</label>
                                <input
                                    type="text"
                                    value={formData.executable || ''}
                                    onChange={(e) => handleChange('executable', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Launch Arguments</label>
                                <input
                                    type="text"
                                    value={formData.launchOptions || ''}
                                    onChange={(e) => handleChange('launchOptions', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none font-mono text-sm"
                                    placeholder="e.g. -novid -console"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Star size={20} className={formData.isFavorite ? "text-yellow-400" : "text-gray-500"} />
                                        <span className="font-medium text-gray-200">Favorite</span>
                                    </div>
                                    <button
                                        onClick={() => handleChange('isFavorite', !formData.isFavorite)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${formData.isFavorite ? 'bg-blue-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isFavorite ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <EyeOff size={20} className={formData.isHidden ? "text-red-400" : "text-gray-500"} />
                                        <span className="font-medium text-gray-200">Hidden</span>
                                    </div>
                                    <button
                                        onClick={() => handleChange('isHidden', !formData.isHidden)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${formData.isHidden ? 'bg-blue-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isHidden ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
