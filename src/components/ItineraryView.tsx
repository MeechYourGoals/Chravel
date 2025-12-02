import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, Download, Share2, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { CalendarEvent } from '../types/calendar';

interface ItineraryViewProps {
  events: CalendarEvent[];
  tripName?: string;
}

export const ItineraryView = ({ events, tripName = 'Trip Itinerary' }: ItineraryViewProps) => {
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Group events by day and filter for itinerary
  const itineraryDays = useMemo(() => {
    const filteredEvents = showAllEvents 
      ? events 
      : events.filter(event => event.include_in_itinerary);

    const groupedByDate = filteredEvents.reduce((acc, event) => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {} as Record<string, CalendarEvent[]>);

    return Object.entries(groupedByDate)
      .map(([dateKey, dayEvents]) => ({
        date: new Date(dateKey),
        events: dayEvents.sort((a, b) => a.time.localeCompare(b.time))
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, showAllEvents]);

  const getCategoryIcon = (category: CalendarEvent['event_category']) => {
    const icons = {
      dining: '🍽️',
      lodging: '🏨',
      activity: '🎯',
      transportation: '🚗',
      entertainment: '🎭',
      other: '📅'
    };
    return icons[category] || '📅';
  };

  const getCategoryColor = (category: CalendarEvent['event_category']) => {
    const colors = {
      dining: 'bg-red-500/20 text-red-300',
      lodging: 'bg-blue-500/20 text-blue-300',
      activity: 'bg-green-500/20 text-green-300',
      transportation: 'bg-yellow-500/20 text-yellow-300',
      entertainment: 'bg-purple-500/20 text-purple-300',
      other: 'bg-slate-500/20 text-slate-300'
    };
    return colors[category] || 'bg-slate-500/20 text-slate-300';
  };

  const handleExportPDF = () => {
    // Implement PDF export using html2canvas + jsPDF
  };

  const handleShare = () => {
    // Implement sharing functionality
    if (navigator.share) {
      navigator.share({
        title: tripName,
        text: 'Check out our trip itinerary!',
        url: window.location.href
      });
    }
  };

  if (itineraryDays.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Itinerary Events</h3>
          <p className="text-slate-400 mb-4">
            {showAllEvents 
              ? 'No events have been added to the calendar yet.'
              : 'No events are marked for inclusion in the itinerary.'
            }
          </p>
          <Button
            variant="outline"
            onClick={() => setShowAllEvents(!showAllEvents)}
          >
            {showAllEvents ? 'Show Only Itinerary Events' : 'Show All Events'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{tripName}</h2>
          <p className="text-slate-400 text-sm">
            {itineraryDays.length} {itineraryDays.length === 1 ? 'day' : 'days'} • {' '}
            {itineraryDays.reduce((acc, day) => acc + day.events.length, 0)} events
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllEvents(!showAllEvents)}
          >
            {showAllEvents ? 'Itinerary Only' : 'All Events'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 size={16} className="mr-1" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download size={16} className="mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {itineraryDays.map((day, dayIndex) => (
          <Card key={day.date.toISOString()} className="bg-slate-800/30 border-slate-700/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                  {dayIndex + 1}
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {format(day.date, 'EEEE, MMMM d')}
                  </div>
                  <div className="text-sm text-slate-400">
                    {day.events.length} {day.events.length === 1 ? 'event' : 'events'}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {day.events.map((event, eventIndex) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700/30"
                >
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    {eventIndex < day.events.length - 1 && (
                      <div className="w-0.5 h-8 bg-slate-600 mt-2"></div>
                    )}
                  </div>
                  
                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(event.event_category)}</span>
                        <h4 className="font-semibold text-white">{event.title}</h4>
                        <Badge className={cn('text-xs', getCategoryColor(event.event_category))}>
                          {event.event_category}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-400 flex items-center gap-1">
                        <Clock size={14} />
                        {event.time}
                      </div>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-1 text-sm text-slate-400 mb-2">
                        <MapPin size={14} />
                        {event.location}
                      </div>
                    )}
                    
                    {event.description && (
                      <p className="text-sm text-slate-300">{event.description}</p>
                    )}
                    
                    {event.source_data?.confirmation_number && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          Confirmation: {event.source_data.confirmation_number}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};