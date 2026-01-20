import { useRef, useEffect } from 'react';
import type { Log } from '../../types';

interface LogViewerProps {
  logs: Log[];
  onClear?: () => void;
}

export function LogViewer({ logs, onClear }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const levelColors: Record<string, string> = {
    info: 'text-gray-300',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="font-semibold flex items-center gap-2">
          Execution Logs (Live)
        </h3>
        <button
          onClick={onClear}
          className="text-sm text-gray-400 hover:text-white"
        >
          Clear
        </button>
      </div>

      <div
        ref={containerRef}
        className="h-64 overflow-y-auto p-4 font-mono text-sm space-y-1"
      >
        {logs.map((log, index) => (
          <div key={index} className={levelColors[log.level]}>
            <span className="text-gray-500">{formatTime(log.timestamp)}</span>{' '}
            <span>{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-500 text-center py-8">No logs yet</div>
        )}
      </div>
    </div>
  );
}
