/**
 * Shared Vertex AI OAuth2 authentication utilities.
 *
 * Extracted from gemini-voice-session so both the legacy HTTP endpoint
 * and the new WebSocket proxy can mint access tokens without duplication.
 */

// ── Types ──

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

// ── Helpers ──

export function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Mint a short-lived OAuth2 access token from a GCP service account key.
 * The token has `cloud-platform` scope and is valid for 1 hour.
 */
export async function createVertexAccessToken(saKey: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: saKey.client_email,
    sub: saKey.client_email,
    aud: saKey.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import RSA private key
  const pemBody = saKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const keyBuffer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    enc.encode(signingInput),
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${signingInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenUri = saKey.token_uri || 'https://oauth2.googleapis.com/token';
  const tokenResp = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenResp.ok) {
    const body = await tokenResp.text();
    throw new Error(
      `OAuth2 token exchange failed (${tokenResp.status}): ${body.substring(0, 400)}`,
    );
  }

  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) {
    throw new Error('OAuth2 response missing access_token');
  }
  return tokenData.access_token;
}

/**
 * Parse a base64-encoded GCP service account JSON key.
 */
export function parseServiceAccountKey(base64Key: string): ServiceAccountKey {
  try {
    const json = atob(base64Key);
    const parsed = JSON.parse(json);
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('Missing client_email or private_key in service account JSON');
    }
    return parsed;
  } catch (e) {
    throw new Error(
      `Invalid VERTEX_SERVICE_ACCOUNT_KEY: ${e instanceof Error ? e.message : 'parse failed'}. ` +
        'Ensure the value is base64-encoded JSON of the service account key file.',
    );
  }
}
