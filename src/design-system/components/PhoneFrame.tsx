'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, Battery } from 'lucide-react';
import { getDeviceLocalTimeZone } from '../../lib/useGreeting';

interface PhoneFrameProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  showGlassReflection?: boolean;
}

/**
 * Format the user's actual local device time for the phone status bar.
 * Accurately uses the browser's local timezone (never hardcoded 9:41 or fixed UTC).
 */
function getFormattedDeviceTime(): string {
  if (typeof window === 'undefined') return '';

  try {
    // Check if developer testing mock hour is set
    const mock = window.localStorage.getItem('sportsync_mock_hour');
    if (mock !== null && mock !== '') {
      const parsed = parseInt(mock, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
        const mockDate = new Date();
        mockDate.setHours(parsed);
        mockDate.setMinutes(0);
        return new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        }).format(mockDate);
      }
    }
  } catch {}

  const now = new Date();
  try {
    const timeZone = getDeviceLocalTimeZone();
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    }).format(now);
  } catch {
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  title,
  className = '',
  showGlassReflection = false,
}) => {
  const [deviceTime, setDeviceTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => setDeviceTime(getFormattedDeviceTime());

    // Sync immediately on client mount with actual local device time
    updateTime();

    // Re-check every 10 seconds to keep minutes accurate
    const interval = setInterval(updateTime, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') updateTime();
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', updateTime);
    window.addEventListener('storage', updateTime);
    window.addEventListener('sportsync:timechange', updateTime);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', updateTime);
      window.removeEventListener('storage', updateTime);
      window.removeEventListener('sportsync:timechange', updateTime);
    };
  }, []);

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
          <span className="text-[12px] font-display font-bold tracking-tight">
            {deviceTime || getFormattedDeviceTime() || '12:00'}
          </span>
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
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
};
