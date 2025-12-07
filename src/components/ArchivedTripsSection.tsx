import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { getArchivedTrips, restoreTrip, getHiddenTrips, unhideTrip } from '../services/archiveService';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';
import { ArchiveRestore, Calendar, MapPin, Users, Archive, Eye, EyeOff } from 'lucide-react';
import { EnhancedEmptyState } from './ui/enhanced-empty-state';
import { format } from 'date-fns';

type TabType = 'archived' | 'hidden';

export const ArchivedTripsSection = () => {
  const [activeTab, setActiveTab] = useState<TabType>('archived');
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
  const [hiddenTrips, setHiddenTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrips = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Load archived trips
      const archived = await getArchivedTrips(user.id);
      setArchivedTrips(archived);

      // Load hidden trips
      const hidden = await getHiddenTrips(user.id);
      setHiddenTrips(hidden || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [confirmDialog.isOpen]);

  const handleRestoreClick = async (tripId: string, tripTitle: string, tripType: 'consumer' | 'pro' | 'event') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await restoreTrip(tripId, tripType, user.id);
      
      toast({
        title: "Trip restored",
        description: `"${tripTitle}" has been restored to your trips list.`,
      });
      
      loadTrips();
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

  const handleUnhideClick = async (tripId: string, tripName: string) => {
    try {
      await unhideTrip(tripId);
      toast({
        title: "Trip unhidden",
        description: `"${tripName}" is now visible in your trips list.`,
      });
      loadTrips();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unhide trip",
        variant: "destructive"
      });
    }
  };

  const handleConfirmRestore = () => {
    handleRestoreClick(confirmDialog.tripId, confirmDialog.tripTitle, confirmDialog.tripType);
  };

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate) return 'No dates';
    try {
      const start = format(new Date(startDate), 'MMM d');
      const end = endDate ? format(new Date(endDate), 'MMM d, yyyy') : '';
      return end ? `${start} - ${end}` : start;
    } catch {
      return 'Invalid date';
    }
  };

  const renderArchivedTripCard = (trip: any, type: 'consumer' | 'pro' | 'event') => (
    <Card key={`${type}-${trip.id}`} className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground mb-2">
              {trip.name || trip.title || 'Untitled Trip'}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {trip.destination || trip.location || 'No location'}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDateRange(trip.start_date, trip.end_date)}
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
            {trip.description || 'No description'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDialog({
              isOpen: true,
              tripId: trip.id.toString(),
              tripTitle: trip.name || trip.title || 'Untitled Trip',
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

  const renderHiddenTripCard = (trip: any) => (
    <Card key={`hidden-${trip.id}`} className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground mb-2">
              {trip.name || 'Untitled Trip'}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {trip.destination || 'No location'}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDateRange(trip.start_date, trip.end_date)}
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs bg-muted">
            <EyeOff className="h-3 w-3 mr-1" />
            Hidden
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {trip.description || 'No description'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUnhideClick(trip.id, trip.name || 'Untitled Trip')}
            className="ml-4 flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Unhide
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const hasArchivedTrips = archivedTrips.total > 0;
  const hasHiddenTrips = hiddenTrips.length > 0;

  if (!hasArchivedTrips && !hasHiddenTrips && !isLoading) {
    return (
      <EnhancedEmptyState
        icon={Archive}
        title="No archived or hidden trips"
        description="Trips you archive or hide will appear here. You can archive trips to keep your main list organized while preserving access to old trips."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'archived'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Archive className="h-4 w-4" />
          Archived ({archivedTrips.total})
        </button>
        <button
          onClick={() => setActiveTab('hidden')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'hidden'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <EyeOff className="h-4 w-4" />
          Hidden ({hiddenTrips.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'archived' ? (
        <div className="space-y-4">
          {hasArchivedTrips ? (
            <div className="grid gap-4">
              {archivedTrips.consumer.map(trip => renderArchivedTripCard(trip, 'consumer'))}
              {archivedTrips.pro.map(trip => renderArchivedTripCard(trip, 'pro'))}
              {archivedTrips.events.map(event => renderArchivedTripCard(event, 'event'))}
            </div>
          ) : (
            <EnhancedEmptyState
              icon={Archive}
              title="No archived trips"
              description="Trips you archive will appear here."
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {hasHiddenTrips ? (
            <div className="grid gap-4">
              {hiddenTrips.map(trip => renderHiddenTripCard(trip))}
            </div>
          ) : (
            <EnhancedEmptyState
              icon={EyeOff}
              title="No hidden trips"
              description="Trips you hide will appear here. Hidden trips are kept private but remain accessible."
            />
          )}
        </div>
      )}

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
