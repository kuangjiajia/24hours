import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private db: Database.Database | null = null;

  onModuleInit() {
    this.ensureDb();
  }

  private ensureDb(): Database.Database {
    if (this.db) {
      return this.db;
    }

    const dbPath = path.join(process.cwd(), '.claude-sessions.db');

    this.logger.log(`Initializing SQLite database at: ${dbPath}`);

    this.db = new Database(dbPath);
    this.initializeSchema();
    return this.db;
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    this.logger.log('Settings database schema initialized');
  }

  /**
   * Get a single setting by key
   */
  getSetting(key: string): string | null {
    const stmt = this.ensureDb().prepare(`
      SELECT value FROM settings WHERE key = ?
    `);

    const row = stmt.get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  /**
   * Get all settings as an object
   */
  getAllSettings(): Record<string, string> {
    const stmt = this.ensureDb().prepare(`
      SELECT key, value FROM settings
    `);

    const rows = stmt.all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};

    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return settings;
  }

  /**
   * Save or update a single setting
   */
  setSetting(key: string, value: string): void {
    const stmt = this.ensureDb().prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = ?,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(key, value, value);
    this.logger.debug(`Saved setting ${key}: ${value}`);
  }

  /**
   * Batch update multiple settings in a transaction
   */
  setSettings(settings: Record<string, string>): void {
    const stmt = this.ensureDb().prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = ?,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = this.ensureDb().transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, value, value);
      }
    });

    transaction();
    this.logger.log(`Batch updated ${Object.keys(settings).length} settings`);
  }
}
