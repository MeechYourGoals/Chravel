import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[generate-invite-preview] ${step}${detailsStr}`);
};

// Demo trip data with public Unsplash images for OG tags
const demoTrips: Record<string, {
  title: string;
  location: string;
  dateRange: string;
  description: string;
  coverPhoto: string;
  participantCount: number;
}> = {
  '1': {
    title: 'Spring Break Cancun 2026 Kappa Alpha Psi Trip',
    location: 'Cancun, Mexico',
    dateRange: 'Mar 15 - Mar 22, 2026',
    description: 'Brotherhood spring break getaway with beach activities, nightlife, and bonding experiences',
    coverPhoto: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1200&h=630&fit=crop',
    participantCount: 5
  },
  '2': {
    title: 'Tokyo Adventure',
    location: 'Tokyo, Japan',
    dateRange: 'Oct 5 - Oct 15, 2025',
    description: "Cultural exploration of Japan's capital with temples, modern tech districts, and amazing cuisine",
    coverPhoto: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=630&fit=crop',
    participantCount: 3
  },
  '3': {
    title: "Jack and Jill's Destination Wedding",
    location: 'Bali, Indonesia',
    dateRange: 'Dec 10 - Dec 20, 2025',
    description: 'Romantic destination wedding celebration with family and friends in paradise',
    coverPhoto: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&h=630&fit=crop',
    participantCount: 4
  },
  '4': {
    title: "Kristen's Bachelorette Party",
    location: 'Nashville, TN',
    dateRange: 'Nov 8 - Nov 10, 2025',
    description: 'Epic bachelorette celebration with honky-tonk bars, live music, and unforgettable memories',
    coverPhoto: 'https://images.unsplash.com/photo-1545579133-99bb5ab189bd?w=1200&h=630&fit=crop',
    participantCount: 6
  },
  '5': {
    title: 'Coachella Squad 2026',
    location: 'Indio, CA',
    dateRange: 'Apr 10 - Apr 13, 2026',
    description: 'Music festival adventure with top artists, desert vibes, and group camping',
    coverPhoto: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&h=630&fit=crop',
    participantCount: 5
  },
  '6': {
    title: 'Johnson Family Summer Vacay',
    location: 'Saratoga Springs, NY',
    dateRange: 'Jul 20 - Jul 28, 2025',
    description: 'Multi-generational family retreat with horse racing, spa time, and quality family bonding',
    coverPhoto: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=630&fit=crop',
    participantCount: 5
  },
  '7': {
    title: "Fantasy Football Chat's Annual Golf Outing",
    location: 'Phoenix, Arizona',
    dateRange: 'Feb 20 - Feb 23, 2025',
    description: "Annual guys' golf trip with tournaments, poker nights, and fantasy football draft",
    coverPhoto: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&h=630&fit=crop',
    participantCount: 6
  },
  '8': {
    title: 'Tulum Wellness Retreat',
    location: 'Tulum, Mexico',
    dateRange: 'Nov 10 - Nov 16, 2025',
    description: 'Yoga and wellness focused retreat with breathwork, meditation, and spa treatments',
    coverPhoto: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&h=630&fit=crop',
    participantCount: 8
  },
  '9': {
    title: 'Newly Divorced Wine-Tasting Getaway',
    location: 'Napa Valley, CA',
    dateRange: 'May 2 - May 5, 2025',
    description: 'Celebratory wine country escape with tastings, spa treatments, and new beginnings',
    coverPhoto: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&h=630&fit=crop',
    participantCount: 6
  },
  '10': {
    title: 'Corporate Holiday Ski Trip – Aspen',
    location: 'Aspen, CO',
    dateRange: 'Dec 12 - Dec 17, 2025',
    description: 'Company holiday celebration with skiing, team building, and winter activities',
    coverPhoto: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&h=630&fit=crop',
    participantCount: 10
  },
  '11': {
    title: 'Disney Cruise Family Vacation',
    location: 'Port Canaveral, FL',
    dateRange: 'Jun 15 - Jun 22, 2025',
    description: 'Magical family cruise with Disney characters, activities, and island adventures',
    coverPhoto: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&h=630&fit=crop',
    participantCount: 7
  },
  '12': {
    title: 'Yellowstone National-Park Hiking Adventure',
    location: 'Yellowstone, WY',
    dateRange: 'Jul 10 - Jul 17, 2025',
    description: 'Outdoor adventure exploring geysers, wildlife, and backcountry hiking trails',
    coverPhoto: 'https://images.unsplash.com/photo-1533167649158-6d508895b680?w=1200&h=630&fit=crop',
    participantCount: 5
  }
};

function generateInviteHTML(trip: {
  title: string;
  location: string;
  dateRange: string;
  description: string;
  coverPhoto: string;
  participantCount: number;
}, inviteCode: string, baseUrl: string): string {
  const joinUrl = `${baseUrl}/join/${inviteCode}`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited: ${trip.title} | Chravel</title>
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${joinUrl}">
  <meta property="og:title" content="You're Invited: ${trip.title}">
  <meta property="og:description" content="Join this trip on Chravel! 📍 ${trip.location} • 📅 ${trip.dateRange} • 👥 ${trip.participantCount} travelers">
  <meta property="og:image" content="${trip.coverPhoto}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Chravel">
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="You're Invited: ${trip.title}">
  <meta name="twitter:description" content="Join this trip on Chravel! 📍 ${trip.location} • 📅 ${trip.dateRange}">
  <meta name="twitter:image" content="${trip.coverPhoto}">
  
  <!-- Additional Meta Tags -->
  <meta name="description" content="You've been invited to join ${trip.title} on Chravel - the AI-powered travel companion.">
  
  <!-- Redirect to actual join page after a short delay -->
  <meta http-equiv="refresh" content="0;url=${joinUrl}">
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      overflow: hidden;
      max-width: 400px;
      width: 100%;
      backdrop-filter: blur(10px);
    }
    .badge {
      background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
      color: #000;
      text-align: center;
      padding: 8px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .cover {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    .content {
      padding: 24px;
    }
    .title {
      color: #fff;
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .location {
      color: #fbbf24;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .description {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .meta {
      display: flex;
      gap: 16px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
    }
    .cta {
      display: block;
      background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
      color: #000;
      text-align: center;
      padding: 14px;
      font-weight: 600;
      text-decoration: none;
      margin-top: 20px;
      border-radius: 12px;
    }
    .logo {
      text-align: center;
      margin-top: 24px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }
    .loading {
      text-align: center;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 16px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✨ You're Invited!</div>
    <img src="${trip.coverPhoto}" alt="${trip.title}" class="cover">
    <div class="content">
      <h1 class="title">${trip.title}</h1>
      <div class="location">📍 ${trip.location}</div>
      <p class="description">${trip.description}</p>
      <div class="meta">
        <span>📅 ${trip.dateRange}</span>
        <span>👥 ${trip.participantCount} travelers</span>
      </div>
      <a href="${joinUrl}" class="cta">Join This Trip</a>
      <p class="loading">Redirecting you to Chravel...</p>
    </div>
    <div class="logo">Powered by Chravel</div>
  </div>
</body>
</html>`;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const inviteCode = url.searchParams.get('code');
    
    logStep('Request received', { code: inviteCode?.substring(0, 12) + '...' });

    if (!inviteCode) {
      return new Response('Missing code parameter', { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    // Determine base URL for links
    const baseUrl = Deno.env.get('SITE_URL') || 'https://chravel.app';
    
    // Check if it's a demo invite code (starts with "demo-")
    if (inviteCode.startsWith('demo-')) {
      // Extract trip ID from demo code (format: demo-{tripId}-{timestamp})
      const parts = inviteCode.split('-');
      const tripId = parts[1];
      
      if (demoTrips[tripId]) {
        logStep('Serving demo invite', { tripId });
        const html = generateInviteHTML(demoTrips[tripId], inviteCode, baseUrl);
        return new Response(html, {
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
    }

    // For real invite codes, look up in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up the invite code
    const { data: invite, error: inviteError } = await supabase
      .from('trip_invites')
      .select('trip_id, is_active, expires_at')
      .eq('code', inviteCode)
      .maybeSingle();

    if (inviteError) {
      logStep('Database error fetching invite', { error: inviteError.message });
      return new Response('Error fetching invite', { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    if (!invite) {
      logStep('Invite not found', { code: inviteCode });
      // Return a generic "invite not found" page with OG tags
      const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Invite | Chravel</title>
  <meta property="og:title" content="Trip Invite | Chravel">
  <meta property="og:description" content="You've been invited to join a trip on Chravel - the AI-powered travel companion.">
  <meta property="og:image" content="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=630&fit=crop">
  <meta property="og:site_name" content="Chravel">
  <meta http-equiv="refresh" content="0;url=${baseUrl}/join/${inviteCode}">
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #1a1a2e; color: white;">
  <p>Redirecting to Chravel...</p>
</body>
</html>`;
      return new Response(notFoundHtml, {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8' 
        }
      });
    }

    // Fetch trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('name, description, destination, start_date, end_date, cover_image_url')
      .eq('id', invite.trip_id)
      .maybeSingle();

    if (tripError || !trip) {
      logStep('Trip not found', { tripId: invite.trip_id });
      return new Response('Trip not found', { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    // Get participant count
    const { count: participantCount } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', invite.trip_id);

    // Format dates
    const startDate = trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const endDate = trip.end_date ? new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : 'Dates TBD';

    const tripData = {
      title: trip.name || 'Untitled Trip',
      location: trip.destination || 'Location TBD',
      dateRange,
      description: trip.description || 'An amazing adventure awaits!',
      coverPhoto: trip.cover_image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=630&fit=crop',
      participantCount: participantCount || 1
    };

    logStep('Serving invite preview', { tripId: invite.trip_id, title: tripData.title });
    const html = generateInviteHTML(tripData, inviteCode, baseUrl);
    
    return new Response(html, {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });

  } catch (error) {
    logStep('Error', { message: error instanceof Error ? error.message : String(error) });
    return new Response('Internal server error', { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }
});
