'use client';

import React from 'react';
import { X, Shield, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { APP_CONFIG } from '@/config/appConfig';

interface GuestPromptModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onSignIn: () => void;
  onCreateAccount: () => void;
}

export function GuestPromptModal({
  isOpen,
  title = 'Join SportSync to Play',
  message = 'Create a free SportSync account to join games, reserve court slots, track match scores, and complete rosters.',
  onClose,
  onSignIn,
  onCreateAccount,
}: GuestPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#141A15] border border-white/10 p-6 shadow-2xl text-center space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#0F2A22] border border-[#C8FF2E]/30 flex items-center justify-center shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-sm">
            {APP_CONFIG.appName.slice(0, 2)}
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-1.5">
          <h3 className="font-display font-black text-lg text-[#F4F7F0] tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#A5B0A6] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onCreateAccount}
            className="w-full py-3 rounded-2xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(200,255,46,0.25)] press-scale"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
          </button>

          <button
            type="button"
            onClick={onSignIn}
            className="w-full py-3 rounded-2xl bg-[#1C241E] hover:bg-[#263028] text-[#F4F7F0] font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/10 press-scale"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-[#A5B0A6] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#6F7B71] pt-1 border-t border-white/5">
          <Shield className="w-3 h-3 text-[#3DDC84]" />
          <span>Quick &amp; secure • SportSync account</span>
        </div>
      </div>
    </div>
  );
}
