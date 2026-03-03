import { PushNotifications } from '@capacitor/push-notifications';
import { platformService } from './platformService';
import { appBackend } from './appBackend';

export const pushService = {
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

  async unregister(userId: string): Promise<void> {
    if (!platformService.isNative()) return;
    try {
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
