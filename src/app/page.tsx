'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type ScreenId } from '@/MobileApp';
import { useTheme } from '@/lib/theme';
import '@/design-system/index.css';

const MobileApp = dynamic(
  () => import('@/MobileApp').then((mod) => mod.MobileApp),
  {
    ssr: false,
    loading: () => (
      <div className="w-full flex-1 min-h-[100dvh] flex flex-col items-center justify-center bg-[#060E0A] text-[#F4F7F0] p-6 select-none">
        <div className="w-64 h-64 flex items-center justify-center mb-2 animate-pulse">
          <img src="/sportsync-full-logo.svg" alt="SportSync" className="w-full h-full object-contain" />
        </div>
        <p className="mt-1 text-xs text-[#A5B0A6]">
          Loading sports experience...
        </p>
      </div>
    ),
  }
);

export default function RootHomePage() {
  const [selectedScreen] = useState<ScreenId | undefined>(undefined);
  const [activeScreen, setActiveScreen] = useState<ScreenId>('landing');
  const [mounted, setMounted] = useState(false);
  const { isLightMode, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isFullWidthLanding = activeScreen === 'landing';

  return (
    <div
      suppressHydrationWarning
      className={`min-h-screen min-h-[100dvh] w-full bg-[#0B0F0C] text-[#F4F7F0] flex flex-col items-center justify-center select-none overflow-x-hidden ${mounted && isLightMode ? 'light' : 'dark'}`}
    >
      {/* Full-Width Responsive Public Landing Page vs. Adaptive Mobile-First Application Shell */}
      <main className="w-full flex-1 flex flex-col items-center justify-center">
        <div
          className={
            isFullWidthLanding
              ? 'w-full min-h-screen min-h-[100dvh] bg-[#0B0F0C] relative flex flex-col'
              : 'w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-screen min-h-[100dvh] bg-[#0B0F0C] sm:border-x sm:border-white/5 relative flex flex-col shadow-2xl'
          }
        >
          <MobileApp
            initialScreen={selectedScreen}
            inPhoneFrame={false}
            onScreenChange={setActiveScreen}
            isLightMode={isLightMode}
            onToggleTheme={toggleTheme}
          />
        </div>
      </main>
    </div>
  );
}
