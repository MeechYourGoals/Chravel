#!/usr/bin/env npx ts-node
/**
 * VAPID Key Generation Script for Web Push Notifications
 * 
 * VAPID (Voluntary Application Server Identification) keys are used to identify
 * your server to push services and are required for Web Push Protocol.
 * 
 * Usage:
 *   npx ts-node scripts/generate-vapid-keys.ts
 *   # or
 *   bun run scripts/generate-vapid-keys.ts
 * 
 * Output:
 *   - VAPID_PUBLIC_KEY: Add to .env and use in frontend
 *   - VAPID_PRIVATE_KEY: Add to Supabase secrets (never expose to frontend)
 * 
 * @see https://web.dev/push-notifications-web-push-protocol/
 */

import * as crypto from 'crypto';

interface VAPIDKeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate a new VAPID key pair using ECDH with P-256 curve
 * Returns base64url-encoded keys suitable for Web Push
 */
function generateVAPIDKeys(): VAPIDKeyPair {
  // Generate ECDH key pair using P-256 curve (required for Web Push)
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  
  // Get keys in uncompressed format
  const publicKeyBuffer = ecdh.getPublicKey();
  const privateKeyBuffer = ecdh.getPrivateKey();
  
  // Convert to base64url encoding (required by Web Push spec)
  const publicKey = base64UrlEncode(publicKeyBuffer);
  const privateKey = base64UrlEncode(privateKeyBuffer);
  
  return { publicKey, privateKey };
}

/**
 * Convert buffer to base64url string
 * Base64url is base64 with '+' replaced by '-', '/' replaced by '_', and no padding
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate a VAPID public key
 */
function validatePublicKey(key: string): boolean {
  try {
    const decoded = Buffer.from(
      key.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );
    // P-256 uncompressed public key is 65 bytes (1 byte prefix + 32 bytes X + 32 bytes Y)
    return decoded.length === 65 && decoded[0] === 0x04;
  } catch {
    return false;
  }
}

/**
 * Validate a VAPID private key
 */
function validatePrivateKey(key: string): boolean {
  try {
    const decoded = Buffer.from(
      key.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );
    // P-256 private key is 32 bytes
    return decoded.length === 32;
  } catch {
    return false;
  }
}

// Main execution
function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         VAPID Key Generator for Web Push Notifications        ║');
  console.log('║                         Chravel                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const keys = generateVAPIDKeys();
  
  // Validate generated keys
  if (!validatePublicKey(keys.publicKey)) {
    console.error('❌ Generated public key is invalid');
    process.exit(1);
  }
  
  if (!validatePrivateKey(keys.privateKey)) {
    console.error('❌ Generated private key is invalid');
    process.exit(1);
  }
  
  console.log('✅ Generated valid VAPID key pair\n');
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('PUBLIC KEY (safe to expose, add to .env for frontend):');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('PRIVATE KEY (keep secret, add to Supabase secrets):');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('SETUP INSTRUCTIONS:');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('1. Add to your .env file (frontend):');
  console.log(`   VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log('');
  console.log('2. Add to Supabase secrets (Supabase Dashboard > Edge Functions > Secrets):');
  console.log(`   VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`   VAPID_PRIVATE_KEY=${keys.privateKey}`);
  console.log('');
  console.log('3. Update your notification service to use the public key');
  console.log('');
  console.log('⚠️  SECURITY NOTES:');
  console.log('   - NEVER commit the private key to version control');
  console.log('   - NEVER expose the private key to the frontend');
  console.log('   - Store the private key securely in Supabase secrets');
  console.log('   - Keys can be regenerated, but existing subscriptions will be invalidated');
  console.log('');
}

main();
