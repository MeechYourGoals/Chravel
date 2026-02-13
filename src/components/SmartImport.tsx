import React, { useState, useCallback } from 'react';
import {
  Upload,
  Link,
  FileText,
  Users,
  Calendar,
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { parseCalendarFile, parseURLSchedule } from '@/utils/calendarImportParsers';

interface ParseConfig {
  targetType: 'roster' | 'schedule' | 'events';
  expectedFields: string[];
  description: string;
}

interface SmartImportProps {
  targetCollection: string;
  parseConfig: ParseConfig;
  onDataImported: (data: any[]) => void;
  className?: string;
}

export const SmartImport = ({
  targetCollection,
  parseConfig,
  onDataImported,
  className,
}: SmartImportProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [lastResult, setLastResult] = useState<{ success: boolean; count: number } | null>(null);
  const { toast } = useToast();

  const getIcon = () => {
    switch (parseConfig.targetType) {
      case 'roster':
        return Users;
      case 'schedule':
        return Calendar;
      case 'events':
        return Calendar;
      default:
        return FileText;
    }
  };

  const Icon = getIcon();
  const isCalendarTarget =
    parseConfig.targetType === 'schedule' || parseConfig.targetType === 'events';

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setIsProcessing(true);
      setLastResult(null);

      try {
        if (isCalendarTarget) {
          const result = await parseCalendarFile(file);
          if (!result.isValid || result.events.length === 0) {
            throw new Error(result.errors[0] || 'No valid schedule events found in the file');
          }

          const processedData = processImportedData(result.events, parseConfig.targetType);
          onDataImported(processedData);
          setLastResult({ success: true, count: processedData.length });
          toast({
            title: 'Import Successful',
            description: `Successfully imported ${processedData.length} ${parseConfig.targetType} records`,
          });
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('extractionType', parseConfig.targetType);
        formData.append('targetCollection', targetCollection);

        const response = await fetch('/api/supabase/functions/file-ai-parser', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to process file');
        }

        const result = await response.json();
        const importedData = result.extracted_data;

        // Process the data based on target type
        const processedData = processImportedData(importedData, parseConfig.targetType);

        if (processedData && processedData.length > 0) {
          onDataImported(processedData);
          setLastResult({ success: true, count: processedData.length });
          toast({
            title: 'Import Successful',
            description: `Successfully imported ${processedData.length} ${parseConfig.targetType} records`,
          });
        } else {
          throw new Error('No valid data could be extracted from the file');
        }
      } catch (error) {
        console.error('Import error:', error);
        setLastResult({ success: false, count: 0 });
        toast({
          title: 'Import Failed',
          description: error instanceof Error ? error.message : 'Failed to import data',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isCalendarTarget, parseConfig, targetCollection, onDataImported, toast],
  );

  const handleUrlImport = useCallback(async () => {
    if (!urlInput.trim()) return;

    setIsProcessing(true);
    setLastResult(null);

    try {
      if (isCalendarTarget) {
        const result = await parseURLSchedule(urlInput.trim());
        if (!result.isValid || result.events.length === 0) {
          throw new Error(result.errors[0] || 'No valid schedule events found on this page');
        }

        const processedData = processImportedData(result.events, parseConfig.targetType);
        onDataImported(processedData);
        setLastResult({ success: true, count: processedData.length });
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${processedData.length} ${parseConfig.targetType} records from URL`,
        });
        return;
      }

      const response = await fetch('/api/supabase/functions/file-ai-parser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: urlInput,
          extractionType: parseConfig.targetType,
          targetCollection: targetCollection,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process URL');
      }

      const result = await response.json();
      const importedData = result.extracted_data;

      const processedData = processImportedData(importedData, parseConfig.targetType);

      if (processedData && processedData.length > 0) {
        onDataImported(processedData);
        setLastResult({ success: true, count: processedData.length });
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${processedData.length} ${parseConfig.targetType} records from URL`,
        });
      } else {
        throw new Error('No valid data could be extracted from the URL');
      }
    } catch (error) {
      console.error('URL import error:', error);
      setLastResult({ success: false, count: 0 });
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import data from URL',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setUrlInput('');
    }
  }, [isCalendarTarget, urlInput, parseConfig, targetCollection, onDataImported, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <Card className={`bg-white/5 border-white/10 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Icon size={20} />
          AI Smart Import -{' '}
          {parseConfig.targetType.charAt(0).toUpperCase() + parseConfig.targetType.slice(1)}
        </CardTitle>
        <p className="text-sm text-gray-400">{parseConfig.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Drop Zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
            ${
              isDragActive
                ? 'border-primary bg-primary/10'
                : 'border-gray-600 hover:border-gray-500'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
            <div className="text-white">
              {isProcessing
                ? 'Processing your file...'
                : isDragActive
                  ? 'Drop your file here...'
                  : 'Drop PDF, CSV, Excel or image files here, or click to select'}
            </div>
            <p className="text-xs text-gray-500">
              Supports: PDF documents, CSV/Excel spreadsheets, team roster images
            </p>
          </div>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link size={16} className="text-gray-400" />
            <span className="text-sm text-gray-300">Or import from URL</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Paste URL to team roster, schedule, or document..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              disabled={isProcessing}
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
            />
            <Button
              onClick={handleUrlImport}
              disabled={isProcessing || !urlInput.trim()}
              variant="outline"
              className="border-gray-600 text-white hover:bg-white/10"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Import'}
            </Button>
          </div>
        </div>

        {/* Result Status */}
        {lastResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              lastResult.success
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            {lastResult.success ? (
              <CheckCircle size={16} className="text-green-400" />
            ) : (
              <AlertCircle size={16} className="text-red-400" />
            )}
            <span className={`text-sm ${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {lastResult.success
                ? `Successfully imported ${lastResult.count} records`
                : 'Import failed - please check your file format'}
            </span>
          </div>
        )}

        {/* Expected Fields Info */}
        <div className="bg-white/5 rounded-lg p-3">
          <h4 className="text-sm font-medium text-white mb-2">Expected Data Fields:</h4>
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
            {parseConfig.expectedFields.map(field => (
              <div key={field} className="flex items-center gap-1">
                <div className="w-1 h-1 bg-primary rounded-full"></div>
                {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to process imported data based on type
function processImportedData(data: any, targetType: string): any[] {
  if (!data) return [];

  switch (targetType) {
    case 'roster':
      if (data.roster_members) return data.roster_members;
      if (data.players) return data.players;
      if (data.members) return data.members;
      if (Array.isArray(data)) return data;
      break;

    case 'schedule':
      if (data.games) return data.games;
      if (data.events) return data.events;
      if (data.schedule) return data.schedule;
      if (Array.isArray(data)) return data;
      break;

    case 'events':
      if (data.sessions) return data.sessions;
      if (data.events) return data.events;
      if (data.schedule) return data.schedule;
      if (Array.isArray(data)) return data;
      break;
  }

  return [];
}
