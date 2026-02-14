#!/bin/bash

# Smoke Test for Notification Pipeline
# This script triggers a test notification for a user and verifies that
# delivery rows are created in the notification_deliveries table.

set -e

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check for required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
  echo "You can set them in a .env file or as environment variables."
  exit 1
fi

# Get user ID from argument or use a default if none provided
# In a real environment, you'd want to use a valid user ID.
USER_ID=$1

if [ -z "$USER_ID" ]; then
  echo "Fetching the first user from auth.users..."
  USER_ID=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_first_user_id" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" | tr -d '"')

  # If the RPC doesn't exist, try getting it via SQL if possible,
  # but since we're using REST, we'll try a direct query if enabled.
  if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
     USER_ID=$(curl -s "$SUPABASE_URL/rest/v1/profiles?select=user_id&limit=1" \
       -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
       -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" | grep -oE '[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}' | head -n 1)
  fi
fi

if [ -z "$USER_ID" ]; then
  echo "Error: No user found to send a test notification to."
  exit 1
fi

echo "Using User ID: $USER_ID"

# 1. Create a smoke test notification via RPC
echo "Step 1: Creating smoke test notification..."
NOTIF_ID=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/smoke_test_notification" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_user_id\": \"$USER_ID\"}" | tr -d '"')

if [ -z "$NOTIF_ID" ] || [ "$NOTIF_ID" == "null" ]; then
  echo "Error: Failed to create notification. Make sure the smoke_test_notification RPC is deployed."
  exit 1
fi

echo "Created Notification ID: $NOTIF_ID"

# 2. Check for delivery rows
echo "Step 2: Verifying delivery rows in notification_deliveries..."
# Wait a second for the trigger to fire
sleep 1

DELIVERIES=$(curl -s "$SUPABASE_URL/rest/v1/notification_deliveries?notification_id=eq.$NOTIF_ID" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")

COUNT=$(echo "$DELIVERIES" | grep -o "notification_id" | wc -l)

if [ "$COUNT" -gt 0 ]; then
  echo "Success! Found $COUNT delivery rows for the notification."
  if command -v jq &> /dev/null; then
    echo "$DELIVERIES" | jq '.'
  elif command -v python3 &> /dev/null; then
    echo "$DELIVERIES" | python3 -m json.tool
  else
    echo "$DELIVERIES"
  fi
else
  echo "Error: No delivery rows found for notification $NOTIF_ID."
  exit 1
fi

# 3. Trigger dispatch manually
echo "Step 3: Triggering manual dispatch..."
DISPATCH_RESULT=$(curl -s -X POST "$SUPABASE_URL/functions/v1/dispatch-notification-deliveries" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"notificationIds\": [\"$NOTIF_ID\"], \"dryRun\": true}")

echo "Dispatch Result (Dry Run):"
if command -v jq &> /dev/null; then
  echo "$DISPATCH_RESULT" | jq '.'
elif command -v python3 &> /dev/null; then
  echo "$DISPATCH_RESULT" | python3 -m json.tool
else
  echo "$DISPATCH_RESULT"
fi

echo ""
echo "Smoke test completed successfully (Pipeline checked up to delivery queuing)."
