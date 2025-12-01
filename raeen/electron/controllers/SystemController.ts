
import { ipcMain } from 'electron';
import { PerformanceService } from '../services/PerformanceService';
import { ProcessManager } from '../services/processManager';

export class SystemController {
    private performanceService: PerformanceService;
    private processManager: ProcessManager;

    constructor() {
        this.performanceService = new PerformanceService();
        this.processManager = new ProcessManager();
        this.registerHandlers();
    }

    private registerHandlers() {
        // Performance
        // Note: PerformanceService now handles its own registration if initialized in main.
        // But for Controller pattern, we should move registration here or ensure it doesn't duplicate.
        // Currently PerformanceService constructor calls registerHandlers() so we might just instantiate it.
        // To strictly follow controller pattern, we should refactor Service to NOT register IPC in constructor.
        // For now, let's assume we will refactor that later or just wrap it.
        
        // Actually, looking at the service, it does register in constructor. 
        // So we don't need to re-register here unless we change the service.
        // But to clean up main.ts, we should instantiate it here.
        
        // Process Manager (if any direct IPC needed, though usually internal)
    }

    public getPerformanceService() {
        return this.performanceService;
    }
}
