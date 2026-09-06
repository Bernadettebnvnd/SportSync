import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { BottomDock } from '@/components/layout/BottomDock';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MonkeySports | Multi-Sport Discovery, Court Booking & Live Open Play',
  description:
    'High-energy multi-sport discovery, live open-play queues, court bookings, and matchmaking guided by an energetic monkey mascot.',
  keywords: [
    'badminton',
    'pickleball',
    'court booking',
    'open play',
    'manila sports',
    'live queues',
    'padel',
    'matchmaking',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Leaflet CSS for map rendering */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#FAFAF7] text-[#171717] pb-20 md:pb-0">
        <Navbar />
        <main className="flex-1">{children}</main>
        <BottomDock />
      </body>
    </html>
  );
}
