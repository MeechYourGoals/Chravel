import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Bell, BellOff, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/useAuth';
import { Session } from '../../types/events';

interface ScheduleItem {
  id: string;
  session_id: string;
  session_title: string;
  notification_preference: number;
  reminder_sent: boolean;
}

interface PersonalizedAgendaProps {
  eventId: string;
  sessions: Session[];
}

export const PersonalizedAgenda = ({ eventId, sessions }: PersonalizedAgendaProps) => {
  const [mySchedule, setMySchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      // Mock schedule data
      setMySchedule([
        {
          id: '1',
          session_id: sessions[0]?.id || 'session1',
          session_title: sessions[0]?.title || 'AI Innovation Keynote',
          notification_preference: 15,
          reminder_sent: false,
        },
      ]);
      setIsLoading(false);
    }
  }, [user, eventId, sessions]);

  const fetchMySchedule = async () => {
    // Mock implementation
  };

  const addToSchedule = async (session: Session) => {
    if (!user) return;

    try {
      const newScheduleItem: ScheduleItem = {
        id: Date.now().toString(),
        session_id: session.id,
        session_title: session.title,
        notification_preference: 15,
        reminder_sent: false,
      };

      setMySchedule(prev => [...prev, newScheduleItem]);

      toast({
        title: 'Added to schedule',
        description: `${session.title} has been added to your personal agenda.`,
      });
    } catch (error) {
      console.error('Error adding to schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to add session to schedule.',
        variant: 'destructive',
      });
    }
  };

  const removeFromSchedule = async (scheduleId: string, sessionTitle: string) => {
    try {
      setMySchedule(prev => prev.filter(item => item.id !== scheduleId));

      toast({
        title: 'Removed from schedule',
        description: `${sessionTitle} has been removed from your agenda.`,
      });
    } catch (error) {
      console.error('Error removing from schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove session from schedule.',
        variant: 'destructive',
      });
    }
  };

  const updateNotificationPreference = async (scheduleId: string, minutes: number) => {
    try {
      setMySchedule(prev =>
        prev.map(item =>
          item.id === scheduleId ? { ...item, notification_preference: minutes } : item,
        ),
      );
    } catch (error) {
      console.error('Error updating notification preference:', error);
    }
  };

  const getSessionDetails = (sessionId: string) => {
    return sessions.find(s => s.id === sessionId);
  };

  const isSessionInSchedule = (sessionId: string) => {
    return mySchedule.some(item => item.session_id === sessionId);
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <Calendar size={48} className="text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Please log in to create your personalized agenda.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-glass-orange border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading your agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar size={24} className="text-glass-orange" />
        <h3 className="text-xl font-bold text-white">My Personal Agenda</h3>
        <span className="bg-glass-orange/20 text-glass-orange px-2 py-1 rounded-full text-sm">
          {mySchedule.length} sessions
        </span>
      </div>

      {/* My Schedule */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Your Scheduled Sessions</h4>

        {mySchedule.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={32} className="text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">No sessions scheduled yet.</p>
            <p className="text-gray-500 text-sm">
              Browse sessions below and add them to your agenda.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mySchedule.map(item => {
              const session = getSessionDetails(item.session_id);
              if (!session) return null;

              return (
                <div key={item.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="text-white font-medium mb-1">{item.session_title}</h5>
                      <div className="text-sm text-gray-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {session.startTime} - {session.endTime}
                        </div>
                        <div>{session.location}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromSchedule(item.id, item.session_title)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-300">Remind me:</span>
                    </div>
                    <Select
                      value={item.notification_preference.toString()}
                      onValueChange={value =>
                        updateNotificationPreference(item.id, parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-32 bg-gray-800/50 border-gray-600 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 min before</SelectItem>
                        <SelectItem value="15">15 min before</SelectItem>
                        <SelectItem value="30">30 min before</SelectItem>
                        <SelectItem value="60">1 hour before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Sessions */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Available Sessions</h4>
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="text-white font-medium mb-1">{session.title}</h5>
                  <p className="text-gray-400 text-sm mb-2">{session.description}</p>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      {session.startTime} - {session.endTime}
                    </div>
                    <div>{session.location}</div>
                  </div>
                </div>

                {isSessionInSchedule(session.id) ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Bell size={14} />
                    Scheduled
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addToSchedule(session)}
                    className="text-glass-orange hover:text-glass-orange/80"
                  >
                    <Plus size={16} className="mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-8">
            <Calendar size={32} className="text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No sessions available.</p>
          </div>
        )}
      </div>
    </div>
  );
};
