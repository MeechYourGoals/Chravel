
import React, { useState } from 'react';
import { Settings, Sparkles, Crown } from 'lucide-react';
import { TripPreferences as TripPreferencesType, DIETARY_OPTIONS, VIBE_OPTIONS, ACCESSIBILITY_OPTIONS, BUSINESS_OPTIONS, ENTERTAINMENT_OPTIONS, LIFESTYLE_OPTIONS } from '../types/consumer';
import { Input } from './ui/input';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';
import { useTripVariant } from '../contexts/TripVariantContext';
import { useDemoMode } from '../hooks/useDemoMode';

interface TripPreferencesProps {
  tripId: string;
  onPreferencesChange: (preferences: TripPreferencesType) => void;
  initialPreferences?: Partial<TripPreferencesType>;
}

export const TripPreferences = ({ tripId, onPreferencesChange, initialPreferences }: TripPreferencesProps) => {
  const { isPlus } = useConsumerSubscription();
  const { isDemoMode } = useDemoMode();
  const { accentColors } = useTripVariant();
  const [preferences, setPreferences] = useState<TripPreferencesType>({
    dietary: initialPreferences?.dietary || [],
    vibe: initialPreferences?.vibe || [],
    accessibility: initialPreferences?.accessibility || [],
    business: initialPreferences?.business || [],
    entertainment: initialPreferences?.entertainment || [],
    lifestyle: initialPreferences?.lifestyle || [],
    budgetMin: initialPreferences?.budgetMin || 0,
    budgetMax: initialPreferences?.budgetMax || 1000,
    timePreference: initialPreferences?.timePreference || 'flexible'
  });

  // Update local state when initialPreferences change
  React.useEffect(() => {
    if (initialPreferences) {
      setPreferences({
        dietary: initialPreferences.dietary || [],
        vibe: initialPreferences.vibe || [],
        accessibility: initialPreferences.accessibility || [],
        business: initialPreferences.business || [],
        entertainment: initialPreferences.entertainment || [],
        lifestyle: initialPreferences.lifestyle || [],
        budgetMin: initialPreferences.budgetMin || 0,
        budgetMax: initialPreferences.budgetMax || 1000,
        timePreference: initialPreferences.timePreference || 'flexible'
      });
    }
  }, [initialPreferences]);

  const handleDietaryChange = (option: string) => {
    const newDietary = preferences.dietary.includes(option)
      ? preferences.dietary.filter(item => item !== option)
      : [...preferences.dietary, option];
    
    const newPreferences = { ...preferences, dietary: newDietary };
    setPreferences(newPreferences);
    onPreferencesChange(newPreferences);
  };

  const handleVibeChange = (option: string) => {
    const newVibe = preferences.vibe.includes(option)
      ? preferences.vibe.filter(item => item !== option)
      : [...preferences.vibe, option];
    
    const newPreferences = { ...preferences, vibe: newVibe };
    setPreferences(newPreferences);
    onPreferencesChange(newPreferences);
  };

  const handleCategoryChange = (category: keyof TripPreferencesType, option: string) => {
    if (typeof preferences[category] === 'object' && Array.isArray(preferences[category])) {
      const currentArray = preferences[category] as string[];
      const newArray = currentArray.includes(option)
        ? currentArray.filter(item => item !== option)
        : [...currentArray, option];
      
      const newPreferences = { ...preferences, [category]: newArray };
      setPreferences(newPreferences);
      onPreferencesChange(newPreferences);
    }
  };

  const handleBudgetChange = (field: 'budgetMin' | 'budgetMax', value: string) => {
    const numValue = parseInt(value) || 0;
    const newPreferences = { ...preferences, [field]: numValue };
    setPreferences(newPreferences);
    onPreferencesChange(newPreferences);
  };

  const handleTimeChange = (timePreference: 'early-riser' | 'night-owl' | 'flexible') => {
    const newPreferences = { ...preferences, timePreference };
    setPreferences(newPreferences);
    onPreferencesChange(newPreferences);
  };

  if (!isPlus && !isDemoMode) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 relative">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
          <div className="text-center">
            <Crown size={48} className={`text-${accentColors.primary} mx-auto mb-4`} />
            <h3 className="text-xl font-bold text-white mb-2">Plus Exclusive</h3>
            <p className="text-gray-300 mb-4">Set group preferences to get personalized AI recommendations</p>
            <button className={`bg-gradient-to-r ${accentColors.gradient} text-white px-6 py-3 rounded-xl font-medium hover:scale-105 transition-transform`}>
              Upgrade to Plus
            </button>
          </div>
        </div>
        
        <div className="opacity-30">
          <div className="flex items-center gap-3 mb-6">
            <Settings size={24} className={`text-${accentColors.primary}`} />
            <h3 className="text-lg font-semibold text-white">Trip Preferences</h3>
          </div>
          <div className="space-y-6">
            <div>
              <h4 className="text-white font-medium mb-3">Dietary Preferences</h4>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.slice(0, 6).map((option) => (
                  <span key={option} className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                    {option}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className={`bg-gradient-to-r from-${accentColors.primary}/30 to-${accentColors.secondary}/30 p-2 rounded-xl`}>
          <Sparkles size={20} className={`text-${accentColors.primary}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Trip Preferences</h3>
          <p className="text-gray-400 text-sm">Help our AI make better recommendations</p>
        </div>
        <div className="ml-auto">
          <div className={`bg-gradient-to-r from-${accentColors.primary}/20 to-${accentColors.secondary}/20 px-3 py-1 rounded-full`}>
            <span className={`text-${accentColors.primary} text-sm font-medium`}>
              {isDemoMode ? 'DEMO MODE' : 'PLUS'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Dietary Preferences */}
        <div>
          <h4 className="text-white font-medium mb-3">Dietary Preferences</h4>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => handleDietaryChange(option)}
                className={`px-3 py-2 rounded-full text-sm transition-colors ${
                  preferences.dietary.includes(option)
                    ? `bg-${accentColors.primary} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Vibe & Activities */}
        <div>
          <h4 className="text-white font-medium mb-3">Vibe & Activities</h4>
          <div className="flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => handleVibeChange(option)}
                className={`px-3 py-2 rounded-full text-sm transition-colors ${
                  preferences.vibe.includes(option)
                    ? `bg-${accentColors.primary} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility Preferences */}
        <div>
          <h4 className="text-white font-medium mb-3">Accessibility & Inclusivity</h4>
          <div className="flex flex-wrap gap-2">
            {ACCESSIBILITY_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => handleCategoryChange('accessibility', option)}
                className={`px-3 py-2 rounded-full text-sm transition-colors ${
                  preferences.accessibility.includes(option)
                    ? `bg-${accentColors.primary} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Business Preferences */}
        <div>
          <h4 className="text-white font-medium mb-3">Business & Professional</h4>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => handleCategoryChange('business', option)}
                className={`px-3 py-2 rounded-full text-sm transition-colors ${
                  preferences.business.includes(option)
                    ? `bg-${accentColors.primary} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Entertainment Preferences */}
        <div>
          <h4 className="text-white font-medium mb-3">Entertainment & Culture</h4>
          <div className="flex flex-wrap gap-2">
            {ENTERTAINMENT_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => handleCategoryChange('entertainment', option)}
                className={`px-3 py-2 rounded-full text-sm transition-colors ${
                  preferences.entertainment.includes(option)
                    ? `bg-${accentColors.primary} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Lifestyle Preferences */}
        <div>
          <h4 className="text-white font-medium mb-3">Lifestyle & Timing</h4>
          <div className="flex flex-wrap gap-2">
            {LIFESTYLE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => handleCategoryChange('lifestyle', option)}
                className={`px-3 py-2 rounded-full text-sm transition-colors ${
                  preferences.lifestyle.includes(option)
                    ? `bg-${accentColors.primary} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Range */}
        <div>
          <h4 className="text-white font-medium mb-3">Budget Range (USD)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Minimum</label>
              <Input
                type="number"
                placeholder="0"
                value={preferences.budgetMin}
                onChange={(e) => handleBudgetChange('budgetMin', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Maximum</label>
              <Input
                type="number"
                placeholder="1000"
                value={preferences.budgetMax}
                onChange={(e) => handleBudgetChange('budgetMax', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Time Preference */}
        <div>
          <h4 className="text-white font-medium mb-3">Time Preference</h4>
          <div className="flex gap-2">
            {['early-riser', 'night-owl', 'flexible'].map((option) => (
              <button
                key={option}
                onClick={() => handleTimeChange(option as any)}
                className={`px-4 py-2 rounded-xl text-sm transition-colors capitalize ${
                  preferences.timePreference === option
                    ? `bg-${accentColors.primary} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
