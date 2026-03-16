/**
 * artifact-ingest — Multimodal trip artifact ingestion pipeline
 *
 * Accepts text, image, or PDF artifacts, extracts content,
 * classifies, embeds via Gemini Embedding 2, and stores in trip_artifacts.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sanitizeErrorForClient, logError } from '../_shared/errorHandling.ts';
import { invokeChatModel, extractTextFromChatResponse } from '../_shared/gemini.ts';
import {
  embedByModality,
  detectModality,
  type EmbeddingModality,
} from '../_shared/multimodalEmbeddings.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// ── Types ────────────────────────────────────────────────────────────────────

interface IngestRequest {
  tripId: string;
  sourceType: string;
  /** For text artifacts */
  text?: string;
  /** For file-based artifacts (image/PDF) */
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  /** Optional base64 content (for inline uploads) */
  base64Data?: string;
  /** Optional: user already knows the type */
  artifactTypeOverride?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

interface ClassificationResult {
  artifact_type: string;
  confidence: number;
  reasoning: string;
  extracted_entities: Record<string, unknown>;
  summary: string;
  suggested_actions: Array<{
    type: string;
    label: string;
    description: string;
  }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonSafely(raw: string): Record<string, unknown> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const block = cleaned.match(/(\{[\s\S]*\})/);
    if (block) {
      return JSON.parse(block[1]);
    }
    throw new Error('Failed to parse classification JSON');
  }
}

async function classifyArtifact(
  extractedText: string,
  fileName: string | null,
  mimeType: string | null,
): Promise<ClassificationResult> {
  const prompt = `Classify this trip-related artifact and extract structured information.

File name: ${fileName || 'unknown'}
MIME type: ${mimeType || 'unknown'}
Content:
${extractedText.substring(0, 6000)}

Return JSON:
{
  "artifact_type": one of: "flight", "hotel", "restaurant_reservation", "event_ticket", "itinerary", "schedule", "place_recommendation", "payment_proof", "roster", "credential", "generic_document", "generic_image", "unknown",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation",
  "extracted_entities": {
    "dates": ["YYYY-MM-DD"],
    "times": ["HH:MM"],
    "locations": ["place names"],
    "amounts": [{"value": 0, "currency": "USD"}],
    "names": ["person/company names"],
    "confirmation_codes": ["booking refs"]
  },
  "summary": "1-2 sentence summary of what this artifact is",
  "suggested_actions": [
    {"type": "add_to_calendar", "label": "Add to Calendar", "description": "Create a calendar event from this"},
    {"type": "save_to_places", "label": "Save Place", "description": "Save the location"},
    {"type": "save_to_docs", "label": "Save to Docs", "description": "Store in trip documents"},
    {"type": "store_in_memory", "label": "Remember This", "description": "Store for AI memory"}
  ]
}

Only include relevant suggested_actions. For example, a flight confirmation should suggest "add_to_calendar" but not "save_to_places".`;

  try {
    const result = await invokeChatModel({
      model: 'gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at classifying travel documents. Return valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 1500,
      temperature: 0.1,
      responseFormat: { type: 'json_object' },
      timeoutMs: 30000,
    });

    const text = extractTextFromChatResponse(result.raw, result.provider);
    const parsed = parseJsonSafely(text) as unknown as ClassificationResult;
    console.log(
      `[artifact-ingest] classification: type=${parsed.artifact_type} confidence=${parsed.confidence}`,
    );
    return parsed;
  } catch (error) {
    console.error('[artifact-ingest] Classification failed:', error);
    return {
      artifact_type: 'unknown',
      confidence: 0,
      reasoning: 'Classification failed',
      extracted_entities: {},
      summary: fileName || 'Unclassified artifact',
      suggested_actions: [
        { type: 'save_to_docs', label: 'Save to Docs', description: 'Store in trip documents' },
      ],
    };
  }
}

async function extractTextFromImageUrl(fileUrl: string, mimeType: string): Promise<string> {
  try {
    const result = await invokeChatModel({
      model: 'gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content:
            'Extract ALL visible text from this image. Return only the extracted text, no JSON.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all text from this image:' },
            { type: 'image_url', image_url: { url: fileUrl } },
          ],
        },
      ],
      maxTokens: 3000,
      temperature: 0.1,
      timeoutMs: 30000,
    });

    return extractTextFromChatResponse(result.raw, result.provider);
  } catch (error) {
    console.error('[artifact-ingest] Image text extraction failed:', error);
    return '';
  }
}

async function extractTextFromPdfUrl(fileUrl: string): Promise<string> {
  try {
    const result = await invokeChatModel({
      model: 'gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content:
            'Extract ALL text from this PDF document. Return only the extracted text, no JSON wrapper.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all text from this PDF:' },
            { type: 'image_url', image_url: { url: fileUrl } },
          ],
        },
      ],
      maxTokens: 4000,
      temperature: 0.1,
      timeoutMs: 45000,
    });

    return extractTextFromChatResponse(result.raw, result.provider);
  } catch (error) {
    console.error('[artifact-ingest] PDF text extraction failed:', error);
    return '';
  }
}

// ── Main Handler ─────────────────────────────────────────────────────────────

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let tripId = 'unknown';

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: IngestRequest = await req.json();
    tripId = body.tripId;

    if (!tripId) {
      return new Response(JSON.stringify({ success: false, error: 'tripId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Trip membership check
    const { data: membership, error: membershipError } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ success: false, error: 'Not a member of this trip' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `[artifact-ingest] Starting: trip=${tripId} source=${body.sourceType} file=${body.fileName || 'text'}`,
    );

    // ── Step 1: Determine modality and extract text ──────────────────────
    const modality: EmbeddingModality = detectModality(body.mimeType);
    let extractedText = body.text || '';

    if (modality === 'image' && body.fileUrl && !extractedText) {
      extractedText = await extractTextFromImageUrl(body.fileUrl, body.mimeType || 'image/jpeg');
    }

    if (modality === 'pdf' && body.fileUrl && !extractedText) {
      extractedText = await extractTextFromPdfUrl(body.fileUrl);
    }

    console.log(`[artifact-ingest] Extracted ${extractedText.length} chars, modality=${modality}`);

    // ── Step 2: Classify ─────────────────────────────────────────────────
    let classification: ClassificationResult;
    let classificationMethod: string;

    if (body.artifactTypeOverride) {
      classification = {
        artifact_type: body.artifactTypeOverride,
        confidence: 1.0,
        reasoning: 'User override',
        extracted_entities: {},
        summary: body.fileName || 'User-classified artifact',
        suggested_actions: [],
      };
      classificationMethod = 'user_override';
    } else if (extractedText.length > 20) {
      classification = await classifyArtifact(
        extractedText,
        body.fileName || null,
        body.mimeType || null,
      );
      classificationMethod = 'llm';
    } else {
      classification = {
        artifact_type: modality === 'image' ? 'generic_image' : 'unknown',
        confidence: 0.3,
        reasoning: 'Insufficient text for classification',
        extracted_entities: {},
        summary: body.fileName || 'Unclassified artifact',
        suggested_actions: [
          { type: 'save_to_docs', label: 'Save to Docs', description: 'Store in trip documents' },
        ],
      };
      classificationMethod = 'deterministic';
    }

    // ── Step 3: Create artifact record ───────────────────────────────────
    const artifactInsert = {
      trip_id: tripId,
      creator_id: user.id,
      source_type: body.sourceType || 'upload',
      mime_type: body.mimeType || null,
      file_name: body.fileName || null,
      file_url: body.fileUrl || null,
      file_size_bytes: body.fileSizeBytes || null,
      artifact_type: classification.artifact_type,
      artifact_type_confidence: classification.confidence,
      classification_method: classificationMethod,
      extracted_text: extractedText || null,
      extracted_entities: classification.extracted_entities || {},
      ai_summary: classification.summary || null,
      embedding_status: 'processing',
      embedding_input_modality: modality,
      metadata: body.metadata || {},
    };

    // ── Pre-insert idempotency check (smart_import_candidate_id) ─────────
    // If the caller provided a smart_import_candidate_id in metadata, check
    // whether this candidate was already accepted (artifact already committed).
    // This prevents double-commit when SmartImportReview retries a failed accept.
    const candidateId = body.metadata?.smart_import_candidate_id as string | undefined;
    if (candidateId) {
      const { data: existingByCandidate } = await supabase
        .from('trip_artifacts')
        .select('id, artifact_type, ai_summary, created_at')
        .eq('trip_id', tripId)
        .contains('metadata', { smart_import_candidate_id: candidateId })
        .limit(1)
        .maybeSingle();

      if (existingByCandidate) {
        console.log(
          `[artifact-ingest] Idempotent: candidate ${candidateId} already committed as artifact ${existingByCandidate.id}`,
        );
        return new Response(
          JSON.stringify({
            success: true,
            artifact: existingByCandidate,
            isDuplicate: true,
            idempotent: true,
            elapsed: Date.now() - startTime,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const { data: artifact, error: insertError } = await supabase
      .from('trip_artifacts')
      .insert(artifactInsert)
      .select()
      .single();

    if (insertError || !artifact) {
      throw new Error(`Failed to insert artifact: ${insertError?.message || 'unknown'}`);
    }

    console.log(
      `[artifact-ingest] Artifact created: id=${artifact.id} type=${classification.artifact_type}`,
    );

    // ── Step 4: Generate embedding ───────────────────────────────────────
    try {
      const embeddingResult = await embedByModality({
        modality,
        text: extractedText || undefined,
        base64Data: body.base64Data || undefined,
        mimeType: body.mimeType || undefined,
        url: body.fileUrl || undefined,
      });

      await supabase
        .from('trip_artifacts')
        .update({
          embedding: embeddingResult.embedding,
          embedding_model: embeddingResult.model,
          embedding_dimensions: embeddingResult.dimensions,
          embedding_status: 'completed',
          embedding_input_modality: embeddingResult.modality,
        })
        .eq('id', artifact.id);

      console.log(
        `[artifact-ingest] Embedding completed: dims=${embeddingResult.dimensions} model=${embeddingResult.model}`,
      );
    } catch (embedError) {
      console.error('[artifact-ingest] Embedding failed:', embedError);
      await supabase
        .from('trip_artifacts')
        .update({
          embedding_status: 'failed',
          embedding_error: embedError instanceof Error ? embedError.message : 'Unknown error',
        })
        .eq('id', artifact.id);
    }

    // ── Step 5: Check for near-duplicates ────────────────────────────────
    // IMPORTANT: find_similar_artifacts is SECURITY DEFINER and checks auth.uid().
    // Must use authClient (user-scoped JWT) so auth.uid() resolves correctly.
    // Service-role calls would produce auth.uid()=null, causing the RPC to throw.
    let similarArtifacts: Array<Record<string, unknown>> = [];
    let isDuplicate = false;
    let finalArtifactId = artifact.id;

    try {
      const { data: similar } = await authClient.rpc('find_similar_artifacts', {
        p_trip_id: tripId,
        p_artifact_id: artifact.id,
        p_threshold: 0.85,
        p_limit: 3,
      });

      if (similar && similar.length > 0) {
        similarArtifacts = similar;
        const nearExact = similar.find(
          (s: { similarity: number; id: string }) => s.similarity > 0.95,
        );
        if (nearExact) {
          // Block the duplicate: delete the just-inserted artifact and return the existing one.
          isDuplicate = true;
          finalArtifactId = nearExact.id;
          console.log(
            `[artifact-ingest] Near-exact duplicate (similarity=${nearExact.similarity}): deleting new artifact ${artifact.id}, returning existing ${nearExact.id}`,
          );
          await supabase.from('trip_artifacts').delete().eq('id', artifact.id);
        }
      }
    } catch (dupError) {
      console.warn('[artifact-ingest] Duplicate check failed:', dupError);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[artifact-ingest] Complete: id=${finalArtifactId} elapsed=${elapsed}ms`);

    // Re-fetch the artifact to get the updated embedding status
    const { data: finalArtifact } = await supabase
      .from('trip_artifacts')
      .select('*')
      .eq('id', finalArtifactId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        artifact: finalArtifact || artifact,
        classification: {
          artifact_type: classification.artifact_type,
          confidence: classification.confidence,
          method: classificationMethod,
          reasoning: classification.reasoning,
        },
        suggestedActions: classification.suggested_actions,
        similarArtifacts,
        isDuplicate,
        elapsed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    logError('ARTIFACT_INGEST', error, { tripId });
    return new Response(JSON.stringify({ success: false, error: sanitizeErrorForClient(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
