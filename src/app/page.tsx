'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type ScreenId } from '@/MobileApp';
import { APP_CONFIG } from '@/config/appConfig';
import { useTheme } from '@/lib/theme';
import '@/design-system/index.css';

const MobileApp = dynamic(
  () => import('@/MobileApp').then((mod) => mod.MobileApp),
  {
    ssr: false,
    loading: () => (
      <div className="w-full flex-1 min-h-[100dvh] flex flex-col items-center justify-center bg-[#0B0F0C] text-[#F4F7F0] p-6 select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-lg shadow-[0_0_24px_rgba(200,255,46,0.3)] animate-pulse">
          {APP_CONFIG.appName.slice(0, 2)}
        </div>
        <div className="mt-3 font-display font-bold text-sm text-[#F4F7F0]">
          {APP_CONFIG.appName}
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
  const [, setActiveScreen] = useState<ScreenId>('auth');
  const [mounted, setMounted] = useState(false);
  const { isLightMode, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      suppressHydrationWarning
      className={`min-h-screen min-h-[100dvh] w-full bg-[#0B0F0C] text-[#F4F7F0] flex flex-col items-center justify-center select-none overflow-x-hidden ${mounted && isLightMode ? 'light' : 'dark'}`}
    >
      {/* Mobile-First Responsive Adaptive Application Shell */}
      <main className="w-full flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-screen min-h-[100dvh] bg-[#0B0F0C] sm:border-x sm:border-white/5 relative flex flex-col shadow-2xl">
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
