#!/bin/bash

# Batch update script to replace all Unsplash avatar URLs with getMockAvatar() calls
# This updates consumer trips, pro trips, and events mock data

echo "🔄 Starting avatar URL replacement..."

# Function to extract name and replace avatar URL
replace_avatars() {
  local file=$1
  echo "Processing: $file"
  
  # Use sed to replace avatar URLs with getMockAvatar calls
  # Pattern: { id: X, name: 'Name', avatar: 'https://images.unsplash.com/...' }
  sed -i.bak -E "s|(\{ id: [0-9]+, name: '[^']+'), avatar: 'https://images\.unsplash\.com/[^']+|\1, avatar: getMockAvatar('\2|g" "$file"
  
  # More precise replacement with name extraction
  perl -i.bak -pe 's/\{ id: (\d+), name: '\''([^'\'']+)'\'',[^\}]*avatar: '\''https:\/\/images\.unsplash\.com\/[^'\'']+/{ id: $1, name: '\''$2'\'', avatar: getMockAvatar('\''$2'\'')/g' "$file"
}

# Update all data files
for file in src/data/tripsData.ts src/data/eventsMockData.ts src/data/pro-trips/*.ts; do
  if [ -f "$file" ]; then
    replace_avatars "$file"
  fi
done

echo "✅ Avatar URL replacement complete!"
echo "📝 Backup files created with .bak extension"
echo "🧹 Run 'rm src/data/**/*.bak' to clean up backup files"
