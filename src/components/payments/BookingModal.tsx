'use client';

import React, { useState } from 'react';
import { Venue, Court, Session, MatchFormat, PaymentMethod, PaymentCategory } from '@/types';
import { useMatchiStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { formatCurrency, calculateBookingFees, getPaymentMethodName } from '@/lib/utils';
import {
  X,
  CreditCard,
  Building2,
  Banknote,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Users,
  User,
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue;
  court?: Court;
  session?: Session;
  preselectedDate?: string;
  preselectedTime?: string;
}

function generateVoucherCode(): string {
  return `MAT-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateBookingFallbackId(): string {
  return `bkg_${Date.now()}`;
}

export function BookingModal({
  isOpen,
  onClose,
  venue,
  court,
  session,
  preselectedDate,
  preselectedTime,
}: BookingModalProps) {
  const { submitPayment, createBooking, joinQueue } = useMatchiStore();

  const [bookingDate, setBookingDate] = useState(() => preselectedDate || new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState(preselectedTime || '14:00');
  const [durationMinutes] = useState(60);

  // Format state: doubles vs singles
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('doubles');
  const [partnerNames, setPartnerNames] = useState('');
  const [needsPartner, setNeedsPartner] = useState(false);

  // Payment Category: ewallet, bank_transfer, cash
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('ewallet');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('gcash');

  // Input states
  const [referenceCode, setReferenceCode] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [copiedText, setCopiedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [confirmedBookingRef, setConfirmedBookingRef] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Fee Calculation
  const hourlyRateCents = court ? court.hourly_rate_cents : 35000;
  const feeCalculation = calculateBookingFees(hourlyRateCents, durationMinutes);
  const totalCents = session ? session.fee_cents : feeCalculation.totalAmountCents;

  const title = session
    ? session.title
    : court
    ? `Court Reservation: ${court.name}`
    : 'Match Booking';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/[-\s]/g, ''));
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setReceiptUrl(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentCategory !== 'cash' && !referenceCode.trim()) {
      setErrorMsg('Please enter your transaction reference number or confirmation ID');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const isCash = paymentCategory === 'cash';
      const generatedVoucher = generateVoucherCode();
      if (isCash) setVoucherCode(generatedVoucher);

      const finalReceipt = receiptUrl || '';

      const notes = `Format: ${matchFormat === 'doubles' ? 'Doubles (2v2)' : 'Singles (1v1)'}${
        partnerNames ? ` | Partner: ${partnerNames}` : needsPartner ? ' | Auto-pair requested' : ''
      }`;

      if (court) {
        // Retrieve Supabase auth session token if signed in
        let authToken: string | undefined;
        if (supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          authToken = sessionData?.session?.access_token;
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        // Invoke server API for rate validation and overlapping slot check
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            venueId: venue.id,
            courtId: court.id,
            sport: court.sport,
            bookingDate,
            startTime: bookingTime,
            durationMinutes,
            courtHourlyRateCents: court.hourly_rate_cents,
            paymentMethod: selectedMethod,
            paymentCategory,
            referenceCode: isCash ? generatedVoucher : referenceCode.trim(),
            notes,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'This court slot is no longer available. Please select another time.');
        }

        const resData = await response.json();
        const serverRef = resData.booking?.bookingReference || generatedVoucher;

        createBooking({
          id: resData.booking?.id || generateBookingFallbackId(),
          booking_reference: serverRef,
          user_id: '',
          venue_id: venue.id,
          venue,
          court_id: court.id,
          court,
          sport: court.sport,
          booking_date: bookingDate,
          start_time: bookingTime,
          end_time: resData.booking?.endTime || `${parseInt(bookingTime) + 1}:00`,
          duration_minutes: durationMinutes,
          court_rate_cents: court.hourly_rate_cents,
          booking_amount_cents: feeCalculation.totalAmountCents,
          platform_fee_cents: feeCalculation.platformFeeCents,
          total_amount_cents: feeCalculation.totalAmountCents,
          status: isCash ? 'confirmed' : 'pending',
          payment_status: isCash ? 'cash_at_venue' : 'pending',
          payment_method: selectedMethod,
          notes,
          created_at: new Date().toISOString(),
        });
        setConfirmedBookingRef(serverRef);
      } else {
        submitPayment({
          sessionId: session?.id || 'sess_open_play',
          courtId: session?.court_ids?.[0],
          amountCents: totalCents,
          paymentMethod: selectedMethod,
          paymentCategory,
          referenceCode: isCash ? generatedVoucher : referenceCode.trim(),
          receiptImageUrl: finalReceipt,
          cashVoucherCode: isCash ? generatedVoucher : undefined,
          notes,
        });

        if (session) {
          const partners = partnerNames
            ? partnerNames.split(',').map((p) => p.trim()).filter(Boolean)
            : [];
          joinQueue(session.id, partners, matchFormat, needsPartner);
        }
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2D724E', '#1E4A32', '#C87D43'],
      });
    } catch (err: unknown) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : 'Reservation failed. Please try again.';
      setErrorMsg(message);
    }
  };

  const paymentInfo = venue.payment_info;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-8 animate-in slide-in-from-bottom sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E8E5DF] bg-[#FAF8F5] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D724E] bg-[#EBF4EE] px-2 py-0.5 rounded-md">
                {session ? 'Open Play Entry' : 'Court Reservation'}
              </span>
              {court?.sport && (
                <span className="text-[10px] font-semibold text-[#65756B] capitalize">
                  &bull; {court.sport}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#1A241E] truncate max-w-xs sm:max-w-md mt-0.5">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#65756B] hover:bg-[#E8E5DF] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          /* Restrained, Apple-like Success Screen */
          <div className="p-6 sm:p-8 text-center space-y-5 overflow-y-auto">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-[#EBF4EE] border border-[#2D724E]/20 flex items-center justify-center text-[#2D724E]">
                <CheckCircle2 className="w-9 h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF4EE] px-3 py-1 text-xs font-semibold text-[#1E4A32]">
                <ShieldCheck className="w-3.5 h-3.5" />
                {paymentCategory === 'cash' ? 'Cash Voucher Issued' : 'Payment Submitted for Verification'}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#1A241E] pt-1">
                Reservation Confirmed
              </h3>
              <p className="text-xs text-[#65756B]">
                {court ? `${court.name} at ${venue.name}` : session?.title || venue.name}
              </p>
            </div>

            {/* Booking Details Card */}
            <div className="rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-4 text-left space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DF]">
                <span className="text-xs text-[#65756B]">Reference</span>
                <span className="font-mono text-xs font-bold text-[#1A241E]">
                  {confirmedBookingRef || voucherCode || referenceCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-[#65756B]">
                  <Calendar className="w-3.5 h-3.5 text-[#2D724E]" />
                  <span>{bookingDate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#65756B]">
                  <Clock className="w-3.5 h-3.5 text-[#2D724E]" />
                  <span>{bookingTime} ({durationMinutes} mins)</span>
                </div>
              </div>

              {paymentCategory === 'cash' ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                  <span className="text-[11px] font-semibold text-amber-900 block">
                    Present this voucher code at the reception counter:
                  </span>
                  <div className="font-mono text-xl font-black text-[#C87D43] tracking-widest mt-1">
                    {voucherCode}
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Please pay <strong>{formatCurrency(totalCents)}</strong> cash upon arrival.
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-[#65756B] bg-white rounded-xl p-3 border border-[#E8E5DF]">
                  Transaction Ref: <strong className="text-[#1A241E]">{referenceCode}</strong>.
                  The facility operator will cross-reference this with their {selectedMethod.toUpperCase()} ledger.
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-semibold shadow-sm transition-all min-h-[44px]"
              >
                Done
              </button>
              {session && (
                <a
                  href={`/sessions/${session.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#1A241E] hover:bg-[#2A362F] text-white text-xs font-semibold transition-all min-h-[44px]"
                >
                  View Session &rarr;
                </a>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
            {/* Transparent Pricing Breakdown */}
            <div className="rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-[#65756B] block">Total Amount Due</span>
                  <div className="text-2xl font-bold text-[#1A241E] tracking-tight">
                    {formatCurrency(totalCents)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-[#1A241E]">{venue.name}</div>
                  <span className="text-[11px] text-[#65756B] flex items-center justify-end gap-1">
                    <MapPin className="w-3 h-3" /> {venue.city}
                  </span>
                </div>
              </div>

              {court && (
                <div className="pt-2 border-t border-[#E8E5DF] space-y-2 text-xs text-[#65756B]">
                  <div className="flex justify-between">
                    <span>Court Subtotal ({court.name})</span>
                    <span className="text-[#1A241E] font-medium">{formatCurrency(feeCalculation.courtSubtotalCents)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="flex items-center gap-1">
                      Platform Processing &amp; Guarantee
                      <Info className="w-3 h-3 text-[#65756B]" />
                    </span>
                    <span className="text-[#2D724E] font-medium">Included ({formatCurrency(feeCalculation.platformFeeCents)})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E8E5DF]/60">
                    <div>
                      <label className="text-[10px] font-bold text-[#65756B] block mb-1">Booking Date</label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full text-xs font-bold text-[#1A241E] p-1.5 rounded-xl bg-white border border-[#E8E5DF]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#65756B] block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full text-xs font-bold text-[#1A241E] p-1.5 rounded-xl bg-white border border-[#E8E5DF]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Match Format: Doubles vs Singles */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#1A241E]">
                Match Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMatchFormat('doubles')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all min-h-[42px] ${
                    matchFormat === 'doubles'
                      ? 'border-[#2D724E] bg-[#EBF4EE] text-[#1E4A32]'
                      : 'border-[#E8E5DF] bg-white text-[#65756B]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Doubles (2v2)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchFormat('singles')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all min-h-[42px] ${
                    matchFormat === 'singles'
                      ? 'border-[#2D724E] bg-[#EBF4EE] text-[#1E4A32]'
                      : 'border-[#E8E5DF] bg-white text-[#65756B]'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Singles (1v1)</span>
                </button>
              </div>

              {matchFormat === 'doubles' && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <input
                    type="text"
                    value={partnerNames}
                    onChange={(e) => {
                      setPartnerNames(e.target.value);
                      if (e.target.value) setNeedsPartner(false);
                    }}
                    placeholder="Doubles partner name (optional)..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs text-[#1A241E] placeholder:text-[#65756B] focus:ring-2 focus:ring-[#2D724E] focus:outline-none min-h-[40px]"
                  />

                  <label className="flex items-center gap-2 text-xs text-[#65756B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={needsPartner}
                      onChange={(e) => {
                        setNeedsPartner(e.target.checked);
                        if (e.target.checked) setPartnerNames('');
                      }}
                      className="rounded border-[#E8E5DF] text-[#2D724E] focus:ring-[#2D724E] h-4 w-4"
                    />
                    <span>Solo player: match me with another doubles player on site</span>
                  </label>
                </div>
              )}
            </div>

            {/* Payment Category Selector */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-[#1A241E]">
                Select Payment Channel
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF8F5] border border-[#E8E5DF] rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentCategory('ewallet');
                    setSelectedMethod('gcash');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[40px] ${
                    paymentCategory === 'ewallet'
                      ? 'bg-white text-[#1A241E] shadow-sm'
                      : 'text-[#65756B]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>E-Wallets</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentCategory('bank_transfer');
                    setSelectedMethod('bdo');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[40px] ${
                    paymentCategory === 'bank_transfer'
                      ? 'bg-white text-[#1A241E] shadow-sm'
                      : 'text-[#65756B]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Bank</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentCategory('cash');
                    setSelectedMethod('cash');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[40px] ${
                    paymentCategory === 'cash'
                      ? 'bg-white text-[#1A241E] shadow-sm'
                      : 'text-[#65756B]'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Pay Cash</span>
                </button>
              </div>
            </div>

            {/* Channel: E-Wallets */}
            {paymentCategory === 'ewallet' && (
              <div className="rounded-2xl border border-[#2D724E]/20 bg-[#EBF4EE]/40 p-4 space-y-3 animate-in fade-in">
                <div className="flex gap-2">
                  {(['gcash', 'maya', 'grabpay'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedMethod(method)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        selectedMethod === method
                          ? 'bg-[#2D724E] text-white shadow-sm'
                          : 'bg-white border border-[#E8E5DF] text-[#65756B]'
                      }`}
                    >
                      {getPaymentMethodName(method)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white border border-[#E8E5DF] px-3 py-2.5">
                  <div>
                    <span className="text-[10px] text-[#65756B] block">
                      {selectedMethod.toUpperCase()} Account ({paymentInfo.gcash_name || venue.name})
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#1A241E]">
                      {paymentInfo.gcash_number || '0917-888-8773'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(paymentInfo.gcash_number || '09178888773', selectedMethod)
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-[#2D724E] min-h-[36px] px-2"
                  >
                    {copiedText === selectedMethod ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {paymentInfo.gcash_qr_url && (
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={paymentInfo.gcash_qr_url}
                      alt="Payment QR"
                      className="h-16 w-16 rounded-lg border border-[#E8E5DF] bg-white p-1"
                    />
                    <div className="text-xs text-[#65756B]">
                      <span className="font-semibold text-[#1A241E]">Scan QR in your App</span>
                      <p className="text-[11px]">Save or scan directly with {selectedMethod.toUpperCase()}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Channel: Bank Transfer */}
            {paymentCategory === 'bank_transfer' && (
              <div className="rounded-2xl border border-[#C87D43]/20 bg-[#FBF0E6]/50 p-4 space-y-3 animate-in fade-in">
                <div className="flex gap-2">
                  {(['bdo', 'bpi', 'unionbank'] as const).map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedMethod(bank)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                        selectedMethod === bank
                          ? 'bg-[#C87D43] text-white shadow-sm'
                          : 'bg-white border border-[#E8E5DF] text-[#65756B]'
                      }`}
                    >
                      {getPaymentMethodName(bank)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white border border-[#E8E5DF] px-3 py-2.5">
                  <div>
                    <span className="text-[10px] text-[#65756B] block">
                      {selectedMethod.toUpperCase()} Account ({venue.name.toUpperCase()})
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#1A241E]">
                      {selectedMethod === 'bdo'
                        ? '0012-3456-7890'
                        : selectedMethod === 'bpi'
                        ? '0987-6543-21'
                        : '1092-8827-3819'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        selectedMethod === 'bdo' ? '001234567890' : '0987654321',
                        selectedMethod
                      )
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-[#C87D43] min-h-[36px] px-2"
                  >
                    {copiedText === selectedMethod ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-[#65756B]">
                  Send via InstaPay or PESONet. Enter transaction reference number below.
                </div>
              </div>
            )}

            {/* Channel: Cash at Venue */}
            {paymentCategory === 'cash' && (
              <div className="rounded-2xl border border-[#2D724E]/20 bg-[#EBF4EE] p-4 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1E4A32]">
                  <Ticket className="w-4 h-4 text-[#C87D43]" />
                  <span>Pay Cash at Venue Reception Counter</span>
                </div>
                <p className="text-[11px] text-[#65756B] leading-relaxed">
                  Reserve your slot immediately without online payment. Present your generated cash voucher code to the receptionist or court master upon arrival.
                </p>
              </div>
            )}

            {/* Reference Input for Digital Payments */}
            {paymentCategory !== 'cash' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#1A241E]">
                    Reference / Confirmation Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder="e.g. 1029 4829 1102 or INSTAPAY-9921"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs sm:text-sm text-[#1A241E] placeholder:text-[#65756B] focus:ring-2 focus:ring-[#2D724E] focus:outline-none min-h-[42px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#1A241E]">
                    Upload Payment Receipt (Optional)
                  </label>
                  <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E8E5DF] hover:border-[#2D724E] p-3.5 transition-colors cursor-pointer bg-[#FAF8F5]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSimulateUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {receiptUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={receiptUrl}
                          alt="Receipt preview"
                          className="h-12 w-12 object-cover rounded-lg border border-[#E8E5DF]"
                        />
                        <div className="text-left text-xs">
                          <span className="font-semibold text-[#2D724E] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Screenshot Attached
                          </span>
                          <span className="text-[10px] text-[#65756B]">Tap to replace</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto w-5 h-5 text-[#65756B]" />
                        <span className="mt-1 block text-xs font-medium text-[#1A241E]">
                          Attach receipt image or screenshot
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Confirm CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 min-h-[46px]"
              >
                {isSubmitting ? (
                  <span>Confirming...</span>
                ) : paymentCategory === 'cash' ? (
                  <span>Confirm Cash Reservation</span>
                ) : (
                  <span>Submit Payment ({formatCurrency(totalCents)})</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
