import { Preferences } from '@capacitor/preferences';
import { platformService } from './platformService';
import { appBackend } from './appBackend';

const CACHE_PREFIX = 'voll_cache_';
const OFFLINE_QUEUE_KEY = 'voll_offline_queue';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface OfflineOperation {
  id: string;
  type: string;
  table: string;
  payload: any;
  createdAt: string;
}

export const offlineService = {
  async cacheData<T>(key: string, data: T): Promise<void> {
    const cacheItem: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    await Preferences.set({
      key: `${CACHE_PREFIX}${key}`,
      value: JSON.stringify(cacheItem),
    });
  },

  async getCachedData<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key: `${CACHE_PREFIX}${key}` });
    if (!value) return null;

    try {
      const cached: CachedData<T> = JSON.parse(value);
      if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        await Preferences.remove({ key: `${CACHE_PREFIX}${key}` });
        return null;
      }
      return cached.data;
    } catch {
      return null;
    }
  },

  async clearCache(): Promise<void> {
    const { keys } = await Preferences.keys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    for (const key of cacheKeys) {
      await Preferences.remove({ key });
    }
  },

  async cacheStudentData(studentEmail: string): Promise<void> {
    try {
      const [classesResult, certificatesResult] = await Promise.all([
        appBackend.client.from('crm_classes').select('*').contains('student_ids', [studentEmail]),
        appBackend.client.from('crm_student_certificates').select('*').eq('student_email', studentEmail),
      ]);

      if (classesResult.data) {
        await this.cacheData(`student_classes_${studentEmail}`, classesResult.data);
      }
      if (certificatesResult.data) {
        await this.cacheData(`student_certificates_${studentEmail}`, certificatesResult.data);
      }
    } catch (e) {
      console.error('Error caching student data:', e);
    }
  },

  async cacheInstructorData(instructorId: string): Promise<void> {
    try {
      const [classesResult, contractsResult] = await Promise.all([
        appBackend.client.from('crm_classes').select('*').eq('teacher_id', instructorId),
        appBackend.client.from('crm_contracts').select('*').eq('instructor_id', instructorId),
      ]);

      if (classesResult.data) {
        await this.cacheData(`instructor_classes_${instructorId}`, classesResult.data);
      }
      if (contractsResult.data) {
        await this.cacheData(`instructor_contracts_${instructorId}`, contractsResult.data);
      }
    } catch (e) {
      console.error('Error caching instructor data:', e);
    }
  },

  async queueOperation(type: string, table: string, payload: any): Promise<void> {
    const queue = await this.getOfflineQueue();
    queue.push({
      id: crypto.randomUUID(),
      type,
      table,
      payload,
      createdAt: new Date().toISOString(),
    });
    await Preferences.set({
      key: OFFLINE_QUEUE_KEY,
      value: JSON.stringify(queue),
    });
  },

  async getOfflineQueue(): Promise<OfflineOperation[]> {
    const { value } = await Preferences.get({ key: OFFLINE_QUEUE_KEY });
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  },

  async processOfflineQueue(): Promise<{ processed: number; failed: number }> {
    const queue = await this.getOfflineQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;
    const remaining: OfflineOperation[] = [];

    for (const op of queue) {
      try {
        if (op.type === 'insert') {
          await appBackend.client.from(op.table).insert(op.payload);
        } else if (op.type === 'update') {
          await appBackend.client.from(op.table).update(op.payload.data).eq('id', op.payload.id);
        } else if (op.type === 'delete') {
          await appBackend.client.from(op.table).delete().eq('id', op.payload.id);
        }
        processed++;
      } catch {
        failed++;
        remaining.push(op);
      }
    }

    await Preferences.set({
      key: OFFLINE_QUEUE_KEY,
      value: JSON.stringify(remaining),
    });

    return { processed, failed };
  },

  isOnline(): boolean {
    return navigator.onLine;
  },

  onConnectivityChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};
