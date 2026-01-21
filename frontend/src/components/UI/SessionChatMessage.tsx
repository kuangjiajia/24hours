import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types/session';

interface SessionChatMessageProps {
  message: ChatMessage;
}

/**
 * Tool state indicator component
 */
function ToolStateIndicator({ state }: { state: string }) {
  const stateConfig = {
    processing: {
      icon: '⟳',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      label: 'Processing',
    },
    ready: {
      icon: '⚙',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      label: 'Ready',
    },
    completed: {
      icon: '✓',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      label: 'Completed',
    },
    error: {
      icon: '✗',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      label: 'Error',
    },
  };

  const config = stateConfig[state as keyof typeof stateConfig] || stateConfig.ready;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}
    >
      <span className={state === 'processing' ? 'animate-spin' : ''}>{config.icon}</span>
      {config.label}
    </span>
  );
}

/**
 * Tool call card component
 */
function ToolCallCard({ toolUse }: { toolUse: NonNullable<ChatMessage['toolUse']> }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-[#1e1e1e] overflow-hidden my-2">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-purple-400 text-lg">🔧</span>
          <span className="font-mono text-sm text-white/90">{toolUse.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ToolStateIndicator state={toolUse.state} />
          <span className="text-white/40 text-sm">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-white/10 px-4 py-3 space-y-3">
          {/* Input */}
          <div>
            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Input</div>
            <pre className="bg-black/30 rounded-lg p-3 text-xs font-mono text-white/80 overflow-x-auto">
              {JSON.stringify(toolUse.input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {toolUse.output && (
            <div>
              <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Output</div>
              <pre className="bg-black/30 rounded-lg p-3 text-xs font-mono text-white/80 overflow-x-auto max-h-64 overflow-y-auto">
                {typeof toolUse.output === 'string'
                  ? toolUse.output
                  : JSON.stringify(toolUse.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {toolUse.error && (
            <div>
              <div className="text-xs text-red-400 uppercase tracking-wide mb-1">Error</div>
              <pre className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs font-mono text-red-300 overflow-x-auto">
                {toolUse.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * User message bubble
 */
function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-[#f4f4f4] text-gray-900 rounded-3xl px-4 py-3">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

/**
 * Assistant message with Markdown rendering
 */
function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          components={{
            pre: ({ children }) => (
              <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto not-prose">
                {children}
              </pre>
            ),
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code className="text-sm font-mono text-white/90" {...props}>
                  {children}
                </code>
              );
            },
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

/**
 * System message (session init, etc.)
 */
function SystemMessage({ message }: { message: ChatMessage }) {
  if (message.subtype === 'init') {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5">
          <span className="text-purple-400 text-xs font-mono">
            Session: {message.sessionId?.slice(0, 8)}...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-2">
      <span className="text-white/40 text-xs">{message.content}</span>
    </div>
  );
}

/**
 * Result message (completion/error)
 */
function ResultMessage({ message }: { message: ChatMessage }) {
  const isSuccess = message.resultType === 'success';
  const isError = message.resultType === 'error';

  return (
    <div className="flex justify-center my-4">
      <div
        className={`rounded-full px-4 py-1.5 ${
          isSuccess
            ? 'bg-green-500/10 border border-green-500/20'
            : isError
              ? 'bg-red-500/10 border border-red-500/20'
              : 'bg-yellow-500/10 border border-yellow-500/20'
        }`}
      >
        <span
          className={`text-xs font-medium ${
            isSuccess ? 'text-green-400' : isError ? 'text-red-400' : 'text-yellow-400'
          }`}
        >
          {isSuccess ? '✓ Completed' : isError ? '✗ Failed' : '⚠ Interrupted'}
        </span>
      </div>
    </div>
  );
}

/**
 * Main SessionChatMessage component
 */
export function SessionChatMessage({ message }: SessionChatMessageProps) {
  // Tool use card
  if (message.toolUse) {
    return <ToolCallCard toolUse={message.toolUse} />;
  }

  // Skip user messages - only show AI messages
  if (message.type === 'user') {
    return null;
  }

  // Assistant message
  if (message.type === 'assistant' && message.content) {
    return <AssistantMessage content={message.content} />;
  }

  // System message
  if (message.type === 'system') {
    return <SystemMessage message={message} />;
  }

  // Result message
  if (message.type === 'result') {
    return <ResultMessage message={message} />;
  }

  return null;
}
