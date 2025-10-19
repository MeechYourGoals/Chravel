import React, { useState, useEffect } from 'react';
import { MapPin, Hotel, Home, Building, Bed, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { BasecampSelector } from './BasecampSelector';
import { personalAccommodationService, PersonalAccommodation } from '../services/personalAccommodationService';
import { useAuth } from '../hooks/useAuth';

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
  const [personalAccommodation, setPersonalAccommodation] = useState<PersonalAccommodation | null>(null);
  const [tripBasecamp, setTripBasecamp] = useState<any>(null);
  const [showPersonalSelector, setShowPersonalSelector] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAccommodations = React.useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load personal accommodation
      const personal = await personalAccommodationService.getUserAccommodation(tripId, user.id);
      setPersonalAccommodation(personal);

      // Load trip basecamp (you'll need to implement this based on your existing basecamp system)
      // setTripBasecamp(tripBasecamp);
    } catch (error) {
      console.error('Failed to load accommodations:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId, user]);

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
    setTripBasecamp(location);
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

  return (
    <div className="space-y-6">
      {/* Trip Base Camp Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <MapPin size={20} />
              Trip Base Camp
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTripSelector(true)}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              {tripBasecamp ? <Edit size={16} /> : <Plus size={16} />}
              {tripBasecamp ? 'Edit' : 'Set Location'}
            </Button>
          </div>
          <p className="text-sm text-blue-700">
            Main meeting point for group activities and shared recommendations
          </p>
        </CardHeader>
        {tripBasecamp && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-blue-800">
              <MapPin size={16} />
              <span className="font-medium">{tripBasecamp.name}</span>
            </div>
            {tripBasecamp.address && (
              <p className="text-sm text-blue-600 mt-1">{tripBasecamp.address}</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Personal Accommodation Section */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-green-900 flex items-center gap-2">
              <Bed size={20} />
              Your Accommodation
            </CardTitle>
            <div className="flex gap-2">
              {personalAccommodation && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDeletePersonalAccommodation}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPersonalSelector(true)}
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                {personalAccommodation ? <Edit size={16} /> : <Plus size={16} />}
                {personalAccommodation ? 'Edit' : 'Set Your Location'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-green-700">
            Where you're staying for personalized recommendations and local insights
          </p>
        </CardHeader>
        {personalAccommodation && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(accommodationTypeIcons[personalAccommodation.accommodation_type], { size: 16, className: "text-green-700" })}
                  <span className="font-medium text-green-800">{personalAccommodation.accommodation_name}</span>
                </div>
                <Badge className={accommodationTypeColors[personalAccommodation.accommodation_type]}>
                  {personalAccommodation.accommodation_type}
                </Badge>
              </div>
              {personalAccommodation.address && (
                <p className="text-sm text-green-600">{personalAccommodation.address}</p>
              )}
              {(personalAccommodation.check_in || personalAccommodation.check_out) && (
                <div className="flex gap-4 text-sm text-green-600">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Set Trip Base Camp</h3>
            <BasecampSelector
              onLocationSet={handleTripLocationSet}
              onCancel={() => setShowTripSelector(false)}
              placeholder="Search for a meeting point or landmark..."
            />
          </div>
        </div>
      )}

      {showPersonalSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Set Your Accommodation</h3>
            <BasecampSelector
              onLocationSet={handlePersonalLocationSet}
              onCancel={() => setShowPersonalSelector(false)}
              placeholder="Search for your hotel, Airbnb, or accommodation..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
