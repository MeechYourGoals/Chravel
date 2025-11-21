import React, { useState } from 'react';
import { FileText, Upload, Download, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export const SimpleAgendaSection = () => {
  const [agendaInfo, setAgendaInfo] = useState({
    title: 'Event Schedule',
    description: '',
    uploadedFile: null as File | null
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setAgendaInfo({ ...agendaInfo, uploadedFile: file });
    }
  };

  const removeFile = () => {
    setAgendaInfo({ ...agendaInfo, uploadedFile: null });
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText size={24} className="text-glass-orange" />
          Event Agenda
        </h3>
        <p className="text-gray-300 mt-2">Upload your event schedule as a PDF for attendees to view</p>
      </div>

      {/* Agenda Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Agenda Information</h4>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="agendaTitle" className="text-white">Agenda Title</Label>
            <Input
              id="agendaTitle"
              value={agendaInfo.title}
              onChange={(e) => setAgendaInfo({...agendaInfo, title: e.target.value})}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="e.g., Event Schedule, Program Agenda"
            />
          </div>
          
          <div>
            <Label htmlFor="agendaDescription" className="text-white">Description (Optional)</Label>
            <Textarea
              id="agendaDescription"
              value={agendaInfo.description}
              onChange={(e) => setAgendaInfo({...agendaInfo, description: e.target.value})}
              className="bg-gray-800/50 border-gray-600 text-white mt-2"
              placeholder="Brief description of the agenda"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* PDF Upload */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Upload Agenda PDF</h4>
        
        {!agendaInfo.uploadedFile ? (
          <div className="border-2 border-dashed border-glass-orange/30 rounded-lg p-6 text-center">
            <Upload size={48} className="mx-auto text-glass-orange mb-4" />
            <p className="text-white mb-2">Upload your event agenda</p>
            <p className="text-gray-400 text-sm mb-4">PDF files only, max 10MB</p>
            
            <label htmlFor="agenda-upload" className="cursor-pointer">
              <Button className="bg-glass-orange hover:bg-glass-orange/80" asChild>
                <span>Choose PDF File</span>
              </Button>
              <input
                id="agenda-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-glass-orange" />
                <div>
                  <p className="text-white font-medium">{agendaInfo.uploadedFile.name}</p>
                  <p className="text-gray-400 text-sm">
                    {(agendaInfo.uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-glass-orange text-glass-orange hover:bg-glass-orange/10">
                  <Eye size={16} className="mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" onClick={removeFile} className="border-red-500 text-red-400 hover:bg-red-500/10">
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attendee Access */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Attendee Access</h4>
        
        <div className="space-y-3">
          <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <Download size={20} className="text-blue-400 mt-0.5" />
              <div>
                <p className="text-blue-300 font-medium">Easy Access for Attendees</p>
                <p className="text-gray-300 text-sm mt-1">
                  Once uploaded, attendees will see a "View Agenda" or "Download Schedule" button 
                  on the event page. They can view the PDF directly or download it to their device.
                </p>
              </div>
            </div>
          </div>
          
          {agendaInfo.uploadedFile && (
            <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-start gap-3">
                <FileText size={20} className="text-green-400 mt-0.5" />
                <div>
                  <p className="text-green-300 font-medium">Agenda Ready!</p>
                  <p className="text-gray-300 text-sm mt-1">
                    Your agenda PDF is uploaded and ready for attendees to view.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-glass-orange hover:bg-glass-orange/80">
          Save Agenda Settings
        </Button>
      </div>
    </div>
  );
};