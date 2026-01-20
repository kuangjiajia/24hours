import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Controller('api/claude')
export class ClaudeController {
  /**
   * Get session file content
   * Claude Code stores sessions in ~/.claude/projects/{project-path}/{session-id}.jsonl
   */
  @Get('sessions/:sessionId/file')
  async getSessionFile(
    @Param('sessionId') sessionId: string,
    @Res() res: Response,
  ) {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');

    // Search for session file in all project directories
    const sessionFile = this.findSessionFile(claudeDir, sessionId);

    if (!sessionFile) {
      throw new NotFoundException(`Session file not found: ${sessionId}`);
    }

    // Read and return the file content
    const content = fs.readFileSync(sessionFile, 'utf-8');

    // Parse JSONL and format as readable JSON
    const lines = content.trim().split('\n');
    const messages = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });

    // Return as JSON with pretty formatting
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(messages, null, 2));
  }

  /**
   * Search for session file in Claude projects directory
   * Session files are stored directly in project directories as {session-id}.jsonl
   */
  private findSessionFile(
    claudeDir: string,
    sessionId: string,
  ): string | null {
    if (!fs.existsSync(claudeDir)) {
      return null;
    }

    // Iterate through all project directories
    const projectDirs = fs.readdirSync(claudeDir);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(claudeDir, projectDir);

      // Skip if not a directory
      if (!fs.statSync(projectPath).isDirectory()) {
        continue;
      }

      // Check for session file directly in project directory
      const sessionFile = path.join(projectPath, `${sessionId}.jsonl`);

      if (fs.existsSync(sessionFile)) {
        return sessionFile;
      }
    }

    return null;
  }
}
