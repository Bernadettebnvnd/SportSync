'use client';

import React, { useState, useEffect } from 'react';
import { useMatchiStore } from '@/lib/store';
import { SportType, FacilityInventorySource } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import {
  X,
  Building2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Check,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Clock,
  Loader2,
  LogOut,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OwnerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

interface NewCourtInput {
  name: string;
  sport: SportType;
  hourlyRateCents: number;
  floorType: string;
}

const AVAILABLE_SPORTS: { id: SportType; label: string }[] = [
  { id: 'basketball', label: 'Basketball' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'volleyball', label: 'Volleyball' },
  { id: 'football' as any, label: 'Football' },
  { id: 'pickleball', label: 'Pickleball' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'billiards' as any, label: 'Billiards' },
  { id: 'darts' as any, label: 'Darts' },
  { id: 'other' as any, label: 'Other' },
];

const INVENTORY_OPTIONS: { id: FacilityInventorySource; title: string; desc: string }[] = [
  {
    id: 'manual',
    title: 'Direct Marketplace Slots (Manual)',
    desc: 'List dedicated court slots directly on SportSync and receive verified online bookings.',
  },
  {
    id: 'external_link',
    title: 'Referral / External Booking System',
    desc: 'Link players to your existing court booking portal or facility WhatsApp/SMS desk.',
  },
  {
    id: 'partner',
    title: 'Partner Synchronized Inventory',
    desc: 'Work with SportSync operations to schedule weekly empty-court monetization batches.',
  },
];

export function OwnerOnboardingModal({ isOpen, onClose, onLogout }: OwnerOnboardingModalProps) {
  const { currentUser, completeOwnerOnboarding, logoutUser } = useMatchiStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const handleModalLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
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
          'sportsync_facility_venue_id',
        ];
        authKeys.forEach((k) => localStorage.removeItem(k));
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sportsync_venue_id_') || key.startsWith('sb-') || key.startsWith('supabase.'))) {
            localStorage.removeItem(key);
          }
        }
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

  const initialStoredName =
    typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_name') || '' : '';
  const resolvedInitialOwnerName =
    currentUser.full_name && !['Guest', 'Guest Player'].includes(currentUser.full_name)
      ? currentUser.full_name
      : initialStoredName && !['Guest', 'Guest Player'].includes(initialStoredName)
      ? initialStoredName
      : '';

  const [ownerName, setOwnerName] = useState(resolvedInitialOwnerName);
  const [ownerEmail, setOwnerEmail] = useState(
    currentUser.email ||
    (typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_email') : '') ||
    ''
  );
  const [ownerPhone, setOwnerPhone] = useState('');

  useEffect(() => {
    if (currentUser.full_name && !['Guest', 'Guest Player'].includes(currentUser.full_name) && !ownerName) {
      setOwnerName(currentUser.full_name);
    }
    if (currentUser.email && !ownerEmail) setOwnerEmail(currentUser.email);
    if (typeof window !== 'undefined') {
      if (!ownerName) {
        const storedName = localStorage.getItem('sportsync_user_name');
        if (storedName && !['Guest', 'Guest Player'].includes(storedName)) setOwnerName(storedName);
      }
      if (!ownerEmail) {
        const storedEmail = localStorage.getItem('sportsync_user_email');
        if (storedEmail) setOwnerEmail(storedEmail);
      }
    }
  }, [currentUser.full_name, currentUser.email, ownerName, ownerEmail]);

  const [facilityName, setFacilityName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(currentUser.city || 'Naga City');

  const [selectedSports, setSelectedSports] = useState<SportType[]>([]);

  const [courts, setCourts] = useState<NewCourtInput[]>([
    {
      name: 'Court 1',
      sport: 'pickleball',
      hourlyRateCents: 50000,
      floorType: 'Cushioned Acrylic Surface',
    },
    {
      name: 'Court 2',
      sport: 'badminton',
      hourlyRateCents: 45000,
      floorType: 'Rubber Cushion Surface',
    },
  ]);

  const [inventorySource, setInventorySource] = useState<FacilityInventorySource>('manual');
  const [externalUrl, setExternalUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSport = (sportId: SportType) => {
    if (selectedSports.includes(sportId)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sportId));
      }
    } else {
      setSelectedSports([...selectedSports, sportId]);
    }
  };

  const handleAddCourt = () => {
    const defaultSport = selectedSports[0] || 'pickleball';
    setCourts([
      ...courts,
      {
        name: `Court ${courts.length + 1}`,
        sport: defaultSport,
        hourlyRateCents: 50000,
        floorType: 'Tournament Standard Surface',
      },
    ]);
  };

  const handleRemoveCourt = (index: number) => {
    if (courts.length > 1) {
      setCourts(courts.filter((_, i) => i !== index));
    }
  };

  const handleUpdateCourt = <K extends keyof NewCourtInput>(
    index: number,
    field: K,
    value: NewCourtInput[K]
  ) => {
    setCourts(
      courts.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await completeOwnerOnboarding({
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPhone: ownerPhone.trim(),
        facilityName: facilityName.trim(),
        description: description.trim() || 'Quality dedicated sports facility with tournament-standard courts in Naga City.',
        address: address.trim(),
        city: city.trim(),
        featuredSports: selectedSports,
        courts: courts.map((c) => ({
          ...c,
          name: c.name.trim(),
          floorType: c.floorType.trim(),
        })),
        inventorySource,
      });

      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#C8FF2E', '#3DDC84', '#FFFFFF'],
      });

      onClose();
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/organizer';
        }, 400);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to register facility.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#0B0F0C] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#141A15] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C8FF2E]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#C8FF2E]">
                Faculty &amp; Facility Setup
              </span>
            </div>
            <h3 className="font-display text-base sm:text-lg font-black text-[#F4F7F0] mt-0.5">
              List Facility on SportSync
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleModalLogout}
              disabled={isLoggingOut}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Log out of account"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <LogOut className="w-3 h-3" />
              )}
              <span>Log Out</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-[#141A15] px-4 sm:px-6 py-2.5 border-b border-white/5 flex items-center justify-between text-xs font-semibold text-[#A5B0A6] shrink-0 gap-2">
          {[
            { stepNum: 1, label: 'Contact' },
            { stepNum: 2, label: 'Facility' },
            { stepNum: 3, label: 'Courts' },
            { stepNum: 4, label: 'Model' },
          ].map((item, idx) => (
            <React.Fragment key={item.stepNum}>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    step >= item.stepNum
                      ? 'bg-[#C8FF2E] text-[#0B0F0C]'
                      : 'bg-[#1C241E] text-[#A5B0A6]'
                  }`}
                >
                  {item.stepNum}
                </span>
                <span className={`text-[11px] ${step === item.stepNum ? 'text-[#C8FF2E] font-bold' : 'text-[#A5B0A6]'}`}>
                  {item.label}
                </span>
              </div>
              {idx < 3 && <div className="h-0.5 flex-1 bg-white/5" />}
            </React.Fragment>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 no-scrollbar">
          {submitError && step < 4 && (
            <div className="p-3.5 rounded-2xl bg-[#E0533C]/10 border border-[#E0533C]/30 text-[#FFA494] text-xs font-semibold">
              {submitError}
            </div>
          )}

          {/* STEP 1: Owner Contact */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h4 className="font-display text-sm font-bold text-[#F4F7F0]">Management &amp; Contact Details</h4>
                <p className="text-xs text-[#A5B0A6] mt-0.5 leading-relaxed">
                  Used for verified court booking notifications, payout confirmations, and management desk operations.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Full Contact Name</label>
                  <div className="relative flex items-center">
                    <UserIcon className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Coach Carlo Rivera"
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Official Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="e.g. athletics@university.edu.ph"
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Contact Phone (GCash / SMS)</label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                    <input
                      type="text"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="e.g. 0917-888-0000"
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Facility Information */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h4 className="font-display text-sm font-bold text-[#F4F7F0]">Facility Profile &amp; Location</h4>
                <p className="text-xs text-[#A5B0A6] mt-0.5 leading-relaxed">
                  Provide your facility name and campus/street location in Naga City.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Facility Name</label>
                  <div className="relative flex items-center">
                    <Building2 className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                    <input
                      type="text"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      placeholder="e.g. Ateneo Sports Pavilion"
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Campus / Street Address</label>
                  <div className="relative flex items-center">
                    <MapPin className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Ateneo Avenue, Bagumbayan Sur"
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Pilot City</label>
                  <input
                    type="text"
                    readOnly
                    value="Naga City, Camarines Sur"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#141A15] border border-white/5 text-xs text-[#F4F7F0] font-semibold cursor-default"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Featured Sports</label>
                  <div className="flex gap-2 flex-wrap">
                    {AVAILABLE_SPORTS.map((sport) => {
                      const isSelected = selectedSports.includes(sport.id);
                      return (
                        <button
                          key={sport.id}
                          type="button"
                          onClick={() => toggleSport(sport.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                              : 'bg-[#141A15] border-white/5 text-[#A5B0A6]'
                          }`}
                        >
                          <span>{sport.label}</span>
                          {isSelected && <Check className="w-3 h-3 text-[#C8FF2E]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Court Setup */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-sm font-bold text-[#F4F7F0]">Courts &amp; Pricing Setup</h4>
                  <p className="text-xs text-[#A5B0A6] mt-0.5">
                    Define the courts, surfaces, and hourly rates available at your venue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCourt}
                  className="px-3 py-1.5 rounded-xl bg-[#1C241E] border border-[#C8FF2E]/30 text-[#C8FF2E] text-xs font-bold flex items-center gap-1.5 hover:bg-[#253028]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Court</span>
                </button>
              </div>

              <div className="space-y-3">
                {courts.map((court, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#141A15] border border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F4F7F0]">Court #{idx + 1}</span>
                      {courts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCourt(idx)}
                          className="text-[#E0533C] hover:text-[#FFA494] text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={court.name}
                        onChange={(e) => handleUpdateCourt(idx, 'name', e.target.value)}
                        placeholder="Court Name e.g. Court 1"
                        className="h-10 px-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                      />
                      <select
                        value={court.sport}
                        onChange={(e) => handleUpdateCourt(idx, 'sport', e.target.value as SportType)}
                        className="h-10 px-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none capitalize"
                      >
                        {selectedSports.map((s) => (
                          <option key={s} value={s}>
                            {getSportDisplayName(s)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={court.hourlyRateCents / 100}
                        onChange={(e) => handleUpdateCourt(idx, 'hourlyRateCents', Number(e.target.value) * 100)}
                        placeholder="Hourly Rate (₱)"
                        className="h-10 px-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Inventory Model */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h4 className="font-display text-sm font-bold text-[#F4F7F0]">Booking Model</h4>
                <p className="text-xs text-[#A5B0A6] mt-0.5">
                  Choose how court reservations are received and confirmed.
                </p>
              </div>

              <div className="space-y-2.5">
                {INVENTORY_OPTIONS.map((opt) => {
                  const isSelected = inventorySource === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setInventorySource(opt.id)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.15)]'
                          : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                      }`}
                    >
                      <div className="space-y-0.5 pr-2">
                        <span className={`text-xs font-bold block ${isSelected ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                          {opt.title}
                        </span>
                        <p className="text-[11px] text-[#A5B0A6]">{opt.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#C8FF2E] border-[#C8FF2E] text-[#0B0F0C]' : 'border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {inventorySource === 'external_link' && (
                <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/10 space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-bold text-[#F4F7F0] flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5 text-[#C8FF2E]" />
                    External Booking URL
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://yourfacilitybooking.com/reserve"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-[#141A15] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-[#1C241E] text-xs font-bold text-[#F4F7F0] hover:bg-[#253028] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#A5B0A6] font-bold">Step 1 of 4</span>
              <span className="text-[#A5B0A6]/40 text-xs">•</span>
              <button
                type="button"
                onClick={handleModalLogout}
                disabled={isLoggingOut}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && (!ownerName.trim() || !ownerEmail.trim())) {
                  setSubmitError('Please enter contact name and email.');
                  return;
                }
                if (step === 2 && (!facilityName.trim() || !address.trim())) {
                  setSubmitError('Please enter facility name and address.');
                  return;
                }
                if (step === 3 && courts.some((c) => !c.name.trim())) {
                  setSubmitError('Please enter a name for each court.');
                  return;
                }
                setSubmitError(null);
                setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[42px] rounded-xl bg-[#C8FF2E] hover:bg-[#BCEE26] text-[#0B0F0C] text-xs font-bold shadow-[0_4px_16px_rgba(200,255,46,0.3)] transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 min-h-[42px] rounded-xl bg-[#C8FF2E] hover:bg-[#BCEE26] text-[#0B0F0C] text-xs font-bold shadow-[0_4px_20px_rgba(200,255,46,0.3)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B0F0C]" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#0B0F0C]" />
                    <span>Publish &amp; Open Portal</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
