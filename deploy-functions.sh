#!/bin/bash
# Deploy Supabase Edge Functions
# This script deploys critical Edge Functions to Supabase

echo "🚀 Deploying Supabase Edge Functions..."

# Deploy create-trip function (CRITICAL - required for trip creation)
echo "📦 Deploying create-trip function..."
npx supabase functions deploy create-trip --project-ref jmjiyekmxwsxkfnqwyaa

# Check if deployment succeeded
if [ $? -eq 0 ]; then
  echo "✅ create-trip function deployed successfully!"
else
  echo "❌ Failed to deploy create-trip function"
  echo "Please deploy manually via Supabase Dashboard:"
  echo "1. Go to https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa/functions"
  echo "2. Click 'Deploy function'"
  echo "3. Select 'create-trip' from the list"
  exit 1
fi

echo "🎉 All functions deployed successfully!"
