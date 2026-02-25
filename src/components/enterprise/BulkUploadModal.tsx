import React, { useState, useCallback } from 'react';
import { X, Upload, Download, FileText, AlertCircle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { BulkUploadData, RosterMember, TripCategory } from '../../types/enterprise';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAdd: (members: Omit<RosterMember, 'id' | 'status' | 'invitationSent'>[]) => void;
  tripCategory: TripCategory;
}

export const BulkUploadModal = ({
  isOpen,
  onClose,
  onBulkAdd,
  tripCategory,
}: BulkUploadModalProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedData, setUploadedData] = useState<BulkUploadData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const generateCSVTemplate = () => {
    const headers = ['name', 'role', 'email', 'phone', 'contactMethod'];
    const sampleData = [
      'John Doe,Player,john@example.com,555-0123,email',
      'Jane Smith,Coach,jane@example.com,555-0124,both',
    ];

    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tripCategory}-roster-template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validateData = (data: BulkUploadData[]): string[] => {
    const errors: string[] = [];

    data.forEach((item, index) => {
      if (!item.name?.trim()) {
        errors.push(`Row ${index + 1}: Name is required`);
      }
      if (!item.role?.trim()) {
        errors.push(`Row ${index + 1}: Role is required`);
      }
      if (!item.email && !item.phone) {
        errors.push(`Row ${index + 1}: Either email or phone is required`);
      }
      if (item.email && !/\S+@\S+\.\S+/.test(item.email)) {
        errors.push(`Row ${index + 1}: Invalid email format`);
      }
    });

    return errors;
  };

  const parseCSV = (csvText: string): BulkUploadData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const item: any = {};

      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });

      return {
        name: item.name || '',
        role: item.role || '',
        email: item.email || undefined,
        phone: item.phone || undefined,
        contactMethod: item.contactmethod || 'email',
      } as BulkUploadData;
    });
  };

  const handleFile = useCallback((file: File) => {
    setIsProcessing(true);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        const validationErrors = validateData(data);

        if (validationErrors.length > 0) {
          setErrors(validationErrors);
        } else {
          setUploadedData(data);
        }
      } catch (error) {
        setErrors(['Failed to parse file. Please check the format.']);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (uploadedData.length === 0) return;

    const members = uploadedData.map(data => ({
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone,
      contactMethod: data.contactMethod,
      invitedAt: new Date().toISOString(),
    }));

    onBulkAdd(members);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Bulk Upload Members</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Template Download */}
        <div className="mb-6">
          <Label className="text-white mb-2 block">Step 1: Download Template</Label>
          <Button
            onClick={generateCSVTemplate}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <Download size={16} />
            Download CSV Template
          </Button>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <Label className="text-white mb-2 block">Step 2: Upload Completed CSV</Label>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-white/40'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-white mb-2">Drag and drop your CSV file here, or</p>
            <Button variant="outline" className="mb-2">
              <label htmlFor="file-upload" className="cursor-pointer">
                Choose File
              </label>
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <p className="text-sm text-gray-400">CSV files only</p>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-red-400 font-medium">Validation Errors</span>
            </div>
            <ul className="text-sm text-red-300 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview */}
        {uploadedData.length > 0 && errors.length === 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Check size={16} className="text-green-400" />
              <span className="text-green-400 font-medium">
                {uploadedData.length} members ready to import
              </span>
            </div>

            <div className="bg-white/5 rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-300 mb-2">
                <div>Name</div>
                <div>Role</div>
                <div>Email</div>
                <div>Phone</div>
              </div>
              {uploadedData.slice(0, 10).map((member, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 gap-4 text-sm text-white py-2 border-t border-white/10"
                >
                  <div>{member.name}</div>
                  <div>{member.role}</div>
                  <div>{member.email || '-'}</div>
                  <div>{member.phone || '-'}</div>
                </div>
              ))}
              {uploadedData.length > 10 && (
                <div className="text-sm text-gray-400 pt-2">
                  ...and {uploadedData.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            className="flex-1 bg-primary hover:bg-primary/80"
            disabled={uploadedData.length === 0 || errors.length > 0 || isProcessing}
          >
            {isProcessing ? 'Processing...' : `Import ${uploadedData.length} Members`}
          </Button>
        </div>
      </div>
    </div>
  );
};
