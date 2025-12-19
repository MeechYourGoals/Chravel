
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chravel.app',
  appName: 'ChravelApp',
  webDir: 'dist',
  // PRODUCTION MODE: App bundles static assets
  // For development with hot reload, uncomment the server block:
  // server: {
  //   url: 'https://20feaa04-0946-4c68-a68d-0eb88cc1b9c4.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav"
    },
    // 🆕 Enhanced mobile performance
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1a1a1a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#1a1a1a"
    }
  },
  ios: {
    scheme: "Chravel",
    // 🆕 iOS-specific optimizations
    contentInset: "automatic",
    scrollEnabled: true,
    backgroundColor: "#1a1a1a",
    allowsLinkPreview: false,
    handleApplicationURL: true
  },
  android: {
    allowMixedContent: true,
    // 🆕 Android-specific optimizations
    backgroundColor: "#1a1a1a",
    appendUserAgent: "ChravelMobile",
    overrideUserAgent: "ChravelMobile/1.0.0"
  }
};

export default config;
