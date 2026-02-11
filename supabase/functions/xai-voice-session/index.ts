import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // Check super admin bypass
    const SUPER_ADMIN_EMAILS = ["demetriusmills8@gmail.com", "meech@chravel.com"];
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail?.toLowerCase());

    if (!isSuperAdmin) {
      // Check subscription tier
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_product_id")
        .eq("user_id", userId)
        .single();

      // Check user_entitlements table for tier
      const { data: entitlements } = await supabase
        .from("user_entitlements")
        .select("tier, status")
        .eq("user_id", userId)
        .single();

      const tier = entitlements?.tier || "free";
      const allowedTiers = [
        "frequent-chraveler",
        "pro-starter",
        "pro-growth",
        "pro-enterprise",
      ];

      if (!allowedTiers.includes(tier)) {
        return new Response(
          JSON.stringify({ error: "VOICE_NOT_INCLUDED" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Mint ephemeral token from xAI
    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      console.error("[xai-voice-session] XAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Voice service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const xaiResponse = await fetch("https://api.x.ai/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3-fast",
        voice: "Sage",
        instructions: "You are Chravel AI Concierge. Be concise, travel-smart, and action-oriented. Prefer actionable answers and bullets. Keep responses under 30 seconds of speech.",
        turn_detection: { type: "server_vad" },
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
      }),
    });

    if (!xaiResponse.ok) {
      const errorText = await xaiResponse.text();
      console.error("[xai-voice-session] xAI error:", xaiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create voice session" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionData = await xaiResponse.json();

    return new Response(JSON.stringify(sessionData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[xai-voice-session] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
