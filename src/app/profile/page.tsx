'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { OwnerOnboardingModal } from '@/components/onboarding/OwnerOnboardingModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { getSportDisplayName } from '@/lib/utils';
import {
  MapPin,
  Calendar,
  Building2,
  User,
  Sparkles,
  ChevronRight,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, bookings, resetOnboardingState, activeMode, toggleMode } = useMatchiStore();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const myBookings = bookings.filter((b) => b.user_id === currentUser.id);
  const isHost = currentUser.role === 'venue_owner' || currentUser.role === 'organizer' || currentUser.role === 'admin';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10 space-y-6 pb-28 md:pb-12">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A241E]">
          Profile
        </h1>
        <p className="text-xs text-[#65756B]">
          Personal preferences and account management
        </p>
      </div>

      {/* Player Passport Card - Quiet Apple Design */}
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
            alt={currentUser.full_name}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-[#2D724E]/20 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#1A241E] truncate">
                {currentUser.full_name}
              </h2>
              {currentUser.nickname && (
                <span className="shrink-0 text-xs font-medium text-[#65756B]">
                  &ldquo;{currentUser.nickname}&rdquo;
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#65756B] mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#2D724E] shrink-0" />
              <span className="truncate">{currentUser.city || 'Philippines'}</span>
            </div>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
              <span className="inline-flex items-center rounded-md bg-[#2D724E]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2D724E]">
                {getSportDisplayName(currentUser.primary_sport)}
              </span>
              <span className="inline-flex items-center rounded-md bg-[#FAF8F5] border border-[#E8E5DF] px-2 py-0.5 text-[11px] font-medium text-[#65756B] capitalize">
                {currentUser.skill_level.replace('_', ' ')}
              </span>
              <span className="inline-flex items-center rounded-md bg-[#FAF8F5] border border-[#E8E5DF] px-2 py-0.5 text-[11px] font-medium text-[#65756B] capitalize">
                {currentUser.preferred_format}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#E8E5DF]/60 flex justify-end">
          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D724E] hover:text-[#1E4A32] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Edit Preferences</span>
          </button>
        </div>
      </div>

      {/* Apple-style Grouped Settings List */}
      <div className="space-y-4">
        {/* Group 1: Activity */}
        <div>
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#65756B] mb-2">
            Activity
          </h3>
          <div className="rounded-2xl border border-[#E8E5DF] bg-white divide-y divide-[#E8E5DF] overflow-hidden shadow-2xs">
            <Link
              href="/bookings"
              className="flex items-center justify-between p-4 hover:bg-[#FAF8F5] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#2D724E]/10 flex items-center justify-center text-[#2D724E] shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#1A241E] block">
                    My Bookings
                  </span>
                  <span className="text-xs text-[#65756B]">
                    Court passes &amp; upcoming reservations
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {myBookings.length > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-[#2D724E] text-white text-[10px] font-bold h-5 min-w-5 px-1.5">
                    {myBookings.length}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-[#65756B] group-hover:text-[#1A241E] transition-colors" />
              </div>
            </Link>
          </div>
        </div>

        {/* Group 2: Host Operations */}
        <div>
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#65756B] mb-2">
            Facility Management
          </h3>
          <div className="rounded-2xl border border-[#E8E5DF] bg-white divide-y divide-[#E8E5DF] overflow-hidden shadow-2xs">
            {isHost ? (
              <Link
                href="/organizer"
                className="flex items-center justify-between p-4 hover:bg-[#FAF8F5] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#C87D43]/10 flex items-center justify-center text-[#C87D43] shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#1A241E] block">
                      Facility Host Desk
                    </span>
                    <span className="text-xs text-[#65756B]">
                      Manage courts, schedules, and revenue
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#C87D43]/10 text-[#C87D43] uppercase">
                    Host Active
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#65756B] group-hover:text-[#1A241E] transition-colors" />
                </div>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsOwnerModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#FAF8F5] transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#C87D43]/10 flex items-center justify-center text-[#C87D43] shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#1A241E] block">
                      Register as Facility Host
                    </span>
                    <span className="text-xs text-[#65756B]">
                      List your courts and monetize empty hours
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#65756B] group-hover:text-[#1A241E] transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Group 3: Account */}
        <div>
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#65756B] mb-2">
            Account
          </h3>
          <div className="rounded-2xl border border-[#E8E5DF] bg-white divide-y divide-[#E8E5DF] overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#FAF8F5] transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[#1A241E] shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#1A241E] block">
                    Account &amp; Security
                  </span>
                  <span className="text-xs text-[#65756B]">
                    Sign in, switch account, or update credentials
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#65756B] group-hover:text-[#1A241E] transition-colors" />
            </button>
          </div>
        </div>

        {/* Group 4: Developer Diagnostics (localhost only) */}
        {process.env.NODE_ENV !== 'production' && (
          <div>
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#65756B] mb-2">
              Developer Mode (Localhost)
            </h3>
            <div className="rounded-2xl border border-dashed border-[#E8E5DF] bg-[#FAF8F5] divide-y divide-[#E8E5DF] overflow-hidden">
              <button
                type="button"
                onClick={async () => {
                  await resetOnboardingState();
                  router.push('/onboarding');
                }}
                className="w-full flex items-center justify-between p-3.5 hover:bg-white/80 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#1A241E]">
                  <RotateCcw className="w-3.5 h-3.5 text-[#C87D43]" />
                  <span>Reset Onboarding State</span>
                </div>
                <span className="text-[10px] text-[#65756B]">Restart flow</span>
              </button>

              <button
                type="button"
                onClick={toggleMode}
                className="w-full flex items-center justify-between p-3.5 hover:bg-white/80 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#1A241E]">
                  <RefreshCw className="w-3.5 h-3.5 text-[#2D724E]" />
                  <span>Toggle Role Mode ({activeMode})</span>
                </div>
                <span className="text-[10px] text-[#65756B]">
                  {activeMode === 'manage' ? 'Active: Host' : 'Active: Player'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Preferences Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Facility Host Registration Modal */}
      <OwnerOnboardingModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
