import React, { useState } from 'react';
import { EventSetupData, IndustryTemplate, EventScheduleData } from '@/types';

interface EventScheduleSectionProps {
  eventData?: EventSetupData;
  onEventDataChange?: (data: EventSetupData) => void;
}

export const EventScheduleSection = ({
  eventData = {},
  onEventDataChange,
}: EventScheduleSectionProps) => {
  const [scheduleData, setScheduleData] = useState({
    industry: eventData.industry || '',
    template: eventData.template || null,
    scheduleData: eventData.schedule || {},
  });

  const handleIndustrySelect = (industry: string) => {
    const updated = { ...scheduleData, industry };
    setScheduleData(updated);
    onEventDataChange?.({ ...eventData, industry });
  };

  const handleTemplateSelect = (template: IndustryTemplate) => {
    const updated = { ...scheduleData, template };
    setScheduleData(updated);
    onEventDataChange?.({ ...eventData, template });
  };

  const handleScheduleImport = (schedule: EventScheduleData) => {
    const updated = { ...scheduleData, scheduleData: schedule };
    setScheduleData(updated);
    onEventDataChange?.({ ...eventData, schedule });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Setup & Schedule</h3>
        <p className="text-gray-300">
          Configure your event schedule and choose from industry templates.
        </p>
      </div>

      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Industry & Template</h4>
          <p className="text-gray-300">
            Select your industry and template to get started with pre-configured settings.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Schedule Configuration</h4>
          <p className="text-gray-300">Configure your event schedule and sessions.</p>
        </div>
      </div>
    </div>
  );
};
