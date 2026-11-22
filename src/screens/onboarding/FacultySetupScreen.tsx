'use client';

import React, { useState } from 'react';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  User as UserIcon,
  Mail,
  Phone,
  Clock,
  Navigation,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { SportIcon, SportId } from '../../illustrations/SportIcons';
import { PRIMARY_SPORTS, PrimarySport } from '../../config/sports';
import { getPlayerInitials } from '@/lib/utils';
import { useMatchiStore } from '../../lib/store';
import { SportType } from '@/types';
import confetti from 'canvas-confetti';

export interface FacultySetupData {
  facilityName: string;
  facilityType: 'university' | 'club' | 'public' | 'commercial';
  adminName: string;
  email: string;
  phone: string;
  city?: string;
  address: string;
  district: string;
  landmark?: string;
  featuredSports: string[];
  courtCount: number;
  surface: string;
  isIndoor: boolean;
  hourlyRatePhp: number;
  operatingHours: string;
  amenities: string[];
  bookingMode: 'instant' | 'inquiry';
}

interface FacultySetupScreenProps {
  onBack?: () => void;
  onComplete: (data: FacultySetupData) => void;
  initialValues?: Partial<FacultySetupData>;
}

export const FacultySetupScreen: React.FC<FacultySetupScreenProps> = ({
  onBack,
  onComplete,
  initialValues,
}) => {
  const { currentUser, completeOwnerOnboarding } = useMatchiStore();

  const [step, setStep] = useState<number>(1);
  const totalSteps = 5;

  // Step 1: Identity & Contacts
  const [facilityName, setFacilityName] = useState(initialValues?.facilityName || '');
  const [facilityType, setFacilityType] = useState<'university' | 'club' | 'public' | 'commercial'>(
    initialValues?.facilityType || 'university'
  );
  const [adminName, setAdminName] = useState(
    initialValues?.adminName ||
    (currentUser.full_name && currentUser.full_name !== 'Guest Player' ? currentUser.full_name : '') ||
    (typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_name') || '' : '')
  );
  const [email, setEmail] = useState(
    initialValues?.email ||
    currentUser.email ||
    (typeof window !== 'undefined' ? localStorage.getItem('sportsync_user_email') || '' : '')
  );
  const [phone, setPhone] = useState(
    initialValues?.phone &&
      !initialValues.phone.startsWith('pwd_hash:') &&
      !initialValues.phone.includes('hash')
      ? initialValues.phone
      : ''
  );

  // Step 2: Location (Locked to Naga City pilot market)
  const [city] = useState('Naga City, Camarines Sur');
  const [address, setAddress] = useState(initialValues?.address || '');
  const [district, setDistrict] = useState(initialValues?.district || '');
  const [landmark, setLandmark] = useState(initialValues?.landmark || '');

  // Step 3: Sports & Courts
  const [selectedSports, setSelectedSports] = useState<string[]>(
    initialValues?.featuredSports || []
  );
  const [courtCount, setCourtCount] = useState<number>(initialValues?.courtCount || 1);
  const [surface, setSurface] = useState<string>(
    initialValues?.surface || ''
  );
  const [isIndoor, setIsIndoor] = useState<boolean>(initialValues?.isIndoor !== false);

  // Step 4: Schedule, Rates & Amenities
  const [operatingHours, setOperatingHours] = useState<string>(
    initialValues?.operatingHours || ''
  );
  const [hourlyRatePhp, setHourlyRatePhp] = useState<number | string>(
    initialValues?.hourlyRatePhp !== undefined ? initialValues.hourlyRatePhp : 500
  );
  const [amenities, setAmenities] = useState<string[]>(
    initialValues?.amenities || []
  );
  const [bookingMode, setBookingMode] = useState<'instant' | 'inquiry'>(
    initialValues?.bookingMode || 'instant'
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const facilityTypeOptions: { id: 'university' | 'club' | 'public' | 'commercial'; label: string; badge: string }[] = [
    { id: 'university', label: 'University / Campus', badge: 'Collegiate' },
    { id: 'club', label: 'Private Sports Club', badge: 'Club' },
    { id: 'public', label: 'Public / Municipal Arena', badge: 'Community' },
    { id: 'commercial', label: 'Commercial Sports Hub', badge: 'Commercial' },
  ];

  const surfaceOptions = [
    'Tournament Hardwood Parquet',
    'BWF Taraflex Rubber Cushion',
    'Cushioned Acrylic Hard Court',
    'Synthetic Turf / Polyurethane',
  ];

  const districtOptions = [
    'Bagumbayan Sur',
    'Pacol',
    'Triangulo',
    'Magsaysay Ave',
    'San Felipe',
    'Concepcion Pequeña',
    'San Francisco',
  ];

  const hourPresets = [
    { label: 'Full Day (06:00 - 23:00)', value: '06:00 - 23:00' },
    { label: 'Campus Hours (07:00 - 21:00)', value: '07:00 - 21:00' },
    { label: 'Evening Prime (15:00 - 23:00)', value: '15:00 - 23:00' },
  ];

  const amenityOptions = [
    'Air Conditioning',
    'Free Parking',
    'Shower & Locker Rooms',
    'Pro Shop & Gear Rental',
    'Player Lounge & Water Station',
    'High-Speed Wi-Fi',
    'Spectator Bleachers',
  ];

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const toggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter((a) => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  const handleNext = async () => {
    setValidationError(null);

    if (step === 1) {
      if (!facilityName.trim()) {
        setValidationError('Please enter your facility or athletic complex name.');
        return;
      }
      if (!adminName.trim()) {
        setValidationError('Please enter the athletic director or contact name.');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!address.trim()) {
        setValidationError('Please enter your campus or street address.');
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (selectedSports.length === 0) {
        setValidationError('Please select at least one sport.');
        return;
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      const parsedRate = typeof hourlyRatePhp === 'number' ? hourlyRatePhp : parseFloat(String(hourlyRatePhp));
      if (hourlyRatePhp === '' || isNaN(parsedRate) || parsedRate <= 0) {
        setValidationError('Please enter a valid standard hourly rate greater than 0.');
        return;
      }
      setStep(5);
      return;
    }

    if (step === 5) {
      setIsSubmitting(true);
      try {
        const fullAddress = [address.trim(), district, 'Naga City', landmark.trim() ? `(${landmark.trim()})` : '']
          .filter(Boolean)
          .join(', ');

        const normalizedSports = selectedSports.map((s) => s.toLowerCase() as SportType);
        const parsedRate = typeof hourlyRatePhp === 'number' ? hourlyRatePhp : (parseFloat(String(hourlyRatePhp)) || 500);

        const generatedCourts = Array.from({ length: courtCount }).map((_, idx) => ({
          name: `Court ${idx + 1}`,
          sport: normalizedSports[idx % normalizedSports.length] || 'pickleball',
          hourlyRateCents: Math.round(parsedRate * 100),
          floorType: surface,
          isIndoor,
        }));

        await completeOwnerOnboarding({
          ownerName: adminName.trim() || 'Facility Partner',
          ownerEmail: email.trim() || 'partner@facility.ph',
          ownerPhone: phone.trim(),
          facilityName: facilityName.trim(),
          description: `${facilityTypeOptions.find((t) => t.id === facilityType)?.label || 'Sports Facility'} in Naga City featuring ${selectedSports.join(', ')}.`,
          address: fullAddress,
          city: 'Naga City',
          featuredSports: normalizedSports,
          operatingHours: operatingHours.trim() || '06:00 - 23:00',
          amenities,
          facilityType,
          bookingMode,
          courts: generatedCourts,
          inventorySource: 'manual',
        });

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C8FF2E', '#3DDC84', '#FFFFFF'],
        });

        onComplete({
          facilityName,
          facilityType,
          adminName,
          email,
          phone: phone.trim(),
          address,
          district,
          landmark,
          featuredSports: selectedSports,
          courtCount,
          surface,
          isIndoor,
          hourlyRatePhp: parsedRate,
          operatingHours,
          amenities,
          bookingMode,
        });
      } catch (err: unknown) {
        console.error('Faculty setup error:', err);
        setValidationError(
          err instanceof Error ? err.message : 'Failed to save your facility setup. Please try again.'
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#0B0F0C] p-4 sm:p-6 pt-4 sm:pt-6 select-none overflow-y-auto no-scrollbar">
      <div className="space-y-5">
        {/* Header with Back Button and Progress Indicator */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => {
                if (step > 1) {
                  setStep((s) => s - 1);
                  setValidationError(null);
                } else if (onBack) {
                  onBack();
                }
              }}
              className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-bold text-[#C8FF2E] uppercase tracking-widest block">
                Facility Setup • Step {step} of {totalSteps}
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                {step === 1 && 'Facility & Contact Identity'}
                {step === 2 && 'Location & Campus Address'}
                {step === 3 && 'Sports & Court Inventory'}
                {step === 4 && 'Hours, Rates & Amenities'}
                {step === 5 && 'Verify & Launch Portal'}
              </h2>
            </div>
          </div>

          {/* Progress bar pills */}
          <div className="flex items-center gap-1.5 pt-1">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const stepIndex = i + 1;
              const isPast = stepIndex < step;
              const isCurrent = stepIndex === step;
              return (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'bg-[#C8FF2E] shadow-[0_0_8px_rgba(200,255,46,0.6)]'
                      : isPast
                      ? 'bg-[#C8FF2E]/40'
                      : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {validationError && (
          <div className="p-3.5 rounded-2xl bg-[#E0533C]/10 border border-[#E0533C]/30 text-[#FFA494] text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E0533C]" />
            <span className="font-semibold">{validationError}</span>
          </div>
        )}

        {/* STEP 1: IDENTITY */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
              <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                1. Athletic Center / Facility Name
              </label>

              <div className="relative flex items-center">
                <Building2 className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                <input
                  type="text"
                  value={facilityName}
                  onChange={(e) => {
                    setFacilityName(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g. Naga City Sports Arena"
                  autoComplete="off"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>

              {/* Dynamic Initials Badge */}
              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-2xl bg-[#141A15] border-2 border-[#C8FF2E] text-[#C8FF2E] font-display font-black text-lg flex items-center justify-center shadow-[0_0_14px_rgba(200,255,46,0.25)] shrink-0 select-none">
                  {getPlayerInitials(facilityName || 'Sports Facility')}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#F4F7F0] block truncate">
                    {facilityName.trim() || 'New Sports Facility'}
                  </span>
                  <span className="text-[10px] text-[#A5B0A6] block truncate">
                    Verified listing badge on court booking schedules
                  </span>
                </div>
              </div>
            </div>

            {/* Facility Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                2. Facility Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {facilityTypeOptions.map((item) => {
                  const isSelected = facilityType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFacilityType(item.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.18)]'
                          : 'bg-[#1C241E] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <span className={`text-xs font-bold block ${isSelected ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                        {item.label}
                      </span>
                      <span className="text-[9px] text-[#A5B0A6] block mt-0.5">
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Management Contacts */}
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5">
              <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                3. Management Desk Contact
              </label>

              <div className="relative flex items-center">
                <UserIcon className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => {
                    setAdminName(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Admin / Athletic Director Name"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>

              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Official Email Address"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>

              <div className="relative flex items-center">
                <Phone className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Mobile Phone Number (e.g. 0917-123-4567)"
                  autoComplete="tel"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: LOCATION */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                  1. Operating City &amp; Market
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8FF2E]/15 text-[#C8FF2E] border border-[#C8FF2E]/30 font-bold">
                  Pilot Market
                </span>
              </div>
              <div className="relative flex items-center">
                <MapPin className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                <input
                  type="text"
                  readOnly
                  value={city}
                  className="w-full h-11 pl-9 pr-4 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:outline-none cursor-default font-semibold"
                />
              </div>
              <p className="text-[11px] text-[#A5B0A6]">
                Currently available in Naga City.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5">
              <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                2. Street or Campus Address
              </label>
              <div className="relative flex items-center">
                <Navigation className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g. Ateneo Avenue, Bagumbayan Sur"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                3. District / Barangay
              </label>
              <div className="grid grid-cols-2 gap-2">
                {districtOptions.map((d) => {
                  const isSelected = district === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDistrict(d)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E]'
                          : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{d}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#C8FF2E]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                4. Gate &amp; Access Notes (Optional)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Enter through Gate 2, near Student Center"
                className="w-full h-10 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
              />
            </div>
          </div>
        )}

        {/* STEP 3: SPORTS & COURTS */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
                  1. Sports Hosted
                </label>
                <span className="text-xs font-bold text-[#C8FF2E]">
                  {selectedSports.length} Selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRIMARY_SPORTS.map((sport) => {
                  const isSelected = selectedSports.includes(sport);
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => toggleSport(sport)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_12px_rgba(200,255,46,0.18)]'
                          : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SportIcon sport={sport} size={16} color={isSelected ? '#C8FF2E' : '#A5B0A6'} />
                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                          {sport}
                        </span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-[#C8FF2E] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Court Count */}
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
                  2. Number of Courts
                </label>
                <span className="text-xs font-mono font-bold text-[#C8FF2E]">
                  {courtCount} {courtCount === 1 ? 'Court' : 'Courts'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 4, 6, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCourtCount(num)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      courtCount === num
                        ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                        : 'bg-[#1C241E] text-[#A5B0A6] border-white/10 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Surface */}
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                3. Court Surface
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {surfaceOptions.map((s) => {
                  const isSelected = surface === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSurface(s)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                          : 'bg-[#141A15] border-white/5 text-[#A5B0A6]'
                      }`}
                    >
                      <span className="truncate">{s}</span>
                      {isSelected && <Check className="w-3 h-3 text-[#C8FF2E]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: OPERATIONS & RATES */}
        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Hours */}
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
                  1. Operating Schedule
                </label>
                <span className="text-xs font-mono font-bold text-[#C8FF2E]">
                  {operatingHours}
                </span>
              </div>
              <div className="space-y-1.5">
                {hourPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setOperatingHours(preset.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                      operatingHours === preset.value
                        ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                        : 'bg-[#141A15] border-white/5 text-[#A5B0A6]'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {operatingHours === preset.value && <Check className="w-3.5 h-3.5 text-[#C8FF2E]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Hourly Rate */}
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
                  2. Standard Hourly Rate
                </label>
                <span className="text-sm font-mono font-black text-[#C8FF2E]">
                  ₱{hourlyRatePhp !== '' && !isNaN(Number(hourlyRatePhp)) ? Number(hourlyRatePhp).toLocaleString('en-US') : '0'} / hr
                </span>
              </div>

              {/* Custom Numeric Rate Input */}
              <div className="relative flex items-center">
                <span className="absolute left-3.5 font-bold font-mono text-sm text-[#C8FF2E]">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={hourlyRatePhp === '' ? '' : hourlyRatePhp}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setHourlyRatePhp('');
                    } else {
                      const num = parseFloat(val);
                      setHourlyRatePhp(isNaN(num) ? '' : num);
                    }
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Enter hourly rate (e.g. 450)"
                  className="w-full h-11 pl-9 pr-16 rounded-xl bg-[#1C241E] border border-white/10 text-sm font-mono font-bold text-[#F4F7F0] placeholder-[#65756B] focus:outline-none focus:border-[#C8FF2E]"
                />
                <span className="absolute right-3.5 text-xs text-[#A5B0A6] font-medium pointer-events-none">
                  PHP / hr
                </span>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-[#A5B0A6] font-medium block">
                  Quick Presets:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[350, 450, 500, 600].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setHourlyRatePhp(rate);
                        if (validationError) setValidationError(null);
                      }}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        Number(hourlyRatePhp) === rate
                          ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] shadow-[0_0_10px_rgba(200,255,46,0.3)]'
                          : 'bg-[#1C241E] text-[#A5B0A6] border-white/10 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      ₱{rate}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
                3. Facility Amenities
              </label>
              <div className="grid grid-cols-2 gap-2">
                {amenityOptions.map((amenity) => {
                  const isSelected = amenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E]'
                          : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                      }`}
                    >
                      <span className="truncate">{amenity}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#C8FF2E]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8FF2E]">
                Ready to Launch
              </span>
              <h3 className="font-display font-black text-lg text-[#F4F7F0]">
                Review Facility Setup
              </h3>
            </div>

            <div className="p-4 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/30 space-y-3.5 shadow-[0_0_20px_rgba(200,255,46,0.1)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#0B0F0C] border-2 border-[#C8FF2E] text-[#C8FF2E] font-display font-black text-base flex items-center justify-center shrink-0">
                    {getPlayerInitials(facilityName || 'Sports Facility')}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#F4F7F0]">{facilityName || 'Sports Facility'}</h4>
                    <span className="text-[10px] text-[#A5B0A6]">
                      {facilityTypeOptions.find((t) => t.id === facilityType)?.label || 'Sports Facility'}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#C8FF2E]/15 border border-[#C8FF2E]/30 text-[#C8FF2E] text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#C8FF2E]" />
                  <span>Verified</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#1C241E] border border-white/5">
                  <span className="text-[9px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Location</span>
                  <p className="text-[#F4F7F0] font-medium truncate">{address || 'Naga City'}</p>
                  <p className="text-[10px] text-[#C8FF2E]">{district ? `${district}, ` : ''}{city}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#1C241E] border border-white/5">
                  <span className="text-[9px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Admin Desk</span>
                  <p className="text-[#F4F7F0] font-medium truncate">{adminName}</p>
                  <p className="text-[10px] text-[#A5B0A6] truncate">{phone.trim() || 'No phone entered'}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#1C241E] border border-white/5">
                  <span className="text-[9px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Courts</span>
                  <p className="text-[#F4F7F0] font-medium">{courtCount} Courts ({isIndoor ? 'Indoor' : 'Outdoor'})</p>
                  <p className="text-[10px] text-[#A5B0A6] truncate">{surface}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#1C241E] border border-white/5">
                  <span className="text-[9px] font-bold text-[#A5B0A6] uppercase tracking-wider block">Rate &amp; Hours</span>
                  <p className="text-[#C8FF2E] font-bold font-mono">₱{hourlyRatePhp ? Number(hourlyRatePhp).toLocaleString('en-US') : '0'} / hr</p>
                  <p className="text-[10px] text-[#A5B0A6] truncate">{operatingHours}</p>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[9px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1">
                  Sports Hosted
                </span>
                <div className="flex gap-1 flex-wrap">
                  {selectedSports.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-lg bg-[#1C241E] border border-white/10 text-[10px] font-semibold text-[#F4F7F0]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Complete / Continue Action Button */}
      <div className="pt-4 pb-2">
        <Button
          variant="primary"
          size="lg"
          onClick={handleNext}
          disabled={isSubmitting}
          className="w-full text-base font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Activating Facility Portal...</span>
            </>
          ) : step === 5 ? (
            <>
              <Building2 className="w-4 h-4 mr-1.5" />
              <span>Complete Setup &bull; Launch Facility Portal</span>
            </>
          ) : (
            <>
              <span>Continue to Step {step + 1}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
