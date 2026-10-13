import React from 'react';

export type AvatarId =
  | 'martin'
  | 'alex'
  | 'elena'
  | 'marcus'
  | 'sarah'
  | 'kai'
  | 'leo'
  | 'jordan'
  | 'default';

export const AVATAR_KEYS: AvatarId[] = [
  'alex',
  'martin',
  'elena',
  'marcus',
  'sarah',
  'kai',
  'leo',
  'jordan',
];

export function toAvatarId(id?: string): AvatarId {
  if (!id) return 'alex';
  const valid: AvatarId[] = ['martin', 'alex', 'elena', 'marcus', 'sarah', 'kai', 'leo', 'jordan', 'default'];
  return (valid.includes(id as AvatarId) ? id : 'alex') as AvatarId;
}

interface UserAvatarProps {
  id?: AvatarId;
  name?: string;
  size?: number;
  className?: string;
  showBadge?: boolean;
  badgeLevel?: number;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  id = 'alex',
  name = 'Alex Rivera',
  size = 40,
  className = '',
  showBadge = false,
  badgeLevel = 18,
}) => {
  const getAvatarGraphic = () => {
    switch (id) {
      case 'martin':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="20" fill="#0F2A22" />
            <circle cx="20" cy="15" r="7" fill="#F4F7F0" />
            <path d="M13 13C13 10 16 8 20 8C24 8 27 10 27 13" stroke="#C8FF2E" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 36C9 28 14 25 20 25C26 25 31 28 31 36" fill="#C8FF2E" />
          </svg>
        );

      case 'alex':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="20" fill="#1C241E" />
            <circle cx="20" cy="15" r="7" fill="#F4F7F0" />
            <path d="M12 12C12 9 16 8 20 8C25 8 28 10 28 14H12Z" fill="#C8432B" />
            <path d="M8 36C8 27 13 25 20 25C27 25 32 27 32 36" fill="#FF8FC7" />
          </svg>
        );

      case 'elena':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="20" fill="#0F2A22" />
            <circle cx="20" cy="15" r="7" fill="#F4F7F0" />
            <path d="M11 16C11 10 15 7 20 7C25 7 29 10 29 16V22H11V16Z" fill="#C8FF2E" />
            <path d="M8 36C8 28 14 25 20 25C26 25 32 28 32 36" fill="#141A15" stroke="#C8FF2E" strokeWidth="1.5" />
          </svg>
        );

      case 'marcus':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="20" fill="#C8432B" />
            <circle cx="20" cy="15" r="7" fill="#F4F7F0" />
            <path d="M14 11C16 8 24 8 26 11" stroke="#0B0F0C" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 36C8 27 13 24 20 24C27 24 32 27 32 36" fill="#0F2A22" />
          </svg>
        );

      case 'sarah':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="20" fill="#263028" />
            <circle cx="20" cy="15" r="7" fill="#F4F7F0" />
            <circle cx="16" cy="14" r="1.5" fill="#0B0F0C" />
            <circle cx="24" cy="14" r="1.5" fill="#0B0F0C" />
            <path d="M13 12C14 8 26 8 27 12" stroke="#FF8FC7" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 36C8 28 13 25 20 25C27 25 32 28 32 36" fill="#C8FF2E" />
          </svg>
        );

      case 'kai':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="20" fill="#141A15" />
            <circle cx="20" cy="15" r="7" fill="#F4F7F0" />
            <path d="M12 14L20 8L28 14" stroke="#C8FF2E" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M8 36C8 27 13 25 20 25C27 25 32 27 32 36" fill="#C8432B" />
          </svg>
        );

      default:
        return (
          <div className="w-full h-full rounded-full bg-[#1C241E] border border-white/10 flex items-center justify-center font-display font-semibold text-xs text-[#C8FF2E]">
            {name.slice(0, 2).toUpperCase()}
          </div>
        );
    }
  };

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-block shrink-0 rounded-full select-none ${className}`}
    >
      {getAvatarGraphic()}
      {showBadge && (
        <span className="absolute -bottom-1 -right-1 bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-[9px] px-1 py-0.2 rounded-full border border-[#0B0F0C] leading-none shadow-sm">
          {badgeLevel}
        </span>
      )}
    </div>
  );
};
