import React, { useState } from 'react';
import { FileText, Search, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  tripType: string;
  placeholders: string[];
}

interface MessageTemplateLibraryProps {
  onSelectTemplate: (template: MessageTemplate) => void;
  tripType?: string;
  onClose?: () => void;
}

// Mock templates - in production, these would come from the database
const mockTemplates: MessageTemplate[] = [
  {
    id: '1',
    name: 'Game Day Reminder',
    content:
      'Team meeting at {{time}} in {{location}}. Please arrive 15 minutes early for warm-up. {{additional_info}}',
    category: 'logistics',
    tripType: 'sports',
    placeholders: ['time', 'location', 'additional_info'],
  },
  {
    id: '3',
    name: 'Sound Check',
    content:
      'Sound check at {{time}} in {{venue}}. All {{role}} members must attend. {{technical_notes}}',
    category: 'logistics',
    tripType: 'music',
    placeholders: ['time', 'venue', 'role', 'technical_notes'],
  },
  {
    id: '4',
    name: 'Meeting Reminder',
    content:
      'Team meeting scheduled for {{time}} in {{location}}. Agenda: {{agenda}}. {{preparation_notes}}',
    category: 'reminder',
    tripType: 'corporate',
    placeholders: ['time', 'location', 'agenda', 'preparation_notes'],
  },
  {
    id: '5',
    name: 'Field Trip Reminder',
    content:
      'Field trip to {{destination}} tomorrow. Meet at {{meeting_point}} at {{time}}. Bring {{items_needed}}.',
    category: 'reminder',
    tripType: 'school',
    placeholders: ['destination', 'meeting_point', 'time', 'items_needed'],
  },
];

export const MessageTemplateLibrary = ({
  onSelectTemplate,
  tripType = 'general',
  onClose: _onClose,
}: MessageTemplateLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter templates based on trip type, search query, and category
  const filteredTemplates = mockTemplates.filter(template => {
    const matchesTripType = tripType === 'general' || template.tripType === tripType;
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

    return matchesTripType && matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(mockTemplates.map(t => t.category)))];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'logistics':
        return 'text-blue-400 bg-blue-400/10';
      case 'reminder':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'update':
        return 'text-green-400 bg-green-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <FileText size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Message Templates</h3>
          <p className="text-sm text-gray-400">Pre-built messages for common scenarios</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-white group-hover:text-purple-300 transition-colors">
                      {template.name}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}
                    >
                      {template.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {template.content.replace(/\{\{(\w+)\}\}/g, '[$1]')}
                  </p>
                  {template.placeholders.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {template.placeholders.map(placeholder => (
                        <span
                          key={placeholder}
                          className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs"
                        >
                          {placeholder}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight
                  size={16}
                  className="text-gray-500 group-hover:text-purple-400 transition-colors"
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <FileText size={48} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">No templates found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search or category filter</p>
          </div>
        )}
      </div>

      {/* Generate Custom Template Button */}
      <div className="pt-3 border-t border-white/10">
        <Button
          onClick={() =>
            onSelectTemplate({
              id: 'custom',
              name: 'Custom AI Generated',
              content: '',
              category: 'custom',
              tripType: 'general',
              placeholders: [],
            })
          }
          variant="outline"
          className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
        >
          <Sparkles size={16} className="mr-2" />
          Generate Custom Template with AI
        </Button>
      </div>
    </div>
  );
};
