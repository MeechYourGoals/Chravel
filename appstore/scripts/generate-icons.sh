#!/bin/bash

# =============================================================================
# iOS App Icon Generator Script
# Generates all required iOS app icon sizes from a 1024x1024 master icon
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SOURCE_ICON="${1:-$PROJECT_ROOT/public/chravel-logo.png}"
OUTPUT_DIR="${2:-$PROJECT_ROOT/appstore/icons}"
IOS_ASSETS_DIR="$PROJECT_ROOT/ios/App/App/Assets.xcassets/AppIcon.appiconset"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "  Chravel iOS App Icon Generator"
echo "============================================"
echo ""

# Check for ImageMagick
if ! command -v convert &> /dev/null; then
    echo -e "${RED}Error: ImageMagick is not installed.${NC}"
    echo "Install with: brew install imagemagick"
    exit 1
fi

# Check for source icon
if [ ! -f "$SOURCE_ICON" ]; then
    echo -e "${RED}Error: Source icon not found at $SOURCE_ICON${NC}"
    echo ""
    echo "Please provide a 1024x1024 PNG icon as the first argument:"
    echo "  ./generate-icons.sh /path/to/icon-1024.png"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}Source icon:${NC} $SOURCE_ICON"
echo -e "${YELLOW}Output directory:${NC} $OUTPUT_DIR"
echo ""

# iOS App Icon sizes (all required sizes for App Store and device)
# Format: size@scale (actual pixel size)
declare -a IOS_SIZES=(
    "20@1x"    # 20pt - Notification icon (iPad)
    "20@2x"    # 40pt - Notification icon (iPhone, iPad)
    "20@3x"    # 60pt - Notification icon (iPhone)
    "29@1x"    # 29pt - Settings icon (iPad)
    "29@2x"    # 58pt - Settings icon (iPhone, iPad)
    "29@3x"    # 87pt - Settings icon (iPhone)
    "40@1x"    # 40pt - Spotlight icon (iPad)
    "40@2x"    # 80pt - Spotlight icon (iPhone, iPad)
    "40@3x"    # 120pt - Spotlight icon (iPhone)
    "60@2x"    # 120pt - App icon (iPhone)
    "60@3x"    # 180pt - App icon (iPhone)
    "76@1x"    # 76pt - App icon (iPad)
    "76@2x"    # 152pt - App icon (iPad)
    "83.5@2x"  # 167pt - App icon (iPad Pro)
    "1024@1x"  # 1024pt - App Store icon
)

echo "Generating iOS app icons..."
echo ""

# First, create a clean 1024x1024 version (no transparency for App Store)
echo -e "${GREEN}Creating App Store icon (1024x1024)...${NC}"
convert "$SOURCE_ICON" \
    -resize 1024x1024 \
    -background white \
    -flatten \
    "$OUTPUT_DIR/icon-1024.png"

# Generate each size
for SIZE_SCALE in "${IOS_SIZES[@]}"; do
    SIZE="${SIZE_SCALE%@*}"
    SCALE="${SIZE_SCALE#*@}"
    SCALE_NUM="${SCALE%x}"

    # Calculate actual pixel size
    PIXELS=$(echo "$SIZE * $SCALE_NUM" | bc | cut -d. -f1)

    FILENAME="icon-${SIZE}@${SCALE}.png"

    echo -e "  ${GREEN}✓${NC} Generating $FILENAME (${PIXELS}x${PIXELS}px)"

    convert "$SOURCE_ICON" \
        -resize "${PIXELS}x${PIXELS}" \
        -background white \
        -flatten \
        "$OUTPUT_DIR/$FILENAME"
done

echo ""
echo "============================================"
echo "  Generating Contents.json for Xcode"
echo "============================================"

# Generate Contents.json for Xcode asset catalog
cat > "$OUTPUT_DIR/Contents.json" << 'EOF'
{
  "images": [
    {
      "filename": "icon-20@2x.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "20x20"
    },
    {
      "filename": "icon-20@3x.png",
      "idiom": "iphone",
      "scale": "3x",
      "size": "20x20"
    },
    {
      "filename": "icon-29@2x.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "29x29"
    },
    {
      "filename": "icon-29@3x.png",
      "idiom": "iphone",
      "scale": "3x",
      "size": "29x29"
    },
    {
      "filename": "icon-40@2x.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "40x40"
    },
    {
      "filename": "icon-40@3x.png",
      "idiom": "iphone",
      "scale": "3x",
      "size": "40x40"
    },
    {
      "filename": "icon-60@2x.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "60x60"
    },
    {
      "filename": "icon-60@3x.png",
      "idiom": "iphone",
      "scale": "3x",
      "size": "60x60"
    },
    {
      "filename": "icon-20@1x.png",
      "idiom": "ipad",
      "scale": "1x",
      "size": "20x20"
    },
    {
      "filename": "icon-20@2x.png",
      "idiom": "ipad",
      "scale": "2x",
      "size": "20x20"
    },
    {
      "filename": "icon-29@1x.png",
      "idiom": "ipad",
      "scale": "1x",
      "size": "29x29"
    },
    {
      "filename": "icon-29@2x.png",
      "idiom": "ipad",
      "scale": "2x",
      "size": "29x29"
    },
    {
      "filename": "icon-40@1x.png",
      "idiom": "ipad",
      "scale": "1x",
      "size": "40x40"
    },
    {
      "filename": "icon-40@2x.png",
      "idiom": "ipad",
      "scale": "2x",
      "size": "40x40"
    },
    {
      "filename": "icon-76@1x.png",
      "idiom": "ipad",
      "scale": "1x",
      "size": "76x76"
    },
    {
      "filename": "icon-76@2x.png",
      "idiom": "ipad",
      "scale": "2x",
      "size": "76x76"
    },
    {
      "filename": "icon-83.5@2x.png",
      "idiom": "ipad",
      "scale": "2x",
      "size": "83.5x83.5"
    },
    {
      "filename": "icon-1024.png",
      "idiom": "ios-marketing",
      "scale": "1x",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
EOF

echo -e "${GREEN}✓${NC} Created Contents.json"

# Copy to Xcode project if it exists
if [ -d "$IOS_ASSETS_DIR" ]; then
    echo ""
    echo "============================================"
    echo "  Copying to Xcode Project"
    echo "============================================"

    cp "$OUTPUT_DIR"/*.png "$IOS_ASSETS_DIR/"
    cp "$OUTPUT_DIR/Contents.json" "$IOS_ASSETS_DIR/"

    echo -e "${GREEN}✓${NC} Copied icons to $IOS_ASSETS_DIR"
else
    echo ""
    echo -e "${YELLOW}Note:${NC} iOS project directory not found at:"
    echo "  $IOS_ASSETS_DIR"
    echo ""
    echo "To use these icons, copy the contents of $OUTPUT_DIR"
    echo "to your Xcode project's AppIcon.appiconset folder."
fi

echo ""
echo "============================================"
echo "  Icon Generation Complete!"
echo "============================================"
echo ""
echo "Generated icons:"
ls -la "$OUTPUT_DIR"/*.png | wc -l | xargs echo "  Total:"
echo ""
echo -e "${GREEN}All icons generated successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Open Xcode project"
echo "  2. Navigate to Assets.xcassets > AppIcon"
echo "  3. Verify all icons are correctly placed"
echo "  4. Build and run to test"
