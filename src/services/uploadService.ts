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

  const { error } = await supabase.storage
    .from('advertiser-assets')
    .upload(key, file, {
      contentType: file.type || file.mime || 'application/octet-stream',
      upsert: false,
    });

  if (error) throw error;
  const { data: pub } = supabase.storage
    .from('advertiser-assets')
    .getPublicUrl(key);

  return { key, publicUrl: pub.publicUrl };
}

export async function insertMediaIndex(params: {
  tripId: string;
  mediaType: MediaType | 'document';
  url: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedBy?: string;
}) {
  const { data, error } = await supabase
    .from<'trip_media_index', Tables['trip_media_index']['Insert']>('trip_media_index')
    .insert({
      trip_id: params.tripId,
      media_type: params.mediaType,
      media_url: params.url,
      filename: params.filename ?? null,
      mime_type: params.mimeType ?? null,
      file_size: params.sizeBytes ?? null,
      metadata: { uploaded_by: params.uploadedBy ?? null },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function insertFileIndex(params: {
  tripId: string;
  name: string;
  url: string;
  mime: string;
  sizeBytes: number;
  uploadedBy?: string;
}) {
  const { data, error } = await supabase
    .from<'trip_files', Tables['trip_files']['Insert']>('trip_files')
    .insert({
      trip_id: params.tripId,
      name: params.name,
      file_type: params.mime,
      uploaded_by: params.uploadedBy || 'unknown',
      // Optional AI fields are left null; storage URL kept client-side
      ai_summary: null,
      content_text: null,
      extracted_events: 0,
    })
    .select()
    .single();

  if (error) throw error;

  return { ...data, public_url: params.url } as (Tables['trip_files']['Row'] & { public_url: string });
}
