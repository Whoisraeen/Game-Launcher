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
        this.registerHandlers();
    }

    private registerHandlers() {
        ipcMain.handle('performance:optimize', async (_, gameExecutable?: string) => {
            return await this.optimizeSystem(gameExecutable);
        });

        ipcMain.handle('performance:restore', async () => {
            return await this.restoreSystem();
        });
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
