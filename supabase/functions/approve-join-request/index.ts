import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPROVE-JOIN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ success: false, message: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("ERROR: User authentication failed", { error: userError?.message });
      return new Response(
        JSON.stringify({ success: false, message: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Get request details
    const { requestId, action } = await req.json();
    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      logStep("ERROR: Invalid parameters");
      return new Response(
        JSON.stringify({ success: false, message: "Request ID and valid action (approve/reject) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing request", { requestId, action });

    // Fetch join request
    const { data: joinRequest, error: requestError } = await supabaseClient
      .from("trip_join_requests")
      .select("*, trips!inner(created_by, name, trip_type)")
      .eq("id", requestId)
      .single();

    if (requestError || !joinRequest) {
      logStep("ERROR: Join request not found", { error: requestError?.message });
      return new Response(
        JSON.stringify({ success: false, message: "Join request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Join request found", { tripId: joinRequest.trip_id, userId: joinRequest.user_id });

    // Verify user is trip creator
    if (joinRequest.trips.created_by !== user.id) {
      logStep("ERROR: User is not trip creator");
      return new Response(
        JSON.stringify({ success: false, message: "Only trip creators can approve join requests" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already resolved
    if (joinRequest.status !== 'pending') {
      logStep("ERROR: Request already resolved", { status: joinRequest.status });
      return new Response(
        JSON.stringify({ success: false, message: `This request has already been ${joinRequest.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update request status
    const { error: updateError } = await supabaseClient
      .from("trip_join_requests")
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id
      })
      .eq("id", requestId);

    if (updateError) {
      logStep("ERROR: Failed to update request", { error: updateError.message });
      return new Response(
        JSON.stringify({ success: false, message: "Failed to update request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If approved, add user to trip_members
    if (action === 'approve') {
      const { error: memberError } = await supabaseClient
        .from("trip_members")
        .insert({
          trip_id: joinRequest.trip_id,
          user_id: joinRequest.user_id,
          role: "member"
        });

      if (memberError) {
        logStep("ERROR: Failed to add member", { error: memberError.message });
        return new Response(
          JSON.stringify({ success: false, message: "Failed to add member to trip" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logStep("Member added successfully");
    }

    logStep("Request processed successfully", { action, requestId });

    return new Response(
      JSON.stringify({
        success: true,
        action,
        message: action === 'approve' 
          ? `User approved and added to ${joinRequest.trips.name}`
          : `Join request rejected`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in approve-join-request", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
