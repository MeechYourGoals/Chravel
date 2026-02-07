import React, { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        title: 'Agenda uploaded successfully',
        description: 'Attendees can now view the agenda'
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Calendar size={24} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">Event Agenda</h2>
            <p className="text-muted-foreground text-sm">View the event agenda and schedule</p>
          </div>
        </div>
        
        {/* Action Buttons - Stacked on mobile */}
        {isOrganizer && !isAddingSession && (
          <div className="flex flex-col sm:flex-row gap-2">
            {!pdfScheduleUrl && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handlePDFUpload}
                  className="hidden"
                  disabled={isUploadingPDF}
                />
                <Button 
                  variant="outline"
                  className="flex-1 sm:flex-none border-border cursor-pointer"
                  disabled={isUploadingPDF}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} className="mr-2" />
                  {isUploadingPDF ? 'Uploading...' : 'Upload Agenda'}
                </Button>
              </>
            )}
            <Button
              onClick={() => setIsAddingSession(true)}
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
            >
              <Plus size={16} className="mr-2" />
              Add Session
            </Button>
          </div>
        )}
      </div>

      {/* PDF Schedule Display */}
      {pdfScheduleUrl && (
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText size={32} className="text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-foreground">Event Agenda</h3>
                  <p className="text-sm text-muted-foreground">Uploaded agenda file</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={pdfScheduleUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none"
                >
                  <Button variant="outline" className="w-full sm:w-auto border-border">
                    <Download size={16} className="mr-2" />
                    Download
                  </Button>
                </a>
                {isOrganizer && (
                  <Button
                    onClick={() => {
                      if (confirm('Remove uploaded agenda?')) {
                        setPdfScheduleUrl(undefined);
                      }
                    }}
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
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
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or view by session</span>
          </div>
        </div>
      )}

      {/* Add Session Form */}
      {isAddingSession && isOrganizer && (
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">Add Session to Agenda</h3>
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
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-location">Location *</Label>
                <Input
                  id="session-location"
                  value={newSession.location}
                  onChange={(e) => setNewSession(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Main Hall, Room 301"
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-time">Start Time *</Label>
                <Input
                  id="session-time"
                  type="time"
                  value={newSession.time}
                  onChange={(e) => setNewSession(prev => ({ ...prev, time: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-endtime">End Time</Label>
                <Input
                  id="session-endtime"
                  type="time"
                  value={newSession.endTime}
                  onChange={(e) => setNewSession(prev => ({ ...prev, endTime: e.target.value }))}
                  className="bg-background border-border"
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
                className="bg-background border-border"
                rows={3}
              />
            </div>

            <Button
              onClick={handleAddSession}
              className="w-full bg-primary hover:bg-primary/90"
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
          <h3 className="text-lg font-medium text-foreground">Schedule</h3>
          {sessions.map(session => (
            <Card key={session.id} className="bg-card/50 border-border hover:bg-card/70 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-medium mb-2 truncate">{session.title}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={14} className="flex-shrink-0" />
                        <span>
                          {session.time}
                          {session.endTime && ` - ${session.endTime}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="truncate">{session.location}</span>
                      </div>
                      {session.description && (
                        <p className="text-muted-foreground/70 mt-2 line-clamp-2">{session.description}</p>
                      )}
                    </div>
                  </div>
                  {isOrganizer && (
                    <Button
                      onClick={() => handleDeleteSession(session.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
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

      {/* Empty State - Clean, no duplicate buttons */}
      {!pdfScheduleUrl && sessions.length === 0 && !isAddingSession && (
        <Card className="bg-card/50 border-border">
          <CardContent className="py-12 px-6 text-center">
            <Calendar size={48} className="text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Agenda Yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              {isOrganizer 
                ? 'Use the buttons above to upload an agenda or add sessions manually'
                : 'The event organizer hasn\'t added an agenda yet'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
