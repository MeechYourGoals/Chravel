import React, { useEffect, useState } from 'react';
import { Sparkles, Crown, Settings } from 'lucide-react';
import { TripPreferences } from '../TripPreferences';
import { TripPreferences as TripPreferencesType } from '../../types/consumer';
import { useConsumerSubscription } from '../../hooks/useConsumerSubscription';
import { useAuth } from '../../hooks/useAuth';
import { userPreferencesService } from '../../services/userPreferencesService';
import { toast } from 'sonner';
import { useDemoMode } from '../../hooks/useDemoMode';

export const ConsumerAIConciergeSection = () => {
  const { isPlus, upgradeToPlus } = useConsumerSubscription();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [preferences, setPreferences] = useState<TripPreferencesType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      // Set mock preferences for demo mode
      setPreferences({
        dietary: ['Vegan', 'Gluten-Free'],
        vibe: ['Adventure', 'Cultural'],
        accessibility: ['Wheelchair Access', 'EV Charging'],
        business: [],
        entertainment: ['Live Music'],
        lifestyle: ['Eco-Friendly'],
        budgetMin: 50,
        budgetMax: 200,
        budgetUnit: 'experience',
        timePreference: 'early-riser',
      });
      setIsLoading(false);
    } else if (user) {
      // AI Concierge is FREE - load preferences for all users
      loadPreferences();
    } else {
      setIsLoading(false);
    }
  }, [user, isDemoMode]);

  const loadPreferences = async () => {
    if (!user) return;
    try {
      const prefs = await userPreferencesService.getAIPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading AI preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesChange = async (newPrefs: TripPreferencesType) => {
    setPreferences(newPrefs);

    if (isDemoMode) {
      toast.success('Demo: Preferences preview updated');
      return;
    }

    if (!user) return;

    try {
      const success = await userPreferencesService.setAIPreferences(user.id, newPrefs);
      if (success) {
        toast.success('AI preferences saved');
      } else {
        toast.error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving AI preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  // AI Concierge is now FREE for all users - removed paywall

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={24} className="text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Concierge Settings</h2>
          </div>
          <p className="text-gray-400">
            Configure your preferences once - AI uses them across all trips for personalized
            recommendations
          </p>
        </div>
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-2 rounded-full">
          <span className="text-green-400 font-semibold text-sm">
            {isDemoMode ? 'DEMO MODE' : 'FREE'}
          </span>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Settings size={20} />
          How Concierge Works
        </h3>
        <ul className="space-y-1.5 text-gray-300 text-sm">
          <li>✨ Set your preferences below (dietary, vibe, budget, accessibility)</li>
          <li>🤖 AI remembers them across ALL your trips</li>
          <li>🎯 Get personalized suggestions filtered to YOUR needs</li>
          <li>⚡ No need to repeat preferences for each trip</li>
        </ul>
      </div>

      {/* Preferences Component */}
      <TripPreferences
        tripId="global-user-preferences"
        onPreferencesChange={handlePreferencesChange}
        initialPreferences={preferences || undefined}
      />

      {/* Active Filters Summary */}
      {preferences && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Active AI Filters</h3>
          <p className="text-gray-400 text-sm mb-3">
            When you ask AI for recommendations, these filters are automatically applied:
          </p>
          <div className="flex flex-wrap gap-2">
            {preferences.dietary.map(item => (
              <span
                key={item}
                className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm"
              >
                {item}
              </span>
            ))}
            {preferences.vibe.map(item => (
              <span
                key={item}
                className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm"
              >
                {item}
              </span>
            ))}
            {preferences.accessibility.map(item => (
              <span
                key={item}
                className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm"
              >
                {item}
              </span>
            ))}
            {(() => {
              const unit = preferences.budgetUnit || 'experience';
              const unitLabel =
                unit === 'experience'
                  ? 'per experience'
                  : unit === 'day'
                    ? 'per day'
                    : unit === 'person'
                      ? 'per person'
                      : 'per trip';
              const hasMin = preferences.budgetMin > 0;
              const hasMax = preferences.budgetMax > 0;
              if (hasMin && hasMax) {
                return (
                  <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
                    Budget: ${preferences.budgetMin}–${preferences.budgetMax} {unitLabel}
                  </span>
                );
              } else if (hasMax) {
                return (
                  <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
                    Budget: up to ${preferences.budgetMax} {unitLabel}
                  </span>
                );
              } else if (hasMin) {
                return (
                  <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
                    Budget: from ${preferences.budgetMin} {unitLabel}
                  </span>
                );
              }
              return null;
            })()}
            {preferences.timePreference !== 'flexible' && (
              <span className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full text-sm capitalize">
                {preferences.timePreference.replace('-', ' ')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
