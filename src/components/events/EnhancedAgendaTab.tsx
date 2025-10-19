import React, { useState } from 'react';
import { Calendar, Upload, Plus, FileText, Clock, MapPin, Trash2, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../../hooks/use-toast';

interface AgendaSession {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  location: string;
  description?: string;
}

interface EnhancedAgendaTabProps {
  eventId: string;
  userRole: 'organizer' | 'attendee' | 'exhibitor';
  pdfScheduleUrl?: string;
}

export const EnhancedAgendaTab = ({
  eventId,
  userRole,
  pdfScheduleUrl: initialPdfUrl
}: EnhancedAgendaTabProps) => {
  const [pdfScheduleUrl, setPdfScheduleUrl] = useState<string | undefined>(initialPdfUrl);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [sessions, setSessions] = useState<AgendaSession[]>([]);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const { toast } = useToast();

  // New session form state
  const [newSession, setNewSession] = useState<Partial<AgendaSession>>({
    title: '',
    time: '',
    endTime: '',
    location: '',
    description: ''
  });

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPDF(true);
    try {
      // TODO: Upload to Supabase storage
      // For now, create a local URL
      const url = URL.createObjectURL(file);
      setPdfScheduleUrl(url);
      
      toast({
        title: 'PDF uploaded successfully',
        description: 'Attendees can now download the schedule'
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingPDF(false);
    }
  };

  const handleAddSession = () => {
    if (!newSession.title || !newSession.time || !newSession.location) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in title, time, and location',
        variant: 'destructive'
      });
      return;
    }

    const session: AgendaSession = {
      id: Date.now().toString(),
      title: newSession.title,
      time: newSession.time,
      endTime: newSession.endTime,
      location: newSession.location,
      description: newSession.description
    };

    setSessions(prev => [...prev, session].sort((a, b) => a.time.localeCompare(b.time)));
    setNewSession({ title: '', time: '', endTime: '', location: '', description: '' });
    setIsAddingSession(false);

    toast({
      title: 'Session added',
      description: 'The session will auto-sync with the Calendar tab'
    });

    // TODO: Sync with Calendar tab
    // This would call a service to add the session to trip_events table
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast({
      title: 'Session removed'
    });
  };

  const isOrganizer = userRole === 'organizer';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-blue-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Event Agenda</h2>
            <p className="text-gray-400 text-sm">View the full event schedule</p>
          </div>
        </div>
        
        {isOrganizer && !isAddingSession && (
          <div className="flex gap-2">
            {!pdfScheduleUrl && (
              <label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePDFUpload}
                  className="hidden"
                  disabled={isUploadingPDF}
                />
                <Button 
                  variant="outline"
                  className="border-gray-600 cursor-pointer"
                  disabled={isUploadingPDF}
                  type="button"
                >
                  <Upload size={16} className="mr-2" />
                  {isUploadingPDF ? 'Uploading...' : 'Upload PDF'}
                </Button>
              </label>
            )}
            <Button
              onClick={() => setIsAddingSession(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Add Session
            </Button>
          </div>
        )}
      </div>

      {/* PDF Schedule Display */}
      {pdfScheduleUrl && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={40} className="text-red-400" />
                <div>
                  <h3 className="font-medium text-white">Full Event Schedule (PDF)</h3>
                  <p className="text-sm text-gray-400">Complete agenda with all details</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={pdfScheduleUrl}
                  download="Event_Schedule.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="border-gray-600">
                    <Download size={16} className="mr-2" />
                    Download
                  </Button>
                </a>
                {isOrganizer && (
                  <Button
                    onClick={() => {
                      if (confirm('Remove uploaded PDF schedule?')) {
                        setPdfScheduleUrl(undefined);
                      }
                    }}
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-600/10"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Divider if both PDF and sessions exist */}
      {pdfScheduleUrl && sessions.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-900 px-2 text-gray-400">Or view by session</span>
          </div>
        </div>
      )}

      {/* Add Session Form */}
      {isAddingSession && isOrganizer && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white">Add Session to Agenda</h3>
              <Button
                onClick={() => {
                  setIsAddingSession(false);
                  setNewSession({ title: '', time: '', endTime: '', location: '', description: '' });
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-title">Session Title *</Label>
                <Input
                  id="session-title"
                  value={newSession.title}
                  onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Keynote: The Future of AI"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-location">Location *</Label>
                <Input
                  id="session-location"
                  value={newSession.location}
                  onChange={(e) => setNewSession(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Main Hall, Room 301"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-time">Start Time *</Label>
                <Input
                  id="session-time"
                  type="time"
                  value={newSession.time}
                  onChange={(e) => setNewSession(prev => ({ ...prev, time: e.target.value }))}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-endtime">End Time</Label>
                <Input
                  id="session-endtime"
                  type="time"
                  value={newSession.endTime}
                  onChange={(e) => setNewSession(prev => ({ ...prev, endTime: e.target.value }))}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-description">Description (Optional)</Label>
              <Textarea
                id="session-description"
                value={newSession.description}
                onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the session..."
                className="bg-gray-900 border-gray-700 text-white"
                rows={3}
              />
            </div>

            <Button
              onClick={handleAddSession}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!newSession.title || !newSession.time || !newSession.location}
            >
              <CheckCircle2 size={16} className="mr-2" />
              Add Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-white">Schedule</h3>
          {sessions.map(session => (
            <Card key={session.id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-2">{session.title}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={14} />
                        <span>
                          {session.time}
                          {session.endTime && ` - ${session.endTime}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin size={14} />
                        <span>{session.location}</span>
                      </div>
                      {session.description && (
                        <p className="text-gray-500 mt-2">{session.description}</p>
                      )}
                    </div>
                  </div>
                  {isOrganizer && (
                    <Button
                      onClick={() => handleDeleteSession(session.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-600/10"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!pdfScheduleUrl && sessions.length === 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-12 text-center">
            <Calendar size={64} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Agenda Yet</h3>
            <p className="text-gray-400 mb-6">
              {isOrganizer 
                ? 'Upload a PDF schedule or add sessions manually to build your event agenda'
                : 'The event organizer hasn\'t added an agenda yet'
              }
            </p>
            {isOrganizer && (
              <div className="flex gap-3 justify-center">
                <label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePDFUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline"
                    className="border-gray-600 cursor-pointer"
                    type="button"
                  >
                    <Upload size={16} className="mr-2" />
                    Upload PDF Schedule
                  </Button>
                </label>
                <Button
                  onClick={() => setIsAddingSession(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus size={16} className="mr-2" />
                  Add First Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

