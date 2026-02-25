import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import { EventSetupData, EventBasicsFormData } from '@/types';

interface EventBasicsSectionProps {
  eventData?: EventSetupData;
  onEventDataChange?: (data: EventSetupData) => void;
}

export const EventBasicsSection = ({
  eventData = {},
  onEventDataChange,
}: EventBasicsSectionProps) => {
  const [formData, setFormData] = useState({
    name: eventData.name || '',
    description: eventData.description || '',
    startDate: eventData.startDate || '',
    endDate: eventData.endDate || '',
    location: eventData.location || '',
    category: eventData.category || '',
    capacity: eventData.capacity?.toString() || '',
    tags: eventData.tags?.join(', ') || '',
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    // Convert tags back to array and capacity to number, then update parent
    const eventUpdate: EventSetupData = {
      ...updated,
      capacity: updated.capacity ? parseInt(updated.capacity) : undefined,
      tags: updated.tags ? updated.tags.split(',').map(tag => tag.trim()) : [],
    };
    onEventDataChange?.(eventUpdate);
  };

  const saveBasics = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in event name, start date, and end date.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Event basics saved',
      description: 'Your event information has been updated.',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Event Basics</h3>
        <p className="text-gray-300">Set up the fundamental details for your event.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label htmlFor="event-name" className="text-white">
              Event Name *
            </Label>
            <Input
              id="event-name"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-1"
              placeholder="Enter event name"
            />
          </div>
          <div>
            <Label htmlFor="event-category" className="text-white">
              Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={value => handleInputChange('category', value)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="seminar">Seminar</SelectItem>
                <SelectItem value="networking">Networking</SelectItem>
                <SelectItem value="exhibition">Exhibition</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="event-description" className="text-white">
            Description
          </Label>
          <Textarea
            id="event-description"
            value={formData.description}
            onChange={e => handleInputChange('description', e.target.value)}
            className="bg-gray-800/50 border-gray-600 text-white mt-1"
            rows={4}
            placeholder="Describe your event..."
          />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <Label htmlFor="start-date" className="text-white">
              Start Date *
            </Label>
            <Input
              id="start-date"
              type="date"
              value={formData.startDate}
              onChange={e => handleInputChange('startDate', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-1"
            />
          </div>
          <div>
            <Label htmlFor="end-date" className="text-white">
              End Date *
            </Label>
            <Input
              id="end-date"
              type="date"
              value={formData.endDate}
              onChange={e => handleInputChange('endDate', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-1"
            />
          </div>
          <div>
            <Label htmlFor="capacity" className="text-white">
              Expected Capacity
            </Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={e => handleInputChange('capacity', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-1"
              placeholder="Number of attendees"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label htmlFor="location" className="text-white">
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={e => handleInputChange('location', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-1"
              placeholder="Venue or address"
            />
          </div>
          <div>
            <Label htmlFor="tags" className="text-white">
              Tags
            </Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={e => handleInputChange('tags', e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white mt-1"
              placeholder="tech, conference, networking (comma separated)"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveBasics} className="bg-glass-orange hover:bg-glass-orange/80">
            Save Event Basics
          </Button>
        </div>
      </div>
    </div>
  );
};
