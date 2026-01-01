/**
 * Android Asset Links API Endpoint
 *
 * Serves the assetlinks.json file for Android App Links configuration.
 * Must be accessible at: https://chravel.app/.well-known/assetlinks.json
 *
 * For Vercel, add this rewrite to vercel.json:
 * {
 *   "rewrites": [
 *     {
 *       "source": "/.well-known/assetlinks.json",
 *       "destination": "/api/assetlinks"
 *     }
 *   ]
 * }
 *
 * PLACEHOLDER: Replace SHA256 fingerprints with actual values from your Android keystore
 * To get SHA256: keytool -list -v -keystore your-keystore.jks -alias your-alias
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// PLACEHOLDER: Replace with actual Android package name
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.chravel.app';

// PLACEHOLDER: Replace with actual SHA256 certificate fingerprints
// Get these from: keytool -list -v -keystore your-release-key.keystore
// Or from Google Play Console: Setup > App Signing > App signing key certificate
const SHA256_CERT_FINGERPRINTS = [
  // PLACEHOLDER: Debug keystore fingerprint (for development)
  // Format: "XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX"
  process.env.ANDROID_SHA256_DEBUG || 'PLACEHOLDER_DEBUG_SHA256_REPLACE_WITH_ACTUAL_FINGERPRINT',

  // PLACEHOLDER: Release keystore fingerprint (for production)
  process.env.ANDROID_SHA256_RELEASE ||
    'PLACEHOLDER_RELEASE_SHA256_REPLACE_WITH_ACTUAL_FINGERPRINT',
];

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const assetLinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: ANDROID_PACKAGE_NAME,
        sha256_cert_fingerprints: SHA256_CERT_FINGERPRINTS.filter(
          fp => !fp.startsWith('PLACEHOLDER'),
        ),
      },
    },
  ];

  // If no valid fingerprints, return placeholder with instructions
  if (assetLinks[0].target.sha256_cert_fingerprints.length === 0) {
    // Return a valid but empty assetlinks for development
    assetLinks[0].target.sha256_cert_fingerprints = [];

    // Add a comment in the response for debugging
    res.setHeader(
      'X-Chravel-Note',
      'SHA256 fingerprints not configured - set ANDROID_SHA256_DEBUG and/or ANDROID_SHA256_RELEASE env vars',
    );
  }

  // assetlinks.json must be served with correct content type
  res.setHeader('Content-Type', 'application/json');
  // Allow caching but not too long
  res.setHeader('Cache-Control', 'public, max-age=3600');

  res.status(200).json(assetLinks);
}
