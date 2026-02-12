import { useState, useCallback } from 'react';
import { PrivacyMode, getDefaultPrivacyMode } from '../types/privacy';

export interface TripFormData {
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CreateTripData {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  trip_type: 'consumer' | 'pro' | 'event';
  privacy_mode: PrivacyMode;
  ai_access_enabled: boolean;
}

export const useTripForm = () => {
  const [tripType, setTripType] = useState<'consumer' | 'pro' | 'event'>('consumer');
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(() => getDefaultPrivacyMode('consumer'));
  const [formData, setFormData] = useState<TripFormData>({
    title: '',
    location: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  const handleTripTypeChange = useCallback((newTripType: 'consumer' | 'pro' | 'event') => {
    setTripType(newTripType);
    setPrivacyMode(getDefaultPrivacyMode(newTripType));
  }, []);

  const updateField = useCallback(<K extends keyof TripFormData>(
    field: K,
    value: TripFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const validateTrip = useCallback((): { isValid: boolean; error?: string } => {
    if (!formData.title.trim()) {
      return { isValid: false, error: 'Trip title is required' };
    }

    if (!formData.location.trim()) {
      return { isValid: false, error: 'Location is required' };
    }

    if (!formData.startDate) {
      return { isValid: false, error: 'Start date is required' };
    }

    if (!formData.endDate) {
      return { isValid: false, error: 'End date is required' };
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (end < start) {
      return { isValid: false, error: 'End date must be after start date' };
    }

    return { isValid: true };
  }, [formData]);

  const getTripData = useCallback((): CreateTripData | null => {
    const validation = validateTrip();
    if (!validation.isValid) {
      return null;
    }

    const tripId = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: tripId,
      name: formData.title,
      description: formData.description || undefined,
      start_date: formData.startDate || undefined,
      end_date: formData.endDate || undefined,
      destination: formData.location || undefined,
      trip_type: tripType,
      privacy_mode: privacyMode,
      ai_access_enabled: true
    };
  }, [formData, tripType, privacyMode, validateTrip]);

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    });
    setTripType('consumer');
    setPrivacyMode(getDefaultPrivacyMode('consumer'));
  }, []);

  return {
    // State
    tripType,
    privacyMode,
    formData,
    
    // Computed
    isValid: validateTrip().isValid,
    
    // Actions
    setTripType: handleTripTypeChange,
    setPrivacyMode,
    updateField,
    validateTrip,
    getTripData,
    resetForm
  };
};
