import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock data imports (simplified for edge function)
const tripsData = [
  {
    id: '1',
    title: 'Spring Break Cancun 2026 Kappa Alpha Psi Trip',
    location: 'Cancun, Mexico',
    dateRange: 'Mar 15 - Mar 22, 2026',
    description:
      'Brotherhood spring break getaway with beach activities, nightlife, and bonding experiences',
    participants: ['Marcus', 'Jamal', 'Darius', 'Terrell', 'Jerome'],
  },
  {
    id: '2',
    title: 'Tokyo Adventure',
    location: 'Tokyo, Japan',
    dateRange: 'Oct 5 - Oct 15, 2025',
    description:
      "Cultural exploration of Japan's capital with temples, modern tech districts, and amazing cuisine",
    participants: ['Alex', 'Maria', 'David'],
  },
  {
    id: '4',
    title: "Kristen's Bachelorette Party",
    location: 'Nashville, TN',
    dateRange: 'Nov 8 - Nov 10, 2025',
    description:
      'Epic bachelorette celebration with honky-tonk bars, live music, and unforgettable memories',
    participants: ['Kristen', 'Ashley', 'Megan', 'Taylor', 'Sam', 'Jenna'],
  },
  {
    id: '5',
    title: 'Coachella Squad 2026',
    location: 'Indio, CA',
    dateRange: 'Apr 10 - Apr 13, 2026',
    description: 'Music festival adventure with top artists, desert vibes, and group camping',
    participants: ['Tyler', 'Zoe', 'Mason', 'Chloe', 'Jordan'],
  },
  {
    id: '7',
    title: "Fantasy Football Chat's Annual Golf Outing",
    location: 'Phoenix, Arizona',
    dateRange: 'Feb 20 - Feb 23, 2025',
    description:
      "Annual guys' golf trip with tournaments, poker nights, and fantasy football draft",
    participants: ['Commissioner Mike', 'Big Rob', 'Tony', 'Dave', 'Chris', 'Steve'],
  },
];

const proTripsData = [
  {
    id: 'lakers-road-trip',
    title: 'Lakers Road Trip - Western Conference',
    location: 'Multiple Cities, USA',
    dateRange: 'Mar 1 - Mar 15, 2025',
    description: 'Professional basketball team road trip through western conference cities',
    participants: ['Coach Johnson', 'Team Manager', 'Athletic Director'],
    roles: ['coach', 'team manager', 'athletic director', 'player'],
  },
  {
    id: 'taylor-swift-eras-tour',
    title: 'Taylor Swift Eras Tour - International Leg',
    location: 'Tokyo, Japan',
    dateRange: 'Apr 2 - Apr 9, 2025',
    description: 'International leg of the Eras Tour with multiple venue performances',
    participants: ['Tour Manager', 'Production Director', 'Taylor Swift'],
    roles: ['tour manager', 'production director', 'artist', 'crew'],
  },
];

const eventsData = [
  {
    id: 'sxsw-2025',
    title: 'SXSW 2025',
    location: 'Austin, TX',
    dateRange: 'Mar 7 - Mar 16, 2025',
    description: 'Interactive technology, film, and music festival and conference',
    participants: ['Sarah Chen', 'Marcus Rodriguez', 'Jessica Kim'],
    roles: ['event coordinator', 'tech director', 'music coordinator'],
  },
  {
    id: 'invest-fest-2025',
    title: 'Invest Fest 2025',
    location: 'Atlanta, GA (GWCC)',
    dateRange: 'Aug 23 - Aug 25, 2025',
    description: 'Personal finance mega-expo for building generational wealth',
    participants: ['Jamal Washington', 'Keisha Davis'],
    roles: ['finance director', 'community lead'],
  },
];

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting to populate search index...');

    // Clear existing data
    const { error: deleteError } = await supabase
      .from('search_index')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error clearing search index:', deleteError);
    }

    const searchData = [];

    // Process regular trips
    for (const trip of tripsData) {
      const [city, state, country] = trip.location.split(', ').map(s => s?.trim());
      const [startDateStr, endDateStr] = trip.dateRange.split(' - ');

      // Parse dates
      const startDate = new Date(startDateStr + ', 2025');
      const endDate = new Date(endDateStr + ', 2025');

      // Create formatted date for search
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const formattedDate = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

      const fullText = [
        trip.title,
        trip.location,
        city,
        trip.description,
        formattedDate,
        ...trip.participants,
      ]
        .filter(Boolean)
        .join(' ');

      searchData.push({
        trip_id: trip.id,
        trip_type: 'regular',
        title: trip.title,
        location: trip.location,
        city: city || null,
        state: state || null,
        country: country || null,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        date_range: trip.dateRange,
        formatted_date: formattedDate,
        tags: ['vacation', 'group trip'],
        participant_names: trip.participants,
        participant_roles: ['participant'],
        category: 'Personal',
        description: trip.description,
        full_text: fullText,
      });
    }

    // Process pro trips
    for (const trip of proTripsData) {
      const [city, state, country] = trip.location.split(', ').map(s => s?.trim());
      const [startDateStr, endDateStr] = trip.dateRange.split(' - ');

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const formattedDate = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

      const fullText = [
        trip.title,
        trip.location,
        city,
        trip.description,
        formattedDate,
        ...trip.participants,
        ...trip.roles,
      ]
        .filter(Boolean)
        .join(' ');

      searchData.push({
        trip_id: trip.id,
        trip_type: 'pro',
        title: trip.title,
        location: trip.location,
        city: city || null,
        state: state || null,
        country: country || null,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        date_range: trip.dateRange,
        formatted_date: formattedDate,
        tags: ['professional', 'tour'],
        participant_names: trip.participants,
        participant_roles: trip.roles,
        category: 'Professional',
        description: trip.description,
        full_text: fullText,
      });
    }

    // Process events
    for (const event of eventsData) {
      const [city, state, country] = event.location.split(', ').map(s => s?.trim());
      const [startDateStr, endDateStr] = event.dateRange.split(' - ');

      const startDate = new Date(startDateStr);
      const endDate = endDateStr ? new Date(endDateStr) : startDate;

      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const formattedDate = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

      const fullText = [
        event.title,
        event.location,
        city,
        event.description,
        formattedDate,
        ...event.participants,
        ...event.roles,
      ]
        .filter(Boolean)
        .join(' ');

      searchData.push({
        trip_id: event.id,
        trip_type: 'event',
        title: event.title,
        location: event.location,
        city: city || null,
        state: state || null,
        country: country || null,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        date_range: event.dateRange,
        formatted_date: formattedDate,
        tags: ['event', 'conference'],
        participant_names: event.participants,
        participant_roles: event.roles,
        category: 'Event',
        description: event.description,
        full_text: fullText,
      });
    }

    // Insert all data
    const { data, error } = await supabase.from('search_index').insert(searchData).select();

    if (error) {
      console.error('Error inserting search data:', error);
      throw error;
    }

    console.log(`Successfully populated ${data?.length || 0} search index entries`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Populated ${data?.length || 0} search index entries`,
        data: data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error populating search index:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
