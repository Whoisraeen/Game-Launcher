import si from 'systeminformation';
import { getDb } from '../database';

interface SystemSpecs {
    cpu: { model: string; cores: number; speed: number };
    gpu: { model: string; vram: number }[];
    ram: number; // GB
    os: string;
    storage: number; // total GB
}

interface GameRequirements {
    gameId: string;
    minCpuCores: number;
    minRamGb: number;
    minVramMb: number;
    minStorageGb: number;
    recCpuCores: number;
    recRamGb: number;
    recVramMb: number;
    recStorageGb: number;
}

type Verdict = 'Exceeds' | 'Meets' | 'Below Minimum' | 'Unknown';

interface CompatResult {
    gameId: string;
    verdict: Verdict;
    details: {
        cpu: Verdict;
        ram: Verdict;
        gpu: Verdict;
        storage: Verdict;
    };
    systemSpecs: SystemSpecs;
    requirements: GameRequirements | null;
}

export class HardwareCompatService {
    private cachedSpecs: SystemSpecs | null = null;

    constructor() {
        this.ensureTable();
    }

    private ensureTable() {
        const db = getDb();
        db.exec(`
            CREATE TABLE IF NOT EXISTS game_requirements (
                game_id TEXT PRIMARY KEY,
                min_cpu_cores INTEGER DEFAULT 2,
                min_ram_gb REAL DEFAULT 4,
                min_vram_mb INTEGER DEFAULT 1024,
                min_storage_gb REAL DEFAULT 20,
                rec_cpu_cores INTEGER DEFAULT 4,
                rec_ram_gb REAL DEFAULT 8,
                rec_vram_mb INTEGER DEFAULT 2048,
                rec_storage_gb REAL DEFAULT 50,
                updated_at INTEGER,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            )
        `);
    }

    async getSystemSpecs(): Promise<SystemSpecs> {
        if (this.cachedSpecs) return this.cachedSpecs;

        try {
            const [cpu, mem, graphics, os, fsSize] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.graphics(),
                si.osInfo(),
                si.fsSize(),
            ]);

            const totalStorageGb = fsSize.reduce((sum, d) => sum + d.size, 0) / (1024 ** 3);

            this.cachedSpecs = {
                cpu: {
                    model: cpu.brand,
                    cores: cpu.cores,
                    speed: cpu.speed,
                },
                gpu: graphics.controllers.map(g => ({
                    model: g.model,
                    vram: g.vram || 0,
                })),
                ram: Math.round((mem.total / (1024 ** 3)) * 10) / 10,
                os: `${os.distro} ${os.release}`,
                storage: Math.round(totalStorageGb),
            };

            return this.cachedSpecs;
        } catch (error) {
            console.error('Failed to get system specs:', error);
            return {
                cpu: { model: 'Unknown', cores: 0, speed: 0 },
                gpu: [],
                ram: 0,
                os: 'Unknown',
                storage: 0,
            };
        }
    }

    setGameRequirements(gameId: string, reqs: Partial<Omit<GameRequirements, 'gameId'>>): void {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM game_requirements WHERE game_id = ?').get(gameId);

        if (existing) {
            db.prepare(`
                UPDATE game_requirements SET
                    min_cpu_cores = COALESCE(?, min_cpu_cores),
                    min_ram_gb = COALESCE(?, min_ram_gb),
                    min_vram_mb = COALESCE(?, min_vram_mb),
                    min_storage_gb = COALESCE(?, min_storage_gb),
                    rec_cpu_cores = COALESCE(?, rec_cpu_cores),
                    rec_ram_gb = COALESCE(?, rec_ram_gb),
                    rec_vram_mb = COALESCE(?, rec_vram_mb),
                    rec_storage_gb = COALESCE(?, rec_storage_gb),
                    updated_at = ?
                WHERE game_id = ?
            `).run(
                reqs.minCpuCores, reqs.minRamGb, reqs.minVramMb, reqs.minStorageGb,
                reqs.recCpuCores, reqs.recRamGb, reqs.recVramMb, reqs.recStorageGb,
                Date.now(), gameId,
            );
        } else {
            db.prepare(`
                INSERT INTO game_requirements (game_id, min_cpu_cores, min_ram_gb, min_vram_mb, min_storage_gb,
                    rec_cpu_cores, rec_ram_gb, rec_vram_mb, rec_storage_gb, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                gameId,
                reqs.minCpuCores ?? 2, reqs.minRamGb ?? 4, reqs.minVramMb ?? 1024, reqs.minStorageGb ?? 20,
                reqs.recCpuCores ?? 4, reqs.recRamGb ?? 8, reqs.recVramMb ?? 2048, reqs.recStorageGb ?? 50,
                Date.now(),
            );
        }
    }

    getGameRequirements(gameId: string): GameRequirements | null {
        const db = getDb();
        const row = db.prepare('SELECT * FROM game_requirements WHERE game_id = ?').get(gameId) as any;
        if (!row) return null;

        return {
            gameId: row.game_id,
            minCpuCores: row.min_cpu_cores,
            minRamGb: row.min_ram_gb,
            minVramMb: row.min_vram_mb,
            minStorageGb: row.min_storage_gb,
            recCpuCores: row.rec_cpu_cores,
            recRamGb: row.rec_ram_gb,
            recVramMb: row.rec_vram_mb,
            recStorageGb: row.rec_storage_gb,
        };
    }

    async checkGame(gameId: string): Promise<CompatResult> {
        const specs = await this.getSystemSpecs();
        const reqs = this.getGameRequirements(gameId);

        if (!reqs) {
            return {
                gameId,
                verdict: 'Unknown',
                details: { cpu: 'Unknown', ram: 'Unknown', gpu: 'Unknown', storage: 'Unknown' },
                systemSpecs: specs,
                requirements: null,
            };
        }

        const primaryGpuVram = specs.gpu.length > 0 ? Math.max(...specs.gpu.map(g => g.vram)) : 0;

        const judge = (actual: number, min: number, rec: number): Verdict => {
            if (actual >= rec) return 'Exceeds';
            if (actual >= min) return 'Meets';
            return 'Below Minimum';
        };

        const cpuVerdict = judge(specs.cpu.cores, reqs.minCpuCores, reqs.recCpuCores);
        const ramVerdict = judge(specs.ram, reqs.minRamGb, reqs.recRamGb);
        // BUG-068: integrated GPUs (Intel iGPUs especially) often report VRAM=0
        // because they share system memory. Treating that as "Below Minimum"
        // marks every game as failing GPU compat. Mark as Unknown instead so
        // the user gets an accurate signal.
        const gpuVerdict: Verdict = primaryGpuVram === 0
            ? 'Unknown'
            : judge(primaryGpuVram, reqs.minVramMb, reqs.recVramMb);
        const storageVerdict = judge(specs.storage, reqs.minStorageGb, reqs.recStorageGb);

        const verdicts = [cpuVerdict, ramVerdict, gpuVerdict, storageVerdict];
        let overall: Verdict;
        // Unknown shouldn't pull the overall verdict down to Below Minimum.
        const downgrading = verdicts.filter(v => v !== 'Unknown');
        if (downgrading.includes('Below Minimum')) overall = 'Below Minimum';
        else if (downgrading.length === 0) overall = 'Unknown';
        else if (downgrading.every(v => v === 'Exceeds')) overall = 'Exceeds';
        else overall = 'Meets';

        return {
            gameId,
            verdict: overall,
            details: { cpu: cpuVerdict, ram: ramVerdict, gpu: gpuVerdict, storage: storageVerdict },
            systemSpecs: specs,
            requirements: reqs,
        };
    }

    invalidateCache(): void {
        this.cachedSpecs = null;
    }
}
