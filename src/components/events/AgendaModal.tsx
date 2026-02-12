import React, { useState } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { AgendaImportModal } from './AgendaImportModal';
import { useBackgroundAgendaImport } from '@/features/calendar/hooks/useBackgroundAgendaImport';
import { ParsedAgendaSession } from '@/utils/agendaImportParsers';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useEventAgenda } from '@/hooks/useEventAgenda';
import { EventAgendaItem } from '@/types/events';
import { format, parseISO } from 'date-fns';

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
  initialPdfUrl?: string;
  onClose?: () => void;
  onLineupUpdate?: (speakerNames: string[]) => void;
  existingLineup?: { name: string }[];
}

// Mock PDF URL for demo mode
const DEMO_PDF_URL = 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.jpg';

export const AgendaModal = ({
  eventId,
  permissions,
  initialSessions = [],
  initialPdfUrl,
  onClose,
  onLineupUpdate,
  existingLineup = [],
}: AgendaModalProps) => {
  const { isDemoMode } = useDemoMode();
  const { sessions, addSession, updateSession, deleteSession, isAdding, isUpdating } =
    useEventAgenda({
      eventId,
      initialSessions,
    });

  const [showImportModal, setShowImportModal] = useState(false);
  const { pendingResult, startImport, clearResult, isBackgroundImporting } =
    useBackgroundAgendaImport();

  // In demo mode, always show admin controls
  const showAdminControls = isDemoMode || permissions.canCreate;
  const canEdit = isDemoMode || permissions.canEdit;
  const canDelete = isDemoMode || permissions.canDelete;
  const canUpload = isDemoMode || permissions.canUpload;

  const [pdfUrl, setPdfUrl] = useState<string | undefined>(
    isDemoMode ? DEMO_PDF_URL : initialPdfUrl,
  );
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<EventAgendaItem | null>(null);

  // New session form state
  const [newSession, setNewSession] = useState<Partial<EventAgendaItem>>({
    title: '',
    session_date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    speakers: [],
    track: '',
  });

  const [speakerInput, setSpeakerInput] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) return;

    setIsUploadingFile(true);
    try {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    } finally {
      setIsUploadingFile(false);
    }
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
      speakers: prev.speakers?.filter((_, i) => i !== index),
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
      track: newSession.track || undefined,
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
      track: session.track,
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

  const handleDeleteFile = () => {
    if (!canDelete) return;
    setPdfUrl(undefined);
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
      track: '',
    });
    setSpeakerInput('');
    setIsAddingSession(false);
    setEditingSession(null);
  };

  const isPdfFile = pdfUrl?.toLowerCase().endsWith('.pdf') || pdfUrl?.includes('application/pdf');

  return (
    <div className="flex flex-col h-full">
      {/* Action Row - tab-width parity with Event tabs */}
      {showAdminControls && !isAddingSession && (
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="md:col-start-1 h-10 w-10 rounded-xl"
              >
                <X size={18} />
              </Button>
            )}
            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="md:col-start-2 w-full min-h-[42px] px-3.5 py-2.5 rounded-xl font-medium text-sm border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            >
              <Sparkles size={16} className="flex-shrink-0" />
              <span className="whitespace-nowrap">Import Agenda</span>
            </Button>
            <Button
              onClick={() => setIsAddingSession(true)}
              className="md:col-start-3 w-full min-h-[42px] px-3.5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black transition-all duration-200"
            >
              <Plus size={16} className="flex-shrink-0" />
              <span className="whitespace-nowrap">Add Session</span>
            </Button>
            {canUpload && (
              <label className="md:col-start-7 w-full">
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploadingFile}
                />
                <Button
                  asChild
                  className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black cursor-pointer transition-all duration-200"
                  disabled={isUploadingFile}
                >
                  <span>
                    <Upload size={16} className="flex-shrink-0" />
                    <span className="whitespace-nowrap">
                      {isUploadingFile ? 'Uploading...' : 'Upload'}
                    </span>
                  </span>
                </Button>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Split View Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side: Manual Agenda Builder */}
        <div className="flex-1 overflow-y-auto p-4 border-r border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Clock size={18} />
              Schedule
            </h3>
          </div>

          {/* Add/Edit Session Form */}
          {isAddingSession && showAdminControls && (
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

                  {/* Row 3: Location, Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="location" className="text-sm">
                        Location
                      </Label>
                      <Input
                        id="location"
                        value={newSession.location}
                        onChange={e =>
                          setNewSession(prev => ({ ...prev, location: e.target.value }))
                        }
                        placeholder="Room or venue"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="track" className="text-sm">
                        Category
                      </Label>
                      <Input
                        id="track"
                        value={newSession.track}
                        onChange={e => setNewSession(prev => ({ ...prev, track: e.target.value }))}
                        placeholder="e.g., Main Stage, Workshop"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
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
            <div className="space-y-3">
              {sessions.map(session => (
                <Card
                  key={session.id}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {session.track && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs">
                              {session.track}
                            </span>
                          )}
                        </div>
                        <h4 className="text-white font-medium truncate">{session.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {session.session_date &&
                              (() => {
                                try {
                                  return format(parseISO(session.session_date), 'MMM d') + ' — ';
                                } catch {
                                  return '';
                                }
                              })()}
                            {session.start_time}
                            {session.end_time && ` - ${session.end_time}`}
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
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <Clock size={48} className="text-gray-600 mx-auto mb-3" />
                <h4 className="text-white font-medium mb-1">No Sessions Yet</h4>
                <p className="text-gray-400 text-sm">
                  {showAdminControls
                    ? 'Add sessions to build your event schedule'
                    : "The organizer hasn't added sessions yet"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Agenda File Viewer */}
        <div className="flex-1 overflow-y-auto p-4 bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <FileText size={18} />
              Agenda File
            </h3>
          </div>

          {pdfUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-white/10 bg-white">
              {isPdfFile ? (
                <iframe src={pdfUrl} className="w-full h-[500px]" title="Agenda PDF" />
              ) : (
                <div className="relative">
                  <img
                    src={pdfUrl}
                    alt="Agenda"
                    className="w-full h-auto object-contain max-h-[500px]"
                  />
                  <a
                    href={pdfUrl}
                    download="agenda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4"
                  >
                    <Button size="sm" variant="secondary">
                      <Download size={16} className="mr-1" />
                      Download
                    </Button>
                  </a>
                </div>
              )}
              {canDelete && (
                <Button
                  onClick={handleDeleteFile}
                  size="icon"
                  variant="outline"
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/75 border-white/20 text-red-300 hover:text-red-200 hover:bg-black/85"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <Image size={48} className="text-gray-600 mx-auto mb-3" />
                <h4 className="text-white font-medium mb-1">No Agenda File</h4>
                <p className="text-gray-400 text-sm">
                  {canUpload
                    ? 'Upload a PDF or image of your event agenda'
                    : "The organizer hasn't uploaded an agenda file yet"}
                </p>
              </CardContent>
            </Card>
          )}

          {isDemoMode && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-300 text-sm text-center">
                📝 Demo Mode: All changes are temporary
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
        onImportSessions={async (importedSessions: ParsedAgendaSession[]) => {
          for (const s of importedSessions) {
            await addSession(s);
          }
        }}
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
