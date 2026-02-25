import React, { useState } from 'react';
import { MapPin, Home, X } from 'lucide-react';
import { Button } from './ui/button';
import { BasecampLocation } from '../types/basecamp';
import { toast } from 'sonner';

interface BasecampSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onBasecampSet: (basecamp: BasecampLocation) => Promise<void> | void;
  onBasecampClear?: () => Promise<void> | void;
  currentBasecamp?: BasecampLocation;
}

export const BasecampSelector = ({
  isOpen,
  onClose,
  onBasecampSet,
  onBasecampClear,
  currentBasecamp,
}: BasecampSelectorProps) => {
  const [address, setAddress] = useState(currentBasecamp?.address || '');
  const [name, setName] = useState(currentBasecamp?.name || '');
  const [type, setType] = useState<'hotel' | 'short-term' | 'other'>(
    currentBasecamp?.type || 'hotel',
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If address is empty, treat as a clear request
    if (!address.trim()) {
      if (currentBasecamp && onBasecampClear) {
        setIsLoading(true);
        try {
          await Promise.resolve(onBasecampClear());
          toast.success('Basecamp cleared');
          onClose();
        } catch {
          toast.error('Failed to clear basecamp');
        } finally {
          setIsLoading(false);
        }
        return;
      } else if (!currentBasecamp) {
        // No current basecamp and no address entered - just close
        onClose();
        return;
      }
      // Has current basecamp but no onBasecampClear handler - show error
      toast.error('Cannot clear basecamp');
      return;
    }

    setIsLoading(true);

    // Safety timeout - reset loading state after 15 seconds if save hangs
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
      toast.error('Save timed out. Please try again.');
    }, 15000);

    try {
      // Simple text save - no geocoding, no Google Places API validation
      // Users can enter any text: "Grandma's house", "Hotel lobby", etc.
      const trimmedAddress = address.trim();
      const resolvedName = name.trim() || undefined;

      const basecamp: BasecampLocation = {
        address: trimmedAddress,
        name: resolvedName,
        type,
        // No coordinates - basecamp is just a text reference now
        coordinates: undefined,
      };

      await Promise.resolve(onBasecampSet(basecamp));
      clearTimeout(safetyTimeout);
      // Success toast is handled by the caller (mutation hook or BasecampsPanel)
      // to avoid duplicate toasts and ensure accuracy
      onClose();
    } catch {
      clearTimeout(safetyTimeout);
      // Error toast is also handled by mutation onError, but we close the dialog
      // No duplicate toast here - the mutation hook already shows the error
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center">
              <Home size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {currentBasecamp ? 'Update Basecamp' : 'Set Basecamp'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors border border-gray-700"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative">
            <label className="block text-sm font-semibold text-white mb-2">
              Basecamp Location *
            </label>
            <div className="relative">
              <MapPin
                size={18}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10"
              />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g., Grandma's house, Hotel lobby, 123 Main St"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Enter any description - no exact address needed
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Nickname (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., 'The Beach House' or 'Mom's Place'"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'hotel' | 'short-term' | 'other')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            >
              <option value="hotel">Hotel</option>
              <option value="short-term">Short-term Rental</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Basecamp'}
              </Button>
            </div>
            {currentBasecamp && onBasecampClear && (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await Promise.resolve(onBasecampClear());
                    toast.success('Basecamp cleared');
                    onClose();
                  } catch {
                    toast.error('Failed to clear basecamp');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full"
              >
                Clear Basecamp
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
