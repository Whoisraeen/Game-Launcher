import { exec } from 'child_process';
import util from 'util';
import { HardwareMonitor } from './hardwareMonitor';
import { ProcessManager } from './processManager';
import axios from 'axios';
import os from 'os';

const execAsync = util.promisify(exec);

export interface HealthCheckResult {
  status: 'ok' | 'warning' | 'critical';
  score: number; // 0-100
  checks: {
    drivers: DriverCheck;
    thermal: ThermalCheck;
    backgroundProcesses: BackgroundProcessCheck;
    diskSpace: DiskSpaceCheck;
    internet: InternetCheck;
    memory: MemoryCheck;
  };
  recommendations: Recommendation[];
  canPlay: boolean;
}

export interface DriverCheck {
  status: 'ok' | 'warning' | 'critical';
  gpuDriver: {
    installed: boolean;
    version?: string;
    updateAvailable?: boolean;
    daysOld?: number;
  };
  message: string;
}

export interface ThermalCheck {
  status: 'ok' | 'warning' | 'critical';
  cpuTemp: number;
  gpuTemp: number;
  prediction: 'safe' | 'monitor' | 'risk';
  message: string;
}

export interface BackgroundProcessCheck {
  status: 'ok' | 'warning' | 'critical';
  heavyProcesses: Array<{ name: string; memoryMb: number; cpuPercent?: number }>;
  totalImpact: number; // 0-100
  message: string;
}

export interface DiskSpaceCheck {
  status: 'ok' | 'warning' | 'critical';
  drives: Array<{ drive: string; freeGb: number; totalGb: number; percentFree: number }>;
  message: string;
}

export interface InternetCheck {
  status: 'ok' | 'warning' | 'critical';
  ping: number; // ms
  download?: number; // Mbps
  stable: boolean;
  message: string;
}

export interface MemoryCheck {
  status: 'ok' | 'warning' | 'critical';
  availableGb: number;
  totalGb: number;
  percentAvailable: number;
  message: string;
}

export interface Recommendation {
  severity: 'low' | 'medium' | 'high';
  category: 'driver' | 'thermal' | 'performance' | 'disk' | 'network' | 'memory';
  title: string;
  description: string;
  action?: {
    label: string;
    type: 'command' | 'url' | 'internal';
    value: string;
  };
}

export class HealthCheckService {
  private hardwareMonitor: HardwareMonitor;
  private processManager: ProcessManager;

  constructor() {
    this.hardwareMonitor = new HardwareMonitor();
    this.processManager = new ProcessManager();
  }

  /**
   * Run comprehensive pre-game health check
   */
  async runHealthCheck(gameName?: string): Promise<HealthCheckResult> {
    console.log(`Running health check${gameName ? ` for ${gameName}` : ''}...`);

    const [drivers, thermal, bgProcesses, diskSpace, internet, memory] = await Promise.all([
      this.checkDrivers(),
      this.checkThermals(),
      this.checkBackgroundProcesses(),
      this.checkDiskSpace(),
      this.checkInternet(),
      this.checkMemory(),
    ]);

    const recommendations = this.generateRecommendations({
      drivers,
      thermal,
      backgroundProcesses: bgProcesses,
      diskSpace,
      internet,
      memory,
    });

    // Calculate overall score (0-100)
    const scores = {
      drivers: drivers.status === 'ok' ? 100 : drivers.status === 'warning' ? 70 : 40,
      thermal: thermal.status === 'ok' ? 100 : thermal.status === 'warning' ? 60 : 30,
      bgProcesses: bgProcesses.status === 'ok' ? 100 : bgProcesses.status === 'warning' ? 75 : 50,
      diskSpace: diskSpace.status === 'ok' ? 100 : diskSpace.status === 'warning' ? 80 : 40,
      internet: internet.status === 'ok' ? 100 : internet.status === 'warning' ? 70 : 50,
      memory: memory.status === 'ok' ? 100 : memory.status === 'warning' ? 70 : 40,
    };

    const overallScore = Math.round(
      (scores.drivers + scores.thermal + scores.bgProcesses + scores.diskSpace + scores.internet + scores.memory) / 6
    );

    // Determine overall status
    let overallStatus: 'ok' | 'warning' | 'critical';
    if (overallScore >= 80) {
      overallStatus = 'ok';
    } else if (overallScore >= 60) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'critical';
    }

    // Can play if no critical issues
    const canPlay = ![drivers, thermal, bgProcesses, diskSpace, memory].some(check => check.status === 'critical');

    return {
      status: overallStatus,
      score: overallScore,
      checks: {
        drivers,
        thermal,
        backgroundProcesses: bgProcesses,
        diskSpace,
        internet,
        memory,
      },
      recommendations,
      canPlay,
    };
  }

  /**
   * Check GPU drivers
   */
  private async checkDrivers(): Promise<DriverCheck> {
    try {
      // Get GPU info using WMIC
      const { stdout } = await execAsync('wmic path win32_VideoController get DriverVersion,DriverDate');
      const lines = stdout.trim().split('\n').filter(line => line.trim());

      if (lines.length > 1) {
        const data = lines[1].trim().split(/\s+/);
        const driverDate = data[0]; // Format: YYYYMMDD
        const version = data[1];

        // Calculate days since driver update
        const year = parseInt(driverDate.substring(0, 4));
        const month = parseInt(driverDate.substring(4, 6)) - 1;
        const day = parseInt(driverDate.substring(6, 8));
        const driverDateObj = new Date(year, month, day);
        const daysOld = Math.floor((Date.now() - driverDateObj.getTime()) / (1000 * 60 * 60 * 24));

        let status: 'ok' | 'warning' | 'critical';
        let message: string;
        let updateAvailable = false;

        if (daysOld > 180) {
          status = 'warning';
          message = `GPU driver is ${daysOld} days old. Consider updating for better performance.`;
          updateAvailable = true;
        } else if (daysOld > 90) {
          status = 'warning';
          message = `GPU driver is ${daysOld} days old. Update available.`;
          updateAvailable = true;
        } else {
          status = 'ok';
          message = `GPU drivers are up to date (${daysOld} days old).`;
        }

        return {
          status,
          gpuDriver: {
            installed: true,
            version,
            updateAvailable,
            daysOld,
          },
          message,
        };
      }
    } catch (error) {
      console.error('Failed to check drivers:', error);
    }

    return {
      status: 'warning',
      gpuDriver: {
        installed: false,
      },
      message: 'Unable to verify GPU driver status.',
    };
  }

  /**
   * Check system thermals
   */
  private async checkThermals(): Promise<ThermalCheck> {
    try {
      const stats = await this.hardwareMonitor.getStats();
      const cpuTemp = stats.cpu.temperature || 0;
      const gpuTemp = stats.gpu.temperature || 0;

      let status: 'ok' | 'warning' | 'critical';
      let prediction: 'safe' | 'monitor' | 'risk';
      let message: string;

      // CPU thermal thresholds
      const cpuCritical = cpuTemp > 85;
      const cpuWarning = cpuTemp > 75;

      // GPU thermal thresholds
      const gpuCritical = gpuTemp > 85;
      const gpuWarning = gpuTemp > 80;

      if (cpuCritical || gpuCritical) {
        status = 'critical';
        prediction = 'risk';
        message = `High temperatures detected! CPU: ${cpuTemp}°C, GPU: ${gpuTemp}°C. Gaming may cause overheating.`;
      } else if (cpuWarning || gpuWarning) {
        status = 'warning';
        prediction = 'monitor';
        message = `Elevated temperatures. CPU: ${cpuTemp}°C, GPU: ${gpuTemp}°C. Monitor during gameplay.`;
      } else {
        status = 'ok';
        prediction = 'safe';
        message = `Temperature levels are safe. CPU: ${cpuTemp}°C, GPU: ${gpuTemp}°C.`;
      }

      return {
        status,
        cpuTemp,
        gpuTemp,
        prediction,
        message,
      };
    } catch (error) {
      console.error('Failed to check thermals:', error);
      return {
        status: 'warning',
        cpuTemp: 0,
        gpuTemp: 0,
        prediction: 'monitor',
        message: 'Unable to read temperature sensors.',
      };
    }
  }

  /**
   * Check background processes
   */
  private async checkBackgroundProcesses(): Promise<BackgroundProcessCheck> {
    try {
      const processes = await this.processManager.getProcessList();

      // Filter heavy processes (>500MB RAM)
      const heavyProcesses = processes
        .filter(p => p.memoryKb > 500000)
        .map(p => ({
          name: p.name,
          memoryMb: Math.round(p.memoryKb / 1024),
        }))
        .sort((a, b) => b.memoryMb - a.memoryMb)
        .slice(0, 5);

      // Calculate total impact (simplified)
      const totalMemoryMb = heavyProcesses.reduce((sum, p) => sum + p.memoryMb, 0);
      const totalImpact = Math.min(100, Math.round(totalMemoryMb / 100)); // Rough estimate

      let status: 'ok' | 'warning' | 'critical';
      let message: string;

      if (heavyProcesses.length >= 5 && totalMemoryMb > 4000) {
        status = 'warning';
        message = `${heavyProcesses.length} heavy processes detected using ${totalMemoryMb} MB RAM.`;
      } else if (heavyProcesses.length >= 3 && totalMemoryMb > 2000) {
        status = 'warning';
        message = `Multiple background applications running (${totalMemoryMb} MB RAM).`;
      } else {
        status = 'ok';
        message = 'Background process load is normal.';
      }

      return {
        status,
        heavyProcesses,
        totalImpact,
        message,
      };
    } catch (error) {
      console.error('Failed to check background processes:', error);
      return {
        status: 'ok',
        heavyProcesses: [],
        totalImpact: 0,
        message: 'Unable to analyze background processes.',
      };
    }
  }

  /**
   * Check disk space
   */
  private async checkDiskSpace(): Promise<DiskSpaceCheck> {
    try {
      const { stdout } = await execAsync('wmic logicaldisk get DeviceID,FreeSpace,Size /format:csv');
      const lines = stdout.trim().split('\n').filter(line => line.trim() && !line.startsWith('Node'));

      const drives = lines
        .map(line => {
          const parts = line.split(',');
          if (parts.length < 4) return null;

          const drive = parts[1]?.trim();
          const freeSpace = parseInt(parts[2]) || 0;
          const totalSpace = parseInt(parts[3]) || 0;

          if (!drive || totalSpace === 0) return null;

          const freeGb = Math.round(freeSpace / (1024 * 1024 * 1024));
          const totalGb = Math.round(totalSpace / (1024 * 1024 * 1024));
          const percentFree = Math.round((freeSpace / totalSpace) * 100);

          return { drive, freeGb, totalGb, percentFree };
        })
        .filter(d => d !== null) as Array<{ drive: string; freeGb: number; totalGb: number; percentFree: number }>;

      // Check if any drive has less than 10% free space
      const criticalDrives = drives.filter(d => d.percentFree < 10);
      const warningDrives = drives.filter(d => d.percentFree < 20 && d.percentFree >= 10);

      let status: 'ok' | 'warning' | 'critical';
      let message: string;

      if (criticalDrives.length > 0) {
        status = 'critical';
        message = `Critical: ${criticalDrives.map(d => `${d.drive} has only ${d.freeGb} GB free`).join(', ')}.`;
      } else if (warningDrives.length > 0) {
        status = 'warning';
        message = `Warning: ${warningDrives.map(d => `${d.drive} has ${d.freeGb} GB free`).join(', ')}.`;
      } else {
        status = 'ok';
        message = 'Disk space is sufficient on all drives.';
      }

      return {
        status,
        drives,
        message,
      };
    } catch (error) {
      console.error('Failed to check disk space:', error);
      return {
        status: 'ok',
        drives: [],
        message: 'Unable to check disk space.',
      };
    }
  }

  /**
   * Check internet connection
   */
  private async checkInternet(): Promise<InternetCheck> {
    try {
      const start = Date.now();
      await axios.get('https://www.google.com', { timeout: 5000 });
      const ping = Date.now() - start;

      let status: 'ok' | 'warning' | 'critical';
      let message: string;
      let stable = true;

      if (ping > 500) {
        status = 'warning';
        message = `Slow internet connection detected (${ping}ms ping). Online gaming may lag.`;
        stable = false;
      } else if (ping > 200) {
        status = 'warning';
        message = `Moderate internet latency (${ping}ms ping). Should be okay for most games.`;
      } else {
        status = 'ok';
        message = `Internet connection is stable (${ping}ms ping).`;
      }

      return {
        status,
        ping,
        stable,
        message,
      };
    } catch (error) {
      return {
        status: 'critical',
        ping: 9999,
        stable: false,
        message: 'No internet connection detected. Online features unavailable.',
      };
    }
  }

  /**
   * Check available memory
   */
  private async checkMemory(): Promise<MemoryCheck> {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const totalGb = Math.round(totalMemory / (1024 * 1024 * 1024));
      const availableGb = Math.round(freeMemory / (1024 * 1024 * 1024));
      const percentAvailable = Math.round((freeMemory / totalMemory) * 100);

      let status: 'ok' | 'warning' | 'critical';
      let message: string;

      if (availableGb < 2) {
        status = 'critical';
        message = `Critical: Only ${availableGb} GB RAM available. Close applications before gaming.`;
      } else if (availableGb < 4) {
        status = 'warning';
        message = `Warning: ${availableGb} GB RAM available. May affect game performance.`;
      } else {
        status = 'ok';
        message = `${availableGb} GB RAM available (${percentAvailable}% free). Sufficient for gaming.`;
      }

      return {
        status,
        availableGb,
        totalGb,
        percentAvailable,
        message,
      };
    } catch (error) {
      console.error('Failed to check memory:', error);
      return {
        status: 'warning',
        availableGb: 0,
        totalGb: 0,
        percentAvailable: 0,
        message: 'Unable to check memory status.',
      };
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(checks: HealthCheckResult['checks']): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Driver recommendations
    if (checks.drivers.status !== 'ok' && checks.drivers.gpuDriver.updateAvailable) {
      recommendations.push({
        severity: 'medium',
        category: 'driver',
        title: 'Update GPU Drivers',
        description: `Your GPU drivers are ${checks.drivers.gpuDriver.daysOld} days old. Updating may improve performance and fix bugs.`,
        action: {
          label: 'Check for Updates',
          type: 'url',
          value: 'https://www.nvidia.com/Download/index.aspx', // Could detect AMD/Intel and adjust
        },
      });
    }

    // Thermal recommendations
    if (checks.thermal.status === 'critical') {
      recommendations.push({
        severity: 'high',
        category: 'thermal',
        title: 'High Temperatures Detected',
        description: `CPU: ${checks.thermal.cpuTemp}°C, GPU: ${checks.thermal.gpuTemp}°C. Clean dust from fans or improve cooling.`,
        action: {
          label: 'View Cooling Tips',
          type: 'internal',
          value: 'cooling-tips',
        },
      });
    }

    // Background process recommendations
    if (checks.backgroundProcesses.status === 'warning' && checks.backgroundProcesses.heavyProcesses.length > 0) {
      recommendations.push({
        severity: 'medium',
        category: 'performance',
        title: 'Close Heavy Background Apps',
        description: `${checks.backgroundProcesses.heavyProcesses.length} heavy applications are running: ${checks.backgroundProcesses.heavyProcesses.slice(0, 3).map(p => p.name).join(', ')}.`,
        action: {
          label: 'Optimize Now',
          type: 'internal',
          value: 'optimize-processes',
        },
      });
    }

    // Disk space recommendations
    if (checks.diskSpace.status !== 'ok') {
      const lowDrives = checks.diskSpace.drives.filter(d => d.percentFree < 20);
      if (lowDrives.length > 0) {
        recommendations.push({
          severity: checks.diskSpace.status === 'critical' ? 'high' : 'medium',
          category: 'disk',
          title: 'Low Disk Space',
          description: `${lowDrives.map(d => `${d.drive} has only ${d.freeGb} GB free`).join(', ')}. Free up space for better performance.`,
          action: {
            label: 'Open Disk Cleanup',
            type: 'command',
            value: 'cleanmgr',
          },
        });
      }
    }

    // Internet recommendations
    if (checks.internet.status === 'critical') {
      recommendations.push({
        severity: 'high',
        category: 'network',
        title: 'No Internet Connection',
        description: 'Check your network connection. Online features will not work.',
      });
    } else if (checks.internet.ping > 200) {
      recommendations.push({
        severity: 'low',
        category: 'network',
        title: 'High Network Latency',
        description: `Current ping: ${checks.internet.ping}ms. Close bandwidth-heavy applications for better online gaming.`,
      });
    }

    // Memory recommendations
    if (checks.memory.status === 'critical') {
      recommendations.push({
        severity: 'high',
        category: 'memory',
        title: 'Low Available RAM',
        description: `Only ${checks.memory.availableGb} GB RAM available. Close applications to free up memory.`,
        action: {
          label: 'Free Up Memory',
          type: 'internal',
          value: 'clean-memory',
        },
      });
    }

    return recommendations;
  }
}
