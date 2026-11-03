'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function DynamicInvitePage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const rawCode = params?.code;
    const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
    if (code) {
      router.replace(`/?invite=${encodeURIComponent(code)}`);
    } else {
      router.replace('/');
    }
  }, [router, params]);

  return (
    <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center text-[#A5B0A6] text-xs">
      Resolving invitation...
    </div>
  );
}

