import si from 'systeminformation';

export interface SystemStats {
    cpu: {
        usage: number; // percentage
        temp: number; // celsius
        speed: number; // GHz
        cores: number;
        model: string;
    };
    memory: {
        total: number; // bytes
        used: number; // bytes
        free: number; // bytes
        percentage: number;
    };
    gpu: {
        model: string;
        usage: number; // percentage
        temp: number; // celsius
        vram: number; // total vram in MB
    }[];
    disk: {
        fs: string;
        size: number; // bytes
        used: number; // bytes
        use: number; // percentage
    }[];
}

export class HardwareMonitor {
    
    async getStats(): Promise<SystemStats> {
        try {
            const [cpuLoad, cpuTemp, cpuCurrentSpeed, cpu, mem, graphics, fsSize] = await Promise.all([
                si.currentLoad(),
                si.cpuTemperature(),
                si.cpuCurrentSpeed(),
                si.cpu(),
                si.mem(),
                si.graphics(),
                si.fsSize()
            ]);

            const gpus = graphics.controllers.map(g => ({
                model: g.model,
                usage: g.utilizationGpu || 0,
                temp: g.temperatureGpu || 0,
                vram: g.vram || 0,
                driverVersion: g.driverVersion || ''
            }));

            // Filter relevant disks (ignore small partitions or special ones if needed, but for now take all)
            const disks = fsSize.map(d => ({
                fs: d.fs,
                size: d.size,
                used: d.used,
                use: d.use
            }));

            return {
                cpu: {
                    usage: Math.round(cpuLoad.currentLoad),
                    temp: Math.round(cpuTemp.main || 0),
                    speed: cpuCurrentSpeed.avg,
                    cores: cpu.cores,
                    model: cpu.brand
                },
                memory: {
                    total: mem.total,
                    used: mem.active,
                    free: mem.available,
                    percentage: Math.round((mem.active / mem.total) * 100)
                },
                gpu: gpus,
                disk: disks
            };
        } catch (error) {
            console.error('Error fetching system stats:', error);
            // Return empty/safe default structure if error
            return {
                cpu: { usage: 0, temp: 0, speed: 0, cores: 0, model: '' },
                memory: { total: 0, used: 0, free: 0, percentage: 0 },
                gpu: [],
                disk: []
            };
        }
    }
}
