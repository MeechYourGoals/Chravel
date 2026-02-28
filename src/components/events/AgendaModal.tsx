import React, { useState, useRef } from 'react';
import {
  Upload,
  Plus,
  FileText,
  Clock,
  MapPin,
  Trash2,
  Download,
  Edit2,
  X,
  Image,
  User,
  Save,
  Eye,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { AgendaImportModal } from './AgendaImportModal';
import { useBackgroundAgendaImport } from '@/features/calendar/hooks/useBackgroundAgendaImport';
import { ParsedAgendaSession } from '@/utils/agendaImportParsers';
import { Button } from '../ui/button';
import { ActionPill } from '../ui/ActionPill';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useEventAgenda } from '@/hooks/useEventAgenda';
import { useEventAgendaFiles } from '@/hooks/useEventAgendaFiles';
import { EventAgendaItem, AgendaFile } from '@/types/events';
import { formatSessionDateTime } from '@/lib/formatSessionDateTime';
import { EVENT_PARITY_COL_START, EVENT_PARITY_ROW_CLASS } from '@/lib/tabParity';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { hasPaidAccess } from '@/utils/paidAccess';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface AgendaPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canUpload: boolean;
}

interface AgendaModalProps {
  eventId: string;
  permissions: AgendaPermissions;
  initialSessions?: EventAgendaItem[];
  onClose?: () => void;
  onLineupUpdate?: (speakerNames: string[]) => void;
}

// Demo mode mock files
const DEMO_FILES: AgendaFile[] = [
  {
    id: 'demo-1',
    name: 'event-schedule.jpg',
    storagePath: '',
    publicUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.jpg',
    mimeType: 'image/jpeg',
    size: 245000,
    createdAt: new Date().toISOString(),
  },
];

function isPdfMime(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export const AgendaModal = ({
  eventId,
  permissions,
  initialSessions = [],
  onClose,
  onLineupUpdate,
}: AgendaModalProps) => {
  const { isDemoMode } = useDemoMode();
  const {
    sessions,
    addSession,
    updateSession,
    deleteSession,
    bulkAddSessions,
    isAdding,
    isUpdating,
  } = useEventAgenda({
    eventId,
    initialSessions,
  });

  const {
    files: storageFiles,
    isLoading: isLoadingFiles,
    isUploading,
    uploadError,
    loadError,
    clearError,
    setError: setUploadError,
    uploadFiles,
    deleteFile,
    maxFiles,
    remainingSlots,
    canUpload: canUploadMore,
    formatFileSize,
  } = useEventAgendaFiles({ eventId, enabled: !isDemoMode });

  const agendaFiles = isDemoMode ? DEMO_FILES : storageFiles;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const { pendingResult, startImport, clearResult } = useBackgroundAgendaImport(eventId);

  // In demo mode, allow all management actions
  const canCreateSessions = isDemoMode || permissions.canCreate;
  const canEdit = isDemoMode || permissions.canEdit;
  const canDelete = isDemoMode || permissions.canDelete;
  const canUpload = isDemoMode || permissions.canUpload;

  const [isAddingSession, setIsAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<EventAgendaItem | null>(null);

  // New session form state (Category/track removed per requirements)
  const [newSession, setNewSession] = useState<Partial<EventAgendaItem>>({
    title: '',
    session_date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    speakers: [],
  });

  const [speakerInput, setSpeakerInput] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    if (isDemoMode) return;

    const fileArray = Array.from(selected);

    // Early validation: enforce max files limit before calling upload
    if (fileArray.length > remainingSlots) {
      clearError();
      setUploadError(
        `Maximum ${maxFiles} files allowed. You have ${agendaFiles.length} file(s). Select at most ${remainingSlots} more.`,
      );
      return;
    }

    await uploadFiles(fileArray);

    // Reset file input so the same files can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAgendaFile = async (file: AgendaFile) => {
    if (!canDelete) return;
    if (isDemoMode) return;
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
      description: newSession.description || undefined,
      speakers: newSession.speakers || [],
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
    if (!canEdit) return;
    setEditingSession(session);
    setNewSession({
      title: session.title,
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      location: session.location,
      description: session.description,
      speakers: session.speakers || [],
    });
    setIsAddingSession(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!canDelete) return;
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
      description: '',
      speakers: [],
    });
    setSpeakerInput('');
    setIsAddingSession(false);
    setEditingSession(null);
  };

  const { tier, subscription, isSuperAdmin } = useConsumerSubscription();
  const hasPaidSmartImport = hasPaidAccess({ tier, status: subscription?.status, isSuperAdmin });

  const showAdminActions = (canCreateSessions || canUpload) && !isAddingSession;
  const showActionRow = Boolean(onClose) || showAdminActions;

  return (
    <div className="flex flex-col h-full">
      {/* Action Row - tab-width parity with Event tabs */}
      {showActionRow && (
        <div className="mb-4">
          <div className={EVENT_PARITY_ROW_CLASS}>
            {/* Schedule label — under Agenda tab */}
            <div
              className={`${EVENT_PARITY_COL_START.agenda} flex items-center justify-center gap-1.5 text-white font-medium text-sm min-h-[42px]`}
            >
              <Clock size={16} />
              Schedule
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 rounded-xl"
              >
                <X size={18} />
              </Button>
            )}
            {showAdminActions && (
              <>
                {canCreateSessions && (
                  <>
                    {hasPaidSmartImport ? (
                      <ActionPill
                        variant="aiOutline"
                        onClick={() => setShowImportModal(true)}
                        className={`${EVENT_PARITY_COL_START.calendar} w-full`}
                      >
                        <span className="whitespace-nowrap">Import</span>
                      </ActionPill>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={0} className={EVENT_PARITY_COL_START.calendar}>
                              <ActionPill
                                variant="aiOutline"
                                disabled
                                className="w-full opacity-50"
                              >
                                <Lock size={16} className="flex-shrink-0" />
                                <span className="whitespace-nowrap">Import</span>
                              </ActionPill>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Import is available on paid plans (Explorer+ / Trip Pass / Pro /
                            Enterprise).
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <ActionPill
                      variant="manualOutline"
                      leftIcon={<Plus />}
                      onClick={() => setIsAddingSession(true)}
                      className={`${EVENT_PARITY_COL_START.chat} w-full`}
                    >
                      <span className="whitespace-nowrap">Add Session</span>
                    </ActionPill>
                  </>
                )}
                {/* Agenda Files label — under Line-up tab */}
                <div
                  className={`${EVENT_PARITY_COL_START.lineup} flex items-center justify-center gap-1.5 text-white font-medium text-sm min-h-[42px]`}
                >
                  <FileText size={16} />
                  Files ({agendaFiles.length}/{maxFiles})
                </div>
                {canUpload && canUploadMore && (
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
                    <ActionPill
                      variant="manualOutline"
                      leftIcon={isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
                      onClick={() => fileInputRef.current?.click()}
                      className={`${EVENT_PARITY_COL_START.tasks} w-full`}
                      disabled={isUploading}
                    >
                      <span className="whitespace-nowrap">
                        {isUploading ? 'Uploading...' : 'Upload Schedule'}
                      </span>
                    </ActionPill>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Split View Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side: Manual Agenda Builder */}
        <div className="flex-1 overflow-y-auto pt-2 px-4 pb-4 border-r border-white/10">
          {/* Add/Edit Session Form */}
          {isAddingSession && canCreateSessions && (
            <Card className="bg-white/5 border-white/10 mb-4">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">
                    {editingSession ? 'Edit Session' : 'Add Session'}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* Row 1: Title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-sm">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      value={newSession.title}
                      onChange={e => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Session title"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  {/* Row 2: Date, Start Time, End Time */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="session_date" className="text-sm">
                        Date
                      </Label>
                      <Input
                        id="session_date"
                        type="date"
                        value={newSession.session_date}
                        onChange={e =>
                          setNewSession(prev => ({ ...prev, session_date: e.target.value }))
                        }
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="start_time" className="text-sm">
                        Start Time
                      </Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={newSession.start_time}
                        onChange={e =>
                          setNewSession(prev => ({ ...prev, start_time: e.target.value }))
                        }
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="end_time" className="text-sm">
                        End Time
                      </Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={newSession.end_time}
                        onChange={e =>
                          setNewSession(prev => ({ ...prev, end_time: e.target.value }))
                        }
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>

                  {/* Row 3: Location (full width) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-sm">
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={newSession.location}
                      onChange={e => setNewSession(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Room or venue"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  {/* Row 4: Speakers/Performers */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Speakers/Performers</Label>
                    <div className="flex gap-2">
                      <Input
                        value={speakerInput}
                        onChange={e => setSpeakerInput(e.target.value)}
                        placeholder="Add speaker name"
                        className="bg-white/5 border-white/10"
                        onKeyPress={e =>
                          e.key === 'Enter' && (e.preventDefault(), handleAddSpeaker())
                        }
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
                            className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs"
                          >
                            <User size={12} />
                            {speaker}
                            <button
                              type="button"
                              onClick={() => handleRemoveSpeaker(index)}
                              className="hover:text-red-400"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Row 5: Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-sm">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newSession.description}
                      onChange={e =>
                        setNewSession(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Session description..."
                      className="bg-white/5 border-white/10"
                      rows={2}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveSession}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
                  disabled={!newSession.title || isAdding || isUpdating}
                >
                  <Save size={16} className="mr-2" />
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
              {sessions.map(session => (
                <Card
                  key={session.id}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">{session.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatSessionDateTime(
                              session.session_date,
                              session.start_time,
                              session.end_time,
                            )}
                          </span>
                          {session.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {session.location}
                            </span>
                          )}
                        </div>
                        {session.speakers && session.speakers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {session.speakers.map((speaker, i) => (
                              <span
                                key={i}
                                className="text-xs text-yellow-300 flex items-center gap-1"
                              >
                                <User size={12} />
                                {speaker}
                              </span>
                            ))}
                          </div>
                        )}
                        {session.description && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                            {session.description}
                          </p>
                        )}
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-1">
                          {canEdit && (
                            <Button
                              onClick={() => handleEditSession(session)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-white"
                            >
                              <Edit2 size={14} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              onClick={() => handleDeleteSession(session.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white/5 border-white/10 min-h-[220px] flex flex-col">
              <CardContent className="p-8 text-center flex-1 flex flex-col items-center justify-center">
                <Clock size={48} className="text-gray-600 mx-auto mb-3" />
                <h4 className="text-white font-medium mb-1">No Sessions Yet</h4>
                <p className="text-gray-400 text-sm">
                  {canCreateSessions
                    ? 'Add sessions to build your event schedule'
                    : "The organizer hasn't added sessions yet"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Agenda Files Viewer (multi-file) */}
        <div className="flex-1 overflow-y-auto pt-2 px-4 pb-4 bg-black/20">
          {/* Upload error */}
          {uploadError && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 text-sm">{uploadError}</p>
              </div>
              <button onClick={clearError} className="text-red-400 hover:text-red-300">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Load error */}
          {loadError && !isDemoMode && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{loadError}</p>
            </div>
          )}

          {/* Loading state */}
          {isLoadingFiles && !isDemoMode && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-gray-400 animate-spin" />
            </div>
          )}

          {/* Uploading indicator */}
          {isUploading && (
            <div className="mb-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2">
              <Loader2 size={16} className="text-yellow-400 animate-spin" />
              <p className="text-yellow-300 text-sm">Uploading files...</p>
            </div>
          )}

          {/* File list */}
          {agendaFiles.length > 0 ? (
            <div className="space-y-3">
              {agendaFiles.map(file => (
                <Card
                  key={file.id}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
                >
                  <CardContent className="p-3">
                    {isImageMime(file.mimeType) ? (
                      /* Image file card */
                      <div className="space-y-2">
                        <div className="relative rounded-lg overflow-hidden bg-white/5">
                          <img
                            src={file.publicUrl}
                            alt={file.name}
                            className="w-full h-auto object-contain max-h-[300px]"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Image size={14} className="text-blue-400 flex-shrink-0" />
                            <span className="text-sm text-gray-300 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <a
                              href={file.publicUrl}
                              download={file.name}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-gray-400 hover:text-white"
                              >
                                <Download size={14} />
                              </Button>
                            </a>
                            {canDelete && (
                              <Button
                                onClick={() => handleDeleteAgendaFile(file)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-gray-400 hover:text-red-400"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : isPdfMime(file.mimeType) ? (
                      /* PDF file card */
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <FileText size={20} className="text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            PDF &middot; {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <a href={file.publicUrl} target="_blank" rel="noopener noreferrer">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-yellow-400"
                              title="Preview PDF"
                            >
                              <Eye size={14} />
                            </Button>
                          </a>
                          <a
                            href={file.publicUrl}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-white"
                              title="Download"
                            >
                              <Download size={14} />
                            </Button>
                          </a>
                          {canDelete && (
                            <Button
                              onClick={() => handleDeleteAgendaFile(file)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Fallback file card */
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                          <FileText size={20} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <a
                            href={file.publicUrl}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-white"
                            >
                              <Download size={14} />
                            </Button>
                          </a>
                          {canDelete && (
                            <Button
                              onClick={() => handleDeleteAgendaFile(file)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-400"
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

              {/* Inline upload button when files exist but more slots available */}
              {canUpload && canUploadMore && !isUploading && (
                <label className="block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-white/20 text-gray-400 hover:text-yellow-400 hover:border-yellow-500/30 cursor-pointer transition-colors">
                    <Upload size={16} />
                    <span className="text-sm">Add more files ({remainingSlots} remaining)</span>
                  </div>
                </label>
              )}

              {/* Limit reached message */}
              {!canUploadMore && (
                <p className="text-xs text-gray-500 text-center py-1">
                  Maximum {maxFiles} files reached
                </p>
              )}
            </div>
          ) : (
            !isLoadingFiles && (
              <Card className="bg-white/5 border-white/10 min-h-[220px] flex flex-col">
                <CardContent className="p-8 text-center flex-1 flex flex-col items-center justify-center">
                  <Image size={48} className="text-gray-600 mx-auto mb-3" />
                  <h4 className="text-white font-medium mb-1">No Agenda Files</h4>
                  <p className="text-gray-400 text-sm">
                    {canUpload
                      ? 'Upload PDFs or images of your event agenda (up to 5 files)'
                      : "The organizer hasn't uploaded any agenda files yet"}
                  </p>
                </CardContent>
              </Card>
            )
          )}

          {isDemoMode && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-300 text-sm text-center">
                Demo Mode: File uploads are disabled
              </p>
            </div>
          )}
        </div>
      </div>

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
