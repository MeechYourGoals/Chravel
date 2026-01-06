import React, { useCallback } from 'react';
import { Map, Briefcase, Calendar, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';
import { NativeBottomSheet } from './NativeBottomSheet';

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
    icon: <Map size={22} />,
  },
  {
    id: 'tripsPro',
    label: 'Pro Trips',
    sublabel: 'Business & team travel',
    icon: <Briefcase size={22} />,
  },
  {
    id: 'events',
    label: 'Events',
    sublabel: 'Conferences & gatherings',
    icon: <Calendar size={22} />,
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
 * iOS-style trip type switcher sheet.
 * Similar to Instagram's account switcher pattern.
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

  return (
    <NativeBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Switch View"
      detent="small"
      allowedDetents={['small', 'medium']}
      showGrabber
    >
      <div className="py-2">
        {TRIP_TYPES.map(type => {
          const isSelected = selectedType === type.id;
          const count = tripCounts[type.id];

          return (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3',
                'active:bg-white/5 transition-colors',
                isSelected && 'bg-white/5',
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/70',
                )}
              >
                {type.icon}
              </div>

              {/* Label & sublabel */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-medium text-white">{type.label}</span>
                  {count > 0 && <span className="text-[13px] text-white/40">{count}</span>}
                </div>
                <span className="text-[13px] text-white/50">{type.sublabel}</span>
              </div>

              {/* Checkmark */}
              {isSelected && <Check size={22} className="text-primary" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </NativeBottomSheet>
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
