import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const demoTrips: Record<string, {
  title: string;
  location: string;
  description: string;
  coverPhoto: string;
  participantCount: number;
  dateRange: string;
}> = {
  "1": {
    title: "Spring Break Cancun 2026 Kappa Alpha Psi Trip",
    location: "Cancun, Mexico",
    dateRange: "Mar 15 - Mar 22, 2026",
    description:
      "Brotherhood spring break getaway with beach activities, nightlife, and bonding experiences",
    coverPhoto:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1200&h=630&fit=crop",
    participantCount: 5,
  },
  "2": {
    title: "Tokyo Adventure",
    location: "Tokyo, Japan",
    dateRange: "Oct 5 - Oct 15, 2025",
    description:
      "Cultural exploration of Japan's capital with temples, modern tech districts, and amazing cuisine",
    coverPhoto:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=630&fit=crop",
    participantCount: 3,
  },
  "3": {
    title: "Jack and Jill's Destination Wedding",
    location: "Bali, Indonesia",
    dateRange: "Dec 10 - Dec 20, 2025",
    description: "Romantic destination wedding celebration with family and friends in paradise",
    coverPhoto:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&h=630&fit=crop",
    participantCount: 4,
  },
  "4": {
    title: "Kristen's Bachelorette Party",
    location: "Nashville, TN",
    dateRange: "Nov 8 - Nov 10, 2025",
    description: "Epic bachelorette celebration with honky-tonk bars, live music, and unforgettable memories",
    coverPhoto:
      "https://images.unsplash.com/photo-1545579133-99bb5ab189bd?w=1200&h=630&fit=crop",
    participantCount: 6,
  },
  "5": {
    title: "Coachella Squad 2026",
    location: "Indio, CA",
    dateRange: "Apr 10 - Apr 13, 2026",
    description: "Music festival adventure with top artists, desert vibes, and group camping",
    coverPhoto:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&h=630&fit=crop",
    participantCount: 5,
  },
  "6": {
    title: "Johnson Family Summer Vacay",
    location: "Saratoga Springs, NY",
    dateRange: "Jul 20 - Jul 28, 2025",
    description: "Multi-generational family retreat with horse racing, spa time, and quality family bonding",
    coverPhoto:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=630&fit=crop",
    participantCount: 5,
  },
  "7": {
    title: "Fantasy Football Chat's Annual Golf Outing",
    location: "Phoenix, Arizona",
    dateRange: "Feb 20 - Feb 23, 2025",
    description: "Annual guys' golf trip with tournaments, poker nights, and fantasy football draft",
    coverPhoto:
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&h=630&fit=crop",
    participantCount: 6,
  },
  "8": {
    title: "Tulum Wellness Retreat",
    location: "Tulum, Mexico",
    dateRange: "Nov 10 - Nov 16, 2025",
    description: "Yoga and wellness focused retreat with breathwork, meditation, and spa treatments",
    coverPhoto:
      "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&h=630&fit=crop",
    participantCount: 8,
  },
  "9": {
    title: "Newly Divorced Wine-Tasting Getaway",
    location: "Napa Valley, CA",
    dateRange: "May 2 - May 5, 2025",
    description: "Celebratory wine country escape with tastings, spa treatments, and new beginnings",
    coverPhoto:
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&h=630&fit=crop",
    participantCount: 6,
  },
  "10": {
    title: "Corporate Holiday Ski Trip – Aspen",
    location: "Aspen, CO",
    dateRange: "Dec 12 - Dec 17, 2025",
    description: "Company holiday celebration with skiing, team building, and winter activities",
    coverPhoto:
      "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&h=630&fit=crop",
    participantCount: 10,
  },
  "11": {
    title: "Disney Cruise Family Vacation",
    location: "Port Canaveral, FL",
    dateRange: "Jun 15 - Jun 22, 2025",
    description: "Magical family cruise with Disney characters, activities, and island adventures",
    coverPhoto:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&h=630&fit=crop",
    participantCount: 7,
  },
  "12": {
    title: "Yellowstone National-Park Hiking Adventure",
    location: "Yellowstone, WY",
    dateRange: "Jul 10 - Jul 17, 2025",
    description: "Outdoor adventure exploring geysers, wildlife, and backcountry hiking trails",
    coverPhoto:
      "https://images.unsplash.com/photo-1533167649158-6d508895b680?w=1200&h=630&fit=crop",
    participantCount: 5,
  },
};

type TripPreview = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  trip_type: string | null;
  member_count: number;
  description?: string | null;
};

serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json() : {};
    const tripId = body.tripId ?? new URL(req.url).searchParams.get("tripId");

    if (!tripId || typeof tripId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "tripId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Demo trips
    const demo = demoTrips[tripId];
    if (demo) {
      const trip: TripPreview = {
        id: tripId,
        name: demo.title,
        destination: demo.location,
        start_date: null,
        end_date: null,
        cover_image_url: demo.coverPhoto,
        trip_type: "consumer",
        member_count: demo.participantCount,
        description: demo.description,
      };

      return new Response(
        JSON.stringify({ success: true, trip }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: tripRow, error: tripError } = await supabaseClient
      .from("trips")
      .select("id, name, destination, start_date, end_date, cover_image_url, trip_type, description")
      .eq("id", tripId)
      .maybeSingle();

    if (tripError || !tripRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Trip not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { count: memberCount } = await supabaseClient
      .from("trip_members")
      .select("*", { count: "exact", head: true })
      .eq("trip_id", tripId);

    const trip: TripPreview = {
      id: tripRow.id,
      name: tripRow.name,
      destination: tripRow.destination,
      start_date: tripRow.start_date,
      end_date: tripRow.end_date,
      cover_image_url: tripRow.cover_image_url,
      trip_type: tripRow.trip_type,
      member_count: memberCount ?? 0,
      description: tripRow.description,
    };

    return new Response(
      JSON.stringify({ success: true, trip }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

