import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, X, FileText } from 'lucide-react';

interface INIEditorProps {
    filePath: string;
    onClose: () => void;
}

const INIEditor: React.FC<INIEditorProps> = ({ filePath, onClose }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadFile();
    }, [filePath]);

    const loadFile = async () => {
        setIsLoading(true);
        try {
            // Use existing read_file IPC or similar? 
            // We don't have a direct "read arbitrary text file" IPC for security, typically.
            // But for a local app, we likely have one or can add one.
            // Let's assume we add 'fs:readFile' IPC or reuse 'manual:scan' logic? No.
            // We'll need to add an IPC handler for this component.
            const text = await window.ipcRenderer.invoke('fs:readText', filePath);
            setContent(text);
        } catch (e) {
            console.error('Failed to read file', e);
            setContent('Error loading file.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await window.ipcRenderer.invoke('fs:writeText', filePath, content);
            alert('File saved successfully!');
        } catch (e) {
            alert('Failed to save file.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
            <div className="w-full max-w-4xl h-[85vh] bg-slate-900 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <FileText className="text-blue-400" />
                        <div>
                            <h2 className="font-bold text-white">Config Editor</h2>
                            <p className="text-xs text-gray-400 font-mono">{filePath}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                        >
                            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            Save
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">Loading...</div>
                    ) : (
                        <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 focus:outline-none resize-none"
                            spellCheck={false}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default INIEditor;
