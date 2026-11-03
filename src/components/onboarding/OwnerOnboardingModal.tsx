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
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OwnerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function OwnerOnboardingModal({ isOpen, onClose }: OwnerOnboardingModalProps) {
  const { currentUser, completeOwnerOnboarding } = useMatchiStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

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
  const [ownerPhone, setOwnerPhone] = useState(currentUser.phone || '');

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

  const [selectedSports, setSelectedSports] = useState<SportType[]>(['pickleball', 'badminton']);

  const [courts, setCourts] = useState<NewCourtInput[]>([
    {
      name: '',
      sport: 'pickleball',
      hourlyRateCents: 50000,
      floorType: '',
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
        name: '',
        sport: defaultSport,
        hourlyRateCents: 45000,
        floorType: '',
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
        description: description.trim(),
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
        colors: ['#2D724E', '#C87D43', '#E9C46A'],
      });

      onClose();
      // Redirect to Facility Dashboard per specification
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/organizer';
        }, 500);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to register facility.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E5DF] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2D724E]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E]">
                Business Facility Onboarding
              </span>
            </div>
            <h3 className="font-display text-base sm:text-lg font-black text-black mt-0.5">
              List Your Facility on SportSync
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-black hover:bg-[#E8E5DF] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-[#FAF8F5] px-3 sm:px-6 py-2.5 border-b border-[#E8E5DF] flex items-center justify-between text-xs font-bold text-black shrink-0 overflow-x-auto no-scrollbar gap-1 sm:gap-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step >= 1 ? 'bg-[#2D724E] text-white' : 'bg-[#E8E5DF] text-black font-black'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'text-black font-black' : 'text-black/80 font-bold'}>Contact</span>
          </div>
          <div className="h-0.5 w-6 bg-[#E8E5DF]" />
          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step >= 2 ? 'bg-[#2D724E] text-white' : 'bg-[#E8E5DF] text-black font-black'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'text-black font-black' : 'text-black/80 font-bold'}>Facility</span>
          </div>
          <div className="h-0.5 w-6 bg-[#E8E5DF]" />
          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step >= 3 ? 'bg-[#2D724E] text-white' : 'bg-[#E8E5DF] text-black font-black'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'text-black font-black' : 'text-black/80 font-bold'}>Courts</span>
          </div>
          <div className="h-0.5 w-6 bg-[#E8E5DF]" />
          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step >= 4 ? 'bg-[#2D724E] text-white' : 'bg-[#E8E5DF] text-black font-black'
              }`}
            >
              4
            </span>
            <span className={step === 4 ? 'text-black font-black' : 'text-black/80 font-bold'}>Model</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {submitError && step < 4 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
              {submitError}
            </div>
          )}
          {/* STEP 1: Owner Contact */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div>
                <h4 className="font-display text-sm font-black text-black">Owner / Representative Details</h4>
                <p className="text-xs text-black font-normal mt-0.5 leading-relaxed">
                  Used for verified booking notifications, payout confirmations, and court ops access.
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-black text-black block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Carlos Tan"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-black block mb-1">Business Email</label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="e.g. carlos@upperdecksports.ph"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-black block mb-1">Contact Phone (GCash / SMS)</label>
                  <input
                    type="text"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="e.g. 0917-888-0000"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Facility Information */}
          {step === 2 && (
            <div className="space-y-3.5">
              <div>
                <h4 className="font-display text-sm font-black text-black">Facility Profile</h4>
                <p className="text-xs text-black font-normal mt-0.5 leading-relaxed">
                  Tell players where you are located and what sports you host.
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-black text-black block mb-1">Facility Name</label>
                  <input
                    type="text"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    placeholder="e.g. BGC Center Court & Smash Hub"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-black block mb-1">Full Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 32nd St cor 9th Ave, Bonifacio Global City"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-black text-black block mb-1">City / Municipality</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Naga City"
                      className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-black block mb-1">Hours</label>
                    <div className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] text-xs font-semibold text-black bg-[#FAF8F5] flex items-center">
                      06:00 AM - 11:00 PM
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-black block mb-1">Short Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mention flooring quality, air conditioning, parking, racket stringing, etc..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none resize-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Sports & Playing Areas */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-display text-sm font-black text-black">Sports &amp; Playing Areas</h4>
                <p className="text-xs text-black font-normal mt-0.5 leading-relaxed">
                  Select the sports your facility supports and define court rates.
                </p>
              </div>

              {/* Multi-Sport selector */}
              <div>
                <label className="text-[11px] font-black text-black block mb-1.5">
                  Supported Sports (Hybrid Facilities Supported)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_SPORTS.map((sport) => {
                    const isSelected = selectedSports.includes(sport.id);
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => toggleSport(sport.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#2D724E] text-white border-[#2D724E] shadow-xs'
                            : 'bg-white border-[#E8E5DF] text-black font-bold hover:border-[#2D724E]'
                        }`}
                      >
                        {sport.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Courts list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-black">
                    Courts &amp; Pricing ({courts.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCourt}
                    className="text-xs font-black text-[#2D724E] hover:text-[#1E4A32] flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Court</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {courts.map((court, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-[#E8E5DF] bg-[#FAF8F5] space-y-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={court.name}
                          onChange={(e) => handleUpdateCourt(idx, 'name', e.target.value)}
                          placeholder="Court Name"
                          className="flex-1 px-3 py-2 min-h-[40px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none"
                        />
                        <select
                          value={court.sport}
                          onChange={(e) => handleUpdateCourt(idx, 'sport', e.target.value as SportType)}
                          className="px-3 py-2 min-h-[40px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-black focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none"
                        >
                          {selectedSports.map((s) => (
                            <option key={s} value={s}>
                              {getSportDisplayName(s)}
                            </option>
                          ))}
                        </select>
                        {courts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCourt(idx)}
                            className="p-2 text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors"
                            title="Remove court"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase text-[#65756B]">Floor Surface</span>
                            <span className="text-xs font-bold text-[#2D724E]">{court.floorType || 'Select'}</span>
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {['Cushioned Acrylic', 'BWF Taraflex Rubber', 'Hard Court', 'Wood Parquet', 'Synthetic Turf'].map((surf) => (
                              <button
                                key={surf}
                                type="button"
                                aria-pressed={court.floorType === surf}
                                onClick={() => handleUpdateCourt(idx, 'floorType', surf)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                  court.floorType === surf
                                    ? 'bg-[#2D724E] text-white border-[#2D724E] font-bold shadow-xs'
                                    : 'bg-white text-black border-[#E8E5DF] hover:border-[#2D724E]'
                                }`}
                              >
                                {surf}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="pt-1 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase text-[#65756B]">Hourly Rate</span>
                          <div className="flex items-center gap-1.5">
                            <div className="inline-flex items-center gap-1 bg-white border border-[#E8E5DF] px-2 py-0.5 rounded-lg">
                              <button
                                type="button"
                                aria-label="Decrease court hourly rate"
                                onClick={() => handleUpdateCourt(idx, 'hourlyRateCents', Math.max(10000, court.hourlyRateCents - 5000))}
                                className="w-6 h-6 rounded bg-[#FAF8F5] text-xs font-bold text-black flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="font-mono text-xs font-bold text-[#2D724E] px-1">₱{court.hourlyRateCents / 100}/hr</span>
                              <button
                                type="button"
                                aria-label="Increase court hourly rate"
                                onClick={() => handleUpdateCourt(idx, 'hourlyRateCents', court.hourlyRateCents + 5000)}
                                className="w-6 h-6 rounded bg-[#2D724E] text-xs font-bold text-white flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                            {[350, 450, 500, 600, 800].map((rateVal) => (
                              <button
                                key={rateVal}
                                type="button"
                                aria-pressed={court.hourlyRateCents === rateVal * 100}
                                onClick={() => handleUpdateCourt(idx, 'hourlyRateCents', rateVal * 100)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all ${
                                  court.hourlyRateCents === rateVal * 100
                                    ? 'bg-[#2D724E] text-white border-[#2D724E] font-bold'
                                    : 'bg-white text-black border-[#E8E5DF] hover:border-[#2D724E]'
                                }`}
                              >
                                ₱{rateVal}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Inventory & Monetization Model */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-display text-sm font-black text-black">Marketplace Inventory Model</h4>
                <p className="text-xs text-black font-normal mt-0.5 leading-relaxed">
                  Choose how SportSync connects to your courts. We do not force you to replace your existing POS.
                </p>
              </div>

              <div className="space-y-2">
                {INVENTORY_OPTIONS.map((opt) => {
                  const isSelected = inventorySource === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setInventorySource(opt.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-[#2D724E] bg-[#EBF4EE] shadow-xs'
                          : 'border-[#E8E5DF] bg-white hover:border-[#D4CEBE]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-black">{opt.title}</div>
                        <p className="text-[11px] text-black font-medium mt-0.5 leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>

                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'border-[#2D724E] bg-[#2D724E]' : 'border-[#D4CEBE]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {inventorySource === 'external_link' && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-black text-black flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5 text-[#2D724E]" />
                    External Booking URL
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://yourfacilitybooking.com/reserve"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-black placeholder:text-gray-400 focus:border-[#2D724E] focus:ring-1 focus:ring-[#2D724E] focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-black font-medium">
                    Players will see a direct link to your existing booking system.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#E8E5DF] flex items-center justify-between gap-3 shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-black hover:bg-[#FAF8F5] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <span className="text-[11px] text-black font-bold">Step 1 of 4</span>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && (!ownerName.trim() || !ownerEmail.trim())) {
                  setSubmitError('Please enter your name and business email.');
                  return;
                }
                if (step === 2 && (!facilityName.trim() || !address.trim() || !city.trim())) {
                  setSubmitError('Please enter facility name, address, and city.');
                  return;
                }
                if (step === 3 && courts.some((c) => !c.name.trim())) {
                  setSubmitError('Please enter a name for each court.');
                  return;
                }
                setSubmitError(null);
                setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              {submitError && (
                <span className="text-xs font-bold text-red-600">{submitError}</span>
              )}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 min-h-[44px] rounded-xl bg-[#1E4A32] hover:bg-[#153423] text-[#E9C46A] text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-[#E9C46A]" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Facility'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
