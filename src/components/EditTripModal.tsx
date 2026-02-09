import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  MapPin,
  Calendar as CalendarIcon,
  Type,
  Image as ImageIcon,
  Palette,
  Users,
  Tag,
} from 'lucide-react';
import { ProTripCategory, getAllCategories, getCategoryConfig } from '@/types/proCategories';
import { useQueryClient } from '@tanstack/react-query';
import { parseDateRange, formatDateRange } from '@/utils/dateFormatters';
import { tripService, Trip } from '@/services/tripService';
import { useAuth } from '@/hooks/useAuth';
import { useTripCoverPhoto } from '@/hooks/useTripCoverPhoto';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TripCoverPhotoUpload } from './TripCoverPhotoUpload';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getAllProTripColors, getProTripColorByName } from '@/utils/proTripColors';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: {
    id: number | string;
    title: string;
    location: string;
    dateRange: string;
    coverPhoto?: string;
    trip_type?: 'consumer' | 'pro' | 'event';
    card_color?: string;
    organizer_display_name?: string;
    categories?: Array<{ type: string; value: string }>;
  };
  onUpdate?: (updates: Partial<EditTripModalProps['trip']>) => void;
}

export const EditTripModal = ({ isOpen, onClose, trip, onUpdate }: EditTripModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { coverPhoto, updateCoverPhoto, removeCoverPhoto } = useTripCoverPhoto(
    trip.id.toString(),
    trip.coverPhoto,
  );
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    organizer_display_name: '',
  });
  const [selectedCardColor, setSelectedCardColor] = useState<string | undefined>(trip.card_color);

  const availableColors = getAllProTripColors();
  const isPro = trip.trip_type === 'pro';
  const isProOrEvent = isPro || trip.trip_type === 'event';
  const isEvent = trip.trip_type === 'event';

  // Pro category state
  const allCategories = getAllCategories();
  const initialCategory = (trip.categories?.find(c => c.type === 'pro_category')?.value as ProTripCategory) || 'Other';
  const [proCategory, setProCategory] = useState<ProTripCategory>(initialCategory);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      const dates = parseDateRange(trip.dateRange);
      setFormData({
        name: trip.title,
        destination: trip.location,
        start_date: dates.start,
        end_date: dates.end,
        organizer_display_name: trip.organizer_display_name || '',
      });
      setSelectedCardColor(trip.card_color);
      const cat = (trip.categories?.find(c => c.type === 'pro_category')?.value as ProTripCategory) || 'Other';
      setProCategory(cat);
    }
  }, [isOpen, trip]);

  const handleSave = async () => {
    // Validate
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Trip name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.destination.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Location is required',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast({
        title: 'Validation Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const supabaseUpdates: Partial<Trip> = {
        name: formData.name,
        destination: formData.destination,
        start_date: formData.start_date,
        end_date: formData.end_date,
        ...(isProOrEvent && { card_color: selectedCardColor }),
        ...(isEvent && { organizer_display_name: formData.organizer_display_name.trim() || null }),
        ...(isPro && { categories: [{ type: 'pro_category', value: proCategory }] }),
      };

      // Convert to mock format for UI callback
      const mockUpdates: Partial<EditTripModalProps['trip']> = {
        title: formData.name,
        location: formData.destination,
        dateRange: formatDateRange(formData.start_date, formData.end_date),
        coverPhoto: coverPhoto,
        ...(isProOrEvent && { card_color: selectedCardColor }),
        ...(isEvent && {
          organizer_display_name: formData.organizer_display_name.trim() || undefined,
        }),
        ...(isPro && { categories: [{ type: 'pro_category', value: proCategory }] }),
      };

      // Demo mode: store in localStorage
      if (!user) {
        localStorage.setItem(`trip_${trip.id}_updates`, JSON.stringify(supabaseUpdates));
        if (onUpdate) onUpdate(mockUpdates);
        toast({
          title: 'Changes saved',
          description: 'Trip details updated successfully (demo mode)',
        });
        onClose();
        return;
      }

      // Authenticated: save to database
      const success = await tripService.updateTrip(trip.id.toString(), supabaseUpdates);

      if (success) {
        // Invalidate React Query cache to immediately reflect changes in UI
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        if (onUpdate) onUpdate(mockUpdates);
        toast({
          title: 'Changes saved',
          description: 'Trip details updated successfully',
        });
        onClose();
      } else {
        throw new Error('Failed to update trip');
      }
    } catch (error) {
      console.error('Error updating trip:', error);
      toast({
        title: 'Update failed',
        description: 'Could not update trip details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 max-w-md w-full animate-scale-in relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Trip Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Cover Photo */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <ImageIcon size={16} />
              Cover Photo{' '}
              {trip.trip_type && trip.trip_type !== 'consumer' && '(Background Overlay)'}
            </label>
            <TripCoverPhotoUpload
              tripId={trip.id.toString()}
              currentPhoto={coverPhoto}
              onPhotoUploaded={updateCoverPhoto}
              onPhotoRemoved={removeCoverPhoto}
              tripName={trip.title}
              className="h-48 w-full"
            />
            {trip.trip_type === 'pro' && (
              <p className="text-xs text-gray-400 mt-2">
                For Enterprise trips, your photo will appear subtly in the background of the header
                with a professional overlay.
              </p>
            )}
            {trip.trip_type === 'event' && (
              <p className="text-xs text-gray-400 mt-2">
                For Events, your photo will appear as a darker cinematic backdrop behind the event
                details for poster-style impact.
              </p>
            )}
          </div>

          {/* Card Color Picker - Only for Pro and Event trips */}
          {isProOrEvent && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Palette size={16} />
                Card Color
              </label>
              <div className="flex flex-wrap gap-3">
                {availableColors.map(color => {
                  const isSelected = selectedCardColor === color.accent;
                  return (
                    <button
                      key={color.accent}
                      type="button"
                      onClick={() => setSelectedCardColor(color.accent)}
                      className={cn(
                        'w-10 h-10 rounded-full transition-all duration-200 border-2',
                        `bg-gradient-to-br ${color.cardGradient}`,
                        isSelected
                          ? 'border-white ring-2 ring-white/50 scale-110'
                          : 'border-transparent hover:scale-105 hover:border-white/30',
                      )}
                      aria-label={`Select ${color.accent} color`}
                      disabled={loading}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Color-code your {trip.trip_type === 'pro' ? 'trips' : 'events'} for easy
                organization
              </p>
            </div>
          )}

          {/* Pro Trip Category */}
          {isPro && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Tag size={16} />
                Trip Category
              </label>
              <select
                value={proCategory}
                onChange={e => setProCategory(e.target.value as ProTripCategory)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
              >
                {allCategories.map(cat => (
                  <option key={cat} value={cat} className="bg-gray-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {getCategoryConfig(proCategory).description}
              </p>
            </div>
          )}


          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Type size={16} />
              Trip Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="Enter trip name"
              disabled={loading}
            />
          </div>

          {/* Organizer - Only for Events */}
          {isEvent && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Users size={16} />
                Organizer
              </label>
              <input
                type="text"
                value={formData.organizer_display_name}
                onChange={e => setFormData({ ...formData, organizer_display_name: e.target.value })}
                maxLength={200}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="e.g., Los Angeles Rams, Boys & Girls Club of Dallas"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">This name appears on your event card</p>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <MapPin size={16} />
              Location
            </label>
            <input
              type="text"
              value={formData.destination}
              onChange={e => setFormData({ ...formData, destination: e.target.value })}
              maxLength={200}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="Enter destination"
              disabled={loading}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <CalendarIcon size={16} />
                Start Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    disabled={loading}
                    className={cn(
                      'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-left flex items-center justify-between',
                      !formData.start_date && 'text-gray-500',
                    )}
                  >
                    {formData.start_date
                      ? format(new Date(formData.start_date), 'MMM d, yyyy')
                      : 'Pick a date'}
                    <CalendarIcon size={16} className="opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-900 border-white/10" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={date =>
                      date && setFormData({ ...formData, start_date: format(date, 'yyyy-MM-dd') })
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <CalendarIcon size={16} />
                End Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    disabled={loading}
                    className={cn(
                      'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-left flex items-center justify-between',
                      !formData.end_date && 'text-gray-500',
                    )}
                  >
                    {formData.end_date
                      ? format(new Date(formData.end_date), 'MMM d, yyyy')
                      : 'Pick a date'}
                    <CalendarIcon size={16} className="opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-900 border-white/10" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date ? new Date(formData.end_date) : undefined}
                    onSelect={date =>
                      date && setFormData({ ...formData, end_date: format(date, 'yyyy-MM-dd') })
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-sm text-blue-300">
              {user
                ? 'ℹ️ All trip members can see these changes immediately'
                : 'ℹ️ Changes save instantly in demo mode and sync when you log in'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
