#!/usr/bin/env tsx

/**
 * AI Concierge Diagnostic Script
 *
 * This script helps diagnose issues with the AI Concierge setup.
 * Run it to check configuration, connectivity, and identify potential problems.
 *
 * Usage:
 *   npx tsx scripts/diagnose-ai-concierge.ts
 */

import { createClient } from '@supabase/supabase-js';

interface DiagnosticResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

function addResult(check: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
  results.push({ check, status, message, details });
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('AI CONCIERGE DIAGNOSTIC REPORT');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.check}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  });

  console.log('='.repeat(80));
  console.log(`Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    console.log('🔧 ACTION REQUIRED:');
    results.filter(r => r.status === 'fail').forEach(result => {
      console.log(`   - ${result.check}: ${result.message}`);
    });
    console.log('');
  }

  if (warnings > 0) {
    console.log('⚠️  WARNINGS:');
    results.filter(r => r.status === 'warning').forEach(result => {
      console.log(`   - ${result.check}: ${result.message}`);
    });
    console.log('');
  }
}

async function runDiagnostics() {
  console.log('Starting AI Concierge diagnostics...\n');

  // Check 1: Environment Variables
  console.log('Checking environment variables...');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    addResult(
      'Environment Variables',
      'fail',
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables',
      { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey }
    );
    printResults();
    return;
  }

  addResult(
    'Environment Variables',
    'pass',
    'Supabase environment variables are configured'
  );

  // Check 2: Supabase Connection
  console.log('Testing Supabase connection...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { error } = await supabase.from('trips').select('id').limit(1);
    if (error && error.message !== 'JWT expired') {
      throw error;
    }
    addResult(
      'Supabase Connection',
      'pass',
      'Successfully connected to Supabase'
    );
  } catch (error: any) {
    addResult(
      'Supabase Connection',
      'fail',
      `Failed to connect to Supabase: ${error.message}`
    );
  }

  // Check 3: Edge Function Availability
  console.log('Checking edge function availability...');
  try {
    const { data, error } = await supabase.functions.invoke('lovable-concierge', {
      body: {
        message: 'diagnostic test',
        isDemoMode: true
      }
    });

    if (error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        addResult(
          'Edge Function Deployment',
          'fail',
          'lovable-concierge edge function is not deployed or not accessible',
          { error: error.message }
        );
      } else {
        addResult(
          'Edge Function Deployment',
          'warning',
          `Edge function is deployed but returned an error: ${error.message}`,
          { error: error.message }
        );
      }
    } else if (data) {
      if (data.error === 'missing_api_key') {
        addResult(
          'Edge Function Deployment',
          'fail',
          'LOVABLE_API_KEY is not configured in Supabase edge function secrets',
          {
            solution: 'Configure LOVABLE_API_KEY in Supabase Dashboard > Edge Functions > Secrets'
          }
        );
      } else if (data.error === 'invalid_api_key') {
        addResult(
          'Edge Function Deployment',
          'fail',
          'LOVABLE_API_KEY is invalid or expired',
          {
            solution: 'Verify and update LOVABLE_API_KEY in Supabase edge function secrets'
          }
        );
      } else if (data.success) {
        addResult(
          'Edge Function Deployment',
          'pass',
          'lovable-concierge edge function is deployed and responding'
        );
      } else {
        addResult(
          'Edge Function Deployment',
          'warning',
          `Edge function responded but indicated an issue: ${data.error || 'unknown'}`,
          { data }
        );
      }
    }
  } catch (error: any) {
    addResult(
      'Edge Function Deployment',
      'fail',
      `Error testing edge function: ${error.message}`,
      { error: error.message }
    );
  }

  // Check 4: Database Tables
  console.log('Checking database tables...');
  const requiredTables = [
    'trips',
    'trip_members',
    'trip_chat_messages',
    'trip_events',
    'trip_tasks',
    'trip_polls',
    'concierge_usage'
  ];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('not found')) {
          addResult(
            `Database Table: ${table}`,
            'fail',
            `Table '${table}' does not exist`,
            { solution: 'Run database migrations' }
          );
        } else {
          addResult(
            `Database Table: ${table}`,
            'warning',
            `Table '${table}' exists but query failed: ${error.message}`
          );
        }
      } else {
        addResult(
          `Database Table: ${table}`,
          'pass',
          `Table '${table}' is accessible`
        );
      }
    } catch (error: any) {
      addResult(
        `Database Table: ${table}`,
        'fail',
        `Error checking table '${table}': ${error.message}`
      );
    }
  }

  // Check 5: Context Builder Dependencies
  console.log('Checking context builder dependencies...');
  const contextTables = [
    'trip_files',
    'trip_links',
    'trip_places',
    'trip_payment_messages'
  ];

  let missingContextTables = 0;
  for (const table of contextTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error && (error.message.includes('does not exist') || error.message.includes('not found'))) {
        missingContextTables++;
      }
    } catch (error) {
      missingContextTables++;
    }
  }

  if (missingContextTables === 0) {
    addResult(
      'Context Builder Tables',
      'pass',
      'All context builder tables are available'
    );
  } else if (missingContextTables < contextTables.length) {
    addResult(
      'Context Builder Tables',
      'warning',
      `${missingContextTables} of ${contextTables.length} context tables are missing`,
      { note: 'AI Concierge will work with limited context' }
    );
  } else {
    addResult(
      'Context Builder Tables',
      'fail',
      'None of the context builder tables are available',
      { solution: 'Run database migrations to create missing tables' }
    );
  }

  printResults();

  // Recommendations
  console.log('💡 RECOMMENDATIONS:\n');
  console.log('1. If LOVABLE_API_KEY is missing:');
  console.log('   - Go to https://lovable.dev to get your API key');
  console.log('   - Add it to Supabase: Dashboard > Edge Functions > Secrets > LOVABLE_API_KEY\n');

  console.log('2. If edge function is not deployed:');
  console.log('   - Run: supabase functions deploy lovable-concierge\n');

  console.log('3. If database tables are missing:');
  console.log('   - Run: supabase db push\n');

  console.log('4. For more help, see:');
  console.log('   - docs/AI_CONCIERGE_SETUP.md');
  console.log('   - docs/AI_CONCIERGE_ADVANCED.md\n');
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('Diagnostic script failed:', error);
  process.exit(1);
});
