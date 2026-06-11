import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function UserAvatar({ src, name, className = '', onClick, size = 'md' }: UserAvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const baseClasses = `rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`;

  // Check if avatar URL exists and is valid (not empty and not a template placeholder)
  const isCustomUploadedAvatar = (url?: string) => {
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.trim().toLowerCase();
    if (cleanUrl === '') return false;

    // Direct non-uploaded templates / generators / placeholding domains & strings
    const placeholderPatterns = [
      'picsum.photos',
      'unsplash.com',
      'pravatar.cc',
      'api.dicebear.com',
      'ui-avatars.com',
      'default-avatar',
      'placeholder',
      'gravatar.com/avatar',
      'avatar-placeholder',
      'silhouette',
      'unknown',
      'dicebear'
    ];

    for (const pattern of placeholderPatterns) {
      if (cleanUrl.includes(pattern)) {
        return false;
      }
    }

    return true;
  };

  if (!isCustomUploadedAvatar(src)) {
    return (
      <div 
        id="avatar_silhouette_fallback" 
        className={`${baseClasses} bg-gray-200 text-gray-500 flex items-center justify-center select-none shadow-sm border border-white/20`} 
        onClick={onClick}
      >
        <User className="w-1/2 h-1/2 stroke-[1.75]" />
      </div>
    );
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      <img 
        src={src} 
        alt={name} 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={(e) => {
           // If custom image fails, completely hide the element
           (e.target as HTMLImageElement).style.display = 'none';
           const parent = (e.target as HTMLImageElement).parentElement;
           if (parent) {
             parent.style.display = 'none';
           }
        }}
      />
    </div>
  );
}
