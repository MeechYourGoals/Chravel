import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    const { trip_id } = await req.json();

    if (!trip_id) {
      return new Response(JSON.stringify({ error: 'trip_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin of the trip
    const { data: tripMember, error: memberError } = await supabaseClient
      .from('trip_members')
      .select('role')
      .eq('trip_id', trip_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !tripMember) {
      return new Response(JSON.stringify({ error: 'User is not a member of this trip' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['admin', 'organizer', 'owner'].includes(tripMember.role)) {
      return new Response(
        JSON.stringify({ error: 'User does not have permission to create channels' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get all unique roles from trip members
    const { data: roles, error: rolesError } = await supabaseClient
      .from('trip_members')
      .select('role')
      .eq('trip_id', trip_id)
      .not('role', 'is', null);

    if (rolesError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch roles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unique roles
    const uniqueRoles = [...new Set(roles.map(r => r.role))].filter(role => role && role.trim());

    if (uniqueRoles.length === 0) {
      return new Response(JSON.stringify({ message: 'No roles found to create channels for' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create channels for each role
    const createdChannels = [];

    for (const role of uniqueRoles) {
      const slug = role
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const channelName = role.charAt(0).toUpperCase() + role.slice(1);

      // Check if channel already exists
      const { data: existingChannel } = await supabaseClient
        .from('trip_channels')
        .select('id')
        .eq('trip_id', trip_id)
        .eq('slug', slug)
        .single();

      if (existingChannel) {
        continue; // Skip if channel already exists
      }

      // Create the channel
      const { data: channel, error: channelError } = await supabaseClient
        .from('trip_channels')
        .insert({
          trip_id,
          name: channelName,
          slug,
          description: `Private channel for ${role.toLowerCase()} members`,
          channel_type: 'role',
          role_filter: { role },
          created_by: user.id,
        })
        .select()
        .single();

      if (channelError) {
        console.error(`Failed to create channel for role ${role}:`, channelError);
        continue;
      }

      // Add all users with this role to the channel
      const { data: roleMembers, error: membersError } = await supabaseClient
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', trip_id)
        .eq('role', role);

      if (membersError) {
        console.error(`Failed to fetch members for role ${role}:`, membersError);
        continue;
      }

      if (roleMembers && roleMembers.length > 0) {
        const channelMembers = roleMembers.map(member => ({
          channel_id: channel.id,
          user_id: member.user_id,
          role: role,
        }));

        const { error: addMembersError } = await supabaseClient
          .from('trip_channel_members')
          .insert(channelMembers);

        if (addMembersError) {
          console.error(`Failed to add members to channel ${channelName}:`, addMembersError);
        }
      }

      createdChannels.push({
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        role: role,
        member_count: roleMembers?.length || 0,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        created_channels: createdChannels,
        message: `Created ${createdChannels.length} role channels`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error creating default channels:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
