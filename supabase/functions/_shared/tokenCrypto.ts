/**
 * AES-GCM token encryption helpers for Supabase Edge Functions.
 *
 * Tokens are stored as:  enc:v1:<base64url(iv)>.<base64url(ciphertext)>
 * Legacy plaintext tokens (no prefix) are returned as-is for backwards compatibility.
 *
 * Required secret: TOKEN_ENCRYPTION_KEY — a 64-char hex string (32 bytes / 256-bit key).
 * Generate with: openssl rand -hex 32
 */

const ENC_PREFIX = 'enc:v1:';

/** Decode a hex string to a Uint8Array */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, 2 + i), 16);
  }
  return bytes;
}

/** Base64url encode (no padding) */
function base64urlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** Base64url decode */
function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const withPad = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Import raw key bytes as AES-GCM CryptoKey */
async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt a plaintext token string.
 * Returns: "enc:v1:<base64url(12-byte iv)>.<base64url(ciphertext)>"
 */
export async function encryptToken(plaintext: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return `${ENC_PREFIX}${base64urlEncode(iv)}.${base64urlEncode(new Uint8Array(ciphertext))}`;
}

/**
 * Decrypt a stored token string.
 * If stored value starts with "enc:v1:", decrypt it.
 * Otherwise return as-is (legacy plaintext — backwards compatible).
 */
export async function decryptToken(stored: string, keyHex: string): Promise<string> {
  if (!stored.startsWith(ENC_PREFIX)) {
    // Legacy plaintext token — pass through until user reconnects
    return stored;
  }

  const payload = stored.substring(ENC_PREFIX.length);
  const dotIndex = payload.indexOf('.');
  if (dotIndex === -1) throw new Error('Invalid encrypted token format');

  const iv = base64urlDecode(payload.substring(0, dotIndex));
  const ciphertext = base64urlDecode(payload.substring(dotIndex + 1));

  const key = await importKey(keyHex);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer,
  );
  return new TextDecoder().decode(decrypted);
}
