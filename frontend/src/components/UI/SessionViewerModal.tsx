import { useEffect, useRef } from 'react';
import { useSessionStream } from '../../hooks/useSessionStream';
import { SessionChatMessage } from './SessionChatMessage';

interface SessionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

/**
 * Loading dots animation component
 */
function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

/**
 * Live indicator component
 */
function LiveIndicator() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <span className="text-green-400 text-xs font-medium uppercase tracking-wide">Live</span>
    </div>
  );
}

export function SessionViewerModal({
  isOpen,
  onClose,
  sessionId,
}: SessionViewerModalProps) {
  const { messages, isLoading, isLive, error } = useSessionStream({
    sessionId,
    enabled: isOpen && !!sessionId,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousOverflowRef = useRef<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current && messages.length > 0) {
      const container = scrollContainerRef.current;
      // Only auto-scroll if user is near the bottom
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom || isLive) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, isLive]);

  // Handle escape key and body overflow
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (previousOverflowRef.current !== null) {
        document.body.style.overflow = previousOverflowRef.current;
        previousOverflowRef.current = null;
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-void/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1e1e1e] border-2 border-void/30 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#252526] rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-purple-400 text-lg">💬</span>
              <h2 className="font-mono text-white text-sm">
                Session: {sessionId.slice(0, 8)}...
              </h2>
            </div>
            {isLive && <LiveIndicator />}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <span className="text-white/60 text-xl font-bold hover:text-white">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-white/60 font-mono text-sm">Loading session...</span>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-red-400">
                <span className="text-4xl">❌</span>
                <span className="font-mono text-sm">{error}</span>
              </div>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="h-full overflow-y-auto px-6 py-4 space-y-4"
            >
              {messages.map((msg) => (
                <SessionChatMessage key={msg.id} message={msg} />
              ))}

              {/* Streaming indicator */}
              {isLive && (
                <div className="flex items-center gap-3 text-white/50 py-2">
                  <LoadingDots />
                  <span className="text-sm">Claude is working...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#252526] rounded-b-2xl flex items-center justify-between">
          <span className="text-white/40 font-mono text-xs">
            {messages.length > 0 ? `${messages.length} messages` : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-lg hover:bg-purple-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
