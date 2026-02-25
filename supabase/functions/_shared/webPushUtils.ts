/**
 * Web Push Utilities
 *
 * Shared logic for Web Push (VAPID) notification delivery.
 * Implements RFC 8291 (Web Push Encryption) and RFC 8292 (VAPID).
 */

// ============================================================================
// Types
// ============================================================================

export interface WebPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  failed_count: number;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  renotify?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

// ============================================================================
// Web Push Encryption Implementation
// ============================================================================

/**
 * Base64url decode to Uint8Array
 */
export function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Base64url encode from Uint8Array
 */
export function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate VAPID JWT for authorization header
 */
async function generateVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string,
  expiration: number,
): Promise<string> {
  // JWT Header
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  // JWT Payload
  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import private key for signing
  const privateKeyBytes = base64UrlDecode(privateKey);

  // Convert to PKCS8 format for crypto.subtle
  // P-256 private key is 32 bytes, need to wrap in PKCS8 structure
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);

  const pkcs8Footer = new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00]);

  // Get public key bytes
  const publicKeyBytes = base64UrlDecode(publicKey);

  // Construct PKCS8 key
  const pkcs8Key = new Uint8Array(
    pkcs8Header.length + privateKeyBytes.length + pkcs8Footer.length + publicKeyBytes.length,
  );
  pkcs8Key.set(pkcs8Header, 0);
  pkcs8Key.set(privateKeyBytes, pkcs8Header.length);
  pkcs8Key.set(pkcs8Footer, pkcs8Header.length + privateKeyBytes.length);
  pkcs8Key.set(publicKeyBytes, pkcs8Header.length + privateKeyBytes.length + pkcs8Footer.length);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Key,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  // Sign
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(signingInput),
  );

  // Convert DER signature to raw format (r || s)
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${signatureB64}`;
}

/**
 * Concatenate Uint8Arrays
 */
function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * HKDF-Extract and HKDF-Expand implementation
 */
async function hkdfDerive(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const ikmBuffer = ikm.buffer.slice(
    ikm.byteOffset,
    ikm.byteOffset + ikm.byteLength,
  ) as ArrayBuffer;

  const keyMaterial = await crypto.subtle.importKey('raw', ikmBuffer, { name: 'HKDF' }, false, [
    'deriveBits',
  ]);

  const saltBuffer = salt.buffer.slice(
    salt.byteOffset,
    salt.byteOffset + salt.byteLength,
  ) as ArrayBuffer;
  const infoBuffer = info.buffer.slice(
    info.byteOffset,
    info.byteOffset + info.byteLength,
  ) as ArrayBuffer;

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: saltBuffer,
      info: infoBuffer,
      hash: 'SHA-256',
    },
    keyMaterial,
    length * 8,
  );

  return new Uint8Array(derivedBits);
}

/**
 * Encrypt push message using RFC 8291 (aes128gcm content encoding)
 */
async function encryptPushMessage(
  payload: string,
  p256dhKey: string,
  authKey: string,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  const uaPublicKey = base64UrlDecode(p256dhKey);
  const authSecret = base64UrlDecode(authKey);

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );

  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw);

  const uaPublicKeyBuffer = uaPublicKey.buffer.slice(
    uaPublicKey.byteOffset,
    uaPublicKey.byteOffset + uaPublicKey.byteLength,
  ) as ArrayBuffer;
  const uaPublicKeyCrypto = await crypto.subtle.importKey(
    'raw',
    uaPublicKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  const ecdhSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaPublicKeyCrypto },
    serverKeyPair.privateKey,
    256,
  );
  const ecdhSecret = new Uint8Array(ecdhSecretBits);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfoHeader = encoder.encode('WebPush: info\0');
  const keyInfo = concatUint8Arrays(keyInfoHeader, uaPublicKey, serverPublicKey);

  const ikm = await hkdfDerive(authSecret, ecdhSecret, keyInfo, 32);

  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const cek = await hkdfDerive(salt, ikm, cekInfo, 16);

  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  const nonce = await hkdfDerive(salt, ikm, nonceInfo, 12);

  const paddedPayload = concatUint8Arrays(payloadBytes, new Uint8Array([0x02]));

  const cekBuffer = cek.buffer.slice(
    cek.byteOffset,
    cek.byteOffset + cek.byteLength,
  ) as ArrayBuffer;
  const cekKey = await crypto.subtle.importKey('raw', cekBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);

  const nonceBuffer = nonce.buffer.slice(
    nonce.byteOffset,
    nonce.byteOffset + nonce.byteLength,
  ) as ArrayBuffer;
  const paddedPayloadBuffer = paddedPayload.buffer.slice(
    paddedPayload.byteOffset,
    paddedPayload.byteOffset + paddedPayload.byteLength,
  ) as ArrayBuffer;

  const encryptedRecord = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBuffer },
    cekKey,
    paddedPayloadBuffer,
  );

  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
  header.set(salt, 0);
  header[16] = (recordSize >> 24) & 0xff;
  header[17] = (recordSize >> 16) & 0xff;
  header[18] = (recordSize >> 8) & 0xff;
  header[19] = recordSize & 0xff;
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);

  const body = concatUint8Arrays(header, new Uint8Array(encryptedRecord));

  return {
    ciphertext: body,
    salt,
    serverPublicKey,
  };
}

/**
 * Send a single Web Push notification
 */
export async function sendWebPushNotification(
  subscription: WebPushSubscription,
  payload: NotificationPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
  ttl: number = 86400,
): Promise<{ success: boolean; error?: string }> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = endpointUrl.origin;

    const expiration = Math.floor(Date.now() / 1000) + 43200;
    const jwt = await generateVapidJwt(
      audience,
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey,
      expiration,
    );

    const payloadString = JSON.stringify(payload);
    const { ciphertext } = await encryptPushMessage(
      payloadString,
      subscription.p256dh_key,
      subscription.auth_key,
    );

    const ciphertextBuffer = ciphertext.buffer.slice(
      ciphertext.byteOffset,
      ciphertext.byteOffset + ciphertext.byteLength,
    ) as ArrayBuffer;
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        TTL: ttl.toString(),
        Urgency: 'normal',
      },
      body: ciphertextBuffer,
    });

    if (response.ok || response.status === 201) {
      return { success: true };
    }

    const status = response.status;
    let errorMessage = `HTTP ${status}`;

    try {
      const errorBody = await response.text();
      errorMessage += `: ${errorBody}`;
    } catch {
      // Ignore
    }

    if (status === 404 || status === 410) {
      return { success: false, error: 'subscription_expired' };
    }

    if (status === 413) {
      return { success: false, error: 'payload_too_large' };
    }

    if (status === 429) {
      return { success: false, error: 'rate_limited' };
    }

    return { success: false, error: errorMessage };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
