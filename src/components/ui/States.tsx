'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';

/* ── Empty State ── */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#EBF4EE] flex items-center justify-center mb-4">
        {icon || <Inbox className="w-6 h-6 text-[#2D724E]" />}
      </div>
      <h3 className="text-sm font-bold text-[#1A241E] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[#65756B] max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-xl bg-[#2D724E] text-white text-xs font-bold hover:bg-[#1E4A32] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ── Error State ── */
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-sm font-bold text-[#1A241E] mb-1">{message}</h3>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-bold text-[#1A241E] hover:bg-[#FAF8F5] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}

/* ── Loading Skeleton ── */
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[#E8E5DF]/60 ${className}`}
    />
  );
}

/* ── Card Skeleton (for venue cards, booking cards, etc.) ── */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden">
      <Skeleton className="h-44 rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/* ── Row Skeleton (for table/list items) ── */
export function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#E8E5DF]/50">
      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-6 w-20 rounded-lg" />
    </div>
  );
}

/* ── Stat Skeleton (for dashboard KPIs) ── */
export function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E8E5DF] bg-white p-5 space-y-3">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-2.5 w-2/3" />
    </div>
  );
}
