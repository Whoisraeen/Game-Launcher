import { ipcMain } from 'electron';
import { ProcessManager } from './processManager';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export class PerformanceService {
    private processManager: ProcessManager;
    private originalPowerPlan: string | null = null;
    private HIGH_PERFORMANCE_GUID = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';

    constructor() {
        this.processManager = new ProcessManager();
        // Handlers are now registered via SystemController or manual call in main.ts if preferred.
        // But to avoid duplicates if instantiated multiple times (though it should be singleton),
        // we should be careful.
        // However, the error was "Attempted to register a second handler".
        // This implies `new PerformanceService()` was called twice OR `registerHandlers` called twice.
        // In `main.ts`, we do `performanceService = new PerformanceService();`.
        // AND `systemController = new SystemController();` which ALSO does `new PerformanceService()`.
        // That is the bug. SystemController creates its OWN instance.
        
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
}
