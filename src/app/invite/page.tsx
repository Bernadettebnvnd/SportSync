'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function InviteRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code') || searchParams.get('invite') || '';
    if (code) {
      router.replace(`/?invite=${encodeURIComponent(code)}`);
    } else {
      router.replace('/');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center text-[#A5B0A6] text-xs">
      Resolving invitation...
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0F0C]" />}>
      <InviteRedirectContent />
    </Suspense>
  );
}

