import React from 'react';
import { Sparkles } from 'lucide-react';

interface ComingSoonBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'premium' | 'minimal';
}

export const ComingSoonBadge = ({ 
  className = '', 
  size = 'sm',
  variant = 'default'
}: ComingSoonBadgeProps) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const variantClasses = {
    default: 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-300 border border-purple-500/30',
    premium: 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-300 border border-amber-500/30',
    minimal: 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title="This feature is in development"
    >
      {variant !== 'minimal' && <Sparkles size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} />}
      New
    </span>
  );
};
