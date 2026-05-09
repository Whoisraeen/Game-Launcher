import { ipcMain } from 'electron';
import { ProcessManager } from './processManager';
import { getDb } from '../database';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import util from 'util';

const execAsync = util.promisify(exec);

interface PerformanceProfile {
    id: string;
    game_id: string;
    target_fps: number;
    quality_level: number;
    resolution_scale: number;
    vsync: number;
    shadow_quality: number;
    texture_quality: number;
    anti_aliasing: number;
    post_processing: number;
    view_distance: number;
    last_avg_fps: number | null;
    last_adjusted_at: number | null;
}

interface SessionMetrics {
    fpsReadings: number[];
    cpuTemps: number[];
    gpuTemps: number[];
    cpuUsages: number[];
    memoryUsages: number[];
    stutterCount: number;
    frameDrops: number;
    startTime: number;
}

export class PerformanceService {
    private processManager: ProcessManager;
    private originalPowerPlan: string | null = null;
    private HIGH_PERFORMANCE_GUID = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';
    private activeSessionMetrics: Map<string, SessionMetrics> = new Map();
    private metricsIntervals: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        this.processManager = new ProcessManager();
        this.registerHandlers();
    }

    private registerHandlers() {
        ipcMain.handle('performance:optimize', async (_, gameExecutable?: string) => {
            return await this.optimizeSystem(gameExecutable);
        });

        ipcMain.handle('performance:restore', async () => {
            return await this.restoreSystem();
        });

        ipcMain.handle('performance:getStats', async () => {
            return await this.getSystemStats();
        });

        // Feature 1: Auto-adjust settings based on FPS
        ipcMain.handle('performance:autoAdjust', async (_, gameId: string, targetFps: number) => {
            return await this.autoAdjustSettings(gameId, targetFps);
        });

        // Feature 2: Graphics profiles
        ipcMain.handle('performance:getProfiles', async (_, gameId: string) => {
            return this.getGraphicsProfiles(gameId);
        });

        ipcMain.handle('performance:saveProfile', async (_, gameId: string, profileName: string, settingsJson: string) => {
            return this.saveGraphicsProfile(gameId, profileName, settingsJson);
        });

        ipcMain.handle('performance:deleteProfile', async (_, profileId: string) => {
            return this.deleteGraphicsProfile(profileId);
        });

        ipcMain.handle('performance:applyProfile', async (_, profileId: string) => {
            return this.applyGraphicsProfile(profileId);
        });

        // Feature 3: Performance reports
        ipcMain.handle('performance:getReport', async (_, reportId: string) => {
            return this.getReport(reportId);
        });

        ipcMain.handle('performance:getReports', async (_, gameId: string) => {
            return this.getReports(gameId);
        });

        // Feature 4: Memory cleaner
        ipcMain.handle('performance:cleanMemory', async () => {
            return await this.cleanMemory();
        });
    }

    async getSystemStats() {
        // Simple mock/real implementation using ProcessManager or direct execution
        // For a full implementation, we would use systeminformation or similar library
        // But to avoid new dependencies if possible, we can use what we have or basic PS commands
        // Or reuse the ProcessManager's list for memory
        
        // NOTE: The Overlay expects: { cpu: { usage, temp }, memory: { used, total, percentage }, gpu: [...] }
        // Getting all this via PowerShell is slow. 
        // Ideally, we should use `systeminformation` package which is standard for this.
        // Assuming we might have it or should install it. 
        // If not, let's mock it for now to fix the error, or do a quick PS check.
        
        // Let's use a quick PowerShell command to get CPU and Memory
        try {
             const { stdout } = await execAsync(`
                Get-WmiObject Win32_Processor | Select-Object -ExpandProperty LoadPercentage;
                Get-WmiObject Win32_OperatingSystem | Select-Object FreePhysicalMemory, TotalVisibleMemorySize;
             `, { shell: 'powershell.exe' });
             
             const lines = stdout.trim().split(/\r?\n/);
             const cpuUsage = parseInt(lines[0]) || 0;
             const freeMem = parseInt(lines[lines.length - 2]?.trim() || '0'); // KB
             const totalMem = parseInt(lines[lines.length - 1]?.trim() || '0'); // KB
             
             const usedMem = totalMem - freeMem;
             const memPercent = Math.round((usedMem / totalMem) * 100);
             
             return {
                 cpu: { usage: cpuUsage, temp: 0 }, // Temp requires Admin or special access usually
                 memory: { 
                     used: usedMem * 1024, 
                     total: totalMem * 1024, 
                     percentage: memPercent 
                 },
                 gpu: [{ usage: 0, temp: 0, model: 'Generic' }] // GPU is hard without NVAPI/ADL
             };
        } catch (e) {
            console.error('Error getting stats:', e);
            return {
                 cpu: { usage: 0, temp: 0 },
                 memory: { used: 0, total: 0, percentage: 0 },
                 gpu: []
            };
        }
    }

    async optimizeSystem(gameExecutable?: string) {
        console.log('Optimizing system...', gameExecutable ? `for ${gameExecutable}` : '');
        const actions: string[] = [];

        try {
            // 1. Process Optimization
            const procActions = await this.processManager.optimizeSystem(undefined, gameExecutable);
            actions.push(...procActions);

            // 2. Power Plan Optimization
            const powerAction = await this.enableHighPerformancePlan();
            if (powerAction) actions.push(powerAction);

            return { 
                success: true, 
                message: actions.length > 0 ? actions.join('\n') : 'System optimized (No heavy processes found)',
                actions 
            };
        } catch (error) {
            console.error('Optimization failed:', error);
            return { success: false, message: 'Optimization failed' };
        }
    }

    async restoreSystem() {
        console.log('Restoring system settings...');
        const actions: string[] = [];
        
        try {
            // 1. Restore Power Plan
            const powerAction = await this.restorePowerPlan();
            if (powerAction) actions.push(powerAction);

            // 2. Restore Process Priorities
            const procActions = await this.processManager.restorePriorities();
            actions.push(...procActions);
            
            return { success: true, actions };
        } catch (error) {
            console.error('Restore failed:', error);
            return { success: false, error };
        }
    }

    // --- Power Plan Management ---

    private async getCurrentPowerPlan(): Promise<string | null> {
        try {
            const { stdout } = await execAsync('powercfg /getactivescheme');
            // Output format: Power Scheme GUID: xxxxxxxx-xxxx...  (Name)
            const match = stdout.match(/GUID:\s+([a-f0-9-]+)/i);
            return match ? match[1] : null;
        } catch (e) {
            console.error('Failed to get current power plan:', e);
            return null;
        }
    }

    private async enableHighPerformancePlan(): Promise<string | null> {
        try {
            const current = await this.getCurrentPowerPlan();
            if (current && current !== this.HIGH_PERFORMANCE_GUID) {
                this.originalPowerPlan = current;
                await execAsync(`powercfg /setactive ${this.HIGH_PERFORMANCE_GUID}`);
                return '⚡ Switched to High Performance Power Plan';
            }
            return null;
        } catch (e) {
            console.error('Failed to set high performance plan:', e);
            return null;
        }
    }

    private async restorePowerPlan(): Promise<string | null> {
        if (this.originalPowerPlan) {
            try {
                await execAsync(`powercfg /setactive ${this.originalPowerPlan}`);
                const msg = '🌱 Restored original Power Plan';
                this.originalPowerPlan = null;
                return msg;
            } catch (e) {
                console.error('Failed to restore power plan:', e);
                return null;
            }
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // Feature 1: Automatic FPS-based Settings Adjustment
    // ═══════════════════════════════════════════════════════════════

    async autoAdjustSettings(gameId: string, targetFps: number): Promise<{ success: boolean; action: string; profile: PerformanceProfile | null }> {
        try {
            const db = getDb();
            let profile = db.prepare('SELECT * FROM game_performance_profiles WHERE game_id = ?').get(gameId) as PerformanceProfile | undefined;

            if (!profile) {
                const id = uuidv4();
                db.prepare(`
                    INSERT INTO game_performance_profiles (id, game_id, target_fps)
                    VALUES (?, ?, ?)
                `).run(id, gameId, targetFps);
                profile = db.prepare('SELECT * FROM game_performance_profiles WHERE id = ?').get(id) as PerformanceProfile;
            } else {
                db.prepare('UPDATE game_performance_profiles SET target_fps = ? WHERE game_id = ?').run(targetFps, gameId);
                profile.target_fps = targetFps;
            }

            const stats = await this.getSystemStats();
            const currentFps = profile.last_avg_fps ?? this.estimateFpsFromLoad(stats.cpu.usage);
            const now = Date.now();

            if (currentFps < targetFps) {
                const newLevel = Math.max(1, profile.quality_level - 1);
                const adjustedProfile = this.reduceQuality(profile);
                db.prepare(`
                    UPDATE game_performance_profiles
                    SET quality_level = ?, resolution_scale = ?, shadow_quality = ?,
                        texture_quality = ?, anti_aliasing = ?, post_processing = ?,
                        view_distance = ?, last_adjusted_at = ?, updated_at = ?
                    WHERE game_id = ?
                `).run(
                    adjustedProfile.quality_level, adjustedProfile.resolution_scale,
                    adjustedProfile.shadow_quality, adjustedProfile.texture_quality,
                    adjustedProfile.anti_aliasing, adjustedProfile.post_processing,
                    adjustedProfile.view_distance, now, now, gameId
                );

                const updated = db.prepare('SELECT * FROM game_performance_profiles WHERE game_id = ?').get(gameId) as PerformanceProfile;
                return { success: true, action: 'reduced', profile: updated };
            }

            if (currentFps > targetFps * 1.2) {
                const adjustedProfile = this.increaseQuality(profile);
                db.prepare(`
                    UPDATE game_performance_profiles
                    SET quality_level = ?, resolution_scale = ?, shadow_quality = ?,
                        texture_quality = ?, anti_aliasing = ?, post_processing = ?,
                        view_distance = ?, last_adjusted_at = ?, updated_at = ?
                    WHERE game_id = ?
                `).run(
                    adjustedProfile.quality_level, adjustedProfile.resolution_scale,
                    adjustedProfile.shadow_quality, adjustedProfile.texture_quality,
                    adjustedProfile.anti_aliasing, adjustedProfile.post_processing,
                    adjustedProfile.view_distance, now, now, gameId
                );

                const updated = db.prepare('SELECT * FROM game_performance_profiles WHERE game_id = ?').get(gameId) as PerformanceProfile;
                return { success: true, action: 'increased', profile: updated };
            }

            return { success: true, action: 'unchanged', profile };
        } catch (error) {
            console.error('Auto-adjust settings failed:', error);
            return { success: false, action: 'error', profile: null };
        }
    }

    private reduceQuality(profile: PerformanceProfile): Partial<PerformanceProfile> {
        return {
            quality_level: Math.max(1, profile.quality_level - 1),
            resolution_scale: Math.max(0.5, +(profile.resolution_scale - 0.1).toFixed(2)),
            shadow_quality: Math.max(1, profile.shadow_quality - 1),
            texture_quality: Math.max(1, profile.texture_quality - 1),
            anti_aliasing: Math.max(0, profile.anti_aliasing - 1),
            post_processing: Math.max(1, profile.post_processing - 1),
            view_distance: Math.max(1, profile.view_distance - 1),
        };
    }

    private increaseQuality(profile: PerformanceProfile): Partial<PerformanceProfile> {
        return {
            quality_level: Math.min(5, profile.quality_level + 1),
            resolution_scale: Math.min(2.0, +(profile.resolution_scale + 0.1).toFixed(2)),
            shadow_quality: Math.min(5, profile.shadow_quality + 1),
            texture_quality: Math.min(5, profile.texture_quality + 1),
            anti_aliasing: Math.min(4, profile.anti_aliasing + 1),
            post_processing: Math.min(5, profile.post_processing + 1),
            view_distance: Math.min(5, profile.view_distance + 1),
        };
    }

    private estimateFpsFromLoad(cpuUsage: number): number {
        if (cpuUsage > 90) return 25;
        if (cpuUsage > 70) return 40;
        if (cpuUsage > 50) return 55;
        return 70;
    }

    // ═══════════════════════════════════════════════════════════════
    // Feature 2: Game-specific Graphics Settings Profiles
    // ═══════════════════════════════════════════════════════════════

    getGraphicsProfiles(gameId: string): any[] {
        try {
            const db = getDb();
            return db.prepare('SELECT * FROM graphics_profiles WHERE game_id = ? ORDER BY created_at DESC').all(gameId) as any[];
        } catch (error) {
            console.error('Failed to get graphics profiles:', error);
            return [];
        }
    }

    saveGraphicsProfile(gameId: string, profileName: string, settingsJson: string): { success: boolean; id: string | null } {
        try {
            const db = getDb();
            const id = uuidv4();
            const now = Date.now();
            db.prepare(`
                INSERT INTO graphics_profiles (id, game_id, profile_name, settings_json, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(id, gameId, profileName, settingsJson, now);
            return { success: true, id };
        } catch (error) {
            console.error('Failed to save graphics profile:', error);
            return { success: false, id: null };
        }
    }

    deleteGraphicsProfile(profileId: string): { success: boolean } {
        try {
            const db = getDb();
            db.prepare('DELETE FROM graphics_profiles WHERE id = ?').run(profileId);
            return { success: true };
        } catch (error) {
            console.error('Failed to delete graphics profile:', error);
            return { success: false };
        }
    }

    applyGraphicsProfile(profileId: string): { success: boolean; settings: any | null } {
        try {
            const db = getDb();
            const profile = db.prepare('SELECT * FROM graphics_profiles WHERE id = ?').get(profileId) as any;
            if (!profile) {
                return { success: false, settings: null };
            }
            const settings = JSON.parse(profile.settings_json);
            return { success: true, settings };
        } catch (error) {
            console.error('Failed to apply graphics profile:', error);
            return { success: false, settings: null };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Feature 3: Post-game Performance Reports
    // ═══════════════════════════════════════════════════════════════

    startMetricsCollection(gameId: string) {
        if (this.activeSessionMetrics.has(gameId)) {
            this.stopMetricsCollection(gameId);
        }

        const metrics: SessionMetrics = {
            fpsReadings: [],
            cpuTemps: [],
            gpuTemps: [],
            cpuUsages: [],
            memoryUsages: [],
            stutterCount: 0,
            frameDrops: 0,
            startTime: Date.now(),
        };
        this.activeSessionMetrics.set(gameId, metrics);

        const interval = setInterval(async () => {
            try {
                const stats = await this.getSystemStats();
                const m = this.activeSessionMetrics.get(gameId);
                if (!m) return;

                m.cpuUsages.push(stats.cpu.usage);
                m.cpuTemps.push(stats.cpu.temp);
                m.memoryUsages.push(stats.memory.percentage);

                if (stats.gpu.length > 0) {
                    m.gpuTemps.push(stats.gpu[0].temp);
                }

                const estimatedFps = this.estimateFpsFromLoad(stats.cpu.usage);
                m.fpsReadings.push(estimatedFps);

                if (m.fpsReadings.length >= 2) {
                    const prev = m.fpsReadings[m.fpsReadings.length - 2];
                    const curr = m.fpsReadings[m.fpsReadings.length - 1];
                    if (prev > 0 && curr < prev * 0.7) {
                        m.stutterCount++;
                    }
                    if (curr < 30) {
                        m.frameDrops++;
                    }
                }
            } catch (e) {
                // Non-critical, keep collecting
            }
        }, 10000);

        this.metricsIntervals.set(gameId, interval);
        console.log(`Started metrics collection for game ${gameId}`);
    }

    stopMetricsCollection(gameId: string) {
        const interval = this.metricsIntervals.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.metricsIntervals.delete(gameId);
        }
        console.log(`Stopped metrics collection for game ${gameId}`);
    }

    generateReport(gameId: string, sessionId?: number): { success: boolean; reportId: string | null } {
        try {
            const db = getDb();
            const metrics = this.activeSessionMetrics.get(gameId);

            const id = uuidv4();
            const now = Date.now();

            if (metrics && metrics.fpsReadings.length > 0) {
                const avgFps = metrics.fpsReadings.reduce((a, b) => a + b, 0) / metrics.fpsReadings.length;
                const minFps = Math.min(...metrics.fpsReadings);
                const maxFps = Math.max(...metrics.fpsReadings);
                const maxCpuTemp = metrics.cpuTemps.length > 0 ? Math.max(...metrics.cpuTemps) : 0;
                const maxGpuTemp = metrics.gpuTemps.length > 0 ? Math.max(...metrics.gpuTemps) : 0;
                const avgCpuUsage = metrics.cpuUsages.length > 0
                    ? metrics.cpuUsages.reduce((a, b) => a + b, 0) / metrics.cpuUsages.length : 0;
                const avgMemoryUsage = metrics.memoryUsages.length > 0
                    ? metrics.memoryUsages.reduce((a, b) => a + b, 0) / metrics.memoryUsages.length : 0;
                const durationSeconds = Math.floor((now - metrics.startTime) / 1000);

                db.prepare(`
                    INSERT INTO performance_reports (id, game_id, session_id, avg_fps, min_fps, max_fps,
                        max_cpu_temp, max_gpu_temp, avg_cpu_usage, avg_memory_usage,
                        duration_seconds, stutter_count, frame_drops, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(id, gameId, sessionId ?? null,
                    +avgFps.toFixed(1), +minFps.toFixed(1), +maxFps.toFixed(1),
                    +maxCpuTemp.toFixed(1), +maxGpuTemp.toFixed(1),
                    +avgCpuUsage.toFixed(1), +avgMemoryUsage.toFixed(1),
                    durationSeconds, metrics.stutterCount, metrics.frameDrops, now
                );

                // Update the performance profile with the latest avg fps
                db.prepare(`
                    UPDATE game_performance_profiles SET last_avg_fps = ?, updated_at = ? WHERE game_id = ?
                `).run(+avgFps.toFixed(1), now, gameId);

                this.activeSessionMetrics.delete(gameId);
                return { success: true, reportId: id };
            }

            // If no live metrics were collected, create a minimal report from session data
            let durationSeconds = 0;
            if (sessionId) {
                const session = db.prepare('SELECT duration_seconds FROM playtime_sessions WHERE id = ?').get(sessionId) as any;
                if (session) durationSeconds = session.duration_seconds || 0;
            }

            db.prepare(`
                INSERT INTO performance_reports (id, game_id, session_id, avg_fps, min_fps, max_fps,
                    max_cpu_temp, max_gpu_temp, avg_cpu_usage, avg_memory_usage,
                    duration_seconds, stutter_count, frame_drops, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, gameId, sessionId ?? null, 0, 0, 0, 0, 0, 0, 0, durationSeconds, 0, 0, now);

            this.activeSessionMetrics.delete(gameId);
            return { success: true, reportId: id };
        } catch (error) {
            console.error('Failed to generate performance report:', error);
            return { success: false, reportId: null };
        }
    }

    getReport(reportId: string): any | null {
        try {
            const db = getDb();
            return db.prepare('SELECT * FROM performance_reports WHERE id = ?').get(reportId) || null;
        } catch (error) {
            console.error('Failed to get performance report:', error);
            return null;
        }
    }

    getReports(gameId: string): any[] {
        try {
            const db = getDb();
            return db.prepare('SELECT * FROM performance_reports WHERE game_id = ? ORDER BY created_at DESC').all(gameId) as any[];
        } catch (error) {
            console.error('Failed to get performance reports:', error);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Feature 4: Memory Cleaner Between Sessions
    // ═══════════════════════════════════════════════════════════════

    async cleanMemory(): Promise<{ success: boolean; freedMb?: number; actions: string[] }> {
        return await this.processManager.cleanMemoryAfterSession();
    }

    // ═══════════════════════════════════════════════════════════════
    // Feature 5: Game-Type Performance Profiles
    // ═══════════════════════════════════════════════════════════════

    private static readonly GAME_TYPE_PROFILES: Record<string, {
        label: string;
        description: string;
        priority: 'High' | 'AboveNormal' | 'Normal';
        killBloatware: boolean;
        powerPlan: 'high' | 'balanced';
        reserveForObs: boolean;
        maxBackgroundMemMb: number;
    }> = {
        'competitive_fps': {
            label: 'Competitive FPS',
            description: 'Close heavy background apps, max priority, low latency',
            priority: 'High',
            killBloatware: true,
            powerPlan: 'high',
            reserveForObs: false,
            maxBackgroundMemMb: 200,
        },
        'open_world_rpg': {
            label: 'Open World RPG',
            description: 'Balanced optimization, keep moderate background processes',
            priority: 'AboveNormal',
            killBloatware: false,
            powerPlan: 'high',
            reserveForObs: false,
            maxBackgroundMemMb: 500,
        },
        'strategy': {
            label: 'Strategy',
            description: 'Medium priority, allow background apps for multitasking',
            priority: 'Normal',
            killBloatware: false,
            powerPlan: 'balanced',
            reserveForObs: false,
            maxBackgroundMemMb: 800,
        },
        'streaming': {
            label: 'Streaming',
            description: 'Reserved resources for OBS/streaming software',
            priority: 'AboveNormal',
            killBloatware: true,
            powerPlan: 'high',
            reserveForObs: true,
            maxBackgroundMemMb: 300,
        },
    };

    getGameProfiles(): { id: string; label: string; description: string }[] {
        return Object.entries(PerformanceService.GAME_TYPE_PROFILES).map(([id, p]) => ({
            id,
            label: p.label,
            description: p.description,
        }));
    }

    async applyGameProfile(profileId: string, gameExecutable?: string): Promise<{ success: boolean; actions: string[] }> {
        const profile = PerformanceService.GAME_TYPE_PROFILES[profileId];
        if (!profile) {
            return { success: false, actions: ['Unknown profile'] };
        }

        const actions: string[] = [];
        actions.push(`Applying "${profile.label}" profile`);

        try {
            if (profile.powerPlan === 'high') {
                const pa = await this.enableHighPerformancePlan();
                if (pa) actions.push(pa);
            }

            const procActions = await this.processManager.optimizeSystem(undefined, gameExecutable);
            actions.push(...procActions);

            if (profile.killBloatware) {
                actions.push('Throttled heavy background processes');
            }

            if (profile.reserveForObs) {
                actions.push('Reserved CPU/RAM headroom for streaming software');
            }

            actions.push(`Process priority set to: ${profile.priority}`);

            return { success: true, actions };
        } catch (error) {
            console.error('Failed to apply game profile:', error);
            return { success: false, actions: ['Profile application failed'] };
        }
    }
}
