'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { CommunityGame } from '@/mock/types';

interface DeleteGameConfirmationDialogProps {
  isOpen: boolean;
  game: CommunityGame;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteGameConfirmationDialog: React.FC<DeleteGameConfirmationDialogProps> = ({
  isOpen,
  game,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirm();
    } catch (err: any) {
      console.error('Failed to delete game:', err);
      setErrorMessage(err?.message || 'Failed to delete game. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-game-title"
        className="relative w-full max-w-md rounded-3xl bg-[#0B0F0C] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden p-6 select-none animate-in zoom-in-95 duration-200 text-[#F4F7F0]"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[#FF5C5C]/15 border border-[#FF5C5C]/30 flex items-center justify-center text-[#FF5C5C] mb-4 shadow-[0_0_20px_rgba(255,92,92,0.2)]">
          <Trash2 className="w-7 h-7" />
        </div>

        {/* Dialog Header */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#FF5C5C] uppercase tracking-wider bg-[#FF5C5C]/10 px-2 py-0.5 rounded-full border border-[#FF5C5C]/20">
              Permanent Action
            </span>
          </div>
          <h2 id="delete-game-title" className="font-display font-black text-xl text-[#F4F7F0]">
            Delete Hosted Game?
          </h2>
          <p className="text-xs text-[#A5B0A6] leading-relaxed">
            Are you sure you want to permanently delete this game? This will cancel the match, remove it from community feeds, and clean up player participation records.
          </p>
        </div>

        {/* Game Details Summary Card */}
        <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 space-y-1.5 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#C8FF2E]">{game.sport}</span>
            <span className="text-[10px] text-[#A5B0A6]">{game.date} • {game.time}</span>
          </div>
          <h4 className="font-display font-bold text-sm text-[#F4F7F0] truncate">
            {game.title}
          </h4>
          <span className="text-[11px] text-[#6F7B71] block truncate">
            📍 {game.locationName}
          </span>
          <div className="flex items-center gap-2 pt-1 text-[10px] text-[#A5B0A6]">
            <span>{game.spotsJoined} players registered</span>
            <span>•</span>
            <span>{game.skillLevel}</span>
          </div>
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#FF5C5C]/15 border border-[#FF5C5C]/30 text-[#FF5C5C] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-xl bg-[#1C241E] hover:bg-[#253028] text-xs font-bold text-[#A5B0A6] hover:text-white border border-white/5 transition-all press-scale disabled:opacity-50"
          >
            Keep Game
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-xl bg-[#FF5C5C] hover:bg-[#e04545] text-xs font-display font-bold text-white shadow-[0_0_20px_rgba(255,92,92,0.3)] transition-all press-scale flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Game</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
