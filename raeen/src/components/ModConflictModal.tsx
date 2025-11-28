import React from 'react';
import { AlertTriangle, X, FileWarning } from 'lucide-react';

interface ModConflictModalProps {
    conflicts: { file: string, modIds: string[] }[];
    mods: any[]; // List of all mods to map IDs to names
    onClose: () => void;
}

const ModConflictModal: React.FC<ModConflictModalProps> = ({ conflicts, mods, onClose }) => {
    const getModName = (id: string) => mods.find(m => m.id === id)?.name || 'Unknown Mod';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-slate-900 border border-red-500/30 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Mod Conflicts Detected</h2>
                            <p className="text-sm text-red-200/70">{conflicts.length} files have conflicting overrides.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    <p className="text-sm text-gray-400 mb-4">
                        The following files are present in multiple enabled mods. The game will likely use the file from the mod loaded <b>last</b> (or behavior is undefined). Consider disabling conflicting mods or resolving manually.
                    </p>

                    {conflicts.map((conflict, idx) => (
                        <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-sm font-mono text-yellow-400 mb-3 pb-2 border-b border-white/5">
                                <FileWarning size={14} />
                                {conflict.file}
                            </div>
                            <div className="space-y-2">
                                {conflict.modIds.map(modId => (
                                    <div key={modId} className="flex items-center gap-2 text-sm text-gray-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                                        {getModName(modId)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-white/10 bg-slate-900/50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModConflictModal;
