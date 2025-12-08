import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    title: 'Spring Break Cancun 2026',
    location: 'Cancun, Mexico',
    dateRange: 'Mar 15 - Mar 22, 2026',
    description: 'Beach vacation with the crew. Sun, sand, and unforgettable memories await!',
    coverPhoto: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1200&h=630&fit=crop',
    participantCount: 5
  },
  '2': {
    title: 'Tokyo Adventure',
    location: 'Tokyo, Japan',
    dateRange: 'Jun 10 - Jun 17, 2026',
    description: 'Exploring Japan with friends. Culture, food, and adventure in the land of the rising sun.',
    coverPhoto: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=630&fit=crop',
    participantCount: 4
  },
  '3': {
    title: "2026 Kappa Alpha Side Trip",
    location: 'Charleston, SC',
    dateRange: 'Apr 5 - Apr 8, 2026',
    description: 'Alumni weekend getaway with the brotherhood.',
    coverPhoto: 'https://images.unsplash.com/photo-1569974507005-6dc61f97fb5c?w=1200&h=630&fit=crop',
    participantCount: 8
  },
  '4': {
    title: "Jack and Jill's Destination Wedding",
    location: 'Bali, Indonesia',
    dateRange: 'Sep 20 - Sep 27, 2026',
    description: 'Celebrating love in paradise. Join us for an unforgettable destination wedding.',
    coverPhoto: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&h=630&fit=crop',
    participantCount: 12
  },
  '5': {
    title: 'European Backpacking Adventure',
    location: 'Paris, France',
    dateRange: 'Jul 1 - Jul 21, 2026',
    description: 'Three weeks exploring the best of Europe with friends.',
    coverPhoto: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=630&fit=crop',
    participantCount: 4
  },
  '6': {
    title: 'Miami Beach Getaway',
    location: 'Miami, FL',
    dateRange: 'May 15 - May 19, 2026',
    description: 'Weekend escape to South Beach with the squad.',
    coverPhoto: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1200&h=630&fit=crop',
    participantCount: 6
  }
};

function generateHTML(trip: {
  title: string;
  location: string;
  dateRange: string;
  description: string;
  coverPhoto: string;
  participantCount: number;
}, tripId: string, baseUrl: string): string {
  const previewUrl = `${baseUrl}/trip/${tripId}/preview`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${trip.title} | Chravel</title>
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${previewUrl}">
  <meta property="og:title" content="${trip.title}">
  <meta property="og:description" content="${trip.description} 📍 ${trip.location} • 📅 ${trip.dateRange} • 👥 ${trip.participantCount} travelers">
  <meta property="og:image" content="${trip.coverPhoto}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Chravel">
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${trip.title}">
  <meta name="twitter:description" content="${trip.description} 📍 ${trip.location} • 📅 ${trip.dateRange}">
  <meta name="twitter:image" content="${trip.coverPhoto}">
  
  <!-- Additional Meta Tags -->
  <meta name="description" content="${trip.description}">
  
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
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .location {
      color: #fbbf24;
      font-size: 14px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
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
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
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
    .cta:hover {
      opacity: 0.9;
    }
    .logo {
      text-align: center;
      margin-top: 24px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="${trip.coverPhoto}" alt="${trip.title}" class="cover">
    <div class="content">
      <h1 class="title">${trip.title}</h1>
      <div class="location">📍 ${trip.location}</div>
      <p class="description">${trip.description}</p>
      <div class="meta">
        <div class="meta-item">📅 ${trip.dateRange}</div>
        <div class="meta-item">👥 ${trip.participantCount} travelers</div>
      </div>
      <a href="${baseUrl}" class="cta">View Trip on Chravel</a>
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
    const tripId = url.searchParams.get('tripId');
    
    console.log('[generate-trip-preview] Request for tripId:', tripId);

    if (!tripId) {
      return new Response('Missing tripId parameter', { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    // Determine base URL for links
    const baseUrl = Deno.env.get('SITE_URL') || 'https://chravel.app';
    
    // Check if it's a demo trip (numeric ID 1-12)
    if (demoTrips[tripId]) {
      console.log('[generate-trip-preview] Serving demo trip:', tripId);
      const html = generateHTML(demoTrips[tripId], tripId, baseUrl);
      return new Response(html, {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });
    }

    // For real trips (UUID format), query Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: trip, error } = await supabase
      .from('trips')
      .select('name, description, destination, start_date, end_date, cover_image_url')
      .eq('id', tripId)
      .maybeSingle();

    if (error) {
      console.error('[generate-trip-preview] Database error:', error);
      return new Response('Error fetching trip', { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    if (!trip) {
      console.log('[generate-trip-preview] Trip not found:', tripId);
      return new Response('Trip not found', { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    // Get participant count
    const { count: participantCount } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId);

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

    console.log('[generate-trip-preview] Serving real trip:', tripId, tripData.title);
    const html = generateHTML(tripData, tripId, baseUrl);
    
    return new Response(html, {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error('[generate-trip-preview] Error:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }
});
