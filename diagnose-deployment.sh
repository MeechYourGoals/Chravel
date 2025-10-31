#!/bin/bash

# Chravel Deployment Diagnostic Script
# Helps identify why Lovable changes aren't appearing on travelapp.com

set -e

echo "======================================"
echo "Chravel Deployment Diagnostic Tool"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check 1: Git status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Checking Git Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_COMMIT_SHORT=$(git rev-parse --short HEAD)

echo "Current branch: ${GREEN}${CURRENT_BRANCH}${NC}"
echo "Current commit: ${GREEN}${CURRENT_COMMIT_SHORT}${NC}"
echo "Full commit SHA: ${CURRENT_COMMIT}"
echo ""

# Check if main branch exists
if git rev-parse main >/dev/null 2>&1; then
    MAIN_COMMIT=$(git rev-parse main)
    MAIN_COMMIT_SHORT=$(git rev-parse --short main)
    echo "Main branch commit: ${GREEN}${MAIN_COMMIT_SHORT}${NC}"

    if [ "$CURRENT_COMMIT" = "$MAIN_COMMIT" ]; then
        echo -e "${GREEN}✓ Current branch is up to date with main${NC}"
    else
        echo -e "${YELLOW}⚠ Current branch differs from main${NC}"
        echo "  Commits ahead: $(git rev-list --count main..HEAD)"
        echo "  Commits behind: $(git rev-list --count HEAD..main)"
    fi
else
    echo -e "${YELLOW}⚠ Main branch not found locally${NC}"
fi
echo ""

# Check for uncommitted changes
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✓ No uncommitted changes${NC}"
else
    echo -e "${YELLOW}⚠ You have uncommitted changes:${NC}"
    git status --short
fi
echo ""

# Check 2: Deployment configuration files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking Deployment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HAS_VERCEL=false
HAS_NETLIFY=false

if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✓ Found vercel.json${NC}"
    HAS_VERCEL=true
else
    echo -e "${YELLOW}✗ No vercel.json found${NC}"
fi

if [ -f "netlify.toml" ]; then
    echo -e "${GREEN}✓ Found netlify.toml${NC}"
    HAS_NETLIFY=true
else
    echo -e "${YELLOW}✗ No netlify.toml found${NC}"
fi

if [ -d ".vercel" ]; then
    echo -e "${GREEN}✓ Found .vercel directory (Vercel project linked)${NC}"
    HAS_VERCEL=true
else
    echo -e "${YELLOW}✗ No .vercel directory${NC}"
fi

if [ -d ".netlify" ]; then
    echo -e "${GREEN}✓ Found .netlify directory (Netlify project linked)${NC}"
    HAS_NETLIFY=true
else
    echo -e "${YELLOW}✗ No .netlify directory${NC}"
fi

echo ""

# Check 3: GitHub Actions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking CI/CD Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f ".github/workflows/ci.yml" ]; then
    echo -e "${GREEN}✓ Found CI workflow${NC}"
    if grep -q "deploy" .github/workflows/ci.yml; then
        echo -e "${GREEN}✓ CI workflow includes deployment${NC}"
    else
        echo -e "${YELLOW}⚠ CI workflow validates but doesn't deploy${NC}"
    fi
else
    echo -e "${YELLOW}✗ No CI workflow found${NC}"
fi

if [ -f ".github/workflows/deploy.yml" ]; then
    echo -e "${GREEN}✓ Found deployment workflow${NC}"
else
    echo -e "${YELLOW}✗ No deployment workflow found${NC}"
fi

echo ""

# Check 4: Environment configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Checking Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f ".env.production.example" ]; then
    echo -e "${GREEN}✓ Found .env.production.example${NC}"
    echo "  Required environment variables:"
    grep -E "^[A-Z_]+=" .env.production.example | cut -d= -f1 | sed 's/^/    - /'
else
    echo -e "${YELLOW}✗ No .env.production.example${NC}"
fi

echo ""

# Check 5: Build test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Testing Local Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules not found - installing dependencies...${NC}"
    npm install
fi

echo "Running build test..."
if npm run build > /tmp/chravel-build.log 2>&1; then
    echo -e "${GREEN}✓ Build succeeded${NC}"

    if [ -d "dist" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        echo "  Build output: ${DIST_SIZE}"
        echo "  Files in dist/:"
        ls -lh dist/ | grep -v "^total" | awk '{print "    " $9 " (" $5 ")"}'
    fi
else
    echo -e "${RED}✗ Build failed${NC}"
    echo "  Check /tmp/chravel-build.log for details"
    echo "  Last 10 lines:"
    tail -10 /tmp/chravel-build.log | sed 's/^/    /'
fi

echo ""

# Check 6: Domain DNS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Checking Domain DNS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DOMAIN="travelapp.com"

if command -v dig >/dev/null 2>&1; then
    echo "DNS records for ${DOMAIN}:"
    dig +short $DOMAIN A | sed 's/^/  A:     /'
    dig +short $DOMAIN CNAME | sed 's/^/  CNAME: /'
else
    echo -e "${YELLOW}⚠ 'dig' command not found - skipping DNS check${NC}"
    if command -v nslookup >/dev/null 2>&1; then
        echo "Using nslookup instead:"
        nslookup $DOMAIN | grep -A2 "Name:" | sed 's/^/  /'
    fi
fi

echo ""

# Check 7: Production endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Checking Production Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v curl >/dev/null 2>&1; then
    echo "Checking https://${DOMAIN}..."

    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN} || echo "000")

    if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ Site is reachable (HTTP $HTTP_STATUS)${NC}"

        # Try to get build info
        echo ""
        echo "Checking /healthz endpoint..."
        HEALTHZ=$(curl -s https://${DOMAIN}/healthz 2>/dev/null || echo "")

        if [ -n "$HEALTHZ" ]; then
            echo -e "${GREEN}✓ Health endpoint found${NC}"
            echo "  Response:"
            echo "$HEALTHZ" | jq '.' 2>/dev/null | sed 's/^/    /' || echo "$HEALTHZ" | sed 's/^/    /'
        else
            echo -e "${YELLOW}⚠ /healthz endpoint not found${NC}"
            echo "  (This is expected if the BuildBadge feature isn't deployed)"
        fi
    else
        echo -e "${RED}✗ Site returned HTTP $HTTP_STATUS${NC}"
    fi

    # Check response headers
    echo ""
    echo "Server headers:"
    curl -s -I https://${DOMAIN} 2>/dev/null | grep -iE "^(server|x-vercel|x-netlify|x-lovable)" | sed 's/^/  /'

else
    echo -e "${YELLOW}⚠ 'curl' command not found - skipping HTTP check${NC}"
fi

echo ""

# Summary and recommendations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary & Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PLATFORM="unknown"

# Detect platform from headers
if command -v curl >/dev/null 2>&1; then
    HEADERS=$(curl -s -I https://${DOMAIN} 2>/dev/null || echo "")

    if echo "$HEADERS" | grep -qi "x-vercel"; then
        PLATFORM="vercel"
        echo -e "${GREEN}Detected platform: Vercel${NC}"
    elif echo "$HEADERS" | grep -qi "netlify"; then
        PLATFORM="netlify"
        echo -e "${GREEN}Detected platform: Netlify${NC}"
    elif echo "$HEADERS" | grep -qi "lovable"; then
        PLATFORM="lovable"
        echo -e "${GREEN}Detected platform: Lovable${NC}"
    fi
fi

if [ "$PLATFORM" = "unknown" ]; then
    if [ "$HAS_VERCEL" = true ]; then
        PLATFORM="vercel"
        echo -e "${YELLOW}Likely platform: Vercel (based on local config)${NC}"
    elif [ "$HAS_NETLIFY" = true ]; then
        PLATFORM="netlify"
        echo -e "${YELLOW}Likely platform: Netlify (based on local config)${NC}"
    else
        PLATFORM="lovable"
        echo -e "${YELLOW}Likely platform: Lovable (default)${NC}"
    fi
fi

echo ""
echo "Recommended next steps:"
echo ""

case "$PLATFORM" in
    vercel)
        echo "1. Go to https://vercel.com/dashboard"
        echo "2. Find your Chravel project"
        echo "3. Check latest deployment status"
        echo "4. If not deployed, click 'Redeploy'"
        echo "5. Verify environment variables are set"
        echo ""
        echo "OR set up auto-deploy:"
        echo "1. Vercel → Project → Settings → Git"
        echo "2. Enable 'Production Branch: main'"
        echo "3. Enable 'Deploy on push'"
        ;;
    netlify)
        echo "1. Go to https://app.netlify.com"
        echo "2. Find your Chravel site"
        echo "3. Check latest deployment"
        echo "4. If not deployed, click 'Trigger deploy'"
        echo "5. Verify environment variables are set"
        echo ""
        echo "OR set up auto-deploy:"
        echo "1. Netlify → Site Settings → Build & Deploy"
        echo "2. Enable 'Automatic deploys on push'"
        ;;
    lovable)
        echo "1. Go to: https://lovable.dev/projects/20feaa04-0946-4c68-a68d-0eb88cc1b9c4"
        echo "2. Click 'Share' → 'Publish'"
        echo "3. Wait 2-5 minutes for deployment"
        echo "4. Clear browser cache"
        echo "5. Visit https://travelapp.com"
        echo ""
        echo "To verify custom domain is connected:"
        echo "1. Lovable → Project → Settings → Domains"
        echo "2. Check if 'travelapp.com' is listed"
        echo "3. Verify status is 'Active'"
        ;;
esac

echo ""
echo "For detailed troubleshooting guide, see:"
echo "  ${GREEN}LOVABLE_DEPLOYMENT_ANALYSIS.md${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Diagnostic Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save report
REPORT_FILE="/tmp/chravel-diagnostic-$(date +%Y%m%d-%H%M%S).txt"
echo "Report saved to: ${REPORT_FILE}"
echo ""

# Create report
{
    echo "Chravel Deployment Diagnostic Report"
    echo "Generated: $(date)"
    echo "========================================"
    echo ""
    echo "Git Status:"
    echo "  Branch: $CURRENT_BRANCH"
    echo "  Commit: $CURRENT_COMMIT_SHORT"
    echo ""
    echo "Detected Platform: $PLATFORM"
    echo ""
    echo "Configuration Files:"
    echo "  vercel.json: $([ -f vercel.json ] && echo 'Yes' || echo 'No')"
    echo "  netlify.toml: $([ -f netlify.toml ] && echo 'Yes' || echo 'No')"
    echo "  .github/workflows/deploy.yml: $([ -f .github/workflows/deploy.yml ] && echo 'Yes' || echo 'No')"
    echo ""
    echo "Domain: $DOMAIN"
    echo "  HTTP Status: $HTTP_STATUS"
    echo ""
} > "$REPORT_FILE"

echo "Next: Review the recommendations above and follow the appropriate steps."
echo ""
