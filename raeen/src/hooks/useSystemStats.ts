import { useState, useEffect } from 'react';

export interface SystemStats {
    cpu: {
        usage: number;
        temp: number;
        speed: number;
        cores: number;
        model: string;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        percentage: number;
    };
    gpu: {
        model: string;
        usage: number;
        temp: number;
        vram: number;
    }[];
}

export const useSystemStats = (interval = 2000) => {
    const [stats, setStats] = useState<SystemStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await window.ipcRenderer.invoke('performance:getStats');
                if (data) setStats(data);
            } catch (error) {
                console.error("Failed to fetch system stats:", error);
            }
        };

        fetchStats();
        const timer = setInterval(fetchStats, interval);

        return () => clearInterval(timer);
    }, [interval]);

    return stats;
};
