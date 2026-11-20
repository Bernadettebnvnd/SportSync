'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import '@/design-system/index.css';

const MobileApp = dynamic(
  () => import('@/MobileApp').then((mod) => mod.MobileApp),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-[420px] h-screen md:h-[860px] flex flex-col items-center justify-center bg-[#070A08] text-[#F4F7F0]">
        <div className="w-10 h-10 rounded-xl bg-[#C8FF2E] animate-pulse flex items-center justify-center text-black font-black text-sm">
          SS
        </div>
      </div>
    ),
  }
);

export default function SportSyncStandalonePage() {
  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#0B0F0C] flex items-center justify-center select-none overflow-x-hidden">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-screen min-h-[100dvh] bg-[#0B0F0C] sm:border-x sm:border-white/5 relative flex flex-col shadow-2xl">
        <MobileApp initialScreen="home" inPhoneFrame={false} />
      </div>
    </div>
  );
}
