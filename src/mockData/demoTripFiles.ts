import TripSpecificMockDataService from '@/services/tripSpecificMockDataService';

export type DemoTripFile = {
  id: string;
  trip_id: string;
  name: string;
  file_type: string;
  created_at: string;
  uploaded_by?: string;
  file_size?: number;
};

const demoTripIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const normalizeFileType = (mimeType?: string, fallback?: string) => {
  if (mimeType) return mimeType;
  if (fallback === 'document') return 'application/octet-stream';
  if (fallback === 'image') return 'image/jpeg';
  if (fallback === 'video') return 'video/mp4';
  return 'application/octet-stream';
};

export const demoTripFilesByTripId: Record<string, DemoTripFile[]> = Object.fromEntries(
  demoTripIds.map(tripId => {
    const files = TripSpecificMockDataService.getMockMediaByType(tripId, 'files');
    const formattedFiles = files.map(file => ({
      id: file.id,
      trip_id: String(tripId),
      name: file.filename,
      file_type: normalizeFileType(file.mime_type, file.media_type),
      created_at: file.created_at,
      uploaded_by: 'Demo Traveler',
      file_size: file.file_size,
    }));

    return [String(tripId), formattedFiles];
  })
);
