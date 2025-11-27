import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
    return (
        <div className="h-screen w-screen bg-slate-900 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-slate-800 border border-red-500/20 rounded-2xl p-8 shadow-2xl text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                    <AlertTriangle size={32} />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                <p className="text-gray-400 mb-6 text-sm">
                    The application encountered an unexpected error.
                </p>

                <div className="bg-slate-950 rounded-lg p-4 mb-6 text-left overflow-auto max-h-48 custom-scrollbar border border-white/5">
                    <code className="text-xs text-red-400 font-mono break-all">
                        {error.message}
                    </code>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Reload App
                    </button>
                    <button
                        onClick={resetErrorBoundary}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={16} /> Try Again
                    </button>
                </div>
            </div>
        </div>
    );
};
