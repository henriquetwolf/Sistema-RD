import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vollpilates.app',
  appName: 'VOLL Pilates',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    CapacitorUpdater: {
      autoUpdate: true,
    },
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
