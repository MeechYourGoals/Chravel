import React, { useState, useCallback } from 'react';
import { Upload, Download, Plus, Clock, MapPin, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';

interface Session {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  speaker: string;
  track?: string;
}

interface ScheduleImporterProps {
  onScheduleImport: (sessions: Session[]) => void;
  currentSchedule: Session[];
}

export const ScheduleImporter = ({ onScheduleImport, currentSchedule }: ScheduleImporterProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newSession, setNewSession] = useState<Partial<Session>>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    speaker: '',
  });
  const { toast } = useToast();

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV file.',
          variant: 'destructive',
        });
        return;
      }

      setIsProcessing(true);

      try {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const sessions: Session[] = lines
          .slice(1)
          .filter(line => line.trim())
          .map((line, index) => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

            return {
              id: `imported-${index}`,
              title:
                values[headers.indexOf('title')] ||
                values[headers.indexOf('session')] ||
                `Session ${index + 1}`,
              description:
                values[headers.indexOf('description')] || values[headers.indexOf('desc')] || '',
              startTime:
                values[headers.indexOf('start_time')] || values[headers.indexOf('start')] || '',
              endTime: values[headers.indexOf('end_time')] || values[headers.indexOf('end')] || '',
              location:
                values[headers.indexOf('location')] || values[headers.indexOf('room')] || '',
              speaker:
                values[headers.indexOf('speaker')] || values[headers.indexOf('presenter')] || '',
              track: values[headers.indexOf('track')] || values[headers.indexOf('category')] || '',
            };
          });

        onScheduleImport([...currentSchedule, ...sessions]);

        toast({
          title: 'Schedule imported',
          description: `Successfully imported ${sessions.length} sessions.`,
        });
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: 'Import failed',
          description: 'Failed to parse CSV file. Please check the format.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [currentSchedule, onScheduleImport, toast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const addManualSession = () => {
    if (!newSession.title || !newSession.startTime || !newSession.endTime) {
      toast({
        title: 'Missing information',
        description: 'Please fill in at least title, start time, and end time.',
        variant: 'destructive',
      });
      return;
    }

    const session: Session = {
      id: `manual-${Date.now()}`,
      title: newSession.title!,
      description: newSession.description || '',
      startTime: newSession.startTime!,
      endTime: newSession.endTime!,
      location: newSession.location || '',
      speaker: newSession.speaker || '',
    };

    onScheduleImport([...currentSchedule, session]);
    setNewSession({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      speaker: '',
    });

    toast({
      title: 'Session added',
      description: 'Session has been added to your schedule.',
    });
  };

  const downloadTemplate = () => {
    const csvContent =
      'title,description,start_time,end_time,location,speaker,track\n' +
      'Opening Keynote,Welcome and introduction,09:00,10:00,Main Auditorium,John Doe,General\n' +
      'Tech Panel,Discussion on future tech,10:30,11:30,Room A,Jane Smith,Technology\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Import Schedule</h4>

        {/* CSV Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? 'border-glass-orange bg-glass-orange/10' : 'border-white/20 bg-white/5'
          }`}
          onDrop={handleDrop}
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <Upload size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-300 mb-2">Drop your CSV file here or click to browse</p>
          <p className="text-gray-500 text-sm mb-4">Supports CSV files with session data</p>

          <div className="flex gap-3 justify-center">
            <label htmlFor="csv-upload">
              <Button variant="outline" className="cursor-pointer" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Choose File'}
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>

            <Button variant="ghost" onClick={downloadTemplate}>
              <Download size={16} className="mr-2" />
              Download Template
            </Button>
          </div>
        </div>
      </div>

      {/* Manual Session Entry */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Add Session Manually</h4>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session-title" className="text-white">
                Session Title
              </Label>
              <Input
                id="session-title"
                value={newSession.title}
                onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-1"
                placeholder="Enter session title"
              />
            </div>
            <div>
              <Label htmlFor="session-speaker" className="text-white">
                Speaker
              </Label>
              <Input
                id="session-speaker"
                value={newSession.speaker}
                onChange={e => setNewSession({ ...newSession, speaker: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-1"
                placeholder="Speaker name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time" className="text-white">
                Start Time
              </Label>
              <Input
                id="start-time"
                type="time"
                value={newSession.startTime}
                onChange={e => setNewSession({ ...newSession, startTime: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-time" className="text-white">
                End Time
              </Label>
              <Input
                id="end-time"
                type="time"
                value={newSession.endTime}
                onChange={e => setNewSession({ ...newSession, endTime: e.target.value })}
                className="bg-gray-800/50 border-gray-600 text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location" className="text-white">
              Location
            </Label>
            <Input
              id="location"
              value={newSession.location}
              onChange={e => setNewSession({ ...newSession, location: e.target.value })}
              className="bg-gray-800/50 border-gray-600 text-white mt-1"
              placeholder="Room or venue"
            />
          </div>

          <Button onClick={addManualSession} className="bg-glass-orange hover:bg-glass-orange/80">
            <Plus size={16} className="mr-2" />
            Add Session
          </Button>
        </div>
      </div>

      {/* Current Schedule Preview */}
      {currentSchedule.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">
            Current Schedule ({currentSchedule.length} sessions)
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentSchedule.map(session => (
              <div key={session.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-white">{session.title}</h5>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {session.startTime} - {session.endTime}
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        {session.location}
                      </div>
                    )}
                    {session.speaker && (
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        {session.speaker}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
