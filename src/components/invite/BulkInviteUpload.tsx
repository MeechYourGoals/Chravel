import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BulkInviteRow {
  email: string;
  name?: string;
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
}

interface BulkInviteUploadProps {
  onProcess: (emails: string[]) => Promise<void>;
  maxRows?: number;
}

/**
 * BulkInviteUpload Component
 *
 * Allows trip organizers to upload a CSV file with email addresses
 * for bulk invitations. Supports CSV parsing and validation.
 *
 * CSV Format:
 * - First column: Email (required)
 * - Second column: Name (optional)
 *
 * Features:
 * - CSV file upload and parsing
 * - Email validation
 * - Preview of parsed data before sending
 * - Error handling for invalid rows
 * - Mobile-responsive design
 */
export const BulkInviteUpload: React.FC<BulkInviteUploadProps> = ({ onProcess, maxRows = 100 }) => {
  const [rows, setRows] = useState<BulkInviteRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const parseCSV = (csvText: string): BulkInviteRow[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const parsed: BulkInviteRow[] = [];

    for (let i = 0; i < Math.min(lines.length, maxRows); i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted values)
      const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      const email = columns[0]?.trim();
      const name = columns[1]?.trim();

      if (!email) {
        parsed.push({
          email: '',
          name,
          status: 'invalid',
          error: 'Missing email address',
        });
        continue;
      }

      if (!validateEmail(email)) {
        parsed.push({
          email,
          name,
          status: 'invalid',
          error: 'Invalid email format',
        });
        continue;
      }

      parsed.push({
        email,
        name,
        status: 'valid',
      });
    }

    return parsed;
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast.error('No valid email addresses found in CSV');
        return;
      }

      setRows(parsed);
      toast.success(`Parsed ${parsed.length} row(s) from CSV`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV file. Please check the format.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleProcess = async () => {
    const validEmails = rows.filter(row => row.status === 'valid').map(row => row.email);

    if (validEmails.length === 0) {
      toast.error('No valid email addresses to process');
      return;
    }

    setIsProcessing(true);
    try {
      await onProcess(validEmails);
      toast.success(`Successfully sent ${validEmails.length} invitation(s)`);
      setRows([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error processing bulk invites:', error);
      toast.error('Failed to send some invitations. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = rows.filter(r => r.status === 'valid').length;
  const invalidCount = rows.filter(r => r.status === 'invalid').length;

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      {rows.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 bg-gray-800/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-white mb-2">
            Drag and drop a CSV file here, or{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              browse
            </button>
          </p>
          <p className="text-gray-400 text-sm">CSV format: email,name (one per line)</p>
          <p className="text-gray-500 text-xs mt-2">Maximum {maxRows} rows per upload</p>
        </div>
      )}

      {/* Preview Table */}
      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">{rows.length} row(s) loaded</span>
              </div>
              {validCount > 0 && (
                <div className="flex items-center gap-1 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{validCount} valid</span>
                </div>
              )}
              {invalidCount > 0 && (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{invalidCount} invalid</span>
                </div>
              )}
            </div>
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto border border-gray-600 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-300">Email</th>
                  <th className="px-4 py-2 text-left text-gray-300">Name</th>
                  <th className="px-4 py-2 text-left text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-t border-gray-700 ${
                      row.status === 'invalid' ? 'bg-red-500/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-white">{row.email}</td>
                    <td className="px-4 py-2 text-gray-400">{row.name || '-'}</td>
                    <td className="px-4 py-2">
                      {row.status === 'valid' ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Valid
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {row.error || 'Invalid'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleProcess}
              disabled={isProcessing || validCount === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>Send {validCount} Invitation(s)</>
              )}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
