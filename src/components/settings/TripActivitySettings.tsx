import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChatActivitySettings } from '@/components/settings/ChatActivitySettings';
import { useTripSystemMessagePreferences, useGlobalSystemMessagePreferences } from '@/hooks/useSystemMessagePreferences';
import { SystemMessageCategoryPrefs } from '@/utils/systemMessageCategory';
import { RotateCcw } from 'lucide-react';

interface TripActivitySettingsProps {
  tripId: string;
}

export const TripActivitySettings: React.FC<TripActivitySettingsProps> = ({ tripId }) => {
  const { 
    hasOverride, 
    preferences, 
    updatePreferences, 
    resetToGlobal, 
    isUpdating,
    isResetting 
  } = useTripSystemMessagePreferences(tripId);
  
  const { preferences: globalPrefs } = useGlobalSystemMessagePreferences();
  
  const handleModeChange = (value: string) => {
    if (value === 'global') {
      resetToGlobal();
    } else {
      // Create trip-specific override with current global values
      updatePreferences({
        showSystemMessages: globalPrefs.showSystemMessages,
        categories: globalPrefs.categories
      });
    }
  };
  
  const handleShowSystemMessagesChange = (value: boolean) => {
    updatePreferences({ showSystemMessages: value, categories: preferences.categories });
  };
  
  const handleCategoryChange = (category: keyof SystemMessageCategoryPrefs, value: boolean) => {
    updatePreferences({
      showSystemMessages: preferences.showSystemMessages,
      categories: { ...preferences.categories, [category]: value }
    });
  };
  
  return (
    <div className="space-y-4">
      <h4 className="text-base font-semibold text-white">Activity in This Trip</h4>
      
      <RadioGroup 
        value={hasOverride ? 'custom' : 'global'} 
        onValueChange={handleModeChange}
        className="space-y-2"
      >
        <div className="flex items-center space-x-3">
          <RadioGroupItem value="global" id="mode-global" />
          <Label htmlFor="mode-global" className="text-gray-300 cursor-pointer">
            Use my global settings
          </Label>
        </div>
        <div className="flex items-center space-x-3">
          <RadioGroupItem value="custom" id="mode-custom" />
          <Label htmlFor="mode-custom" className="text-gray-300 cursor-pointer">
            Customize for this trip
          </Label>
        </div>
      </RadioGroup>
      
      {hasOverride && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <ChatActivitySettings
            showSystemMessages={preferences.showSystemMessages}
            categories={preferences.categories}
            onShowSystemMessagesChange={handleShowSystemMessagesChange}
            onCategoryChange={handleCategoryChange}
            disabled={isUpdating}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetToGlobal()}
            disabled={isResetting}
            className="mt-4 text-gray-400 border-gray-600 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to default
          </Button>
        </div>
      )}
    </div>
  );
};
