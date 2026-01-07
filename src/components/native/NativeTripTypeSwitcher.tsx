import React, { useCallback, useEffect } from 'react';
import { Map, Briefcase, Calendar, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';

type TripType = 'myTrips' | 'tripsPro' | 'events';

interface TripTypeOption {
  id: TripType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const TRIP_TYPES: TripTypeOption[] = [
  {
    id: 'myTrips',
    label: 'My Trips',
    sublabel: 'Personal travel plans',
    icon: <Map size={24} />,
  },
  {
    id: 'tripsPro',
    label: 'Pro Trips',
    sublabel: 'Business & team travel',
    icon: <Briefcase size={24} />,
  },
  {
    id: 'events',
    label: 'Events',
    sublabel: 'Conferences & gatherings',
    icon: <Calendar size={24} />,
  },
];

interface NativeTripTypeSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: TripType;
  onSelectType: (type: TripType) => void;
  tripCounts?: Record<TripType, number>;
}

/**
 * Full-screen trip type selector modal.
 * iOS alert-style centered modal for switching between trip views.
 */
export const NativeTripTypeSwitcher = ({
  isOpen,
  onClose,
  selectedType,
  onSelectType,
  tripCounts = { myTrips: 0, tripsPro: 0, events: 0 },
}: NativeTripTypeSwitcherProps) => {
  const handleSelect = useCallback(
    async (type: TripType) => {
      await hapticService.selectionChanged();
      onSelectType(type);
      onClose();
    },
    [onSelectType, onClose],
  );

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Dark backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Centered modal container */}
      <div
        className="absolute inset-0 flex items-center justify-center p-6"
        style={{
          paddingTop: 'max(24px, env(safe-area-inset-top))',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="w-full max-w-sm bg-[#1c1c1e] rounded-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Select View</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
            >
              <X size={18} className="text-white/70" />
            </button>
          </div>

          {/* Trip type options */}
          <div className="p-4 space-y-3">
            {TRIP_TYPES.map(type => {
              const isSelected = selectedType === type.id;
              const count = tripCounts[type.id];

              return (
                <button
                  key={type.id}
                  onClick={() => handleSelect(type.id)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl',
                    'transition-all duration-150',
                    isSelected
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-white/5 active:bg-white/10',
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white/10 text-white/70',
                    )}
                  >
                    {type.icon}
                  </div>

                  {/* Label & sublabel */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-[17px] font-medium',
                          isSelected ? 'text-white' : 'text-white/90',
                        )}
                      >
                        {type.label}
                      </span>
                      {count > 0 && (
                        <span className="text-[13px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </div>
                    <span className="text-[14px] text-white/50">{type.sublabel}</span>
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check size={14} className="text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline trip type indicator (shows current type with dropdown arrow)
interface TripTypeIndicatorProps {
  selectedType: TripType;
  onPress: () => void;
  className?: string;
}

export const TripTypeIndicator = ({ selectedType, onPress, className }: TripTypeIndicatorProps) => {
  const selectedOption = TRIP_TYPES.find(t => t.id === selectedType);

  const handlePress = async () => {
    await hapticService.light();
    onPress();
  };

  return (
    <button
      onClick={handlePress}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-white/10 active:bg-white/20 transition-colors',
        className,
      )}
    >
      <span className="text-[15px] font-medium text-white">
        {selectedOption?.label || 'My Trips'}
      </span>
      <ChevronDown size={16} className="text-white/60" />
    </button>
  );
};

// Get display label for a trip type
export function getTripTypeLabel(type: TripType): string {
  const option = TRIP_TYPES.find(t => t.id === type);
  return option?.label || 'Trips';
}

// Get short label for tab bar
export function getTripTypeShortLabel(type: TripType): string {
  switch (type) {
    case 'myTrips':
      return 'Trips';
    case 'tripsPro':
      return 'Pro';
    case 'events':
      return 'Events';
    default:
      return 'Trips';
  }
}
