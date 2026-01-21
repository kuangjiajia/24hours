// Session message types for Claude Agent SDK messages

/**
 * Content block types in assistant messages
 */
export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | unknown[];
  is_error?: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

/**
 * Tool state for UI rendering
 */
export type ToolState = 'processing' | 'ready' | 'completed' | 'error';

/**
 * Unified chat message format for UI rendering
 */
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'result' | 'tool_result';
  timestamp: Date;

  // For user/assistant text messages
  content?: string;

  // For assistant messages with multiple content blocks
  contentBlocks?: ContentBlock[];

  // For tool use
  toolUse?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
    state: ToolState;
    output?: unknown;
    error?: string;
  };

  // For system messages
  subtype?: 'init' | 'error' | 'info';
  sessionId?: string;

  // For result messages
  resultType?: 'success' | 'error' | 'interrupted';
  resultText?: string;
}

/**
 * Raw SDK message types from Claude Agent SDK
 */
export interface SDKAssistantMessage {
  type: 'assistant';
  message: {
    id: string;
    content: ContentBlock[];
    model?: string;
    role: 'assistant';
  };
}

export interface SDKUserMessage {
  type: 'user';
  message: {
    role: 'user';
    content: string | ContentBlock[];
  };
}

export interface SDKSystemMessage {
  type: 'system';
  subtype: 'init' | 'error' | 'info';
  session_id?: string;
  message?: string;
}

export interface SDKResultMessage {
  type: 'result';
  subtype: 'success' | 'error' | 'interrupted';
  result?: string;
  error?: string;
}

export interface SDKToolProgressMessage {
  type: 'tool_progress';
  tool_use_id: string;
  content: unknown;
}

export type SDKMessage =
  | SDKAssistantMessage
  | SDKUserMessage
  | SDKSystemMessage
  | SDKResultMessage
  | SDKToolProgressMessage
  | { type: string; [key: string]: unknown };

/**
 * Session state for the viewer component
 */
export interface SessionState {
  messages: ChatMessage[];
  isLoading: boolean;
  isLive: boolean;
  error: string | null;
  sessionId: string;
}

/**
 * WebSocket session message event
 */
export interface SessionMessageEvent {
  sessionId: string;
  message: SDKMessage;
  timestamp: string;
}
