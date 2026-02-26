import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  console.error('Please set them in your .env file or environment variables.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runVerification() {
  console.log('Starting Authorization Verification...');

  try {
    // 1. Create Test Users
    const user1Email = `test.user1.${randomUUID()}@example.com`;
    const user2Email = `test.user2.${randomUUID()}@example.com`;
    const password = 'password123';

    console.log(`Creating test users: ${user1Email}, ${user2Email}`);

    const { data: user1, error: user1Error } = await supabaseAdmin.auth.admin.createUser({
      email: user1Email,
      password: password,
      email_confirm: true,
    });
    if (user1Error) throw user1Error;

    const { data: user2, error: user2Error } = await supabaseAdmin.auth.admin.createUser({
      email: user2Email,
      password: password,
      email_confirm: true,
    });
    if (user2Error) throw user2Error;

    // Sign in as users to get tokens
    const { data: session1 } = await supabaseAdmin.auth.signInWithPassword({
      email: user1Email,
      password: password,
    });
    const { data: session2 } = await supabaseAdmin.auth.signInWithPassword({
      email: user2Email,
      password: password,
    });

    const client1 = createClient(
      SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      {
        global: { headers: { Authorization: `Bearer ${session1.session?.access_token}` } },
      },
    );

    // Use service role key if anon key is missing, but with user token header?
    // No, standard way is to use anon key and pass access token.
    // If anon key is missing (likely in backend env), we can simulate RLS by using `supabaseAdmin.auth.admin.getUserById`? No.
    // We need to act as the user.
    // If VITE_SUPABASE_ANON_KEY is not available, we can't easily act as user with RLS enforcement locally if we don't have the anon key.
    // I'll assume VITE_SUPABASE_ANON_KEY is available or user provides it.

    if (!process.env.VITE_SUPABASE_ANON_KEY) {
      console.warn(
        'Warning: VITE_SUPABASE_ANON_KEY not found. Using SERVICE_ROLE_KEY for client creation, which might bypass RLS if not careful, but we are passing user token.',
      );
    }

    const clientUser1 = createClient(
      SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      {
        global: { headers: { Authorization: `Bearer ${session1.session?.access_token}` } },
      },
    );

    const clientUser2 = createClient(
      SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      {
        global: { headers: { Authorization: `Bearer ${session2.session?.access_token}` } },
      },
    );

    // 2. Create Trips
    console.log('Creating trips...');
    const tripIdConsumer = randomUUID();
    const tripIdPro = randomUUID();

    // User 1 creates Consumer Trip
    await supabaseAdmin.from('trips').insert({
      id: tripIdConsumer,
      name: 'Consumer Trip',
      created_by: user1.user.id,
      trip_type: 'consumer',
    });

    // User 1 creates Pro Trip
    await supabaseAdmin.from('trips').insert({
      id: tripIdPro,
      name: 'Pro Trip',
      created_by: user1.user.id,
      trip_type: 'pro',
    });

    // Set User 1 as Admin for Pro Trip (simulate app logic)
    await supabaseAdmin.from('trip_admins').insert({
      trip_id: tripIdPro,
      user_id: user1.user.id,
    });

    // Add User 2 as Member to both trips
    await supabaseAdmin.from('trip_members').insert([
      { trip_id: tripIdConsumer, user_id: user2.user.id, role: 'member' },
      { trip_id: tripIdPro, user_id: user2.user.id, role: 'member' },
    ]);

    // Add User 1 as Member to both (creators are usually members)
    await supabaseAdmin.from('trip_members').insert([
      { trip_id: tripIdConsumer, user_id: user1.user.id, role: 'member' }, // or admin role, but RLS checks trip_admins for Pro
      { trip_id: tripIdPro, user_id: user1.user.id, role: 'member' },
    ]);

    // 3. Test Cases

    // Case A: Consumer Trip - Member (User 2) creates Event -> SUCCESS
    console.log('Test Case A: Consumer Trip - Member creates Event (Expect SUCCESS)');
    const { error: errorA } = await clientUser2.from('trip_events').insert({
      trip_id: tripIdConsumer,
      title: 'Member Event Consumer',
      start_time: new Date().toISOString(),
      created_by: user2.user.id,
    });

    if (errorA) {
      console.error('FAILED: User 2 could not create event in Consumer trip:', errorA);
    } else {
      console.log('PASSED: User 2 created event in Consumer trip.');
    }

    // Case B: Pro Trip - Member (User 2) creates Event -> FAILURE
    console.log('Test Case B: Pro Trip - Member creates Event (Expect FAILURE)');
    const { error: errorB } = await clientUser2.from('trip_events').insert({
      trip_id: tripIdPro,
      title: 'Member Event Pro',
      start_time: new Date().toISOString(),
      created_by: user2.user.id,
    });

    if (errorB) {
      console.log('PASSED: User 2 was blocked from creating event in Pro trip:', errorB.message);
    } else {
      console.error('FAILED: User 2 was ABLE to create event in Pro trip!');
    }

    // Case C: Pro Trip - Admin (User 1) creates Event -> SUCCESS
    console.log('Test Case C: Pro Trip - Admin creates Event (Expect SUCCESS)');
    const { error: errorC } = await clientUser1.from('trip_events').insert({
      trip_id: tripIdPro,
      title: 'Admin Event Pro',
      start_time: new Date().toISOString(),
      created_by: user1.user.id,
    });

    if (errorC) {
      console.error('FAILED: User 1 (Admin) could not create event in Pro trip:', errorC);
    } else {
      console.log('PASSED: User 1 (Admin) created event in Pro trip.');
    }

    // Case D: Role Escalation - Member (User 2) tries to update own role -> FAILURE
    console.log('Test Case D: Role Escalation - Member tries to update own role (Expect FAILURE)');
    const { error: errorD } = await clientUser2
      .from('trip_members')
      .update({ role: 'admin' })
      .eq('trip_id', tripIdPro)
      .eq('user_id', user2.user.id);

    if (errorD) {
      console.log('PASSED: User 2 was blocked from updating own role:', errorD.message);
    } else {
      console.error('FAILED: User 2 was ABLE to update own role!');
    }

    // Case E: IDOR - Member of Consumer Trip tries to create event in Pro Trip (where they are NOT a member)
    // Create a 3rd user who is NOT in Pro Trip
    const user3Email = `test.user3.${randomUUID()}@example.com`;
    await supabaseAdmin.auth.admin.createUser({
      email: user3Email,
      password: password,
      email_confirm: true,
    });
    const { data: session3 } = await supabaseAdmin.auth.signInWithPassword({
      email: user3Email,
      password: password,
    });
    const clientUser3 = createClient(
      SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      {
        global: { headers: { Authorization: `Bearer ${session3.session?.access_token}` } },
      },
    );

    console.log('Test Case E: IDOR - Non-member tries to create event (Expect FAILURE)');
    const { error: errorE } = await clientUser3.from('trip_events').insert({
      trip_id: tripIdPro,
      title: 'IDOR Event',
      start_time: new Date().toISOString(),
      created_by: session3.user?.id,
    });

    if (errorE) {
      console.log('PASSED: Non-member was blocked from creating event:', errorE.message);
    } else {
      console.error('FAILED: Non-member was ABLE to create event!');
    }

    // Cleanup
    console.log('Cleaning up...');
    await supabaseAdmin.from('trips').delete().eq('id', tripIdConsumer);
    await supabaseAdmin.from('trips').delete().eq('id', tripIdPro);
    await supabaseAdmin.auth.admin.deleteUser(user1.user.id);
    await supabaseAdmin.auth.admin.deleteUser(user2.user.id);
    if (session3.user) await supabaseAdmin.auth.admin.deleteUser(session3.user.id);
  } catch (err) {
    console.error('Verification failed with error:', err);
  }
}

runVerification();
