/**
 * Export Trip PDF Edge Function v2.2
 * Text-only, real data, embedded fonts, Puppeteer PDF generation
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
  
  const authHeader = req.headers.get("Authorization");
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: authHeader ? { Authorization: authHeader } : {} }
  });

  try {
    logStep("Export started", { hasAuth: !!authHeader, method: req.method });

    // Parse request
    const body: ExportRequest = await req.json();
    let {
      tripId,
      sections = [],
      layout = 'onepager' as ExportLayout,
      privacyRedaction = false,
      paper = 'letter'
    } = body;

    logStep("Request parsed", { tripId, sections, layout, privacyRedaction, paper });

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

    // Handle authentication modes
    let userId: string | null = null;
    let isAuthenticated = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (userData?.user) {
        userId = userData.user.id;
        isAuthenticated = true;
        logStep("User authenticated", { userId });

        // Verify trip membership for authenticated users
        const { data: tripMember } = await supabaseClient
          .from('trip_members')
          .select('role')
          .eq('trip_id', tripId)
          .eq('user_id', userId)
          .single();

        if (!tripMember) {
          logStep("Access denied - not a trip member", { userId, tripId });
          return new Response(
            JSON.stringify({ error: 'Access denied: You are not a member of this trip' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        logStep("Trip membership verified", { role: tripMember.role });
      } else {
        logStep("Invalid token, proceeding as unauthenticated");
      }
    }

    // Demo/Unauthenticated mode: force safety restrictions
    if (!isAuthenticated) {
      privacyRedaction = true;
      layout = 'onepager'; // Force one-pager for unauthenticated
      // Strip Pro-only sections
      sections = sections.filter(s => !['roster', 'broadcasts', 'attachments'].includes(s));
      logStep("Unauthenticated mode restrictions applied", { 
        forcedRedaction: true, 
        forcedLayout: 'onepager',
        allowedSections: sections 
      });
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
    const exportData = await getTripData(
      supabaseClient,
      tripId,
      sections as ExportSection[],
      layout,
      privacyRedaction
    );
    logStep("Trip data fetched successfully", { 
      sectionsWithData: Object.keys(exportData).filter(k => Array.isArray(exportData[k as keyof typeof exportData]))
    });

    // Render HTML
    logStep("Rendering HTML template");
    const html = renderTemplate(exportData);
    logStep("HTML rendered", { htmlLength: html.length });

    // Generate PDF with Puppeteer
    logStep("Launching Puppeteer");
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    logStep("Loading HTML into page");
    await page.setContent(html, { waitUntil: 'networkidle2' });

    logStep("Generating PDF", { format: paper });
    const pdfBuffer = await page.pdf({
      format: paper === 'a4' ? 'A4' : 'Letter',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="font-size:8pt;width:100%;padding:0 24pt;display:flex;justify-content:space-between;">
          <div>Generated by Chravel • ${exportData.generatedAtLocal}</div>
          <div>Trip ID: ${exportData.tripId} • <span class="pageNumber"></span>/<span class="totalPages"></span></div>
        </div>
      `,
      margin: { top: '10mm', right: '12mm', bottom: '14mm', left: '12mm' }
    });

    await browser.close();
    logStep("PDF generated successfully", { size: pdfBuffer.length });

    // Generate filename
    const filename = `Trip_${slug(exportData.tripTitle)}_${layout}_${formatTimestamp()}.pdf`;
    logStep("Returning PDF", { filename, size: pdfBuffer.length });

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
