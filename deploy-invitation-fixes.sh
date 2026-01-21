#!/bin/bash

# =====================================================
# DEPLOYMENT SCRIPT: Trip Invitation Bug Fixes
# =====================================================
# This script deploys all fixes for trip invitation bugs
# Run this ONLY after reviewing the changes and testing on staging
# =====================================================

set -e  # Exit on any error

echo "🚀 Starting deployment of trip invitation bug fixes..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =====================================================
# STEP 1: Pre-flight checks
# =====================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 1: Pre-flight Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first:${NC}"
    echo "   npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI is installed${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Are you in the project root?${NC}"
    exit 1
fi

echo -e "${GREEN}✓ In project root directory${NC}"

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20260121230000_fix_trip_invites_comprehensive.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Migration file found${NC}"

# Check if edge function exists
EDGE_FUNCTION_DIR="supabase/functions/generate-invite-code"
if [ ! -d "$EDGE_FUNCTION_DIR" ]; then
    echo -e "${RED}❌ Edge function directory not found: $EDGE_FUNCTION_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Edge function directory found${NC}"
echo ""

# =====================================================
# STEP 2: Confirm deployment
# =====================================================

echo -e "${YELLOW}⚠️  WARNING: This will modify your production database and deploy new code${NC}"
echo ""
echo "The following changes will be applied:"
echo "  1. Add foreign key constraint to trip_invites table"
echo "  2. Create performance indexes"
echo "  3. Update RLS policies"
echo "  4. Deploy new generate-invite-code edge function"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

# =====================================================
# STEP 3: Link to Supabase project (if not already linked)
# =====================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 2: Linking to Supabase Project${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if already linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "Please link to your Supabase project:"
    supabase link
else
    echo -e "${GREEN}✓ Already linked to Supabase project${NC}"
fi

echo ""

# =====================================================
# STEP 4: Deploy database migration
# =====================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 3: Deploying Database Migration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Running migration: $MIGRATION_FILE"
echo ""

# Get database connection string
read -p "Enter your Supabase database connection string (or press Enter to use supabase db push): " DB_URL

if [ -z "$DB_URL" ]; then
    # Use Supabase CLI to push migration
    echo "Deploying via Supabase CLI..."
    supabase db push
else
    # Use psql to run migration
    echo "Deploying via psql..."
    psql "$DB_URL" -f "$MIGRATION_FILE"
fi

echo ""
echo -e "${GREEN}✓ Database migration completed${NC}"
echo ""

# =====================================================
# STEP 5: Deploy edge function
# =====================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 4: Deploying Edge Function${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Deploying generate-invite-code function..."
supabase functions deploy generate-invite-code

echo ""
echo -e "${GREEN}✓ Edge function deployed${NC}"
echo ""

# =====================================================
# STEP 6: Verify deployment
# =====================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 5: Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Running post-deployment checks..."
echo ""

# Check if foreign key constraint was added
echo "Checking foreign key constraint..."
if [ ! -z "$DB_URL" ]; then
    HAS_FK=$(psql "$DB_URL" -t -c "SELECT 1 FROM pg_constraint WHERE conname = 'trip_invites_trip_id_fkey';" | xargs)

    if [ "$HAS_FK" = "1" ]; then
        echo -e "${GREEN}✓ Foreign key constraint exists${NC}"
    else
        echo -e "${RED}❌ Foreign key constraint not found${NC}"
    fi

    # Check for orphaned invites
    ORPHANED=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM trip_invites WHERE trip_id NOT IN (SELECT id FROM trips);" | xargs)

    if [ "$ORPHANED" = "0" ]; then
        echo -e "${GREEN}✓ No orphaned invites found${NC}"
    else
        echo -e "${YELLOW}⚠️  Found $ORPHANED orphaned invites (this is normal if migration just ran)${NC}"
    fi

    # Check indexes
    echo "Checking indexes..."
    psql "$DB_URL" -c "\d trip_invites" | grep -i index
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Next steps:"
echo "  1. Test invite generation: npm run test:invites (if you have tests)"
echo "  2. Monitor error rates in Supabase dashboard"
echo "  3. Check edge function logs for any issues"
echo "  4. Test end-to-end invitation flow manually"
echo ""
echo "See TRIP_INVITATION_BUGS_ANALYSIS.md for detailed testing checklist"
echo ""
