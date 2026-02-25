import React, { useState } from 'react';
import { Calendar, Users, Settings, ArrowRight, Upload, Download, Share2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { EventSetupData } from '@/types';

interface EventSetupSectionProps {
  eventData?: EventSetupData;
  onEventDataChange?: (data: EventSetupData) => void;
}

export const EventSetupSection = ({
  eventData = {},
  onEventDataChange,
}: EventSetupSectionProps) => {
  const [formData, setFormData] = useState({
    name: eventData.name || '',
    description: eventData.description || '',
    startDate: eventData.startDate || '',
    endDate: eventData.endDate || '',
    location: eventData.location || '',
    capacity: eventData.capacity || '',
    industry: eventData.industry || '',
    timezone: eventData.timezone || 'UTC',
    registrationDeadline: eventData.registrationDeadline || '',
    eventType: eventData.eventType || 'conference',
  });

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    if (onEventDataChange) {
      const eventUpdate: EventSetupData = {
        ...newData,
        capacity: newData.capacity ? parseInt(newData.capacity as string) : undefined,
      };
      onEventDataChange(eventUpdate);
    }
  };

  const industries = [
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'nonprofit', label: 'Non-Profit' },
    { value: 'government', label: 'Government' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'other', label: 'Other' },
  ];

  const eventTypes = [
    { value: 'conference', label: 'Conference' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'networking', label: 'Networking Event' },
    { value: 'trade-show', label: 'Trade Show' },
    { value: 'webinar', label: 'Webinar' },
    { value: 'meetup', label: 'Meetup' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <Calendar size={24} className="text-glass-orange" />
        Event Setup
      </h3>

      {/* Basic Event Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Basic Information</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="eventName" className="text-white">
              Event Name
            </Label>
            <Input
              id="eventName"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="Enter event name"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description" className="text-white">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="Describe your event"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="eventType" className="text-white">
              Event Type
            </Label>
            <Select
              value={formData.eventType}
              onValueChange={value => handleInputChange('eventType', value)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white mt-2">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="industry" className="text-white">
              Industry
            </Label>
            <Select
              value={formData.industry}
              onValueChange={value => handleInputChange('industry', value)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white mt-2">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map(industry => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Date and Location */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Date & Location</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="startDate" className="text-white">
              Start Date
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
              End Date
            </Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={formData.endDate}
              onChange={e => handleInputChange('endDate', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
            />
          </div>

          <div>
            <Label htmlFor="timezone" className="text-white">
              Timezone
            </Label>
            <Select
              value={formData.timezone}
              onValueChange={value => handleInputChange('timezone', value)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white mt-2">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="EST">EST</SelectItem>
                <SelectItem value="PST">PST</SelectItem>
                <SelectItem value="GMT">GMT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location" className="text-white">
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={e => handleInputChange('location', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="Event venue or location"
            />
          </div>
        </div>
      </div>

      {/* Capacity and Registration */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Capacity & Registration</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="capacity" className="text-white">
              Expected Capacity
            </Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={e => handleInputChange('capacity', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="Number of expected attendees"
            />
          </div>

          <div>
            <Label htmlFor="registrationDeadline" className="text-white">
              Registration Deadline
            </Label>
            <Input
              id="registrationDeadline"
              type="datetime-local"
              value={formData.registrationDeadline}
              onChange={e => handleInputChange('registrationDeadline', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Quick Actions</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="flex items-center gap-2">
            <Upload size={16} />
            Import Schedule
          </Button>

          <Button variant="outline" className="flex items-center gap-2">
            <Download size={16} />
            Export Data
          </Button>

          <Button variant="outline" className="flex items-center gap-2">
            <Share2 size={16} />
            Share Event
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
