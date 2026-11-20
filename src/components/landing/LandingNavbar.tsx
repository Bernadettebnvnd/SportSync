'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/design-system/components/Button';

export interface LandingNavbarProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isLightMode?: boolean;
  onToggleTheme?: () => void;
}

const NAV_LINKS = [
  { label: 'Home', href: '#home', id: 'home' },
  { label: 'About', href: '#about', id: 'about' },
  { label: 'Features', href: '#features', id: 'features' },
  { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
] as const;

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onSignIn,
  onGetStarted,
  isLightMode = false,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('home');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);

      const sections = ['how-it-works', 'features', 'about', 'home'];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-[#0B0F0C]/90 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.28)]'
          : 'bg-[#0B0F0C]/75 backdrop-blur-md border-b border-white/5'
      }`}
    >
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Official Horizontal Wordmark (/sportsync-name.svg) */}
        <a
          href="#home"
          onClick={(e) => scrollToSection(e, 'home')}
          aria-label="SportSync Home"
          className={`flex items-center shrink-0 transition-transform duration-150 press-scale ${
            isLightMode
              ? 'px-3 py-1.5 rounded-xl border border-black/15 shadow-sm'
              : ''
          }`}
          style={isLightMode ? { backgroundColor: '#0A120D' } : undefined}
        >
          <img
            src="/sportsync-name.svg"
            alt="SportSync"
            className="h-6 sm:h-7 md:h-8 w-auto object-contain select-none pointer-events-none"
          />
        </a>

        {/* Center: Smooth-Scroll Navigation Links (Desktop) */}
        <nav
          aria-label="Landing page navigation"
          className="hidden md:flex items-center gap-1 rounded-full bg-[#141A15]/90 border border-white/10 px-2 py-1.5"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.id)}
                className={`relative px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1C241E] text-[#C8FF2E] shadow-xs'
                    : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Right: Theme Toggle + Auth CTAs */}
        <div className="hidden md:flex items-center gap-2.5 lg:gap-3">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              title={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              className="w-10 h-10 rounded-full bg-[#141A15] border border-white/10 text-[#A5B0A6] hover:text-[#F4F7F0] hover:border-white/20 flex items-center justify-center transition-all press-scale"
            >
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}

          <Button
            variant="ghost"
            size="md"
            onClick={onSignIn}
            className="font-semibold text-sm px-4 text-[#F4F7F0] hover:bg-[#1C241E]"
          >
            Sign In
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={onGetStarted}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="font-display font-bold shadow-[0_0_20px_rgba(200,255,46,0.22)]"
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Controls: Theme Toggle + Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              className="w-10 h-10 rounded-full bg-[#141A15] border border-white/10 text-[#A5B0A6] hover:text-[#F4F7F0] flex items-center justify-center transition-colors press-scale"
            >
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="w-10 h-10 rounded-full bg-[#141A15] border border-white/10 text-[#F4F7F0] flex items-center justify-center transition-colors press-scale"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden overflow-hidden border-t border-white/10 bg-[#0B0F0C]/95 backdrop-blur-2xl"
          >
            <div className="px-4 pt-3 pb-6 space-y-4">
              {/* Mobile Nav Brand Header */}
              <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-white/5">
                <div
                  className={`inline-flex items-center ${
                    isLightMode
                      ? 'px-2.5 py-1 rounded-lg border border-black/15'
                      : ''
                  }`}
                  style={isLightMode ? { backgroundColor: '#0A120D' } : undefined}
                >
                  <img
                    src="/sportsync-name.svg"
                    alt="SportSync"
                    className="h-5 w-auto object-contain select-none"
                  />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F7B71]">
                  Navigation
                </span>
              </div>

              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const isActive = activeSection === link.id;
                  return (
                    <a
                      key={link.id}
                      href={link.href}
                      onClick={(e) => scrollToSection(e, link.id)}
                      className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-colors flex items-center justify-between ${
                        isActive
                          ? 'bg-[#1C241E] text-[#C8FF2E]'
                          : 'text-[#F4F7F0] hover:bg-[#141A15]'
                      }`}
                    >
                      <span>{link.label}</span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-[#C8FF2E]" />
                      )}
                    </a>
                  );
                })}
              </nav>

              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2.5">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignIn();
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGetStarted();
                  }}
                  className="font-display font-bold"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
