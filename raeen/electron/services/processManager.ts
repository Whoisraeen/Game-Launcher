import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const SYSTEM_SAFELIST = [
  'explorer.exe', 'svchost.exe', 'csrss.exe', 'wininit.exe', 'winlogon.exe', 
  'services.exe', 'lsass.exe', 'smss.exe', 'taskmgr.exe', 'registry.exe', 
  'fontdrvhost.exe', 'dwm.exe', 'electron.exe' // Don't throttle ourselves
];

export class ProcessManager {
  
  async getProcessList(): Promise<any[]> {
    try {
      const { stdout } = await execAsync('tasklist /FO CSV /NH');
      return stdout.split('\r\n')
        .filter(line => line.trim())
        .map(line => {
          // Parse CSV line: "Image Name","PID","Session Name","Session#","Mem Usage"
          const parts = line.match(/"([^"]*)"/g)?.map(p => p.replace(/"/g, ''));
          if (!parts) return null;
          
          // Parse memory string like "123,456 K" -> 123456
          const memString = parts[4].replace(/[, K]/g, '');
          const memoryKb = parseInt(memString, 10);

          return {
            name: parts[0],
            pid: parseInt(parts[1], 10),
            memoryKb: isNaN(memoryKb) ? 0 : memoryKb
          };
        })
        .filter(p => p !== null);
    } catch (error) {
      console.error('Failed to get process list:', error);
      return [];
    }
  }

  async isProcessRunning(processName: string): Promise<boolean> {
    const list = await this.getProcessList();
    return list.some(p => p.name.toLowerCase() === processName.toLowerCase());
  }

  async setHighPriority(pid: number): Promise<boolean> {
    try {
      // Priority Class: 128 (High), 32 (Normal), 64 (Idle/Low)
      await execAsync(`powershell -Command "$process = Get-Process -Id ${pid}; $process.PriorityClass = 'High'"`);
      return true;
    } catch (error) {
      console.error(`Failed to set priority for PID ${pid}:`, error);
      return false;
    }
  }

  async setLowPriority(pid: number): Promise<boolean> {
    try {
      // Set to Idle (64) to yield CPU to the game
      await execAsync(`powershell -Command "$process = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($process) { $process.PriorityClass = 'Idle' }"`);
      return true;
    } catch (error) {
      // Ignore errors for processes that might have closed or are protected
      return false;
    }
  }

  async killProcess(pid: number): Promise<boolean> {
    try {
      await execAsync(`taskkill /F /PID ${pid}`);
      return true;
    } catch (error) {
      console.error(`Failed to kill process ${pid}:`, error);
      return false;
    }
  }

  /**
   * Advanced Optimization:
   * 1. Boost Game Priority
   * 2. Throttle (Low Priority) heavy background apps instead of killing them
   */
  async optimizeSystem(targetGamePid?: number, targetExecutable?: string): Promise<string[]> {
    const actionsTaken: string[] = [];

    // 1. Find Game PID if only executable provided
    if (!targetGamePid && targetExecutable) {
      const list = await this.getProcessList();
      const gameProc = list.find(p => p.name.toLowerCase() === targetExecutable.toLowerCase());
      if (gameProc) {
        targetGamePid = gameProc.pid;
      } else {
        // If not found immediately, it might be starting up.
        // In a real scenario, we might wait/retry, but for now we proceed with background optimization
        console.log(`Game process ${targetExecutable} not found yet.`);
      }
    }

    // 2. Set High Priority for the game
    if (targetGamePid) {
      const success = await this.setHighPriority(targetGamePid);
      if (success) actionsTaken.push(`🚀 Boosted Game (PID ${targetGamePid}) to HIGH priority`);
    }

    // 3. Find and Throttle Heavy Background Processes (>300MB RAM)
    try {
      const processes = await this.getProcessList();
      const heavyProcesses = processes.filter(p => 
        p.pid !== targetGamePid && // Don't throttle the game
        p.memoryKb > 300000 && // > 300MB
        !SYSTEM_SAFELIST.includes(p.name.toLowerCase()) // Not system critical
      );

      for (const proc of heavyProcesses) {
        const throttled = await this.setLowPriority(proc.pid);
        if (throttled) {
          actionsTaken.push(`⬇️ Throttled background app: ${proc.name} (${Math.round(proc.memoryKb/1024)}MB)`);
        }
      }
    } catch (e) {
      console.error("Error optimizing background processes:", e);
    }

    return actionsTaken;
  }
}
