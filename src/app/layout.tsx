import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#1E4A32',
};

export const metadata: Metadata = {
  title: 'Matchi',
  description: 'Court booking and live open play queues.',
  keywords: [
    'matchi',
    'court booking',
    'badminton',
    'pickleball',
    'padel',
    'open play',
    'philippines sports',
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
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-[#1A241E] pb-20 md:pb-0 selection:bg-[#2D724E]/20">
        <Navbar />
        <main className="flex-1">{children}</main>
        <BottomDock />
      </body>
    </html>
  );
}
