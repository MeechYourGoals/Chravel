import React, { useState } from 'react';
import { X, Link as LinkIcon, AlertTriangle, MapPin, ExternalLink, Star } from 'lucide-react';
import { Button } from './ui/button';
import { usePlaceResolution } from '../hooks/usePlaceResolution';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefill?: {
    url?: string;
    title?: string;
    category?: 'restaurant' | 'hotel' | 'attraction' | 'activity' | 'other';
    note?: string;
  };
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
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  rating?: number;
  price_level?: number;
  photos?: { photo_reference: string; height: number; width: number }[];
  types: string[];
  place_id: string;
  website?: string;
}

// Mock existing links for duplicate detection
const existingLinks = [
  {
    id: '1',
    title: 'Charming 3BR Apartment in Montmartre',
    url: 'https://airbnb.com/rooms/123',
    postedBy: 'Emma',
  },
  {
    id: '2',
    title: "L'Ami Jean - Traditional Bistro",
    url: 'https://example.com/restaurant',
    postedBy: 'Jake',
  },
];

export const AddLinkModal = ({ isOpen, onClose, prefill }: AddLinkModalProps) => {
  const [inputMode, setInputMode] = useState<'url' | 'place'>('place');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [resolvedPlace, setResolvedPlace] = useState<ResolvedPlace | null>(null);
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([]);
  const [selectedLinkOption, setSelectedLinkOption] = useState<LinkOption | null>(null);
  const [showPlacePreview, setShowPlacePreview] = useState(false);

  const { resolvePlaceName, isLoading: isResolving } = usePlaceResolution();

  // Apply prefill when modal opens
  React.useEffect(() => {
    if (isOpen && prefill) {
      if (prefill.url) {
        setInputMode('url');
        setUrl(prefill.url);
      }
      if (prefill.title) {
        setTitle(prefill.title);
      }
      if (prefill.note) {
        setDescription(prefill.note);
      }
    }
  }, [isOpen, prefill]);

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
        } catch {
          // Invalid URL format
        }
      }

      // Check title similarity (simple word matching)
      if (inputTitle && link.title) {
        const inputWords = inputTitle.toLowerCase().split(' ');
        const linkWords = link.title.toLowerCase().split(' ');
        const commonWords = inputWords.filter(
          word =>
            word.length > 3 &&
            linkWords.some(linkWord => linkWord.includes(word) || word.includes(linkWord)),
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
          similarity,
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
      // Link data preparation for future API integration
      const linkUrl = inputMode === 'place' && selectedLinkOption ? selectedLinkOption.url : url;
      const linkTitle =
        inputMode === 'place' && selectedLinkOption ? title || resolvedPlace?.name || '' : title;

      // TODO: Send linkUrl and linkTitle to API when backend is ready
      void linkUrl;
      void linkTitle;

      onClose();
      resetForm();
    } catch (err) {
      console.error('Error adding link:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setInputMode('place');
    setUrl('');
    setTitle('');
    setDescription('');
    setPlaceName('');
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
          <h2 className="text-lg font-semibold text-white">
            {prefill ? 'Save to Trip Links' : 'Add Link'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Input Mode Toggle - hide if prefilled with URL */}
          {!prefill?.url && (
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
          )}

          {/* Prefill indicator */}
          {prefill?.url && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-200">📌 Promoting URL from Media to Trip Links</p>
            </div>
          )}

          {/* Place Name Input */}
          {inputMode === 'place' && !prefill?.url && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Place Name *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={placeName}
                    onChange={e => setPlaceName(e.target.value)}
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
          {(inputMode === 'url' || prefill?.url) && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Link URL *</label>
              <div className="relative">
                <LinkIcon
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                />
                <input
                  type="url"
                  value={url}
                  onChange={e => handleUrlChange(e.target.value)}
                  placeholder="https://..."
                  required={inputMode === 'url' || !!prefill?.url}
                  disabled={!!prefill?.url}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* Place Preview */}
          {showPlacePreview && resolvedPlace && linkOptions.length > 0 && !prefill?.url && (
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
                {linkOptions.map(option => (
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
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
              {duplicateMatches.slice(0, 2).map(match => (
                <div key={match.id} className="text-xs text-amber-200 mb-1">
                  "{match.title}" by {match.postedBy}{' '}
                  {match.similarity > 0.9 ? '(exact match)' : '(similar)'}
                </div>
              ))}
              <div className="text-xs text-amber-300 mt-2">
                Continue if you're sure this is different
              </div>
            </div>
          )}

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add some context or notes..."
              rows={3}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || (inputMode === 'place' && !selectedLinkOption && !prefill?.url)
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : prefill ? 'Save to Trip Links' : 'Add Link'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
