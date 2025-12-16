/**
 * Utility to determine MIME type from filename extension
 * Used as a fallback when File.type is missing or empty
 */
export const getMimeTypeFromFilename = (filename: string): string | undefined => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    // Images
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    
    // Videos
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    case 'webm': return 'video/webm';
    case 'mkv': return 'video/x-matroska';
    case 'm4v': return 'video/x-m4v';
    
    // Documents
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt': return 'application/vnd.ms-powerpoint';
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'txt': return 'text/plain';
    case 'csv': return 'text/csv';
    case 'rtf': return 'application/rtf';
    case 'zip': return 'application/zip';
    
    default: return undefined;
  }
};
