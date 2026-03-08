import { PushNotifications } from '@capacitor/push-notifications';
import { platformService } from './platformService';
import { appBackend } from './appBackend';

// VAPID public key for Web Push (replace with your generated key)
// Generate a VAPID key pair: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushService = {
  // Native push registration (Capacitor - iOS/Android)
  async register(userId: string, userType: 'student' | 'instructor'): Promise<void> {
    if (!platformService.isNative()) return;

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      try {
        await appBackend.client.from('crm_device_tokens').upsert({
          user_id: userId,
          user_type: userType,
          token: token.value,
          platform: platformService.getPlatform(),
        }, { onConflict: 'user_id,token' });
      } catch (e) {
        console.error('Failed to save push token:', e);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
    });
  },

  // Web Push registration (PWA - browser)
  async registerWeb(userId: string, userType: 'student' | 'instructor'): Promise<void> {
    if (platformService.isNative()) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (VAPID_PUBLIC_KEY === 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY') {
      console.warn('Web Push: VAPID key not configured. Skipping registration.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subJson = subscription.toJSON();

      await appBackend.client.from('crm_device_tokens').upsert({
        user_id: userId,
        user_type: userType,
        token: subscription.endpoint,
        platform: 'web',
        subscription_json: subJson,
      }, { onConflict: 'user_id,token' });
    } catch (e) {
      console.error('Web push registration failed:', e);
    }
  },

  async unregister(userId: string): Promise<void> {
    try {
      // Unsubscribe web push if in browser
      if (!platformService.isNative() && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      await appBackend.client
        .from('crm_device_tokens')
        .delete()
        .eq('user_id', userId);
    } catch (e) {
      console.error('Failed to remove push tokens:', e);
    }
  },

  onNotificationReceived(callback: (notification: any) => void): void {
    if (!platformService.isNative()) return;
    PushNotifications.addListener('pushNotificationReceived', callback);
  },

  onNotificationTapped(callback: (notification: any) => void): void {
    if (!platformService.isNative()) return;
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      callback(action.notification);
    });
  },

  removeAllListeners(): void {
    if (!platformService.isNative()) return;
    PushNotifications.removeAllListeners();
  },
};
