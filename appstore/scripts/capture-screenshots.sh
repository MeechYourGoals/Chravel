#!/bin/bash

# =============================================================================
# iOS App Store Screenshot Capture Script
# Automates screenshot capture using Xcode Simulator
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
OUTPUT_DIR="${1:-$PROJECT_ROOT/appstore/screenshots}"
WORKSPACE="$PROJECT_ROOT/ios/App/App.xcworkspace"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "  Chravel iOS Screenshot Capture"
echo "============================================"
echo ""

# Device configurations for App Store
declare -A DEVICES=(
    ["6.7-inch"]="iPhone 15 Pro Max"
    ["6.5-inch"]="iPhone 14 Plus"
    ["5.5-inch"]="iPhone 8 Plus"
    ["ipad-12.9-inch"]="iPad Pro (12.9-inch) (6th generation)"
)

# Screenshot names and routes
declare -A SCREENSHOTS=(
    ["01-home-dashboard"]="/home"
    ["02-trip-detail-chat"]="/trip/demo-trip-1"
    ["03-calendar-itinerary"]="/trip/demo-trip-1/calendar"
    ["04-media-hub"]="/trip/demo-trip-1/media"
    ["05-expense-splitting"]="/trip/demo-trip-1/pay"
    ["06-ai-concierge"]="/trip/demo-trip-1/ai"
    ["07-map-places"]="/trip/demo-trip-1/map"
    ["08-team-management"]="/tour/pro/demo-pro-trip"
)

# Check for xcrun
if ! command -v xcrun &> /dev/null; then
    echo -e "${RED}Error: Xcode command line tools not installed.${NC}"
    echo "Install with: xcode-select --install"
    exit 1
fi

# Function to capture screenshot
capture_screenshot() {
    local device="$1"
    local name="$2"
    local route="$3"
    local device_dir="$OUTPUT_DIR/$device"

    mkdir -p "$device_dir"

    local filename="$device_dir/$name.png"

    echo -e "  ${BLUE}Capturing:${NC} $name for $device"

    # Take screenshot using simctl
    xcrun simctl io booted screenshot "$filename" 2>/dev/null || {
        echo -e "  ${YELLOW}Warning: Could not capture screenshot${NC}"
        return 1
    }

    echo -e "  ${GREEN}✓${NC} Saved: $filename"
}

# Function to boot simulator
boot_simulator() {
    local device_name="$1"

    echo -e "${YELLOW}Booting simulator: $device_name${NC}"

    # Get device UDID
    local udid=$(xcrun simctl list devices | grep "$device_name" | grep -v unavailable | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')

    if [ -z "$udid" ]; then
        echo -e "${RED}Error: Device '$device_name' not found${NC}"
        echo "Available devices:"
        xcrun simctl list devices | grep -E "iPhone|iPad"
        return 1
    fi

    # Boot the device
    xcrun simctl boot "$udid" 2>/dev/null || true

    # Wait for boot
    sleep 5

    echo -e "${GREEN}✓${NC} Simulator booted: $udid"
}

# Function to shutdown simulator
shutdown_simulator() {
    echo "Shutting down simulator..."
    xcrun simctl shutdown booted 2>/dev/null || true
}

# Main screenshot capture flow
echo "Screenshot capture options:"
echo "  1) Manual capture (interactive)"
echo "  2) Automated capture (requires running app)"
echo ""
read -p "Select option [1]: " option
option="${option:-1}"

if [ "$option" == "1" ]; then
    echo ""
    echo "============================================"
    echo "  Manual Screenshot Capture Guide"
    echo "============================================"
    echo ""
    echo "Follow these steps for each device size:"
    echo ""

    for device_size in "${!DEVICES[@]}"; do
        device_name="${DEVICES[$device_size]}"
        echo -e "${BLUE}Device: $device_size ($device_name)${NC}"

        for screenshot in "${!SCREENSHOTS[@]}"; do
            route="${SCREENSHOTS[$screenshot]}"
            echo "  - $screenshot: Navigate to $route"
        done
        echo ""
    done

    echo "Keyboard shortcuts in Simulator:"
    echo "  Cmd + S  - Take screenshot"
    echo "  Cmd + 1  - 100% scale (for accurate sizing)"
    echo ""
    echo "Screenshots will be saved to Desktop by default."
    echo "Move them to: $OUTPUT_DIR/{device-size}/"

elif [ "$option" == "2" ]; then
    echo ""
    echo "============================================"
    echo "  Automated Screenshot Capture"
    echo "============================================"
    echo ""
    echo -e "${YELLOW}Note: This requires the app to be running in demo mode.${NC}"
    echo ""

    # Capture for each device
    for device_size in "${!DEVICES[@]}"; do
        device_name="${DEVICES[$device_size]}"

        echo ""
        echo "============================================"
        echo "  Capturing: $device_size"
        echo "============================================"

        boot_simulator "$device_name"

        echo ""
        echo "Please manually navigate to each screen and press Enter to capture:"
        echo ""

        for screenshot in "${!SCREENSHOTS[@]}"; do
            route="${SCREENSHOTS[$screenshot]}"
            echo -e "${BLUE}Next: $screenshot${NC}"
            echo "Navigate to: $route"
            read -p "Press Enter when ready..."

            capture_screenshot "$device_size" "$screenshot" "$route"
            echo ""
        done

        shutdown_simulator
    done
fi

echo ""
echo "============================================"
echo "  Screenshot Capture Complete"
echo "============================================"
echo ""
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "Directory structure:"
find "$OUTPUT_DIR" -type f -name "*.png" 2>/dev/null | head -20 || echo "  No screenshots found yet"
echo ""
echo "Next steps:"
echo "  1. Review screenshots for quality"
echo "  2. Add text overlays if needed (see SCREENSHOT_GUIDE.md)"
echo "  3. Upload to App Store Connect"
