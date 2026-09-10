'use client';

import React, { useState } from 'react';
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
  { id: 'pickleball', label: 'Pickleball' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'padel', label: 'Padel' },
];

const INVENTORY_OPTIONS: { id: FacilityInventorySource; title: string; desc: string }[] = [
  {
    id: 'manual',
    title: 'Direct Marketplace Slots (Manual)',
    desc: 'List dedicated court slots directly on Matchi and receive verified online bookings.',
  },
  {
    id: 'external_link',
    title: 'Referral / External Booking System',
    desc: 'Link players to your existing court booking portal or facility WhatsApp/SMS desk.',
  },
  {
    id: 'partner',
    title: 'Partner Synchronized Inventory',
    desc: 'Work with Matchi operations to schedule weekly empty-court monetization batches.',
  },
];

export function OwnerOnboardingModal({ isOpen, onClose }: OwnerOnboardingModalProps) {
  const { currentUser, completeOwnerOnboarding } = useMatchiStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [ownerName, setOwnerName] = useState(currentUser.full_name || '');
  const [ownerEmail, setOwnerEmail] = useState(currentUser.email || '');
  const [ownerPhone, setOwnerPhone] = useState(currentUser.phone || '0917-888-0000');

  const [facilityName, setFacilityName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(currentUser.city || 'Metro Manila');

  const [selectedSports, setSelectedSports] = useState<SportType[]>(['pickleball', 'badminton']);

  const [courts, setCourts] = useState<NewCourtInput[]>([
    {
      name: 'Court 1 (Tournament)',
      sport: 'pickleball',
      hourlyRateCents: 50000,
      floorType: 'Cushioned Acrylic Surface',
    },
    {
      name: 'Court 2 (Standard)',
      sport: 'badminton',
      hourlyRateCents: 45000,
      floorType: 'Yonex BWF Taraflex Rubber',
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
    const newIndex = courts.length + 1;
    const defaultSport = selectedSports[0] || 'pickleball';
    setCourts([
      ...courts,
      {
        name: `Court ${newIndex}`,
        sport: defaultSport,
        hourlyRateCents: 45000,
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
        ownerName: ownerName.trim() || 'Facility Partner',
        ownerEmail: ownerEmail.trim() || 'owner@facility.ph',
        ownerPhone: ownerPhone.trim(),
        facilityName: facilityName.trim() || 'Metro Sports Hub',
        description:
          description.trim() ||
          'Premier multi-sport training center with tournament standard courts and amenities.',
        address: address.trim() || '123 Sports Blvd, Metro Manila',
        city: city.trim() || 'Taguig City',
        featuredSports: selectedSports,
        courts,
        inventorySource,
      });

      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#2D724E', '#C87D43', '#E9C46A'],
      });

      onClose();
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
            <h3 className="text-base sm:text-lg font-black text-[#1A241E] mt-0.5">
              List Your Facility on Matchi
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#65756B] hover:bg-[#E8E5DF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-[#FAF8F5] px-4 sm:px-6 py-2 border-b border-[#E8E5DF] flex items-center justify-between text-xs font-bold text-[#65756B] shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step >= 1 ? 'bg-[#2D724E] text-white' : 'bg-[#E8E5DF] text-[#65756B]'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'text-[#1A241E]' : ''}>Contact</span>
          </div>
          <div className="h-0.5 w-6 bg-[#E8E5DF]" />
          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step >= 2 ? 'bg-[#2D724E] text-white' : 'bg-[#E8E5DF] text-[#65756B]'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'text-[#1A241E]' : ''}>Facility</span>
          </div>
          <div className="h-0.5 w-6 bg-[#E8E5DF]" />
          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step >= 3 ? 'bg-[#2D724E] text-white' : 'bg-[#E8E5DF] text-[#65756B]'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'text-[#1A241E]' : ''}>Courts</span>
          </div>
          <div className="h-0.5 w-6 bg-[#E8E5DF]" />
          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step >= 4 ? 'bg-[#2D724E] text-white' : 'bg-[#E8E5DF] text-[#65756B]'
              }`}
            >
              4
            </span>
            <span className={step === 4 ? 'text-[#1A241E]' : ''}>Model</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: Owner Contact */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div>
                <h4 className="text-sm font-black text-[#1A241E]">Owner / Representative Details</h4>
                <p className="text-xs text-[#65756B]">
                  Used for verified booking notifications, payout confirmations, and court ops access.
                </p>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-black text-[#1A241E] block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Carlos Tan"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-[#1A241E] block mb-1">Business Email</label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="e.g. carlos@upperdecksports.ph"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-[#1A241E] block mb-1">Contact Phone (GCash / SMS)</label>
                  <input
                    type="text"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="e.g. 0917-888-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
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
                <h4 className="text-sm font-black text-[#1A241E]">Facility Profile</h4>
                <p className="text-xs text-[#65756B]">
                  Tell players where you are located and what sports you host.
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-black text-[#1A241E] block mb-1">Facility Name</label>
                  <input
                    type="text"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    placeholder="e.g. BGC Center Court & Smash Hub"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-[#1A241E] block mb-1">Full Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 32nd St cor 9th Ave, Bonifacio Global City"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-black text-[#1A241E] block mb-1">City / Municipality</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Taguig City"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-[#1A241E] block mb-1">Hours</label>
                    <input
                      type="text"
                      defaultValue="06:00 AM - 11:00 PM"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs bg-[#FAF8F5]"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-[#1A241E] block mb-1">Short Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mention flooring quality, air conditioning, parking, racket stringing, etc..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Sports & Playing Areas */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-[#1A241E]">Sports &amp; Playing Areas</h4>
                <p className="text-xs text-[#65756B]">
                  Select the sports your facility supports and define court rates.
                </p>
              </div>

              {/* Multi-Sport selector */}
              <div>
                <label className="text-[11px] font-black text-[#1A241E] block mb-1.5">
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
                            : 'bg-white border-[#E8E5DF] text-[#65756B] hover:border-[#2D724E]'
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
                  <label className="text-[11px] font-black text-[#1A241E]">
                    Courts &amp; Pricing ({courts.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCourt}
                    className="text-xs font-black text-[#2D724E] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Court</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {courts.map((court, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-[#E8E5DF] bg-[#FAF8F5] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={court.name}
                          onChange={(e) => handleUpdateCourt(idx, 'name', e.target.value)}
                          placeholder="Court Name"
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] bg-white text-xs font-bold"
                        />
                        <select
                          value={court.sport}
                          onChange={(e) => handleUpdateCourt(idx, 'sport', e.target.value as SportType)}
                          className="px-2 py-1.5 rounded-lg border border-[#E8E5DF] bg-white text-xs font-bold"
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
                            className="p-1.5 text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg"
                            title="Remove court"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={court.floorType}
                            onChange={(e) => handleUpdateCourt(idx, 'floorType', e.target.value)}
                            placeholder="Floor Surface (e.g. BWF Taraflex)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] bg-white text-xs text-[#65756B]"
                          />
                        </div>
                        <div className="w-32">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#65756B]">
                              ₱
                            </span>
                            <input
                              type="number"
                              value={court.hourlyRateCents / 100}
                              onChange={(e) =>
                                handleUpdateCourt(idx, 'hourlyRateCents', Number(e.target.value) * 100)
                              }
                              placeholder="Rate/hr"
                              className="w-full pl-5 pr-2 py-1.5 rounded-lg border border-[#E8E5DF] bg-white text-xs font-bold text-right"
                            />
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
                <h4 className="text-sm font-black text-[#1A241E]">Marketplace Inventory Model</h4>
                <p className="text-xs text-[#65756B]">
                  Choose how Matchi connects to your courts. We do not force you to replace your existing POS.
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
                        <div className="text-xs font-black text-[#1A241E]">{opt.title}</div>
                        <p className="text-[11px] text-[#65756B] mt-0.5 leading-relaxed">
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
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-bold text-[#1A241E] flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 text-[#2D724E]" />
                    External Booking URL
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://yourfacilitybooking.com/reserve"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs"
                  />
                  <p className="text-[10px] text-[#65756B]">
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs font-bold text-[#1A241E] hover:bg-[#FAF8F5]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <span className="text-[11px] text-[#65756B] font-bold">Step 1 of 4</span>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all"
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
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#1E4A32] hover:bg-[#153423] text-[#E9C46A] text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
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
