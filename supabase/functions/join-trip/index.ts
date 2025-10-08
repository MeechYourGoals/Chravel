import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[JOIN-TRIP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase client with service role for elevated permissions
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
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get invite code from request
    const { inviteCode } = await req.json();
    if (!inviteCode) {
      logStep("ERROR: No invite code provided");
      return new Response(
        JSON.stringify({ success: false, message: "Invite code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing invite code", { inviteCode });

    // Fetch invite data from database
    const { data: invite, error: inviteError } = await supabaseClient
      .from("trip_invites")
      .select("*")
      .eq("code", inviteCode)
      .single();

    if (inviteError || !invite) {
      logStep("ERROR: Invite not found", { error: inviteError?.message });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid invite link. This invite may have been deleted or never existed." 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Invite found", { tripId: invite.trip_id, isActive: invite.is_active });

    // Validate invite is active
    if (!invite.is_active) {
      logStep("ERROR: Invite is not active");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "This invite link has been deactivated by the trip organizer." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate invite hasn't expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      logStep("ERROR: Invite has expired", { expiresAt: invite.expires_at });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "This invite link has expired. Please request a new one from the trip organizer." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate max uses hasn't been reached
    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      logStep("ERROR: Max uses reached", { currentUses: invite.current_uses, maxUses: invite.max_uses });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "This invite link has reached its maximum number of uses. Please request a new one." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseClient
      .from("trip_members")
      .select("id")
      .eq("trip_id", invite.trip_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      logStep("User already a member", { tripId: invite.trip_id });
      
      // Get trip details for redirect
      const { data: trip } = await supabaseClient
        .from("trips")
        .select("name, trip_type")
        .eq("id", invite.trip_id)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true,
          already_member: true,
          trip_id: invite.trip_id,
          trip_name: trip?.name || "Trip",
          trip_type: trip?.trip_type || "consumer",
          message: "You're already a member of this trip!" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabaseClient
      .from("trips")
      .select("name, trip_type, created_by")
      .eq("id", invite.trip_id)
      .single();

    if (tripError || !trip) {
      logStep("ERROR: Trip not found", { error: tripError?.message });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Trip not found. It may have been deleted." 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Trip found", { tripName: trip.name, tripType: trip.trip_type });

    // Add user to trip_members
    const { error: memberError } = await supabaseClient
      .from("trip_members")
      .insert({
        trip_id: invite.trip_id,
        user_id: user.id,
        role: "member"
      });

    if (memberError) {
      logStep("ERROR: Failed to add member", { error: memberError.message });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to join trip. Please try again." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Member added successfully");

    // Increment invite usage counter
    const { error: updateError } = await supabaseClient
      .from("trip_invites")
      .update({ 
        current_uses: invite.current_uses + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", invite.id);

    if (updateError) {
      logStep("WARNING: Failed to update invite usage counter", { error: updateError.message });
      // Non-critical error, don't fail the request
    }

    logStep("Join successful", { 
      tripId: invite.trip_id, 
      userId: user.id,
      newUsageCount: invite.current_uses + 1 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        trip_id: invite.trip_id,
        trip_name: trip.name,
        trip_type: trip.trip_type,
        message: `Successfully joined ${trip.name}!` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in join-trip", { message: errorMessage });
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "An unexpected error occurred. Please try again." 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
