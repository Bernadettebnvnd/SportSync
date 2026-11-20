'use client';

import React, { Suspense } from 'react';
import { ResetPasswordScreen } from '@/screens/onboarding/ResetPasswordScreen';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F0C] text-[#F4F7F0] flex flex-col items-center justify-center p-6 select-none">
          <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 text-[#C8FF2E] flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-xs text-[#A5B0A6]">Loading password recovery...</p>
        </div>
      }
    >
      <ResetPasswordScreen />
    </Suspense>
  );
}
