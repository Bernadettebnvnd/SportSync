'use client';

import React from 'react';
import { MobileApp } from '@/MobileApp';
import '@/design-system/index.css';

export default function SportSyncStandalonePage() {
  return (
    <div className="min-h-screen bg-[#070A08] flex items-center justify-center p-0 md:p-6 select-none overflow-hidden">
      <div className="w-full max-w-[420px] h-screen md:h-[860px] flex flex-col items-center justify-center">
        <MobileApp initialScreen="home" inPhoneFrame={true} />
      </div>
    </div>
  );
}
