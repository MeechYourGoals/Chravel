import React from 'react';
import { Building, Briefcase, GraduationCap, Heart, Cpu, Music } from 'lucide-react';
import { Button } from '../ui/button';
import { IndustryTemplate } from '@/types';

interface IndustryTemplatesProps {
  selectedIndustry: string;
  onIndustrySelect: (industry: string) => void;
  selectedTemplate: IndustryTemplate | null;
  onTemplateSelect: (template: IndustryTemplate) => void;
}

export const IndustryTemplates = ({
  selectedIndustry,
  onIndustrySelect,
  selectedTemplate,
  onTemplateSelect,
}: IndustryTemplatesProps) => {
  const industries = [
    { id: 'corporate', name: 'Corporate', icon: Building, color: 'text-blue-400' },
    { id: 'conference', name: 'Conference', icon: Briefcase, color: 'text-green-400' },
    { id: 'education', name: 'Education', icon: GraduationCap, color: 'text-purple-400' },
    { id: 'healthcare', name: 'Healthcare', icon: Heart, color: 'text-red-400' },
    { id: 'technology', name: 'Technology', icon: Cpu, color: 'text-cyan-400' },
    { id: 'entertainment', name: 'Entertainment', icon: Music, color: 'text-pink-400' },
  ];

  const templates: Record<string, IndustryTemplate[]> = {
    corporate: [
      {
        id: 'corp-retreat',
        name: 'Corporate Retreat',
        description: 'Team building and strategic planning focused event',
        features: ['Team Activities', 'Meeting Rooms', 'Catering', 'Transportation'],
        settings: { networking: true, broadcasts: true },
      },
      {
        id: 'board-meeting',
        name: 'Board Meeting',
        description: 'Executive level meeting with confidential sessions',
        features: ['Private Sessions', 'Document Sharing', 'Security', 'Recording'],
        settings: { networking: false, broadcasts: false },
      },
    ],
    conference: [
      {
        id: 'tech-conference',
        name: 'Technology Conference',
        description: 'Multi-track technology conference with speakers',
        features: ['Multiple Tracks', 'Speaker Directory', 'Live Q&A', 'Networking'],
        settings: { networking: true, broadcasts: true, live_qa: true },
      },
      {
        id: 'business-summit',
        name: 'Business Summit',
        description: 'Professional business networking and knowledge sharing',
        features: ['Keynotes', 'Breakout Sessions', 'Exhibitors', 'Analytics'],
        settings: { networking: true, broadcasts: true, analytics: true },
      },
    ],
    education: [
      {
        id: 'academic-conference',
        name: 'Academic Conference',
        description: 'Research presentation and academic networking',
        features: ['Paper Presentations', 'Poster Sessions', 'Academic Networking'],
        settings: { networking: true, broadcasts: true },
      },
    ],
    healthcare: [
      {
        id: 'medical-symposium',
        name: 'Medical Symposium',
        description: 'Medical professionals continuing education',
        features: ['CME Credits', 'Medical Presentations', 'Case Studies'],
        settings: { networking: true, broadcasts: false },
      },
    ],
    technology: [
      {
        id: 'developer-meetup',
        name: 'Developer Meetup',
        description: 'Technical presentations and networking for developers',
        features: ['Tech Talks', 'Code Reviews', 'Networking', 'Demos'],
        settings: { networking: true, broadcasts: true },
      },
    ],
    entertainment: [
      {
        id: 'music-festival',
        name: 'Music Festival',
        description: 'Multi-day music and entertainment event',
        features: ['Multiple Stages', 'Artist Meet & Greet', 'Food Vendors'],
        settings: { networking: false, broadcasts: true },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Select Industry</h4>
        <div className="grid grid-cols-3 gap-3">
          {industries.map(industry => {
            const Icon = industry.icon;
            return (
              <button
                key={industry.id}
                onClick={() => onIndustrySelect(industry.id)}
                className={`p-4 rounded-lg border transition-all ${
                  selectedIndustry === industry.id
                    ? 'border-glass-orange bg-glass-orange/20 text-glass-orange'
                    : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/40'
                }`}
              >
                <Icon size={24} className={`mx-auto mb-2 ${industry.color}`} />
                <div className="text-sm font-medium">{industry.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedIndustry && templates[selectedIndustry] && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Choose Template</h4>
          <div className="space-y-3">
            {templates[selectedIndustry].map(template => (
              <div
                key={template.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-glass-orange bg-glass-orange/20'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
                onClick={() => onTemplateSelect(template)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-white">{template.name}</h5>
                  {selectedTemplate?.id === template.id && (
                    <div className="w-2 h-2 bg-glass-orange rounded-full"></div>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-3">{template.description}</p>
                <div className="flex flex-wrap gap-2">
                  {template.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
