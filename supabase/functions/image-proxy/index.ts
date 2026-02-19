import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createOptionsResponse, createErrorResponse } from "../_shared/securityHeaders.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
const IMAGE_PROXY_MAX_BYTES = Number(Deno.env.get("IMAGE_PROXY_MAX_BYTES") || 7_000_000);
const IMAGE_PROXY_CACHE_CONTROL =
  Deno.env.get("IMAGE_PROXY_CACHE_CONTROL") || "public, max-age=86400, stale-while-revalidate=604800";

function isPrivateHost(host: string): boolean {
  const lowered = host.toLowerCase();
  if (lowered === "localhost" || lowered === "127.0.0.1" || lowered === "[::1]") return true;
  if (lowered.startsWith("10.") || lowered.startsWith("192.168.")) return true;
  // 172.16.0.0 – 172.31.255.255
  if (lowered.startsWith("172.")) {
    const second = parseInt(lowered.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (lowered.startsWith("0.") || lowered.startsWith("169.254.")) return true;
  if (lowered.endsWith(".internal") || lowered.endsWith(".local")) return true;
  return false;
}

async function fetchToImageResponse(
  req: Request,
  upstreamUrl: string,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const cors = getCorsHeaders(req);

  const upstream = await fetch(upstreamUrl, {
    headers: extraHeaders,
    signal: AbortSignal.timeout(12_000),
  });

  if (!upstream.ok) {
    const errBody = await upstream.text().catch(() => "");
    return createErrorResponse(
      `Upstream image fetch failed (${upstream.status}): ${errBody.slice(0, 200)}`,
      upstream.status,
      req,
    );
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  const contentLengthHeader = upstream.headers.get("content-length");
  const length = contentLengthHeader ? Number(contentLengthHeader) : undefined;

  if (length && length > IMAGE_PROXY_MAX_BYTES) {
    return createErrorResponse("Image too large", 413, req);
  }

  const buf = await upstream.arrayBuffer();
  if (buf.byteLength > IMAGE_PROXY_MAX_BYTES) {
    return createErrorResponse("Image too large", 413, req);
  }

  return new Response(buf, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": contentType,
      "Cache-Control": IMAGE_PROXY_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return createOptionsResponse(req);
  if (req.method !== "GET") return createErrorResponse("Method not allowed", 405, req);

  const url = new URL(req.url);
  const placePhotoName = url.searchParams.get("placePhotoName");
  const rawUrl = url.searchParams.get("url");

  if (placePhotoName && rawUrl) {
    return createErrorResponse("Specify only one: placePhotoName or url", 400, req);
  }

  // --- Places photo mode ---
  if (placePhotoName) {
    if (!GOOGLE_MAPS_API_KEY) {
      return createErrorResponse("GOOGLE_MAPS_API_KEY not configured", 500, req);
    }

    // Anti-traversal + safe characters only
    if (
      placePhotoName.includes("..") ||
      placePhotoName.includes("://") ||
      placePhotoName.startsWith("/")
    ) {
      return createErrorResponse("Invalid placePhotoName", 400, req);
    }

    const maxWidthPx = Math.min(Number(url.searchParams.get("maxWidthPx") || 800), 2000);
    const maxHeightPx = Math.min(Number(url.searchParams.get("maxHeightPx") || 800), 2000);

    const upstreamParams = new URLSearchParams();
    if (Number.isFinite(maxWidthPx) && maxWidthPx > 0) upstreamParams.set("maxWidthPx", String(maxWidthPx));
    if (Number.isFinite(maxHeightPx) && maxHeightPx > 0) upstreamParams.set("maxHeightPx", String(maxHeightPx));
    upstreamParams.set("key", GOOGLE_MAPS_API_KEY);

    const upstreamUrl = `https://places.googleapis.com/v1/${placePhotoName}/media?${upstreamParams.toString()}`;
    return fetchToImageResponse(req, upstreamUrl);
  }

  // --- Generic image proxy mode ---
  if (rawUrl) {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return createErrorResponse("Invalid url", 400, req);
    }

    if (parsed.protocol !== "https:") {
      return createErrorResponse("Only https:// urls allowed", 400, req);
    }
    if (isPrivateHost(parsed.hostname)) {
      return createErrorResponse("Host not allowed", 403, req);
    }

    return fetchToImageResponse(req, parsed.toString());
  }

  return createErrorResponse("Missing placePhotoName or url query param", 400, req);
});
