import React, { useState } from 'react';
import { Calendar, Users, Settings, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { IndustryTemplates } from './IndustryTemplates';
import { EventSetupData } from '@/types';

interface EventSetupWizardProps {
  onComplete: (eventData: EventSetupData) => void;
  onCancel: () => void;
}

export const EventSetupWizard = ({ onComplete, onCancel }: EventSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    capacity: '',
    industry: '',
    template: null,
    schedule: [],
    invitations: [],
  });

  const steps = [
    { number: 1, title: 'Event Basics', icon: Calendar },
    { number: 2, title: 'Setup & Schedule', icon: Settings },
    { number: 3, title: 'Invitations', icon: Users },
  ];

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const finalData: EventSetupData = {
      name: eventData.name,
      description: eventData.description,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      location: eventData.location,
      capacity: eventData.capacity ? parseInt(eventData.capacity) : undefined,
      industry: eventData.industry,
      template: eventData.template || undefined,
      invitations: eventData.invitations || [],
    };
    onComplete(finalData);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="eventName" className="text-white">
                Event Name
              </Label>
              <Input
                id="eventName"
                value={eventData.name}
                onChange={e => setEventData({ ...eventData, name: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-2"
                placeholder="Enter event name"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white">
                Description
              </Label>
              <Textarea
                id="description"
                value={eventData.description}
                onChange={e => setEventData({ ...eventData, description: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-2"
                placeholder="Describe your event"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-white">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={eventData.startDate}
                  onChange={e => setEventData({ ...eventData, startDate: e.target.value })}
                  className="bg-gray-800/50 border-gray-600 text-white mt-2"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-white">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={eventData.endDate}
                  onChange={e => setEventData({ ...eventData, endDate: e.target.value })}
                  className="bg-gray-800/50 border-gray-600 text-white mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location" className="text-white">
                Location
              </Label>
              <Input
                id="location"
                value={eventData.location}
                onChange={e => setEventData({ ...eventData, location: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-2"
                placeholder="Event venue or location"
              />
            </div>

            <div>
              <Label htmlFor="capacity" className="text-white">
                Expected Capacity
              </Label>
              <Input
                id="capacity"
                type="number"
                value={eventData.capacity}
                onChange={e => setEventData({ ...eventData, capacity: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-2"
                placeholder="Number of expected attendees"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Industry & Template</h4>
              <p className="text-gray-300">Template selection</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Schedule</h4>
              <p className="text-gray-300">Schedule configuration</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Invitations</h4>
              <p className="text-gray-300">Invitation management</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div key={step.number} className="flex items-center">
              <div
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  isActive
                    ? 'bg-glass-orange/20 text-glass-orange'
                    : isCompleted
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/10 text-gray-400'
                }`}
              >
                {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                <span className="font-medium">{step.title}</span>
              </div>
              {index < steps.length - 1 && <ArrowRight size={20} className="text-gray-500 mx-4" />}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-white mb-6">
          {steps.find(s => s.number === currentStep)?.title}
        </h3>
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && (
            <Button variant="ghost" onClick={prevStep} className="text-gray-300">
              <ArrowLeft size={16} className="mr-2" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="text-gray-300">
            Cancel
          </Button>
          {currentStep < 3 ? (
            <Button onClick={nextStep} className="bg-glass-orange hover:bg-glass-orange/80">
              Next
              <ArrowRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} className="bg-glass-orange hover:bg-glass-orange/80">
              Create Event
              <Check size={16} className="ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
