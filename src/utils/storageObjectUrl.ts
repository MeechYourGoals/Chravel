import { supabase } from '@/integrations/supabase/client';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

interface ResolveStorageObjectUrlParams {
  bucket: string;
  path: string;
  signedUrlTtlSeconds?: number;
}

/**
 * Prefer signed URLs so private/protected buckets still render in UI.
 * Falls back to public URL for environments that still use public buckets.
 */
export async function resolveStorageObjectUrl({
  bucket,
  path,
  signedUrlTtlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS,
}: ResolveStorageObjectUrlParams): Promise<string> {
  try {
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, signedUrlTtlSeconds);

    if (!signedError && signedData?.signedUrl) {
      return signedData.signedUrl;
    }
  } catch {
    // Fall through to public URL fallback.
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicData.publicUrl;
}
