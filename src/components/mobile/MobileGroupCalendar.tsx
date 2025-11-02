import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Clock, Users } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { CalendarSkeleton } from './SkeletonLoader';
import { hapticService } from '../../services/hapticService';
import { format } from 'date-fns';
import { CreateEventModal } from './CreateEventModal';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  location?: string;
  participants: number;
  color: string;
}

interface MobileGroupCalendarProps {
  tripId: string;
}

export const MobileGroupCalendar = ({ tripId }: MobileGroupCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'Airport Pickup',
      date: new Date(),
      time: '10:00 AM',
      location: 'JFK Airport',
      participants: 4,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: '2',
      title: 'Hotel Check-in',
      date: new Date(),
      time: '2:00 PM',
      location: 'Grand Hotel NYC',
      participants: 4,
      color: 'from-purple-500 to-purple-600'
    }
  ]);

  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
    }
  });

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 700);
  }, []);

  const handleAddEvent = async () => {
    await hapticService.medium();
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      <PullToRefreshIndicator
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={80}
      />

      {isLoading ? (
        <div className="px-4 py-4">
          <CalendarSkeleton />
        </div>
      ) : (
        <>
          {/* Date Selector - Horizontal scroll */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex overflow-x-auto scrollbar-hide gap-3">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            
            return (
              <button
                key={i}
                onClick={async () => {
                  await hapticService.light();
                  setSelectedDate(date);
                }}
                className={`
                  flex flex-col items-center justify-center
                  min-w-[60px] h-[70px] rounded-xl
                  transition-all duration-200
                  active:scale-95
                  ${
                    isSelected
                      ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'bg-white/10 text-gray-300'
                  }
                `}
              >
                <span className="text-xs font-medium uppercase">
                  {format(date, 'EEE')}
                </span>
                <span className="text-2xl font-bold mt-1">
                  {format(date, 'd')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          <button
            onClick={handleAddEvent}
            className="p-2 bg-blue-600 rounded-lg active:scale-95 transition-transform"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>

        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={48} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No events scheduled</p>
            </div>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                onClick={async () => {
                  await hapticService.light();
                  // Open event details
                }}
                className="w-full bg-white/10 rounded-xl p-4 active:scale-98 transition-transform"
              >
                <div className={`w-1 h-full absolute left-0 top-0 rounded-l-xl bg-gradient-to-b ${event.color}`} />
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-semibold text-left">{event.title}</h4>
                  <span className="text-sm text-gray-400">{event.time}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <MapPin size={14} />
                    <span>{event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users size={14} />
                  <span>{event.participants} attending</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
        </>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        tripId={tripId}
        onEventCreated={(event) => {
          setEvents(prev => [...prev, event]);
        }}
      />
    </div>
  );
};
