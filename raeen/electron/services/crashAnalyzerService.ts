import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '../database';

const execAsync = promisify(exec);

export interface CrashReport {
  id: string;
  gameId: string;
  gameName: string;
  timestamp: number;
  crashType: string;
  errorCode?: string;
  errorMessage?: string;
  stackTrace?: string;
  systemInfo: {
    os: string;
    cpu: string;
    gpu: string;
    ram: string;
  };
  relevantLogs: string[];
  solutions: Solution[];
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
}

export interface Solution {
  id: string;
  title: string;
  description: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  successRate: number; // 0-100
  source: 'community' | 'official' | 'ai' | 'database';
  upvotes: number;
  downvotes: number;
  actions?: {
    label: string;
    type: 'command' | 'url' | 'file' | 'registry';
    value: string;
  }[];
}

interface CrashPattern {
  id: string;
  name: string;
  keywords: string[];
  errorCodes: string[];
  commonCauses: string[];
  solutions: Omit<Solution, 'id' | 'upvotes' | 'downvotes'>[];
}

export class CrashAnalyzerService {
  private crashPatterns: CrashPattern[] = [];

  constructor() {
    this.loadCrashPatterns();
  }

  private loadCrashPatterns() {
    // Database of common crash patterns and their solutions
    this.crashPatterns = [
      {
        id: 'missing-dll',
        name: 'Missing DLL Files',
        keywords: ['missing', 'dll', 'not found', 'vcruntime', 'msvcp', 'd3d', 'xinput'],
        errorCodes: ['0xc000007b', '0xc0000135'],
        commonCauses: ['Missing Visual C++ Redistributable', 'Missing DirectX', 'Missing .NET Framework'],
        solutions: [
          {
            title: 'Install Visual C++ Redistributables',
            description: 'Many games require Visual C++ runtime libraries to function properly.',
            steps: [
              'Download Visual C++ Redistributables from Microsoft',
              'Install both x86 and x64 versions',
              'Restart your computer',
              'Try launching the game again'
            ],
            difficulty: 'easy',
            successRate: 95,
            source: 'official',
            actions: [{
              label: 'Download VC++ Redist',
              type: 'url',
              value: 'https://aka.ms/vs/17/release/vc_redist.x64.exe'
            }]
          },
          {
            title: 'Repair or Reinstall DirectX',
            description: 'DirectX files may be corrupted or missing.',
            steps: [
              'Download DirectX End-User Runtime',
              'Run the installer',
              'Restart your computer',
              'Launch the game'
            ],
            difficulty: 'easy',
            successRate: 85,
            source: 'official',
            actions: [{
              label: 'Download DirectX',
              type: 'url',
              value: 'https://www.microsoft.com/en-us/download/details.aspx?id=35'
            }]
          }
        ]
      },
      {
        id: 'graphics-driver',
        name: 'Graphics Driver Issues',
        keywords: ['driver', 'graphics', 'display', 'd3d11', 'opengl', 'vulkan', 'dxgi_error'],
        errorCodes: ['0x887a0006', 'dxgi_error_device_hung', 'dxgi_error_device_removed'],
        commonCauses: ['Outdated GPU drivers', 'Corrupted driver installation', 'Hardware acceleration issues'],
        solutions: [
          {
            title: 'Update Graphics Drivers',
            description: 'Outdated or corrupted GPU drivers are a common cause of game crashes.',
            steps: [
              'Identify your GPU (NVIDIA, AMD, or Intel)',
              'Visit the manufacturer\'s website',
              'Download the latest driver for your GPU model',
              'Install the driver (consider clean installation)',
              'Restart your computer'
            ],
            difficulty: 'easy',
            successRate: 90,
            source: 'official',
            actions: [
              { label: 'NVIDIA Drivers', type: 'url', value: 'https://www.nvidia.com/Download/index.aspx' },
              { label: 'AMD Drivers', type: 'url', value: 'https://www.amd.com/en/support' },
              { label: 'Intel Drivers', type: 'url', value: 'https://www.intel.com/content/www/us/en/download-center/home.html' }
            ]
          },
          {
            title: 'Disable Hardware Acceleration',
            description: 'Sometimes disabling hardware acceleration can fix graphics-related crashes.',
            steps: [
              'Right-click on the game executable',
              'Properties → Compatibility tab',
              'Check "Disable fullscreen optimizations"',
              'Apply and try launching'
            ],
            difficulty: 'easy',
            successRate: 60,
            source: 'community'
          }
        ]
      },
      {
        id: 'memory-access',
        name: 'Memory Access Violation',
        keywords: ['access violation', '0xc0000005', 'segmentation fault', 'memory'],
        errorCodes: ['0xc0000005', 'access_violation'],
        commonCauses: ['Memory corruption', 'Incompatible overlays', 'Antivirus interference', 'RAM issues'],
        solutions: [
          {
            title: 'Verify Game Files',
            description: 'Corrupted game files can cause memory access violations.',
            steps: [
              'Open your game launcher (Steam, Epic, etc.)',
              'Right-click on the game',
              'Select "Verify integrity of game files" or similar',
              'Wait for verification to complete',
              'Launch the game'
            ],
            difficulty: 'easy',
            successRate: 75,
            source: 'official'
          },
          {
            title: 'Disable Overlays',
            description: 'Third-party overlays can interfere with game memory.',
            steps: [
              'Disable Steam Overlay (Steam Settings → In-Game)',
              'Disable Discord Overlay (Discord Settings → Overlay)',
              'Disable GeForce Experience overlay',
              'Close RGB software (iCUE, Razer Synapse, etc.)',
              'Try launching the game'
            ],
            difficulty: 'easy',
            successRate: 70,
            source: 'community'
          },
          {
            title: 'Run Memory Diagnostic',
            description: 'Hardware memory issues can cause access violations.',
            steps: [
              'Press Win + R',
              'Type "mdsched.exe" and press Enter',
              'Choose "Restart now and check for problems"',
              'Wait for the diagnostic to complete',
              'Check results in Event Viewer'
            ],
            difficulty: 'medium',
            successRate: 50,
            source: 'official',
            actions: [{
              label: 'Run Memory Diagnostic',
              type: 'command',
              value: 'mdsched.exe'
            }]
          }
        ]
      },
      {
        id: 'antivirus-interference',
        name: 'Antivirus/Firewall Interference',
        keywords: ['blocked', 'access denied', 'firewall', 'antivirus', 'protected'],
        errorCodes: [],
        commonCauses: ['Antivirus blocking game files', 'Firewall blocking network access', 'Windows Defender'],
        solutions: [
          {
            title: 'Add Game to Antivirus Exceptions',
            description: 'Antivirus software may incorrectly flag game files as threats.',
            steps: [
              'Open your antivirus software',
              'Navigate to exceptions/exclusions settings',
              'Add the game installation folder to exceptions',
              'Add the game executable to exceptions',
              'Save settings and restart the game'
            ],
            difficulty: 'easy',
            successRate: 85,
            source: 'community'
          },
          {
            title: 'Temporarily Disable Windows Defender',
            description: 'Windows Defender may interfere with game execution.',
            steps: [
              'Open Windows Security',
              'Go to Virus & threat protection',
              'Manage settings',
              'Temporarily turn off Real-time protection',
              'Try launching the game',
              'Remember to re-enable after testing'
            ],
            difficulty: 'easy',
            successRate: 70,
            source: 'official'
          }
        ]
      },
      {
        id: 'permission-issues',
        name: 'Insufficient Permissions',
        keywords: ['permission', 'denied', 'administrator', 'access'],
        errorCodes: [],
        commonCauses: ['UAC restrictions', 'Insufficient user permissions', 'Protected folders'],
        solutions: [
          {
            title: 'Run as Administrator',
            description: 'Some games require administrator privileges to function.',
            steps: [
              'Right-click on the game executable',
              'Select "Run as administrator"',
              'If this works, make it permanent:',
              'Right-click → Properties → Compatibility',
              'Check "Run this program as an administrator"',
              'Apply and OK'
            ],
            difficulty: 'easy',
            successRate: 80,
            source: 'official'
          }
        ]
      },
      {
        id: 'storage-issues',
        name: 'Storage/Disk Issues',
        keywords: ['disk', 'storage', 'space', 'read error', 'write error', 'i/o error'],
        errorCodes: [],
        commonCauses: ['Insufficient disk space', 'Corrupted storage', 'HDD/SSD failure'],
        solutions: [
          {
            title: 'Free Up Disk Space',
            description: 'Games need adequate free space to function properly.',
            steps: [
              'Check available disk space (should be >20GB free)',
              'Delete unnecessary files',
              'Run Disk Cleanup (cleanmgr.exe)',
              'Empty Recycle Bin',
              'Try launching the game'
            ],
            difficulty: 'easy',
            successRate: 75,
            source: 'official',
            actions: [{
              label: 'Run Disk Cleanup',
              type: 'command',
              value: 'cleanmgr.exe'
            }]
          },
          {
            title: 'Check Disk for Errors',
            description: 'Disk errors can cause game crashes and data corruption.',
            steps: [
              'Open Command Prompt as Administrator',
              'Type: chkdsk C: /f /r (replace C: with your game drive)',
              'Confirm restart if prompted',
              'Wait for scan to complete (may take hours)',
              'Restart and try launching the game'
            ],
            difficulty: 'medium',
            successRate: 65,
            source: 'official'
          }
        ]
      }
    ];
  }

  /**
   * Analyzes a game crash by checking Windows Event Log and generating solutions
   */
  async analyzeCrash(gameId: string, gameName: string): Promise<CrashReport> {
    const timestamp = Date.now();
    const crashId = `crash_${gameId}_${timestamp}`;

    try {
      // Get system information
      const systemInfo = await this.getSystemInfo();

      // Parse Windows Event Log for recent application crashes
      const eventLogs = await this.getRecentCrashLogs(gameName);

      // Analyze crash patterns
      const crashType = this.identifyCrashType(eventLogs);
      const solutions = this.generateSolutions(crashType, eventLogs);

      const crashReport: CrashReport = {
        id: crashId,
        gameId,
        gameName,
        timestamp,
        crashType,
        errorCode: this.extractErrorCode(eventLogs),
        errorMessage: this.extractErrorMessage(eventLogs),
        stackTrace: eventLogs.join('\n'),
        systemInfo,
        relevantLogs: eventLogs,
        solutions,
        status: 'new'
      };

      // Save to database
      this.saveCrashReport(crashReport);

      return crashReport;
    } catch (error) {
      console.error('Failed to analyze crash:', error);

      // Return a generic crash report with common solutions
      return {
        id: crashId,
        gameId,
        gameName,
        timestamp,
        crashType: 'unknown',
        systemInfo: await this.getSystemInfo(),
        relevantLogs: [],
        solutions: this.getCommonSolutions(),
        status: 'new'
      };
    }
  }

  /**
   * Get recent crash logs from Windows Event Viewer
   */
  private async getRecentCrashLogs(appName: string): Promise<string[]> {
    try {
      // Query Windows Event Log for application crashes in the last hour
      const command = `wevtutil qe Application /c:20 /rd:true /f:text /q:"*[System[Provider[@Name='Application Error'] and TimeCreated[timediff(@SystemTime) <= 3600000]]]"`;

      const { stdout } = await execAsync(command);

      // Filter logs related to the game
      const logs = stdout.split('\n')
        .filter(line => line.toLowerCase().includes(appName.toLowerCase()) ||
                       line.includes('error') ||
                       line.includes('0x'));

      return logs.slice(0, 50); // Limit to 50 lines
    } catch (error) {
      console.error('Failed to query event logs:', error);
      return [];
    }
  }

  /**
   * Get basic system information
   */
  private async getSystemInfo() {
    try {
      const { stdout: osInfo } = await execAsync('wmic os get Caption /value');
      const { stdout: cpuInfo } = await execAsync('wmic cpu get Name /value');
      const { stdout: ramInfo } = await execAsync('wmic computersystem get TotalPhysicalMemory /value');

      return {
        os: osInfo.split('=')[1]?.trim() || 'Unknown',
        cpu: cpuInfo.split('=')[1]?.trim() || 'Unknown',
        gpu: 'Unknown', // Would need additional logic for GPU
        ram: ramInfo.split('=')[1]?.trim() || 'Unknown'
      };
    } catch (error) {
      return {
        os: 'Unknown',
        cpu: 'Unknown',
        gpu: 'Unknown',
        ram: 'Unknown'
      };
    }
  }

  /**
   * Identify crash type based on error logs
   */
  private identifyCrashType(logs: string[]): string {
    const logText = logs.join(' ').toLowerCase();

    for (const pattern of this.crashPatterns) {
      // Check for keyword matches
      const keywordMatches = pattern.keywords.some(keyword =>
        logText.includes(keyword.toLowerCase())
      );

      // Check for error code matches
      const errorCodeMatches = pattern.errorCodes.some(code =>
        logText.includes(code.toLowerCase())
      );

      if (keywordMatches || errorCodeMatches) {
        return pattern.id;
      }
    }

    return 'unknown';
  }

  /**
   * Extract error code from logs
   */
  private extractErrorCode(logs: string[]): string | undefined {
    for (const log of logs) {
      // Look for hex error codes like 0xc0000005
      const hexMatch = log.match(/0x[0-9a-fA-F]+/);
      if (hexMatch) return hexMatch[0];
    }
    return undefined;
  }

  /**
   * Extract error message from logs
   */
  private extractErrorMessage(logs: string[]): string | undefined {
    for (const log of logs) {
      if (log.includes('Exception') || log.includes('Error')) {
        return log.trim();
      }
    }
    return undefined;
  }

  /**
   * Generate solutions based on crash type
   */
  private generateSolutions(crashType: string, logs: string[]): Solution[] {
    const pattern = this.crashPatterns.find(p => p.id === crashType);

    if (!pattern) {
      return this.getCommonSolutions();
    }

    return pattern.solutions.map((sol, index) => ({
      ...sol,
      id: `sol_${crashType}_${index}`,
      upvotes: 0,
      downvotes: 0
    }));
  }

  /**
   * Get common solutions for unknown crashes
   */
  private getCommonSolutions(): Solution[] {
    return [
      {
        id: 'sol_common_1',
        title: 'Verify Game Files',
        description: 'Corrupted files are a common cause of crashes.',
        steps: [
          'Open your game launcher',
          'Find the game in your library',
          'Look for "Verify", "Repair", or "Check Files" option',
          'Wait for the verification to complete',
          'Launch the game again'
        ],
        difficulty: 'easy',
        successRate: 70,
        source: 'official',
        upvotes: 0,
        downvotes: 0
      },
      {
        id: 'sol_common_2',
        title: 'Update Graphics Drivers',
        description: 'Outdated drivers can cause compatibility issues.',
        steps: [
          'Identify your GPU manufacturer',
          'Visit their official website',
          'Download the latest driver',
          'Install the driver',
          'Restart your computer'
        ],
        difficulty: 'easy',
        successRate: 65,
        source: 'official',
        upvotes: 0,
        downvotes: 0,
        actions: [
          { label: 'NVIDIA', type: 'url', value: 'https://www.nvidia.com/Download/index.aspx' },
          { label: 'AMD', type: 'url', value: 'https://www.amd.com/en/support' }
        ]
      },
      {
        id: 'sol_common_3',
        title: 'Run as Administrator',
        description: 'Permission issues can prevent games from running properly.',
        steps: [
          'Right-click the game executable',
          'Select "Run as administrator"',
          'If successful, make it permanent in Properties → Compatibility'
        ],
        difficulty: 'easy',
        successRate: 60,
        source: 'community',
        upvotes: 0,
        downvotes: 0
      }
    ];
  }

  /**
   * Save crash report to database
   */
  private saveCrashReport(report: CrashReport) {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO crash_reports (
          id, game_id, game_name, timestamp, crash_type,
          error_code, error_message, stack_trace, system_info,
          relevant_logs, solutions, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        report.id,
        report.gameId,
        report.gameName,
        report.timestamp,
        report.crashType,
        report.errorCode || null,
        report.errorMessage || null,
        report.stackTrace || null,
        JSON.stringify(report.systemInfo),
        JSON.stringify(report.relevantLogs),
        JSON.stringify(report.solutions),
        report.status
      );
    } catch (error) {
      console.error('Failed to save crash report:', error);
    }
  }

  /**
   * Get all crash reports for a game
   */
  getCrashReports(gameId: string): CrashReport[] {
    try {
      const db = getDb();
      const reports = db.prepare(`
        SELECT * FROM crash_reports
        WHERE game_id = ?
        ORDER BY timestamp DESC
        LIMIT 50
      `).all(gameId) as any[];

      return reports.map(r => ({
        ...r,
        systemInfo: JSON.parse(r.system_info),
        relevantLogs: JSON.parse(r.relevant_logs),
        solutions: JSON.parse(r.solutions)
      }));
    } catch (error) {
      console.error('Failed to get crash reports:', error);
      return [];
    }
  }

  /**
   * Mark solution as helpful
   */
  voteSolution(crashId: string, solutionId: string, isUpvote: boolean) {
    try {
      const db = getDb();
      const report = db.prepare('SELECT solutions FROM crash_reports WHERE id = ?').get(crashId) as any;

      if (!report) return;

      const solutions = JSON.parse(report.solutions);
      const solution = solutions.find((s: Solution) => s.id === solutionId);

      if (solution) {
        if (isUpvote) solution.upvotes++;
        else solution.downvotes++;

        db.prepare('UPDATE crash_reports SET solutions = ? WHERE id = ?')
          .run(JSON.stringify(solutions), crashId);
      }
    } catch (error) {
      console.error('Failed to vote solution:', error);
    }
  }
}
