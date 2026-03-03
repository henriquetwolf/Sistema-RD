import { Capacitor } from '@capacitor/core';

export const platformService = {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  },

  isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  },

  isWeb(): boolean {
    return Capacitor.getPlatform() === 'web';
  },

  getPlatform(): string {
    return Capacitor.getPlatform();
  },
};
