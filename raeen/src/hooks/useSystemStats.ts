import { useState, useEffect } from 'react';

export interface SystemStats {
    cpu: {
        usage: number;
        temp: number;
    };
    memory: {
        percentage: number;
    };
    gpu: {
        temp: number;
        usage: number;
    }[];
}

export const useSystemStats = (intervalMs = 2000) => {
    const [stats, setStats] = useState<SystemStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await window.ipcRenderer.invoke('system:stats');
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch system stats:', error);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, intervalMs);

        return () => clearInterval(interval);
    }, [intervalMs]);

    return stats;
};
