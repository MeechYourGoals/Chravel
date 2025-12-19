# ADR-002: Flutter Over Capacitor for Mobile Development

## Status
Accepted

## Date
December 2025

## Context

Chravel initially used Capacitor to wrap the React web app for iOS and Android distribution. After consultation with several developers and evaluation of our application's complexity, we decided to re-evaluate this approach.

### Chravel App Characteristics
- Complex feature set spanning group travel coordination, events, chat, media sharing
- Target platforms: iOS, Android, Web, and future Desktop support
- Rich interactive features including maps, real-time chat, push notifications
- Performance-critical components (map rendering, media handling)

### Capacitor Limitations Encountered
1. **Performance gaps**: WebView-based rendering couldn't match native performance for complex UI interactions
2. **Platform parity issues**: Achieving consistent behavior across iOS/Android required significant workarounds
3. **Limited native access**: Some advanced native features required custom plugin development
4. **Bundle size concerns**: Shipping a full web app inside a native wrapper increased app size

## Decision

Migrate mobile development from Capacitor to Flutter.

### Flutter Advantages
1. **True native performance**: Compiled to ARM native code, not WebView-based
2. **Single codebase for mobile**: One Dart codebase serves iOS and Android
3. **Future platform support**: Flutter also supports Web, macOS, Windows, Linux
4. **Excellent developer tooling**: Hot reload, DevTools, strong IDE support
5. **Rich widget library**: Material Design and Cupertino components built-in
6. **Supabase SDK**: Official `supabase_flutter` package for backend integration

### Migration Strategy
1. **React web app remains**: The existing React/TypeScript app continues as the web experience
2. **Flutter handles mobile**: New Flutter codebase for iOS and Android apps
3. **Shared backend**: Both apps connect to the same Supabase backend
4. **Gradual feature migration**: Features ported from React to Flutter incrementally

## Consequences

### Positive
- Better mobile performance and user experience
- True native feel on iOS and Android
- Cleaner codebase separation (web vs mobile)
- Easier to implement platform-specific features

### Negative
- Two codebases to maintain (React web + Flutter mobile)
- Learning curve for team members new to Dart/Flutter
- Initial development investment for Flutter app
- Feature sync required between web and mobile

### Neutral
- The React web app is now "cleaned" of all Capacitor-specific code
- Platform abstraction layers (storage, media, notifications) simplified to web-only

## Related Documents
- See `docs/archive/capacitor/` for historical Capacitor documentation
- Flutter project structure: (to be created in separate repository)
