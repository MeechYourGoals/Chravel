import React, { useState } from 'react';
import { Plus, Search, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { AddLinkModal } from './AddLinkModal';
import { LinkCard } from './LinkCard';
import { Badge } from './ui/badge';

interface LinkPost {
  id: string;
  title: string;
  url: string;
  description: string;
  category: 'housing' | 'eats' | 'day-activities' | 'nightlife' | 'fitness' | 'reservations' | 'transportation' | 'essentials' | 'other';
  source: 'chat' | 'manual' | 'places';
  imageUrl?: string;
  postedBy: string;
  postedAt: string;
  upvotes: number;
  comments: number;
  originatedFromPlace?: boolean;
  placeId?: string;
}

// Mock data for demonstration with new categories
const mockLinks: LinkPost[] = [
  {
    id: '1',
    title: 'Charming 3BR Apartment in Montmartre',
    url: 'https://airbnb.com/rooms/123',
    description: 'Beautiful apartment with Eiffel Tower views, perfect for groups',
    category: 'housing',
    source: 'manual',
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=200&fit=crop',
    postedBy: 'Emma',
    postedAt: '2 hours ago',
    upvotes: 8,
    comments: 3
  },
  {
    id: '2',
    title: 'L\'Ami Jean - Traditional Bistro',
    url: 'https://example.com/restaurant',
    description: 'Saved from Places: 27 Rue Malar, 75007 Paris, France',
    category: 'eats',
    source: 'places',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=200&fit=crop',
    postedBy: 'You',
    postedAt: 'just now',
    upvotes: 12,
    comments: 5,
    originatedFromPlace: true,
    placeId: 'place-123'
  },
  {
    id: '3',
    title: 'Seine River Cruise',
    url: 'https://example.com/cruise',
    description: 'Evening cruise with dinner and city lights',
    category: 'day-activities',
    source: 'manual',
    imageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&h=200&fit=crop',
    postedBy: 'Sarah',
    postedAt: '1 day ago',
    upvotes: 6,
    comments: 2
  },
  {
    id: '4',
    title: 'Le Grand Véfour Reservation',
    url: 'https://opentable.com/restaurant',
    description: 'Confirmed reservation for 6 people at 8pm on July 16th',
    category: 'reservations',
    source: 'manual',
    postedBy: 'Emma',
    postedAt: '3 hours ago',
    upvotes: 4,
    comments: 1
  },
  {
    id: '5',
    title: 'Air France Flight CDG-JFK',
    url: 'https://airfrance.com/booking',
    description: 'Return flights booked for July 21st departure',
    category: 'transportation',
    source: 'manual',
    postedBy: 'Jake',
    postedAt: '1 day ago',
    upvotes: 7,
    comments: 0
  },
  {
    id: '6',
    title: 'Paris Packing Checklist',
    url: 'https://example.com/packing',
    description: 'Essential items to pack for summer in Paris',
    category: 'essentials',
    source: 'manual',
    postedBy: 'Sarah',
    postedAt: '2 days ago',
    upvotes: 3,
    comments: 4
  }
];

const categories = [
  { id: 'all', label: 'All', icon: '🌟' },
  { id: 'housing', label: 'Housing', icon: '🏠' },
  { id: 'eats', label: 'Eats', icon: '🍽️' },
  { id: 'day-activities', label: 'Day Activities', icon: '☀️' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'reservations', label: 'Reservations', icon: '📅' },
  { id: 'transportation', label: 'Transportation', icon: '✈️' },
  { id: 'essentials', label: 'Essentials', icon: '🎒' },
  { id: 'other', label: 'Other', icon: '📎' }
];

export const VenueIdeas = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return mockLinks.length;
    return mockLinks.filter(link => link.category === categoryId).length;
  };

  const filteredLinks = mockLinks.filter(link => {
    const matchesCategory = activeCategory === 'all' || link.category === activeCategory;
    const matchesSearch = link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         link.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Ideas & Links</h2>
          <p className="text-slate-400 text-sm">Share and discover places to visit</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={16} className="mr-2" />
          Add Link
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((category) => {
          const count = getCategoryCount(category.id);
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
              {count > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activeCategory === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Links Feed */}
      <div className="space-y-4">
        {filteredLinks.length > 0 ? (
          filteredLinks.map((link) => (
            <div key={link.id} className="relative">
              <LinkCard link={link} />
              {link.originatedFromPlace && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1">
                    <MapPin size={12} />
                    From Places
                  </Badge>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-slate-400 text-lg mb-2">
              {activeCategory === 'all' ? 'No ideas yet' : `No ${categories.find(c => c.id === activeCategory)?.label.toLowerCase()} ideas yet`}
            </div>
            <div className="text-slate-500">
              {activeCategory === 'all' 
                ? 'Start sharing links to restaurants, activities, and places to visit!'
                : `Be the first to suggest some ${categories.find(c => c.id === activeCategory)?.label.toLowerCase()} options!`
              }
            </div>
          </div>
        )}
      </div>

      <AddLinkModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
};
