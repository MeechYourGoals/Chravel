import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Edge function to create an identity verification session
 * This should be called after successful password or MFA verification
 * to grant access to secure_storage for a limited time window.
 * 
 * POST /verify-identity
 * Body: {
 *   verification_method: 'password' | 'mfa' | 'biometric',
 *   session_duration_minutes?: number (default: 15)
 * }
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      verification_method = "password",
      session_duration_minutes = 15,
    } = body;

    // Validate verification_method
    const validMethods = ["password", "mfa", "biometric"];
    if (!validMethods.includes(verification_method)) {
      return new Response(
        JSON.stringify({ error: `Invalid verification_method. Must be one of: ${validMethods.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate session_duration_minutes
    if (session_duration_minutes < 1 || session_duration_minutes > 60) {
      return new Response(
        JSON.stringify({ error: "session_duration_minutes must be between 1 and 60" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract IP address and user agent from request
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                      req.headers.get("x-real-ip") || 
                      null;
    const userAgent = req.headers.get("user-agent") || null;

    // Create verification session using RPC function
    const { data: sessionId, error: sessionError } = await supabaseClient.rpc(
      "create_verification_session",
      {
        verification_method,
        ip_address: ipAddress,
        user_agent: userAgent,
        session_duration_minutes,
      }
    );

    if (sessionError) {
      console.error("Error creating verification session:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification session", details: sessionError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        expires_at: new Date(Date.now() + session_duration_minutes * 60 * 1000).toISOString(),
        message: "Identity verification session created successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
