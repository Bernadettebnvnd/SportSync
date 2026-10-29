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
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 pb-28 md:pb-12">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F4F7F0]">
          Profile
        </h1>
        <p className="text-xs text-[#A5B0A6]">
          Personal preferences and account management
        </p>
      </div>

      {/* Player Passport Card */}
      <div className="rounded-3xl border border-white/10 bg-[#141A15] p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
            alt={currentUser.full_name}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-[#C8FF2E]/30 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#F4F7F0] truncate">
                {currentUser.full_name}
              </h2>
              {currentUser.nickname && (
                <span className="shrink-0 text-xs font-medium text-[#A5B0A6]">
                  &ldquo;{currentUser.nickname}&rdquo;
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#A5B0A6] mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
              <span className="truncate">{currentUser.city || 'Philippines'}</span>
            </div>

            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap text-xs">
              <span className="inline-flex items-center rounded-lg bg-[#C8FF2E]/10 border border-[#C8FF2E]/25 px-2.5 py-0.5 text-[11px] font-semibold text-[#C8FF2E]">
                {getSportDisplayName(currentUser.primary_sport)}
              </span>
              <span className="inline-flex items-center rounded-lg bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-[#A5B0A6] capitalize">
                {currentUser.skill_level.replace('_', ' ')}
              </span>
              <span className="inline-flex items-center rounded-lg bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-[#A5B0A6] capitalize">
                {currentUser.preferred_format}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C8FF2E] hover:text-[#b4eb25] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Edit Preferences</span>
          </button>
        </div>
      </div>

      {/* Grouped Settings List */}
      <div className="space-y-5">
        {/* Group 1: Activity */}
        <div>
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] mb-2">
            Activity
          </h3>
          <div className="rounded-2xl border border-white/10 bg-[#141A15] divide-y divide-white/10 overflow-hidden shadow-sm">
            <Link
              href="/bookings"
              className="flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#C8FF2E]/10 flex items-center justify-center text-[#C8FF2E] shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#F4F7F0] block">
                    My Bookings
                  </span>
                  <span className="text-xs text-[#A5B0A6]">
                    Court passes &amp; upcoming reservations
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {myBookings.length > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-[#C8FF2E] text-black text-[10px] font-bold h-5 min-w-5 px-1.5">
                    {myBookings.length}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-[#A5B0A6] group-hover:text-[#F4F7F0] transition-colors" />
              </div>
            </Link>
          </div>
        </div>

        {/* Group 2: Host Operations */}
        <div>
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] mb-2">
            Facility Management
          </h3>
          <div className="rounded-2xl border border-white/10 bg-[#141A15] divide-y divide-white/10 overflow-hidden shadow-sm">
            {isHost ? (
              <Link
                href="/organizer"
                className="flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#F4F7F0] block">
                      Facility Host Desk
                    </span>
                    <span className="text-xs text-[#A5B0A6]">
                      Manage courts, schedules, and revenue
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 uppercase">
                    Host Active
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#A5B0A6] group-hover:text-[#F4F7F0] transition-colors" />
                </div>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsOwnerModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#F4F7F0] block">
                      Register as Facility Host
                    </span>
                    <span className="text-xs text-[#A5B0A6]">
                      List your courts and monetize empty hours
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#A5B0A6] group-hover:text-[#F4F7F0] transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Group 3: Account */}
        <div>
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] mb-2">
            Account
          </h3>
          <div className="rounded-2xl border border-white/10 bg-[#141A15] divide-y divide-white/10 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#F4F7F0] block">
                    Account &amp; Security
                  </span>
                  <span className="text-xs text-[#A5B0A6]">
                    Sign in, switch account, or update credentials
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#A5B0A6] group-hover:text-[#F4F7F0] transition-colors" />
            </button>
          </div>
        </div>

        {/* Group 4: Developer Diagnostics (localhost only) */}
        {process.env.NODE_ENV !== 'production' && (
          <div>
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] mb-2">
              Developer Mode (Localhost)
            </h3>
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] divide-y divide-white/10 overflow-hidden">
              <button
                type="button"
                onClick={async () => {
                  await resetOnboardingState();
                  router.push('/onboarding');
                }}
                className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#F4F7F0]">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset Onboarding State</span>
                </div>
                <span className="text-[10px] text-[#A5B0A6]">Restart flow</span>
              </button>

              <button
                type="button"
                onClick={toggleMode}
                className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#F4F7F0]">
                  <RefreshCw className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  <span>Toggle Role Mode ({activeMode})</span>
                </div>
                <span className="text-[10px] text-[#A5B0A6]">
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
