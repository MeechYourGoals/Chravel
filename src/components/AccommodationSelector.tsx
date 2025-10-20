import React, { useState, useEffect } from 'react';
import { MapPin, Hotel, Home, Building, Bed, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { BasecampSelector } from './BasecampSelector';
import { personalAccommodationService, PersonalAccommodation } from '../services/personalAccommodationService';
import { useAuth } from '../hooks/useAuth';
import { useBasecamp } from '../contexts/BasecampContext';

interface AccommodationSelectorProps {
  tripId: string;
  onLocationSet?: (location: any, mode: 'trip' | 'personal') => void;
}

const accommodationTypeIcons = {
  hotel: Hotel,
  airbnb: Home,
  hostel: Building,
  apartment: Building,
  resort: Hotel,
  other: Bed
};

const accommodationTypeColors = {
  hotel: 'bg-blue-100 text-blue-800',
  airbnb: 'bg-green-100 text-green-800',
  hostel: 'bg-yellow-100 text-yellow-800',
  apartment: 'bg-purple-100 text-purple-800',
  resort: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800'
};

export const AccommodationSelector: React.FC<AccommodationSelectorProps> = ({
  tripId,
  onLocationSet
}) => {
  const { user } = useAuth();
  const { basecamp: tripBasecamp, setBasecamp: setTripBasecampRoute } = useBasecamp();
  const [personalAccommodation, setPersonalAccommodation] = useState<PersonalAccommodation | null>(null);
  const [showPersonalSelector, setShowPersonalSelector] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccommodations = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Handle unauthenticated users - show UI but no personal accommodation
      if (!user) {
        console.log('No user authenticated, showing public trip basecamp only');
        setPersonalAccommodation(null);
        setLoading(false);
        return;
      }
      
      console.log('Loading accommodations for trip:', tripId, 'user:', user.id);
      // Load personal accommodation
      const personal = await personalAccommodationService.getUserAccommodation(tripId, user.id);
      console.log('Loaded personal accommodation:', personal);
      setPersonalAccommodation(personal);

      // Trip basecamp is already loaded from BasecampContext
      console.log('Trip basecamp from context:', tripBasecamp);
    } catch (err: any) {
      console.error('Failed to load accommodations:', err);
      setError(err?.message || 'Failed to load accommodations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tripId, user, tripBasecamp]);

  useEffect(() => {
    loadAccommodations();
  }, [loadAccommodations]);

  const handlePersonalLocationSet = async (location: any) => {
    if (!user) return;

    try {
      const accommodation = await personalAccommodationService.setUserAccommodation({
        trip_id: tripId,
        accommodation_name: location.name || 'My Accommodation',
        address: location.formatted_address || location.address,
        latitude: location.coordinates?.lat || location.latitude,
        longitude: location.coordinates?.lng || location.longitude,
        accommodation_type: 'hotel' // Default, can be made configurable
      });

      if (accommodation) {
        setPersonalAccommodation(accommodation);
        onLocationSet?.(location, 'personal');
      }
    } catch (error) {
      console.error('Failed to set personal accommodation:', error);
    }
    setShowPersonalSelector(false);
  };

  const handleTripLocationSet = (location: any) => {
    setTripBasecampRoute(location);
    onLocationSet?.(location, 'trip');
    setShowTripSelector(false);
  };

  const handleDeletePersonalAccommodation = async () => {
    if (!personalAccommodation) return;

    try {
      const success = await personalAccommodationService.deleteUserAccommodation(personalAccommodation.id);
      if (success) {
        setPersonalAccommodation(null);
      }
    } catch (error) {
      console.error('Failed to delete personal accommodation:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-32 rounded-xl"></div>
        <div className="animate-pulse bg-gray-200 h-32 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <MapPin size={20} />
            Unable to Load Accommodations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <Button 
            onClick={loadAccommodations}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trip Base Camp Section */}
      <Card className="bg-glass-slate-card border border-glass-slate-border shadow-enterprise-lg rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin size={20} className="text-blue-400" />
              Trip Base Camp
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTripSelector(true)}
              className="border-glass-slate-border text-white hover:bg-white/10"
            >
              {tripBasecamp ? <Edit size={16} /> : <Plus size={16} />}
              {tripBasecamp ? 'Edit' : 'Set Location'}
            </Button>
          </div>
          <p className="text-sm text-gray-300">
            Main meeting point for group activities and shared recommendations
          </p>
        </CardHeader>
        {tripBasecamp && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-white">
              <MapPin size={16} className="text-blue-400" />
              <span className="font-medium">{tripBasecamp.name}</span>
            </div>
            {tripBasecamp.address && (
              <p className="text-sm text-gray-300 mt-1">{tripBasecamp.address}</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Personal Accommodation Section */}
      <Card className="bg-glass-slate-card border border-glass-slate-border shadow-enterprise-lg rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Bed size={20} className="text-green-400" />
              Your Accommodation {!user && <Badge variant="outline" className="text-xs border-green-400/30 text-green-400">Private</Badge>}
            </CardTitle>
            <div className="flex gap-2">
              {personalAccommodation && user && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDeletePersonalAccommodation}
                  className="border-glass-slate-border text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPersonalSelector(true)}
                disabled={!user}
                className="border-glass-slate-border text-white hover:bg-white/10 disabled:opacity-50"
              >
                {personalAccommodation ? <Edit size={16} /> : <Plus size={16} />}
                {personalAccommodation ? 'Edit' : 'Set Your Location'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-300">
            {user 
              ? "Where you're staying for personalized recommendations and local insights" 
              : "Sign in to save your private accommodation for personalized directions"}
          </p>
        </CardHeader>
        {personalAccommodation && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(accommodationTypeIcons[personalAccommodation.accommodation_type], { size: 16, className: "text-green-400" })}
                  <span className="font-medium text-white">{personalAccommodation.accommodation_name}</span>
                </div>
                <Badge variant="outline" className="border-green-400/30 text-green-400 text-xs">
                  {personalAccommodation.accommodation_type}
                </Badge>
              </div>
              {personalAccommodation.address && (
                <p className="text-sm text-gray-300">{personalAccommodation.address}</p>
              )}
              {(personalAccommodation.check_in || personalAccommodation.check_out) && (
                <div className="flex gap-4 text-sm text-gray-400">
                  {personalAccommodation.check_in && (
                    <span>Check-in: {new Date(personalAccommodation.check_in).toLocaleDateString()}</span>
                  )}
                  {personalAccommodation.check_out && (
                    <span>Check-out: {new Date(personalAccommodation.check_out).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Location Selector Modals */}
      {showTripSelector && (
        <BasecampSelector
          isOpen={showTripSelector}
          onClose={() => setShowTripSelector(false)}
          onBasecampSet={handleTripLocationSet}
        />
      )}

      {showPersonalSelector && (
        <BasecampSelector
          isOpen={showPersonalSelector}
          onClose={() => setShowPersonalSelector(false)}
          onBasecampSet={handlePersonalLocationSet}
        />
      )}
    </div>
  );
};
