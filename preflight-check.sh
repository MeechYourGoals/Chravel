#!/bin/bash

# 🔍 Chravel iOS Pre-flight Check
# Validates all requirements before deployment

echo "🔍 Running pre-flight checks for iOS deployment..."
echo ""

ERRORS=0
WARNINGS=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check 1: macOS
echo "${BLUE}Checking system...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✅ Running on macOS"
else
    echo "${RED}❌ Not running on macOS${NC}"
    echo "   iOS deployment requires macOS with Xcode"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Xcode
if command -v xcodebuild &> /dev/null; then
    XCODE_VERSION=$(xcodebuild -version | head -n1)
    echo "✅ Xcode found: $XCODE_VERSION"
else
    echo "${RED}❌ Xcode not found${NC}"
    echo "   Install from: https://apps.apple.com/us/app/xcode/id497799835"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Node.js
echo ""
echo "${BLUE}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"

    # Check if version is 18+
    NODE_MAJOR=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo "${YELLOW}⚠️  Node.js version is below 18 (recommended)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "${RED}❌ Node.js not found${NC}"
    echo "   Install from: https://nodejs.org/"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm found: v$NPM_VERSION"
else
    echo "${RED}❌ npm not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 5: Project structure
echo ""
echo "${BLUE}Checking project structure...${NC}"

if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "${RED}❌ package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "capacitor.config.ts" ]; then
    echo "✅ capacitor.config.ts found"

    # Check if server URL is commented out (production mode)
    if grep -q "^[[:space:]]*server:" capacitor.config.ts; then
        echo "${YELLOW}⚠️  Development server URL is active${NC}"
        echo "   For production build, this should be commented out"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "✅ Production mode (server URL disabled)"
    fi
else
    echo "${RED}❌ capacitor.config.ts not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "ios/App" ]; then
    echo "✅ iOS project folder found"
else
    echo "${RED}❌ iOS project not found${NC}"
    echo "   Run: npx cap add ios"
    ERRORS=$((ERRORS + 1))
fi

# Check 6: iOS configuration
if [ -f "ios/App/App/Info.plist" ]; then
    echo "✅ Info.plist found"

    # Check for required permissions
    REQUIRED_PERMISSIONS=(
        "NSCameraUsageDescription"
        "NSPhotoLibraryUsageDescription"
        "NSLocationWhenInUseUsageDescription"
    )

    for PERM in "${REQUIRED_PERMISSIONS[@]}"; do
        if grep -q "$PERM" ios/App/App/Info.plist; then
            echo "  ✅ $PERM configured"
        else
            echo "${RED}  ❌ Missing permission: $PERM${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo "${YELLOW}⚠️  Info.plist not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 7: Dependencies
echo ""
echo "${BLUE}Checking dependencies...${NC}"

if [ -d "node_modules" ]; then
    echo "✅ node_modules found"
else
    echo "${YELLOW}⚠️  node_modules not found${NC}"
    echo "   Run: npm install"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 8: Capacitor CLI
if command -v cap &> /dev/null; then
    CAP_VERSION=$(cap --version)
    echo "✅ Capacitor CLI found: $CAP_VERSION"
else
    # Check if it's installed locally
    if [ -f "node_modules/.bin/cap" ]; then
        CAP_VERSION=$(./node_modules/.bin/cap --version)
        echo "✅ Capacitor CLI found (local): $CAP_VERSION"
    else
        echo "${YELLOW}⚠️  Capacitor CLI not found${NC}"
        echo "   Will use: npx cap"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 9: CocoaPods (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "${BLUE}Checking iOS dependencies...${NC}"

    if command -v pod &> /dev/null; then
        POD_VERSION=$(pod --version)
        echo "✅ CocoaPods found: $POD_VERSION"
    else
        echo "${YELLOW}⚠️  CocoaPods not found${NC}"
        echo "   Install: sudo gem install cocoapods"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check if pods are installed
    if [ -f "ios/App/Podfile.lock" ]; then
        echo "✅ iOS pods installed"
    else
        echo "${YELLOW}⚠️  iOS pods not installed${NC}"
        echo "   Run: cd ios/App && pod install"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "${GREEN}🎉 All checks passed! Ready to deploy.${NC}"
    echo ""
    echo "Next step: Run ./deploy-ios.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "${YELLOW}⚠️  Ready to deploy with $WARNINGS warning(s)${NC}"
    echo ""
    echo "You can proceed, but consider fixing warnings for best results."
    echo ""
    echo "Next step: Run ./deploy-ios.sh"
    exit 0
else
    echo "${RED}❌ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix errors before deploying."
    exit 1
fi
