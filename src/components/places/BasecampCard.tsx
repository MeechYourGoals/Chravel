import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Users, Edit3, Save, X } from 'lucide-react';
import { useAccommodations } from '@/hooks/useAccommodations';
import { useAuth } from '@/hooks/useAuth';

interface BasecampCardProps {
  tripId: string;
}

export const BasecampCard: React.FC<BasecampCardProps> = ({ tripId }) => {
  const { user } = useAuth();
  const { tripBasecamp, updateBasecamp, isUpdatingBasecamp, basecampError } = useAccommodations(tripId);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: tripBasecamp?.name || '',
    address: tripBasecamp?.address || '',
  });

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.address.trim()) return;

    const result = await updateBasecamp({
      name: formData.name,
      address: formData.address,
    });
    
    if (result) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: tripBasecamp?.name || '',
      address: tripBasecamp?.address || '',
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    setFormData({
      name: tripBasecamp?.name || '',
      address: tripBasecamp?.address || '',
    });
    setIsEditing(true);
  };

  const isAdmin = true; // TODO: Check if user is trip admin

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-blue-500" />
          Trip Basecamp
          <span className="text-xs text-muted-foreground ml-auto">
            <Users className="h-3 w-3 inline mr-1" />
            Shared by all
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!tripBasecamp && !isEditing ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Set Trip Basecamp</h3>
            <p className="text-muted-foreground mb-4">
              Choose a central location for your trip. This will be visible to all trip members.
            </p>
            {isAdmin && (
              <Button onClick={handleEdit} className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Set Basecamp
              </Button>
            )}
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="basecamp-name">Basecamp Name</Label>
              <Input
                id="basecamp-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Downtown Chicago, Santa Monica, Aspen Resort"
              />
            </div>
            
            <div>
              <Label htmlFor="basecamp-address">Address *</Label>
              <Textarea
                id="basecamp-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter the basecamp address..."
                rows={3}
              />
            </div>

            {basecampError && (
              <div className="text-sm text-red-500">
                Error updating basecamp: {basecampError.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                disabled={isUpdatingBasecamp || !formData.name.trim() || !formData.address.trim()}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdatingBasecamp ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="outline"
                disabled={isUpdatingBasecamp}
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
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{tripBasecamp.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tripBasecamp.address}
                </p>
                {tripBasecamp.latitude && tripBasecamp.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {tripBasecamp.latitude.toFixed(4)}, {tripBasecamp.longitude.toFixed(4)}
                  </p>
                )}
              </div>
              {isAdmin && (
                <Button
                  onClick={handleEdit}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
              🌍 This is the shared basecamp for all trip members
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
