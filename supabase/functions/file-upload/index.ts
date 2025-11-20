import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { 
  FileUploadSchema, 
  validateInput,
  isBlockedExtension,
  isValidFileType,
  ALLOWED_FILE_TYPES
} from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return createOptionsResponse();
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tripId = formData.get('tripId') as string;
    const userId = formData.get('userId') as string;

    if (!file || !tripId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate using Zod schema
    const validation = validateInput(FileUploadSchema, { file, tripId, userId });
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Additional explicit checks for better error messages
    // Check file extension (block executables and scripts)
    if (isBlockedExtension(file.name)) {
      return new Response(
        JSON.stringify({ 
          error: `File type not allowed: ${file.name.split('.').pop()} files are blocked for security reasons` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File size too large (max 50MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check MIME type
    const allowedTypes = [
      ...ALLOWED_FILE_TYPES.images,
      ...ALLOWED_FILE_TYPES.documents,
      ...ALLOWED_FILE_TYPES.media
    ];
    if (!isValidFileType(file.type, allowedTypes)) {
      return new Response(
        JSON.stringify({ 
          error: `File type not allowed: ${file.type}. Allowed types: images, documents (PDF, DOCX, XLSX, TXT, CSV), and media (MP4, MOV, MP3, WAV)` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${tripId}/${fileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('trip-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('trip_files')
      .insert({
        trip_id: tripId,
        file_name: file.name,
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userId,
        metadata: {
          original_name: file.name,
          upload_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save file metadata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        file: fileRecord,
        downloadUrl: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/trip-files/${uploadData.path}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in file-upload function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});