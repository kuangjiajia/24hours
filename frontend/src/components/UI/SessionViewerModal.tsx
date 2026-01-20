import { useEffect, useRef, useState } from 'react';

interface SessionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export function SessionViewerModal({
  isOpen,
  onClose,
  sessionId,
}: SessionViewerModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && sessionId) {
      setLoading(true);
      setError(null);

      fetch(`/api/claude/sessions/${sessionId}/file`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load session: ${res.status}`);
          }
          return res.text();
        })
        .then((data) => {
          setContent(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [isOpen, sessionId]);

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
      <div className="relative bg-[#1e1e1e] border-2 border-void/30 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#252526] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-purple-400 text-lg">📄</span>
            <h2 className="font-mono text-white text-sm">
              Session: {sessionId}
            </h2>
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
          {loading ? (
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
            <div className="h-full overflow-auto">
              <pre className="p-4 font-mono text-xs leading-relaxed text-[#d4d4d4] whitespace-pre-wrap">
                <code>{content}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#252526] rounded-b-2xl flex items-center justify-between">
          <span className="text-white/40 font-mono text-xs">
            {content ? `${content.split('\n').length} lines` : ''}
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
