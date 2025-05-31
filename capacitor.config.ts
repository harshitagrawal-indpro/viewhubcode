import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.970c021219814a01a3796f264e6ecb5e',
  appName: 'viewhub-manager',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    BackgroundRunner: {
      label: 'com.viewhub.monitoring',
      src: 'monitoring',
      event: 'monitoring',
      autoStart: true,
      android: {
        backgroundMode: true
      }
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#488AFF",
      sound: "beep.wav",
      importance: 4, // High importance for better background operation on Android
      foreground: true
    },
    CapacitorHttp: {
      enabled: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    BackgroundTask: {
      beforeExit: "backgroundTaskCallback"
    },
    App: {
      webViewAllowBackgroundAudio: true,
      appKeepAwake: true,
      backgroundColor: "#ffffff"
    }
  },
  server: {
    url: "https://970c0212-1981-4a01-a379-6f264e6ecb5e.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    minSdkVersion: 22,
    allowBackup: true,
    keepScreenOn: true,
    windowSoftInputMode: "adjustResize",
    // Enhanced background operation settings
    backgroundMode: true,
    foregroundServiceType: ["dataSync", "location", "connectedDevice"],
    notification: {
      importance: 4, // High importance for better background operation
    },
    // Prevents the app from being killed in background
    hardwareAcceleration: true,
    // Wake the device if notifications arrive
    allowScreenOff: false
  },
  ios: {
    contentInset: "always",
    allowsBackForwardNavigationGestures: true,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: "#ffffff",
    allowsInlineMediaPlayback: true,
    // Enhanced background operation settings
    capacitorIOSPath: "App",
    scheme: "viewhubmanager",
    // Background fetch mode
    backgroundMode: ["fetch", "remote-notification", "processing"],
    // Keep wake lock
    allowsAirPlayForMediaPlayback: true
  }
};

export default config;
