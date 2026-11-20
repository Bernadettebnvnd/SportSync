'use client';

import React from 'react';
import { APP_CONFIG } from '@/config/appConfig';

export interface LandingFooterProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isLightMode?: boolean;
}

const SECTION_LINKS = [
  { label: 'Home', href: '#home', id: 'home' },
  { label: 'About', href: '#about', id: 'about' },
  { label: 'Features', href: '#features', id: 'features' },
  { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
] as const;

export const LandingFooter: React.FC<LandingFooterProps> = ({
  onSignIn,
  onGetStarted,
  isLightMode = false,
}) => {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="w-full border-t border-white/10 bg-[#0B0F0C] pt-12 pb-10 sm:pt-16 sm:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/10">
          {/* Brand Column */}
          <div className="md:col-span-6 space-y-4">
            <a
              href="#home"
              onClick={(e) => scrollToSection(e, 'home')}
              aria-label="SportSync Home"
              className={`inline-flex items-center transition-transform press-scale ${
                isLightMode
                  ? 'px-3 py-1.5 rounded-xl border border-black/15 shadow-sm'
                  : ''
              }`}
              style={isLightMode ? { backgroundColor: '#0A120D' } : undefined}
            >
              <img
                src="/sportsync-name.svg"
                alt="SportSync"
                className="h-7 sm:h-8 w-auto object-contain select-none pointer-events-none"
              />
            </a>

            <p className="font-display font-bold text-sm text-[#C8FF2E] tracking-wide">
              {APP_CONFIG.tagline}
            </p>

            <p className="text-xs sm:text-sm text-[#A5B0A6] leading-relaxed max-w-md">
              Local sports matchmaking platform built to help recreational athletes find
              teammates, organize pickup games, complete rosters, and connect with
              sports facilities.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#F4F7F0]">
              Navigation
            </h3>
            <ul className="space-y-2.5">
              {SECTION_LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    onClick={(e) => scrollToSection(e, link.id)}
                    className="text-xs sm:text-sm text-[#A5B0A6] hover:text-[#C8FF2E] transition-colors font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account / Access Links */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#F4F7F0]">
              Platform Access
            </h3>
            <ul className="space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="text-xs sm:text-sm text-[#A5B0A6] hover:text-[#C8FF2E] transition-colors font-medium text-left"
                >
                  Get Started
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="text-xs sm:text-sm text-[#A5B0A6] hover:text-[#C8FF2E] transition-colors font-medium text-left"
                >
                  Sign In
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6F7B71]">
          <p>&copy; 2026 SportSync. All rights reserved.</p>
          <p className="font-medium text-[#A5B0A6]">
            Find Your Game. Build Your Team. Play Together.
          </p>
        </div>
      </div>
    </footer>
  );
};
