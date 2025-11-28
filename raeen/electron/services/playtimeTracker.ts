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
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;

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

    const isRunning = await this.processManager.isProcessRunning(this.activeProcessName);

    if (isRunning) {
      await this.updatePlaytime();
    } else {
      // Game stopped
      await this.stopTracking();
    }
  }

  dispose() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }
}
