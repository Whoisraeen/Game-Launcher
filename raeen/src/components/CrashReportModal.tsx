import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, ThumbsUp, ThumbsDown, ExternalLink, Terminal, FileText, TrendingUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CrashReportModalProps {
  gameId: string;
  gameName: string;
  onClose: () => void;
}

interface Solution {
  id: string;
  title: string;
  description: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  successRate: number;
  source: 'community' | 'official' | 'ai' | 'database';
  upvotes: number;
  downvotes: number;
  actions?: {
    label: string;
    type: 'command' | 'url' | 'file' | 'registry';
    value: string;
  }[];
}

interface CrashReport {
  id: string;
  gameId: string;
  gameName: string;
  timestamp: number;
  crashType: string;
  errorCode?: string;
  errorMessage?: string;
  stackTrace?: string;
  systemInfo: {
    os: string;
    cpu: string;
    gpu: string;
    ram: string;
  };
  relevantLogs: string[];
  solutions: Solution[];
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
}

const CrashReportModal: React.FC<CrashReportModalProps> = ({ gameId, gameName, onClose }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [reports, setReports] = useState<CrashReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CrashReport | null>(null);
  const [expandedSolution, setExpandedSolution] = useState<string | null>(null);

  useEffect(() => {
    loadCrashReports();
  }, [gameId]);

  const loadCrashReports = async () => {
    try {
      const crashReports = await window.ipcRenderer.invoke('crash:getReports', gameId);
      setReports(crashReports);

      if (crashReports.length > 0) {
        setSelectedReport(crashReports[0]);
      }
    } catch (error) {
      console.error('Failed to load crash reports:', error);
    }
  };

  const analyzeCrash = async () => {
    setAnalyzing(true);
    try {
      const newReport = await window.ipcRenderer.invoke('crash:analyze', gameId, gameName);
      setReports([newReport, ...reports]);
      setSelectedReport(newReport);
    } catch (error) {
      console.error('Failed to analyze crash:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVoteSolution = async (solutionId: string, isUpvote: boolean) => {
    if (!selectedReport) return;

    try {
      await window.ipcRenderer.invoke('crash:voteSolution', selectedReport.id, solutionId, isUpvote);

      // Update local state
      setSelectedReport({
        ...selectedReport,
        solutions: selectedReport.solutions.map(sol =>
          sol.id === solutionId
            ? {
                ...sol,
                upvotes: isUpvote ? sol.upvotes + 1 : sol.upvotes,
                downvotes: !isUpvote ? sol.downvotes + 1 : sol.downvotes
              }
            : sol
        )
      });
    } catch (error) {
      console.error('Failed to vote solution:', error);
    }
  };

  const handleAction = async (action: Solution['actions'][0]) => {
    try {
      if (action.type === 'url') {
        await window.ipcRenderer.invoke('system:openExternal', action.value);
      } else if (action.type === 'command') {
        await window.ipcRenderer.invoke('system:executeCommand', action.value);
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'official': return '🏢';
      case 'community': return '👥';
      case 'ai': return '🤖';
      case 'database': return '📊';
      default: return '❓';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-6xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex"
      >
        {/* Sidebar: Crash Reports List */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="text-orange-400" />
              Crash History
            </h2>
            <p className="text-sm text-gray-400 mt-1">{gameName}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No crash reports yet</p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedReport?.id === report.id
                      ? 'bg-blue-500/20 border-blue-500/50 border-2'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimestamp(report.timestamp)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      report.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                      report.status === 'investigating' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white truncate">
                    {report.crashType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  {report.errorCode && (
                    <p className="text-xs text-gray-500 font-mono mt-1">{report.errorCode}</p>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={analyzeCrash}
              disabled={analyzing}
              className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <AlertTriangle size={18} />
                  Analyze Latest Crash
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Content: Solutions */}
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Crash Analysis & Solutions</h2>
              {selectedReport && (
                <p className="text-sm text-gray-400 mt-1">
                  {selectedReport.solutions.length} solution{selectedReport.solutions.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedReport ? (
              <div className="space-y-6">
                {/* Error Details */}
                {selectedReport.errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <h3 className="font-bold text-red-400 mb-2">Error Details</h3>
                    <p className="text-sm text-gray-300 font-mono">{selectedReport.errorMessage}</p>
                    {selectedReport.errorCode && (
                      <p className="text-xs text-gray-500 font-mono mt-2">Code: {selectedReport.errorCode}</p>
                    )}
                  </div>
                )}

                {/* Solutions */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="text-green-400" />
                    Recommended Solutions
                  </h3>

                  <div className="space-y-4">
                    {selectedReport.solutions
                      .sort((a, b) => b.successRate - a.successRate)
                      .map((solution) => (
                        <motion.div
                          key={solution.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                        >
                          <div
                            className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => setExpandedSolution(
                              expandedSolution === solution.id ? null : solution.id
                            )}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-bold text-white text-lg flex items-center gap-2">
                                  {solution.title}
                                  <span className="text-xl">{getSourceIcon(solution.source)}</span>
                                </h4>
                                <p className="text-sm text-gray-400 mt-1">{solution.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className={`flex items-center gap-1 ${getDifficultyColor(solution.difficulty)}`}>
                                <span className="font-semibold capitalize">{solution.difficulty}</span>
                              </div>
                              <div className="flex items-center gap-1 text-green-400">
                                <CheckCircle size={16} />
                                <span className="font-semibold">{solution.successRate}% Success</span>
                              </div>
                              <div className="flex items-center gap-3 ml-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVoteSolution(solution.id, true);
                                  }}
                                  className="flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors"
                                >
                                  <ThumbsUp size={14} />
                                  <span>{solution.upvotes}</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVoteSolution(solution.id, false);
                                  }}
                                  className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
                                >
                                  <ThumbsDown size={14} />
                                  <span>{solution.downvotes}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {expandedSolution === solution.id && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-5 pb-5 border-t border-white/10 pt-4">
                                  <h5 className="font-semibold text-white mb-3">Steps to Fix:</h5>
                                  <ol className="space-y-2">
                                    {solution.steps.map((step, index) => (
                                      <li key={index} className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">
                                          {index + 1}
                                        </span>
                                        <span className="text-sm text-gray-300 pt-0.5">{step}</span>
                                      </li>
                                    ))}
                                  </ol>

                                  {solution.actions && solution.actions.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                      <h5 className="font-semibold text-white mb-3">Quick Actions:</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {solution.actions.map((action, index) => (
                                          <button
                                            key={index}
                                            onClick={() => handleAction(action)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
                                          >
                                            {action.type === 'url' && <ExternalLink size={14} />}
                                            {action.type === 'command' && <Terminal size={14} />}
                                            <span>{action.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertTriangle size={64} className="mb-4 opacity-50" />
                <p className="text-lg">Select a crash report to view solutions</p>
                <p className="text-sm mt-2">or analyze the latest crash</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CrashReportModal;
