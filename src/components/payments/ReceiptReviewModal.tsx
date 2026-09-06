'use client';

import React, { useState } from 'react';
import { Payment } from '@/types';
import { useMonkeyStore } from '@/lib/store';
import { formatCurrency, formatTimeAgo } from '@/lib/utils';
import { X, CheckCircle2, XCircle, ShieldCheck, AlertCircle } from 'lucide-react';

interface ReceiptReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
}

export function ReceiptReviewModal({ isOpen, onClose, payment }: ReceiptReviewModalProps) {
  const { verifyPayment } = useMonkeyStore();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!isOpen) return null;

  const handleApprove = () => {
    verifyPayment(payment.id, 'approved');
    onClose();
  };

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    verifyPayment(payment.id, 'rejected', rejectReason || 'Invalid GCash reference');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-[#EBEBE6] shadow-2xl overflow-hidden my-8 space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EBEBE6] pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F9D55] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Organizer Live Verification
            </span>
            <h3 className="text-lg font-black text-[#171717]">Review GCash Receipt</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#6B7280] hover:bg-[#FAFAF7]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payment Summary */}
        <div className="rounded-2xl bg-[#FAFAF7] border border-[#EBEBE6] p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#6B7280]">Player Name</span>
            <div className="text-sm font-black text-[#171717]">{payment.user_name}</div>
            <span className="text-[11px] text-[#6B7280]">
              Ref: <strong className="font-mono text-[#171717]">{payment.reference_code}</strong>
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-[#6B7280]">Amount Paid</span>
            <div className="text-xl font-black text-[#1F9D55]">
              {formatCurrency(payment.amount_cents)}
            </div>
            <span className="text-[10px] text-[#6B7280] block">
              {formatTimeAgo(payment.created_at)}
            </span>
          </div>
        </div>

        {/* Receipt Image Preview */}
        <div>
          <span className="text-xs font-bold text-[#171717] block mb-2">
            Uploaded Proof of Payment
          </span>
          <div className="relative rounded-2xl overflow-hidden border border-[#EBEBE6] bg-black/5 max-h-72 flex items-center justify-center">
            <img
              src={payment.receipt_image_url}
              alt="Uploaded GCash Receipt"
              className="max-h-72 w-auto object-contain"
            />
          </div>
        </div>

        {payment.notes && (
          <p className="text-xs text-[#6B7280] bg-[#FAFAF7] p-3 rounded-xl border border-[#EBEBE6]">
            <strong>Note from player:</strong> {payment.notes}
          </p>
        )}

        {/* Reject reason input */}
        {showRejectInput && (
          <div className="space-y-1.5 animate-in fade-in">
            <label className="text-xs font-bold text-[#EF4444]">
              Reason for Rejection
            </label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Reference not found or amount incorrect"
              className="w-full px-3 py-2 rounded-xl border border-[#EF4444] text-xs focus:outline-none"
            />
          </div>
        )}

        {/* Actions: Approve / Reject */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#EF4444] text-[#EF4444] hover:bg-[#FEE2E2] text-xs font-bold transition-all"
          >
            <XCircle className="w-4 h-4" />
            <span>{showRejectInput ? 'Confirm Rejection' : 'Reject Receipt'}</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-md transition-all active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve & Verify</span>
          </button>
        </div>
      </div>
    </div>
  );
}
