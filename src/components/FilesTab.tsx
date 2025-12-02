
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, FileText, FileImage, FileVideo, Download, Trash2, Calendar, Sparkles, Crown, Search, Receipt, Users, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { useToast } from '../hooks/use-toast';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';
import { useAuth } from '../hooks/useAuth';
import { PaymentMethodIcon } from './receipts/PaymentMethodIcon';
import { ReceiptUploadModal } from './receipts/ReceiptUploadModal';
import { ReceiptViewModal } from './receipts/ReceiptViewModal';
import { PaymentMethod } from '../types/receipts';
import { generatePaymentDeeplink } from '../utils/paymentDeeplinks';

interface TripFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  extractedEvents?: number;
  // Receipt-specific fields
  isReceipt?: boolean;
  totalAmount?: number;
  currency?: string;
  preferredMethod?: PaymentMethod;
  splitCount?: number;
  perPersonAmount?: number;
}

interface FilesTabProps {
  tripId: string;
}

export const FilesTab = ({ tripId }: FilesTabProps) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<TripFile[]>([
    {
      id: '1',
      name: 'Dodgers Game Tickets.pdf',
      type: 'application/pdf',
      size: 245600,
      url: '/files/dodgers-tickets.pdf',
      uploadedBy: 'John Smith',
      uploadedAt: '2025-01-15T10:30:00Z',
      extractedEvents: 1
    },
    {
      id: '2',
      name: 'Conference Schedule.jpg',
      type: 'image/jpeg',
      size: 1024000,
      url: '/files/conference-schedule.jpg',
      uploadedBy: 'Sarah Wilson',
      uploadedAt: '2025-01-14T16:45:00Z',
      extractedEvents: 3
    },
    // Example receipt file
    {
      id: '3',
      name: 'Dinner at Le Comptoir.jpg',
      type: 'image/jpeg',
      size: 523800,
      url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=200&fit=crop',
      uploadedBy: 'Emma',
      uploadedAt: '2025-01-15T19:30:00Z',
      isReceipt: true,
      totalAmount: 156.80,
      currency: 'USD',
      preferredMethod: 'venmo',
      splitCount: 4,
      perPersonAmount: 39.20
    }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  // Reserved for future calendar event integration
  const [_pendingEvents, _setPendingEvents] = useState<any[]>([]);
  const [_showEventModal, _setShowEventModal] = useState(false);
  const [showReceiptUploadModal, setShowReceiptUploadModal] = useState(false);
  const [showReceiptViewModal, setShowReceiptViewModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<TripFile | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'receipts' | 'documents'>('all');
  const { toast } = useToast();
  const { isPlus } = useConsumerSubscription();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    
    for (const file of acceptedFiles) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 50MB limit.`,
          variant: "destructive"
        });
        continue;
      }

      // Simulate file upload
      const newFile: TripFile = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        uploadedBy: 'You',
        uploadedAt: new Date().toISOString()
      };

      setFiles(prev => [newFile, ...prev]);

      // If user has Plus subscription, simulate AI parsing
      if (isPlus && (file.type.includes('pdf') || file.type.includes('image'))) {
        setTimeout(() => {
          const mockEvents = [
            {
              title: file.name.includes('Dodgers') ? 'LA Dodgers vs SF Giants' : 'Conference Opening Keynote',
              date: '2025-02-15',
              startTime: '19:10',
              endTime: '22:30',
              location: file.name.includes('Dodgers') ? 'Dodger Stadium, Los Angeles, CA' : 'Convention Center, Hall A',
              fileId: newFile.id
            }
          ];
          
          setPendingEvents(prev => [...prev, ...mockEvents]);
          newFile.extractedEvents = mockEvents.length;
          setFiles(prev => prev.map(f => f.id === newFile.id ? newFile : f));
          
          toast({
            title: "AI found events! ⚡",
            description: `Found ${mockEvents.length} potential events in ${file.name}. Review them?`,
            action: (
              <Button variant="outline" size="sm" onClick={() => setShowEventModal(true)}>
                Review
              </Button>
            )
          });
        }, 2000);
      }
    }

    setIsUploading(false);
  }, [isPlus, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/calendar': ['.ics']
    }
  });

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <FileImage className="text-green-500" size={20} />;
    if (type.includes('pdf')) return <FileText className="text-red-500" size={20} />;
    if (type.includes('video')) return <FileVideo className="text-blue-500" size={20} />;
    return <File className="text-gray-500" size={20} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleReceiptUploaded = (receiptData: any) => {
    // Convert receipt data to TripFile format
    const newFile: TripFile = {
      id: Date.now().toString(),
      name: receiptData.fileName,
      type: receiptData.fileType,
      size: 500000, // Estimated size
      url: receiptData.fileUrl,
      uploadedBy: receiptData.uploaderName,
      uploadedAt: receiptData.createdAt,
      isReceipt: true,
      totalAmount: receiptData.totalAmount,
      currency: receiptData.currency,
      preferredMethod: receiptData.preferredMethod,
      splitCount: receiptData.splitCount,
      perPersonAmount: receiptData.perPersonAmount
    };
    
    setFiles(prev => [newFile, ...prev]);
    setShowReceiptUploadModal(false);
    
    toast({
      title: "Receipt uploaded",
      description: "Receipt has been added to your trip files."
    });
  };

  const handlePaymentClick = (file: TripFile) => {
    if (file.preferredMethod && file.perPersonAmount) {
      const deeplink = generatePaymentDeeplink(
        file.preferredMethod,
        file.perPersonAmount,
        file.uploadedBy
      );
      
      if (deeplink) {
        window.open(deeplink, '_blank');
      }
    }
  };
  
  const handleViewReceipt = (file: TripFile) => {
    setSelectedReceipt(file);
    setShowReceiptViewModal(true);
  };

  // Filter files based on search term and active filter
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'receipts') return matchesSearch && file.isReceipt;
    if (activeFilter === 'documents') return matchesSearch && !file.isReceipt;
    
    return matchesSearch;
  });

  const handleDeleteFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    toast({
      title: "File deleted",
      description: "File has been removed from the trip."
    });
  };

  const handleDownloadFile = (file: TripFile) => {
    // Simulate download
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Trip Files & Receipts</h3>
          <p className="text-sm text-gray-400">
            Share tickets, itineraries, receipts and more
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isPlus && (
            <Badge className="bg-gradient-to-r from-glass-orange to-glass-yellow text-black">
              <Sparkles size={12} className="mr-1" />
              AI Calendar Sync
            </Badge>
          )}
          {user && (
            <Button
              onClick={() => setShowReceiptUploadModal(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Receipt size={16} />
              Add Receipt
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'documents', 'receipts'] as const).map((filter) => (
          <Button
            key={filter}
            variant={activeFilter === filter ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(filter)}
            className="capitalize"
          >
            {filter === 'all' ? 'All Files' : filter}
            {filter === 'receipts' && (
              <Badge variant="secondary" className="ml-2">
                {files.filter(f => f.isReceipt).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Upload Area */}
      <Card className="bg-white/5 border-white/10">
        <div
          {...getRootProps()}
          className={`p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
            isDragActive 
              ? 'border-glass-orange bg-glass-orange/10' 
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-4" />
            <p className="text-white font-medium mb-2">
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              or click to browse • PDF, Images, Text, Excel, iCal supported
            </p>
            <p className="text-xs text-gray-500">
              Max 50MB per file {!isPlus && '• Upgrade to Plus for AI calendar sync'}
            </p>
            {isUploading && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-glass-orange mx-auto"></div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Basic search or use Concierge for AI search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white"
        />
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 && !isUploading ? (
        <div className="text-center py-12">
          <File className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <p className="text-gray-400">No files uploaded yet</p>
          <p className="text-sm text-gray-500">Upload your first file to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="bg-white/5 border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {file.isReceipt ? (
                    <div className="flex-shrink-0">
                      {file.type.includes('image') ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-12 h-12 rounded-lg object-cover cursor-pointer"
                          onClick={() => handleViewReceipt(file)}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-center cursor-pointer"
                             onClick={() => handleViewReceipt(file)}>
                          <Receipt size={20} className="text-green-400" />
                        </div>
                      )}
                    </div>
                  ) : (
                    getFileIcon(file.type)
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">{file.name}</p>
                      {file.isReceipt && (
                        <Badge variant="outline" className="text-green-400 border-green-400/50">
                          Receipt
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span>by {file.uploadedBy}</span>
                      <span>{formatDate(file.uploadedAt)}</span>
                      {file.extractedEvents && isPlus && (
                        <Badge variant="outline" className="text-glass-orange border-glass-orange/50">
                          <Calendar size={10} className="mr-1" />
                          {file.extractedEvents} events found
                        </Badge>
                      )}
                    </div>

                    {/* Receipt-specific info */}
                    {file.isReceipt && file.totalAmount && (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-green-400" />
                          <span className="text-white text-sm font-medium">
                            ${file.totalAmount.toFixed(2)}
                          </span>
                        </div>
                        
                        {file.splitCount && file.perPersonAmount && (
                          <div className="flex items-center gap-1">
                            <Users size={14} className="text-blue-400" />
                            <span className="text-gray-300 text-sm">
                              ${file.perPersonAmount.toFixed(2)} each ({file.splitCount} people)
                            </span>
                          </div>
                        )}
                        
                        {file.preferredMethod && (
                          <div className="flex items-center gap-2">
                            <PaymentMethodIcon method={file.preferredMethod} size={14} />
                            <span className="text-gray-300 text-sm capitalize">
                              {file.preferredMethod}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Receipt-specific payment button */}
                  {file.isReceipt && file.perPersonAmount && (
                    <Button
                      onClick={() => handlePaymentClick(file)}
                      size="sm"
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    >
                      Pay ${file.perPersonAmount.toFixed(2)}
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadFile(file)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Download size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Plus Upsell for Free Users */}
      {!isPlus && files.length > 0 && (
        <Card className="bg-gradient-to-r from-glass-orange/10 to-glass-yellow/10 border-glass-orange/30 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-glass-orange to-glass-yellow p-3 rounded-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">Upgrade to Plus</h4>
              <p className="text-gray-300 text-sm">
                Let AI automatically extract dates, times, and locations from your uploaded files and sync them to your trip calendar.
              </p>
            </div>
            <Button className="bg-gradient-to-r from-glass-orange to-glass-yellow text-white hover:opacity-90">
              Upgrade Now
            </Button>
          </div>
        </Card>
      )}

      {/* Receipt Upload Modal */}
      <ReceiptUploadModal
        isOpen={showReceiptUploadModal}
        onClose={() => setShowReceiptUploadModal(false)}
        onReceiptUploaded={handleReceiptUploaded}
        tripId={tripId}
      />

      {/* Receipt View Modal */}
      {selectedReceipt && selectedReceipt.isReceipt && (
        <ReceiptViewModal
          isOpen={showReceiptViewModal}
          onClose={() => setShowReceiptViewModal(false)}
          receipt={{
            id: selectedReceipt.id,
            tripId: tripId,
            uploaderId: 'user1',
            uploaderName: selectedReceipt.uploadedBy,
            fileUrl: selectedReceipt.url,
             
            totalAmount: selectedReceipt.totalAmount || 0,
            currency: selectedReceipt.currency || 'USD',
            preferredMethod: selectedReceipt.preferredMethod || 'venmo',
            splitCount: selectedReceipt.splitCount,
            perPersonAmount: selectedReceipt.perPersonAmount,
            createdAt: selectedReceipt.uploadedAt
          }}
        />
      )}
    </div>
  );
};
