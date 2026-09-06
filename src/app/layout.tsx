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
  maximumScale: 5,
  themeColor: '#1E4A32',
};

export const metadata: Metadata = {
  title: 'Matchi | Multi-Sport Discovery, Court Booking & Live Open Play',
  description:
    'Matchi is the premier high-energy sports platform. Discover badminton doubles & singles, pickleball, and padel courts, join live queue rotations, and pay flexibly via E-Wallets, Banks, or Cash.',
  keywords: [
    'matchi',
    'badminton doubles',
    'badminton singles',
    'pickleball',
    'court booking',
    'open play queue',
    'manila sports',
    'padel club',
    'gcash booking',
    'cash at venue',
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
