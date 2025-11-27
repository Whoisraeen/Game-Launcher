import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

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
          return {
            name: parts[0],
            pid: parseInt(parts[1], 10),
            memory: parts[4]
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
      // PowerShell is cleaner for this than wmic
      await execAsync(`powershell -Command "Get-Process -Id ${pid} | ForEach-Object { $_.PriorityClass = 'High' }"`);
      return true;
    } catch (error) {
      console.error(`Failed to set priority for PID ${pid}:`, error);
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
   * Simple optimization: Clear standby list (requires admin, so maybe just simulated or standard cleanup)
   * and potentially close common resource hogs if configured.
   */
  async optimizeSystem(targetGamePid?: number): Promise<string[]> {
    const actionsTaken: string[] = [];

    // 1. Set High Priority for the game
    if (targetGamePid) {
      const success = await this.setHighPriority(targetGamePid);
      if (success) actionsTaken.push(`Set Priority High for PID ${targetGamePid}`);
    }

    // 2. Close known non-essential hogs (Example list - strictly opt-in in real app)
    // For safety in this demo, we won't actually kill Chrome/Spotify without user config.
    // We'll just log what we WOULD do.
    // actionsTaken.push("Analyzed background processes");

    return actionsTaken;
  }
}
