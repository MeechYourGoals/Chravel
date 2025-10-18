
import React, { useState } from 'react';
import { X, Link as LinkIcon, Sparkles, AlertTriangle, MapPin, ExternalLink, Star } from 'lucide-react';
import { Button } from './ui/button';
import { usePlaceResolution } from '../hooks/usePlaceResolution';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DuplicateMatch {
  id: string;
  title: string;
  url: string;
  postedBy: string;
  similarity: number;
}

interface LinkOption {
  type: string;
  label: string;
  url: string;
  description: string;
  isPrimary?: boolean;
}

interface ResolvedPlace {
  name: string;
  formatted_address: string;
  rating?: number;
  price_level?: number;
  photos?: { photo_reference: string; height: number; width: number }[];
  types: string[];
  place_id: string;
  website?: string;
}

const categories = [
  { id: 'housing', label: 'Housing', icon: '🏠', description: 'Hotels, Airbnbs, hostels' },
  { id: 'eats', label: 'Eats', icon: '🍽️', description: 'Restaurants, cafes, food tours' },
  { id: 'day-activities', label: 'Day Activities', icon: '☀️', description: 'Museums, tours, attractions' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙', description: 'Bars, clubs, evening events' },
  { id: 'fitness', label: 'Fitness', icon: '💪', description: 'Gyms, yoga, sports activities' },
  { id: 'reservations', label: 'Reservations', icon: '📅', description: 'Restaurant bookings, confirmations' },
  { id: 'transportation', label: 'Transportation', icon: '✈️', description: 'Flights, cars, rideshares' },
  { id: 'essentials', label: 'Essentials', icon: '🎒', description: 'Packing, weather, documents' },
  { id: 'other', label: 'Other', icon: '📎', description: 'Everything else' }
];

// Mock existing links for duplicate detection
const existingLinks = [
  {
    id: '1',
    title: 'Charming 3BR Apartment in Montmartre',
    url: 'https://airbnb.com/rooms/123',
    postedBy: 'Emma'
  },
  {
    id: '2',
    title: "L'Ami Jean - Traditional Bistro",
    url: 'https://example.com/restaurant',
    postedBy: 'Jake'
  }
];

export const AddLinkModal = ({ isOpen, onClose }: AddLinkModalProps) => {
  const [inputMode, setInputMode] = useState<'url' | 'place'>('place');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [useAiSorting, setUseAiSorting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [resolvedPlace, setResolvedPlace] = useState<ResolvedPlace | null>(null);
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([]);
  const [selectedLinkOption, setSelectedLinkOption] = useState<LinkOption | null>(null);
  const [showPlacePreview, setShowPlacePreview] = useState(false);

  const { resolvePlaceName, categorizePlaceType, isLoading: isResolving } = usePlaceResolution();

  const checkForDuplicates = (inputUrl: string, inputTitle: string) => {
    const matches: DuplicateMatch[] = [];
    
    existingLinks.forEach(link => {
      let similarity = 0;
      
      // Check URL similarity (exact match or similar domain)
      if (link.url === inputUrl) {
        similarity = 1.0;
      } else if (inputUrl && link.url) {
        try {
          const inputDomain = new URL(inputUrl).hostname;
          const linkDomain = new URL(link.url).hostname;
          if (inputDomain === linkDomain) {
            similarity = Math.max(similarity, 0.7);
          }
        } catch (e) {
          // Invalid URL format
        }
      }
      
      // Check title similarity (simple word matching)
      if (inputTitle && link.title) {
        const inputWords = inputTitle.toLowerCase().split(' ');
        const linkWords = link.title.toLowerCase().split(' ');
        const commonWords = inputWords.filter(word => 
          word.length > 3 && linkWords.some(linkWord => 
            linkWord.includes(word) || word.includes(linkWord)
          )
        );
        const titleSimilarity = commonWords.length / Math.max(inputWords.length, linkWords.length);
        similarity = Math.max(similarity, titleSimilarity);
      }
      
      if (similarity > 0.6) {
        matches.push({
          id: link.id,
          title: link.title,
          url: link.url,
          postedBy: link.postedBy,
          similarity
        });
      }
    });
    
    return matches.sort((a, b) => b.similarity - a.similarity);
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (newUrl || title) {
      const matches = checkForDuplicates(newUrl, title);
      setDuplicateMatches(matches);
      setShowDuplicateWarning(matches.length > 0);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (url || newTitle) {
      const matches = checkForDuplicates(url, newTitle);
      setDuplicateMatches(matches);
      setShowDuplicateWarning(matches.length > 0);
    }
  };

  const handlePlaceSearch = async () => {
    if (!placeName.trim()) return;

    const result = await resolvePlaceName(placeName);
    
    if (result.success && result.place && result.linkOptions) {
      setResolvedPlace(result.place);
      setLinkOptions(result.linkOptions);
      setTitle(result.place.name);
      setDescription(result.place.formatted_address);
      
      // Auto-categorize based on place type
      const autoCategory = categorizePlaceType(result.place.types);
      if (!selectedCategory && !useAiSorting) {
        setSelectedCategory(autoCategory);
      }
      
      setShowPlacePreview(true);
      
      // Auto-select primary link option
      const primaryOption = result.linkOptions.find(opt => opt.isPrimary) || result.linkOptions[0];
      setSelectedLinkOption(primaryOption);
      setUrl(primaryOption.url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalUrl = url;
      let finalTitle = title;
      
      // Use selected link option if in place mode
      if (inputMode === 'place' && selectedLinkOption) {
        finalUrl = selectedLinkOption.url;
        finalTitle = title || resolvedPlace?.name || '';
      }

      let finalCategory = selectedCategory;
      
      if (!selectedCategory && useAiSorting) {
        finalCategory = await classifyLink(finalUrl, finalTitle, description);
      }
      
      if (!finalCategory) {
        finalCategory = 'other';
      }

      console.log('Adding link:', { 
        url: finalUrl, 
        title: finalTitle, 
        description, 
        category: finalCategory,
        linkType: selectedLinkOption?.type,
        fromPlace: inputMode === 'place'
      });
      
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error adding link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const classifyLink = async (url: string, title: string, description: string): Promise<string> => {
    // Enhanced keyword-based classification for all categories
    const text = `${title} ${description} ${url}`.toLowerCase();
    
    if (text.includes('airbnb') || text.includes('hotel') || text.includes('hostel') || 
        text.includes('apartment') || text.includes('accommodation') || text.includes('booking.com') ||
        text.includes('vrbo') || text.includes('stay') || text.includes('lodge')) {
      return 'housing';
    }
    
    if (text.includes('flight') || text.includes('airline') || text.includes('airport') ||
        text.includes('uber') || text.includes('lyft') || text.includes('rental car') ||
        text.includes('train') || text.includes('bus') || text.includes('transfer') ||
        text.includes('expedia') || text.includes('kayak') || text.includes('car rental')) {
      return 'transportation';
    }
    
    if (text.includes('reservation') || text.includes('booking') || text.includes('opentable') ||
        text.includes('resy') || text.includes('confirmed') || text.includes('table') ||
        text.includes('tickets') || text.includes('seats') || text.includes('confirmation')) {
      return 'reservations';
    }
    
    if (text.includes('packing') || text.includes('checklist') || text.includes('weather') ||
        text.includes('passport') || text.includes('visa') || text.includes('insurance') ||
        text.includes('documents') || text.includes('emergency') || text.includes('essentials') ||
        text.includes('what to bring') || text.includes('travel tips')) {
      return 'essentials';
    }
    
    if (text.includes('restaurant') || text.includes('cafe') || text.includes('food') || 
        text.includes('menu') || text.includes('dining') || text.includes('michelin') ||
        text.includes('cuisine') || text.includes('brunch') || text.includes('lunch') ||
        text.includes('dinner') || text.includes('bakery')) {
      return 'eats';
    }
    
    if (text.includes('bar') || text.includes('club') || text.includes('nightlife') || 
        text.includes('cocktail') || text.includes('pub') || text.includes('lounge') ||
        text.includes('drinks') || text.includes('party') || text.includes('rooftop')) {
      return 'nightlife';
    }
    
    if (text.includes('gym') || text.includes('fitness') || text.includes('yoga') || 
        text.includes('workout') || text.includes('sports') || text.includes('running') ||
        text.includes('hiking') || text.includes('swimming') || text.includes('tennis')) {
      return 'fitness';
    }
    
    if (text.includes('museum') || text.includes('tour') || text.includes('attraction') || 
        text.includes('activity') || text.includes('experience') || text.includes('sightseeing') ||
        text.includes('gallery') || text.includes('monument') || text.includes('park') ||
        text.includes('excursion') || text.includes('adventure')) {
      return 'day-activities';
    }
    
    return 'other';
  };

  const resetForm = () => {
    setInputMode('place');
    setUrl('');
    setTitle('');
    setDescription('');
    setPlaceName('');
    setSelectedCategory('');
    setUseAiSorting(false);
    setDuplicateMatches([]);
    setShowDuplicateWarning(false);
    setResolvedPlace(null);
    setLinkOptions([]);
    setSelectedLinkOption(null);
    setShowPlacePreview(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add Link</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Input Mode Toggle */}
          <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-600">
            <button
              type="button"
              onClick={() => setInputMode('place')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === 'place'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <MapPin size={16} className="inline mr-2" />
              Add by Place Name
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <LinkIcon size={16} className="inline mr-2" />
              Add by URL
            </button>
          </div>

          {/* Place Name Input */}
          {inputMode === 'place' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Place Name *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                    placeholder="e.g., Gotham Hotel New York"
                    required={inputMode === 'place'}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handlePlaceSearch}
                  disabled={!placeName.trim() || isResolving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isResolving ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          )}

          {/* URL Input */}
          {inputMode === 'url' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Link URL *
              </label>
              <div className="relative">
                <LinkIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://..."
                  required={inputMode === 'url'}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Place Preview */}
          {showPlacePreview && resolvedPlace && linkOptions.length > 0 && (
            <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-white">{resolvedPlace.name}</h3>
                  <p className="text-sm text-slate-400">{resolvedPlace.formatted_address}</p>
                  {resolvedPlace.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={14} className="text-yellow-400 fill-current" />
                      <span className="text-sm text-slate-300">{resolvedPlace.rating}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Choose Link Type:
                </label>
                {linkOptions.map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => {
                      setSelectedLinkOption(option);
                      setUrl(option.url);
                    }}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedLinkOption?.type === option.type
                        ? 'bg-blue-600/20 border-blue-600 text-white'
                        : 'bg-slate-900/30 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-slate-400">{option.description}</div>
                      </div>
                      <ExternalLink size={16} className="text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Give this link a title..."
              required
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Duplicate Warning */}
          {showDuplicateWarning && duplicateMatches.length > 0 && (
            <div className="p-3 bg-amber-900/20 border border-amber-600/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <span className="text-sm font-medium text-amber-300">Similar links found</span>
              </div>
              {duplicateMatches.slice(0, 2).map((match) => (
                <div key={match.id} className="text-xs text-amber-200 mb-1">
                  "{match.title}" by {match.postedBy} {match.similarity > 0.9 ? '(exact match)' : '(similar)'}
                </div>
              ))}
              <div className="text-xs text-amber-300 mt-2">
                Continue if you're sure this is different
              </div>
            </div>
          )}

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some context or notes..."
              rows={3}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* AI Sorting Toggle */}
          <div className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
            <input
              type="checkbox"
              id="ai-sorting"
              checked={useAiSorting}
              onChange={(e) => setUseAiSorting(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="ai-sorting" className="flex items-center gap-2 text-sm text-slate-300">
              <Sparkles size={16} className="text-blue-400" />
              Let AI categorize this link automatically
            </label>
          </div>

          {/* Category Selection */}
          {!useAiSorting && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Category (optional)
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id === selectedCategory ? '' : category.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      selectedCategory === category.id
                        ? 'bg-blue-600/20 border-blue-600 text-white'
                        : 'bg-slate-900/30 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-lg">{category.icon}</span>
                    <div>
                      <div className="font-medium">{category.label}</div>
                      <div className="text-xs text-slate-400">{category.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (inputMode === 'place' && !selectedLinkOption)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Adding...' : 'Add Link'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
