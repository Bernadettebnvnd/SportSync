'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMatchiStore } from '@/lib/store';
import { ReceiptReviewModal } from '@/components/payments/ReceiptReviewModal';
import { ScoreModal } from '@/components/queue/ScoreModal';
import { OwnerOnboardingModal } from '@/components/onboarding/OwnerOnboardingModal';
import { Payment, Match, EmptyCourtOpportunity, SportType, Court } from '@/types';
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
} from 'lucide-react';

export default function OrganizerDashboard() {
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
  } = useMatchiStore();

  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedScoreMatch, setSelectedScoreMatch] = useState<Match | null>(null);
  const [walkInName, setWalkInName] = useState('');
  const [walkInFormat, setWalkInFormat] = useState<'doubles' | 'singles'>('doubles');
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'courts' | 'profile' | 'bookings' | 'monetize' | 'queue_ops' | 'payments'>('overview');
  const [monetizeSuccessMessage, setMonetizeSuccessMessage] = useState<string | null>(null);

  // Facility courts & custom added courts
  const [customCourts, setCustomCourts] = useState<any[]>([]);
  const [isAddCourtOpen, setIsAddCourtOpen] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtSport, setNewCourtSport] = useState<SportType>('basketball');
  const [newCourtRate, setNewCourtRate] = useState('600');
  const [newCourtSurface, setNewCourtSurface] = useState('Hard Court');
  const [courtStatusMap, setCourtStatusMap] = useState<Record<string, boolean>>({});

  // Hosted Games state
  const [isCreateGameOpen, setIsCreateGameOpen] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameCourtId, setNewGameCourtId] = useState('');
  const [newGameSport, setNewGameSport] = useState<SportType>('basketball');
  const [newGameTime, setNewGameTime] = useState('18:00 - 20:00');
  const [newGamePlayers, setNewGamePlayers] = useState('10');
  const [newGameFee, setNewGameFee] = useState('350');
  const [newGameRotation, setNewGameRotation] = useState('Open Pickup Rotation');

  const isOwner = currentUser.role === 'venue_owner' || currentUser.role === 'organizer' || currentUser.role === 'admin';

  // Facility context
  const primaryVenue = venues.find((v) => v.owner_id === currentUser.id) || (currentUser.role === 'admin' ? venues[0] : null);
  const primarySession = sessions.find((s) => s.venue_id === primaryVenue?.id) || null;

  const sessionCourts = primarySession ? courts.filter((c) => primarySession.court_ids.includes(c.id)) : [];
  const sessionQueues = primarySession ? queues.filter((q) => q.session_id === primarySession.id) : [];
  const waitingPlayers = sessionQueues.filter((q) => q.status === 'waiting');

  const pendingPayments = payments.filter(
    (p) => p.status === 'pending' || p.status === 'cash_at_venue'
  );
  const verifiedPayments = payments.filter((p) => p.status === 'approved');

  // Revenue & Accounting metrics
  const facilityBookings = bookings.filter((b) => primaryVenue && b.venue_id === primaryVenue.id);
  const totalGrossCents =
    verifiedPayments.reduce((acc, curr) => acc + curr.amount_cents, 0) +
    facilityBookings.filter((b) => b.status === 'confirmed').reduce((acc, b) => acc + b.total_amount_cents, 0);

  const totalFacilityNetCents = calculateBookingFees(totalGrossCents).facilityAmountCents;
  const totalBookingsCount = facilityBookings.length;

  // Dynamic Occupancy calculation based on real bookings vs available court-hours
  const facilityCourts = primaryVenue ? courts.filter((c) => c.venue_id === primaryVenue.id) : [];
  const totalCapacitySlots = (facilityCourts.length || 1) * 14;
  const bookedSlotsCount = facilityBookings.filter((b) => b.status !== 'cancelled').length;
  const occupancyRate = Math.min(100, Math.round((bookedSlotsCount / Math.max(1, totalCapacitySlots)) * 100));

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-8 sm:p-12 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FBF0E6] text-[#C87D43]">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-[#1A241E]">
            Facility Access Required
          </h2>
          <p className="text-xs text-[#65756B] max-w-sm mx-auto">
            This section is reserved for verified sports facility owners.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOwnerModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold transition-all"
            >
              List Facility
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl border border-[#E8E5DF] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A241E] transition-all"
            >
              Player Mode
            </Link>
          </div>
        </div>
        {isOwnerModalOpen && (
          <OwnerOnboardingModal isOpen={isOwnerModalOpen} onClose={() => setIsOwnerModalOpen(false)} />
        )}
      </div>
    );
  }

  if (!primaryVenue) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-8 sm:p-12 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBF4EE] text-[#2D724E]">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-[#1A241E]">
            No Facility Listed Yet
          </h2>
          <p className="text-xs text-[#65756B] max-w-sm mx-auto">
            Add your sports facility to start managing courts and bookings.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsOwnerModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold transition-all"
            >
              List Facility
            </button>
          </div>
        </div>
        {isOwnerModalOpen && (
          <OwnerOnboardingModal isOpen={isOwnerModalOpen} onClose={() => setIsOwnerModalOpen(false)} />
        )}
      </div>
    );
  }

  const allFacilityCourts = [
    ...(primaryVenue ? courts.filter((c) => c.venue_id === primaryVenue.id) : []),
    ...customCourts,
  ];

  const handleAddCourt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourtName.trim() || !primaryVenue) return;
    const newCourt = {
      id: `court_${Date.now()}`,
      venue_id: primaryVenue.id,
      name: newCourtName.trim(),
      sport: newCourtSport,
      floor_type: newCourtSurface,
      hourly_rate_cents: Math.round(Number(newCourtRate || '600') * 100),
      is_indoor: true,
      is_active: true,
      supports_doubles: true,
      supports_singles: true,
    };
    setCustomCourts((prev) => [newCourt, ...prev]);
    setIsAddCourtOpen(false);
    setNewCourtName('');
    setMonetizeSuccessMessage(`Court "${newCourt.name}" registered and published to player search!`);
    setTimeout(() => setMonetizeSuccessMessage(null), 4000);
  };

  const handleCreateHostedGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameTitle.trim() || !primaryVenue) return;
    const courtId = newGameCourtId || allFacilityCourts[0]?.id || 'court_default';
    createOpenPlaySession({
      venueId: primaryVenue.id,
      title: newGameTitle.trim(),
      description: `Official facility hosted game at ${primaryVenue.name}. Open to all recreational players.`,
      sport: newGameSport,
      courtIds: [courtId],
      startTime: newGameTime.split(' - ')[0] || '18:00',
      endTime: newGameTime.split(' - ')[1] || '20:00',
      feeCents: Math.round(Number(newGameFee || '350') * 100),
      maxPlayers: Number(newGamePlayers || '10'),
      rotationFormat: newGameRotation,
      skillLevel: 'all_levels',
    });
    setIsCreateGameOpen(false);
    setNewGameTitle('');
    setMonetizeSuccessMessage(`Hosted game "${newGameTitle.trim()}" published to player discovery feed!`);
    setTimeout(() => setMonetizeSuccessMessage(null), 4000);
  };

  const toggleCourtStatus = (courtId: string, currentActive: boolean) => {
    setCourtStatusMap((prev) => ({
      ...prev,
      [courtId]: prev[courtId] !== undefined ? !prev[courtId] : !currentActive,
    }));
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

  const handleCheckInBooking = (bookingId: string) => {
    updateBookingStatus(bookingId, 'completed');
  };

  const handleConvertEmptyOpportunity = (opp: EmptyCourtOpportunity) => {
    createOpenPlaySession({
      venueId: primaryVenue?.id || 'venue_upper_deck',
      title: `${getSportDisplayName(opp.sport)} Flash Open Play`,
      description: `Spontaneous open play session for court ${opp.courtName}. Instant rotation play!`,
      sport: opp.sport,
      courtIds: [opp.courtId],
      startTime: opp.timeRange.split(' - ')[0] || '14:00',
      endTime: opp.timeRange.split(' - ')[1] || '16:00',
      feeCents: 35000,
      maxPlayers: 12,
      rotationFormat: '2v2 Doubles Rotation',
      skillLevel: 'all_levels',
    });

    setMonetizeSuccessMessage(
      `Court ${opp.courtName} (${opp.timeRange}) successfully listed as an Open Play Session! Players can now join.`
    );
    setTimeout(() => setMonetizeSuccessMessage(null), 5000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 pb-24 md:pb-12">
      {/* Executive Operations Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8E5DF] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-[#1A241E] tracking-tight">
              Facility Ops &amp; Management
            </h1>
            {primaryVenue?.is_verified ? (
              <span className="rounded-full bg-[#1E4A32] px-3 py-1 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm">
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
          <p className="text-xs sm:text-sm text-[#65756B] mt-1">
            {primaryVenue?.name || 'Sports Facility'} &bull; Real-time court utilization, bookings ledger &amp; cash desk.
          </p>
        </div>

        {/* Action / Tab Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#E8E5DF] rounded-2xl overflow-x-auto self-start lg:self-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'games'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            Games
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('courts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'courts'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            Courts ({allFacilityCourts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'profile'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'bookings'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'payments'
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
            {totalBookingsCount}
          </div>
          <span className="text-[11px] text-[#2D724E] font-medium block">
            {bookings.filter((b) => b.status === 'confirmed').length} confirmed reservations
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
            <div className="bg-[#2D724E] h-full rounded-full" style={{ width: `${occupancyRate}%` }} />
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              {(facilityCourts.length > 0
                ? facilityCourts
                : primaryVenue?.courts && primaryVenue.courts.length > 0
                ? primaryVenue.courts
                : [
                    { id: 'c1', name: 'Court 1', sport: 'pickleball', hourly_rate_cents: 50000 },
                    { id: 'c2', name: 'Court 2', sport: 'pickleball', hourly_rate_cents: 50000 },
                    { id: 'c3', name: 'Court 3', sport: 'badminton', hourly_rate_cents: 45000 },
                  ]
              ).map((court, idx) => {
                const courtBookings = bookings.filter(
                  (b) => b.court_id === court.id || b.court?.name === court.name
                );
                const hasSession = primarySession?.court_ids?.includes(court.id);

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
                        {formatCurrency(court.hourly_rate_cents || 50000)}/hr standard rate
                      </span>
                    </div>

                    {/* Timeline Slots */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                      {[
                        { time: '08:00 - 10:00', type: courtBookings[0] ? 'booked' : 'free', label: courtBookings[0]?.user?.full_name || 'Available' },
                        { time: '10:00 - 12:00', type: hasSession ? 'session' : 'free', label: hasSession ? 'Open Play' : 'Available' },
                        { time: '13:00 - 15:00', type: 'free', label: 'Idle Slot' },
                        { time: '15:00 - 17:00', type: idx % 2 === 0 ? 'booked' : 'free', label: idx % 2 === 0 ? 'Reserved' : 'Available' },
                        { time: '17:00 - 19:00', type: 'booked', label: 'League Match' },
                        { time: '19:00 - 21:00', type: 'booked', label: 'Prime Slot' },
                      ].map((slot, sIdx) => {
                        if (slot.type === 'booked') {
                          return (
                            <div
                              key={sIdx}
                              className="p-2 rounded-xl bg-[#1E4A32] text-white text-[10px] space-y-0.5"
                            >
                              <span className="font-extrabold block truncate">{slot.label}</span>
                              <span className="text-[#E9C46A] text-[9px] block">{slot.time}</span>
                            </div>
                          );
                        }
                        if (slot.type === 'session') {
                          return (
                            <div
                              key={sIdx}
                              className="p-2 rounded-xl bg-[#E9C46A] text-[#1A241E] text-[10px] font-black space-y-0.5"
                            >
                              <span className="block truncate">{slot.label}</span>
                              <span className="text-[#A35C2B] text-[9px] block">{slot.time}</span>
                            </div>
                          );
                        }
                        return (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => setActiveTab('monetize')}
                            className="p-2 rounded-xl bg-white border border-[#E8E5DF] hover:border-[#2D724E] text-left text-[10px] space-y-0.5 transition-colors group"
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
              })}
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
                  {emptyOpportunities.length} idle court hours detected today
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
              onClick={() => setActiveTab('monetize')}
              className="px-5 py-3 rounded-xl bg-[#C87D43] hover:bg-[#A35C2B] text-white text-xs font-bold shadow-xs transition-all whitespace-nowrap min-h-[44px]"
            >
              Inspect Opportunities ({emptyOpportunities.length})
            </button>
          </div>

          {/* Quick Bookings Today */}
          <div className="lg:col-span-2 rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A241E]">Today&apos;s Reservations</h3>
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className="text-xs font-bold text-[#2D724E] hover:underline"
              >
                View All Bookings &rarr;
              </button>
            </div>

            <div className="divide-y divide-[#E8E5DF]">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-center text-xs font-bold text-[#1A241E]">
                      {booking.court?.name?.replace(/[^0-9]/g, '') || '1'}
                    </div>
                    <div>
                      <div className="font-bold text-[#1A241E]">
                        {booking.user?.full_name || 'Player'}
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
        <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5DF] pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1A241E]">
                All Court Reservations
              </h2>
              <p className="text-xs text-[#65756B]">
                Confirmed player reservations, court assignments, and check-in statuses.
              </p>
            </div>
            <span className="text-xs font-bold text-[#2D724E] bg-[#EBF4EE] px-3 py-1 rounded-full self-start sm:self-auto">
              {bookings.length} Total Bookings
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E5DF] text-[#65756B] font-semibold">
                  <th className="pb-3 pr-4">Reference</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Sport &amp; Court</th>
                  <th className="pb-3 pr-4">Date &amp; Time</th>
                  <th className="pb-3 pr-4">Payment</th>
                  <th className="pb-3 pr-4 text-right">Amount</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5DF]">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3 pr-4 font-mono font-bold text-[#1A241E]">
                      {b.booking_reference}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-[#1A241E] block">
                        {b.user?.full_name || 'Customer'}
                      </span>
                      <span className="text-[10px] text-[#65756B]">
                        {b.user?.phone || 'No phone'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-[#1A241E] block capitalize">
                        {b.sport}
                      </span>
                      <span className="text-[10px] text-[#65756B]">
                        {b.court?.name || 'Court'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[#65756B]">
                      <div className="font-medium text-[#1A241E]">{b.booking_date}</div>
                      <div className="text-[10px]">{b.start_time} - {b.end_time}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                          b.payment_status === 'approved' || b.status === 'confirmed'
                            ? 'bg-[#EBF4EE] text-[#1E4A32]'
                            : b.payment_status === 'cash_at_venue'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {b.payment_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-[#1A241E]">
                      {formatCurrency(b.total_amount_cents)}
                    </td>
                    <td className="py-3 text-right">
                      {b.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => handleCheckInBooking(b.id)}
                          className="px-3 py-1 rounded-lg bg-[#2D724E] hover:bg-[#1E4A32] text-white text-[11px] font-bold shadow-sm transition-all"
                        >
                          Check In
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#2D724E] inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Checked In
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          walkInFormat === 'doubles'
                            ? 'bg-[#2D724E] text-white shadow-xs'
                            : 'text-[#65756B] hover:text-[#1A241E]'
                        }`}
                      >
                        Doubles
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalkInFormat('singles')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          walkInFormat === 'singles'
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
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      entry.status === 'on_court'
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
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isCash
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E]">Time Schedule</label>
                  <input
                    type="text"
                    value={newGameTime}
                    onChange={(e) => setNewGameTime(e.target.value)}
                    placeholder="18:00 - 20:00"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E]">Player Fee (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={newGameFee}
                    onChange={(e) => setNewGameFee(e.target.value)}
                    placeholder="350"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                  />
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
            {sessions.filter((s) => s.venue_id === primaryVenue.id).length === 0 ? (
              <div className="py-8 text-center text-xs text-[#65756B]">
                No upcoming facility-hosted games right now. Click &quot;Create Hosted Game&quot; to recruit players.
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.filter((s) => s.venue_id === primaryVenue.id).map((session) => (
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E]">Hourly Rate (₱)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newCourtRate}
                    onChange={(e) => setNewCourtRate(e.target.value)}
                    placeholder="600"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A241E]">Playing Surface</label>
                  <input
                    type="text"
                    value={newCourtSurface}
                    onChange={(e) => setNewCourtSurface(e.target.value)}
                    placeholder="Hard Court, Taraflex, Wood"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                  />
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
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCurrentlyActive
                              ? 'bg-[#EBF4EE] text-[#1E4A32]'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {isCurrentlyActive ? 'Active & Available' : 'Temporarily Closed'}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-[#1A241E]">{court.name}</h3>
                      <p className="text-xs text-[#65756B] mt-0.5">
                        Surface: {court.floor_type || court.surface || 'Standard'} &bull; Indoor
                      </p>

                      <div className="mt-3 pt-3 border-t border-[#E8E5DF] flex items-center justify-between">
                        <span className="text-xs text-[#65756B]">Standard Rate</span>
                        <span className="text-sm font-black text-[#1A241E]">
                          {formatCurrency(court.hourly_rate_cents || 60000)} / hr
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => toggleCourtStatus(court.id, court.is_active !== false)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          isCurrentlyActive
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
          <div className="rounded-3xl border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E5DF] pb-5">
              <div>
                <span className="text-xs font-bold text-[#65756B] uppercase tracking-wider block">
                  Facility Profile
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1A241E]">
                  {primaryVenue.name}
                </h2>
                <p className="text-xs text-[#65756B] mt-0.5">{primaryVenue.description}</p>
              </div>

              <div>
                {primaryVenue.is_verified ? (
                  <span className="rounded-full bg-[#1E4A32] px-3.5 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-[#C8FF2E]" />
                    Verified Facility
                  </span>
                ) : (
                  <span className="rounded-full bg-[#FBF0E6] border border-[#C87D43]/40 px-3.5 py-1.5 text-xs font-bold text-[#A35C2B] flex items-center gap-1.5 shadow-sm">
                    <Clock className="w-4 h-4 text-[#C87D43]" />
                    Pending Verification (Draft Mode)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-2">
                <span className="font-bold text-[#1A241E] uppercase text-[10px] tracking-wider block">
                  Location &amp; Coordinates
                </span>
                <p className="text-[#1A241E] font-medium">{primaryVenue.address}</p>
                <p className="text-[#65756B]">{primaryVenue.city}, Philippines</p>
                <p className="text-[10px] font-mono text-[#65756B] pt-1">
                  Lat: {primaryVenue.latitude} &bull; Lon: {primaryVenue.longitude}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-2">
                <span className="font-bold text-[#1A241E] uppercase text-[10px] tracking-wider block">
                  Operator Contact Desk
                </span>
                <p className="text-[#1A241E] font-medium">Owner: {currentUser.full_name || 'Facility Manager'}</p>
                <p className="text-[#65756B]">Email: {currentUser.email || 'manager@facility.ph'}</p>
                <p className="text-[#65756B]">Phone: {currentUser.phone || '0917-888-0000'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-2">
                <span className="font-bold text-[#1A241E] uppercase text-[10px] tracking-wider block">
                  Operating Hours
                </span>
                <p className="text-[#1A241E] font-medium">Monday &ndash; Sunday: 06:00 &ndash; 23:00</p>
                <p className="text-[#65756B]">Online court booking open 24/7 on SportSync.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-2">
                <span className="font-bold text-[#1A241E] uppercase text-[10px] tracking-wider block">
                  Supported Sports
                </span>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {primaryVenue.featured_sports.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E8E5DF] text-[11px] font-semibold text-[#1A241E] capitalize"
                    >
                      {getSportDisplayName(s)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#E8E5DF] flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E8E5DF] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A241E] text-center transition-colors"
              >
                &larr; Switch to Player Application
              </Link>
            </div>
          </div>
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

      {selectedScoreMatch && (
        <ScoreModal
          isOpen={Boolean(selectedScoreMatch)}
          onClose={() => setSelectedScoreMatch(null)}
          match={selectedScoreMatch}
        />
      )}
    </div>
  );
}
