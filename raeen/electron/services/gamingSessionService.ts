import { getDb } from '../database';
import { NotificationService } from './notificationService';
import { HLTBService } from './HLTBService';

export interface GamingSession {
  id: string;
  title: string;
  description?: string;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  gameId?: string;
  gameName?: string;
  reminder: boolean;
  reminderMinutes: number; // Minutes before event to remind
  breakInterval?: number; // Minutes between breaks
  createdAt: number;
}

export class GamingSessionService {
  private notificationService: NotificationService;
  private hltbService: HLTBService;
  private activeSession: {
    gameId: string;
    startTime: number;
    timer: NodeJS.Timeout;
    lastBreakTime: number;
    breakInterval: number;
    limitTime?: number;
  } | null = null;

  constructor() {
    this.initializeTable();
    this.notificationService = new NotificationService();
    this.hltbService = new HLTBService();
  }

  private initializeTable() {
    const db = getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS gaming_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        game_id TEXT,
        game_name TEXT,
        reminder INTEGER DEFAULT 0,
        reminder_minutes INTEGER DEFAULT 15,
        break_interval INTEGER DEFAULT 60,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON gaming_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_sessions_game_id ON gaming_sessions(game_id);
    `);
  }

  /**
   * Get time estimates for a game from HowLongToBeat
   */
  async getTimeEstimates(gameName: string) {
    return await this.hltbService.search(gameName);
  }

  /**
   * Create a new gaming session
   */
  createSession(session: Omit<GamingSession, 'id' | 'createdAt'>): GamingSession {
    const db = getDb();

    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    db.prepare(`
      INSERT INTO gaming_sessions (
        id, title, description, start_time, end_time,
        game_id, game_name, reminder, reminder_minutes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      session.title,
      session.description || null,
      session.startTime,
      session.endTime,
      session.gameId || null,
      session.gameName || null,
      session.reminder ? 1 : 0,
      session.reminderMinutes,
      session.breakInterval || 60,
      now
    );

    return {
      id,
      ...session,
      breakInterval: session.breakInterval || 60,
      createdAt: now
    };
  }

  // --- Active Session Monitoring ---

  /**
   * Start monitoring a live gaming session
   */
  public startMonitoring(gameId: string, gameName: string, breakIntervalMinutes: number = 60, limitMinutes?: number) {
    this.stopMonitoring(); // Clear any existing

    console.log(`Starting session monitor for ${gameName}. Break every ${breakIntervalMinutes}m.`);

    const startTime = Date.now();
    const limitTime = limitMinutes ? startTime + (limitMinutes * 60 * 1000) : undefined;

    this.activeSession = {
      gameId,
      startTime,
      lastBreakTime: startTime,
      breakInterval: breakIntervalMinutes * 60 * 1000,
      limitTime,
      timer: setInterval(() => this.checkSessionStatus(gameName), 60 * 1000) // Check every minute
    };
  }

  /**
   * Stop monitoring the current session
   */
  public stopMonitoring() {
    if (this.activeSession) {
      clearInterval(this.activeSession.timer);
      this.activeSession = null;
      console.log('Session monitoring stopped.');
    }
  }

  private checkSessionStatus(gameName: string) {
    if (!this.activeSession) return;

    const now = Date.now();
    
    // Check for Break
    if (now - this.activeSession.lastBreakTime >= this.activeSession.breakInterval) {
      this.notificationService.showNotification({
        title: 'Time for a Break!',
        body: `You've been playing ${gameName} for ${Math.floor((now - this.activeSession.startTime) / 60000)} minutes. Stretch your legs!`,
        urgency: 'normal'
      }, 'break-reminder');
      
      this.activeSession.lastBreakTime = now; // Reset break timer
    }

    // Check for Time Limit
    if (this.activeSession.limitTime) {
      const timeLeft = this.activeSession.limitTime - now;
      
      // Warn at 15 mins remaining
      if (timeLeft <= 15 * 60 * 1000 && timeLeft > 14 * 60 * 1000) {
        this.notificationService.showNotification({
          title: 'Session Ending Soon',
          body: `You have 15 minutes left in your planned session for ${gameName}.`,
          urgency: 'normal'
        }, 'session-warning');
      }
      
      // Warn at 0 mins (Limit Reached)
      if (timeLeft <= 0 && timeLeft > -60 * 1000) {
         this.notificationService.showNotification({
          title: 'Session Limit Reached',
          body: `Your planned time for ${gameName} is up! Time to wrap it up.`,
          urgency: 'critical'
        }, 'session-end');
      }
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions(): GamingSession[] {
    const db = getDb();
    const sessions = db.prepare(`
      SELECT * FROM gaming_sessions
      ORDER BY start_time ASC
    `).all() as any[];

    return sessions.map(this.mapSession);
  }

  /**
   * Get upcoming sessions (future sessions)
   */
  getUpcomingSessions(limit: number = 10): GamingSession[] {
    const db = getDb();
    const now = Date.now();

    const sessions = db.prepare(`
      SELECT * FROM gaming_sessions
      WHERE start_time >= ?
      ORDER BY start_time ASC
      LIMIT ?
    `).all(now, limit) as any[];

    return sessions.map(this.mapSession);
  }

  /**
   * Get sessions for a specific date range
   */
  getSessionsInRange(startTime: number, endTime: number): GamingSession[] {
    const db = getDb();

    const sessions = db.prepare(`
      SELECT * FROM gaming_sessions
      WHERE start_time >= ? AND start_time <= ?
      ORDER BY start_time ASC
    `).all(startTime, endTime) as any[];

    return sessions.map(this.mapSession);
  }

  /**
   * Get sessions for a specific month
   */
  getSessionsForMonth(year: number, month: number): GamingSession[] {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return this.getSessionsInRange(startDate.getTime(), endDate.getTime());
  }

  /**
   * Update a session
   */
  updateSession(id: string, updates: Partial<Omit<GamingSession, 'id' | 'createdAt'>>): boolean {
    const db = getDb();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.startTime !== undefined) {
      fields.push('start_time = ?');
      values.push(updates.startTime);
    }
    if (updates.endTime !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.endTime);
    }
    if (updates.gameId !== undefined) {
      fields.push('game_id = ?');
      values.push(updates.gameId);
    }
    if (updates.gameName !== undefined) {
      fields.push('game_name = ?');
      values.push(updates.gameName);
    }
    if (updates.reminder !== undefined) {
      fields.push('reminder = ?');
      values.push(updates.reminder ? 1 : 0);
    }
    if (updates.reminderMinutes !== undefined) {
      fields.push('reminder_minutes = ?');
      values.push(updates.reminderMinutes);
    }
    if (updates.breakInterval !== undefined) {
      fields.push('break_interval = ?');
      values.push(updates.breakInterval);
    }

    if (fields.length === 0) return false;

    values.push(id);

    const result = db.prepare(`
      UPDATE gaming_sessions
      SET ${fields.join(', ')}
      WHERE id = ?
    `).run(...values);

    return result.changes > 0;
  }

  /**
   * Delete a session
   */
  deleteSession(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM gaming_sessions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Get session by ID
   */
  getSession(id: string): GamingSession | null {
    const db = getDb();
    const session = db.prepare('SELECT * FROM gaming_sessions WHERE id = ?').get(id) as any;

    if (!session) return null;
    return this.mapSession(session);
  }

  /**
   * Get the current planned session for a game (if any)
   */
  getSessionForGameNow(gameId: string): GamingSession | null {
    const db = getDb();
    const now = Date.now();
    // Look for a session that started recently or is about to start, and hasn't ended yet
    // Allow starting 15 mins early
    const session = db.prepare(`
      SELECT * FROM gaming_sessions
      WHERE game_id = ?
      AND start_time <= ?
      AND end_time > ?
      ORDER BY start_time DESC
      LIMIT 1
    `).get(gameId, now + 15 * 60 * 1000, now) as any;

    if (!session) return null;
    return this.mapSession(session);
  }

  /**
   * Map database row to GamingSession
   */
  private mapSession(row: any): GamingSession {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      gameId: row.game_id,
      gameName: row.game_name,
      reminder: Boolean(row.reminder),
      reminderMinutes: row.reminder_minutes,
      breakInterval: row.break_interval,
      createdAt: row.created_at
    };
  }

  /**
   * Check for sessions needing reminders
   */
  getSessionsNeedingReminder(): GamingSession[] {
    const db = getDb();
    const now = Date.now();

    const sessions = db.prepare(`
      SELECT * FROM gaming_sessions
      WHERE reminder = 1
      AND start_time > ?
      AND start_time <= ?
      ORDER BY start_time ASC
    `).all(now, now + (60 * 60 * 1000)) as any[]; // Within next hour

    return sessions.map(this.mapSession);
  }
}
