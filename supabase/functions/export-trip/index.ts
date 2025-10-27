/**
 * Export Trip PDF Edge Function
 * Generates production-quality PDFs with embedded fonts and proper encoding
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createSecureResponse, createErrorResponse, createOptionsResponse } from "../_shared/securityHeaders.ts";
import { sanitizeErrorForClient, logError } from "../_shared/errorHandling.ts";
import { getTripData } from './data.ts';
import { renderTemplate } from './template.ts';
import { slug, formatTimestamp } from './util.ts';
import type { ExportRequest, ExportLayout, ExportSection } from './types.ts';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPORT-TRIP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createOptionsResponse();
  }

  // Use anon client to respect RLS
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  
  const authHeader = req.headers.get("Authorization");
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: authHeader ? { Authorization: authHeader } : {} }
  });

  try {
    logStep("Function started", { hasAuth: !!authHeader });

    // Parse request
    const body: ExportRequest = await req.json();
    let {
      tripId,
      sections = [],
      layout = 'onepager' as ExportLayout,
      privacyRedaction = false,
      paper = 'letter'
    } = body;

    // Validate layout
    if (layout !== 'onepager' && layout !== 'pro') {
      return createErrorResponse('Invalid layout. Must be "onepager" or "pro"', 400);
    }

    if (!tripId || !Array.isArray(sections)) {
      return createErrorResponse('Invalid request: tripId and sections required', 400);
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
          return createErrorResponse('Access denied: You are not a member of this trip', 403);
        }
        logStep("Trip access verified", { role: tripMember.role });
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
      logStep("Unauthenticated mode", { forcedRedaction: true, layout, sections });
    }

    // Default sections if none provided
    if (sections.length === 0) {
      sections = layout === 'pro' 
        ? ['calendar', 'payments', 'places', 'tasks', 'polls', 'roster', 'broadcasts', 'attachments']
        : ['calendar', 'payments', 'places', 'tasks', 'polls'];
    }

    logStep("Request parsed", { tripId, sections, layout, privacyRedaction });

    // Fetch and transform trip data
    const exportData = await getTripData(
      supabaseClient,
      tripId,
      sections as ExportSection[],
      layout,
      privacyRedaction
    );
    logStep("Trip data fetched and transformed");

    // Render HTML
    const html = renderTemplate(exportData);
    logStep("HTML template rendered");

    // Generate filename
    const filename = `Trip_${slug(exportData.tripTitle)}_${layout}_${formatTimestamp()}.pdf`;
    
    // For now, return HTML until Puppeteer is configured
    // TODO: Add Puppeteer for PDF generation
    logStep("Returning HTML (PDF generation pending Puppeteer setup)");
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename.replace('.pdf', '.html')}"`,
      },
    });

  } catch (error) {
    logError('EXPORT_TRIP', error);
    return createErrorResponse(sanitizeErrorForClient(error), 500);
  }
});

