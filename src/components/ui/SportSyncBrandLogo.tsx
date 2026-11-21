'use client';

import React from 'react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface SportSyncBrandLogoProps {
  variant?: 'wordmark' | 'mark';
  className?: string;
  imgClassName?: string;
  size?: number;
  alt?: string;
}

export function SportSyncBrandLogo({
  variant = 'wordmark',
  className,
  imgClassName,
  size,
  alt = 'SportSync',
}: SportSyncBrandLogoProps) {
  const { isLightMode } = useTheme();
  const src = variant === 'mark' ? '/sportsync-logo.svg' : '/sportsync-name.svg';

  const imgStyle = size ? { height: size } : undefined;
  const defaultImgClass =
    variant === 'mark'
      ? 'h-12 w-12 object-contain select-none pointer-events-none'
      : 'h-7 w-auto object-contain select-none pointer-events-none';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center shrink-0 transition-colors',
        isLightMode &&
          (variant === 'mark'
            ? 'p-2 rounded-2xl border border-black/15 shadow-sm'
            : 'px-3 py-1.5 rounded-xl border border-black/15 shadow-sm'),
        className
      )}
      style={isLightMode ? { backgroundColor: '#0A120D' } : undefined}
    >
      <img
        src={src}
        alt={alt}
        style={imgStyle}
        className={cn(defaultImgClass, imgClassName)}
      />
    </span>
  );
}
