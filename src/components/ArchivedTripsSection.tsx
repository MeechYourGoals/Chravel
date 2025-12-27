import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { getArchivedTrips, restoreTrip, getHiddenTrips, unhideTrip } from '../services/archiveService';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, Calendar, MapPin, Users, Archive, Eye, EyeOff, Crown, Lock } from 'lucide-react';
import { EnhancedEmptyState } from './ui/enhanced-empty-state';
import { format } from 'date-fns';
import { useDemoMode } from '../hooks/useDemoMode';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';
import { demoModeService } from '../services/demoModeService';
import { tripsData } from '../data/tripsData';

type TabType = 'archived' | 'hidden';

// Helper to convert tripsData format to archived/hidden display format
const convertTripToDisplayFormat = (trip: typeof tripsData[0]) => ({
  id: trip.id.toString(),
  name: trip.title,
  destination: trip.location,
  start_date: trip.dateRange.split(' - ')[0],
  end_date: trip.dateRange.split(' - ')[1] || trip.dateRange.split(' - ')[0],
  description: trip.description,
  participants: trip.participants.map(p => ({ id: p.id.toString() }))
});

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
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();
  const { tier, upgradeToTier, isLoading: isUpgrading } = useConsumerSubscription();
  const [archivedTrips, setArchivedTrips] = useState<{ consumer: any[]; pro: any[]; events: any[]; total: number }>({ consumer: [], pro: [], events: [], total: 0 });
  const [hiddenTrips, setHiddenTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Counter to force re-renders when session state changes in demo mode
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Free users can see archived trips but cannot restore them without upgrading
  const isFreeUser = tier === 'free';
  const canRestoreTrips = !isFreeUser;

  // Helper to force refresh of trips list
  const refreshTrips = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  const loadTrips = useCallback(async () => {
    setIsLoading(true);

    // Demo mode: use session-scoped state from demoModeService
    if (isDemoMode) {
      // Get session-archived trip IDs and find matching trips from tripsData
      const archivedIds = demoModeService.getSessionArchivedTripIds();
      const hiddenIds = demoModeService.getSessionHiddenTripIds();

      // Convert tripsData trips to display format for those that are archived/hidden
      const archivedConsumerTrips = tripsData
        .filter(trip => archivedIds.includes(trip.id.toString()))
        .map(convertTripToDisplayFormat);

      const hiddenTripsList = tripsData
        .filter(trip => hiddenIds.includes(trip.id.toString()))
        .map(trip => ({
          ...convertTripToDisplayFormat(trip),
          is_hidden: true
        }));

      setArchivedTrips({
        consumer: archivedConsumerTrips,
        pro: [],
        events: [],
        total: archivedConsumerTrips.length
      });
      setHiddenTrips(hiddenTripsList);
      setIsLoading(false);
      return;
    }

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
  }, [isDemoMode]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips, confirmDialog.isOpen, refreshCounter]);

  const handleRestoreClick = async (tripId: string, tripTitle: string, tripType: 'consumer' | 'pro' | 'event') => {
    // Demo mode: session-scoped restore
    if (isDemoMode) {
      demoModeService.unarchiveTripSession(tripId);
      toast({
        title: "Trip restored",
        description: `"${tripTitle}" has been restored to your trips list.`,
      });
      refreshTrips();
      return;
    }

    // Free users cannot restore - show upgrade prompt
    if (isFreeUser) {
      toast({
        title: "Upgrade to Restore",
        description: "Upgrade to Explorer or Frequent Chraveler to restore archived trips and unlock unlimited trips.",
        action: {
          label: 'View Plans',
          onClick: () => { window.location.href = '/settings'; }
        }
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await restoreTrip(tripId, tripType, user.id);

      // Invalidate trips query cache so main list updates immediately
      queryClient.invalidateQueries({ queryKey: ['trips'] });

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
    // Demo mode: session-scoped unhide
    if (isDemoMode) {
      demoModeService.unhideTripSession(tripId);
      toast({
        title: "Trip unhidden",
        description: `"${tripName}" is now visible in your trips list.`,
      });
      refreshTrips();
      return;
    }

    try {
      await unhideTrip(tripId);

      // Invalidate trips query cache so main list updates immediately
      queryClient.invalidateQueries({ queryKey: ['trips'] });

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
    <Card key={`${type}-${trip.id}`} className={`bg-card border-border ${isFreeUser ? 'opacity-80' : ''}`}>
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
            {isFreeUser && (
              <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/30">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {trip.description || 'No description'}
          </p>
          {isFreeUser ? (
            <Button
              variant="outline"
              onClick={() => upgradeToTier('explorer', 'monthly')}
              disabled={isUpgrading}
              className="ml-4 flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/30 hover:bg-amber-500/30 min-h-[44px]"
            >
              <Crown className="h-4 w-4 text-amber-400" />
              {isUpgrading ? 'Processing...' : 'Upgrade to Restore'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({
                isOpen: true,
                tripId: trip.id.toString(),
                tripTitle: trip.name || trip.title || 'Untitled Trip',
                tripType: type
              })}
              className="ml-4 flex items-center gap-2 min-h-[44px]"
            >
              <ArchiveRestore className="h-4 w-4" />
              Restore
            </Button>
          )}
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
            onClick={() => handleUnhideClick(trip.id, trip.name || 'Untitled Trip')}
            className="ml-4 flex items-center gap-2 min-h-[44px]"
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
          {/* Upgrade banner for free users with archived trips */}
          {isFreeUser && hasArchivedTrips && (
            <Card className="bg-gradient-to-r from-amber-900/30 to-amber-800/30 border-amber-500/30">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 flex-shrink-0">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-amber-100">Your trips are safe!</h4>
                      <p className="text-sm text-amber-200/70">
                        Upgrade to unlock {archivedTrips.total} archived trip{archivedTrips.total !== 1 ? 's' : ''} and get unlimited active trips.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => upgradeToTier('explorer', 'monthly')}
                    disabled={isUpgrading}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white min-h-[44px] w-full sm:w-auto"
                  >
                    {isUpgrading ? 'Processing...' : 'Upgrade Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
              description="Trips you archive will appear here. Free users can archive trips to stay within the 3-trip limit — upgrade anytime to restore them!"
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
