import { useEffect, useRef } from 'react';

interface TaskDetailExpandedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function TaskDetailExpandedModal({
  isOpen,
  onClose,
  children,
}: TaskDetailExpandedModalProps) {
  const previousOverflowRef = useRef<string | null>(null);

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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-void/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-6xl h-[85vh] animate-in fade-in zoom-in duration-200">
        <div className="relative h-full flex flex-col min-h-0 bg-white rounded-bento overflow-hidden border-2 border-void/10 shadow-[8px_8px_0_0_#0F0F0F]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 text-2xl text-void/70 hover:text-void/80 hover:bg-void/5 transition-all duration-200 ease-out hover:scale-105"
            aria-label="Close detail view"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
