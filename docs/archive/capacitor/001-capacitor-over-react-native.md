# ADR 001: Capacitor over React Native

**Status:** Accepted  
**Date:** 2024-10-01  
**Deciders:** Engineering Team

## Context

Chravel needed a mobile app strategy. We evaluated two main approaches:
1. **Capacitor** - Wrap existing web app in native container
2. **React Native** - Build separate native app with shared business logic

## Decision

We chose **Capacitor** over React Native.

## Rationale

### Advantages of Capacitor

1. **Code Reuse**
   - Single codebase (React + TypeScript) for web, iOS, and Android
   - No need to maintain separate React Native codebase
   - Faster feature development (write once, deploy everywhere)

2. **Team Efficiency**
   - Existing team expertise in React/TypeScript
   - No need to hire React Native specialists
   - Faster onboarding for new developers

3. **Native Features**
   - Capacitor plugins provide access to all needed native APIs:
     - Camera, Photos, Geolocation
     - Push Notifications
     - File System
     - Haptics
   - Plugin ecosystem is mature and well-maintained

4. **Web-First Architecture**
   - Chravel is fundamentally a web app
   - PWA capabilities (offline, installable)
   - Easier to maintain and debug (browser DevTools)

5. **Deployment Speed**
   - Faster iteration cycles
   - Can deploy web updates without app store review
   - Native updates only needed for new plugin features

### Trade-offs

**Disadvantages:**

1. **Performance**
   - Slightly slower than pure native apps
   - JavaScript bridge overhead
   - **Mitigation:** Optimize critical paths, use native plugins where needed

2. **Native UI Components**
   - Can't use platform-specific UI components (Material Design, Cupertino)
   - **Mitigation:** Use Tailwind CSS with platform detection for styling

3. **App Size**
   - Larger bundle size (includes web runtime)
   - **Mitigation:** Code splitting, lazy loading, tree shaking

4. **Platform-Specific Features**
   - Some advanced native features may require custom plugins
   - **Mitigation:** Capacitor allows writing custom native code when needed

## Alternatives Considered

### React Native
- **Pros:** Better performance, native UI components, large ecosystem
- **Cons:** Separate codebase, different tooling, steeper learning curve
- **Rejected because:** Would require maintaining two codebases, slower development velocity

### Flutter
- **Pros:** Excellent performance, single codebase
- **Cons:** Different language (Dart), team would need to learn new stack
- **Rejected because:** Team expertise in TypeScript/React, migration cost too high

### PWA Only
- **Pros:** Simplest deployment, no app stores
- **Cons:** Limited native features, iOS PWA limitations
- **Rejected because:** Need push notifications, camera access, better offline support

## Consequences

### Positive
- ✅ Faster time to market for mobile apps
- ✅ Single codebase reduces maintenance burden
- ✅ Web-first approach aligns with Chravel's architecture
- ✅ Easier to test and debug

### Negative
- ⚠️ Slightly larger app size
- ⚠️ Performance not as optimal as pure native
- ⚠️ Some platform-specific UI limitations

### Neutral
- Code sharing between web and mobile is high (~95%)
- Native plugins needed for ~10% of features

## Implementation Notes

- Use Capacitor 7.x (latest stable)
- Configure platform-specific settings in `capacitor.config.ts`
- Test on both iOS and Android devices regularly
- Monitor app size and performance metrics

## References

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor vs React Native Comparison](https://capacitorjs.com/docs/guides/comparing-capacitor-and-react-native)

---

**Last Updated:** 2025-01-31
