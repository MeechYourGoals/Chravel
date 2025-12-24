/**
 * Apple App Site Association (AASA) API Endpoint
 * 
 * Serves the AASA file for Universal Links configuration.
 * Must be accessible at: https://chravel.app/.well-known/apple-app-site-association
 * 
 * For Vercel, add this rewrite to vercel.json:
 * {
 *   "rewrites": [
 *     {
 *       "source": "/.well-known/apple-app-site-association",
 *       "destination": "/api/aasa"
 *     }
 *   ]
 * }
 * 
 * IMPORTANT: Replace TEAM_ID with your actual Apple Developer Team ID before deployment.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// TODO: Replace with actual Apple Developer Team ID
const TEAM_ID = process.env.APPLE_TEAM_ID || 'TEAM_ID';
const BUNDLE_ID = 'com.chravel.app';
const APP_ID = `${TEAM_ID}.${BUNDLE_ID}`;

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const aasa = {
    applinks: {
      // Required empty array for modern AASA format
      apps: [],
      details: [
        {
          appIDs: [APP_ID],
          // Modern component-based format (iOS 13+)
          components: [
            // Trip routes
            { '/': '/trip/*', comment: 'Trip detail pages' },
            
            // Pro/Event routes  
            { '/': '/tour/pro/*', comment: 'Pro trip pages' },
            { '/': '/event/*', comment: 'Event pages' },
            
            // Invite routes (high priority for user acquisition)
            { '/': '/join/*', comment: 'Trip invite links' },
            { '/': '/invite/*', comment: 'Organization invites' },
            
            // Organization routes
            { '/': '/organization/*', comment: 'Organization pages' },
            
            // User routes
            { '/': '/profile/*', comment: 'User profiles' },
            
            // Sharing routes
            { '/': '/share/*', comment: 'Shared content' },
          ],
        },
      ],
    },
    // Enable AutoFill for saved passwords
    webcredentials: {
      apps: [APP_ID],
    },
  };

  // AASA must be served with correct content type
  res.setHeader('Content-Type', 'application/json');
  // Allow caching but not too long (Apple caches this)
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  res.status(200).json(aasa);
}
