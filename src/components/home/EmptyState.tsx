import React from 'react';
import { MapPin, Plus } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';

interface EmptyStateProps {
  viewMode: string;
  onCreateTrip: () => void;
}

export const EmptyState = ({ viewMode, onCreateTrip }: EmptyStateProps) => {
  const { isDemoMode } = useDemoMode();

  // If demo mode is on, don't show empty state (mock data will appear)
  if (isDemoMode) {
    return null;
  }

  return (
    <div className="text-center py-16 px-4">
      <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <MapPin size={40} className="text-primary" />
      </div>
      <h3 className="text-2xl font-bold mb-3">
        {viewMode === 'myTrips' ? 'No trips yet' : 'No professional trips yet'}
      </h3>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        {viewMode === 'myTrips'
          ? 'Start planning your next adventure! Create your first trip and invite friends to join.'
          : 'Manage professional trips, tours, and events with advanced collaboration tools.'}
      </p>
      <button
        onClick={onCreateTrip}
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
      >
        <Plus size={20} />
        Create Your First Trip
      </button>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
        <div className="p-4 bg-card rounded-lg border border-border">
          <h4 className="font-semibold mb-2">Collaborate in Real-Time</h4>
          <p className="text-sm text-muted-foreground">
            Plan together with friends, family, or team members with live updates
          </p>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border">
          <h4 className="font-semibold mb-2">Smart Planning</h4>
          <p className="text-sm text-muted-foreground">
            AI-powered itineraries, budget tracking, and automated reminders
          </p>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border">
          <h4 className="font-semibold mb-2">Everything in One Place</h4>
          <p className="text-sm text-muted-foreground">
            Messages, payments, files, and schedules—all organized by trip
          </p>
        </div>
      </div>
    </div>
  );
};
