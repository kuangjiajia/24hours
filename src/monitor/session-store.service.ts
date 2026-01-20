import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';

export interface TaskSession {
  linearTaskId: string;
  sessionId: string;
  identifier: string;
  title: string;
  startedAt: string;
  completedAt?: string;
  success?: boolean;
}

@Injectable()
export class SessionStoreService implements OnModuleInit {
  private readonly logger = new Logger(SessionStoreService.name);
  private db: Database.Database | null = null;

  onModuleInit() {
    this.ensureDb();
  }

  private ensureDb() {
    if (this.db) return;

    const dbPath = path.join(process.cwd(), '.claude-sessions.db');

    this.logger.log(`Initializing SQLite database at: ${dbPath}`);

    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private getDb(): Database.Database {
    this.ensureDb();
    return this.db as Database.Database;
  }

  private initializeSchema() {
    this.getDb().exec(`
      CREATE TABLE IF NOT EXISTS task_sessions (
        linear_task_id TEXT PRIMARY KEY,
        session_id TEXT,
        identifier TEXT NOT NULL,
        title TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        success INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_session_id ON task_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_identifier ON task_sessions(identifier);

      CREATE TABLE IF NOT EXISTS processed_comments (
        comment_id TEXT PRIMARY KEY,
        linear_task_id TEXT NOT NULL,
        processed_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_processed_comments_task_id ON processed_comments(linear_task_id);
    `);

    this.logger.log('Database schema initialized');
  }

  /**
   * Save or update a task session
   */
  saveSession(taskSession: TaskSession): void {
    const stmt = this.getDb().prepare(`
      INSERT INTO task_sessions (linear_task_id, session_id, identifier, title, started_at, completed_at, success, updated_at)
      VALUES (@linearTaskId, @sessionId, @identifier, @title, @startedAt, @completedAt, @success, CURRENT_TIMESTAMP)
      ON CONFLICT(linear_task_id) DO UPDATE SET
        session_id = COALESCE(@sessionId, session_id),
        identifier = @identifier,
        title = @title,
        started_at = COALESCE(@startedAt, started_at),
        completed_at = COALESCE(@completedAt, completed_at),
        success = COALESCE(@success, success),
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run({
      linearTaskId: taskSession.linearTaskId,
      sessionId: taskSession.sessionId || null,
      identifier: taskSession.identifier,
      title: taskSession.title,
      startedAt: taskSession.startedAt,
      completedAt: taskSession.completedAt || null,
      success: taskSession.success !== undefined ? (taskSession.success ? 1 : 0) : null,
    });

    this.logger.debug(`Saved session for task ${taskSession.identifier}: ${taskSession.sessionId}`);
  }

  /**
   * Update session ID for a task
   */
  updateSessionId(linearTaskId: string, sessionId: string): void {
    const stmt = this.getDb().prepare(`
      UPDATE task_sessions
      SET session_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE linear_task_id = ?
    `);

    stmt.run(sessionId, linearTaskId);
    this.logger.log(`Updated session ID for task ${linearTaskId}: ${sessionId}`);
  }

  /**
   * Mark task as completed
   */
  completeTask(linearTaskId: string, success: boolean): void {
    const stmt = this.getDb().prepare(`
      UPDATE task_sessions
      SET completed_at = CURRENT_TIMESTAMP, success = ?, updated_at = CURRENT_TIMESTAMP
      WHERE linear_task_id = ?
    `);

    stmt.run(success ? 1 : 0, linearTaskId);
  }

  /**
   * Get session by Linear task ID
   */
  getSessionByTaskId(linearTaskId: string): TaskSession | null {
    const stmt = this.getDb().prepare(`
      SELECT
        linear_task_id as linearTaskId,
        session_id as sessionId,
        identifier,
        title,
        started_at as startedAt,
        completed_at as completedAt,
        success
      FROM task_sessions
      WHERE linear_task_id = ?
    `);

    const row = stmt.get(linearTaskId) as any;
    if (!row) return null;

    return {
      ...row,
      success: row.success !== null ? row.success === 1 : undefined,
    };
  }

  /**
   * Get all sessions (for debugging/admin)
   */
  getAllSessions(limit = 50): TaskSession[] {
    const stmt = this.getDb().prepare(`
      SELECT
        linear_task_id as linearTaskId,
        session_id as sessionId,
        identifier,
        title,
        started_at as startedAt,
        completed_at as completedAt,
        success
      FROM task_sessions
      ORDER BY updated_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      ...row,
      success: row.success !== null ? row.success === 1 : undefined,
    }));
  }

  /**
   * Check if a comment has been processed
   */
  isCommentProcessed(commentId: string): boolean {
    const stmt = this.getDb().prepare(`
      SELECT 1 FROM processed_comments WHERE comment_id = ?
    `);

    const row = stmt.get(commentId);
    return !!row;
  }

  /**
   * Mark a comment as processed
   */
  markCommentProcessed(commentId: string, taskId: string): void {
    const stmt = this.getDb().prepare(`
      INSERT OR IGNORE INTO processed_comments (comment_id, linear_task_id)
      VALUES (?, ?)
    `);

    stmt.run(commentId, taskId);
    this.logger.debug(`Marked comment ${commentId} as processed for task ${taskId}`);
  }

  /**
   * Mark multiple comments as processed
   */
  markCommentsProcessed(commentIds: string[], taskId: string): void {
    const stmt = this.getDb().prepare(`
      INSERT OR IGNORE INTO processed_comments (comment_id, linear_task_id)
      VALUES (?, ?)
    `);

    const transaction = this.getDb().transaction(() => {
      for (const commentId of commentIds) {
        stmt.run(commentId, taskId);
      }
    });

    transaction();
    this.logger.debug(`Marked ${commentIds.length} comments as processed for task ${taskId}`);
  }

  /**
   * Get the last processed comment time for a task
   */
  getLastProcessedCommentTime(taskId: string): Date | null {
    const stmt = this.getDb().prepare(`
      SELECT MAX(processed_at) as lastProcessed
      FROM processed_comments
      WHERE linear_task_id = ?
    `);

    const row = stmt.get(taskId) as { lastProcessed: string | null } | undefined;
    if (!row || !row.lastProcessed) return null;

    return new Date(row.lastProcessed);
  }
}
