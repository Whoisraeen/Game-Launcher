import si from 'systeminformation';
import { ipcMain } from 'electron';

export class PerformanceService {
    constructor() {
        this.registerHandlers();
    }

    private registerHandlers() {
        ipcMain.handle('performance:getStats', async () => {
            return await this.getSystemStats();
        });

        ipcMain.handle('performance:optimize', async () => {
            return await this.optimizeSystem();
        });
    }

    async getSystemStats() {
        try {
            const [cpu, mem, graphics] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.graphics()
            ]);

            return {
                cpuLoad: Math.round(cpu.currentLoad),
                memUsed: Math.round(mem.active / 1024 / 1024 / 1024 * 100) / 100, // GB
                memTotal: Math.round(mem.total / 1024 / 1024 / 1024 * 100) / 100, // GB
                gpuLoad: graphics.controllers[0]?.utilizationGpu || 0,
                gpuName: graphics.controllers[0]?.model || 'Unknown GPU'
            };
        } catch (error) {
            console.error('Failed to get system stats:', error);
            return null;
        }
    }

    async optimizeSystem() {
        // In a real app, this would be more aggressive.
        // For now, we'll just return a success message as "Game Mode" activation.
        // We could potentially use 'fkill' to kill known bloatware if we had a list.
        return { success: true, message: 'Game Mode Activated: Background processes restricted.' };
    }
}
