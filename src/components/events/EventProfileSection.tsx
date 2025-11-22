import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';

export const EventProfileSection = () => {
  const [organizerInfo, setOrganizerInfo] = useState({
    organizationName: '',
    organizerName: '',
    organizerTitle: '',
    contactEmail: '',
    contactPhone: ''
  });

  const [displaySettings, setDisplaySettings] = useState({
    showOrganizerInfo: true,
    showContactEmail: false
  });

  const handleInputChange = (field: string, value: string) => {
    setOrganizerInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleToggle = (key: keyof typeof displaySettings) => {
    setDisplaySettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <User size={24} className="text-glass-orange" />
          Event Organizer Profile
        </h3>
        <p className="text-gray-300 mt-2">Manage information about your event organizer</p>
      </div>

      {/* Organizer Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <h4 className="text-base font-semibold text-white mb-2">Event Organizer Information</h4>
        
        <div className="space-y-2">
          <div>
            <Label htmlFor="organizationName" className="text-white">Organization/Company Name</Label>
            <Input
              id="organizationName"
              value={organizerInfo.organizationName}
              onChange={(e) => handleInputChange('organizationName', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="e.g., Acme Events Inc."
            />
          </div>

          <div>
            <Label htmlFor="organizerName" className="text-white">Organizer Name</Label>
            <Input
              id="organizerName"
              value={organizerInfo.organizerName}
              onChange={(e) => handleInputChange('organizerName', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <Label htmlFor="organizerTitle" className="text-white">Organizer Title/Role</Label>
            <Input
              id="organizerTitle"
              value={organizerInfo.organizerTitle}
              onChange={(e) => handleInputChange('organizerTitle', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="e.g., Event Coordinator"
            />
          </div>

          <div>
            <Label htmlFor="contactEmail" className="text-white">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={organizerInfo.contactEmail}
              onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="e.g., events@company.com"
            />
          </div>

          <div>
            <Label htmlFor="contactPhone" className="text-white">Contact Phone (Optional)</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={organizerInfo.contactPhone}
              onChange={(e) => handleInputChange('contactPhone', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="e.g., (555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <h4 className="text-base font-semibold text-white mb-2">Event Host Display</h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <div>
              <Label className="text-white text-sm font-medium">Show organizer info to attendees</Label>
              <p className="text-gray-400 text-xs mt-0.5">Display organizer details on the event page</p>
            </div>
            <Switch
              checked={displaySettings.showOrganizerInfo}
              onCheckedChange={() => handleToggle('showOrganizerInfo')}
              className="data-[state=checked]:bg-glass-orange"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-white text-sm font-medium">Show contact email publicly</Label>
              <p className="text-gray-400 text-xs mt-0.5">Make contact email visible to all attendees</p>
            </div>
            <Switch
              checked={displaySettings.showContactEmail}
              onCheckedChange={() => handleToggle('showContactEmail')}
              className="data-[state=checked]:bg-glass-orange"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-glass-orange hover:bg-glass-orange/80">
          Save Organizer Profile
        </Button>
      </div>
    </div>
  );
};
