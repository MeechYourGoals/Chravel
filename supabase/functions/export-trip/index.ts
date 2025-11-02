/**
 * Export Trip PDF Edge Function v3.0
 * Professional typography, clean page breaks, embedded fonts
 * Text-only, production-quality PDF generation with Puppeteer
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
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
    let exportData;
    try {
      exportData = await getTripData(
        supabaseClient,
        tripId,
        sections as ExportSection[],
        layout,
        privacyRedaction
      );
      logStep("Trip data fetched successfully", { 
        sectionsWithData: Object.keys(exportData).filter(k => Array.isArray(exportData[k as keyof typeof exportData]))
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

    logStep("Generating PDF", { format: paper, layout: layoutName });
    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: paper === 'a4' ? 'A4' : 'Letter',
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="font-family:'Source Sans 3',sans-serif;font-size:9pt;width:100%;padding:6pt 54pt;display:flex;justify-content:space-between;color:#6B7280;">
          <div>Generated on ${exportData.generatedAtLocal} • ${layoutName}</div>
          <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        </div>
      `,
      margin: { top: '48pt', right: '54pt', bottom: '64pt', left: '54pt' }
    });

    await browser.close();
    logStep("PDF generated successfully", { size: pdfBuffer.length });

    // Generate filename with timestamp
    const filename = `Trip_${slug(exportData.tripTitle)}_${layout}_${formatTimestamp()}.pdf`;
    logStep("Returning PDF", { filename, size: pdfBuffer.length });

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
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
