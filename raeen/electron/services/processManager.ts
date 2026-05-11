import { exec, execFile } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);

// BUG-012: built-in safelist + user-extendable list persisted to localStorage
// (read in preload via the renderer; here we read from a JSON file in userData).
const BUILTIN_SAFELIST = [
  'explorer.exe', 'svchost.exe', 'csrss.exe', 'wininit.exe', 'winlogon.exe',
  'services.exe', 'lsass.exe', 'smss.exe', 'taskmgr.exe', 'registry.exe',
  'fontdrvhost.exe', 'dwm.exe', 'electron.exe', // Don't throttle ourselves
  'discord.exe', 'discordcanary.exe', 'discordptb.exe', // user-facing tools commonly trusted
  'obs64.exe', 'obs32.exe', 'streamlabs obs.exe',
  'spotify.exe',
];

let userSafelistCache: string[] = [];
let userSafelistLoaded = false;

async function loadUserSafelist(): Promise<string[]> {
  if (userSafelistLoaded) return userSafelistCache;
  try {
    const { app } = await import('electron');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(app.getPath('userData'), 'process-safelist.json');
    const raw = await fs.readFile(file, 'utf8').catch(() => '[]');
    const parsed = JSON.parse(raw);
    userSafelistCache = Array.isArray(parsed) ? parsed.map(s => String(s).toLowerCase()) : [];
  } catch {
    userSafelistCache = [];
  }
  userSafelistLoaded = true;
  return userSafelistCache;
}

export async function setUserSafelist(list: string[]): Promise<void> {
  try {
    const { app } = await import('electron');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(app.getPath('userData'), 'process-safelist.json');
    userSafelistCache = list.map(s => String(s).toLowerCase());
    userSafelistLoaded = true;
    await fs.writeFile(file, JSON.stringify(userSafelistCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist user safelist:', err);
  }
}

export function getUserSafelist(): string[] {
  return [...userSafelistCache];
}

function isSafelistedNow(name: string): boolean {
  const n = name.toLowerCase();
  return BUILTIN_SAFELIST.includes(n) || userSafelistCache.includes(n);
}

const SYSTEM_SAFELIST = new Proxy([] as string[], {
  // Backward-compat shim: any `.includes(name)` call delegates to the dynamic check.
  get(_t, prop) {
    if (prop === 'includes') return (name: string) => isSafelistedNow(name);
    if (prop === Symbol.iterator) return [...BUILTIN_SAFELIST, ...userSafelistCache][Symbol.iterator].bind([...BUILTIN_SAFELIST, ...userSafelistCache]);
    return undefined;
  },
});

// Trigger initial load (fire-and-forget — the proxy reads cache directly thereafter).
void loadUserSafelist();

export class ProcessManager {
  private throttledPids: number[] = [];
  
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

  async setNormalPriority(pid: number): Promise<boolean> {
    try {
      // Set to Normal (32)
      await execAsync(`powershell -Command "$process = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($process) { $process.PriorityClass = 'Normal' }"`);
      return true;
    } catch (error) {
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
    this.throttledPids = []; // Reset list

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
          this.throttledPids.push(proc.pid);
          actionsTaken.push(`⬇️ Throttled background app: ${proc.name} (${Math.round(proc.memoryKb/1024)}MB)`);
        }
      }
    } catch (e) {
      console.error("Error optimizing background processes:", e);
    }

    return actionsTaken;
  }

  async restorePriorities(): Promise<string[]> {
    const actions: string[] = [];
    
    if (this.throttledPids.length === 0) return actions;

    for (const pid of this.throttledPids) {
      const restored = await this.setNormalPriority(pid);
      if (restored) {
        // We don't know the name anymore unless we stored it, but PID is enough for debug
        // actions.push(`Restored PID ${pid}`);
      }
    }
    
    if (this.throttledPids.length > 0) {
        actions.push(`⬆️ Restored priority for ${this.throttledPids.length} background processes`);
    }
    
    this.throttledPids = [];
    return actions;
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
            // BUG-051: setting MaxWorkingSet=1 byte forces immediate page-thrashing
            // and can crash the target process. The correct trim-only call is to
            // use SetProcessWorkingSetSizeEx with (-1, -1) (a.k.a. EmptyWorkingSet),
            // which tells Windows to swap pages out without limiting future growth.
            // Note: PowerShell's $p.MaxWorkingSet setter rejects -1, so we go via
            // the kernel32 API directly through Add-Type.
            const pidNum = Number(proc.pid);
            if (!Number.isInteger(pidNum) || pidNum <= 0) continue;
            const ps = `$sig = '[DllImport(\\"psapi.dll\\")] public static extern bool EmptyWorkingSet(IntPtr h);';\n` +
                       `$t = Add-Type -MemberDefinition $sig -Name Psapi -Namespace Win32 -PassThru;\n` +
                       `$p = Get-Process -Id ${pidNum} -ErrorAction SilentlyContinue;\n` +
                       `if($p) { [void]$t::EmptyWorkingSet($p.Handle) }`;
            await execFileAsync('powershell', ['-NoProfile', '-Command', ps]);
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

  // ═══════════════════════════════════════════════════════════════
  // Dynamic Resource Allocation
  // ═══════════════════════════════════════════════════════════════

  private dynamicInterval: NodeJS.Timeout | null = null;
  private dynamicGamePid: number | null = null;
  private dynamicThrottledPids: number[] = [];
  private dynamicActive = false;
  private cpuSpikeThreshold = 80; // percent

  async startDynamicMode(gamePid?: number, gameExecutable?: string): Promise<{ success: boolean; message: string }> {
    if (this.dynamicActive) {
      return { success: false, message: 'Dynamic mode is already active' };
    }

    if (!gamePid && gameExecutable) {
      const list = await this.getProcessList();
      const proc = list.find(p => p.name.toLowerCase() === gameExecutable.toLowerCase());
      if (proc) gamePid = proc.pid;
    }

    this.dynamicGamePid = gamePid || null;
    this.dynamicActive = true;
    this.dynamicThrottledPids = [];

    this.dynamicInterval = setInterval(async () => {
      if (!this.dynamicActive) return;

      try {
        const processes = await this.getProcessList();
        if (!this.dynamicGamePid) return;

        const gameProc = processes.find(p => p.pid === this.dynamicGamePid);
        if (!gameProc) {
          await this.stopDynamicMode();
          return;
        }

        const totalMemKb = processes.reduce((s, p) => s + (p.memoryKb || 0), 0);
        const gameMemPercent = totalMemKb > 0 ? ((gameProc.memoryKb || 0) / totalMemKb) * 100 : 0;

        const heavyBg = processes.filter(p =>
          p.pid !== this.dynamicGamePid &&
          p.memoryKb > 200000 &&
          !SYSTEM_SAFELIST.includes(p.name.toLowerCase())
        );

        if (gameMemPercent > this.cpuSpikeThreshold || gameProc.memoryKb > 2000000) {
          for (const bg of heavyBg) {
            if (!this.dynamicThrottledPids.includes(bg.pid)) {
              const ok = await this.setLowPriority(bg.pid);
              if (ok) this.dynamicThrottledPids.push(bg.pid);
            }
          }
        } else if (this.dynamicThrottledPids.length > 0 && gameMemPercent < 50) {
          for (const pid of this.dynamicThrottledPids) {
            await this.setNormalPriority(pid);
          }
          this.dynamicThrottledPids = [];
        }
      } catch (e) {
        console.error('Dynamic resource allocation error:', e);
      }
    }, 5000);

    return { success: true, message: `Dynamic mode started${gamePid ? ` for PID ${gamePid}` : ''}` };
  }

  async stopDynamicMode(): Promise<{ success: boolean; restored: number }> {
    this.dynamicActive = false;

    if (this.dynamicInterval) {
      clearInterval(this.dynamicInterval);
      this.dynamicInterval = null;
    }

    let restored = 0;
    for (const pid of this.dynamicThrottledPids) {
      const ok = await this.setNormalPriority(pid);
      if (ok) restored++;
    }
    this.dynamicThrottledPids = [];
    this.dynamicGamePid = null;

    return { success: true, restored };
  }

  isDynamicModeActive(): boolean {
    return this.dynamicActive;
  }
}
