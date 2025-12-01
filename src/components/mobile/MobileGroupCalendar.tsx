import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { CalendarSkeleton } from './SkeletonLoader';
import { hapticService } from '../../services/hapticService';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isSameMonth } from 'date-fns';
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
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
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

  // Generate calendar days for the current month view
  const generateCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDay = start.getDay(); // 0 = Sunday
    const totalDays = end.getDate();
    
    const days: Date[] = [];
    
    // Add padding days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(start);
      date.setDate(date.getDate() - i - 1);
      days.push(date);
    }
    
    // Add all days of current month
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    
    // Add padding days for next month to complete grid (6 weeks max)
    while (days.length < 42) {
      const lastDate = days[days.length - 1];
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);
      days.push(nextDate);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handlePreviousMonth = async () => {
    await hapticService.light();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = async () => {
    await hapticService.light();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateSelect = async (date: Date) => {
    await hapticService.light();
    setSelectedDate(date);
  };

  const eventsForSelectedDate = events.filter(event => 
    isSameDay(event.date, selectedDate)
  );

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
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-white/10 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            <h3 className="text-lg font-semibold text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white/10 rounded-lg active:scale-95 transition-all"
            >
              <ChevronRight size={20} className="text-white" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="px-4 py-4 border-b border-white/10">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const hasEvents = events.some(e => isSameDay(e.date, date));
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(date)}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center text-sm
                      transition-all duration-200 active:scale-95
                      ${isCurrentMonth ? 'text-white' : 'text-gray-600'}
                      ${isSelected 
                        ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg' 
                        : isToday 
                        ? 'bg-blue-500/20 border border-blue-500/50' 
                        : 'hover:bg-white/10'
                      }
                    `}
                  >
                    <span className="font-medium">{format(date, 'd')}</span>
                    {hasEvents && (
                      <div className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Events List for Selected Date */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h3>
              <button
                onClick={handleAddEvent}
                className="p-2 bg-blue-600 rounded-lg active:scale-95 transition-transform"
              >
                <Plus size={20} className="text-white" />
              </button>
            </div>

            <div className="space-y-3">
              {eventsForSelectedDate.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={48} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No events scheduled</p>
                  <button
                    onClick={handleAddEvent}
                    className="mt-4 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Add an event
                  </button>
                </div>
              ) : (
                eventsForSelectedDate.map((event) => (
                  <button
                    key={event.id}
                    onClick={async () => {
                      await hapticService.light();
                      // Open event details
                    }}
                    className="w-full bg-white/10 rounded-xl p-4 active:scale-98 transition-transform relative"
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
