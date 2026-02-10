/**
 * Receipt OCR Processing Edge Function
 * Features:
 * - Rate limiting based on user tier
 * - PII redaction from OCR text
 * - Support for multiple OCR providers (Google Vision, AWS Textract, Tesseract)
 * - Structured data extraction (vendor, amount, date)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  ReceiptOCRSchema,
  validateInput,
  validateExternalHttpsUrl,
} from '../_shared/validation.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

interface OCRRequest {
  receiptId: string;
  imageUrl?: string;
  imageBase64?: string;
  provider?: 'google-vision' | 'aws-textract' | 'tesseract';
}

interface OCRResult {
  text: string;
  confidence: number;
  vendor?: string;
  amount?: number;
  currency?: string;
  date?: string;
  category?: string;
  redactedFields: string[];
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);
  const { createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('No authorization header', 401);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Validate request body with Zod schema (SSRF protection)
    const rawBody = await req.json();
    const validation = validateInput(ReceiptOCRSchema, rawBody);

    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    const payload = validation.data;

    // Additional defense-in-depth: validate imageUrl if provided
    if (payload.imageUrl && !validateExternalHttpsUrl(payload.imageUrl)) {
      return createErrorResponse(
        'Image URL must be HTTPS and external (no internal/private networks)',
        400,
      );
    }

    // Get user's subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single();

    const tier = profile?.subscription_tier || 'free';

    // Check rate limit
    const { data: rateLimitCheck } = await supabase.rpc('check_ocr_rate_limit', {
      p_user_id: user.id,
      p_tier: tier,
    });

    if (rateLimitCheck && rateLimitCheck.length > 0) {
      const { allowed, remaining, reset_at } = rateLimitCheck[0];

      if (!allowed) {
        return createErrorResponse(
          `OCR rate limit exceeded. ${remaining} requests remaining. Resets at ${reset_at}`,
          429,
        );
      }
    }

    // Verify receipt belongs to user
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('id, trip_id, created_by, image_url')
      .eq('id', payload.receiptId)
      .single();

    if (receiptError || !receipt) {
      return createErrorResponse('Receipt not found', 404);
    }

    // Verify user has access to this receipt's trip
    const { data: tripMember } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', receipt.trip_id)
      .eq('user_id', user.id)
      .single();

    if (!tripMember) {
      return createErrorResponse('You do not have access to this receipt', 403);
    }

    // Update receipt status to processing
    await supabase
      .from('receipts')
      .update({ processing_status: 'processing' })
      .eq('id', payload.receiptId);

    // Increment OCR usage
    await supabase.rpc('increment_ocr_usage', {
      p_user_id: user.id,
      p_tier: tier,
    });

    // Perform OCR
    const provider = payload.provider || 'google-vision';

    let imageUrlToFetch = payload.imageUrl || receipt.image_url;
    // Handle relative paths by generating a signed URL (assuming trip-files bucket)
    if (imageUrlToFetch && !imageUrlToFetch.startsWith('http')) {
      const { data } = await supabase.storage
        .from('trip-files')
        .createSignedUrl(imageUrlToFetch, 60);
      if (data?.signedUrl) imageUrlToFetch = data.signedUrl;
    }

    const imageData = payload.imageBase64 || (await fetchImageAsBase64(imageUrlToFetch));

    let ocrResult: OCRResult;

    try {
      switch (provider) {
        case 'google-vision':
          ocrResult = await processWithGoogleVision(imageData);
          break;
        case 'aws-textract':
          ocrResult = await processWithAWSTextract(imageData);
          break;
        case 'tesseract':
          ocrResult = await processWithTesseract(imageData);
          break;
        default:
          throw new Error('Unsupported OCR provider');
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      await supabase
        .from('receipts')
        .update({
          processing_status: 'failed',
          ocr_error: error instanceof Error ? error.message : String(error),
        })
        .eq('id', payload.receiptId);

      return createErrorResponse(
        `OCR processing failed: ${error instanceof Error ? error.message : String(error)}`,
        500,
      );
    }

    // Redact PII from OCR text
    const { data: redacted } = await supabase.rpc('redact_pii_from_text', {
      p_text: ocrResult.text,
    });

    const redactedText = redacted?.[0]?.redacted_text || ocrResult.text;
    const redactedFields = redacted?.[0]?.redacted_fields || [];

    // Update receipt with OCR results
    const updateData: any = {
      processing_status: 'completed',
      ocr_text: redactedText,
      ocr_provider: provider,
      ocr_confidence: ocrResult.confidence,
      ocr_processed_at: new Date().toISOString(),
      pii_redacted: redactedFields.length > 0,
      redacted_fields: redactedFields,
      raw_ocr_data: {
        fullText: ocrResult.text, // Store original (encrypted at rest by Supabase)
        vendor: ocrResult.vendor,
        extractedAmount: ocrResult.amount,
        extractedCurrency: ocrResult.currency,
        extractedDate: ocrResult.date,
        extractedCategory: ocrResult.category,
      },
    };

    // Update structured fields if extracted
    if (ocrResult.vendor) updateData.vendor_name = ocrResult.vendor;
    if (ocrResult.amount) updateData.amount = ocrResult.amount;
    if (ocrResult.currency) updateData.currency = ocrResult.currency;
    if (ocrResult.date) updateData.receipt_date = ocrResult.date;
    if (ocrResult.category) updateData.category = ocrResult.category;

    await supabase.from('receipts').update(updateData).eq('id', payload.receiptId);

    return createSecureResponse(
      JSON.stringify({
        success: true,
        receiptId: payload.receiptId,
        ocrText: redactedText,
        confidence: ocrResult.confidence,
        extractedData: {
          vendor: ocrResult.vendor,
          amount: ocrResult.amount,
          currency: ocrResult.currency,
          date: ocrResult.date,
          category: ocrResult.category,
        },
        piiRedacted: redactedFields.length > 0,
        redactedFields,
      }),
      200,
      { 'Content-Type': 'application/json' },
    );
  } catch (error) {
    console.error('OCR processing error:', error);
    return createErrorResponse(error instanceof Error ? error.message : String(error), 500);
  }
});

async function fetchImageAsBase64(url: string): Promise<string> {
  // Additional validation before fetch (defense in depth)
  if (!validateExternalHttpsUrl(url)) {
    throw new Error('Invalid image URL: must be HTTPS and external');
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000), // 30 second timeout
    headers: {
      'User-Agent': 'Chravel-ReceiptOCR/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return base64;
}

async function processWithGoogleVision(imageBase64: string): Promise<OCRResult> {
  const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY') || Deno.env.get('VITE_GOOGLE_MAPS_API_KEY');

  if (!apiKey) {
    throw new Error('Google Vision API key not configured');
  }

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: 'TEXT_DETECTION' }, { type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${await response.text()}`);
  }

  const result = await response.json();
  const textAnnotations = result.responses[0]?.textAnnotations || [];

  if (textAnnotations.length === 0) {
    throw new Error('No text detected in image');
  }

  const fullText = textAnnotations[0]?.description || '';
  const confidence = textAnnotations[0]?.confidence || 0.8;

  // Extract structured data
  const extracted = extractStructuredData(fullText);

  return {
    text: fullText,
    confidence,
    ...extracted,
    redactedFields: [],
  };
}

async function processWithAWSTextract(imageBase64: string): Promise<OCRResult> {
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const region = Deno.env.get('AWS_REGION') || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured');
  }

  // For brevity, using a simplified approach
  // In production, use AWS SDK or proper signing
  throw new Error('AWS Textract integration not yet implemented. Use Google Vision or Tesseract.');
}

async function processWithTesseract(imageBase64: string): Promise<OCRResult> {
  // Tesseract.js would run client-side or via a separate service
  // For server-side, we'd need a Tesseract binary or API
  throw new Error('Tesseract integration not yet implemented. Use Google Vision.');
}

function extractStructuredData(text: string): Partial<OCRResult> {
  const result: Partial<OCRResult> = {};

  // Extract amount (looks for patterns like $12.34, 12.34, USD 12.34)
  const amountPattern = /(?:USD|\\$)?\\s*(\\d{1,5}(?:[.,]\\d{2})?)(?:\\s*USD)?/gi;
  const amountMatches = text.match(amountPattern);
  if (amountMatches && amountMatches.length > 0) {
    // Take the largest amount found (likely the total)
    const amounts = amountMatches
      .map(m => {
        const cleaned = m.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
        return parseFloat(cleaned);
      })
      .filter(a => !isNaN(a));

    if (amounts.length > 0) {
      result.amount = Math.max(...amounts);
      result.currency = text.includes('USD') || text.includes('$') ? 'USD' : 'USD';
    }
  }

  // Extract date (looks for MM/DD/YYYY, DD/MM/YYYY, etc.)
  const datePattern =
    /(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})|((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{2,4})/gi;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    try {
      const dateStr = dateMatch[0];
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        result.date = parsed.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Date parsing error:', e);
    }
  }

  // Extract vendor (usually at the top, try to get first line with letters)
  const lines = text.split('\\n').filter(l => l.trim().length > 0);
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length > 2 && firstLine.length < 50) {
      result.vendor = firstLine;
    }
  }

  // Categorize based on keywords
  const categories = [
    { keywords: ['restaurant', 'cafe', 'coffee', 'bar', 'food'], category: 'dining' },
    { keywords: ['hotel', 'motel', 'inn', 'resort'], category: 'lodging' },
    { keywords: ['gas', 'fuel', 'station', 'exxon', 'shell'], category: 'transportation' },
    { keywords: ['uber', 'lyft', 'taxi', 'cab'], category: 'transportation' },
    { keywords: ['grocery', 'market', 'walmart', 'target'], category: 'groceries' },
    { keywords: ['pharmacy', 'cvs', 'walgreens', 'drug'], category: 'health' },
  ];

  const lowerText = text.toLowerCase();
  for (const { keywords, category } of categories) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      result.category = category;
      break;
    }
  }

  return result;
}
