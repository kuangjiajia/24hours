import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-void/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white border-4 border-void rounded-2xl shadow-[8px_8px_0_0_#0F0F0F] w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-4 border-void">
          <h2 className="font-display text-void text-xl flex items-center gap-2">
            <span>&#9881;</span>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-light-gray transition-colors"
            aria-label="Close modal"
          >
            <span className="text-void text-xl font-bold">&times;</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-void/10 flex justify-end gap-3">
          {footer ?? (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-genz-yellow text-void font-bold rounded-xl border-2 border-void hover:bg-genz-yellow/80 transition-all shadow-[4px_4px_0_0_#0F0F0F] hover:shadow-[2px_2px_0_0_#0F0F0F] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
