'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';
import { ReceiptReviewModal } from '@/components/payments/ReceiptReviewModal';
import { ScoreModal } from '@/components/queue/ScoreModal';
import { OwnerOnboardingModal } from '@/components/onboarding/OwnerOnboardingModal';
import { SportSyncBrandLogo } from '@/components/ui/SportSyncBrandLogo';
import { useTheme } from '@/lib/theme';
import { getLocalStoredVenues } from '@/lib/services/venues';
import { Venue, Payment, Match, EmptyCourtOpportunity, SportType, Court, Booking } from '@/types';
import { addNotification } from '@/lib/notifications';
import {
  formatCurrency,
  formatTimeAgo,
  getPaymentMethodName,
  getSportDisplayName,
  calculateBookingFees,
} from '@/lib/utils';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Banknote,
  Zap,
  TrendingUp,
  Eye,
  Play,
  Check,
  Calendar,
  Shield,
  CreditCard,
  BarChart3,
  Flame,
  UserPlus,
  Plus,
  MapPin,
  Building2,
  User,
  Users,
  Edit3,
  X,
  AlertTriangle,
  ChevronDown,
  LogOut,
  Layers,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';

export type OrganizerTab = 'overview' | 'games' | 'courts' | 'profile' | 'bookings' | 'monetize' | 'queue_ops' | 'payments';

export function resolveCustomerInfo(b: any) {
  if (!b) return { name: 'Customer', email: 'No email', phone: 'No phone' };

  let customerName = b.user?.full_name;
  let customerEmail = b.user?.email;
  let customerPhone = b.user?.phone;

  if (b.notes && typeof b.notes === 'string') {
    const match = b.notes.match(/\[CUSTOMER:(.*?)\|(.*?)\|(.*?)\]/);
    if (match) {
      if (!customerName || customerName === 'Customer') customerName = match[1]?.trim();
      if (!customerEmail) customerEmail = match[2]?.trim();
      if (!customerPhone) customerPhone = match[3]?.trim();
    }
  }

  const name =
    customerName && customerName !== 'Customer'
      ? customerName
      : b.customer_name || b.customerName || (b.user_id ? `Player (${b.user_id.slice(0, 8)})` : 'Customer');

  const email =
    customerEmail || b.customer_email || b.customerEmail || 'No email';

  const phone =
    customerPhone || b.customer_phone || b.customerPhone || 'No phone';

  return { name, email, phone };
}

function OrganizerDashboardContent() {
  const {
    currentUser,
    venues,
    courts,
    sessions,
    queues,
    matches,
    bookings,
    payments,
    emptyOpportunities,
    assignQueueToCourt,
    joinQueue,
    updateBookingStatus,
    createOpenPlaySession,
    refreshBookings,
    refreshVenues,
    addCourt,
    updateVenueProfile,
    logoutUser,
  } = useMatchiStore();
  const { isLightMode } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_role') : null;

  React.useEffect(() => {
    setMounted(true);
    const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('sportsync_logged_out') === 'true';
    const isGuest = isLoggedOut || !currentUser.id || currentUser.id === '' || currentUser.id === 'usr_guest_01' || currentUser.full_name === 'Guest Player';
    if (isLoggedOut || (isGuest && !storedRole)) {
      router.replace('/');
    }
  }, [currentUser.id, currentUser.full_name, storedRole, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sportsync_logged_out', 'true');
        const authKeys = [
          'sportsync_user_id',
          'matchi_user_id',
          'sportsync_user_email',
          'sportsync_user_role',
          'matchi_user_role',
          'sportsync_user_name',
          'matchi_user_name',
          'sportsync_user_nickname',
          'matchi_user_nickname',
          'sportsync_user_profile',
          'sideline_user_profile',
          'sportsync_auth_user',
          'sportsync_pending_onboarding',
          'sportsync_onboarding_completed',
          'matchi_onboarding_completed',
          'sportsync_user_city',
          'sportsync_user_location',
          'sportsync_user_sports',
          'sportsync_user_skill',
          'sportsync_user_availability',
          'sportsync_facility_venue_id',
          'sportsync_notifications',
          'sportsync_sent_notifications',
          'sportsync-auth-token',
          'sb-access-token',
        ];
        authKeys.forEach((k) => localStorage.removeItem(k));
        const dynamicKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith('sportsync_venue_id_') ||
              key.startsWith('sportsync_chat_') ||
              key.startsWith('sb-') ||
              key.startsWith('supabase.'))
          ) {
            dynamicKeys.push(key);
          }
        }
        dynamicKeys.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
      }
      await logoutUser();
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = '/?auth=signin';
      }
    }
  };

  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedScoreMatch, setSelectedScoreMatch] = useState<Match | null>(null);
  const [walkInName, setWalkInName] = useState('');
  const [walkInFormat, setWalkInFormat] = useState<'doubles' | 'singles'>('doubles');
  const [activeTab, setActiveTab] = useState<OrganizerTab>('overview');
  const [monetizeSuccessMessage, setMonetizeSuccessMessage] = useState<string | null>(null);

  // Sync tab with URL search parameter
  React.useEffect(() => {
    const tabParam = searchParams.get('tab') as OrganizerTab | null;
    if (
      tabParam &&
      ['overview', 'games', 'courts', 'profile', 'bookings', 'monetize', 'queue_ops', 'payments'].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: OrganizerTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = tab === 'overview' ? '/organizer' : `/organizer?tab=${tab}`;
      window.history.pushState(null, '', url);
    }
  };

  // Bookings management state
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'rejected'>('all');
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);
  const [isProcessingBookingAction, setIsProcessingBookingAction] = useState(false);
  const [rejectReasonPrompt, setRejectReasonPrompt] = useState<string>('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [bookingToReject, setBookingToReject] = useState<Booking | null>(null);

  React.useEffect(() => {
    refreshBookings();
    refreshVenues();
  }, [refreshBookings, refreshVenues, activeTab]);

  // Facility courts & added courts
  const [isAddCourtOpen, setIsAddCourtOpen] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtSport, setNewCourtSport] = useState<SportType>('basketball');
  const [newCourtRate, setNewCourtRate] = useState('600');
  const [newCourtSurface, setNewCourtSurface] = useState('');
  const [newCourtIsIndoor, setNewCourtIsIndoor] = useState(true);
  const [courtStatusMap, setCourtStatusMap] = useState<Record<string, boolean>>({});
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [editCourtName, setEditCourtName] = useState('');
  const [editCourtFloorType, setEditCourtFloorType] = useState('');
  const [editCourtRate, setEditCourtRate] = useState('600');
  const [editCourtIsIndoor, setEditCourtIsIndoor] = useState(true);
  const [isSavingCourtEdit, setIsSavingCourtEdit] = useState(false);
  const [editCourtError, setEditCourtError] = useState<string | null>(null);

  // Hosted Games state
  const [isCreateGameOpen, setIsCreateGameOpen] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameCourtId, setNewGameCourtId] = useState('');
  const [newGameSport, setNewGameSport] = useState<SportType>('basketball');
  const [newGameTime, setNewGameTime] = useState('');
  const [newGamePlayers, setNewGamePlayers] = useState('10');
  const [newGameFee, setNewGameFee] = useState('350');
  const [newGameRotation, setNewGameRotation] = useState('Open Pickup Rotation');

  const isOwner =
    currentUser.role === 'venue_owner' ||
    currentUser.role === 'organizer' ||
    currentUser.role === 'admin' ||
    (currentUser.role as string) === 'facility_owner' ||
    storedRole === 'facility_owner' ||
    storedRole === 'venue_owner';

  // Facility context: Only venues belonging strictly to this authenticated facility owner
  const storedVenueId =
    typeof window !== 'undefined' && currentUser.id
      ? localStorage.getItem(`sportsync_venue_id_${currentUser.id}`)
      : null;

  const fallbackVenueId =
    typeof window !== 'undefined'
      ? localStorage.getItem('sportsync_facility_venue_id')
      : null;

  const storedOwnerEmail = typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_email') : null;
  const targetEmail = currentUser.email || storedOwnerEmail;

  // Real-time local fallback for instant dashboard loading across reloads
  const localVenues = useMemo(() => {
    return typeof window !== 'undefined' ? getLocalStoredVenues() : [];
  }, [mounted]);

  const allVenues = useMemo<Venue[]>(() => {
    const map = new Map<string, Venue>();
    venues.forEach((v) => { if (v && v.id) map.set(v.id, v); });
    localVenues.forEach((v) => { if (v && v.id && !map.has(v.id)) map.set(v.id, v); });
    return Array.from(map.values());
  }, [venues, localVenues]);

  const primaryVenue = useMemo<Venue | null>(() => {
    return (
      (currentUser.id
        ? allVenues.find((v) => v.owner_id === currentUser.id || v.owner_id === currentUser.auth_id)
        : null) ||
      (storedVenueId ? allVenues.find((v) => v.id === storedVenueId) : null) ||
      (fallbackVenueId ? allVenues.find((v) => v.id === fallbackVenueId) : null) ||
      (targetEmail ? allVenues.find((v) => (v as any).owner_email === targetEmail) : null) ||
      (currentUser.id ? localVenues.find((v) => v.owner_id === currentUser.id || v.owner_id === currentUser.auth_id) : null) ||
      null
    );
  }, [allVenues, currentUser.id, currentUser.auth_id, storedVenueId, fallbackVenueId, targetEmail, localVenues]);

  const facilitySessions = useMemo(() => {
    if (!primaryVenue) return [];
    const seen = new Set<string>();
    return sessions.filter((s) => {
      if (!s || !s.id || s.venue_id !== primaryVenue.id) return false;
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [sessions, primaryVenue]);

  // Auto-prompt facility owner to configure venue before accessing dashboard ONLY if no facility exists for this owner
  React.useEffect(() => {
    if (mounted && isOwner && !primaryVenue) {
      setIsOwnerModalOpen(true);
    }
  }, [mounted, isOwner, primaryVenue]);

  // Edit Facility Profile state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFacilityName, setEditFacilityName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSports, setEditSports] = useState<SportType[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const openEditProfile = () => {
    if (!primaryVenue) return;
    setEditFacilityName(primaryVenue.name);
    setEditDescription(primaryVenue.description || '');
    setEditAddress(primaryVenue.address || '');
    setEditCity(primaryVenue.city || '');
    setEditHours(
      primaryVenue.operating_hours && typeof primaryVenue.operating_hours === 'object'
        ? String(Object.values(primaryVenue.operating_hours)[0] || '')
        : ''
    );
    setEditPhone((primaryVenue.payment_info as any)?.gcash_number || currentUser.phone || '');
    setEditSports(primaryVenue.featured_sports || ['pickleball']);
    setIsEditProfileOpen(true);
  };

  const toggleEditSport = (sport: SportType) => {
    if (editSports.includes(sport)) {
      if (editSports.length > 1) {
        setEditSports(editSports.filter((s) => s !== sport));
      }
    } else {
      setEditSports([...editSports, sport]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryVenue || !editFacilityName.trim()) return;
    setIsSavingProfile(true);
    try {
      await updateVenueProfile(primaryVenue.id, {
        name: editFacilityName.trim(),
        description: editDescription.trim(),
        address: editAddress.trim(),
        city: editCity.trim(),
        operating_hours: { mon_sun: editHours },
        featured_sports: editSports,
        payment_info: {
          ...(primaryVenue.payment_info || {}),
          accepts_cash: true,
          gcash_number: editPhone.trim(),
        },
      });
      setIsEditProfileOpen(false);
      setMonetizeSuccessMessage(`Facility profile "${editFacilityName.trim()}" saved and synchronized with database!`);
      setTimeout(() => setMonetizeSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update facility profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const primarySession = sessions.find((s) => s.venue_id === primaryVenue?.id) || null;

  const sessionCourts = primarySession ? courts.filter((c) => primarySession.court_ids.includes(c.id)) : [];
  const sessionQueues = primarySession ? queues.filter((q) => q.session_id === primarySession.id) : [];
  const waitingPlayers = sessionQueues.filter((q) => q.status === 'waiting');

  const pendingPayments = payments.filter(
    (p) => p.status === 'pending' || p.status === 'cash_at_venue'
  );
  const verifiedPayments = payments.filter((p) => p.status === 'approved');

  // Revenue & Accounting metrics
  const facilityBookings = useMemo(() => {
    if (!primaryVenue) return [];
    return bookings.filter(
      (b) => Boolean(b.venue_id) && (b.venue_id === primaryVenue.id || b.venue_id === primaryVenue.slug)
    );
  }, [bookings, primaryVenue]);

  const pendingBookings = useMemo(
    () => facilityBookings.filter((b) => b.status === 'pending'),
    [facilityBookings]
  );
  const confirmedBookings = useMemo(
    () => facilityBookings.filter((b) => b.status === 'confirmed'),
    [facilityBookings]
  );
  const completedBookings = useMemo(
    () => facilityBookings.filter((b) => b.status === 'completed'),
    [facilityBookings]
  );
  const rejectedBookings = useMemo(
    () => facilityBookings.filter((b) => b.status === 'rejected'),
    [facilityBookings]
  );

  const displayedBookings = useMemo(() => {
    if (bookingStatusFilter === 'all') return facilityBookings;
    return facilityBookings.filter((b) => b.status === bookingStatusFilter);
  }, [facilityBookings, bookingStatusFilter]);
  const totalGrossCents =
    verifiedPayments.reduce((acc, curr) => acc + curr.amount_cents, 0) +
    facilityBookings.filter((b) => b.status === 'confirmed').reduce((acc, b) => acc + b.total_amount_cents, 0);

  const totalFacilityNetCents = calculateBookingFees(totalGrossCents).facilityAmountCents;
  const totalBookingsCount = facilityBookings.length;

  // Unified registered courts for this facility
  const allFacilityCourts = useMemo<Court[]>(() => {
    if (!primaryVenue) return [];
    if (primaryVenue.courts && primaryVenue.courts.length > 0) return primaryVenue.courts;
    return courts.filter((c) => c.venue_id === primaryVenue.id);
  }, [primaryVenue, courts]);

  const timelineSlotRanges = useMemo(() => [
    { time: '08:00 - 10:00', start: '08:00', end: '10:00' },
    { time: '10:00 - 12:00', start: '10:00', end: '12:00' },
    { time: '13:00 - 15:00', start: '13:00', end: '15:00' },
    { time: '15:00 - 17:00', start: '15:00', end: '17:00' },
    { time: '17:00 - 19:00', start: '17:00', end: '19:00' },
    { time: '19:00 - 21:00', start: '19:00', end: '21:00' },
  ], []);

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayBookings = useMemo(() => {
    return facilityBookings.filter((b) => !b.booking_date || b.booking_date === todayDateStr);
  }, [facilityBookings, todayDateStr]);

  const confirmedTodayCount = useMemo(() => {
    return todayBookings.filter((b) => b.status === 'confirmed').length;
  }, [todayBookings]);

  // Compute unbooked idle slots across registered courts based on actual Supabase bookings
  const unbookedSlotsCount = useMemo(() => {
    if (allFacilityCourts.length === 0) return 0;
    let count = 0;
    allFacilityCourts.forEach((court) => {
      timelineSlotRanges.forEach((slot) => {
        const hasBooking = facilityBookings.some(
          (b) =>
            (b.court_id === court.id || b.court?.name === court.name) &&
            b.status !== 'rejected' &&
            b.status !== 'cancelled' &&
            (b.start_time === slot.start || (b.start_time < slot.end && b.end_time > slot.start))
        );
        const hasSession = facilitySessions.some(
          (s) => s.court_ids?.includes(court.id) && s.start_time === slot.start
        );
        if (!hasBooking && !hasSession) {
          count++;
        }
      });
    });
    return count;
  }, [allFacilityCourts, facilityBookings, facilitySessions, timelineSlotRanges]);

  const idleCourtHours = unbookedSlotsCount * 2;
  const totalCapacitySlots = Math.max(1, (allFacilityCourts.length || 1) * timelineSlotRanges.length);
  const activeBookedSlotsCount = totalCapacitySlots - unbookedSlotsCount;
  const occupancyRate = allFacilityCourts.length === 0
    ? 0
    : Math.min(100, Math.max(0, Math.round((activeBookedSlotsCount / totalCapacitySlots) * 100)));

  const handleMonetizeSlot = (courtId: string, courtSport: SportType, timeSlot: string) => {
    setNewGameCourtId(courtId);
    setNewGameSport(courtSport);
    setNewGameTime(timeSlot);
    setIsCreateGameOpen(true);
    handleTabChange('games');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center p-4" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C8FF2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#A5B0A6]">Loading facility portal...</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center" suppressHydrationWarning>
        <div className="rounded-3xl border border-white/10 bg-[#141A15] p-8 sm:p-12 space-y-4 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-[#F4F7F0]">
            Facility Access Required
          </h2>
          <p className="text-xs text-[#A5B0A6] max-w-sm mx-auto">
            This section is reserved for verified sports facility owners.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOwnerModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#C8FF2E] hover:bg-[#b4eb25] text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              List Facility
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
            </button>
          </div>
        </div>
        {isOwnerModalOpen && (
          <OwnerOnboardingModal isOpen={isOwnerModalOpen} onClose={() => setIsOwnerModalOpen(false)} onLogout={handleLogout} />
        )}
      </div>
    );
  }

  if (!primaryVenue) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:py-24 text-center" suppressHydrationWarning>
        <div className="rounded-3xl border border-white/10 bg-[#141A15] p-8 sm:p-12 space-y-5 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 text-[#C8FF2E]">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#C8FF2E] bg-[#C8FF2E]/10 px-3 py-1 rounded-full border border-[#C8FF2E]/20 inline-block">
              Initial Facility Setup Required
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#F4F7F0]">
              Set Up Your Facility First
            </h2>
            <p className="text-xs sm:text-sm text-[#A5B0A6] max-w-md mx-auto leading-relaxed">
              Welcome to the SportSync Facility Partner Portal! You must set up your facility details and courts before accessing your management dashboard.
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsOwnerModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#C8FF2E] hover:bg-[#b4eb25] text-black text-xs font-black transition-all shadow-[0_0_24px_rgba(200,255,46,0.3)] flex items-center justify-center gap-2 cursor-pointer press-scale"
            >
              <Building2 className="w-4 h-4" />
              <span>Set Up Facility &amp; Courts</span>
            </button>
            <Link
              href="/onboarding?role=owner"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/5 text-xs font-bold text-[#A5B0A6] hover:text-white transition-all text-center flex items-center justify-center gap-2 cursor-pointer press-scale"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C8FF2E]" />
              <span>Launch Setup Wizard</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 hover:text-rose-300 transition-all text-center flex items-center justify-center gap-2 cursor-pointer press-scale disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>{isLoggingOut ? 'Logging Out...' : 'Log Out'}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/5">
            <p className="text-xs text-[#A5B0A6]">
              Don&apos;t want to set up a facility yet?{' '}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-rose-400 hover:text-rose-300 underline font-semibold transition-colors cursor-pointer"
              >
                Log out of your account
              </button>
            </p>
          </div>
        </div>
        {isOwnerModalOpen && (
          <OwnerOnboardingModal isOpen={isOwnerModalOpen} onClose={() => setIsOwnerModalOpen(false)} onLogout={handleLogout} />
        )}
      </div>
    );
  }


  const handleAddCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourtName.trim() || !primaryVenue) return;
    try {
      const created = await addCourt({
        venue_id: primaryVenue.id,
        name: newCourtName.trim(),
        sport: newCourtSport,
        floor_type: newCourtSurface.trim() || 'Standard Court Surface',
        court_type: 'standard',
        hourly_rate_cents: Math.round(Number(newCourtRate || '600') * 100),
        is_indoor: newCourtIsIndoor,
        is_active: true,
        supports_doubles: true,
        supports_singles: true,
      });
      setIsAddCourtOpen(false);
      setNewCourtName('');
      setNewCourtSurface('');
      setNewCourtIsIndoor(true);
      setMonetizeSuccessMessage(`Court "${created.name}" registered and published to player search!`);
      setTimeout(() => setMonetizeSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to add court:', err);
    }
  };

  const openEditCourtModal = (court: Court) => {
    setEditingCourt(court);
    setEditCourtName(court.name || '');
    setEditCourtFloorType(court.floor_type || court.surface || '');
    setEditCourtRate(String(Math.round((court.hourly_rate_cents || 60000) / 100)));
    setEditCourtIsIndoor(court.is_indoor !== false);
    setEditCourtError(null);
  };

  const handleSaveCourtEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourt) return;
    setEditCourtError(null);
    setIsSavingCourtEdit(true);
    try {
      const res = await fetch('/api/courts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingCourt.id,
          name: editCourtName.trim(),
          floor_type: editCourtFloorType.trim() || 'Standard Court Surface',
          hourly_rate_cents: Math.round(Math.max(0, Number(editCourtRate) || 0) * 100),
          is_indoor: editCourtIsIndoor,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update court details.');
      }
      setEditingCourt(null);
      setMonetizeSuccessMessage(`Court "${data.court?.name || editCourtName}" updated successfully!`);
      setTimeout(() => setMonetizeSuccessMessage(null), 4000);
      await refreshVenues();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save court changes.';
      setEditCourtError(msg);
    } finally {
      setIsSavingCourtEdit(false);
    }
  };

  const handleCreateHostedGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameTitle.trim() || !primaryVenue) return;
    const courtId = newGameCourtId || allFacilityCourts[0]?.id || 'court_default';
    const facilityVenueName = primaryVenue.name || 'Metro Naga Sports Complex';
    createOpenPlaySession({
      venueId: primaryVenue.id,
      title: newGameTitle.trim(),
      description: `Official facility hosted game at ${facilityVenueName}. Open to all recreational players.`,
      sport: newGameSport,
      courtIds: [courtId],
      startTime: newGameTime.split(' - ')[0] || '18:00',
      endTime: newGameTime.split(' - ')[1] || '20:00',
      feeCents: Math.round(Number(newGameFee || '350') * 100),
      maxPlayers: Number(newGamePlayers || '10'),
      rotationFormat: newGameRotation,
      skillLevel: 'all_levels',
      locationDetails: facilityVenueName,
    });
    setIsCreateGameOpen(false);
    setNewGameTitle('');
    setNewGameTime('');
    setMonetizeSuccessMessage(`Hosted game "${newGameTitle.trim()}" published to player discovery feed!`);
    setTimeout(() => setMonetizeSuccessMessage(null), 4000);
  };

  const toggleCourtStatus = async (courtId: string, currentActive: boolean) => {
    const currentlyEffective =
      courtStatusMap[courtId] !== undefined ? courtStatusMap[courtId] : currentActive;
    const nextActive = !currentlyEffective;

    setCourtStatusMap((prev) => ({
      ...prev,
      [courtId]: nextActive,
    }));

    try {
      const res = await fetch('/api/courts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: courtId,
          is_active: nextActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update court availability status.');
      }
      setMonetizeSuccessMessage(
        `Court status updated to "${nextActive ? 'Active & Available' : 'Temporarily Closed'}"!`
      );
      setTimeout(() => setMonetizeSuccessMessage(null), 4000);
      await refreshVenues();
    } catch (err: unknown) {
      setCourtStatusMap((prev) => ({
        ...prev,
        [courtId]: currentlyEffective,
      }));
      const msg = err instanceof Error ? err.message : 'Failed to update court status.';
      setEditCourtError(msg);
    }
  };

  const handleAddWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim() || !primarySession) return;
    joinQueue(primarySession.id, [walkInName.trim()], walkInFormat);
    setWalkInName('');
  };

  const handleAdvanceToCourt = (courtId: string, courtName: string) => {
    if (waitingPlayers.length === 0) return;
    const nextInLine = waitingPlayers[0];
    assignQueueToCourt(nextInLine.id, courtId, courtName);
  };

  const handleCheckInBooking = async (bookingId: string) => {
    setReviewActionError(null);
    try {
      await updateBookingStatus(bookingId, 'completed');
      refreshBookings();
    } catch (err: any) {
      setReviewActionError(err?.message || 'Failed to check in booking.');
    }
  };

  const handleConfirmBooking = async (b: Booking) => {
    setReviewActionError(null);
    setIsProcessingBookingAction(true);
    try {
      // 1. Conflict check against existing confirmed bookings to prevent double-booking
      const conflicting = facilityBookings.find(
        (other) =>
          other.id !== b.id &&
          other.court_id === b.court_id &&
          other.booking_date === b.booking_date &&
          other.status === 'confirmed' &&
          (other.start_time === b.start_time ||
            (other.start_time < b.end_time && other.end_time > b.start_time))
      );

      if (conflicting) {
        setReviewActionError(
          `Double-Booking Conflict: ${b.court?.name || 'This court'} is already reserved by confirmed booking ${conflicting.booking_reference} for ${conflicting.start_time} - ${conflicting.end_time}. Please resolve the conflict.`
        );
        return;
      }

      await updateBookingStatus(b.id, 'confirmed');

      setSelectedBookingForReview(null);
      setMonetizeSuccessMessage(`Booking ${b.booking_reference} confirmed successfully! Player has been notified.`);
      setTimeout(() => setMonetizeSuccessMessage(null), 4000);
      refreshBookings();
    } catch (err: any) {
      setReviewActionError(err?.message || 'Failed to confirm booking.');
    } finally {
      setIsProcessingBookingAction(false);
    }
  };

  const handleOpenRejectModal = (b: Booking) => {
    setBookingToReject(b);
    setRejectReasonPrompt('');
    setReviewActionError(null);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!bookingToReject) return;
    const b = bookingToReject;
    setReviewActionError(null);
    setIsProcessingBookingAction(true);
    try {
      await updateBookingStatus(b.id, 'rejected', rejectReasonPrompt.trim() || undefined);

      setIsRejectModalOpen(false);
      setBookingToReject(null);
      setSelectedBookingForReview(null);
      setMonetizeSuccessMessage(`Booking ${b.booking_reference} declined. Player has been notified.`);
      setTimeout(() => setMonetizeSuccessMessage(null), 4000);
      refreshBookings();
    } catch (err: any) {
      setReviewActionError(err?.message || 'Failed to reject booking.');
    } finally {
      setIsProcessingBookingAction(false);
    }
  };

  const handleConvertEmptyOpportunity = (opp: EmptyCourtOpportunity) => {
    const facilityVenueName = primaryVenue?.name || 'Metro Naga Sports Complex';
    createOpenPlaySession({
      venueId: primaryVenue?.id || 'venue_naga_facility',
      title: `${getSportDisplayName(opp.sport)} Flash Open Play`,
      description: `Spontaneous open play session for court ${opp.courtName} at ${facilityVenueName}. Instant rotation play!`,
      sport: opp.sport,
      courtIds: [opp.courtId],
      startTime: opp.timeRange.split(' - ')[0] || '14:00',
      endTime: opp.timeRange.split(' - ')[1] || '16:00',
      feeCents: 35000,
      maxPlayers: 12,
      rotationFormat: '2v2 Doubles Rotation',
      skillLevel: 'all_levels',
      locationDetails: facilityVenueName,
    });

    setMonetizeSuccessMessage(
      `Court ${opp.courtName} (${opp.timeRange}) successfully listed as an Open Play Session! Players can now join.`
    );
    setTimeout(() => setMonetizeSuccessMessage(null), 5000);
  };

  return (
    <div className="organizer-surface mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 pb-24 md:pb-12" suppressHydrationWarning>
      {/* Executive Operations Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <div>
          <div className="mb-2">
            <SportSyncBrandLogo variant="wordmark" imgClassName="h-6 sm:h-7" />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isLightMode ? 'text-[#0B0F0C]' : 'text-[#F4F7F0]'}`}>
              Facility Ops &amp; Management
            </h1>
            {primaryVenue?.is_verified ? (
              <span className="rounded-full bg-[#1E4A32] border border-[#C8FF2E]/30 px-3 py-1 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF2E]" />
                Verified Facility
              </span>
            ) : (
              <span className="rounded-full bg-[#FBF0E6] border border-[#C87D43]/30 px-3 py-1 text-xs font-bold text-[#A35C2B] flex items-center gap-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-[#C87D43]" />
                Pending Verification (Draft Mode)
              </span>
            )}
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLightMode ? 'text-[#4B5A4F]' : 'text-[#A5B0A6]'}`}>
            {primaryVenue?.name || 'Sports Facility'} &bull; Real-time court utilization, bookings ledger &amp; cash desk.
          </p>
        </div>

        {/* Facility Setup + Navigation Tab Bar + Faculty Profile Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setIsOwnerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#0B0F0C] bg-[#C8FF2E] hover:bg-[#b8f022] flex items-center gap-1.5 transition-all shadow-[0_0_16px_rgba(200,255,46,0.3)] press-scale cursor-pointer"
            title="Configure Facility & Courts Setup"
          >
            <Building2 className="w-3.5 h-3.5 text-[#0B0F0C]" />
            <span>Facility Setup</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 flex items-center gap-1.5 transition-all press-scale cursor-pointer disabled:opacity-50"
            title="Log out of account"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>{isLoggingOut ? 'Logging Out...' : 'Log Out'}</span>
          </button>
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#E8E5DF] rounded-2xl overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              onClick={() => handleTabChange('overview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'overview'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
                }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('games')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'games'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
                }`}
            >
              Games
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('courts')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'courts'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Courts ({allFacilityCourts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('profile')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'profile'
                ? 'bg-white text-[#1A241E] shadow-sm font-black'
                : 'text-[#65756B] hover:text-[#1A241E]'
                }`}
            >
              <User className="w-3.5 h-3.5 text-[#2D724E]" />
              <span>Profile</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('bookings')}
              className={`relative px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'bookings'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
                }`}
            >
              <span>Bookings ({facilityBookings.length})</span>
              {pendingBookings.length > 0 && (
                <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white animate-pulse">
                  {pendingBookings.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('payments')}
              className={`relative px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'payments'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
                }`}
            >
              <span>Payment Desk</span>
              {pendingPayments.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2D724E] text-[9px] font-black text-white">
                  {pendingPayments.length}
                </span>
              )}
            </button>
          </div>

          {/* Facility Profile & Logout Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-[#F4F7F0] bg-[#141A15] hover:bg-[#1C241E] border border-white/10 hover:border-[#C8FF2E]/40 flex items-center gap-2 transition-all shadow-sm"
              title="Facility Account Menu & Logout"
            >
              <div className="w-5 h-5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-black text-[10px]">
                {currentUser.full_name?.[0] || currentUser.email?.[0]?.toUpperCase() || 'F'}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate">
                {currentUser.full_name || 'Facility'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#A5B0A6]" />
            </button>

            {isAccountDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141A15] border border-white/10 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 text-[#F4F7F0]">
                <div className="px-4 py-3 border-b border-white/5 space-y-1">
                  <div className="text-xs font-bold truncate">
                    {currentUser.full_name || 'Facility Partner'}
                  </div>
                  <div className="text-[11px] text-[#A5B0A6] truncate">
                    {currentUser.email || 'facility@sportsync.ph'}
                  </div>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#C8FF2E] bg-[#C8FF2E]/10 border border-[#C8FF2E]/30 px-2 py-0.5 rounded-md">
                      Verified Facility
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountDropdownOpen(false);
                      handleTabChange('profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5 transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-[#C8FF2E]" />
                    <span>Facility Profile &amp; Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountDropdownOpen(false);
                      setIsOwnerModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5 transition-colors text-left"
                  >
                    <Building2 className="w-4 h-4 text-[#C8FF2E]" />
                    <span>Configure Setup</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {monetizeSuccessMessage && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-[#EBF4EE] border border-[#2D724E]/30 text-xs text-[#1E4A32] font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#2D724E] shrink-0" />
          <span>{monetizeSuccessMessage}</span>
        </div>
      )}

      {/* Core Business Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#65756B]">Today&apos;s Bookings</span>
            <Calendar className="w-4 h-4 text-[#2D724E]" />
          </div>
          <div className="text-2xl font-black text-[#1A241E]">
            {todayBookings.length}
          </div>
          <span className="text-[11px] text-[#2D724E] font-medium block">
            {confirmedTodayCount} confirmed reservations
          </span>
        </div>

        <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#65756B]">Gross Bookings</span>
            <CreditCard className="w-4 h-4 text-[#C87D43]" />
          </div>
          <div className="text-2xl font-black text-[#1A241E]">
            {formatCurrency(totalGrossCents)}
          </div>
          <span className="text-[11px] text-[#65756B] font-medium block">
            Multi-channel (GCash, Maya, Cash)
          </span>
        </div>

        <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#65756B]">Net Facility Payout</span>
            <TrendingUp className="w-4 h-4 text-[#2D724E]" />
          </div>
          <div className="text-2xl font-black text-[#2D724E]">
            {formatCurrency(totalFacilityNetCents)}
          </div>
          <span className="text-[11px] text-[#1E4A32] font-medium block">
            After platform guarantee &amp; escrow
          </span>
        </div>

        <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#65756B]">Court Occupancy</span>
            <BarChart3 className="w-4 h-4 text-[#2D724E]" />
          </div>
          <div className="text-2xl font-black text-[#1A241E]">
            {occupancyRate}%
          </div>
          <div className="w-full bg-[#E8E5DF] h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-[#2D724E] h-full rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }} />
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Booking Requests Action Card */}
          {pendingBookings.length > 0 && (
            <div className="lg:col-span-3 rounded-3xl border border-amber-300 bg-amber-50/60 p-5 shadow-xs space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-[#1A241E]">
                        Pending Booking Requests ({pendingBookings.length})
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-[#65756B] mt-0.5">
                      Players have submitted booking requests that require faculty review and confirmation.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('bookings');
                    setBookingStatusFilter('pending');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shrink-0 self-start sm:self-auto shadow-sm"
                >
                  Review Pending Bookings ({pendingBookings.length}) &rarr;
                </button>
              </div>

              {/* Quick glance list of pending bookings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {pendingBookings.slice(0, 3).map((pb) => (
                  <div
                    key={pb.id}
                    className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-[#1A241E]">{pb.booking_reference}</span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md capitalize">
                          {pb.payment_method || 'Online'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[#1A241E] mt-1">{resolveCustomerInfo(pb).name}</div>
                      <div className="text-[11px] text-[#65756B]">
                        {pb.court?.name || 'Court'} &bull; {pb.booking_date} &bull; {pb.start_time} - {pb.end_time}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#E8E5DF]">
                      <span className="text-xs font-black text-[#1A241E]">{formatCurrency(pb.total_amount_cents)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmBooking(pb)}
                          disabled={isProcessingBookingAction}
                          className="px-2.5 py-1 rounded-lg bg-[#2D724E] hover:bg-[#1E4A32] text-white text-[11px] font-bold transition-all shadow-xs"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(pb)}
                          disabled={isProcessingBookingAction}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Court Timeline & Schedule Grid */}
          <div className="lg:col-span-3 rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2D724E]" />
                  <h3 className="text-base font-black text-[#1A241E]">
                    Today&apos;s Court Timeline
                  </h3>
                </div>
                <p className="text-xs text-[#65756B] mt-0.5">
                  Real-time court status, active bookings, and idle inventory.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="flex items-center gap-1.5 text-[#1A241E] font-bold">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#1E4A32]" />
                  <span>Confirmed Booking</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#A35C2B] font-bold">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#E9C46A]" />
                  <span>Open Play</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#65756B]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#FAF8F5] border border-[#E8E5DF]" />
                  <span>Available Slot</span>
                </span>
              </div>
            </div>

            {/* Court Rows */}
            <div className="space-y-3">
              {allFacilityCourts.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#65756B] space-y-2 border border-dashed border-[#E8E5DF] rounded-2xl">
                  <Building2 className="w-8 h-8 text-[#65756B]/40 mx-auto" />
                  <p className="font-bold text-[#1A241E] text-sm">No Courts Configured Yet</p>
                  <p className="text-[11px] max-w-sm mx-auto">
                    Add your facility courts and operating rates to activate the real-time schedule timeline.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddCourtOpen(true)}
                    className="mt-1 px-4 py-2 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Add Your First Court
                  </button>
                </div>
              ) : (
                allFacilityCourts.map((court: Court, idx: number) => {
                  return (
                    <div
                      key={court.id || idx}
                      className="p-3.5 rounded-2xl border border-[#E8E5DF] bg-[#FAF8F5] flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#1A241E]">{court.name}</span>
                          <span className="text-[10px] font-bold text-[#2D724E] bg-[#EBF4EE] px-1.5 py-0.5 rounded-md capitalize">
                            {court.sport}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#65756B] block mt-0.5">
                          {formatCurrency(court.hourly_rate_cents || 35000)}/hr standard rate
                        </span>
                      </div>

                      {/* Timeline Slots */}
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                        {timelineSlotRanges.map((slot, sIdx) => {
                          const courtBooking = facilityBookings.find(
                            (b) =>
                              (b.court_id === court.id || b.court?.name?.toLowerCase() === court.name?.toLowerCase()) &&
                              b.status !== 'cancelled' &&
                              b.status !== 'rejected' &&
                              (b.start_time === slot.start || (b.start_time < slot.end && b.end_time > slot.start))
                          );

                          const hasSession = facilitySessions.find(
                            (s) => s.court_ids?.includes(court.id) && s.start_time === slot.start
                          );

                          if (courtBooking && courtBooking.status === 'confirmed') {
                            const courtCustomer = resolveCustomerInfo(courtBooking);
                            return (
                              <div
                                key={sIdx}
                                className="p-2 rounded-xl bg-[#1E4A32] text-white text-[10px] space-y-0.5 shadow-xs"
                                title={`Confirmed reservation by ${courtCustomer.name}`}
                              >
                                <span className="font-extrabold block truncate">
                                  {courtCustomer.name !== 'Customer' ? courtCustomer.name : 'Confirmed'}
                                </span>
                                <span className="text-[#E9C46A] text-[9px] block">{slot.time}</span>
                              </div>
                            );
                          }

                          if (courtBooking && courtBooking.status === 'pending') {
                            const courtCustomer = resolveCustomerInfo(courtBooking);
                            return (
                              <div
                                key={sIdx}
                                className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-[10px] space-y-0.5 shadow-xs"
                                title={`Pending request from ${courtCustomer.name}`}
                              >
                                <span className="font-extrabold block truncate">
                                  {courtCustomer.name !== 'Customer' ? courtCustomer.name : 'Pending Review'}
                                </span>
                                <span className="text-amber-700 text-[9px] block">{slot.time}</span>
                              </div>
                            );
                          }

                          if (hasSession) {
                            return (
                              <div
                                key={sIdx}
                                className="p-2 rounded-xl bg-[#E9C46A] text-[#1A241E] text-[10px] font-black space-y-0.5 shadow-xs"
                                title={`Open Play: ${hasSession.title}`}
                              >
                                <span className="block truncate">{hasSession.title || 'Open Play'}</span>
                                <span className="text-[#A35C2B] text-[9px] block">{slot.time}</span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => handleMonetizeSlot(court.id, court.sport, slot.time)}
                              className="p-2 rounded-xl bg-white border border-[#E8E5DF] hover:border-[#2D724E] text-left text-[10px] space-y-0.5 transition-colors group cursor-pointer"
                              title={`Click to schedule a game for ${court.name} at ${slot.time}`}
                            >
                              <span className="text-[#65756B] group-hover:text-[#2D724E] font-bold block truncate">
                                + Monetize
                              </span>
                              <span className="text-[#65756B]/70 text-[9px] block">{slot.time}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Monetization Opportunity Alert */}
          <div className="lg:col-span-3 rounded-3xl border border-[#C87D43]/30 bg-[#FBF0E6]/50 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#C87D43] text-white text-[10px] font-black uppercase tracking-wider">
                  Monetization Alert
                </span>
                <span className="text-xs font-bold text-[#A35C2B]">
                  {idleCourtHours} idle court hours detected today
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#1A241E]">
                Convert unbooked court time into high-yield Open Play sessions
              </h3>
              <p className="text-xs text-[#65756B] max-w-2xl">
                Instead of leaving courts idle between peak hours, launch an instant Open Play rotation.
                Average yield per court hour increases by 35% compared to empty slots.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (allFacilityCourts.length > 0) {
                  setNewGameCourtId(allFacilityCourts[0].id);
                  setNewGameSport(allFacilityCourts[0].sport);
                }
                setIsCreateGameOpen(true);
                handleTabChange('games');
              }}
              className="px-5 py-3 rounded-xl bg-[#C87D43] hover:bg-[#A35C2B] text-white text-xs font-bold shadow-xs transition-all whitespace-nowrap min-h-[44px]"
            >
              Inspect Opportunities ({unbookedSlotsCount})
            </button>
          </div>

          {/* Quick Bookings Today */}
          <div className="lg:col-span-2 rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A241E]">Today&apos;s Reservations</h3>
              <button
                type="button"
                onClick={() => handleTabChange('bookings')}
                className="text-xs font-bold text-[#2D724E] hover:underline"
              >
                View All Bookings &rarr;
              </button>
            </div>

            {facilityBookings.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#65756B] space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-center mx-auto text-[#2D724E]">
                  <Calendar className="w-5 h-5 opacity-60" />
                </div>
                <p className="font-bold text-[#1A241E] text-sm">No Reservations Scheduled Today</p>
                <p className="text-[11px] max-w-xs mx-auto text-[#65756B]">
                  When players book courts through SportSync, their confirmed reservations will appear here in real time.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (allFacilityCourts.length > 0) {
                      setNewGameCourtId(allFacilityCourts[0].id);
                      setNewGameSport(allFacilityCourts[0].sport);
                    }
                    setIsCreateGameOpen(true);
                    handleTabChange('games');
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#EBF4EE] border border-[#E8E5DF] text-[#1E4A32] text-xs font-bold transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-[#2D724E]" />
                  <span>Host an Open Play Session</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E5DF]">
                {facilityBookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-center text-xs font-bold text-[#1A241E]">
                        {booking.court?.name?.replace(/[^0-9]/g, '') || '1'}
                      </div>
                      <div>
                        <div className="font-bold text-[#1A241E]">
                          {resolveCustomerInfo(booking).name}
                          <span className="font-normal text-[#65756B] ml-1">
                            ({booking.court?.name || 'Court'})
                          </span>
                        </div>
                        <div className="text-[11px] text-[#65756B] flex items-center gap-2 mt-0.5">
                          <span className="capitalize">{booking.sport}</span>
                          <span>&bull;</span>
                          <span>{booking.start_time} - {booking.end_time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-[#1A241E]">
                          {formatCurrency(booking.total_amount_cents)}
                        </div>
                        <span className="text-[10px] text-[#2D724E] capitalize">
                          {booking.payment_status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {booking.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => handleCheckInBooking(booking.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#EBF4EE] border border-[#E8E5DF] hover:border-[#2D724E] text-[#1E4A32] font-semibold text-xs transition-colors"
                        >
                          Check In
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-[#2D724E] font-semibold px-2 py-1 bg-[#EBF4EE] rounded-lg">
                          <Check className="w-3 h-3" /> Checked In
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Payment Desk Preview */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A241E]">Payments Pending</h3>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="text-xs font-bold text-[#2D724E] hover:underline"
              >
                Inspect All ({pendingPayments.length}) &rarr;
              </button>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#65756B] space-y-1">
                <CheckCircle2 className="w-8 h-8 text-[#2D724E] mx-auto opacity-70" />
                <p className="font-bold text-[#1A241E]">Payment Desk Clear</p>
                <p>All receipts and cash vouchers verified.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#1A241E] block truncate max-w-[130px]">
                        {p.user_name}
                      </span>
                      <span className="text-[11px] text-[#65756B] font-mono">
                        {p.reference_code}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#2D724E] block">
                        {formatCurrency(p.amount_cents)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(p)}
                        className="text-[10px] font-bold text-[#1A241E] underline mt-0.5"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS LEDGER */}
      {activeTab === 'bookings' && (
        <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5DF] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                  Court Bookings &amp; Reservations
                </h2>
                {pendingBookings.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                    {pendingBookings.length} Pending Approval
                  </span>
                )}
              </div>
              <p className="text-xs text-[#65756B] mt-0.5">
                Review pending booking requests, confirm court assignments, prevent double bookings, and check in players.
              </p>
            </div>
            <span className="text-xs font-bold text-[#2D724E] bg-[#EBF4EE] px-3 py-1 rounded-full self-start sm:self-auto">
              {facilityBookings.length} Total Bookings
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Bookings', count: facilityBookings.length },
              { id: 'pending', label: 'Pending Requests', count: pendingBookings.length, isAmber: true },
              { id: 'confirmed', label: 'Confirmed', count: confirmedBookings.length },
              { id: 'completed', label: 'Completed', count: completedBookings.length },
              { id: 'rejected', label: 'Declined', count: rejectedBookings.length },
            ].map((tab) => {
              const isActive = bookingStatusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBookingStatusFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${isActive
                    ? tab.isAmber && tab.count > 0
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-[#1E4A32] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#65756B] border border-[#E8E5DF] hover:border-[#1E4A32] hover:text-[#1A241E]'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive
                      ? 'bg-white/20 text-white'
                      : tab.isAmber && tab.count > 0
                        ? 'bg-amber-100 text-amber-800 font-black'
                        : 'bg-[#E8E5DF] text-[#1A241E]'
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {reviewActionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{reviewActionError}</span>
            </div>
          )}

          {displayedBookings.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#65756B] space-y-2 border border-dashed border-[#E8E5DF] rounded-2xl">
              <Calendar className="w-8 h-8 text-[#65756B]/40 mx-auto" />
              <p className="font-bold text-[#1A241E] text-sm">
                No {bookingStatusFilter !== 'all' ? bookingStatusFilter : ''} bookings found
              </p>
              <p className="text-[11px] max-w-sm mx-auto">
                {bookingStatusFilter === 'pending'
                  ? 'All pending reservation requests have been processed. Great job!'
                  : 'New reservations submitted by players will appear in this ledger.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E5DF] text-[#65756B] font-semibold">
                    <th className="pb-3 pr-3">Reference</th>
                    <th className="pb-3 pr-3">Customer</th>
                    <th className="pb-3 pr-3">Sport &amp; Court</th>
                    <th className="pb-3 pr-3">Date &amp; Time</th>
                    <th className="pb-3 pr-3">Booking Status</th>
                    <th className="pb-3 pr-3">Payment</th>
                    <th className="pb-3 pr-3 text-right">Amount</th>
                    <th className="pb-3 text-right min-w-[150px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5DF]">
                  {displayedBookings.map((b) => {
                    const isPending = b.status === 'pending';
                    const isConfirmed = b.status === 'confirmed';
                    const isCompleted = b.status === 'completed';
                    const isRejected = b.status === 'rejected';

                    return (
                      <tr key={b.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                        <td className="py-3.5 pr-3 font-mono font-bold text-[#1A241E]">
                          <button
                            type="button"
                            onClick={() => setSelectedBookingForReview(b)}
                            className="underline underline-offset-2 hover:text-[#2D724E] text-left"
                          >
                            {b.booking_reference}
                          </button>
                        </td>
                        <td className="py-3.5 pr-3">
                          <span className="font-bold text-[#1A241E] block">
                            {resolveCustomerInfo(b).name}
                          </span>
                          <span className="text-[10px] text-[#65756B] block">
                            {resolveCustomerInfo(b).email !== 'No email'
                              ? resolveCustomerInfo(b).email
                              : resolveCustomerInfo(b).phone !== 'No phone'
                                ? resolveCustomerInfo(b).phone
                                : 'Player'}
                          </span>
                        </td>
                        <td className="py-3.5 pr-3">
                          <span className="font-semibold text-[#1A241E] block capitalize">
                            {b.sport}
                          </span>
                          <span className="text-[10px] text-[#65756B]">
                            {b.court?.name || 'Court'}
                          </span>
                        </td>
                        <td className="py-3.5 pr-3 text-[#65756B]">
                          <div className="font-medium text-[#1A241E]">{b.booking_date}</div>
                          <div className="text-[10px]">{b.start_time} - {b.end_time}</div>
                        </td>
                        <td className="py-3.5 pr-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPending
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isConfirmed
                                ? 'bg-[#EBF4EE] text-[#1E4A32] border border-[#2D724E]/30'
                                : isCompleted
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : isRejected
                                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {isPending
                              ? 'Pending Approval'
                              : isConfirmed
                                ? 'Confirmed'
                                : isCompleted
                                  ? 'Completed'
                                  : isRejected
                                    ? 'Declined'
                                    : b.status}
                          </span>
                        </td>
                        <td className="py-3.5 pr-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${b.payment_status === 'approved'
                              ? 'bg-[#EBF4EE] text-[#1E4A32]'
                              : b.payment_status === 'cash_at_venue'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {b.payment_method ? `${b.payment_method} • ` : ''}
                            {b.payment_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 pr-3 text-right font-bold text-[#1A241E]">
                          {formatCurrency(b.total_amount_cents)}
                        </td>
                        <td className="py-3.5 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleConfirmBooking(b)}
                                disabled={isProcessingBookingAction}
                                className="px-3 py-1 rounded-lg bg-[#2D724E] hover:bg-[#1E4A32] text-white text-[11px] font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(b)}
                                disabled={isProcessingBookingAction}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedBookingForReview(b)}
                                className="text-[11px] font-bold text-[#65756B] hover:text-[#1A241E] underline ml-1"
                              >
                                Review
                              </button>
                            </div>
                          ) : isConfirmed ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleCheckInBooking(b.id)}
                                className="px-3 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EBF4EE] border border-[#E8E5DF] hover:border-[#2D724E] text-[#1E4A32] text-[11px] font-bold shadow-xs transition-all"
                              >
                                Check In
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedBookingForReview(b)}
                                className="text-[11px] font-bold text-[#65756B] hover:text-[#1A241E] underline"
                              >
                                Details
                              </button>
                            </div>
                          ) : isCompleted ? (
                            <span className="text-[11px] font-semibold text-[#2D724E] inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Checked In
                            </span>
                          ) : isRejected ? (
                            <span className="text-[11px] font-semibold text-rose-600 inline-flex items-center gap-1">
                              <X className="w-3.5 h-3.5" /> Declined
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedBookingForReview(b)}
                              className="text-[11px] font-bold text-[#65756B] underline"
                            >
                              Details
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EMPTY COURT MONETIZATION */}
      {activeTab === 'monetize' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-[#1A241E] flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#C87D43]" />
                <span>Empty-Court Monetization Engine</span>
              </h2>
              <span className="text-xs font-bold text-[#C87D43] bg-[#FBF0E6] px-3 py-1 rounded-full">
                AI Optimization Active
              </span>
            </div>
            <p className="text-xs text-[#65756B] leading-relaxed">
              SportSync scans your court availability calendars to identify idle court hours.
              With 1 click, you can transform empty time slots into public Open Play sessions or promote them with off-peak incentives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {emptyOpportunities.map((opp) => (
              <div
                key={`${opp.courtId}_${opp.date}_${opp.timeRange}`}
                className="rounded-3xl border border-[#E8E5DF] bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E8E5DF] text-xs font-bold text-[#1A241E]">
                      {opp.courtName}
                    </span>
                    <span className="text-xs font-bold text-[#C87D43] capitalize">
                      {opp.sport}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[#65756B]">
                      <Clock className="w-3.5 h-3.5 text-[#2D724E]" />
                      <span>{opp.date} &bull; {opp.timeRange}</span>
                    </div>
                    <div className="text-base font-bold text-[#1A241E] mt-1">
                      {opp.hoursUnbooked} Idle Hours (₱0 Current Earnings)
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#EBF4EE] border border-[#2D724E]/20 text-xs text-[#1E4A32] space-y-1">
                    <div className="font-bold flex items-center justify-between">
                      <span>Projected Open Play Yield:</span>
                      <span className="text-sm font-black">
                        {formatCurrency(opp.potentialRevenueCents)}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80">
                      Based on 8–12 players paying ₱350 open play entry.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleConvertEmptyOpportunity(opp)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm transition-all min-h-[42px]"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Convert to Open Play Session &rarr;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ROTATION & QUEUE OPS */}
      {activeTab === 'queue_ops' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Live Courts & Rotation Advance */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                  Court Rotation Control
                </h2>
                <span className="text-xs text-[#65756B]">Paddle Rack &amp; Rotation Desk</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sessionCourts.map((court) => {
                  const ongoingMatch = matches.find(
                    (m) => m.court_id === court.id && m.status === 'in_progress'
                  );

                  return (
                    <div
                      key={court.id}
                      className="rounded-2xl border border-[#E8E5DF] p-4 bg-[#FAF8F5] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#1A241E]">
                          {court.name}
                        </span>
                        {ongoingMatch ? (
                          <span className="text-[10px] font-bold text-[#1E4A32] bg-[#EBF4EE] px-2 py-0.5 rounded-full">
                            Doubles Match
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-[#65756B] bg-[#E8E5DF] px-2 py-0.5 rounded-full">
                            Court Available
                          </span>
                        )}
                      </div>

                      {ongoingMatch ? (
                        <div className="rounded-xl bg-white p-3 border border-[#E8E5DF] space-y-2">
                          <div className="flex justify-between text-xs font-bold text-[#1A241E]">
                            <span>{ongoingMatch.team_a_names.join(' & ')}</span>
                            <span className="text-[#2D724E]">{ongoingMatch.score_a}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-[#1A241E]">
                            <span>{ongoingMatch.team_b_names.join(' & ')}</span>
                            <span className="text-[#C87D43]">{ongoingMatch.score_b}</span>
                          </div>

                          <div className="pt-2 border-t border-[#E8E5DF] flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedScoreMatch(ongoingMatch)}
                              className="flex-1 py-1.5 rounded-lg bg-[#2D724E] text-white text-[11px] font-bold min-h-[36px]"
                            >
                              Update Match Score
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-[#65756B]">
                          Court clear &bull; Ready for next rotation
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={waitingPlayers.length === 0}
                        onClick={() => handleAdvanceToCourt(court.id, court.name)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1A241E] hover:bg-[#2A362F] disabled:opacity-40 text-white text-xs font-bold transition-all min-h-[42px]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-[#E9C46A]" />
                        <span>Advance Next Pair to Court</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick In-Person Walk-in Registration */}
            <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-[#2D724E]" />
                <h3 className="text-sm font-bold text-[#1A241E]">Add In-Person Walk-In Players</h3>
              </div>
              <form onSubmit={handleAddWalkIn} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Player Name(s) e.g. Coach Carlo & Mark..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none min-h-[42px]"
                  />
                  <div className="flex gap-2">
                    <div className="flex rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setWalkInFormat('doubles')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${walkInFormat === 'doubles'
                          ? 'bg-[#2D724E] text-white shadow-xs'
                          : 'text-[#65756B] hover:text-[#1A241E]'
                          }`}
                      >
                        Doubles
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalkInFormat('singles')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${walkInFormat === 'singles'
                          ? 'bg-[#2D724E] text-white shadow-xs'
                          : 'text-[#65756B] hover:text-[#1A241E]'
                          }`}
                      >
                        Singles
                      </button>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm transition-all min-h-[42px]"
                    >
                      Add Player
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right Col: Live Queue List for Session */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-sm text-[#1A241E]">Session Waiting Queue</h3>
              <span className="text-xs text-[#65756B]">{sessionQueues.length} registered</span>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {sessionQueues.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-[#E8E5DF] p-2.5 sm:p-3 text-xs bg-[#FAF8F5]"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-[#E8E5DF] font-bold text-[10px] text-[#1A241E] shrink-0">
                      #{entry.queue_number}
                    </span>
                    <div>
                      <span className="font-bold text-[#1A241E] block truncate max-w-[120px] sm:max-w-[150px]">
                        {entry.user?.full_name || 'Player'}
                      </span>
                      {entry.partner_names && entry.partner_names.length > 0 && (
                        <span className="text-[10px] text-[#65756B] block">
                          +{entry.partner_names.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${entry.status === 'on_court'
                      ? 'bg-[#EBF4EE] text-[#1E4A32]'
                      : 'bg-white border border-[#E8E5DF] text-[#65756B]'
                      }`}
                  >
                    {entry.status === 'on_court' ? entry.court_name : 'Waiting'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PAYMENTS & CASH DESK */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                  Pending Payments &amp; Cash Vouchers
                </h2>
                <p className="text-xs text-[#65756B]">
                  Inspect GCash/Maya reference codes, bank receipts, or mark cash collected at the venue.
                </p>
              </div>

              <span className="rounded-full bg-[#C87D43]/15 px-3 py-1 text-xs font-bold text-[#A35C2B] self-start sm:self-auto">
                {pendingPayments.length} Action Needed
              </span>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#65756B]">
                <CheckCircle2 className="mx-auto w-9 h-9 text-[#2D724E] mb-2" />
                <p className="font-bold text-sm text-[#1A241E]">Payment Desk Up-to-date</p>
                <p className="mt-0.5">No pending customer payments require review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingPayments.map((payment) => {
                  const isCash = payment.status === 'cash_at_venue';
                  return (
                    <div
                      key={payment.id}
                      className="rounded-2xl border border-[#E8E5DF] bg-[#FAF8F5] p-4 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${isCash
                              ? 'bg-[#EBF4EE] text-[#1E4A32]'
                              : 'bg-blue-50 text-blue-700'
                              }`}
                          >
                            {isCash ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                            <span>{getPaymentMethodName(payment.payment_method)}</span>
                          </span>
                          <span className="text-[10px] text-[#65756B]">
                            {formatTimeAgo(payment.created_at)}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-[#1A241E]">{payment.user_name}</h4>
                        <p className="font-mono text-xs text-[#1A241E] mt-0.5">
                          Ref: {payment.reference_code}
                        </p>

                        <div className="mt-2 text-base font-black text-[#2D724E]">
                          {formatCurrency(payment.amount_cents)}
                        </div>

                        {payment.notes && (
                          <p className="text-[11px] text-[#65756B] mt-1.5 bg-white p-2 rounded-lg border border-[#E8E5DF]">
                            {payment.notes}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPayment(payment)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm transition-all min-h-[40px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isCash ? 'Verify Cash Collected &rarr;' : 'Inspect & Verify &rarr;'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Verified History */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-[#1A241E]">Confirmed Transactions</h3>
            <div className="divide-y divide-[#E8E5DF]">
              {verifiedPayments.map((payment) => (
                <div key={payment.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2D724E] shrink-0" />
                    <div>
                      <span className="font-semibold text-[#1A241E]">{payment.user_name}</span>
                      <span className="text-[#65756B] font-mono ml-1.5 text-[11px]">
                        ({getPaymentMethodName(payment.payment_method)})
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#2D724E]">
                      {formatCurrency(payment.amount_cents)}
                    </span>
                    <span className="block text-[9px] text-[#65756B]">
                      Verified by {payment.verified_by || 'Organizer'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: GAMES & SESSIONS */}
      {activeTab === 'games' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                Hosted Games &amp; Open Play Sessions
              </h2>
              <p className="text-xs text-[#65756B] mt-0.5">
                Host official facility games, recruit local players to complete rosters, and manage court rotations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateGameOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Hosted Game</span>
            </button>
          </div>

          {/* Create Hosted Game Modal / Drawer */}
          {isCreateGameOpen && (
            <div className="rounded-3xl border border-[#2D724E]/30 bg-[#F4F9F5] p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#2D724E]/20 pb-3">
                <h3 className="font-bold text-sm text-[#1A241E]">Schedule Hosted Game at {primaryVenue.name}</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateGameOpen(false)}
                  className="text-xs text-[#65756B] hover:text-[#1A241E]"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreateHostedGame} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E]">Game Title</label>
                  <input
                    type="text"
                    required
                    value={newGameTitle}
                    onChange={(e) => setNewGameTitle(e.target.value)}
                    placeholder="e.g. Friday Night 5v5 Open Play"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E]">Select Court</label>
                  <select
                    value={newGameCourtId}
                    onChange={(e) => setNewGameCourtId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                  >
                    {allFacilityCourts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({getSportDisplayName(c.sport)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A241E]">Time Schedule</label>
                    <span className="text-xs font-mono font-bold text-[#2D724E]">{newGameTime || 'Select Time'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {['06:00 - 08:00', '08:00 - 10:00', '16:00 - 18:00', '18:00 - 20:00', '20:00 - 22:00'].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={newGameTime === slot}
                        onClick={() => setNewGameTime(slot)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all ${newGameTime === slot
                          ? 'bg-[#2D724E] text-white border-[#2D724E] font-bold shadow-xs'
                          : 'bg-white text-[#65756B] border-[#E8E5DF] hover:border-[#2D724E]'
                          }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A241E]">Player Fee</label>
                    <div className="inline-flex items-center gap-1.5 bg-white border border-[#E8E5DF] px-2 py-0.5 rounded-lg">
                      <button
                        type="button"
                        aria-label="Decrease player fee"
                        onClick={() => setNewGameFee((prev) => String(Math.max(0, (Number(prev) || 0) - 50)))}
                        className="w-6 h-6 rounded bg-[#FAF8F5] text-xs font-bold text-[#1A241E] flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold text-[#2D724E]">₱{newGameFee || '0'}</span>
                      <button
                        type="button"
                        aria-label="Increase player fee"
                        onClick={() => setNewGameFee((prev) => String((Number(prev) || 0) + 50))}
                        className="w-6 h-6 rounded bg-[#2D724E] text-xs font-bold text-white flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {['0', '150', '250', '350', '500'].map((fee) => (
                      <button
                        key={fee}
                        type="button"
                        aria-pressed={newGameFee === fee}
                        onClick={() => setNewGameFee(fee)}
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold border transition-all ${newGameFee === fee
                          ? 'bg-[#2D724E] text-white border-[#2D724E] font-bold shadow-xs'
                          : 'bg-white text-[#65756B] border-[#E8E5DF] hover:border-[#2D724E]'
                          }`}
                      >
                        {fee === '0' ? 'Free' : `₱${fee}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateGameOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#65756B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm"
                  >
                    Publish Game to Feed
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Hosted Games List */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#1A241E]">Current Facility Sessions</h3>
            {facilitySessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#65756B]">
                No upcoming facility-hosted games right now. Click &quot;Create Hosted Game&quot; to recruit players.
              </div>
            ) : (
              <div className="space-y-3">
                {facilitySessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-sm text-[#1A241E] block">{session.title}</span>
                      <div className="text-[11px] text-[#65756B] flex items-center gap-2 mt-0.5">
                        <span className="capitalize text-[#2D724E] font-semibold">{session.sport}</span>
                        <span>&bull;</span>
                        <span>{session.start_time} - {session.end_time}</span>
                        <span>&bull;</span>
                        <span>Max {session.max_players} players</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-[#2D724E] block">
                        {formatCurrency(session.fee_cents)}
                      </span>
                      <span className="text-[10px] text-[#65756B] capitalize">{session.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: COURTS INVENTORY & MANAGEMENT */}
      {activeTab === 'courts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                Registered Courts &amp; Playing Areas
              </h2>
              <p className="text-xs text-[#65756B] mt-0.5">
                Manage court availability, sport formats, hourly rates, and mark temporary closures.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddCourtOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Court</span>
            </button>
          </div>

          {/* Add Court Form */}
          {isAddCourtOpen && (
            <div className="rounded-3xl border border-[#2D724E]/30 bg-[#F4F9F5] p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#2D724E]/20 pb-3">
                <h3 className="font-bold text-sm text-[#1A241E]">Add New Court to {primaryVenue.name}</h3>
                <button
                  type="button"
                  onClick={() => setIsAddCourtOpen(false)}
                  className="text-xs text-[#65756B] hover:text-[#1A241E]"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddCourt} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E]">Court Name</label>
                  <input
                    type="text"
                    required
                    value={newCourtName}
                    onChange={(e) => setNewCourtName(e.target.value)}
                    placeholder="e.g. Court 3 (Taraflex)"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E]">Sport</label>
                  <select
                    value={newCourtSport}
                    onChange={(e) => setNewCourtSport(e.target.value as SportType)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none capitalize"
                  >
                    <option value="basketball">Basketball</option>
                    <option value="badminton">Badminton</option>
                    <option value="volleyball">Volleyball</option>
                    <option value="football">Football</option>
                    <option value="pickleball">Pickleball</option>
                    <option value="tennis">Tennis</option>
                    <option value="billiards">Billiards</option>
                    <option value="darts">Darts</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A241E]">Hourly Court Rate</label>
                    <div className="inline-flex items-center gap-1.5 bg-white border border-[#E8E5DF] px-2 py-0.5 rounded-lg">
                      <button
                        type="button"
                        aria-label="Decrease hourly rate"
                        onClick={() => setNewCourtRate((prev) => String(Math.max(100, (Number(prev) || 600) - 50)))}
                        className="w-6 h-6 rounded bg-[#FAF8F5] text-xs font-bold text-[#1A241E] flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold text-[#2D724E]">₱{newCourtRate || '600'}/hr</span>
                      <button
                        type="button"
                        aria-label="Increase hourly rate"
                        onClick={() => setNewCourtRate((prev) => String((Number(prev) || 600) + 50))}
                        className="w-6 h-6 rounded bg-[#2D724E] text-xs font-bold text-white flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {['350', '450', '600', '800', '1000'].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        aria-pressed={newCourtRate === rate}
                        onClick={() => setNewCourtRate(rate)}
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold border transition-all ${newCourtRate === rate
                          ? 'bg-[#2D724E] text-white border-[#2D724E] font-bold shadow-xs'
                          : 'bg-white text-[#65756B] border-[#E8E5DF] hover:border-[#2D724E]'
                          }`}
                      >
                        ₱{rate}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A241E]">Playing Surface / Description</label>
                    <div className="inline-flex rounded-xl bg-white border border-[#E8E5DF] p-0.5">
                      <button
                        type="button"
                        onClick={() => setNewCourtIsIndoor(true)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          newCourtIsIndoor ? 'bg-[#2D724E] text-white' : 'text-[#65756B]'
                        }`}
                      >
                        Indoor
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCourtIsIndoor(false)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          !newCourtIsIndoor ? 'bg-[#2D724E] text-white' : 'text-[#65756B]'
                        }`}
                      >
                        Outdoor
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={newCourtSurface}
                    onChange={(e) => setNewCourtSurface(e.target.value)}
                    placeholder="e.g. Cushioned Acrylic, Hardwood, Rubber Mat"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#1A241E] focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                  />
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {['Hard Court', 'Rubber Cushion', 'Wood Parquet', 'Cushioned Acrylic', 'Synthetic Turf'].map((surf) => (
                      <button
                        key={surf}
                        type="button"
                        aria-pressed={newCourtSurface === surf}
                        onClick={() => setNewCourtSurface(surf)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${newCourtSurface === surf
                          ? 'bg-[#2D724E] text-white border-[#2D724E] font-bold shadow-xs'
                          : 'bg-white text-[#65756B] border-[#E8E5DF] hover:border-[#2D724E]'
                          }`}
                      >
                        {surf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCourtOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#65756B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm"
                  >
                    Save &amp; Publish Court
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Courts Grid */}
          {allFacilityCourts.length === 0 ? (
            <div className="rounded-3xl border border-[#E8E5DF] bg-white p-12 text-center space-y-2">
              <p className="font-bold text-sm text-[#1A241E]">No courts registered yet</p>
              <p className="text-xs text-[#65756B]">Add your first court to publish it in SportSync player searches.</p>
              <button
                type="button"
                onClick={() => setIsAddCourtOpen(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-[#2D724E] text-white text-xs font-bold"
              >
                + Add Court
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allFacilityCourts.map((court) => {
                const isCurrentlyActive =
                  courtStatusMap[court.id] !== undefined ? courtStatusMap[court.id] : (court.is_active !== false);

                return (
                  <div
                    key={court.id}
                    className="rounded-3xl border border-[#E8E5DF] bg-white p-5 shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[#2D724E] bg-[#EBF4EE] px-2 py-0.5 rounded-md capitalize">
                          {getSportDisplayName(court.sport)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCurrentlyActive
                            ? 'bg-[#EBF4EE] text-[#1E4A32]'
                            : 'bg-red-50 text-red-700'
                            }`}
                        >
                          {isCurrentlyActive ? 'Active & Available' : 'Temporarily Closed'}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-[#1A241E]">{court.name}</h3>
                      <p className="text-xs text-[#65756B] mt-0.5">
                        Surface: {court.floor_type || court.surface || 'Standard'} &bull; {court.is_indoor === false ? 'Outdoor' : 'Indoor'}
                      </p>

                      <div className="mt-3 pt-3 border-t border-[#E8E5DF] flex items-center justify-between">
                        <span className="text-xs text-[#65756B]">Standard Rate</span>
                        <span className="text-sm font-black text-[#1A241E]">
                          {formatCurrency(court.hourly_rate_cents || 60000)} / hr
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditCourtModal(court)}
                        className="py-2 px-3 rounded-xl text-xs font-bold border border-[#E8E5DF] bg-[#FAF8F5] text-[#1A241E] hover:border-[#2D724E] hover:text-[#2D724E] transition-all inline-flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCourtStatus(court.id, court.is_active !== false)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${isCurrentlyActive
                          ? 'border-[#E8E5DF] text-[#65756B] hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                          : 'bg-[#2D724E] text-white hover:bg-[#1E4A32] border-transparent'
                          }`}
                      >
                        {isCurrentlyActive ? 'Mark Temporary Closure' : 'Reactivate Court'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: FACILITY & OPERATOR PROFILE */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Card 1: Facility Account & Profile Information */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E5DF] pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-[#1E4A32] text-[#C8FF2E] flex items-center justify-center font-black text-xl shadow-xs border border-[#C8FF2E]/30">
                  {currentUser.full_name?.[0] || currentUser.email?.[0]?.toUpperCase() || 'F'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-[#1A241E]">
                      {currentUser.full_name || 'Facility Partner'}
                    </h2>
                    <span className="rounded-full bg-[#EBF4EE] text-[#1E4A32] border border-[#2D724E]/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Verified Facility
                    </span>
                  </div>
                  <p className="text-xs text-[#65756B] mt-0.5">{currentUser.email || 'facility@sportsync.ph'}</p>
                </div>
              </div>

              {/* Log Out CTA */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Log Out of Facility Portal"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Log Out of Facility Portal</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65756B] block">Account Role</span>
                <span className="text-xs font-black text-[#1A241E] block capitalize">{currentUser.role || 'Facility Owner'}</span>
                <span className="text-[11px] text-[#2D724E] font-semibold">Authorized Portal Scope</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65756B] block">Contact Phone</span>
                <span className="text-xs font-bold text-[#1A241E] block font-mono">
                  {currentUser.phone || (primaryVenue.payment_info as any)?.gcash_number || 'Not configured'}
                </span>
                <span className="text-[11px] text-[#65756B]">Primary SMS / Verification</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65756B] block">Authentication Session</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#2D724E] animate-pulse" />
                  <span className="text-xs font-bold text-[#1E4A32]">Supabase Auth Active</span>
                </div>
                <span className="text-[10px] text-[#65756B] font-mono truncate block max-w-full">
                  ID: {currentUser.id?.slice(0, 16) || 'auth-session'}...
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65756B] block">Linked Sports Facility</span>
                <span className="text-xs font-black text-[#1A241E] block truncate">{primaryVenue.name}</span>
                <span className="text-[11px] text-[#2D724E] font-semibold">
                  {allFacilityCourts.length} Registered Courts
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Facility Venue Profile */}
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E5DF] pb-5">
              <div>
                <span className="text-xs font-bold text-[#65756B] uppercase tracking-wider block">
                  Facility Profile &amp; Location
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1A241E]">
                  {primaryVenue.name}
                </h2>
                <p className="text-xs text-[#65756B] mt-0.5">{primaryVenue.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openEditProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Facility Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOwnerModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-[#C8FF2E] hover:bg-[#b8f022] text-[#0B0F0C] text-xs font-black shadow-sm transition-all"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#0B0F0C]" />
                  <span>Configure Setup</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-2">
                <span className="font-bold text-[#1A241E] uppercase text-[10px] tracking-wider block">
                  Location &amp; Coordinates
                </span>
                <p className="text-[#1A241E] font-medium">{primaryVenue.address || 'Address configured'}</p>
                <p className="text-[#65756B]">{primaryVenue.city || 'Philippines'}, Philippines</p>
                <p className="text-[10px] font-mono text-[#65756B] pt-1">
                  Lat: {primaryVenue.latitude} &bull; Lon: {primaryVenue.longitude}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-2">
                <span className="font-bold text-[#1A241E] uppercase text-[10px] tracking-wider block">
                  Operating Hours
                </span>
                <p className="text-[#1A241E] font-medium">
                  {primaryVenue.operating_hours && typeof primaryVenue.operating_hours === 'object'
                    ? String(Object.values(primaryVenue.operating_hours)[0] || 'Monday – Sunday: 06:00 – 23:00')
                    : 'Monday – Sunday: 06:00 – 23:00'}
                </p>
                <p className="text-[#65756B]">Online court booking open 24/7 on SportSync.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-2">
                <span className="font-bold text-[#1A241E] uppercase text-[10px] tracking-wider block">
                  Supported Sports
                </span>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {(primaryVenue.featured_sports || ['pickleball']).map((s: SportType) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E8E5DF] text-[11px] font-semibold text-[#1A241E] capitalize"
                    >
                      {getSportDisplayName(s)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-2">
                <span className="font-bold text-[#1A241E] uppercase text-[10px] tracking-wider block">
                  Cash &amp; Digital Payments Desk
                </span>
                <p className="text-[#1A241E] font-medium">
                  GCash: {(primaryVenue.payment_info as any)?.gcash_number || currentUser.phone || 'Not configured'}
                </p>
                <p className="text-[#65756B]">Cash accepted at venue counter &bull; Automated voucher verification.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#E8E5DF] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={openEditProfile}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold text-center transition-colors shadow-sm cursor-pointer"
              >
                Edit Facility Profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>{isLoggingOut ? 'Logging Out...' : 'Log Out'}</span>
              </button>
            </div>
          </div>

          {/* Edit Facility Profile Modal */}
          {isEditProfileOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="relative w-full max-w-xl rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-[#E8E5DF] bg-[#FAF8F5] flex items-center justify-between shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#2D724E]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E]">
                        Facility Settings &amp; Profile
                      </span>
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-black text-black mt-0.5">
                      Edit Facility Profile
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="rounded-full p-2 text-black hover:bg-[#E8E5DF] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveProfile} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                  <div>
                    <label className="text-[11px] font-black text-black block mb-1">Facility Name</label>
                    <input
                      type="text"
                      required
                      value={editFacilityName}
                      onChange={(e) => setEditFacilityName(e.target.value)}
                      placeholder="e.g. BGC Center Court & Smash Hub"
                      className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-black block mb-1">Full Street Address</label>
                    <input
                      type="text"
                      required
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="e.g. Magsaysay Ave, Concepcion Pequeña"
                      className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black text-black block mb-1">City / Municipality</label>
                      <input
                        type="text"
                        required
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="e.g. Naga City"
                        className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-black block mb-1">Operating Hours</label>
                      <input
                        type="text"
                        value={editHours}
                        onChange={(e) => setEditHours(e.target.value)}
                        placeholder="e.g. 06:00 AM - 11:00 PM"
                        className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-black block mb-1">Contact Phone (GCash / SMS)</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Enter facility GCash / SMS mobile number"
                      className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-black block mb-1">Short Description</label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Mention flooring surface quality, air conditioning, parking, racket stringing, etc..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none resize-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-black block mb-1.5">
                      Supported Sports
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['badminton', 'pickleball', 'basketball', 'volleyball', 'tennis', 'football', 'padel'] as SportType[]).map((sport) => {
                        const isSelected = editSports.includes(sport);
                        return (
                          <button
                            key={sport}
                            type="button"
                            onClick={() => toggleEditSport(sport)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${isSelected
                              ? 'bg-[#2D724E] text-white border-[#2D724E] shadow-xs'
                              : 'bg-white border-[#E8E5DF] text-black font-bold hover:border-[#2D724E]'
                              }`}
                          >
                            {getSportDisplayName(sport)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer inside form */}
                  <div className="pt-4 border-t border-[#E8E5DF] flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEditProfileOpen(false)}
                      className="px-4 py-2 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-black hover:bg-[#FAF8F5] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 min-h-[44px] rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedPayment && (
        <ReceiptReviewModal
          isOpen={Boolean(selectedPayment)}
          onClose={() => setSelectedPayment(null)}
          payment={selectedPayment}
        />
      )}

      {/* Booking Details Review Modal */}
      {selectedBookingForReview && (() => {
        const b = selectedBookingForReview;
        const isPending = b.status === 'pending';
        const isConfirmed = b.status === 'confirmed';

        // Live conflict check against other confirmed bookings
        const conflictBooking = facilityBookings.find(
          (other) =>
            other.id !== b.id &&
            other.court_id === b.court_id &&
            other.booking_date === b.booking_date &&
            other.status === 'confirmed' &&
            (other.start_time === b.start_time ||
              (other.start_time < b.end_time && other.end_time > b.start_time))
        );

        const customer = resolveCustomerInfo(b);
        const displayCustomerName = customer.name;
        const displayCustomerEmail = customer.email;
        const displayCustomerPhone = customer.phone;

        const cleanNotes = (b.notes || '').replace(/\s*\[CUSTOMER:.*?\]/g, '').trim();

        return (
          <div className="fixed inset-0 z-[800] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-[#1A241E]">
                      {b.booking_reference}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPending
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : isConfirmed
                          ? 'bg-[#EBF4EE] text-[#1E4A32] border border-[#2D724E]/30'
                          : b.status === 'rejected'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                    >
                      {isPending
                        ? 'Pending Approval'
                        : isConfirmed
                          ? 'Confirmed'
                          : b.status === 'rejected'
                            ? 'Declined'
                            : 'Completed'}
                    </span>
                  </div>
                  <p className="text-xs text-[#65756B] mt-0.5">Court Reservation Details</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBookingForReview(null)}
                  className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-center text-[#65756B] hover:text-[#1A241E]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conflict Warning */}
              {conflictBooking && isPending && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Double-Booking Conflict Detected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This court is already reserved by confirmed booking <strong>{conflictBooking.booking_reference}</strong> ({resolveCustomerInfo(conflictBooking).name}) for {conflictBooking.start_time} - {conflictBooking.end_time}. You cannot confirm this booking without overlap.
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#65756B] tracking-wider block">Customer</span>
                  <div className="font-bold text-[#1A241E]">{displayCustomerName}</div>
                  <div className="text-[11px] text-[#65756B]">{displayCustomerEmail}</div>
                  <div className="text-[11px] text-[#65756B]">{displayCustomerPhone}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#65756B] tracking-wider block">Court &amp; Sport</span>
                  <div className="font-bold text-[#1A241E]">{b.court?.name || 'Court'}</div>
                  <div className="text-[11px] text-[#2D724E] font-semibold capitalize">{b.sport}</div>
                  <div className="text-[11px] text-[#65756B]">{b.court?.floor_type || 'Standard surface'}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#65756B] tracking-wider block">Schedule</span>
                  <div className="font-bold text-[#1A241E]">{b.booking_date}</div>
                  <div className="text-[11px] text-[#65756B]">{b.start_time} - {b.end_time}</div>
                  <div className="text-[11px] text-[#65756B]">{b.duration_minutes || 60} mins duration</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#65756B] tracking-wider block">Payment</span>
                  <div className="font-black text-sm text-[#1A241E]">{formatCurrency(b.total_amount_cents)}</div>
                  <div className="text-[11px] font-semibold capitalize text-[#2D724E]">
                    {b.payment_method || 'Online'} &bull; {b.payment_status.replace(/_/g, ' ')}
                  </div>
                  {(b as any).reference_code && (
                    <div className="text-[10px] font-mono text-[#65756B] truncate">
                      Ref: {(b as any).reference_code}
                    </div>
                  )}
                </div>
              </div>

              {cleanNotes && (
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] text-xs space-y-0.5">
                  <span className="text-[10px] font-bold text-[#65756B] uppercase tracking-wider block">Notes from Player</span>
                  <p className="text-[#1A241E] italic">&ldquo;{cleanNotes}&rdquo;</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForReview(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-[#1A241E] hover:bg-[#FAF8F5] transition-all"
                >
                  Close
                </button>

                {isPending && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(b)}
                      disabled={isProcessingBookingAction}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Reject Request
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmBooking(b)}
                      disabled={isProcessingBookingAction || Boolean(conflictBooking)}
                      className="px-6 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isProcessingBookingAction ? 'Confirming...' : 'Confirm Booking'}
                    </button>
                  </>
                )}

                {isConfirmed && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCheckInBooking(b.id);
                      setSelectedBookingForReview(null);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all"
                  >
                    Check In Player
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject Reason Modal */}
      {isRejectModalOpen && bookingToReject && (
        <div className="fixed inset-0 z-[850] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-[#1A241E]">
                  Decline Booking Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setBookingToReject(null);
                }}
                className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-center text-[#65756B] hover:text-[#1A241E]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-[#65756B]">
              Are you sure you want to decline booking <strong>{bookingToReject.booking_reference}</strong> ({resolveCustomerInfo(bookingToReject).name} on {bookingToReject.booking_date} at {bookingToReject.start_time})? The player will be notified immediately.
            </p>

            <div>
              <label className="text-[11px] font-black text-[#1A241E] block mb-1">
                Reason for Declining (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectReasonPrompt}
                onChange={(e) => setRejectReasonPrompt(e.target.value)}
                placeholder="e.g., Court scheduled for emergency maintenance, invalid payment reference number, or double booking conflict..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-[#1A241E] placeholder:text-[#65756B]/60 focus:border-[#2D724E] focus:outline-none resize-none transition-all"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Court under maintenance', 'Time slot conflict', 'Payment unverified'].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReasonPrompt(reason)}
                    className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E8E5DF] text-[10px] text-[#65756B] hover:text-[#1A241E] hover:border-[#1A241E]"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E8E5DF] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setBookingToReject(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-[#1A241E] hover:bg-[#FAF8F5] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessingBookingAction}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessingBookingAction ? 'Declining...' : 'Decline Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Court Modal */}
      {editingCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E8E5DF] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div>
                <h3 className="font-black text-lg text-[#1A241E]">Edit Court Details</h3>
                <p className="text-xs text-[#65756B]">Update surface, rate, or indoor/outdoor classification.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCourt(null)}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#65756B] hover:text-[#1A241E] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourtEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A241E] block">Court Name</label>
                <input
                  type="text"
                  required
                  value={editCourtName}
                  onChange={(e) => setEditCourtName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8E5DF] text-xs text-[#1A241E] focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A241E] block">Playing Surface / Description</label>
                <input
                  type="text"
                  value={editCourtFloorType}
                  onChange={(e) => setEditCourtFloorType(e.target.value)}
                  placeholder="e.g. Cushioned Acrylic, Wood Parquet"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8E5DF] text-xs text-[#1A241E] focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E] block">Hourly Rate (₱)</label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    required
                    value={editCourtRate}
                    onChange={(e) => setEditCourtRate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8E5DF] text-xs font-mono text-[#1A241E] focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E] block">Environment</label>
                  <div className="flex rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] p-1">
                    <button
                      type="button"
                      onClick={() => setEditCourtIsIndoor(true)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        editCourtIsIndoor ? 'bg-[#2D724E] text-white' : 'text-[#65756B]'
                      }`}
                    >
                      Indoor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCourtIsIndoor(false)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !editCourtIsIndoor ? 'bg-[#2D724E] text-white' : 'text-[#65756B]'
                      }`}
                    >
                      Outdoor
                    </button>
                  </div>
                </div>
              </div>

              {editCourtError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                  {editCourtError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourt(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-[#1A241E] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCourtEdit}
                  className="px-5 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm disabled:opacity-50"
                >
                  {isSavingCourtEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8FF2E]" />
            <span className="text-xs text-[#8A9E91] font-medium tracking-wide">Loading Facility Portal...</span>
          </div>
        </div>
      }
    >
      <OrganizerDashboardContent />
    </Suspense>
  );
}
