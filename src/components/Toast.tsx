import React, { useEffect } from 'react';
import { Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-teal-500/40 flex items-center justify-between gap-3 animate-slide-left">
      <div className="flex items-center gap-2.5 text-xs font-medium">
        <Info className="w-4 h-4 text-teal-400 shrink-0" />
        <span>{message}</span>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
