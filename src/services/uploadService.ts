import { supabase } from '@/integrations/supabase/client';
import { getUploadContentType } from '@/utils/mime';

// Generate UUID using crypto API
const uuid = () => crypto.randomUUID();

export type MediaType = 'image' | 'video';
export type FileUpload = File & { mime?: string };

export async function uploadToStorage(
  file: FileUpload,
  tripId: string,
  subdir: 'images' | 'videos' | 'files',
) {
  let fileToUpload: File | Blob = file;

  // Compress images before upload using Canvas to avoid WebWorker issues and ensure fast execution
  if (subdir === 'images' && file.type.startsWith('image/') && file.type !== 'image/gif') {
    try {
      fileToUpload = await new Promise<File>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            const maxWidthOrHeight = 1920;

            if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
              if (width > height) {
                height = Math.round((height *= maxWidthOrHeight / width));
                width = maxWidthOrHeight;
              } else {
                width = Math.round((width *= maxWidthOrHeight / height));
                height = maxWidthOrHeight;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas ctx null'));

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (!blob) return reject(new Error('Canvas toBlob null'));
                resolve(new File([blob], file.name, { type: file.type === 'image/png' ? 'image/png' : 'image/jpeg' }));
              },
              file.type === 'image/png' ? 'image/png' : 'image/jpeg',
              0.8 // 80% quality
            );
          };
          img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
      });
      console.log('Image compressed:', {
        original: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        compressed: (fileToUpload.size / 1024 / 1024).toFixed(2) + 'MB',
      });
    } catch (error) {
      console.warn('Failed to compress image, uploading original:', error);
      fileToUpload = file;
    }
  }

  const id = uuid();
  const ext = file.name.split('.').pop() ?? 'bin';
  const key = `${tripId}/${subdir}/${id}.${ext}`;

  const contentType = getUploadContentType(file);

  const { data: _data, error } = await supabase.storage
    .from('trip-media')
    .upload(key, fileToUpload, {
      contentType,
      upsert: false,
    });

  if (error) throw error;
  const { data: pub } = supabase.storage.from('trip-media').getPublicUrl(key);
  return { key, publicUrl: pub.publicUrl };
}

export async function insertMediaIndex(params: {
  tripId: string;
  mediaType: MediaType;
  url: string;
  uploadPath?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  messageId?: string;
  uploadedBy?: string;
}) {
  const normalizedMimeType =
    params.mimeType && params.mimeType.length > 0 ? params.mimeType : undefined;
  const { data, error } = await supabase
    .from('trip_media_index')
    .insert({
      trip_id: params.tripId,
      media_type: params.mediaType,
      media_url: params.url,
      filename: params.filename ?? null,
      file_size: params.fileSize ?? null,
      mime_type: normalizedMimeType ?? null,
      message_id: params.messageId ?? null,
      metadata:
        params.uploadedBy || params.uploadPath
          ? {
              ...(params.uploadedBy ? { uploaded_by: params.uploadedBy } : {}),
              ...(params.uploadPath ? { upload_path: params.uploadPath } : {}),
            }
          : null,
      caption: null,
      tags: [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertFileIndex(params: {
  tripId: string;
  name: string;
  fileType: string;
  uploadedBy: string;
}) {
  const { data, error } = await supabase
    .from('trip_files')
    .insert({
      trip_id: params.tripId,
      name: params.name,
      file_type: params.fileType,
      uploaded_by: params.uploadedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
