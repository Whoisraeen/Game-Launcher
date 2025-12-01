import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Play, Activity, Thermometer, Cpu, HardDrive, Wifi, MemoryStick, Zap, ExternalLink, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HealthCheckModalProps {
  gameName?: string;
  onClose: () => void;
  onContinue: () => void;
}

interface HealthCheckResult {
  status: 'ok' | 'warning' | 'critical';
  score: number;
  checks: {
    drivers: any;
    thermal: any;
    backgroundProcesses: any;
    diskSpace: any;
    internet: any;
    memory: any;
  };
  recommendations: Recommendation[];
  canPlay: boolean;
}

interface Recommendation {
  severity: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  description: string;
  action?: {
    label: string;
    type: 'command' | 'url' | 'internal';
    value: string;
  };
}

const HealthCheckModal: React.FC<HealthCheckModalProps> = ({ gameName, onClose, onContinue }) => {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<HealthCheckResult | null>(null);

  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const checkResult = await window.ipcRenderer.invoke('health:check', gameName);
      setResult(checkResult);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  const getStatusColor = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
    }
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return <CheckCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'critical': return <XCircle size={20} />;
    }
  };

  const getStatusBg = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return 'bg-green-500/20 border-green-500/30';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'critical': return 'bg-red-500/20 border-red-500/30';
    }
  };

  const handleAction = async (action?: Recommendation['action']) => {
    if (!action) return;

    try {
      if (action.type === 'url') {
        await window.ipcRenderer.invoke('system:openExternal', action.value);
      } else if (action.type === 'command') {
        // Execute command via IPC
        await window.ipcRenderer.invoke('system:executeCommand', action.value);
        // Re-run health check after command execution
        setTimeout(() => runHealthCheck(), 1000);
      } else if (action.type === 'internal') {
        // Handle internal actions (navigate to settings, etc.)
        console.log('Internal action:', action.value);
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-3xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Activity className="text-blue-400" />
                Pre-Game Health Check
              </h2>
              {gameName && (
                <p className="text-sm text-gray-400 mt-1">Checking system readiness for {gameName}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {checking ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
                <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" size={24} />
              </div>
              <p className="text-gray-400">Running system diagnostics...</p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Overall Status Card */}
              <div className={`p-6 rounded-xl border-2 ${getStatusBg(result.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`text-6xl font-bold ${getStatusColor(result.status)}`}>
                      {result.score}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        {result.status === 'ok' ? 'Ready to Play!' : result.status === 'warning' ? 'Playable with Issues' : 'Critical Issues Detected'}
                      </h3>
                      <p className="text-sm text-gray-300 mt-1">
                        {result.canPlay ? 'System is ready for gaming' : 'Please address critical issues before playing'}
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl">{result.status === 'ok' ? '🎮' : result.status === 'warning' ? '⚠️' : '🔴'}</div>
                  </div>
                </div>
              </div>

              {/* System Checks Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Drivers */}
                <CheckCard
                  icon={<Zap />}
                  title="GPU Drivers"
                  status={result.checks.drivers.status}
                  message={result.checks.drivers.message}
                />

                {/* Thermal */}
                <CheckCard
                  icon={<Thermometer />}
                  title="Temperatures"
                  status={result.checks.thermal.status}
                  message={result.checks.thermal.message}
                  detail={`CPU: ${result.checks.thermal.cpuTemp}°C | GPU: ${result.checks.thermal.gpuTemp}°C`}
                />

                {/* Background Processes */}
                <CheckCard
                  icon={<Cpu />}
                  title="Background Apps"
                  status={result.checks.backgroundProcesses.status}
                  message={result.checks.backgroundProcesses.message}
                  detail={result.checks.backgroundProcesses.heavyProcesses.length > 0 ?
                    `${result.checks.backgroundProcesses.heavyProcesses.length} heavy apps running` : undefined
                  }
                />

                {/* Memory */}
                <CheckCard
                  icon={<MemoryStick />}
                  title="Available RAM"
                  status={result.checks.memory.status}
                  message={result.checks.memory.message}
                  detail={`${result.checks.memory.availableGb} GB / ${result.checks.memory.totalGb} GB free`}
                />

                {/* Disk Space */}
                <CheckCard
                  icon={<HardDrive />}
                  title="Disk Space"
                  status={result.checks.diskSpace.status}
                  message={result.checks.diskSpace.message}
                />

                {/* Internet */}
                <CheckCard
                  icon={<Wifi />}
                  title="Network"
                  status={result.checks.internet.status}
                  message={result.checks.internet.message}
                  detail={result.checks.internet.ping < 9999 ? `${result.checks.internet.ping}ms ping` : undefined}
                />
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="text-yellow-400" size={20} />
                    Recommendations
                  </h3>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border ${
                          rec.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                          rec.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                          'bg-blue-500/10 border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{rec.title}</h4>
                            <p className="text-sm text-gray-300 mt-1">{rec.description}</p>
                          </div>
                          {rec.action && (
                            <button
                              onClick={() => handleAction(rec.action)}
                              className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                            >
                              {rec.action.type === 'url' && <ExternalLink size={14} />}
                              {rec.action.type === 'command' && <Terminal size={14} />}
                              <span>{rec.action.label}</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <XCircle size={48} className="text-red-400" />
              <p className="text-gray-400">Health check failed. Please try again.</p>
              <button
                onClick={runHealthCheck}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!checking && result && (
          <div className="p-6 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onContinue}
              disabled={!result.canPlay}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                result.canPlay
                  ? 'bg-green-600 hover:bg-green-700 hover:scale-105'
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              <Play size={20} fill="white" />
              {result.canPlay ? 'Launch Game' : 'Fix Issues First'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const CheckCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  status: 'ok' | 'warning' | 'critical';
  message: string;
  detail?: string;
}> = ({ icon, title, status, message, detail }) => {
  const getStatusColor = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return 'text-green-400 border-green-500/30';
      case 'warning': return 'text-yellow-400 border-yellow-500/30';
      case 'critical': return 'text-red-400 border-red-500/30';
    }
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return <CheckCircle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'critical': return <XCircle size={16} />;
    }
  };

  return (
    <div className={`glass-card p-4 border-l-4 ${getStatusColor(status)}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={getStatusColor(status)}>
          {icon}
        </div>
        <h4 className="font-semibold text-white text-sm">{title}</h4>
        <div className={`ml-auto ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
        </div>
      </div>
      <p className="text-xs text-gray-400">{message}</p>
      {detail && <p className="text-xs text-gray-500 mt-1 font-mono">{detail}</p>}
    </div>
  );
};

export default HealthCheckModal;
