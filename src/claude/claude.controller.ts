import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Parsed chat message for UI rendering
 */
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'result' | 'tool_result';
  timestamp: Date;
  content?: string;
  contentBlocks?: unknown[];
  toolUse?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
    state: 'processing' | 'ready' | 'completed' | 'error';
    output?: unknown;
    error?: string;
  };
  subtype?: string;
  sessionId?: string;
  resultType?: string;
  resultText?: string;
}

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
   * Get session messages in structured chat format
   * Returns parsed ChatMessage[] for UI rendering
   */
  @Get('sessions/:sessionId/messages')
  async getSessionMessages(
    @Param('sessionId') sessionId: string,
    @Res() res: Response,
  ) {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');

    // Search for session file in all project directories
    const sessionFile = this.findSessionFile(claudeDir, sessionId);

    if (!sessionFile) {
      throw new NotFoundException(`Session file not found: ${sessionId}`);
    }

    // Read and parse the file content
    const content = fs.readFileSync(sessionFile, 'utf-8');
    const lines = content.trim().split('\n');

    const chatMessages: ChatMessage[] = [];
    const toolResults: Map<string, unknown> = new Map();
    let messageIndex = 0;

    // First pass: collect tool results
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'user' && msg.message?.content) {
          const contents = Array.isArray(msg.message.content)
            ? msg.message.content
            : [{ type: 'text', text: msg.message.content }];

          for (const block of contents) {
            if (block.type === 'tool_result') {
              toolResults.set(block.tool_use_id, {
                content: block.content,
                is_error: block.is_error,
              });
            }
          }
        }
      } catch {
        // Skip invalid lines
      }
    }

    // Second pass: build chat messages
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);

        switch (msg.type) {
          case 'system':
            chatMessages.push({
              id: `sys-${messageIndex++}`,
              type: 'system',
              timestamp: new Date(),
              subtype: msg.subtype,
              sessionId: msg.session_id,
              content: msg.message,
            });
            break;

          case 'user':
            if (msg.message?.content) {
              const contents = Array.isArray(msg.message.content)
                ? msg.message.content
                : [{ type: 'text', text: msg.message.content }];

              // Filter out tool_result blocks for user messages
              const textContent = contents
                .filter((b: { type: string }) => b.type === 'text')
                .map((b: { text: string }) => b.text)
                .join('\n');

              if (textContent) {
                chatMessages.push({
                  id: `user-${messageIndex++}`,
                  type: 'user',
                  timestamp: new Date(),
                  content: textContent,
                });
              }
            }
            break;

          case 'assistant':
            if (msg.message?.content) {
              const contents = msg.message.content;

              // Extract text content
              const textBlocks = contents.filter(
                (b: { type: string }) => b.type === 'text',
              );
              const toolUseBlocks = contents.filter(
                (b: { type: string }) => b.type === 'tool_use',
              );

              // Add text message if exists
              if (textBlocks.length > 0) {
                const textContent = textBlocks
                  .map((b: { text: string }) => b.text)
                  .join('\n');
                chatMessages.push({
                  id: `assistant-${messageIndex++}`,
                  type: 'assistant',
                  timestamp: new Date(),
                  content: textContent,
                  contentBlocks: contents,
                });
              }

              // Add tool use messages
              for (const tool of toolUseBlocks) {
                const result = toolResults.get(tool.id);
                const isError = result && (result as { is_error?: boolean }).is_error;

                chatMessages.push({
                  id: `tool-${tool.id}`,
                  type: 'assistant',
                  timestamp: new Date(),
                  toolUse: {
                    id: tool.id,
                    name: tool.name,
                    input: tool.input,
                    state: result ? (isError ? 'error' : 'completed') : 'ready',
                    output: result ? (result as { content?: unknown }).content : undefined,
                    error: isError
                      ? String((result as { content?: unknown }).content)
                      : undefined,
                  },
                });
              }
            }
            break;

          case 'result':
            chatMessages.push({
              id: `result-${messageIndex++}`,
              type: 'result',
              timestamp: new Date(),
              resultType: msg.subtype,
              resultText: msg.result || msg.error,
            });
            break;
        }
      } catch {
        // Skip invalid lines
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(chatMessages, null, 2));
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
