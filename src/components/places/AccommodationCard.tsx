import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Home, Edit3, Save, X, Trash2 } from 'lucide-react';
import { useAccommodations } from '@/hooks/useAccommodations';
import { CreateAccommodationRequest } from '@/types/accommodations';

interface AccommodationCardProps {
  tripId: string;
}

export const AccommodationCard: React.FC<AccommodationCardProps> = ({ tripId }) => {
  const { myAccommodation, saveAccommodation, isSaving, saveError } = useAccommodations(tripId);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    label: myAccommodation?.accommodation_name || 'My Stay',
    address: myAccommodation?.address || '',
  });

  const handleSave = async () => {
    if (!formData.address.trim()) return;

    saveAccommodation({
      trip_id: tripId,
      accommodation_name: formData.label,
      address: formData.address,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      label: myAccommodation?.accommodation_name || 'My Stay',
      address: myAccommodation?.address || '',
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    setFormData({
      label: myAccommodation?.accommodation_name || 'My Stay',
      address: myAccommodation?.address || '',
    });
    setIsEditing(true);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="h-5 w-5 text-blue-500" />
          My Accommodation
          <span className="text-xs text-muted-foreground ml-auto">
            Private to you
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!myAccommodation && !isEditing ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Set Your Accommodation</h3>
            <p className="text-muted-foreground mb-4">
              Add your personal address for this trip. This is private and only visible to you.
            </p>
            <Button onClick={handleEdit} className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              Add My Address
            </Button>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., My Hotel, Airbnb, Home"
              />
            </div>
            
            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter your full address..."
                rows={3}
              />
            </div>

            {saveError && (
              <div className="text-sm text-red-500">
                Error saving accommodation: {saveError.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !formData.address.trim()}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="outline"
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{myAccommodation.accommodation_name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {myAccommodation.address}
                </p>
                {myAccommodation.latitude && myAccommodation.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {myAccommodation.latitude.toFixed(4)}, {myAccommodation.longitude.toFixed(4)}
                  </p>
                )}
              </div>
              <Button
                onClick={handleEdit}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              🔒 This location is private and only visible to you
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};









