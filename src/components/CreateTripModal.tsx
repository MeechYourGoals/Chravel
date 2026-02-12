import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Users,
  Building,
  PartyPopper,
  ChevronDown,
  Settings,
  Upload,
  Globe,
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useTrips } from '../hooks/useTrips';
import { useOrganization } from '../hooks/useOrganization';
import { useAuth } from '../hooks/useAuth';
import { useDemoMode } from '../hooks/useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PrivacyMode, getDefaultPrivacyMode } from '../types/privacy';
import { ProTripCategory } from '../types/proCategories';
import { getAllProTripColors } from '../utils/proTripColors';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTripModal = ({ isOpen, onClose }: CreateTripModalProps) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [tripType, setTripType] = useState<'consumer' | 'pro' | 'event'>('consumer');
  const [proTripCategory, setProTripCategory] = useState<ProTripCategory>(
    'Sports – Pro, Collegiate, Youth',
  );
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(() =>
    getDefaultPrivacyMode('consumer'),
  );
  const [selectedCardColor, setSelectedCardColor] = useState<string>('red'); // Default to first color
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    organizer: '', // Organizer display name for Events
    location: '',
    startDate: '',
    endDate: '',
    description: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Default to user's timezone
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
  }>({});

  const { createTrip, trips } = useTrips();

  // ✅ FIXED: Always call useOrganization hook (Rules of Hooks requirement)
  // The hook handles demo mode internally, returning empty arrays when in demo mode
  const { organizations, fetchUserOrganizations } = useOrganization();

  useEffect(() => {
    if (isOpen) {
      // Fetch organizations (hook handles demo mode internally)
      fetchUserOrganizations();
    } else {
      // Reset form and validation errors when modal closes
      setFormData({
        title: '',
        organizer: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setValidationErrors({});
      setTripType('consumer');
      setPrivacyMode(getDefaultPrivacyMode('consumer'));
      setSelectedOrganization('');
    }
  }, [isOpen, fetchUserOrganizations]);

  // Update privacy mode when trip type changes
  const handleTripTypeChange = (newTripType: 'consumer' | 'pro' | 'event') => {
    setTripType(newTripType);
    setPrivacyMode(getDefaultPrivacyMode(newTripType));
  };

  // Validation functions
  const validateDateRange = (startDate: string, endDate: string): string | undefined => {
    if (!startDate || !endDate) return undefined;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return 'End date must be after start date';
    }

    return undefined;
  };

  const validateDuplicateName = (title: string): string | undefined => {
    if (!title.trim() || !user) return undefined;

    // Check if user already has a trip with the same name (case-insensitive)
    const duplicateTrip = trips.find(
      trip => trip.name.toLowerCase().trim() === title.toLowerCase().trim() && !trip.is_archived,
    );

    if (duplicateTrip) {
      return 'You already have a trip with this name';
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    // Validate date range
    if (formData.startDate && formData.endDate) {
      const dateError = validateDateRange(formData.startDate, formData.endDate);
      if (dateError) {
        errors.endDate = dateError;
      }
    }

    // Validate duplicate name
    if (formData.title.trim()) {
      const nameError = validateDuplicateName(formData.title);
      if (nameError) {
        errors.title = nameError;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImage(file);
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check authentication first
    if (!user) {
      toast.error('Please sign in to create a trip');
      onClose();
      return;
    }

    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsLoading(true);

    try {
      const tripData = {
        name: formData.title,
        description: formData.description || undefined,
        // Convert YYYY-MM-DD to ISO 8601 datetime format for edge function validation
        start_date: formData.startDate ? `${formData.startDate}T00:00:00Z` : undefined,
        end_date: formData.endDate ? `${formData.endDate}T23:59:59Z` : undefined,
        destination: formData.location || undefined,
        trip_type: tripType,
        // ✅ Phase 2: Pass category for Pro trips
        ...(tripType === 'pro' && { category: proTripCategory }),
        // ✅ Pass timezone for Event trips
        ...(tripType === 'event' && { timezone: formData.timezone }),
        // ✅ Pass organizer display name for Event trips
        ...(tripType === 'event' &&
          formData.organizer.trim() && { organizer_display_name: formData.organizer.trim() }),
        // ✅ Pass card color for Pro/Event trips
        ...(tripType !== 'consumer' && { card_color: selectedCardColor }),
        privacy_mode: privacyMode,
        ai_access_enabled: true,
        // All features are enabled by default for all trip types (MVP)
        // The edge function sets the correct feature set based on trip_type
      };

      const newTrip = await createTrip(tripData);

      if (newTrip) {
        // Upload cover image if selected
        if (coverImage && !isDemoMode) {
          try {
            const fileExt = coverImage.name.split('.').pop();
            const filePath = `${newTrip.id}/cover.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('trip-covers')
              .upload(filePath, coverImage);

            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
            } = supabase.storage.from('trip-covers').getPublicUrl(filePath);

            // Update trip with cover image URL
            await supabase
              .from('trips')
              .update({ cover_image_url: publicUrl })
              .eq('id', newTrip.id);
          } catch (uploadError) {
            console.error('Error uploading cover image:', uploadError);
            toast.error('Trip created, but failed to upload cover image');
          }
        }

        // Link to organization if selected (only in authenticated mode, not demo mode)
        if (!isDemoMode && selectedOrganization && (tripType === 'pro' || tripType === 'event')) {
          try {
            const { error: linkError } = await supabase.functions.invoke(
              'link-trip-to-organization',
              {
                body: {
                  tripId: newTrip.id,
                  organizationId: selectedOrganization,
                },
              },
            );

            if (linkError) {
              console.error('Error linking trip to organization:', linkError);
              toast.error('Trip created but failed to link to organization');
            }
          } catch (linkErr) {
            console.error('Error linking trip:', linkErr);
          }
        }
      }

      toast.success('Trip created successfully!');
      onClose();
      // Reset form
      setFormData({
        title: '',
        organizer: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setCoverImage(null);
      setCoverImagePreview(null);
      setValidationErrors({});
      setTripType('consumer');
      setPrivacyMode(getDefaultPrivacyMode('consumer'));
      setSelectedOrganization('');
    } catch (error) {
      console.error('Error creating trip:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create trip. Please try again.';

      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        toast.error('Please sign in to create a trip');
      } else if (error instanceof Error && error.message === 'TRIP_LIMIT_REACHED') {
        toast.error(
          "You've reached the free tier limit of 3 active trips. Archive a trip or upgrade to Explorer for unlimited trips.",
          {
            duration: 6000,
            action: {
              label: 'View Plans',
              onClick: () => {
                window.location.href = '/settings';
              },
            },
          },
        );
      } else if (error instanceof Error && error.message === 'UPGRADE_REQUIRED_PRO_TRIP') {
        toast.error('Upgrade to create more Pro trips!', {
          duration: 6000,
          action: {
            label: 'View Plans',
            onClick: () => {
              window.location.href = '/settings';
            },
          },
        });
      } else if (error instanceof Error && error.message === 'UPGRADE_REQUIRED_EVENT') {
        toast.error('Upgrade to create unlimited Events!', {
          duration: 6000,
          action: {
            label: 'View Plans',
            onClick: () => {
              window.location.href = '/settings';
            },
          },
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear validation errors for this field when user types
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors({
        ...validationErrors,
        [name]: undefined,
      });
    }

    // Real-time validation for date range
    if (name === 'startDate' || name === 'endDate') {
      const startDate = name === 'startDate' ? value : formData.startDate;
      const endDate = name === 'endDate' ? value : formData.endDate;

      if (startDate && endDate) {
        const dateError = validateDateRange(startDate, endDate);
        setValidationErrors(prev => ({
          ...prev,
          endDate: dateError,
        }));
      }
    }

    // Real-time validation for duplicate name
    if (name === 'title' && value.trim()) {
      const nameError = validateDuplicateName(value);
      setValidationErrors(prev => ({
        ...prev,
        title: nameError,
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-6"
          style={{ paddingTop: 'max(0px, calc(env(safe-area-inset-top, 0px) + 4px))' }}
        >
          <h2 className="text-2xl font-bold text-white">Create New Trip</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Trip Type Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">Trip Type</label>
          <ToggleGroup
            type="single"
            value={tripType}
            onValueChange={value =>
              value && handleTripTypeChange(value as 'consumer' | 'pro' | 'event')
            }
            className="grid grid-cols-3 gap-2 bg-slate-700/30 p-1 rounded-xl"
          >
            <ToggleGroupItem
              value="consumer"
              className="flex items-center gap-2 data-[state=on]:bg-blue-600 data-[state=on]:text-white text-slate-300 hover:text-white"
            >
              <Users size={16} />
              Group
            </ToggleGroupItem>
            <ToggleGroupItem
              value="pro"
              className="flex items-center gap-2 data-[state=on]:bg-blue-600 data-[state=on]:text-white text-slate-300 hover:text-white"
            >
              <Building size={16} />
              Pro
            </ToggleGroupItem>
            <ToggleGroupItem
              value="event"
              className="flex items-center gap-2 data-[state=on]:bg-blue-600 data-[state=on]:text-white text-slate-300 hover:text-white"
            >
              <PartyPopper size={16} />
              Event
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Pro Trip Category Selector - Only for Pro trips */}
        {tripType === 'pro' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pro Trip Category
            </label>
            <select
              value={proTripCategory}
              onChange={e => setProTripCategory(e.target.value as ProTripCategory)}
              className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="Sports – Pro, Collegiate, Youth">
                Sports – Pro, Collegiate, Youth
              </option>
              <option value="Tour – Music, Comedy, etc.">Tour – Music, Comedy, etc.</option>
              <option value="Business Travel">Business Travel</option>
              <option value="School Trip">School Trip</option>
              <option value="Content">Content</option>
              <option value="Other">Other</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              This determines available roles and features for your Pro trip.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trip Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Trip Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full bg-slate-700/50 border rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none transition-colors ${
                validationErrors.title
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-slate-600 focus:border-blue-500'
              }`}
              placeholder="e.g., Summer in Paris"
              required
            />
            {validationErrors.title && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.title}</p>
            )}
          </div>

          {/* Organizer - Only for Event trips */}
          {tripType === 'event' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Users size={16} />
                Organizer
              </label>
              <input
                type="text"
                name="organizer"
                value={formData.organizer}
                onChange={handleInputChange}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="e.g., Los Angeles Rams, Boys & Girls Club of Dallas"
              />
              <p className="text-xs text-slate-400 mt-1">
                The organization, company, or group hosting this event
              </p>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Locations
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="e.g., Paris, France"
            />
            <p className="text-xs text-slate-400 mt-1">
              Separate multiple locations with commas (e.g., Paris, Barcelona, Milan)
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                max={formData.endDate || undefined}
                className={`w-full bg-slate-700/50 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${
                  validationErrors.startDate
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-600 focus:border-blue-500'
                }`}
                required
              />
              {validationErrors.startDate && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate || undefined}
                className={`w-full bg-slate-700/50 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${
                  validationErrors.endDate
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-600 focus:border-blue-500'
                }`}
                required
              />
              {validationErrors.endDate && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* Event Time Zone - Only for Event trips */}
          {tripType === 'event' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Globe size={16} />
                Event Time Zone
              </label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={e => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <optgroup label="United States">
                  <option value="America/New_York">Eastern Time (ET) - New York</option>
                  <option value="America/Chicago">Central Time (CT) - Chicago</option>
                  <option value="America/Denver">Mountain Time (MT) - Denver</option>
                  <option value="America/Los_Angeles">Pacific Time (PT) - Los Angeles</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Europe/Berlin">Berlin (CET)</option>
                  <option value="Europe/Madrid">Madrid (CET)</option>
                  <option value="Europe/Rome">Rome (CET)</option>
                  <option value="Europe/Amsterdam">Amsterdam (CET)</option>
                </optgroup>
                <optgroup label="Asia Pacific">
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                  <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="America/Toronto">Toronto (ET)</option>
                  <option value="America/Vancouver">Vancouver (PT)</option>
                  <option value="America/Mexico_City">Mexico City (CT)</option>
                  <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                  <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Seoul">Seoul (KST)</option>
                </optgroup>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Helps attendees from other time zones know when events occur.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors resize-none"
              placeholder="Tell us about your trip..."
            />
          </div>

          {/* Cover Photo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cover Photo</label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-slate-400" />
                    <p className="text-xs text-slate-400">Click to upload cover photo</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </label>
              </div>
              {coverImagePreview && (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-600">
                  <img
                    src={coverImagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage(null);
                      setCoverImagePreview(null);
                    }}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1 hover:bg-black/70 transition-colors"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Organization Selector - Only for Pro/Event trips AND not in demo mode */}
          {!isDemoMode &&
            (tripType === 'pro' || tripType === 'event') &&
            organizations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Link to Organization (Optional)
                </label>
                <select
                  value={selectedOrganization}
                  onChange={e => setSelectedOrganization(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                >
                  <option value="">No organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.display_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-2">
                  Link this trip to an organization to share it with all members
                </p>
              </div>
            )}

          {/* Advanced Settings - Only for Pro/Event trips */}
          {tripType !== 'consumer' && (
            <Collapsible className="space-y-3">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                <div className="flex items-center gap-2 text-slate-300">
                  <Settings size={16} />
                  <span className="text-sm font-medium">Advanced</span>
                </div>
                <ChevronDown
                  size={16}
                  className="text-slate-400 transition-transform duration-200 data-[state=open]:rotate-180"
                />
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 bg-slate-700/20 rounded-xl p-4">
                {/* Trip Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Trip Color Label
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {getAllProTripColors().map(color => (
                      <button
                        key={color.accent}
                        type="button"
                        onClick={() => setSelectedCardColor(color.accent)}
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${color.cardGradient} transition-all duration-200 hover:scale-110 ${
                          selectedCardColor === color.accent
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={color.accent.charAt(0).toUpperCase() + color.accent.slice(1)}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Color-code your {tripType === 'pro' ? 'Pro trips' : 'Events'} for easy
                    organization
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
