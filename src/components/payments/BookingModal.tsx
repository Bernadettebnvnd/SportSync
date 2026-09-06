'use client';

import React, { useState } from 'react';
import { Venue, Court, Session } from '@/types';
import { useMonkeyStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { MonkeyMascot } from '@/components/mascot/MonkeyMascot';
import {
  X,
  QrCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue;
  court?: Court;
  session?: Session;
}

export function BookingModal({
  isOpen,
  onClose,
  venue,
  court,
  session,
}: BookingModalProps) {
  const { submitPayment, joinQueue } = useMonkeyStore();

  const [referenceCode, setReferenceCode] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [partnerNames, setPartnerNames] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const totalCents = session
    ? session.fee_cents
    : court
    ? court.hourly_rate_cents
    : 35000;

  const title = session
    ? session.title
    : court
    ? `Private Court: ${court.name}`
    : 'Court Booking';

  const handleCopyGcash = () => {
    navigator.clipboard.writeText(venue.gcash_number.replace(/-/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create local object URL for instant preview
      const objectUrl = URL.createObjectURL(file);
      setReceiptUrl(objectUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceCode.trim()) {
      setErrorMsg('Please enter your 13-digit GCash reference number');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    setTimeout(() => {
      // Default fallback receipt image if none uploaded
      const finalReceipt =
        receiptUrl ||
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80';

      submitPayment({
        sessionId: session?.id || 'sess_friday_smash',
        courtId: court?.id,
        amountCents: totalCents,
        referenceCode: referenceCode.trim(),
        receiptImageUrl: finalReceipt,
        notes: partnerNames ? `Partner(s): ${partnerNames}` : undefined,
      });

      if (session) {
        const partners = partnerNames
          ? partnerNames.split(',').map((p) => p.trim()).filter(Boolean)
          : [];
        joinQueue(session.id, partners);
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      // Trigger high-energy confetti celebration!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1F9D55', '#FF9F43', '#FFD700'],
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-[#EBEBE6] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EBEBE6] bg-[#FAFAF7]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F9D55]">
              {session ? 'Open Play Entry' : 'Court Booking'}
            </span>
            <h2 className="text-lg font-extrabold text-[#171717]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#6B7280] hover:bg-[#EBEBE6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          /* Personality-driven Success State */
          <div className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <MonkeyMascot mood="victory" size="lg" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E9F8EE] px-3 py-1 text-xs font-bold text-[#147A40]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Payment Proof Submitted</span>
            </div>

            <h3 className="text-2xl font-black text-[#171717]">
              You&apos;re booked! {court ? court.name : 'Your spot'} is waiting for you.
            </h3>

            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed max-w-sm mx-auto">
              Our venue organizers are verifying your GCash reference (
              <span className="font-semibold text-[#171717]">{referenceCode}</span>).
              You&apos;re also placed in rotation for tonight&apos;s games!
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-md transition-all"
              >
                Back to Courts
              </button>
              {session && (
                <a
                  href={`/sessions/${session.id}`}
                  className="px-6 py-2.5 rounded-xl bg-[#171717] hover:bg-[#262626] text-white text-xs font-bold transition-all text-center"
                >
                  View Live Queue Board &rarr;
                </a>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Amount & Venue info summary */}
            <div className="flex items-center justify-between rounded-2xl bg-[#FAFAF7] border border-[#EBEBE6] p-4">
              <div>
                <span className="text-xs text-[#6B7280]">Total Due</span>
                <div className="text-2xl font-extrabold text-[#1F9D55]">
                  {formatCurrency(totalCents)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#6B7280]">{venue.name}</span>
                <div className="text-xs font-bold text-[#171717]">{venue.city}</div>
              </div>
            </div>

            {/* GCash Payment Instructions Card */}
            <div className="rounded-2xl border border-[#3B82F6]/20 bg-[#3B82F6]/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#007DFE] text-white text-xs font-black">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#171717]">Send via GCash</div>
                    <div className="text-[11px] text-[#6B7280]">{venue.gcash_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#007DFE] border border-[#007DFE]/20">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </div>
              </div>

              {/* Account Number with Copy button */}
              <div className="flex items-center justify-between rounded-xl bg-white border border-[#EBEBE6] px-3 py-2">
                <span className="font-mono text-sm font-bold text-[#171717]">
                  {venue.gcash_number}
                </span>
                <button
                  type="button"
                  onClick={handleCopyGcash}
                  className="flex items-center gap-1 text-xs font-semibold text-[#1F9D55] hover:text-[#147A40]"
                >
                  {copied ? (
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

              {/* QR Code trigger / preview */}
              {venue.gcash_qr_url && (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={venue.gcash_qr_url}
                    alt="GCash QR Code"
                    className="h-16 w-16 rounded-lg border border-[#EBEBE6] bg-white p-1"
                  />
                  <div className="text-xs text-[#6B7280]">
                    <span className="font-semibold text-[#171717]">Scan QR in GCash</span>
                    <p className="text-[11px]">Save photo or scan directly with your GCash app.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reference Number Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#171717]">
                GCash Reference Number <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                required
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="e.g. 1029 4829 1102 or GC-9921-482"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBEBE6] text-sm text-[#171717] placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#1F9D55] focus:outline-none"
              />
            </div>

            {/* Partner Names (Optional for doubles rotation) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#171717]">
                Partner Names <span className="text-[#6B7280] font-normal">(Optional for Open Play)</span>
              </label>
              <input
                type="text"
                value={partnerNames}
                onChange={(e) => setPartnerNames(e.target.value)}
                placeholder="e.g. Renzo Diaz, Kath Cruz (comma separated)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBEBE6] text-sm text-[#171717] placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#1F9D55] focus:outline-none"
              />
            </div>

            {/* Receipt Image Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#171717]">
                Upload GCash Receipt Screenshot
              </label>
              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D1D5DB] hover:border-[#1F9D55] p-4 transition-colors cursor-pointer bg-[#FAFAF7]">
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
                      alt="Uploaded Receipt"
                      className="h-16 w-16 object-cover rounded-lg border border-[#EBEBE6]"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold text-[#1F9D55] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Receipt Attached
                      </div>
                      <span className="text-[11px] text-[#6B7280]">Click to replace file</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto w-6 h-6 text-[#9CA3AF]" />
                    <span className="mt-1 block text-xs font-semibold text-[#171717]">
                      Click or drag receipt screenshot here
                    </span>
                    <span className="text-[10px] text-[#6B7280]">PNG, JPG up to 10MB</span>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-[#FEE2E2] p-3 text-xs text-[#DC2626]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-sm font-bold shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Verifying receipt details...</span>
              ) : (
                <span>Confirm & Upload GCash Receipt &rarr;</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
