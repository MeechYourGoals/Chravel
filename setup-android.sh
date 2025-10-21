#!/bin/bash

# Chravel Android Platform Setup Script
# This script automates the Android platform setup for Capacitor

echo "🤖 Chravel Android Setup Script"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm found"

# Check if Android environment is set up
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME is not set. Please install Android Studio and set up environment variables."
    echo "   See ANDROID_CAPACITOR_GUIDE.md for instructions."
    exit 1
fi

echo "✅ Android SDK found at: $ANDROID_HOME"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Build the web app
echo "🔨 Building web assets..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Web build completed"

# Add Android platform if not already added
if [ ! -d "android" ]; then
    echo "📱 Adding Android platform..."
    npx cap add android
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to add Android platform"
        exit 1
    fi
    
    echo "✅ Android platform added"
else
    echo "✅ Android platform already exists"
fi

# Sync the project
echo "🔄 Syncing Android project..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Sync failed"
    exit 1
fi

echo "✅ Android project synced"

# Create local.properties if it doesn't exist
if [ ! -f "android/local.properties" ]; then
    echo "📝 Creating local.properties..."
    echo "sdk.dir=$ANDROID_HOME" > android/local.properties
    echo "✅ local.properties created"
fi

# Create keystore directory
if [ ! -d "android/keystore" ]; then
    mkdir -p android/keystore
    echo "📁 Created keystore directory"
fi

# Update Android Manifest with permissions
echo "📋 Updating Android permissions..."
MANIFEST_PATH="android/app/src/main/AndroidManifest.xml"

# Check if permissions are already added
if ! grep -q "android.permission.CAMERA" "$MANIFEST_PATH"; then
    # Add permissions before the <application> tag
    sed -i.bak '/<application/i\
    <!-- Chravel Required Permissions -->\
    <uses-permission android:name="android.permission.INTERNET" />\
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\
    <uses-permission android:name="android.permission.CAMERA" />\
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />\
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />\
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\
    <uses-permission android:name="android.permission.VIBRATE" />\
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />\
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />\
    ' "$MANIFEST_PATH"
    
    echo "✅ Permissions added to AndroidManifest.xml"
else
    echo "✅ Permissions already configured"
fi

# Create Android build scripts
echo "📝 Creating Android build scripts..."

# Create debug build script
cat > android/build-debug.sh << 'EOF'
#!/bin/bash
echo "Building debug APK..."
./gradlew assembleDebug
echo "Debug APK location: app/build/outputs/apk/debug/app-debug.apk"
EOF

# Create release build script
cat > android/build-release.sh << 'EOF'
#!/bin/bash
echo "Building release bundle..."
./gradlew bundleRelease
echo "Release bundle location: app/build/outputs/bundle/release/app-release.aab"
EOF

chmod +x android/build-debug.sh
chmod +x android/build-release.sh

echo "✅ Build scripts created"

# Create sample keystore properties template
cat > android/keystore.properties.example << 'EOF'
# Rename this file to keystore.properties and fill in your values
storeFile=../keystore/release-key.keystore
storePassword=your-store-password
keyAlias=chravel-key
keyPassword=your-key-password
EOF

echo "✅ Keystore properties template created"

# Final instructions
echo ""
echo "✨ Android setup complete! ✨"
echo ""
echo "Next steps:"
echo "1. Open Android Studio and import the 'android' folder"
echo "2. Or run: npx cap open android"
echo "3. Create an emulator or connect a device"
echo "4. Run the app from Android Studio"
echo ""
echo "For release builds:"
echo "1. Generate a keystore: keytool -genkey -v -keystore android/keystore/release-key.keystore -alias chravel-key -keyalg RSA -keysize 2048 -validity 10000"
echo "2. Copy android/keystore.properties.example to android/keystore.properties"
echo "3. Fill in your keystore details"
echo "4. Run: cd android && ./build-release.sh"
echo ""
echo "See ANDROID_CAPACITOR_GUIDE.md for detailed instructions"