import React from 'react';
import { Wifi, Battery } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  showGlassReflection?: boolean;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  title,
  className = '',
  showGlassReflection = false,
}) => {
  return (
    <div className={`relative flex flex-col items-center shrink-0 ${className}`}>
      {/* Title above phone if specified */}
      {title && (
        <span className="font-display font-semibold text-xs text-[#A5B0A6] mb-2 tracking-wide uppercase">
          {title}
        </span>
      )}

      {/* 390x844 Hardware Shell — Responsive to smaller viewports */}
      <div className="relative w-full max-w-[390px] h-[844px] max-h-[90dvh] rounded-3xl sm:rounded-[48px] bg-[#0B0F0C] border-4 sm:border-[10px] border-[#18201A] ring-1 ring-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col select-none">
        {/* Dynamic Island Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50 flex items-center justify-between px-2.5 shadow-md border border-white/5 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#141A15] border border-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#0F2A22] border border-[#C8FF2E]/30" />
        </div>

        {/* Top iOS Status Bar (Safe Area Top: 44px) */}
        <div className="h-11 w-full px-6 flex items-center justify-between text-xs text-[#F4F7F0] font-semibold shrink-0 z-40 bg-transparent pointer-events-none pt-1">
          <span className="text-[13px] font-display font-bold tracking-tight">9:41</span>
          <div className="flex items-center gap-1.5 opacity-90">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <rect x="2" y="16" width="3" height="5" rx="1" />
              <rect x="7" y="12" width="3" height="9" rx="1" />
              <rect x="12" y="8" width="3" height="13" rx="1" />
              <rect x="17" y="4" width="3" height="17" rx="1" />
            </svg>
            <Wifi className="w-3.5 h-3.5" strokeWidth={2.5} />
            <Battery className="w-4 h-4" strokeWidth={2.5} />
          </div>
        </div>

        {/* Inner Phone Viewport Canvas (390 x 844 minus borders) */}
        <div className="relative flex-1 w-full overflow-hidden flex flex-col bg-[#0B0F0C] text-[#F4F7F0]">
          {children}
        </div>

        {/* Bottom iOS Home Indicator Pill (Safe Area Bottom) */}
        <div className="h-6 w-full flex items-center justify-center shrink-0 z-40 bg-transparent pointer-events-none pb-1">
          <div className="w-32 h-1 rounded-full bg-white/30" />
        </div>

        {/* Subtle Diagonal Glass Glare for Dribbble presentation shots */}
        {showGlassReflection && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.07] pointer-events-none rounded-[38px]" />
        )}
      </div>
    </div>
  );
};
