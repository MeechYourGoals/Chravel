import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, Image, Calendar, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    filename: string;
    media_url: string;
    media_type: string;
    file_size?: number;
    metadata?: any;
    source: 'chat' | 'upload';
    created_at: string;
  } | null;
}

export const FileDetailModal: React.FC<FileDetailModalProps> = ({ isOpen, onClose, file }) => {
  if (!file) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.media_url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = () => {
    if (file.metadata?.isTicket) return <FileText className="w-5 h-5" />;
    if (file.metadata?.isSchedule) return <Calendar className="w-5 h-5" />;
    if (file.metadata?.isReceipt) return <Receipt className="w-5 h-5" />;
    if (file.media_type === 'image') return <Image className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const renderPreview = () => {
    if (
      file.media_type === 'image' ||
      file.filename.endsWith('.jpg') ||
      file.filename.endsWith('.jpeg') ||
      file.filename.endsWith('.png')
    ) {
      return (
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={file.media_url}
            alt={file.filename}
            className="w-full h-full object-contain"
            onError={e => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDEySDMuNUw2IDkuNUw5IDEyLjVMMTUgNi41TDIwLjUgMTJIMTQiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
            }}
          />
        </div>
      );
    }

    if (file.media_type === 'document' || file.filename.endsWith('.pdf')) {
      return (
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">PDF Document</p>
          </div>
        </div>
      );
    }

    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          {getFileIcon()}
          <p className="text-sm text-muted-foreground mt-2">File Preview</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {getFileIcon()}
              {file.filename}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {renderPreview()}

          {/* File Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground">Size</label>
              <p className="font-medium">{formatFileSize(file.file_size)}</p>
            </div>
            <div>
              <label className="text-muted-foreground">Source</label>
              <p className="font-medium capitalize">
                {file.source === 'chat' ? 'From Chat' : 'Manual Upload'}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground">Date</label>
              <p className="font-medium">{formatDate(file.created_at)}</p>
            </div>
            <div>
              <label className="text-muted-foreground">Type</label>
              <p className="font-medium capitalize">{file.media_type}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex gap-2">
            {file.metadata?.isTicket && <Badge variant="outline">Ticket</Badge>}
            {file.metadata?.isSchedule && <Badge variant="outline">Schedule</Badge>}
            {file.metadata?.isReceipt && <Badge variant="outline">Receipt</Badge>}
            {file.metadata?.extractedEvents && (
              <Badge variant="secondary">{file.metadata.extractedEvents} Events</Badge>
            )}
          </div>

          {/* Receipt Details */}
          {file.metadata?.isReceipt && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Receipt Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Total: ${file.metadata.totalAmount}</div>
                <div>Split {file.metadata.splitCount} ways</div>
                <div>Per person: ${file.metadata.perPersonAmount}</div>
                <div>Preferred: {file.metadata.preferredMethod}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
