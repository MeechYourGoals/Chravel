const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const keyCache = new Map<string, CryptoKey>();

async function importKey(base64Key: string): Promise<CryptoKey> {
  const cached = keyCache.get(base64Key);
  if (cached) return cached;

  const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  if (binary.length !== 32) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY must be base64 of 32 random bytes');
  }

  const key = await crypto.subtle.importKey('raw', binary, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
  keyCache.set(base64Key, key);
  return key;
}

function toBase64(input: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < input.length; i++) {
    binary += String.fromCharCode(input[i]);
  }
  return btoa(binary);
}

function fromBase64(input: string): Uint8Array {
  const binary = atob(input);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export async function encryptToken(plain: string, base64Key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(base64Key);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plain),
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const payload = new Uint8Array(iv.length + encryptedBytes.length);
  payload.set(iv, 0);
  payload.set(encryptedBytes, iv.length);
  return `enc:v1:${toBase64(payload)}`;
}

export async function decryptToken(
  tokenValue: string | null,
  base64Key: string,
): Promise<string | null> {
  if (!tokenValue) return null;
  if (!tokenValue.startsWith('enc:v1:')) {
    return tokenValue;
  }

  const payload = fromBase64(tokenValue.replace('enc:v1:', ''));
  const iv = payload.slice(0, 12);
  const ciphertext = payload.slice(12);

  const key = await importKey(base64Key);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return textDecoder.decode(decrypted);
}
