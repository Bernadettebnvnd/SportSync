'use client';

import React, { useState } from 'react';
import { Payment } from '@/types';
import { useMatchiStore } from '@/lib/store';
import { formatCurrency, formatTimeAgo, getPaymentMethodName, calculateBookingFees } from '@/lib/utils';
import { X, CheckCircle2, XCircle, ShieldCheck, Banknote } from 'lucide-react';

interface ReceiptReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
}

export function ReceiptReviewModal({ isOpen, onClose, payment }: ReceiptReviewModalProps) {
  const { verifyPayment } = useMatchiStore();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!isOpen) return null;

  const isCash = payment.payment_category === 'cash' || payment.status === 'cash_at_venue';
  const feeCalc = calculateBookingFees(payment.amount_cents);

  const handleApprove = () => {
    verifyPayment(payment.id, 'approved');
    onClose();
  };

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    verifyPayment(payment.id, 'rejected', rejectReason || 'Payment could not be verified');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl overflow-hidden my-0 sm:my-8 space-y-4 p-5 sm:p-6 animate-in slide-in-from-bottom sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D724E] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Facility Operations &bull; Payment Desk
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#1A241E] mt-0.5">
              {isCash ? 'Cash Payment Verification' : 'Review Digital Payment'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#65756B] hover:bg-[#FAF8F5]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payment Summary */}
        <div className="rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#65756B]">Player / Group</span>
              <div className="text-sm font-bold text-[#1A241E]">{payment.user_name}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-[#E8E5DF] text-[#1E4A32]">
                  {getPaymentMethodName(payment.payment_method)}
                </span>
                <span className="text-[11px] text-[#65756B] font-mono">
                  {payment.reference_code}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#65756B]">Customer Amount</span>
              <div className="text-xl font-black text-[#1A241E]">
                {formatCurrency(payment.amount_cents)}
              </div>
              <span className="text-[10px] text-[#65756B] block">
                {formatTimeAgo(payment.created_at)}
              </span>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="pt-2.5 border-t border-[#E8E5DF] grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-[#E8E5DF]">
              <span className="text-[10px] text-[#65756B] block">Platform Fee (6%)</span>
              <span className="font-semibold text-[#65756B]">{formatCurrency(feeCalc.platformFeeCents)}</span>
            </div>
            <div className="bg-[#EBF4EE] p-2.5 rounded-xl border border-[#2D724E]/20">
              <span className="text-[10px] text-[#1E4A32] block font-medium">Facility Net Payout</span>
              <span className="font-bold text-[#2D724E]">{formatCurrency(feeCalc.facilityAmountCents)}</span>
            </div>
          </div>
        </div>

        {isCash ? (
          <div className="rounded-2xl border border-[#2D724E]/20 bg-[#EBF4EE] p-4 text-center space-y-1.5">
            <Banknote className="mx-auto w-6 h-6 text-[#2D724E]" />
            <h4 className="text-xs font-bold text-[#1E4A32]">Cash at Reception Counter</h4>
            <p className="text-[11px] text-[#65756B]">
              Voucher Code: <strong className="font-mono text-[#C87D43]">{payment.reference_code}</strong>
            </p>
            <p className="text-[11px] text-[#65756B]">
              Collect <strong>{formatCurrency(payment.amount_cents)}</strong> cash at your front desk before approving.
            </p>
          </div>
        ) : (
          <div>
            <span className="text-xs font-semibold text-[#1A241E] block mb-1.5">
              Proof of Payment Screenshot
            </span>
            <div className="relative rounded-2xl overflow-hidden border border-[#E8E5DF] bg-black/5 max-h-64 flex items-center justify-center">
              {payment.receipt_image_url ? (
                <img
                  src={payment.receipt_image_url}
                  alt="Payment Receipt"
                  className="max-h-64 w-auto object-contain"
                />
              ) : (
                <div className="py-8 text-xs text-[#65756B]">No image screenshot attached</div>
              )}
            </div>
          </div>
        )}

        {payment.notes && (
          <p className="text-xs text-[#65756B] bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E5DF]">
            <strong className="text-[#1A241E]">Notes:</strong> {payment.notes}
          </p>
        )}

        {showRejectInput && (
          <div className="space-y-1 animate-in fade-in">
            <label className="text-xs font-semibold text-red-600">Reason for Rejection</label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Reference code not found or duplicate transaction"
              className="w-full px-3 py-2 rounded-xl border border-red-300 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[38px]"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-all min-h-[44px]"
          >
            <XCircle className="w-4 h-4" />
            <span>{showRejectInput ? 'Confirm Rejection' : isCash ? 'Decline' : 'Reject'}</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCash ? 'Confirm Cash' : 'Approve'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
