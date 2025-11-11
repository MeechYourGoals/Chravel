#!/bin/bash
# generate-screenshots.sh
# Helper script to generate App Store screenshots using iOS Simulator
# Requires: Xcode Command Line Tools, fastlane (optional but recommended)

set -e

echo "📸 Chravel App Store Screenshot Generator"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Device configurations for required screenshots
declare -A DEVICES=(
    ["iPhone 15 Pro Max"]="6.7\" (1290 × 2796)"
    ["iPhone 14 Plus"]="6.7\" (1290 × 2796)"
    ["iPhone 8 Plus"]="5.5\" (1242 × 2208)"
    ["iPad Pro (12.9-inch)"]="12.9\" (2048 × 2732)"
    ["iPad Pro (11-inch)"]="11\" (1668 × 2388)"
)

# Required screenshots per device
SCREENSHOTS=(
    "Home Dashboard - Show active trips grid"
    "Trip Chat - Demonstrate real-time messaging"
    "Calendar View - Display organized itinerary"
    "Budget Tracker - Show expense splitting"
    "AI Concierge - Feature AI recommendations"
)

echo "📱 Required Device Sizes:"
for device in "${!DEVICES[@]}"; do
    echo "  • $device: ${DEVICES[$device]}"
done
echo ""

echo "📋 Required Screenshots (5 per device):"
for i in "${!SCREENSHOTS[@]}"; do
    echo "  $((i+1)). ${SCREENSHOTS[$i]}"
done
echo ""

# Check if fastlane is installed
if command -v fastlane &> /dev/null; then
    echo -e "${GREEN}✓${NC} fastlane detected - using fastlane snapshot"
    USE_FASTLANE=true
else
    echo -e "${YELLOW}⚠${NC} fastlane not found - manual screenshot process"
    USE_FASTLANE=false
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Xcode Command Line Tools not found"
    echo "Install with: xcode-select --install"
    exit 1
fi

echo ""
echo "📝 Instructions:"
echo "================"
echo ""
echo "OPTION 1: Using iOS Simulator (Manual)"
echo "----------------------------------------"
echo "1. Open Xcode → Window → Devices and Simulators"
echo "2. Boot simulator for each device size:"
for device in "${!DEVICES[@]}"; do
    echo "   • $device"
done
echo "3. Install app: xcrun simctl boot <device-id>"
echo "4. Install app: xcrun simctl install booted <path-to-app>"
echo "5. Launch app and navigate to each screen"
echo "6. Take screenshot: Cmd+S or Device → Screenshot"
echo "7. Screenshots saved to: ~/Desktop/"
echo ""
echo "OPTION 2: Using fastlane snapshot (Automated)"
echo "-----------------------------------------------"
echo "1. Install fastlane: sudo gem install fastlane"
echo "2. Run: fastlane snapshot"
echo "3. Screenshots auto-generated from UI tests"
echo ""
echo "OPTION 3: Using Physical Devices"
echo "---------------------------------"
echo "1. Connect iPhone/iPad via USB"
echo "2. Open Xcode → Window → Devices and Simulators"
echo "3. Select device → Take Screenshot"
echo "4. Or use: xcrun simctl io booted screenshot <path>"
echo ""

# Create output directory structure
OUTPUT_DIR="ios/screenshots/app-store"
mkdir -p "$OUTPUT_DIR"

echo "📁 Screenshot organization:"
echo "   $OUTPUT_DIR/"
echo "   ├── 6.7-inch/"
echo "   │   ├── 1-home-dashboard.png"
echo "   │   ├── 2-trip-chat.png"
echo "   │   ├── 3-calendar-view.png"
echo "   │   ├── 4-budget-tracker.png"
echo "   │   └── 5-ai-concierge.png"
echo "   ├── 5.5-inch/"
echo "   │   └── [same structure]"
echo "   └── ipad/"
echo "       └── [same structure]"
echo ""

echo "✅ Next Steps:"
echo "=============="
echo "1. Generate screenshots using one of the methods above"
echo "2. Organize screenshots into the directory structure shown"
echo "3. Upload to App Store Connect → App Store → Screenshots"
echo "4. Ensure all required sizes are included"
echo ""

# Create Snapshotfile for fastlane (if fastlane is available)
if [ "$USE_FASTLANE" = true ]; then
    cat > ios/Snapshotfile << 'EOF'
# Snapshotfile for Chravel App Store Screenshots

devices([
  "iPhone 15 Pro Max",
  "iPhone 14 Plus", 
  "iPhone 8 Plus",
  "iPad Pro (12.9-inch)",
  "iPad Pro (11-inch)"
])

languages([
  "en-US"
])

scheme("App")

output_directory("./screenshots")

clear_previous_screenshots(true)

stop_after_first_error(false)

EOF
    echo -e "${GREEN}✓${NC} Created Snapshotfile for fastlane"
fi

echo ""
echo "📚 Reference:"
echo "   • App Store Connect: https://appstoreconnect.apple.com"
echo "   • Screenshot Requirements: https://developer.apple.com/app-store/product-page/"
echo ""
