import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { CalendarEventModal } from './CalendarEventModal';
import { AddToCalendarData } from '../types/calendar';

interface DetectedEvent {
  id: string;
  title: string;
  date?: Date;
  time?: string;
  location?: string;
  category: 'dining' | 'lodging' | 'activity' | 'transportation' | 'entertainment' | 'other';
  confidence: number;
  source_text: string;
  confirmation_number?: string;
}

interface AICalendarDetectorProps {
  messageText?: string;
  fileContent?: string;
  onEventAdded?: (eventData: AddToCalendarData) => void;
  onDismiss?: () => void;
}

export const AICalendarDetector = ({
  messageText,
  fileContent,
  onEventAdded,
  onDismiss
}: AICalendarDetectorProps) => {
  const [detectedEvents, setDetectedEvents] = useState<DetectedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DetectedEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const detect = async () => {
      setIsLoading(true);
      try {
        const mockDetection = await simulateAIDetection(messageText || JSON.stringify(fileContent));
        setDetectedEvents(mockDetection);
      } catch (error) {
        console.error('Error detecting events:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (messageText || fileContent) {
      detect();
    }
  }, [messageText, fileContent]);


  const simulateAIDetection = async (text: string): Promise<DetectedEvent[]> => {
    // Mock AI detection logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const events: DetectedEvent[] = [];
    
    // Look for dining reservations
    if (text.toLowerCase().includes('reservation') || text.toLowerCase().includes('restaurant')) {
      events.push({
        id: '1',
        title: 'Dinner Reservation',
        date: new Date(2025, 6, 20),
        time: '19:00',
        location: 'Restaurant Name',
        category: 'dining',
        confidence: 0.9,
        source_text: text,
        confirmation_number: 'RES123456'
      });
    }
    
    // Look for flight confirmations
    if (text.toLowerCase().includes('flight') || text.toLowerCase().includes('airline')) {
      events.push({
        id: '2',
        title: 'Flight Departure',
        date: new Date(2025, 6, 18),
        time: '08:30',
        location: 'Airport Terminal',
        category: 'transportation',
        confidence: 0.95,
        source_text: text,
        confirmation_number: 'FL789ABC'
      });
    }
    
    // Look for hotel bookings
    if (text.toLowerCase().includes('hotel') || text.toLowerCase().includes('check-in')) {
      events.push({
        id: '3',
        title: 'Hotel Check-in',
        date: new Date(2025, 6, 18),
        time: '15:00',
        location: 'Hotel Name',
        category: 'lodging',
        confidence: 0.85,
        source_text: text
      });
    }
    
    return events;
  };

  const handleAddToCalendar = (event: DetectedEvent) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleEventAdded = (eventData: AddToCalendarData) => {
    onEventAdded?.(eventData);
    setShowModal(false);
    // Remove the detected event from the list
    setDetectedEvents(prev => prev.filter(e => e.id !== selectedEvent?.id));
  };

  const handleDismissEvent = (eventId: string) => {
    setDetectedEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleDismissAll = () => {
    setDetectedEvents([]);
    onDismiss?.();
  };

  if (isLoading) {
    return (
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-blue-300 text-sm">Analyzing message for calendar events...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (detectedEvents.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="bg-green-500/10 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-green-400" />
              <span className="text-green-300 font-medium">
                {detectedEvents.length === 1 
                  ? 'Calendar event detected!' 
                  : `${detectedEvents.length} calendar events detected!`
                }
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismissAll}
              className="text-slate-400 hover:text-white p-1"
            >
              <X size={16} />
            </Button>
          </div>
          
          <div className="space-y-2">
            {detectedEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{event.title}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        event.confidence > 0.9 ? 'border-green-500 text-green-300' : 
                        event.confidence > 0.7 ? 'border-yellow-500 text-yellow-300' : 
                        'border-red-500 text-red-300'
                      }`}
                    >
                      {Math.round(event.confidence * 100)}% confident
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    {event.date && format(event.date, 'MMM d')} • {event.time} • {event.location}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddToCalendar(event)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check size={14} className="mr-1" />
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissEvent(event.id)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedEvent && (
        <CalendarEventModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onEventAdded={handleEventAdded}
          prefilledData={{
            title: selectedEvent.title,
            date: selectedEvent.date || new Date(),
            time: selectedEvent.time || '',
            location: selectedEvent.location || '',
            category: selectedEvent.category,
            include_in_itinerary: true
          }}
        />
      )}
    </>
  );
};