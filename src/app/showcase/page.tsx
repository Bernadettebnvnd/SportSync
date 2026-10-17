'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import '@/design-system/index.css';

const ShowcasePage = dynamic(
  () => import('@/showcase/ShowcasePage').then((mod) => mod.ShowcasePage),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#070A08] flex items-center justify-center text-[#A5B0A6] text-sm">
        Loading SportSync Showcase...
      </div>
    ),
  }
);

export default function ShowcaseRoutePage() {
  return <ShowcasePage />;
}
