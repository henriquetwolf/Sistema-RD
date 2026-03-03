import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { platformService } from './platformService';

export const liveUpdateService = {
  async initialize(): Promise<void> {
    if (!platformService.isNative()) return;

    try {
      await CapacitorUpdater.notifyAppReady();
    } catch (e) {
      console.error('Live update init error:', e);
    }
  },

  async checkForUpdate(): Promise<{ available: boolean; version?: string }> {
    if (!platformService.isNative()) return { available: false };

    try {
      const latest = await CapacitorUpdater.getLatest();
      return {
        available: !!latest.url,
        version: latest.version,
      };
    } catch {
      return { available: false };
    }
  },

  onUpdateAvailable(callback: (info: { version: string }) => void): void {
    if (!platformService.isNative()) return;

    CapacitorUpdater.addListener('updateAvailable', (info) => {
      callback({ version: info.bundle.version });
    });
  },

  onDownloadComplete(callback: () => void): void {
    if (!platformService.isNative()) return;

    CapacitorUpdater.addListener('downloadComplete', () => {
      callback();
    });
  },
};
