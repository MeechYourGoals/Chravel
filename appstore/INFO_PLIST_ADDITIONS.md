# Info.plist Privacy Strings

Add these keys to `ios/App/App/Info.plist` after running `npx cap add ios`:

```xml
<!-- Camera - for taking photos in chat/media -->
<key>NSCameraUsageDescription</key>
<string>Chravel needs camera access to take photos for your trip albums and chat.</string>

<!-- Photo Library - for uploading media -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Chravel needs photo library access to upload and share trip photos with your group.</string>

<!-- Location - for maps and places -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Chravel uses your location to show nearby places and help navigate to trip destinations.</string>

<!-- Microphone - for voice notes -->
<key>NSMicrophoneUsageDescription</key>
<string>Chravel needs microphone access to record voice notes in trip chats.</string>

<!-- Push Notifications - handled by Capacitor -->
<!-- No Info.plist key needed, but capability must be enabled in Xcode -->
```

## Adding to Info.plist

1. Open `ios/App/App/Info.plist` in Xcode or text editor
2. Add the keys inside the `<dict>` element
3. Save and rebuild

These strings appear when iOS prompts the user for permission.
