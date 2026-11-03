import React, { useState } from 'react';
import {
  ArrowLeft,
  Send,
  MapPin,
  Sparkles,
  Users,
  Share2,
  CheckCircle2,
  Crown,
  Copy,
  Check,
  MessageSquare,
  Calendar,
  Clock,
  Shield,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { ChatBubble, SystemMessage, PollCard, ChatMessage } from '../../design-system/components/ChatBubble';
import { UserAvatar, AvatarId } from '../../illustrations/Avatars';
import { CommunityGame } from '../../mock/types';
import { shareMatch, copyToClipboard, getMatchShareUrl } from '../../lib/shareUtils';
import { Button } from '../../design-system/components/Button';

interface MatchGroupChatScreenProps {
  onBack: () => void;
  game?: CommunityGame | null;
  currentUserName?: string;
  currentUserId?: string;
  onOpenMatchDetail?: () => void;
  onToast?: (msg: string) => void;
}

export const MatchGroupChatScreen: React.FC<MatchGroupChatScreenProps> = ({
  onBack,
  game,
  currentUserName = 'Alex Rivera',
  currentUserId,
  onOpenMatchDetail,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'roster'>('chat');
  const [inputText, setInputText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const showFeedback = (msg: string) => {
    if (onToast) {
      onToast(msg);
    }
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Compile roster members from game prop or default fallback squad
  const fallbackMembers: Array<{ name: string; avatar: AvatarId; id?: string; role?: string }> = [
    { name: 'Alex Rivera', avatar: 'alex', role: 'Host' },
    { name: 'Marcus Bell', avatar: 'marcus', role: 'Player' },
    { name: 'Elena Rostova', avatar: 'elena', role: 'Player' },
    { name: 'Sarah Jenkins', avatar: 'sarah', role: 'Player' },
    { name: 'Kai Tanaka', avatar: 'kai', role: 'Player' },
    { name: 'Leo Alvarez', avatar: 'leo', role: 'Player' },
    { name: 'Jordan Lee', avatar: 'jordan', role: 'Player' },
    { name: 'Martin Vance', avatar: 'martin', role: 'Player' },
  ];

  const members = (game?.members && game.members.length > 0)
    ? game.members
    : fallbackMembers;

  const spotsTotal = game?.spotsTotal || 10;
  const spotsJoined = Math.max(members.length, game?.spotsJoined || members.length);
  const spotsLeft = Math.max(0, spotsTotal - spotsJoined);
  const matchTitle = game?.title || '5v5 Sunset Match Group';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      senderName: game?.hostName ? `${game.hostName} (Host)` : 'Alex Rivera (Host)',
      avatarId: game?.hostAvatar || 'alex',
      text: `Hey squad! Match is locked at ${game?.locationName || 'Pitchway Pitch 2'} for ${game?.time || '19:30'}. White & dark bibs ready.`,
      time: '18:15',
    },
    {
      id: 'm2',
      senderName: 'Marcus Bell',
      avatarId: 'marcus',
      text: 'Locked in! Coming straight from central line. Shin guards recommended?',
      time: '18:22',
    },
    {
      id: 'm3',
      senderName: 'Elena Rostova',
      avatarId: 'elena',
      text: 'Recommended for 5s on 3G turf! I will bring extra hydration bottles.',
      time: '18:28',
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `msg_${crypto.randomUUID()}`
        : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      senderName: currentUserName,
      avatarId: 'alex',
      text: inputText,
      time: 'Just now',
      isMe: true,
    };

    setMessages([...messages, newMsg]);
    setInputText('');
  };

  const handleQuickReply = (text: string) => {
    setInputText(text);
  };

  const handleShareRosterLink = async () => {
    const targetGame = game || {
      id: 'sunset-5v5-match',
      title: matchTitle,
      sport: 'Football' as const,
      locationName: 'Pitchway Arena Naga',
      inviteCode: 'SUNSET5',
    };

    await shareMatch(targetGame, (msg) => {
      setCopiedLink(true);
      showFeedback(msg);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleMentionPlayer = (playerName: string) => {
    setInputText(`@${playerName} `);
    setActiveTab('chat');
    showFeedback(`Mentioning @${playerName}`);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#0B0F0C] text-[#F4F7F0] select-none relative">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[700] w-11/12 max-w-sm p-3.5 rounded-2xl bg-[#141A15] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#C8FF2E] shrink-0" />
          <span className="text-xs font-semibold text-[#F4F7F0] flex-1">
            {feedback}
          </span>
        </div>
      )}

      {/* 1. Header with Title & Quick Switcher */}
      <div className="px-4 pt-4 pb-2 border-b border-white/5 bg-[#141A15] shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-sm text-[#F4F7F0] truncate">
                {matchTitle}
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'chat' ? 'roster' : 'chat')}
                className="text-[11px] text-[#C8FF2E] hover:underline font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF2E] animate-pulse" />
                <span>{spotsJoined} of {spotsTotal} players in roster</span>
                <span className="text-[#A5B0A6]">({activeTab === 'chat' ? 'View Roster' : 'Open Chat'})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Share Match Link */}
            <button
              type="button"
              onClick={handleShareRosterLink}
              title="Share Match Link"
              aria-label="Share Match Link"
              className="w-9 h-9 rounded-full bg-[#1C241E] border border-white/10 text-[#C8FF2E] hover:bg-[#C8FF2E] hover:text-[#0B0F0C] flex items-center justify-center transition-all press-scale"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Toggle View Button */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'chat' ? 'roster' : 'chat')}
              className={`h-9 px-3 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all press-scale ${
                activeTab === 'roster'
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                  : 'bg-[#1C241E] text-[#A5B0A6] border-white/10 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Roster</span>
            </button>
          </div>
        </div>

        {/* Segmented View Switcher: Chat vs Roster */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#0B0F0C] border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all press-scale ${
              activeTab === 'chat'
                ? 'bg-[#1C241E] text-[#C8FF2E] shadow-sm'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Match Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all press-scale ${
              activeTab === 'roster'
                ? 'bg-[#1C241E] text-[#C8FF2E] shadow-sm'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roster ({spotsJoined}/{spotsTotal})</span>
          </button>
        </div>
      </div>

      {/* 2. Main Body: Either Chat Log OR Interactive Roster View */}
      {activeTab === 'chat' ? (
        <>
          {/* Chat Log (Scrollable) */}
          <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-2">
            <SystemMessage text={`Game scheduled • ${spotsJoined} spots confirmed • Pitch locked`} />

            {/* Messages */}
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            {/* Interactive Match Poll Card */}
            <PollCard
              question="Who's bringing the size 5 match ball?"
              options={[
                { id: 'opt1', text: 'Alex (Mitre Pro)', votes: 5 },
                { id: 'opt2', text: 'Marcus (Nike Premier)', votes: 2 },
                { id: 'opt3', text: 'Venue providing ball', votes: 1 },
              ]}
            />
          </div>

          {/* Quick Replies & Input Bar */}
          <div className="p-3 bg-[#141A15] border-t border-white/5 space-y-2 shrink-0">
            {/* Quick replies */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {['On my way! 🏃', 'Bringing bibs', 'Pitch 2 right?', '10 mins away'].map((qr) => (
                <button
                  key={qr}
                  onClick={() => handleQuickReply(qr)}
                  className="px-2.5 py-1 rounded-full bg-[#1C241E] border border-white/10 text-[11px] text-[#A5B0A6] hover:text-white whitespace-nowrap transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message match group..."
                className="flex-1 h-11 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
              />

              <button
                type="submit"
                className="w-11 h-11 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center transition-all press-scale shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          </div>
        </>
      ) : (
        /* FUNCTIONAL CHAT ROSTER VIEW */
        <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-4">
          {/* Roster Capacity Progress Card */}
          <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                  Roster Capacity
                </span>
                <h3 className="font-display font-black text-lg text-[#F4F7F0]">
                  {spotsJoined} / {spotsTotal} Confirmed Players
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                spotsLeft === 0
                  ? 'bg-[#3DDC84]/20 text-[#3DDC84] border border-[#3DDC84]/30'
                  : 'bg-[#FF8FC7]/20 text-[#FF8FC7] border border-[#FF8FC7]/30'
              }`}>
                {spotsLeft === 0 ? 'Roster Full' : `${spotsLeft} Spots Open`}
              </span>
            </div>

            {/* Capacity Meter */}
            <div className="w-full h-2 rounded-full bg-[#1C241E] overflow-hidden">
              <div
                className="h-full bg-[#C8FF2E] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((spotsJoined / spotsTotal) * 100))}%` }}
              />
            </div>

            {/* Quick Share / Invite Action */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareRosterLink}
                className="flex-1 h-10 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] font-bold text-xs flex items-center justify-center gap-2 transition-all press-scale hover:bg-[#d4ff52]"
              >
                {copiedLink ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Match / Invite Players'}</span>
              </button>

              {onOpenMatchDetail && (
                <button
                  type="button"
                  onClick={onOpenMatchDetail}
                  className="h-10 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs font-bold text-[#F4F7F0] hover:bg-[#253028] transition-all press-scale flex items-center gap-1.5"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Roster Members List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                Confirmed Squad ({members.length})
              </span>
              <span className="text-[10px] text-[#C8FF2E] font-medium">
                Tap player to mention
              </span>
            </div>

            <div className="space-y-2">
              {members.map((member, idx) => {
                const isHost = idx === 0 || member.name === game?.hostName;
                return (
                  <div
                    key={member.id || `${member.name}-${idx}`}
                    className="p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between hover:border-white/15 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <UserAvatar id={member.avatar} name={member.name} size={38} />
                        {isHost && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center shadow-sm">
                            <Crown className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-xs text-[#F4F7F0] truncate">
                            {member.name}
                          </span>
                          {isHost ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#C8FF2E]/10 text-[#C8FF2E] font-bold border border-[#C8FF2E]/30">
                              Host
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#1C241E] text-[#A5B0A6] font-medium border border-white/5">
                              Player
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#3DDC84] flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3DDC84]" />
                          Ready to play
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMentionPlayer(member.name)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#1C241E] hover:bg-[#253028] border border-white/10 text-[11px] font-semibold text-[#A5B0A6] hover:text-white transition-colors flex items-center gap-1 press-scale"
                    >
                      <MessageSquare className="w-3 h-3 text-[#C8FF2E]" />
                      <span>Chat</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Open Roster Slots */}
          {spotsLeft > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider px-1 block">
                Open Slots ({spotsLeft})
              </span>
              <div className="space-y-2">
                {Array.from({ length: Math.min(3, spotsLeft) }).map((_, i) => (
                  <div
                    key={`open-slot-${i}`}
                    className="p-3 rounded-2xl bg-[#0B0F0C] border border-dashed border-white/15 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#141A15] border border-dashed border-white/20 flex items-center justify-center text-[#A5B0A6]">
                        <UserPlus className="w-4 h-4 text-[#A5B0A6]" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[#A5B0A6] block">
                          Slot #{spotsJoined + i + 1} Available
                        </span>
                        <span className="text-[10px] text-[#6F7B71]">
                          Invite friends to complete roster
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleShareRosterLink}
                      className="px-3 py-1.5 rounded-xl bg-[#1C241E] hover:bg-[#C8FF2E] hover:text-[#0B0F0C] border border-white/10 text-[11px] font-bold text-[#C8FF2E] transition-all press-scale flex items-center gap-1.5"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Invite</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match Venue & Kickoff Overview */}
          {game && (
            <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                Match Schedule & Venue
              </span>
              <div className="flex items-center gap-2 text-[#F4F7F0]">
                <Calendar className="w-3.5 h-3.5 text-[#C8FF2E]" />
                <span>{game.date} • {game.time}</span>
              </div>
              <div className="flex items-center gap-2 text-[#A5B0A6]">
                <MapPin className="w-3.5 h-3.5 text-[#C8FF2E]" />
                <span className="truncate">{game.locationName}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
