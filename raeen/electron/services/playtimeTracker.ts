import { ProcessManager } from './processManager';
import { getDb } from '../database';
import path from 'path';
import { DiscordManager } from './discordManager';

export class PlaytimeTracker {
  private processManager: ProcessManager;
  private trackingInterval: NodeJS.Timeout | null = null;
  private activeGameId: string | null = null;
  private activeProcessName: string | null = null;
  private startTime: number = 0;
  private lastUpdateTime: number = 0;
  private sessionId: number | null = null;
  // BUG-045: track related/child process names so launchers that exit and spawn
  // a different game executable don't terminate playtime tracking immediately.
  private candidateProcessNames: Set<string> = new Set();
  private graceMisses: number = 0;
  private readonly GRACE_MISSES_LIMIT = 3; // ~90s with the 30s tick

  constructor() {
    this.processManager = new ProcessManager();
    // Check every 30 seconds
    this.trackingInterval = setInterval(() => this.checkPlaytime(), 30000);
  }

  async startTracking(gameId: string, executablePath: string) {
    // If already tracking another game, stop it first
    if (this.activeGameId) {
      await this.stopTracking();
    }

    this.activeGameId = gameId;
    this.activeProcessName = path.basename(executablePath);
    this.candidateProcessNames = new Set([this.activeProcessName.toLowerCase()]);
    this.graceMisses = 0;
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;

    // BUG-045: snapshot processes shortly after launch so we capture any
    // child the launcher spawned (e.g. game.exe via launcher.exe).
    setTimeout(() => this.snapshotChildProcesses().catch(() => {}), 8_000);

    console.log(`Started tracking playtime for ${this.activeProcessName} (Game ID: ${gameId})`);

    // Create session
    const db = getDb();
    const result = db.prepare('INSERT INTO playtime_sessions (game_id, start_time, duration_seconds) VALUES (?, ?, 0)').run(gameId, this.startTime);
    this.sessionId = result.lastInsertRowid as number;
  }

  async stopTracking() {
    if (!this.activeGameId || !this.sessionId) return;

    // Perform final update
    await this.updatePlaytime();

    console.log(`Stopped tracking ${this.activeProcessName}`);

    this.activeGameId = null;
    this.activeProcessName = null;
    this.sessionId = null;
    this.startTime = 0;
    this.lastUpdateTime = 0;

    // Reset Discord Activity
    DiscordManager.getInstance().setIdle();
  }

  private async updatePlaytime() {
    if (!this.activeGameId || !this.sessionId) return;

    const now = Date.now();
    const deltaSeconds = Math.floor((now - this.lastUpdateTime) / 1000);

    if (deltaSeconds <= 0) return;

    const db = getDb();

    // Update session
    db.prepare('UPDATE playtime_sessions SET end_time = ?, duration_seconds = duration_seconds + ? WHERE id = ?')
      .run(now, deltaSeconds, this.sessionId);

    // Update total playtime for game
    db.prepare('UPDATE games SET playtime_seconds = playtime_seconds + ? WHERE id = ?')
      .run(deltaSeconds, this.activeGameId);

    this.lastUpdateTime = now;
  }

  private async checkPlaytime() {
    if (!this.activeGameId || !this.activeProcessName) return;

    // BUG-045: consider tracking alive if ANY of the candidate process names
    // are still running. This handles launchers that exec the real game
    // process and exit themselves.
    let anyRunning = false;
    for (const name of this.candidateProcessNames) {
      if (await this.processManager.isProcessRunning(name)) { anyRunning = true; break; }
    }

    if (anyRunning) {
      this.graceMisses = 0;
      await this.updatePlaytime();
      // Periodically refresh the candidate list (children may spawn later).
      if (this.graceMisses === 0 && Math.random() < 0.2) await this.snapshotChildProcesses();
    } else {
      // Tolerate a few consecutive misses before declaring the session over —
      // launcher → game handoff can have a window with neither process visible.
      this.graceMisses++;
      if (this.graceMisses >= this.GRACE_MISSES_LIMIT) await this.stopTracking();
    }
  }

  // BUG-045: best-effort enumeration of processes spawned around the launch
  // moment. We pull the list once and add any newish process whose parent
  // is the original executable to the candidate set.
  private async snapshotChildProcesses(): Promise<void> {
    try {
      const procs = await this.processManager.getProcessList?.();
      if (!Array.isArray(procs)) return;
      const root = (this.activeProcessName || '').toLowerCase();
      for (const p of procs) {
        const name = String(p?.name || '').toLowerCase();
        if (!name) continue;
        if (name === root) continue;
        // Heuristic: anything reported with a parent matching our exe, OR
        // with the same image path stem, becomes a candidate.
        const parent = String(p?.parentName || '').toLowerCase();
        if (parent === root) this.candidateProcessNames.add(name);
      }
    } catch { /* non-fatal */ }
  }

  dispose() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }
}
