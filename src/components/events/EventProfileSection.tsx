import React, { useState } from 'react';
import { User, Building } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';

export const EventProfileSection = () => {
  const [organizerInfo, setOrganizerInfo] = useState({
    organizerName: '',
    organizerTitle: '',
    contactEmail: '',
    contactPhone: '',
  });

  const [displaySettings, setDisplaySettings] = useState({
    showOrganizerInfo: true,
    showContactEmail: false,
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
          <User size={24} className="text-yellow-500" />
          Event Organizer Profile
        </h3>
        <p className="text-gray-300 mt-2">Manage information about your event organizer</p>
      </div>

      {/* Organizer Display Name Info */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building size={18} className="text-yellow-500" />
          <h4 className="text-base font-semibold text-white">Organizer Display Name</h4>
        </div>
        <p className="text-sm text-gray-300">
          The organizer name shown on each event card is set per-event. You can:
        </p>
        <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
          <li>Set it when creating a new event in the Create Trip modal</li>
          <li>Edit it anytime by clicking "Edit" on an event's details page</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Examples: "Los Angeles Rams", "Boys & Girls Club of Dallas", "Acme Events Inc."
        </p>
      </div>

      {/* Organizer Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <h4 className="text-base font-semibold text-white mb-2">Event Organizer Contact Details</h4>

        <div className="space-y-2">
          <div>
            <Label htmlFor="organizerName" className="text-white">
              Organizer Name
            </Label>
            <Input
              id="organizerName"
              value={organizerInfo.organizerName}
              onChange={e => handleInputChange('organizerName', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <Label htmlFor="organizerTitle" className="text-white">
              Organizer Title/Role
            </Label>
            <Input
              id="organizerTitle"
              value={organizerInfo.organizerTitle}
              onChange={e => handleInputChange('organizerTitle', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="e.g., Event Coordinator"
            />
          </div>

          <div>
            <Label htmlFor="contactEmail" className="text-white">
              Contact Email
            </Label>
            <Input
              id="contactEmail"
              type="email"
              value={organizerInfo.contactEmail}
              onChange={e => handleInputChange('contactEmail', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="e.g., events@company.com"
            />
          </div>

          <div>
            <Label htmlFor="contactPhone" className="text-white">
              Contact Phone (Optional)
            </Label>
            <Input
              id="contactPhone"
              type="tel"
              value={organizerInfo.contactPhone}
              onChange={e => handleInputChange('contactPhone', e.target.value)}
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
              <Label className="text-white text-sm font-medium">
                Show organizer info to attendees
              </Label>
              <p className="text-gray-400 text-xs mt-0.5">
                Display organizer details on the event page
              </p>
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
              <p className="text-gray-400 text-xs mt-0.5">
                Make contact email visible to all attendees
              </p>
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
        <Button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold shadow-lg hover:shadow-yellow-500/25 transition-all duration-300">
          Save Organizer Profile
        </Button>
      </div>
    </div>
  );
};
