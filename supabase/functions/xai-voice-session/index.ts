import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_PLANS = new Set([
  "frequent-chraveler",
  "pro-starter",
  "pro-growth",
  "pro-enterprise",
]);

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

const DEFAULT_SUPER_ADMIN_EMAILS = [
  "ccamechi@gmail.com",
  "demetriusmills8@gmail.com",
  "meech@chravel.com",
];

function parseSuperAdminAllowlist(): Set<string> {
  const envList = (Deno.env.get("SUPER_ADMIN_EMAILS") ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_SUPER_ADMIN_EMAILS, ...envList]);
}

function isEligibleFromLegacyProfile(subscriptionStatus?: string | null, subscriptionProductId?: string | null): boolean {
  if (!subscriptionStatus || !ACTIVE_STATUSES.has(subscriptionStatus)) {
    return false;
  }

  const productKey = (subscriptionProductId ?? "").toLowerCase();
  if (!productKey) {
    return false;
  }

  return [
    "frequent",
    "pro-starter",
    "pro-growth",
    "pro-enterprise",
    "consumer-frequent",
  ].some(flag => productKey.includes(flag));
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    const user = userData?.user;

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: entitlements }, { data: profile }] = await Promise.all([
      supabase
        .from("user_entitlements")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("email, app_role, subscription_status, subscription_product_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const email = (profile?.email ?? user.email ?? "").toLowerCase();
    const appRole = (profile?.app_role ?? "").toLowerCase();
    const superAdminAllowlist = parseSuperAdminAllowlist();
    const isSuperAdmin = (
      Boolean(email && superAdminAllowlist.has(email)) ||
      appRole === "super_admin" ||
      appRole === "enterprise_admin"
    );

    const plan = entitlements?.plan ?? "free";
    const status = entitlements?.status ?? "active";
    const hasPlanAccess = ALLOWED_PLANS.has(plan) && ACTIVE_STATUSES.has(status);
    const hasLegacyProfileAccess = isEligibleFromLegacyProfile(
      profile?.subscription_status,
      profile?.subscription_product_id,
    );

    if (!isSuperAdmin && !hasPlanAccess && !hasLegacyProfileAccess) {
      return new Response(
        JSON.stringify({ error: "VOICE_NOT_INCLUDED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const xaiApiKey = Deno.env.get("XAI_API_KEY");
    if (!xaiApiKey) {
      console.error("[xai-voice-session] Missing XAI_API_KEY secret");
      return new Response(
        JSON.stringify({ error: "XAI_NOT_CONFIGURED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Return the API key directly — no ephemeral token minting.
    // Security: key is behind auth + tier gating, never in client bundle,
    // and xAI enforces server-side rate limits per key.
    return new Response(
      JSON.stringify({ api_key: xaiApiKey }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[xai-voice-session] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "INTERNAL_SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
