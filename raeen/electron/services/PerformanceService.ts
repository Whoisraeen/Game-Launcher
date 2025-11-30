import { ipcMain } from 'electron';
import { ProcessManager } from './processManager';

export class PerformanceService {
    private processManager: ProcessManager;

    constructor() {
        this.processManager = new ProcessManager();
        this.registerHandlers();
    }

    private registerHandlers() {
        ipcMain.handle('performance:optimize', async (_, gameExecutable?: string) => {
            return await this.optimizeSystem(gameExecutable);
        });
    }

    async optimizeSystem(gameExecutable?: string) {
        console.log('Optimizing system...', gameExecutable ? `for ${gameExecutable}` : '');
        try {
            const actions = await this.processManager.optimizeSystem(undefined, gameExecutable);
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
}
