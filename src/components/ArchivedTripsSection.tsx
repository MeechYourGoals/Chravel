import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { getArchivedTrips, restoreTrip } from '../services/archiveService';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';
import { ArchiveRestore, Calendar, MapPin, Users, Archive } from 'lucide-react';
import { EnhancedEmptyState } from './ui/enhanced-empty-state';

export const ArchivedTripsSection = () => {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    tripId: string;
    tripTitle: string;
    tripType: 'consumer' | 'pro' | 'event';
  }>({
    isOpen: false,
    tripId: '',
    tripTitle: '',
    tripType: 'consumer'
  });
  
  const { toast } = useToast();
  const [archivedTrips, setArchivedTrips] = useState<{ consumer: any[]; pro: any[]; events: any[]; total: number }>({ consumer: [], pro: [], events: [], total: 0 });

  useEffect(() => {
    const loadArchivedTrips = async () => {
      const trips = await getArchivedTrips();
      setArchivedTrips(trips);
    };
    loadArchivedTrips();
  }, [confirmDialog.isOpen]);

  const handleRestoreClick = async (tripId: string, tripTitle: string, tripType: 'consumer' | 'pro' | 'event') => {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await restoreTrip(tripId, tripType, user.id);
      
      toast({
        title: "Trip restored",
        description: `"${tripTitle}" has been restored to your trips list.`,
      });
      
      // Force re-render by updating state
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      if (error instanceof Error && error.message === 'TRIP_LIMIT_REACHED') {
        toast({
          title: "Trip Limit Reached",
          description: "You have 3 active trips (free tier limit). Archive a trip or upgrade to Explorer for unlimited trips.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to restore trip",
          variant: "destructive"
        });
      }
    }
  };

  const handleConfirmRestore = () => {
    handleRestoreClick(confirmDialog.tripId, confirmDialog.tripTitle, confirmDialog.tripType);
  };

  const renderTripCard = (trip: any, type: 'consumer' | 'pro' | 'event') => (
    <Card key={`${type}-${trip.id}`} className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground mb-2">
              {trip.title}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {trip.location}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {trip.dateRange}
              </div>
              {trip.participants && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {trip.participants.length}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {type === 'consumer' ? 'Personal' : type === 'pro' ? 'Professional' : 'Event'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {trip.description}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDialog({
              isOpen: true,
              tripId: trip.id.toString(),
              tripTitle: trip.title,
              tripType: type
            })}
            className="ml-4 flex items-center gap-2"
          >
            <ArchiveRestore className="h-4 w-4" />
            Restore
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (archivedTrips.total === 0) {
    return (
      <EnhancedEmptyState
        icon={Archive}
        title="No archived trips"
        description="Trips you archive will appear here. You can archive trips to keep your main list organized while preserving access to old trips."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Archived Trips</h3>
          <p className="text-sm text-muted-foreground">
            {archivedTrips.total} archived trip{archivedTrips.total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Consumer trips */}
        {archivedTrips.consumer.map(trip => renderTripCard(trip, 'consumer'))}
        
        {/* Pro trips */}
        {archivedTrips.pro.map(trip => renderTripCard(trip, 'pro'))}
        
        {/* Events */}
        {archivedTrips.events.map(event => renderTripCard(event, 'event'))}
      </div>

      <ArchiveConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmRestore}
        tripTitle={confirmDialog.tripTitle}
        isArchiving={false}
      />
    </div>
  );
};