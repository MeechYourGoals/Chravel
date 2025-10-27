import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createSecureResponse, createErrorResponse, createOptionsResponse } from "../_shared/securityHeaders.ts";
import { sanitizeErrorForClient, logError } from "../_shared/errorHandling.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPORT-TRIP-SUMMARY] ${step}${detailsStr}`);
};

// Section builder functions (copied from client-side for use in edge function)
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createOptionsResponse();
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse('Authentication required', 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return createErrorResponse('Unauthorized', 401);
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { tripId, includeSections } = await req.json();
    if (!tripId || !includeSections || !Array.isArray(includeSections)) {
      return createErrorResponse('Invalid request: tripId and includeSections required', 400);
    }
    logStep("Request parsed", { tripId, includeSections });

    // Verify user has access to this trip
    const { data: tripMember, error: memberError } = await supabaseClient
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !tripMember) {
      return createErrorResponse('Access denied: You are not a member of this trip', 403);
    }
    logStep("Trip access verified");

    // Export is now available to everyone - no tier check needed
    logStep("PDF export access granted (no tier restriction)");

    // Fetch trip data
    const { data: trip, error: tripError } = await supabaseClient
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return createErrorResponse('Trip not found', 404);
    }
    logStep("Trip data fetched", { tripName: trip.name });

    // Fetch requested sections
    const sectionsData: any = {};

    if (includeSections.includes('calendar')) {
      const { data: events } = await supabaseClient
        .from('trip_events')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_time', { ascending: true });
      sectionsData.calendar = events || [];
      logStep("Calendar events fetched", { count: events?.length || 0 });
    }

    if (includeSections.includes('payments')) {
      const { data: payments } = await supabaseClient
        .from('trip_payment_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      sectionsData.payments = payments || [];
      logStep("Payments fetched", { count: payments?.length || 0 });
    }

    if (includeSections.includes('polls')) {
      const { data: polls } = await supabaseClient
        .from('trip_polls')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      sectionsData.polls = polls || [];
      logStep("Polls fetched", { count: polls?.length || 0 });
    }

    if (includeSections.includes('places')) {
      const { data: links } = await supabaseClient
        .from('trip_links')
        .select('*')
        .eq('trip_id', tripId)
        .order('votes', { ascending: false });
      sectionsData.places = links || [];
      logStep("Places fetched", { count: links?.length || 0 });
    }

    if (includeSections.includes('tasks')) {
      const { data: tasks } = await supabaseClient
        .from('trip_tasks')
        .select('*')
        .eq('trip_id', tripId)
        .order('completed', { ascending: true });
      sectionsData.tasks = tasks || [];
      logStep("Tasks fetched", { count: tasks?.length || 0 });
    }

    // Return structured data for client-side PDF generation
    logStep("Preparing export data");

    return createSecureResponse({
      success: true,
      trip: {
        name: trip.name,
        description: trip.description,
        destination: trip.destination,
        startDate: trip.start_date,
        endDate: trip.end_date,
        coverImageUrl: trip.cover_image_url,
      },
      sections: sectionsData,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.id,
        generatedBy: 'Chravel',
      }
    });

  } catch (error) {
    logError('EXPORT_TRIP_SUMMARY', error);
    return createErrorResponse(sanitizeErrorForClient(error), 500);
  }
});

