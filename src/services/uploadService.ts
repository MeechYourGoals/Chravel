import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { v4 as uuid } from 'uuid';

type Tables = Database['public']['Tables'];

export type MediaType = 'image' | 'video';
export type FileUpload = File & { mime?: string };

export async function uploadToStorage(
  file: FileUpload,
  tripId: string,
  subdir: 'images' | 'videos' | 'files'
) {
  const id = uuid();
  const ext = file.name.split('.').pop() ?? 'bin';
  const key = `${tripId}/${subdir}/${id}.${ext}`;

  const { data, error } = await supabase.storage
    .from('advertiser-assets')
    .upload(key, file, {
      contentType: file.type || file.mime || 'application/octet-stream',
      upsert: false,
    });

  if (error) throw error;
  const { data: pub } = supabase.storage.from('advertiser-assets').getPublicUrl(key);
  return { key, publicUrl: pub.publicUrl };
}

export async function insertMediaIndex(params: {
  tripId: string;
  mediaType: MediaType;
  url: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  messageId?: string;
  uploadedBy?: string;
}) {
  const { data, error } = await supabase
    .from('trip_media_index')
    .insert({
      trip_id: params.tripId,
      media_type: params.mediaType,
      media_url: params.url,
      filename: params.filename ?? null,
      file_size: params.fileSize ?? null,
      mime_type: params.mimeType ?? null,
      message_id: params.messageId ?? null,
      metadata: params.uploadedBy ? { uploaded_by: params.uploadedBy } : null,
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