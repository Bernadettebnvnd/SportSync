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
    <div className="min-h-screen bg-[#070A08] flex items-center justify-center p-0 md:p-6 select-none overflow-hidden">
      <div className="w-full max-w-[420px] h-screen md:h-[860px] flex flex-col items-center justify-center">
        <MobileApp initialScreen="home" inPhoneFrame={true} />
      </div>
    </div>
  );
}
