import React, { useState } from 'react';
import { ArrowLeft, Send, MapPin, Plus, Sparkles } from 'lucide-react';
import { ChatBubble, SystemMessage, PollCard, ChatMessage } from '../../design-system/components/ChatBubble';
import { UserAvatar } from '../../illustrations/Avatars';

interface MatchGroupChatScreenProps {
  onBack: () => void;
}

export const MatchGroupChatScreen: React.FC<MatchGroupChatScreenProps> = ({ onBack }) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      senderName: 'Alex Rivera (Host)',
      avatarId: 'alex',
      text: 'Hey squad! Sunset 5v5 game is locked at Pitchway Pitch 2 tonight. White & dark bibs ready.',
      time: '18:15',
    },
    {
      id: 'm2',
      senderName: 'Marcus Bell',
      avatarId: 'marcus',
      text: 'Locked in! Coming straight from central line. Need shin pads?',
      time: '18:22',
    },
    {
      id: 'm3',
      senderName: 'Elena Rostova',
      avatarId: 'elena',
      text: 'Recommended for 5s on 3G turf! I will bring extra bottles of water.',
      time: '18:28',
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderName: 'Alex Rivera',
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

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#0B0F0C] text-[#F4F7F0] select-none">
      {/* 1. Header */}
      <div className="px-5 pt-4 pb-3 border-b border-white/5 bg-[#141A15] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-display font-bold text-sm text-[#F4F7F0]">
              5v5 Sunset Match Group
            </h2>
            <span className="text-[10px] text-[#C8FF2E] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF2E]" />
              8 players in chat
            </span>
          </div>
        </div>

        <button className="w-9 h-9 rounded-full bg-[#1C241E] border border-white/10 flex items-center justify-center text-[#A5B0A6]">
          <MapPin className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Chat Log (Scrollable) */}
      <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-2">
        <SystemMessage text="Game scheduled for today 19:30 • All 8 spots confirmed" />

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

      {/* 3. Quick Replies & Input Bar */}
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
    </div>
  );
};
