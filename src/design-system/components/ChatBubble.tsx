import React, { useState } from 'react';
import { UserAvatar, AvatarId } from '../../illustrations/Avatars';
import { Vote, Check, Crown } from 'lucide-react';

export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  avatarId: AvatarId;
  text: string;
  time: string;
  isMe?: boolean;
  isHost?: boolean;
}

export const ChatBubble: React.FC<{
  message: ChatMessage;
  className?: string;
}> = ({ message, className = '' }) => {
  const isMe = Boolean(message.isMe);

  return (
    <div
      className={`flex items-end gap-2.5 my-2.5 select-none ${
        isMe ? 'justify-end' : 'justify-start'
      } ${className}`}
    >
      {/* 1. Left Avatar for other players or host */}
      {!isMe && (
        <div className="relative shrink-0 mb-1">
          <UserAvatar
            id={message.avatarId}
            name={message.senderName}
            size={34}
            className="border-[#C8FF2E]/40"
          />
          {message.isHost && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center shadow-sm">
              <Crown className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
        </div>
      )}

      {/* 2. Message Content Block */}
      <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Sender Name & Role Label Header */}
        <div
          className={`flex items-center gap-1.5 mb-1 px-1 ${
            isMe ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="text-[11px] font-bold text-[#F4F7F0] truncate max-w-[180px]">
            {message.senderName}
          </span>

          {message.isHost ? (
            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#C8FF2E]/15 text-[#C8FF2E] font-bold border border-[#C8FF2E]/30 flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5 stroke-[3]" />
              <span>Host</span>
            </span>
          ) : isMe ? (
            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/10 text-[#A5B0A6] font-medium">
              You
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#1C241E] text-[#A5B0A6] font-medium border border-white/5">
              Player
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
            isMe
              ? 'bg-[#C8FF2E] text-[#0B0F0C] rounded-br-sm font-medium shadow-sm'
              : 'bg-[#1C241E] text-[#F4F7F0] rounded-bl-sm border border-white/5 shadow-sm'
          }`}
        >
          {message.text}
        </div>

        {/* Timestamp */}
        <span className="text-[9px] text-[#6F7B71] mt-0.5 px-1 font-mono">
          {message.time}
        </span>
      </div>

      {/* 3. Right Avatar for current user */}
      {isMe && (
        <div className="relative shrink-0 mb-1">
          <UserAvatar
            id={message.avatarId}
            name={message.senderName}
            size={34}
            className="border-[#C8FF2E]"
          />
          {message.isHost && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center shadow-sm">
              <Crown className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SystemMessage: React.FC<{
  text: string;
  className?: string;
}> = ({ text, className = '' }) => (
  <div className={`my-3 text-center ${className}`}>
    <span className="inline-block px-3 py-1 rounded-full bg-[#1C241E]/80 border border-white/5 text-[11px] text-[#A5B0A6]">
      {text}
    </span>
  </div>
);

export const PollCard: React.FC<{
  question: string;
  options: Array<{ id: string; text: string; votes: number }>;
  onVote?: (optId: string) => void;
  className?: string;
}> = ({ question, options, onVote, className = '' }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const totalVotes = options.reduce((acc, curr) => acc + curr.votes, 0) + (selectedId ? 1 : 0);

  const handleVote = (id: string) => {
    setSelectedId(id);
    onVote?.(id);
  };

  return (
    <div className={`p-4 rounded-2xl bg-[#141A15] border border-white/10 my-3 select-none ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-[#FF8FC7] font-bold uppercase tracking-wider mb-2">
        <Vote className="w-3.5 h-3.5" />
        <span>Match Group Poll</span>
      </div>

      <h4 className="font-display font-semibold text-sm text-[#F4F7F0] mb-3">
        {question}
      </h4>

      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          const voteCount = opt.votes + (isSelected ? 1 : 0);
          const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              className={`relative w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs overflow-hidden transition-all press-scale ${
                isSelected
                  ? 'border-[#C8FF2E] bg-[#C8FF2E]/10'
                  : 'border-white/5 bg-[#1C241E] hover:border-white/20'
              }`}
            >
              {/* Fill bar */}
              <div
                style={{ width: `${percent}%` }}
                className={`absolute inset-y-0 left-0 opacity-15 pointer-events-none transition-all duration-300 ${
                  isSelected ? 'bg-[#C8FF2E]' : 'bg-white'
                }`}
              />

              <div className="flex items-center gap-2 relative z-10">
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                    isSelected ? 'border-[#C8FF2E] bg-[#C8FF2E] text-[#0B0F0C]' : 'border-white/30'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className={`font-medium ${isSelected ? 'text-[#C8FF2E] font-bold' : 'text-[#F4F7F0]'}`}>
                  {opt.text}
                </span>
              </div>

              <span className="text-[11px] font-mono text-[#A5B0A6] relative z-10">
                {percent}%
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-[10px] text-[#6F7B71] mt-2 text-right">
        {totalVotes} player votes
      </div>
    </div>
  );
};
