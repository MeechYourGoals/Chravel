import React, { useState } from 'react';
import { Archive, Calendar, MapPin, Users, Search } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useDemoMode } from '../hooks/useDemoMode';
import { tripsData } from '../data/tripsData';
import { proTripMockData } from '../data/proTripMockData';
import { eventsMockData } from '../data/eventsMockData';
import { useNavigate } from 'react-router-dom';
import { EmptyStateWithDemo } from '../components/EmptyStateWithDemo';

const ArchivePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { isDemoMode } = useDemoMode();

  // Get archived trips (trips where end date has passed)
  const getArchivedTrips = () => {
    // Only return trips if demo mode is enabled
    if (!isDemoMode) {
      return [];
    }

    const archived = [];

    // Regular trips
    tripsData.forEach(trip => {
      const endDate = new Date(trip.dateRange.split(' - ')[1]);
      if (endDate < new Date()) {
        archived.push({
          ...trip,
          type: 'trip',
          deepLink: `/trip/${trip.id}`,
        });
      }
    });

    // Pro trips
    Object.values(proTripMockData).forEach(trip => {
      const endDate = new Date(trip.dateRange.split(' - ')[1]);
      if (endDate < new Date()) {
        archived.push({
          ...trip,
          type: 'pro',
          deepLink: `/tour/pro/${trip.id}`,
        });
      }
    });

    // Events
    Object.values(eventsMockData).forEach(event => {
      const endDate = new Date(event.dateRange.split(' - ')[1]);
      if (endDate < new Date()) {
        archived.push({
          ...event,
          type: 'event',
          deepLink: `/event/${event.id}`,
        });
      }
    });

    return archived.filter(
      item =>
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const archivedTrips = getArchivedTrips();

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'pro':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pro</Badge>;
      case 'event':
        return <Badge className="bg-purple-500/20 text-purple-400">Event</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400">Trip</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Archive size={28} className="text-gray-400" />
          <h1 className="text-2xl font-bold">Trip Archive</h1>
        </div>
        <p className="text-gray-400">View and manage your completed trips</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
        <Input
          type="text"
          placeholder="Search archived trips..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-900/80 border-gray-700 text-white placeholder-gray-400 h-12"
        />
      </div>

      {/* Archived Trips */}
      <div className="space-y-3">
        {!isDemoMode ? (
          <EmptyStateWithDemo
            icon={Archive}
            title="No archived trips"
            description="Turn on Demo Mode to view sample archived trips"
            showDemoPrompt={true}
          />
        ) : archivedTrips.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Archive size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No archived trips found</h3>
            <p>Your completed trips will appear here</p>
          </div>
        ) : (
          archivedTrips.map(trip => (
            <div
              key={`${trip.type}-${trip.id}`}
              onClick={() => navigate(trip.deepLink)}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{trip.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      {trip.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {trip.dateRange}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      {trip.participants?.length || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {getTypeBadge(trip.type)}
                <Badge className="bg-gray-500/20 text-gray-400">
                  <Archive size={12} className="mr-1" />
                  Archived
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ArchivePage;
