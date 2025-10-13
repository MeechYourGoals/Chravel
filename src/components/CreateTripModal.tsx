
import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Building, PartyPopper, ChevronDown, Settings } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { DEFAULT_FEATURES } from '../hooks/useFeatureToggle';
import { useTrips } from '../hooks/useTrips';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PrivacyModeSelector } from './PrivacyModeSelector';
import { PrivacyMode, getDefaultPrivacyMode } from '../types/privacy';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTripModal = ({ isOpen, onClose }: CreateTripModalProps) => {
  const [tripType, setTripType] = useState<'consumer' | 'pro' | 'event'>('consumer');
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(() => getDefaultPrivacyMode('consumer'));
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { createTrip } = useTrips();
  const { organizations, fetchUserOrganizations } = useOrganization();
  const [enableAllFeatures, setEnableAllFeatures] = useState(true);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>(
    DEFAULT_FEATURES.reduce((acc, feature) => ({ ...acc, [feature]: true }), {})
  );

  useEffect(() => {
    if (isOpen) {
      fetchUserOrganizations();
    }
  }, [isOpen]);

  // Update privacy mode when trip type changes
  const handleTripTypeChange = (newTripType: 'consumer' | 'pro' | 'event') => {
    setTripType(newTripType);
    setPrivacyMode(getDefaultPrivacyMode(newTripType));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const tripData = {
        name: formData.title,
        description: formData.description || undefined,
        start_date: formData.startDate || undefined,
        end_date: formData.endDate || undefined,
        destination: formData.location || undefined,
        trip_type: tripType,
        privacy_mode: privacyMode,
        ai_access_enabled: privacyMode === 'standard'
      };
      
      const newTrip = await createTrip(tripData);
      
      if (newTrip) {
        // Link to organization if selected
        if (selectedOrganization && (tripType === 'pro' || tripType === 'event')) {
          try {
            const { error: linkError } = await supabase.functions.invoke('link-trip-to-organization', {
              body: {
                tripId: newTrip.id,
                organizationId: selectedOrganization
              }
            });
            
            if (linkError) {
              console.error('Error linking trip to organization:', linkError);
              toast.error('Trip created but failed to link to organization');
            }
          } catch (linkErr) {
            console.error('Error linking trip:', linkErr);
          }
        }
        
        toast.success('Trip created successfully!');
        onClose();
        // Reset form
        setFormData({
          title: '',
          location: '',
          startDate: '',
          endDate: '',
          description: ''
        });
        setTripType('consumer');
        setPrivacyMode(getDefaultPrivacyMode('consumer'));
        setSelectedOrganization('');
      } else {
        toast.error('Failed to create trip. Please try again.');
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        toast.error('Please sign in to create a trip');
      } else {
        toast.error('Failed to create trip. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setSelectedFeatures(prev => ({ ...prev, [feature]: enabled }));
  };

  const featureLabels: Record<string, string> = {
    chat: 'Group Chat',
    broadcasts: 'Broadcasts',
    links: 'Links & Ideas',
    polls: 'Polls & Voting',
    tasks: 'Tasks',
    calendar: 'Calendar',
    media: 'Media',
    photos: 'Photo Sharing',
    files: 'File Sharing',
    concierge: 'AI Concierge',
    search: 'Search'
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create New Trip</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Trip Type Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Trip Type
          </label>
          <ToggleGroup
            type="single"
            value={tripType}
            onValueChange={(value) => value && handleTripTypeChange(value as 'consumer' | 'pro' | 'event')}
            className="grid grid-cols-3 gap-2 bg-slate-700/30 p-1 rounded-xl"
          >
            <ToggleGroupItem
              value="consumer"
              className="flex items-center gap-2 data-[state=on]:bg-blue-600 data-[state=on]:text-white text-slate-300 hover:text-white"
            >
              <Users size={16} />
              Consumer
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trip Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Trip Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="e.g., Summer in Paris"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="e.g., Paris, France"
              required
            />
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
                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Description */}
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

          {/* Privacy Settings */}
          <div>
            <PrivacyModeSelector
              tripType={tripType}
              selectedMode={privacyMode}
              onModeChange={setPrivacyMode}
              showOverrideOption={true}
            />
          </div>

          {/* Organization Selector - Only for Pro/Event trips */}
          {(tripType === 'pro' || tripType === 'event') && organizations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Link to Organization (Optional)
              </label>
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">No organization</option>
                {organizations.map((org) => (
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

          {/* Advanced Feature Settings - Only for Pro/Event trips */}
          {tripType !== 'consumer' && (
            <Collapsible className="space-y-3">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                <div className="flex items-center gap-2 text-slate-300">
                  <Settings size={16} />
                  <span className="text-sm font-medium">Advanced • Feature Set</span>
                </div>
                <ChevronDown size={16} className="text-slate-400 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 bg-slate-700/20 rounded-xl p-4">
                {/* Enable All Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    Enable all features
                  </label>
                  <Switch
                    checked={enableAllFeatures}
                    onCheckedChange={setEnableAllFeatures}
                  />
                </div>

                {/* Individual Feature Checkboxes */}
                <div className={`space-y-3 ${enableAllFeatures ? 'pointer-events-none opacity-50' : ''}`}>
                  <p className="text-xs text-slate-400 mb-3">
                    Select which features participants can access:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {DEFAULT_FEATURES.map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature}
                          checked={selectedFeatures[feature]}
                          onCheckedChange={(checked) => 
                            handleFeatureToggle(feature, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={feature}
                          className="text-sm text-slate-300 cursor-pointer"
                        >
                          {featureLabels[feature]}
                        </label>
                      </div>
                    ))}
                  </div>
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
