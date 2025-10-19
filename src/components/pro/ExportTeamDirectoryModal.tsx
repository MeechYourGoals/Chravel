import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Download, FileText, Table, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { teamDirectoryExportService, ExportOptions } from '../../services/teamDirectoryExportService';

interface ExportTeamDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  roster: ProParticipant[];
  category: ProTripCategory;
  existingRoles: string[];
  tripName?: string;
}

type ExportFormat = 'pdf' | 'csv' | 'excel';

export const ExportTeamDirectoryModal = ({
  isOpen,
  onClose,
  roster,
  category,
  existingRoles,
  tripName
}: ExportTeamDirectoryModalProps) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [filterByRole, setFilterByRole] = useState<string>('all');
  const [title, setTitle] = useState(tripName || 'Team Directory');
  const [subtitle, setSubtitle] = useState(category);
  const [includeFields, setIncludeFields] = useState({
    name: true,
    role: true,
    email: true,
    phone: true,
    dietary: false,
    medical: false,
    credentials: false,
    permissions: false,
    emergencyContact: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const options: ExportOptions = {
        includeFields,
        filterByRole: filterByRole === 'all' ? undefined : filterByRole,
        title,
        subtitle
      };

      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'pdf':
          blob = teamDirectoryExportService.exportToPDF(roster, category, options);
          filename = `${title.replace(/\s+/g, '_')}_Team_Directory.pdf`;
          break;
        case 'csv':
          blob = teamDirectoryExportService.exportToCSV(roster, options);
          filename = `${title.replace(/\s+/g, '_')}_Team_Directory.csv`;
          break;
        case 'excel':
          blob = teamDirectoryExportService.exportToExcel(roster, category, options);
          filename = `${title.replace(/\s+/g, '_')}_Team_Directory.xlsx`;
          break;
      }

      teamDirectoryExportService.downloadFile(blob, filename);
      setExportComplete(true);
      
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setExportComplete(false);
    onClose();
  };

  const filteredCount = filterByRole === 'all' 
    ? roster.length 
    : roster.filter(m => m.role === filterByRole).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={20} />
            Export Team Directory
          </DialogTitle>
        </DialogHeader>

        {!exportComplete ? (
          <div className="space-y-6">
            {/* Export Format */}
            <div className="space-y-3">
              <Label>Export Format</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFormat('pdf')}
                  className={`p-4 rounded-lg border transition-colors ${
                    format === 'pdf'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <FileText size={24} className="mx-auto mb-2" />
                  <p className="text-sm font-medium">PDF</p>
                  <p className="text-xs text-gray-400">Professional</p>
                </button>
                <button
                  onClick={() => setFormat('csv')}
                  className={`p-4 rounded-lg border transition-colors ${
                    format === 'csv'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <Table size={24} className="mx-auto mb-2" />
                  <p className="text-sm font-medium">CSV</p>
                  <p className="text-xs text-gray-400">Simple</p>
                </button>
                <button
                  onClick={() => setFormat('excel')}
                  className={`p-4 rounded-lg border transition-colors ${
                    format === 'excel'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <FileSpreadsheet size={24} className="mx-auto mb-2" />
                  <p className="text-sm font-medium">Excel</p>
                  <p className="text-xs text-gray-400">Advanced</p>
                </button>
              </div>
            </div>

            {/* Filter by Role */}
            <div className="space-y-2">
              <Label>Filter by Role</Label>
              <Select value={filterByRole} onValueChange={setFilterByRole}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Roles ({roster.length} members)</SelectItem>
                  {existingRoles.map(role => {
                    const count = roster.filter(m => m.role === role).length;
                    return (
                      <SelectItem key={role} value={role} className="text-white">
                        {role} ({count} member{count !== 1 ? 's' : ''})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Exporting {filteredCount} member{filteredCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Document Info */}
            {format === 'pdf' && (
              <div className="space-y-3 bg-white/5 rounded-lg p-4 border border-gray-700">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value as typeof subtitle)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            )}

            {/* Include Fields */}
            <div className="space-y-3">
              <Label>Include Fields</Label>
              <div className="grid grid-cols-2 gap-3 bg-white/5 rounded-lg p-4 border border-gray-700">
                {[
                  { id: 'name', label: 'Name', disabled: true },
                  { id: 'role', label: 'Role', disabled: true },
                  { id: 'email', label: 'Email' },
                  { id: 'phone', label: 'Phone Number' },
                  { id: 'credentials', label: 'Credential Level' },
                  { id: 'dietary', label: 'Dietary Restrictions' },
                  { id: 'medical', label: 'Medical Notes' },
                  { id: 'permissions', label: 'Permissions' },
                  { id: 'emergencyContact', label: 'Emergency Contact' }
                ].map(field => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={includeFields[field.id as keyof typeof includeFields]}
                      onCheckedChange={(checked) => {
                        if (!field.disabled) {
                          setIncludeFields(prev => ({
                            ...prev,
                            [field.id]: checked as boolean
                          }));
                        }
                      }}
                      disabled={field.disabled}
                      className="border-gray-600"
                    />
                    <label
                      htmlFor={field.id}
                      className={`text-sm cursor-pointer ${
                        field.disabled ? 'text-gray-500' : 'text-gray-300'
                      }`}
                    >
                      {field.label}
                      {field.disabled && <span className="text-xs ml-1">(Required)</span>}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                ⚠️ This document contains sensitive information. Handle according to your organization's privacy policy.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-700">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || filteredCount === 0}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isExporting ? (
                  <>Exporting...</>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    Export as {format.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <CheckCircle2 size={64} className="text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Export Complete!</h3>
            <p className="text-gray-400">Your team directory has been downloaded.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

