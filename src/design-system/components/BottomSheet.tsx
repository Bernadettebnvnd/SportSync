import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = 'max-h-[85vh]',
  className = '',
}) => {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 480) {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center select-none animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Frosted Bottom Sheet Container */}
      <div
        className={`relative w-full rounded-t-[32px] bg-[#141A15]/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-12px_48px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-10 transition-transform ${maxHeight} ${className}`}
      >
        {/* Drag Pill Handle */}
        <div className="w-full pt-3 pb-2 flex flex-col items-center shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors" />
        </div>

        {/* Optional Title Bar */}
        {title && (
          <div className="px-5 py-2 flex items-center justify-between border-b border-white/5 shrink-0">
            <h3 className="font-display font-bold text-lg text-[#F4F7F0]">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto no-scrollbar flex-1 pb-10">
          {children}
        </div>
      </div>
    </div>
  );
};
