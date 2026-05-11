import si from 'systeminformation';
import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface SystemStats {
    cpu: {
        usage: number; // percentage
        temp: number; // celsius
        speed: number; // GHz
        cores: number;
        model: string;
        tdp: number; // estimated TDP in watts
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
        tdp: number; // estimated TDP in watts
    }[];
    disk: {
        fs: string;
        size: number; // bytes
        used: number; // bytes
        use: number; // percentage
    }[];
    power?: {
        estimatedWatts: number;
        cpuWatts: number;
        gpuWatts: number;
    };
}

interface PowerSession {
    id: string;
    gameId: string | null;
    startTime: number;
    readings: { timestamp: number; watts: number }[];
    totalWh: number;
}

export class HardwareMonitor {
    private cpuTdp = 65;
    private gpuTdp = 200;
    private activePowerSession: PowerSession | null = null;
    private powerInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.ensurePowerTable();
        this.detectTdpValues();
    }

    private ensurePowerTable() {
        try {
            const db = getDb();
            db.exec(`
                CREATE TABLE IF NOT EXISTS power_usage (
                    id TEXT PRIMARY KEY,
                    game_id TEXT,
                    start_time INTEGER NOT NULL,
                    end_time INTEGER,
                    total_wh REAL DEFAULT 0,
                    avg_watts REAL DEFAULT 0,
                    peak_watts REAL DEFAULT 0,
                    readings_json TEXT DEFAULT '[]',
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
                )
            `);
        } catch {
            // DB might not be ready yet at construction
        }
    }

    private async detectTdpValues() {
        try {
            const cpu = await si.cpu();
            const brand = (cpu.brand || '').toLowerCase();
            if (brand.includes('i9') || brand.includes('ryzen 9')) this.cpuTdp = 125;
            else if (brand.includes('i7') || brand.includes('ryzen 7')) this.cpuTdp = 95;
            else if (brand.includes('i5') || brand.includes('ryzen 5')) this.cpuTdp = 65;
            else if (brand.includes('i3') || brand.includes('ryzen 3')) this.cpuTdp = 45;

            const gfx = await si.graphics();
            const gpuModel = (gfx.controllers[0]?.model || '').toLowerCase();
            if (gpuModel.includes('4090') || gpuModel.includes('7900')) this.gpuTdp = 450;
            else if (gpuModel.includes('4080') || gpuModel.includes('7800')) this.gpuTdp = 320;
            else if (gpuModel.includes('4070') || gpuModel.includes('7700')) this.gpuTdp = 200;
            else if (gpuModel.includes('4060') || gpuModel.includes('7600')) this.gpuTdp = 150;
            else if (gpuModel.includes('3090')) this.gpuTdp = 350;
            else if (gpuModel.includes('3080')) this.gpuTdp = 320;
            else if (gpuModel.includes('3070')) this.gpuTdp = 220;
            else if (gpuModel.includes('3060')) this.gpuTdp = 170;
        } catch {
            // use defaults
        }
    }

    private estimatePowerDraw(cpuUsage: number, gpuUsage: number): { total: number; cpu: number; gpu: number } {
        const baseDraw = 30; // motherboard, RAM, fans, etc.
        const cpuDraw = (cpuUsage / 100) * this.cpuTdp;
        const gpuDraw = (gpuUsage / 100) * this.gpuTdp;
        return {
            total: Math.round(baseDraw + cpuDraw + gpuDraw),
            cpu: Math.round(cpuDraw),
            gpu: Math.round(gpuDraw),
        };
    }

    // BUG-044: cache fsSize() — it walks the filesystem and is heavy.
    // Refresh at most once per minute; everything else (CPU/GPU/mem) stays live.
    private fsSizeCache: any[] | null = null;
    private fsSizeCacheAt = 0;
    private async getFsSizeCached(): Promise<any[]> {
        const TTL = 60_000;
        const now = Date.now();
        if (this.fsSizeCache && now - this.fsSizeCacheAt < TTL) return this.fsSizeCache;
        try {
            this.fsSizeCache = await si.fsSize();
            this.fsSizeCacheAt = now;
        } catch {
            if (!this.fsSizeCache) this.fsSizeCache = [];
        }
        return this.fsSizeCache;
    }

    async getStats(): Promise<SystemStats> {
        try {
            const [cpuLoad, cpuTemp, cpuCurrentSpeed, cpu, mem, graphics, fsSize] = await Promise.all([
                si.currentLoad(),
                si.cpuTemperature(),
                si.cpuCurrentSpeed(),
                si.cpu(),
                si.mem(),
                si.graphics(),
                this.getFsSizeCached(),
            ]);

            const gpus = graphics.controllers.map(g => ({
                model: g.model,
                usage: g.utilizationGpu || 0,
                temp: g.temperatureGpu || 0,
                vram: g.vram || 0,
                driverVersion: g.driverVersion || '',
                tdp: this.gpuTdp,
            }));

            const disks = fsSize.map(d => ({
                fs: d.fs,
                size: d.size,
                used: d.used,
                use: d.use
            }));

            const cpuUsage = Math.round(cpuLoad.currentLoad);
            const gpuUsage = gpus[0]?.usage || 0;
            const power = this.estimatePowerDraw(cpuUsage, gpuUsage);

            return {
                cpu: {
                    usage: cpuUsage,
                    temp: Math.round(cpuTemp.main || 0),
                    speed: cpuCurrentSpeed.avg,
                    cores: cpu.cores,
                    model: cpu.brand,
                    tdp: this.cpuTdp,
                },
                memory: {
                    total: mem.total,
                    used: mem.active,
                    free: mem.available,
                    percentage: Math.round((mem.active / mem.total) * 100)
                },
                gpu: gpus,
                disk: disks,
                power: {
                    estimatedWatts: power.total,
                    cpuWatts: power.cpu,
                    gpuWatts: power.gpu,
                },
            };
        } catch (error) {
            console.error('Error fetching system stats:', error);
            return {
                cpu: { usage: 0, temp: 0, speed: 0, cores: 0, model: '', tdp: this.cpuTdp },
                memory: { total: 0, used: 0, free: 0, percentage: 0 },
                gpu: [],
                disk: []
            };
        }
    }

    async getProcessList(): Promise<any[]> {
        try {
            const processes = await si.processes();
            return processes.list
                .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
                .slice(0, 50)
                .map(p => ({
                    name: p.name,
                    pid: p.pid,
                    cpu: p.cpu,
                    mem: p.mem,
                    memVsz: p.memVsz,
                }));
        } catch (error) {
            console.error('Failed to get process list:', error);
            return [];
        }
    }

    // --- Power Tracking ---

    async getPowerEstimate(): Promise<{ estimatedWatts: number; cpuWatts: number; gpuWatts: number; cpuTdp: number; gpuTdp: number }> {
        const stats = await this.getStats();
        const cpuUsage = stats.cpu.usage;
        const gpuUsage = stats.gpu[0]?.usage || 0;
        const power = this.estimatePowerDraw(cpuUsage, gpuUsage);
        return {
            estimatedWatts: power.total,
            cpuWatts: power.cpu,
            gpuWatts: power.gpu,
            cpuTdp: this.cpuTdp,
            gpuTdp: this.gpuTdp,
        };
    }

    startPowerTracking(gameId?: string): string {
        if (this.activePowerSession) {
            this.stopPowerTracking();
        }

        const session: PowerSession = {
            id: uuidv4(),
            gameId: gameId || null,
            startTime: Date.now(),
            readings: [],
            totalWh: 0,
        };
        this.activePowerSession = session;

        this.powerInterval = setInterval(async () => {
            if (!this.activePowerSession) return;
            try {
                const stats = await this.getStats();
                const watts = stats.power?.estimatedWatts || 0;
                this.activePowerSession.readings.push({ timestamp: Date.now(), watts });

                const intervalHours = 10 / 3600; // 10 seconds in hours
                this.activePowerSession.totalWh += watts * intervalHours;
            } catch {
                // ignore sampling errors
            }
        }, 10000);

        return session.id;
    }

    stopPowerTracking(): PowerSession | null {
        if (!this.activePowerSession) return null;

        if (this.powerInterval) {
            clearInterval(this.powerInterval);
            this.powerInterval = null;
        }

        const session = this.activePowerSession;
        this.activePowerSession = null;

        try {
            const db = getDb();
            const readings = session.readings;
            const avgWatts = readings.length > 0
                ? readings.reduce((s, r) => s + r.watts, 0) / readings.length
                : 0;
            const peakWatts = readings.length > 0
                ? Math.max(...readings.map(r => r.watts))
                : 0;

            db.prepare(`
                INSERT INTO power_usage (id, game_id, start_time, end_time, total_wh, avg_watts, peak_watts, readings_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                session.id, session.gameId, session.startTime, Date.now(),
                Math.round(session.totalWh * 100) / 100, Math.round(avgWatts),
                Math.round(peakWatts), JSON.stringify(readings.slice(-100)),
            );
        } catch (error) {
            console.error('Failed to save power session:', error);
        }

        return session;
    }

    getPowerHistory(limit = 20): any[] {
        try {
            const db = getDb();
            return db.prepare(
                'SELECT * FROM power_usage ORDER BY start_time DESC LIMIT ?'
            ).all(limit) as any[];
        } catch {
            return [];
        }
    }
}
