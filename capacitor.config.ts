import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viewhub.monitoring',
  appName: 'ViewHub',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#3b82f6",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#3b82f6"
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#3b82f6",
      sound: "beep.wav"
    },
    App: {
      launchUrl: "com.viewhub.monitoring://"
    },
    Device: {},
    Network: {},
    CapacitorHttp: {
      enabled: true
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    appendUserAgent: "ViewHub-Mobile-App",
    backgroundColor: "#ffffff",
    toolbarColor: "#3b82f6",
    navigationBarColor: "#ffffff",
    hideLogs: true,
    allowBackup: true,
    useLegacyBridge: false,
    startPath: "/"
  },
  ios: {
    scheme: "ViewHub",
    contentInset: "automatic",
    allowsLinkPreview: true,
    backgroundColor: "#ffffff",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false
  }
};

export default config;