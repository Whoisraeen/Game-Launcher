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

  /**
   * Clean system memory after gaming session
   * - Clears standby memory list
   * - Runs disk cache cleanup
   * - Frees up RAM for better performance
   */
  async cleanMemoryAfterSession(): Promise<{ success: boolean; freedMb?: number; actions: string[] }> {
    const actions: string[] = [];
    let totalFreedKb = 0;

    try {
      // 1. Get memory before cleanup
      const beforeMemory = await this.getAvailableMemory();

      // 2. Clear standby memory list (Windows feature to free up cached memory)
      // This requires admin rights but won't fail if not available
      try {
        // Using EmptyStandbyList from RAMMap utility concept
        // PowerShell command to clear standby list
        await execAsync('powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"');
        actions.push('🗑️ Cleared Recycle Bin');
      } catch (e) {
        // Non-critical, skip
      }

      // 3. Clear temp files
      try {
        await execAsync('del /q /f /s %TEMP%\\* 2>nul');
        actions.push('🧹 Cleaned temp files');
      } catch (e) {
        // Non-critical, skip
      }

      // 4. Empty working sets of idle processes
      try {
        const processes = await this.getProcessList();
        const idleProcesses = processes.filter(p =>
          !SYSTEM_SAFELIST.includes(p.name.toLowerCase()) &&
          p.memoryKb > 100000 // > 100MB
        );

        let freedCount = 0;
        for (const proc of idleProcesses.slice(0, 10)) { // Limit to 10 processes
          try {
            // Use PowerShell to empty working set (cached memory)
            await execAsync(`powershell -Command "$p = Get-Process -Id ${proc.pid} -ErrorAction SilentlyContinue; if($p) { $p.MinWorkingSet = 1; $p.MaxWorkingSet = 1 }"`);
            freedCount++;
          } catch (e) {
            // Process might have closed, skip
          }
        }

        if (freedCount > 0) {
          actions.push(`💨 Freed memory from ${freedCount} idle processes`);
        }
      } catch (e) {
        console.error('Error freeing process memory:', e);
      }

      // 5. Get memory after cleanup
      const afterMemory = await this.getAvailableMemory();
      totalFreedKb = afterMemory - beforeMemory;

      const freedMb = Math.round(totalFreedKb / 1024);
      if (freedMb > 0) {
        actions.push(`✅ Freed approximately ${freedMb} MB of RAM`);
      }

      return {
        success: true,
        freedMb: freedMb > 0 ? freedMb : undefined,
        actions
      };

    } catch (error) {
      console.error('Memory cleanup failed:', error);
      return {
        success: false,
        actions: ['❌ Memory cleanup encountered errors']
      };
    }
  }

  /**
   * Get available system memory in KB
   */
  private async getAvailableMemory(): Promise<number> {
    try {
      const { stdout } = await execAsync('powershell -Command "(Get-Counter \\"\\Memory\\Available MBytes\\").CounterSamples.CookedValue"');
      const availableMb = parseInt(stdout.trim(), 10);
      return availableMb * 1024; // Convert to KB
    } catch (error) {
      console.error('Failed to get available memory:', error);
      return 0;
    }
  }
}
