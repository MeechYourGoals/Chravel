import React, { useState } from 'react';
import { Calendar, Upload, Plus, FileText, Clock, MapPin, Trash2, Download, Edit2, X, Image, User, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';
import { eventsMockData } from '@/data/eventsMockData';
import { EventAgendaItem } from '@/types/events';

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
}

// Mock PDF URL for demo mode
const DEMO_PDF_URL = 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.jpg';

export const AgendaModal = ({
  eventId,
  permissions,
  initialSessions = [],
  initialPdfUrl,
  onClose
}: AgendaModalProps) => {
  const { isDemoMode } = useDemoMode();
  const { toast } = useToast();
  
  // In demo mode, always show admin controls
  const showAdminControls = isDemoMode || permissions.canCreate;
  const canEdit = isDemoMode || permissions.canEdit;
  const canDelete = isDemoMode || permissions.canDelete;
  const canUpload = isDemoMode || permissions.canUpload;
  
  // Get demo data if in demo mode
  const demoEventData = isDemoMode ? eventsMockData[eventId] : null;
  const demoSessions: EventAgendaItem[] = demoEventData?.agenda || [];
  
  const [sessions, setSessions] = useState<EventAgendaItem[]>(
    isDemoMode ? demoSessions : initialSessions
  );
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(
    isDemoMode ? DEMO_PDF_URL : initialPdfUrl
  );
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<EventAgendaItem | null>(null);
  
  // New session form state
  const [newSession, setNewSession] = useState<Partial<EventAgendaItem>>({
    title: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    speakers: [],
    track: ''
  });
  
  const [speakerInput, setSpeakerInput] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF, JPG, or PNG file',
        variant: 'destructive'
      });
      return;
    }

    setIsUploadingFile(true);
    try {
      if (isDemoMode) {
        // Demo mode: create local URL
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        toast({
          title: 'File uploaded successfully',
          description: 'Agenda file is now visible to attendees'
        });
      } else {
        // TODO: Upload to Supabase storage
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        toast({
          title: 'File uploaded successfully',
          description: 'Agenda file is now visible to attendees'
        });
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingFile(false);
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

  const handleSaveSession = () => {
    if (!newSession.title) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in the title',
        variant: 'destructive'
      });
      return;
    }

    const session: EventAgendaItem = {
      id: editingSession?.id || Date.now().toString(),
      title: newSession.title,
      start_time: newSession.start_time,
      end_time: newSession.end_time,
      location: newSession.location,
      description: newSession.description,
      speakers: newSession.speakers,
      track: newSession.track
    };

    if (editingSession) {
      setSessions(prev => prev.map(s => s.id === editingSession.id ? session : s));
      toast({ title: 'Session updated' });
    } else {
      setSessions(prev => [...prev, session].sort((a, b) => 
        (a.start_time || '').localeCompare(b.start_time || '')
      ));
      toast({ title: 'Session added' });
    }

    resetForm();
  };

  const handleEditSession = (session: EventAgendaItem) => {
    if (!canEdit) return;
    setEditingSession(session);
    setNewSession({
      title: session.title,
      start_time: session.start_time,
      end_time: session.end_time,
      location: session.location,
      description: session.description,
      speakers: session.speakers || [],
      track: session.track
    });
    setIsAddingSession(true);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!canDelete) return;
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast({ title: 'Session removed' });
  };

  const handleDeleteFile = () => {
    if (!canDelete) return;
    setPdfUrl(undefined);
    toast({ title: 'Agenda file removed' });
  };

  const resetForm = () => {
    setNewSession({
      title: '',
      start_time: '',
      end_time: '',
      location: '',
      description: '',
      speakers: [],
      track: ''
    });
    setSpeakerInput('');
    setIsAddingSession(false);
    setEditingSession(null);
  };

  const isPdfFile = pdfUrl?.toLowerCase().endsWith('.pdf') || pdfUrl?.includes('application/pdf');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-yellow-500" />
          <div>
            <h2 className="text-xl font-semibold text-white">Event Agenda</h2>
            <p className="text-gray-400 text-sm">
              {showAdminControls ? 'Manage your event schedule' : 'View the event schedule'}
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        )}
      </div>

      {/* Split View Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side: Manual Agenda Builder */}
        <div className="flex-1 overflow-y-auto p-4 border-r border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Clock size={18} />
              Schedule
            </h3>
            {showAdminControls && !isAddingSession && (
              <Button
                onClick={() => setIsAddingSession(true)}
                size="sm"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
              >
                <Plus size={16} className="mr-1" />
                Add Session
              </Button>
            )}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="title" className="text-sm">Title *</Label>
                    <Input
                      id="title"
                      value={newSession.title}
                      onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Session title"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="start_time" className="text-sm">Start Time *</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={newSession.start_time}
                      onChange={(e) => setNewSession(prev => ({ ...prev, start_time: e.target.value }))}
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="end_time" className="text-sm">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={newSession.end_time}
                      onChange={(e) => setNewSession(prev => ({ ...prev, end_time: e.target.value }))}
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-sm">Location</Label>
                    <Input
                      id="location"
                      value={newSession.location}
                      onChange={(e) => setNewSession(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Room or venue"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="track" className="text-sm">Track/Category</Label>
                    <Input
                      id="track"
                      value={newSession.track}
                      onChange={(e) => setNewSession(prev => ({ ...prev, track: e.target.value }))}
                      placeholder="e.g., Main Stage, Workshop"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-sm">Speakers/Performers</Label>
                    <div className="flex gap-2">
                      <Input
                        value={speakerInput}
                        onChange={(e) => setSpeakerInput(e.target.value)}
                        placeholder="Add speaker name"
                        className="bg-white/5 border-white/10"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpeaker())}
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

                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="description" className="text-sm">Description</Label>
                    <Textarea
                      id="description"
                      value={newSession.description}
                      onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Session description..."
                      className="bg-white/5 border-white/10"
                      rows={2}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveSession}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
                  disabled={!newSession.title || !newSession.start_time}
                >
                  <Save size={16} className="mr-2" />
                  {editingSession ? 'Update Session' : 'Add Session'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Sessions List */}
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map(session => (
                <Card key={session.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
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
                              <span key={i} className="text-xs text-yellow-300 flex items-center gap-1">
                                <User size={12} />
                                {speaker}
                              </span>
                            ))}
                          </div>
                        )}
                        {session.description && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{session.description}</p>
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
                    : 'The organizer hasn\'t added sessions yet'}
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
            {canUpload && (
              <div className="flex gap-2">
                <label>
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/jpg"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingFile}
                  />
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold cursor-pointer"
                    asChild
                    disabled={isUploadingFile}
                  >
                    <span>
                      <Upload size={16} className="mr-1" />
                      {isUploadingFile ? 'Uploading...' : 'Upload'}
                    </span>
                  </Button>
                </label>
                {pdfUrl && canDelete && (
                  <Button
                    onClick={handleDeleteFile}
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            )}
          </div>

          {pdfUrl ? (
            <div className="rounded-lg overflow-hidden border border-white/10 bg-white">
              {isPdfFile ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-[500px]"
                  title="Agenda PDF"
                />
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
            </div>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <Image size={48} className="text-gray-600 mx-auto mb-3" />
                <h4 className="text-white font-medium mb-1">No Agenda File</h4>
                <p className="text-gray-400 text-sm">
                  {canUpload
                    ? 'Upload a PDF or image of your event agenda'
                    : 'The organizer hasn\'t uploaded an agenda file yet'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Demo mode indicator */}
          {isDemoMode && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-300 text-sm text-center">
                📝 Demo Mode: All changes are temporary
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
