/**
 * Cross-platform printing utility
 * - Web: Opens an iframe to print the blob
 * - Native (Despia): Uploads the blob to Supabase storage and invokes native print dialog
 */

import { supabase } from '@/integrations/supabase/client';
import { isDespia, printDocument } from '@/native/despia';
import { shareRecapPdf } from '@/native/share';
import { uploadTripMedia } from '@/services/mediaService';
import { toast } from 'sonner';

/**
 * Print a PDF blob with cross-platform support.
 *
 * @param blob - The PDF blob to print
 * @param filename - The filename for the print job (and upload path)
 * @param tripId - Optional trip ID for authenticated uploads (required for native print)
 */
export async function printPdf(blob: Blob, filename: string, tripId?: string): Promise<void> {
  // 1. Native Environment (Despia)
  if (isDespia()) {
    try {
      // Must have tripId and user must be authenticated to upload
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!tripId || !user) {
        console.warn('[Print] Missing tripId or user for native print upload. Falling back to Share.');
        // Fallback to share sheet which has a "Print" action
        await shareRecapPdf({ pdfBlob: blob, filename, title: 'Print Recap' });
        return;
      }

      // Convert Blob to File for uploadTripMedia
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Upload to 'trip-media' bucket using mediaService (handles MIME checks, DB indexing)
      // Note: We upload to the main trip media bucket so it's accessible.
      // Ideally, we'd have a temporary bucket, but trip-media is configured with correct RLS.
      // We rely on standard media upload which puts it in `trip_media_index`.
      // This has the side effect of showing the recap in the "Files" tab, which is acceptable (or even desired).
      const uploadedMedia = await uploadTripMedia(tripId, file, user.id);

      // We need a publicly accessible URL (or signed URL) for the native print dialog to fetch.
      // uploadTripMedia returns `media_url` which is usually public if the bucket is public,
      // or we can generate a signed URL if needed.
      // Assuming 'trip-media' bucket policies allow read access to authenticated users or public.
      // Let's generate a signed URL to be safe and ensure access for the native print webview/process.
      let printUrl = uploadedMedia.media_url;

      // If the returned URL is a Supabase Storage URL, try to sign it for short-term access
      // to ensure the native print process (which might not share cookies) can read it.
      // However, `uploadTripMedia` typically returns the `getPublicUrl` result.
      // If the bucket is private, we MUST use a signed URL.
      // Let's generate a signed URL for 1 hour to be safe.
      if (uploadedMedia.metadata?.upload_path) {
        const { data: signedData } = await supabase.storage
          .from('trip-media')
          .createSignedUrl(uploadedMedia.metadata.upload_path as string, 3600);

        if (signedData?.signedUrl) {
          printUrl = signedData.signedUrl;
        }
      }

      // Invoke native print
      printDocument(printUrl, filename.replace('.pdf', ''));
      return;
    } catch (error) {
      console.error('[Print] Native print failed:', error);
      toast.error('Printer connection failed. Opening share options...');
      // Fallback to share sheet
      await shareRecapPdf({ pdfBlob: blob, filename, title: 'Print Recap' });
      return;
    }
  }

  // 2. Web Environment
  try {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    // Wait for the iframe to load before printing
    iframe.onload = () => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print error:', e);
      } finally {
        // Cleanup after a delay to allow print dialog to open
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 60000); // 1 minute delay (some browsers need the iframe to stay alive during print dialog)
      }
    };
  } catch (error) {
    console.error('[Print] Web print failed:', error);
    // Fallback: just open/download it
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
