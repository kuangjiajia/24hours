import type {
  ChatMessage,
  SDKMessage,
  SDKAssistantMessage,
  SDKUserMessage,
  SDKSystemMessage,
  SDKResultMessage,
  ContentBlock,
  ToolState,
} from '../types/session';

let messageCounter = 0;

/**
 * Generate a unique message ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${++messageCounter}-${Date.now()}`;
}

/**
 * Parse a single SDK message into ChatMessage format
 */
export function parseSDKMessage(msg: SDKMessage): ChatMessage | ChatMessage[] | null {
  switch (msg.type) {
    case 'system':
      return parseSystemMessage(msg as SDKSystemMessage);

    case 'user':
      return parseUserMessage(msg as SDKUserMessage);

    case 'assistant':
      return parseAssistantMessage(msg as SDKAssistantMessage);

    case 'result':
      return parseResultMessage(msg as SDKResultMessage);

    default:
      return null;
  }
}

/**
 * Parse system message
 */
function parseSystemMessage(msg: SDKSystemMessage): ChatMessage {
  return {
    id: generateId('sys'),
    type: 'system',
    timestamp: new Date(),
    subtype: msg.subtype,
    sessionId: msg.session_id,
    content: msg.message,
  };
}

/**
 * Parse user message
 */
function parseUserMessage(msg: SDKUserMessage): ChatMessage | null {
  if (!msg.message?.content) return null;

  const contents = Array.isArray(msg.message.content)
    ? msg.message.content
    : [{ type: 'text', text: msg.message.content as string }];

  // Filter out tool_result blocks
  const textContent = contents
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  if (!textContent) return null;

  return {
    id: generateId('user'),
    type: 'user',
    timestamp: new Date(),
    content: textContent,
  };
}

/**
 * Parse assistant message - may return multiple ChatMessages (text + tool uses)
 */
function parseAssistantMessage(msg: SDKAssistantMessage): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (!msg.message?.content) return messages;

  const contents = msg.message.content as ContentBlock[];

  // Extract text blocks
  const textBlocks = contents.filter(
    (b): b is { type: 'text'; text: string } => b.type === 'text'
  );

  // Extract tool use blocks
  const toolUseBlocks = contents.filter(
    (b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
      b.type === 'tool_use'
  );

  // Add text message if exists
  if (textBlocks.length > 0) {
    const textContent = textBlocks.map((b) => b.text).join('\n');
    messages.push({
      id: generateId('assistant'),
      type: 'assistant',
      timestamp: new Date(),
      content: textContent,
      contentBlocks: contents,
    });
  }

  // Add tool use messages
  for (const tool of toolUseBlocks) {
    messages.push({
      id: `tool-${tool.id}`,
      type: 'assistant',
      timestamp: new Date(),
      toolUse: {
        id: tool.id,
        name: tool.name,
        input: tool.input,
        state: 'processing' as ToolState,
      },
    });
  }

  return messages;
}

/**
 * Parse result message
 */
function parseResultMessage(msg: SDKResultMessage): ChatMessage {
  return {
    id: generateId('result'),
    type: 'result',
    timestamp: new Date(),
    resultType: msg.subtype,
    resultText: msg.result || msg.error,
  };
}

/**
 * Update tool state based on tool result
 */
export function updateToolState(
  messages: ChatMessage[],
  toolUseId: string,
  result: unknown,
  isError: boolean
): ChatMessage[] {
  return messages.map((msg) => {
    if (msg.toolUse?.id === toolUseId) {
      return {
        ...msg,
        toolUse: {
          ...msg.toolUse,
          state: isError ? 'error' : 'completed',
          output: isError ? undefined : result,
          error: isError ? String(result) : undefined,
        },
      };
    }
    return msg;
  });
}

/**
 * Parse raw JSONL content from session file
 */
export function parseSessionJSONL(content: string): ChatMessage[] {
  const lines = content.trim().split('\n');
  const messages: ChatMessage[] = [];
  const toolResults: Map<string, { content: unknown; is_error?: boolean }> = new Map();

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
      const parsed = parseSDKMessage(msg);

      if (parsed) {
        const parsedMessages = Array.isArray(parsed) ? parsed : [parsed];

        for (const chatMsg of parsedMessages) {
          // Update tool state if we have a result
          if (chatMsg.toolUse) {
            const result = toolResults.get(chatMsg.toolUse.id);
            if (result) {
              chatMsg.toolUse.state = result.is_error ? 'error' : 'completed';
              chatMsg.toolUse.output = result.is_error ? undefined : result.content;
              chatMsg.toolUse.error = result.is_error ? String(result.content) : undefined;
            }
          }
          messages.push(chatMsg);
        }
      }
    } catch {
      // Skip invalid lines
    }
  }

  return messages;
}
