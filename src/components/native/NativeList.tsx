import React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';

// iOS-style list item
interface NativeListItemProps {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  value?: string | React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  showCheckmark?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export const NativeListItem = ({
  label,
  sublabel,
  icon,
  value,
  onPress,
  showChevron = false,
  showCheckmark = false,
  destructive = false,
  disabled = false,
  isFirst = false,
  isLast = false,
}: NativeListItemProps) => {
  const handlePress = async () => {
    if (disabled || !onPress) return;
    await hapticService.light();
    onPress();
  };

  return (
    <button
      onClick={handlePress}
      disabled={disabled || !onPress}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 bg-[#1c1c1e]',
        'active:bg-white/10 transition-colors duration-100',
        'text-left',
        isFirst && 'rounded-t-xl',
        isLast && 'rounded-b-xl',
        !isLast && 'border-b border-white/8',
        disabled && 'opacity-50',
        !onPress && 'cursor-default',
      )}
    >
      {/* Icon */}
      {icon && (
        <div
          className={cn(
            'w-[29px] h-[29px] rounded-md flex items-center justify-center flex-shrink-0',
            destructive ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary',
          )}
        >
          {icon}
        </div>
      )}

      {/* Label */}
      <div className="flex-1 min-w-0">
        <span
          className={cn('text-[17px] font-normal', destructive ? 'text-red-500' : 'text-white')}
        >
          {label}
        </span>
        {sublabel && (
          <span className="block text-[13px] text-white/50 mt-0.5 truncate">{sublabel}</span>
        )}
      </div>

      {/* Value */}
      {value && <span className="text-[17px] text-white/50 flex-shrink-0">{value}</span>}

      {/* Checkmark */}
      {showCheckmark && <Check size={20} className="text-primary flex-shrink-0" strokeWidth={3} />}

      {/* Chevron */}
      {showChevron && onPress && <ChevronRight size={20} className="text-white/30 flex-shrink-0" />}
    </button>
  );
};

// iOS-style grouped list section
interface NativeListSectionProps {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  inset?: boolean;
}

export const NativeListSection = ({
  header,
  footer,
  children,
  inset = true,
}: NativeListSectionProps) => {
  // Inject isFirst/isLast props to children
  const childrenArray = React.Children.toArray(children);
  const enhancedChildren = childrenArray.map((child, index) => {
    if (React.isValidElement<NativeListItemProps>(child)) {
      return React.cloneElement(child, {
        isFirst: index === 0,
        isLast: index === childrenArray.length - 1,
      });
    }
    return child;
  });

  return (
    <div className={cn('mb-8', inset && 'mx-4')}>
      {/* Section Header */}
      {header && (
        <h3 className="text-[13px] font-normal text-white/50 uppercase tracking-wide px-4 mb-2">
          {header}
        </h3>
      )}

      {/* Items */}
      <div className="rounded-xl overflow-hidden">{enhancedChildren}</div>

      {/* Section Footer */}
      {footer && <p className="text-[13px] text-white/40 px-4 mt-2 leading-relaxed">{footer}</p>}
    </div>
  );
};

// iOS-style list container
interface NativeListProps {
  children: React.ReactNode;
  className?: string;
}

export const NativeList = ({ children, className }: NativeListProps) => {
  return <div className={cn('py-4 bg-black min-h-full', className)}>{children}</div>;
};

// Simple toggle/switch item
interface NativeToggleItemProps {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export const NativeToggleItem = ({
  label,
  sublabel,
  icon,
  checked,
  onChange,
  disabled = false,
  isFirst = false,
  isLast = false,
}: NativeToggleItemProps) => {
  const handleToggle = async () => {
    if (disabled) return;
    await hapticService.light();
    onChange(!checked);
  };

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 bg-[#1c1c1e]',
        isFirst && 'rounded-t-xl',
        isLast && 'rounded-b-xl',
        !isLast && 'border-b border-white/8',
        disabled && 'opacity-50',
      )}
    >
      {/* Icon */}
      {icon && (
        <div className="w-[29px] h-[29px] rounded-md bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}

      {/* Label */}
      <div className="flex-1 min-w-0">
        <span className="text-[17px] font-normal text-white">{label}</span>
        {sublabel && <span className="block text-[13px] text-white/50 mt-0.5">{sublabel}</span>}
      </div>

      {/* iOS Switch */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'relative w-[51px] h-[31px] rounded-full transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-[#1c1c1e]',
          checked ? 'bg-[#34c759]' : 'bg-white/30',
        )}
        role="switch"
        aria-checked={checked}
      >
        <div
          className={cn(
            'absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md',
            'transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
          )}
        />
      </button>
    </div>
  );
};
