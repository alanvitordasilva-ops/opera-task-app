import React, { useState } from 'react';
import { User } from '../types/index.ts';
import { getInitials } from '../utils/helpers.ts';

interface UserAvatarProps {
  user?: Partial<User> | null;
  name?: string;
  avatarUrl?: string;
  avatarColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorder?: boolean;
  borderClass?: string;
  title?: string;
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
  xl: 'w-12 h-12 text-base',
  '2xl': 'w-20 h-20 text-2xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  name,
  avatarUrl,
  avatarColor,
  size = 'md',
  className = '',
  showBorder = false,
  borderClass = 'ring-2 ring-white dark:ring-slate-900',
  title,
}) => {
  const [imgError, setImgError] = useState(false);

  const displayName = name || user?.name || 'Usuário';
  const displayUrl = (!imgError && (avatarUrl || user?.avatarUrl)) || '';
  const bgColor = avatarColor || user?.avatarColor || '#173653';
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const borderStyling = showBorder ? borderClass : '';

  return (
    <div
      title={title !== undefined ? title : displayName}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full font-bold select-none overflow-hidden transition-transform ${sizeClass} ${borderStyling} ${className}`}
      style={{
        backgroundColor: displayUrl ? 'transparent' : bgColor,
        color: '#ffffff',
      }}
    >
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={displayName}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="leading-none">{getInitials(displayName)}</span>
      )}
    </div>
  );
};
