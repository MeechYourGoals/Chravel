/**
 * Export Trip PDF Edge Function v3.0
 * Professional typography, clean page breaks, embedded fonts
 * Text-only, production-quality PDF generation with Puppeteer
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "https://esm.sh/pdf-lib@1.17.1";
import { getTripData } from './data.ts';
import { renderTemplate } from './template.ts';
import { slug, formatTimestamp } from './util.ts';
import type { ExportRequest, ExportLayout, ExportSection } from './types.ts';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPORT-TRIP] ${step}${detailsStr}`);
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PaperSize = 'letter' | 'a4';

let cachedBrandLogoDataUri: string | null | undefined = undefined;

async function getBrandLogoDataUri(): Promise<string | null> {
  if (cachedBrandLogoDataUri !== undefined) return cachedBrandLogoDataUri;
  try {
    const logoUrl = new URL('./assets/chravel-logo.png', import.meta.url);
    const bytes = await Deno.readFile(logoUrl);
    cachedBrandLogoDataUri = `data:image/png;base64,${encode(bytes.buffer)}`;
    return cachedBrandLogoDataUri;
  } catch (error) {
    console.warn('[EXPORT-TRIP] Failed to load brand logo asset:', error);
    cachedBrandLogoDataUri = null;
    return null;
  }
}

function getBrandHeaderTemplate(opts?: { logoDataUri?: string | null }): string {
  // Puppeteer header/footer templates are isolated from the page CSS, so we inline styles.
  // Keep it lightweight and deterministic (no external images required).
  const logo = opts?.logoDataUri
    ? `<img alt="Chravel logo" src="${opts.logoDataUri}" style="height:22pt; width:auto; display:block; margin:0 0 4pt auto;" />`
    : '';
  return `
    <div style="width:100%; padding: 6pt 54pt 0 54pt; font-family: 'Source Sans 3', system-ui, -apple-system, sans-serif;">
      <div style="width:100%; display:flex; justify-content:flex-end;">
        <div style="
          display:inline-flex;
          flex-direction:column;
          align-items:flex-end;
          border:1px solid #111827;
          background:#111827;
          padding:6pt 8pt;
          border-radius:8pt;
          line-height:1.1;
        ">
          ${logo}
          <div style="font-size:10.5pt; font-weight:700; color:#D4AF37;">
            ChravelApp Recap
          </div>
          <div style="font-size:7.8pt; font-weight:600; color:#F9FAFB; opacity:0.95;">
            Less chaos. More coordination.
          </div>
        </div>
      </div>
    </div>
  `;
}

function getPaperSizePts(paper: PaperSize): { width: number; height: number } {
  // PDF points: 72pt = 1 inch
  if (paper === 'a4') return { width: 595.28, height: 841.89 };
  return { width: 612, height: 792 }; // Letter
}

function guessExt(filename: string | undefined): string {
  const name = (filename || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return ext || '';
}

function classifyForEmbedding(opts: { name: string; mimeType?: string; typeLabel?: string }): 'pdf' | 'image' | 'doc' | 'other' {
  const mime = (opts.mimeType || '').toLowerCase();
  const label = (opts.typeLabel || '').toLowerCase();
  const ext = guessExt(opts.name);

  if (mime === 'application/pdf' || ext === 'pdf' || label === 'pdf') return 'pdf';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  return 'other';
}

function wrapText(params: {
  text: string;
  maxWidth: number;
  font: PDFFont;
  fontSize: number;
}): string[] {
  const words = params.text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    const width = params.font.widthOfTextAtSize(candidate, params.fontSize);
    if (width <= params.maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function addFallbackAttachmentPage(params: {
  doc: PDFDocument;
  paper: PaperSize;
  title: string;
  subtitle?: string;
  lines: string[];
}): Promise<void> {
  const { width, height } = getPaperSizePts(params.paper);
  const page = params.doc.addPage([width, height]);
  const font = await params.doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await params.doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 54;
  let y = height - margin;

  page.drawText('Attachment', { x: margin, y, font: fontBold, size: 18, color: rgb(0.06, 0.09, 0.16) });
  y -= 28;
  page.drawText(params.title, { x: margin, y, font: fontBold, size: 12, color: rgb(0.06, 0.09, 0.16) });
  y -= 18;

  if (params.subtitle) {
    const subLines = wrapText({ text: params.subtitle, maxWidth: width - margin * 2, font, fontSize: 10 });
    for (const line of subLines) {
      page.drawText(line, { x: margin, y, font, size: 10, color: rgb(0.42, 0.45, 0.5) });
      y -= 14;
    }
    y -= 8;
  }

  for (const rawLine of params.lines) {
    const lineParts = wrapText({ text: rawLine, maxWidth: width - margin * 2, font, fontSize: 10 });
    for (const line of lineParts) {
      page.drawText(line, { x: margin, y, font, size: 10, color: rgb(0.12, 0.16, 0.23) });
      y -= 14;
      if (y < margin + 20) break;
    }
    if (y < margin + 20) break;
    y -= 4;
  }
}

async function appendAttachmentsToPdf(params: {
  supabaseClient: any;
  basePdfBytes: Uint8Array;
  attachments: Array<{
    name: string;
    type: string;
    path?: string;
    url?: string;
    mime_type?: string;
  }>;
  paper: PaperSize;
}): Promise<Uint8Array> {
  const baseDoc = await PDFDocument.load(params.basePdfBytes);

  for (const att of params.attachments) {
    const kind = classifyForEmbedding({ name: att.name, mimeType: att.mime_type, typeLabel: att.type });

    // Prefer storage path for fetching.
    const storagePath = att.path;
    let fileBytes: Uint8Array | null = null;

    if (storagePath) {
      try {
        const { data, error } = await params.supabaseClient.storage
          .from('trip-files')
          .download(storagePath);
        if (error) throw error;
        const ab = await data.arrayBuffer();
        fileBytes = new Uint8Array(ab);
      } catch (e) {
        logStep('Attachment download failed', { name: att.name, path: storagePath, error: e instanceof Error ? e.message : String(e) });
      }
    }

    try {
      if (kind === 'pdf' && fileBytes) {
        const src = await PDFDocument.load(fileBytes);
        const pages = await baseDoc.copyPages(src, src.getPageIndices());
        for (const p of pages) baseDoc.addPage(p);
        continue;
      }

      if (kind === 'image' && fileBytes) {
        const { width, height } = getPaperSizePts(params.paper);
        const page = baseDoc.addPage([width, height]);

        const ext = guessExt(att.name);
        const isPng = ext === 'png';
        const embedded = isPng ? await baseDoc.embedPng(fileBytes) : await baseDoc.embedJpg(fileBytes);

        const margin = 18;
        const maxW = width - margin * 2;
        const maxH = height - margin * 2;
        const imgW = embedded.width;
        const imgH = embedded.height;
        const scale = Math.min(maxW / imgW, maxH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const x = (width - drawW) / 2;
        const y = (height - drawH) / 2;

        page.drawImage(embedded, { x, y, width: drawW, height: drawH });
        continue;
      }

      // DOC/DOCX conversion is not available in this edge runtime.
      // For unsupported or failed-embed files, we still append a deterministic fallback page.
      const fallbackLines: string[] = [];
      if (kind === 'doc') {
        fallbackLines.push('This document could not be embedded as a PDF in this export.');
        fallbackLines.push('Please download it from Chravel to view the original formatting.');
      } else if (kind === 'other') {
        fallbackLines.push('This file type could not be embedded in the PDF export.');
        fallbackLines.push('Please download it from Chravel to access the original file.');
      } else {
        fallbackLines.push('This attachment could not be embedded in the PDF export.');
        fallbackLines.push('Please download it from Chravel to access the original file.');
      }

      // Best-effort signed URL for private bucket (used only for display).
      let signedUrl: string | undefined = att.url;
      if (!signedUrl && storagePath) {
        try {
          const { data: signed, error: signErr } = await params.supabaseClient.storage
            .from('trip-files')
            .createSignedUrl(storagePath, 60 * 60);
          if (!signErr) signedUrl = signed?.signedUrl;
        } catch {
          // ignore
        }
      }
      if (signedUrl) fallbackLines.push(`Download link: ${signedUrl}`);

      await addFallbackAttachmentPage({
        doc: baseDoc,
        paper: params.paper,
        title: att.name,
        subtitle: `${att.type}${att.mime_type ? ` • ${att.mime_type}` : ''}`,
        lines: fallbackLines,
      });
    } catch (e) {
      logStep('Attachment embed failed', { name: att.name, error: e instanceof Error ? e.message : String(e) });
      await addFallbackAttachmentPage({
        doc: baseDoc,
        paper: params.paper,
        title: att.name,
        subtitle: att.type,
        lines: ['This attachment could not be embedded in the PDF export. Please download it from Chravel.'],
      });
    }
  }

  return await baseDoc.save();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  // Get authorization header for authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    logStep("Unauthorized - missing auth header");
    return new Response(
      JSON.stringify({ error: 'Unauthorized - authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Use anon key with user's JWT to respect RLS
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });

  try {
    logStep("Export started", { method: req.method, url: req.url });

    // Parse request - support both GET and POST
    let tripId: string;
    let sections: ExportSection[] = [];
    let layout: ExportLayout = 'onepager';
    let privacyRedaction = false;
    let paper: 'letter' | 'a4' = 'letter';

    if (req.method === 'GET') {
      const url = new URL(req.url);
      tripId = url.searchParams.get('tripId') || '';
      const sectionsParam = url.searchParams.get('sections');
      sections = sectionsParam ? sectionsParam.split(',') as ExportSection[] : [];
      layout = (url.searchParams.get('layout') || 'onepager') as ExportLayout;
      privacyRedaction = url.searchParams.get('privacy_redaction') === 'true';
      paper = (url.searchParams.get('paper') || 'letter') as 'letter' | 'a4';
    } else {
      const body: ExportRequest = await req.json();
      tripId = body.tripId;
      sections = body.sections || [];
      layout = body.layout || 'onepager';
      privacyRedaction = body.privacyRedaction || false;
      paper = body.paper || 'letter';
    }

    logStep("Request parsed", { tripId, sections, layout, privacyRedaction, paper });

    // Verify user is a member of the trip before proceeding
    const { data: membershipCheck, error: membershipError } = await supabaseClient
      .from('trip_members')
      .select('user_id, status')
      .eq('trip_id', tripId)
      .eq('user_id', (await supabaseClient.auth.getUser()).data.user?.id)
      .single();

    if (membershipError || !membershipCheck || membershipCheck.status !== 'active') {
      logStep("Forbidden - not a trip member", { tripId, error: membershipError?.message });
      return new Response(
        JSON.stringify({ error: 'Forbidden - you must be an active member of this trip to export it' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Authorization verified", { tripId });

    // Auto-detect layout from trip_type if not explicitly provided
    if (!layout || layout === 'onepager') {
      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .select('trip_type')
        .eq('id', tripId)
        .single();

      if (!tripError && trip) {
        layout = (trip.trip_type === 'pro' || trip.trip_type === 'events') ? 'pro' : 'onepager';
        logStep("Layout auto-detected", { trip_type: trip.trip_type, layout });
      }
    }

    // Validate layout
    if (layout !== 'onepager' && layout !== 'pro') {
      logStep("Invalid layout", { layout });
      return new Response(
        JSON.stringify({ error: 'Invalid layout. Must be "onepager" or "pro"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tripId || !Array.isArray(sections)) {
      logStep("Invalid request", { tripId, sectionsType: typeof sections });
      return new Response(
        JSON.stringify({ error: 'Invalid request: tripId and sections required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default sections if none provided
    if (sections.length === 0) {
      sections = layout === 'pro' 
        ? ['calendar', 'payments', 'places', 'tasks', 'polls', 'roster', 'broadcasts', 'attachments']
        : ['calendar', 'payments', 'places', 'tasks', 'polls'];
      logStep("Using default sections", { sections });
    }

    // Fetch and transform trip data
    logStep("Fetching trip data");
    let exportData: any; // TODO: Define proper TripExportData interface
    try {
      exportData = await getTripData(
        supabaseClient,
        tripId,
        sections as ExportSection[],
        layout,
        privacyRedaction
      );
      logStep("Trip data fetched successfully", { 
        sectionsWithData: Object.keys(exportData).filter((k: string) => Array.isArray((exportData as any)[k]))
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Trip not found') {
        logStep("Trip not found", { tripId });
        return new Response(
          JSON.stringify({ error: 'Trip not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    // Render HTML
    logStep("Rendering HTML template");
    const html = await renderTemplate(exportData);
    logStep("HTML rendered", { htmlLength: html.length });

    // Generate PDF with Puppeteer
    logStep("Launching Puppeteer");
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    logStep("Loading HTML into page");
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');

    // Layout name for metadata
    const layoutName = layout === 'pro' ? 'Chravel Pro Summary' : 'One-Pager';

    const brandLogoDataUri = await getBrandLogoDataUri();

    logStep("Generating PDF", { format: paper, layout: layoutName });
    let pdfBytes = await page.pdf({
      printBackground: true,
      format: paper === 'a4' ? 'A4' : 'Letter',
      displayHeaderFooter: true,
      headerTemplate: getBrandHeaderTemplate({ logoDataUri: brandLogoDataUri }),
      footerTemplate: `
        <div style="font-family:'Source Sans 3',sans-serif;font-size:9pt;width:100%;padding:6pt 54pt;display:flex;justify-content:space-between;color:#6B7280;">
          <div>Generated on ${exportData.generatedAtLocal} • ${layoutName}</div>
          <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        </div>
      `,
      margin: { top: '48pt', right: '54pt', bottom: '64pt', left: '54pt' }
    });

    await browser.close();
    logStep("PDF generated successfully", { size: pdfBytes.length });

    // If attachments are included, append the actual files after the recap.
    // The recap body already contains a plain-text Attachments index section.
    if (sections.includes('attachments') && Array.isArray((exportData as any).attachments) && (exportData as any).attachments.length > 0) {
      logStep("Appending attachment pages", { count: (exportData as any).attachments.length });
      try {
        const merged = await appendAttachmentsToPdf({
          supabaseClient,
          basePdfBytes: new Uint8Array(pdfBytes),
          attachments: (exportData as any).attachments,
          paper,
        });
        logStep("Attachments appended", { newSize: merged.length });
        pdfBytes = merged;
      } catch (e) {
        logStep("Failed to append attachments (continuing with base PDF)", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Generate filename with timestamp
    const filename = `Trip_${slug(exportData.tripTitle)}_${layout}_${formatTimestamp()}.pdf`;
    logStep("Returning PDF", { filename, size: pdfBytes.length });

    // Return PDF directly as Response body
    return new Response(pdfBytes as unknown as BodyInit, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });

  } catch (error) {
    logStep("ERROR", { 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Export failed',
        details: error instanceof Error ? error.stack : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
