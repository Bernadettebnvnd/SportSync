import React from 'react';
import { getPlayerInitials } from '@/lib/utils';

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
  id,
  name,
  size = 40,
  className = '',
  showBadge = false,
  badgeLevel = 18,
}) => {
  const displayName = name || (id && id !== 'default' ? id : 'Player');
  const initials = getPlayerInitials(displayName);
  const fontSize = Math.max(10, Math.round(size * 0.38));

  return (
    <div
      style={{ width: size, height: size }}
      suppressHydrationWarning
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none bg-[#141A15] border-2 border-[#C8FF2E] text-[#C8FF2E] font-display font-black shadow-[0_0_12px_rgba(200,255,46,0.22)] ${className}`}
    >
      <span style={{ fontSize }} className="leading-none text-center select-none tracking-tight">
        {initials}
      </span>
      {showBadge && (
        <span className="absolute -bottom-1 -right-1 bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-[9px] px-1 py-0.2 rounded-full border border-[#0B0F0C] leading-none shadow-sm">
          {badgeLevel}
        </span>
      )}
    </div>
  );
};
