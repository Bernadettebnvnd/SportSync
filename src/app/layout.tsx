import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0F0C',
};

export const metadata: Metadata = {
  title: 'SportSync | Find Players. Play Together.',
  description: 'Find players, complete incomplete rosters, and join local recreational games.',
  manifest: '/manifest.json',
  keywords: [
    'SportSync',
    'sports matchmaking',
    'find players',
    'pickup games',
    'roster completion',
    'football',
    'basketball',
    'tennis',
    'pickleball',
    'badminton',
    'volleyball',
    'billiards',
    'darts',
  ],
  openGraph: {
    title: 'SportSync | Find Players. Play Together.',
    description: 'Sports matchmaking, roster completion, and local game discovery platform.',
    siteName: 'SportSync',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] selection:bg-[#C8FF2E]/30"
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
