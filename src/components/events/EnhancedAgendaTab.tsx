import React, { useState, useRef, useCallback } from 'react';
import { Calendar, Upload, Plus, FileText, Clock, MapPin, Trash2, Download, CheckCircle2, User, X, Edit2, Sparkles } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../mobile/PullToRefreshIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { AgendaImportModal } from './AgendaImportModal';
import { useBackgroundAgendaImport } from '@/features/calendar/hooks/useBackgroundAgendaImport';
import { ParsedAgendaSession } from '@/utils/agendaImportParsers';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { useEventAgenda } from '@/hooks/useEventAgenda';
import { EventAgendaItem } from '@/types/events';
import { format, parseISO } from 'date-fns';

interface EnhancedAgendaTabProps {
  eventId: string;
  userRole: 'organizer' | 'attendee' | 'exhibitor';
  pdfScheduleUrl?: string;
  onLineupUpdate?: (speakerNames: string[]) => void;
  existingLineup?: { name: string }[];
}

export const EnhancedAgendaTab = ({
  eventId,
  userRole,
  pdfScheduleUrl: initialPdfUrl,
  onLineupUpdate,
  existingLineup = []
}: EnhancedAgendaTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { sessions, addSession, updateSession, deleteSession, isAdding, isUpdating } = useEventAgenda({ eventId });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['event-agenda', eventId] });
  }, [queryClient, eventId]);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 120,
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const { pendingResult, startImport, clearResult } = useBackgroundAgendaImport();

  const [pdfScheduleUrl, setPdfScheduleUrl] = useState<string | undefined>(initialPdfUrl);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<EventAgendaItem | null>(null);
  const [speakerInput, setSpeakerInput] = useState('');

  // New session form state
  const [newSession, setNewSession] = useState<Partial<EventAgendaItem>>({
    title: '',
    session_date: '',
    start_time: '',
    end_time: '',
    location: '',
    track: '',
    speakers: [],
    description: ''
  });

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPDF(true);
    try {
      const url = URL.createObjectURL(file);
      setPdfScheduleUrl(url);
    } finally {
      setIsUploadingPDF(false);
    }
  };

  const handleAddSpeaker = () => {
    if (speakerInput.trim()) {
      setNewSession(prev => ({
        ...prev,
        speakers: [...(prev.speakers || []), speakerInput.trim()]
      }));
      setSpeakerInput('');
    }
  };

  const handleRemoveSpeaker = (index: number) => {
    setNewSession(prev => ({
      ...prev,
      speakers: prev.speakers?.filter((_, i) => i !== index)
    }));
  };

  const handleSaveSession = async () => {
    if (!newSession.title) return;

    const sessionData = {
      title: newSession.title,
      session_date: newSession.session_date || undefined,
      start_time: newSession.start_time || undefined,
      end_time: newSession.end_time || undefined,
      location: newSession.location || undefined,
      track: newSession.track || undefined,
      speakers: newSession.speakers || [],
      description: newSession.description || undefined,
    };

    try {
      if (editingSession) {
        await updateSession({ ...sessionData, id: editingSession.id });
      } else {
        await addSession(sessionData as Omit<EventAgendaItem, 'id'>);
      }

      // Auto-populate lineup with new speakers
      if (onLineupUpdate && sessionData.speakers && sessionData.speakers.length > 0) {
        onLineupUpdate(sessionData.speakers);
      }
    } catch {
      // Error handled by hook toast
    }

    resetForm();
  };

  const handleEditSession = (session: EventAgendaItem) => {
    setEditingSession(session);
    setNewSession({
      title: session.title,
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      location: session.location,
      track: session.track,
      speakers: session.speakers || [],
      description: session.description
    });
    setIsAddingSession(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
    } catch {
      // Error handled by hook toast
    }
  };

  const resetForm = () => {
    setNewSession({ title: '', session_date: '', start_time: '', end_time: '', location: '', track: '', speakers: [], description: '' });
    setSpeakerInput('');
    setIsAddingSession(false);
    setEditingSession(null);
  };

  const isOrganizer = userRole === 'organizer';

  return (
    <div className="relative p-4 md:p-6 space-y-4 md:space-y-6">
      {(isRefreshing || pullDistance > 0) && (
        <PullToRefreshIndicator
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          threshold={80}
        />
      )}
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Calendar size={24} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">Event Agenda</h2>
            <p className="text-muted-foreground text-sm">View the event agenda and schedule</p>
          </div>
        </div>
        
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
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="flex-1 sm:flex-none border-primary/30 text-primary"
            >
              <Sparkles size={16} className="mr-2" />
              Import Agenda
            </Button>
            <Button onClick={() => setIsAddingSession(true)} className="flex-1 sm:flex-none bg-primary hover:bg-primary/90">
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
                <a href={pdfScheduleUrl} download target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full sm:w-auto border-border">
                    <Download size={16} className="mr-2" />
                    Download
                  </Button>
                </a>
                {isOrganizer && (
                  <Button onClick={() => { if (confirm('Remove uploaded agenda?')) setPdfScheduleUrl(undefined); }} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Divider */}
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

      {/* Add/Edit Session Form */}
      {isAddingSession && isOrganizer && (
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">
                {editingSession ? 'Edit Session' : 'Add Session to Agenda'}
              </h3>
              <Button onClick={resetForm} variant="ghost" size="sm">Cancel</Button>
            </div>

            <div className="space-y-3">
              {/* Row 1: Title */}
              <div className="space-y-2">
                <Label htmlFor="session-title">Session Title *</Label>
                <Input id="session-title" value={newSession.title} onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Keynote: The Future of AI" className="bg-background border-border" />
              </div>

              {/* Row 2: Date, Start Time, End Time */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="session-date">Date</Label>
                  <Input id="session-date" type="date" value={newSession.session_date} onChange={(e) => setNewSession(prev => ({ ...prev, session_date: e.target.value }))} className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-time">Start Time</Label>
                  <Input id="session-time" type="time" value={newSession.start_time} onChange={(e) => setNewSession(prev => ({ ...prev, start_time: e.target.value }))} className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-endtime">End Time</Label>
                  <Input id="session-endtime" type="time" value={newSession.end_time} onChange={(e) => setNewSession(prev => ({ ...prev, end_time: e.target.value }))} className="bg-background border-border" />
                </div>
              </div>

              {/* Row 3: Location, Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="session-location">Location</Label>
                  <Input id="session-location" value={newSession.location} onChange={(e) => setNewSession(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g., Main Hall, Room 301" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-track">Category</Label>
                  <Input id="session-track" value={newSession.track} onChange={(e) => setNewSession(prev => ({ ...prev, track: e.target.value }))} placeholder="e.g., Main Stage, Workshop" className="bg-background border-border" />
                </div>
              </div>

              {/* Row 4: Speakers/Performers */}
              <div className="space-y-2">
                <Label>Speakers/Performers</Label>
                <div className="flex gap-2">
                  <Input value={speakerInput} onChange={(e) => setSpeakerInput(e.target.value)} placeholder="Add speaker name" className="bg-background border-border" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpeaker())} />
                  <Button type="button" onClick={handleAddSpeaker} variant="outline" size="sm">Add</Button>
                </div>
                {newSession.speakers && newSession.speakers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newSession.speakers.map((speaker, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded-full text-xs">
                        <User size={12} />
                        {speaker}
                        <button type="button" onClick={() => handleRemoveSpeaker(index)} className="hover:text-destructive"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 5: Description */}
              <div className="space-y-2">
                <Label htmlFor="session-description">Description (Optional)</Label>
                <Textarea id="session-description" value={newSession.description} onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description of the session..." className="bg-background border-border" rows={2} />
              </div>
            </div>

            <Button onClick={handleSaveSession} className="w-full bg-primary hover:bg-primary/90" disabled={!newSession.title || isAdding || isUpdating}>
              <CheckCircle2 size={16} className="mr-2" />
              {isAdding || isUpdating ? 'Saving...' : editingSession ? 'Update Session' : 'Add Session'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      {sessions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">Schedule</h3>
          {sessions.map(session => (
            <Card key={session.id} className="bg-card/50 border-border hover:bg-card/70 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {session.track && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs mb-1 inline-block">{session.track}</span>
                    )}
                    <h3 className="text-foreground font-medium mb-2 truncate">{session.title}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={14} className="flex-shrink-0" />
                        <span>
                          {session.session_date && (() => {
                            try { return format(parseISO(session.session_date), 'MMM d') + ' — '; }
                            catch { return ''; }
                          })()}
                          {session.start_time}
                          {session.end_time && ` - ${session.end_time}`}
                        </span>
                      </div>
                      {session.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin size={14} className="flex-shrink-0" />
                          <span className="truncate">{session.location}</span>
                        </div>
                      )}
                      {session.speakers && session.speakers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {session.speakers.map((speaker, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                              <User size={10} />{speaker}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {session.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{session.description}</p>
                    )}
                  </div>
                  {isOrganizer && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button onClick={() => handleEditSession(session)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Edit2 size={14} />
                      </Button>
                      <Button onClick={() => handleDeleteSession(session.id)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isAddingSession && (
        <Card className="bg-card/50 border-border">
          <CardContent className="p-8 text-center">
            <Calendar size={48} className="text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Sessions Yet</h3>
            <p className="text-muted-foreground text-sm">
              {isOrganizer ? 'Add sessions to build your event schedule' : 'Sessions will be announced soon'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Agenda Import Modal */}
      <AgendaImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        eventId={eventId}
        onImportSessions={async (importedSessions: ParsedAgendaSession[]) => {
          for (const s of importedSessions) {
            await addSession(s);
          }
        }}
        pendingResult={pendingResult}
        onClearPendingResult={clearResult}
        onStartBackgroundImport={(url) => {
          setShowImportModal(false);
          startImport(url, () => setShowImportModal(true));
        }}
        onLineupUpdate={onLineupUpdate ? (names) => onLineupUpdate(names) : undefined}
      />
    </div>
  );
};
