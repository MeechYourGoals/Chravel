import React, { useState } from 'react';
import { Calendar, MapPin, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { EventSetupData } from '@/types';

interface SimpleEventSetupSectionProps {
  eventData?: EventSetupData;
  onEventDataChange?: (data: EventSetupData) => void;
}

export const SimpleEventSetupSection = ({
  eventData = {},
  onEventDataChange,
}: SimpleEventSetupSectionProps) => {
  const [formData, setFormData] = useState({
    name: eventData.name || '',
    description: eventData.description || '',
    startDate: eventData.startDate || '',
    endDate: eventData.endDate || '',
    location: eventData.location || '',
  });

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onEventDataChange?.(newData as EventSetupData);
  };

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar size={24} className="text-glass-orange" />
          Event Setup
        </h3>
        <p className="text-gray-300 mt-2">Create your event with just the essentials</p>
      </div>

      {/* Basic Event Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <h4 className="text-base font-semibold text-white mb-2">Basic Information</h4>

        <div className="space-y-2">
          <div>
            <Label htmlFor="eventName" className="text-white">
              Event Name
            </Label>
            <Input
              id="eventName"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="Enter your event name"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="Briefly describe your event"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startDate" className="text-white">
                Start Date & Time
              </Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={e => handleInputChange('startDate', e.target.value)}
                className="bg-gray-800/50 border-gray-600 text-white mt-2"
              />
            </div>

            <div>
              <Label htmlFor="endDate" className="text-white">
                End Date & Time
              </Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={e => handleInputChange('endDate', e.target.value)}
                className="bg-gray-800/50 border-gray-600 text-white mt-2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location" className="text-white flex items-center gap-2">
              <MapPin size={16} />
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={e => handleInputChange('location', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="Where is your event taking place?"
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <h4 className="text-base font-semibold text-white mb-2">Event Logo (Optional)</h4>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
          <Upload size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400 mb-2">Upload your event logo</p>
          <Button
            variant="outline"
            className="border-glass-orange text-glass-orange hover:bg-glass-orange/10"
          >
            Choose File
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-glass-orange hover:bg-glass-orange/80">Save Event Setup</Button>
      </div>
    </div>
  );
};
