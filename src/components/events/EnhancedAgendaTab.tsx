import React, { useState, useRef, useCallback } from 'react';
import {
  Calendar,
  Upload,
  Plus,
  FileText,
  Clock,
  MapPin,
  Trash2,
  Download,
  CheckCircle2,
  User,
  X,
  Edit2,
  Sparkles,
  Eye,
  Image,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react';
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
import { useEventAgendaFiles } from '@/hooks/useEventAgendaFiles';
import { EventAgendaItem, AgendaFile } from '@/types/events';
import { formatSessionDateTime } from '@/lib/formatSessionDateTime';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { hasPaidAccess } from '@/utils/paidAccess';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface EnhancedAgendaTabProps {
  eventId: string;
  userRole: 'organizer' | 'attendee' | 'exhibitor';
  initialSessions?: EventAgendaItem[];
  onLineupUpdate?: (speakerNames: string[]) => void;
}

function isPdfMime(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export const EnhancedAgendaTab = ({
  eventId,
  userRole,
  initialSessions = [],
  onLineupUpdate,
}: EnhancedAgendaTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const {
    sessions,
    addSession,
    updateSession,
    deleteSession,
    bulkAddSessions,
    isAdding,
    isUpdating,
  } = useEventAgenda({ eventId, initialSessions });

  const {
    files: agendaFiles,
    isLoading: isLoadingFiles,
    isUploading,
    uploadError,
    loadError,
    clearError,
    uploadFiles,
    deleteFile,
    maxFiles,
    remainingSlots,
    canUpload: canUploadMore,
    formatFileSize,
  } = useEventAgendaFiles({ eventId });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['event-agenda', eventId] });
  }, [queryClient, eventId]);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 120,
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const { pendingResult, startImport, clearResult } = useBackgroundAgendaImport(eventId);

  const [isAddingSession, setIsAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<EventAgendaItem | null>(null);
  const [speakerInput, setSpeakerInput] = useState('');

  // New session form state (Category/track removed per requirements)
  const [newSession, setNewSession] = useState<Partial<EventAgendaItem>>({
    title: '',
    session_date: '',
    start_time: '',
    end_time: '',
    location: '',
    speakers: [],
    description: '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    await uploadFiles(Array.from(selected));

    // Reset file input so the same files can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAgendaFile = async (file: AgendaFile) => {
    await deleteFile(file.storagePath);
  };

  const handleAddSpeaker = () => {
    if (speakerInput.trim()) {
      setNewSession(prev => ({
        ...prev,
        speakers: [...(prev.speakers || []), speakerInput.trim()],
      }));
      setSpeakerInput('');
    }
  };

  const handleRemoveSpeaker = (index: number) => {
    setNewSession(prev => ({
      ...prev,
      speakers: (prev.speakers ?? []).filter((_, i) => i !== index),
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
      speakers: session.speakers || [],
      description: session.description,
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
    setNewSession({
      title: '',
      session_date: '',
      start_time: '',
      end_time: '',
      location: '',
      speakers: [],
      description: '',
    });
    setSpeakerInput('');
    setIsAddingSession(false);
    setEditingSession(null);
  };

  const isOrganizer = userRole === 'organizer';
  const { tier, subscription, isSuperAdmin } = useConsumerSubscription();
  const hasPaidSmartImport = hasPaidAccess({ tier, status: subscription?.status, isSuperAdmin });

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
            {canUploadMore && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none border-border cursor-pointer"
                  disabled={isUploading}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Upload size={16} className="mr-2" />
                  )}
                  {isUploading
                    ? 'Uploading...'
                    : `Upload Schedule (${agendaFiles.length}/${maxFiles})`}
                </Button>
              </>
            )}
            {hasPaidSmartImport ? (
              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
                className="flex-1 sm:flex-none border-primary/30 text-primary"
              >
                <Sparkles size={16} className="mr-2" />
                Smart Import
              </Button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        disabled
                        variant="outline"
                        className="flex-1 sm:flex-none border-primary/30 text-primary/70"
                      >
                        <Lock size={16} className="mr-2" />
                        Smart Import
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Smart Import is available on paid plans (Explorer+ / Trip Pass / Pro /
                    Enterprise).
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

      {/* Upload error */}
      {uploadError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-destructive text-sm flex-1">{uploadError}</p>
          <button onClick={clearError} className="text-destructive hover:text-destructive/80">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-destructive text-sm">{loadError}</p>
        </div>
      )}

      {/* Agenda Files Display */}
      {(isLoadingFiles || agendaFiles.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-foreground">
            Agenda Files ({agendaFiles.length}/{maxFiles})
          </h3>

          {isLoadingFiles && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="text-muted-foreground animate-spin" />
            </div>
          )}

          {isUploading && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
              <Loader2 size={16} className="text-primary animate-spin" />
              <p className="text-primary text-sm">Uploading files...</p>
            </div>
          )}

          {agendaFiles.map(file => (
            <Card key={file.id} className="bg-card/50 border-border">
              <CardContent className="p-4">
                {isImageMime(file.mimeType) ? (
                  /* Image file card */
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden bg-muted/20">
                      <img
                        src={file.publicUrl}
                        alt={file.name}
                        className="w-full h-auto object-contain max-h-[250px]"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Image size={16} className="text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={file.publicUrl}
                          download={file.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto border-border"
                          >
                            <Download size={14} className="mr-1" />
                            Download
                          </Button>
                        </a>
                        {isOrganizer && (
                          <Button
                            onClick={() => handleDeleteAgendaFile(file)}
                            variant="outline"
                            size="sm"
                            className="border-destructive text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : isPdfMime(file.mimeType) ? (
                  /* PDF file card */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <FileText size={20} className="text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                          {file.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          PDF &middot; {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={file.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto border-border"
                        >
                          <Eye size={14} className="mr-1" />
                          Preview
                        </Button>
                      </a>
                      <a
                        href={file.publicUrl}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto border-border"
                        >
                          <Download size={14} className="mr-1" />
                          Download
                        </Button>
                      </a>
                      {isOrganizer && (
                        <Button
                          onClick={() => handleDeleteAgendaFile(file)}
                          variant="outline"
                          size="sm"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Fallback file card */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText size={32} className="text-muted-foreground flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-foreground">{file.name}</h3>
                        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={file.publicUrl}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto border-border"
                        >
                          <Download size={14} className="mr-1" />
                          Download
                        </Button>
                      </a>
                      {isOrganizer && (
                        <Button
                          onClick={() => handleDeleteAgendaFile(file)}
                          variant="outline"
                          size="sm"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Inline add-more when files exist and more slots available */}
          {isOrganizer && canUploadMore && !isUploading && agendaFiles.length > 0 && (
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
                <Upload size={16} />
                <span className="text-sm">Add more files ({remainingSlots} remaining)</span>
              </div>
            </label>
          )}

          {/* Limit reached */}
          {!canUploadMore && (
            <p className="text-xs text-muted-foreground text-center py-1">
              Maximum {maxFiles} files reached
            </p>
          )}
        </div>
      )}

      {/* Divider */}
      {agendaFiles.length > 0 && sessions.length > 0 && (
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
              <Button onClick={resetForm} variant="ghost" size="sm">
                Cancel
              </Button>
            </div>

            <div className="space-y-3">
              {/* Row 1: Title */}
              <div className="space-y-2">
                <Label htmlFor="session-title">Session Title *</Label>
                <Input
                  id="session-title"
                  value={newSession.title}
                  onChange={e => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Keynote: The Future of AI"
                  className="bg-background border-border"
                />
              </div>

              {/* Row 2: Date, Start Time, End Time */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="session-date">Date</Label>
                  <Input
                    id="session-date"
                    type="date"
                    value={newSession.session_date}
                    onChange={e =>
                      setNewSession(prev => ({ ...prev, session_date: e.target.value }))
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-time">Start Time</Label>
                  <Input
                    id="session-time"
                    type="time"
                    value={newSession.start_time}
                    onChange={e => setNewSession(prev => ({ ...prev, start_time: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-endtime">End Time</Label>
                  <Input
                    id="session-endtime"
                    type="time"
                    value={newSession.end_time}
                    onChange={e => setNewSession(prev => ({ ...prev, end_time: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              {/* Row 3: Location (full width) */}
              <div className="space-y-2">
                <Label htmlFor="session-location">Location</Label>
                <Input
                  id="session-location"
                  value={newSession.location}
                  onChange={e => setNewSession(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Main Hall, Room 301"
                  className="bg-background border-border"
                />
              </div>

              {/* Row 4: Speakers/Performers */}
              <div className="space-y-2">
                <Label>Speakers/Performers</Label>
                <div className="flex gap-2">
                  <Input
                    value={speakerInput}
                    onChange={e => setSpeakerInput(e.target.value)}
                    placeholder="Add speaker name"
                    className="bg-background border-border"
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddSpeaker())}
                  />
                  <Button type="button" onClick={handleAddSpeaker} variant="outline" size="sm">
                    Add
                  </Button>
                </div>
                {newSession.speakers && newSession.speakers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newSession.speakers.map((speaker, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded-full text-xs"
                      >
                        <User size={12} />
                        {speaker}
                        <button
                          type="button"
                          onClick={() => handleRemoveSpeaker(index)}
                          className="hover:text-destructive"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 5: Description */}
              <div className="space-y-2">
                <Label htmlFor="session-description">Description (Optional)</Label>
                <Textarea
                  id="session-description"
                  value={newSession.description}
                  onChange={e => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the session..."
                  className="bg-background border-border"
                  rows={2}
                />
              </div>
            </div>

            <Button
              onClick={handleSaveSession}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={!newSession.title || isAdding || isUpdating}
            >
              <CheckCircle2 size={16} className="mr-2" />
              {isAdding || isUpdating
                ? 'Saving...'
                : editingSession
                  ? 'Update Session'
                  : 'Add Session'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      {sessions.length > 0 ? (
        <div className="space-y-3" role="list" aria-label="Event schedule">
          <h3 className="text-lg font-medium text-foreground">Schedule</h3>
          {sessions.map(session => (
            <Card
              key={session.id}
              className="bg-card/50 border-border hover:bg-card/70 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-medium mb-2 truncate">{session.title}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={14} className="flex-shrink-0" />
                        <span>
                          {formatSessionDateTime(
                            session.session_date,
                            session.start_time,
                            session.end_time,
                          )}
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
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
                            >
                              <User size={10} />
                              {speaker}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {session.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {session.description}
                      </p>
                    )}
                  </div>
                  {isOrganizer && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        onClick={() => handleEditSession(session)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteSession(session.id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !isAddingSession && (
          <Card className="bg-card/50 border-border">
            <CardContent className="p-8 text-center">
              <Calendar size={48} className="text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Sessions Yet</h3>
              <p className="text-muted-foreground text-sm">
                {isOrganizer
                  ? 'Add sessions to build your event schedule'
                  : 'Sessions will be announced soon'}
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* Agenda Import Modal */}
      <AgendaImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        eventId={eventId}
        existingSessions={sessions.map(s => ({
          title: s.title,
          session_date: s.session_date,
          start_time: s.start_time,
          location: s.location,
        }))}
        onImportSessions={async (importedSessions: ParsedAgendaSession[]) => {
          for (const s of importedSessions) {
            await addSession(s);
          }
        }}
        onBulkImportSessions={bulkAddSessions}
        pendingResult={pendingResult}
        onClearPendingResult={clearResult}
        onStartBackgroundImport={url => {
          setShowImportModal(false);
          startImport(url, () => setShowImportModal(true));
        }}
        onLineupUpdate={onLineupUpdate ? names => onLineupUpdate(names) : undefined}
      />
    </div>
  );
};
