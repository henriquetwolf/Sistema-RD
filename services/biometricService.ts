import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { platformService } from './platformService';

const CREDENTIALS_SERVER = 'com.vollpilates.app';

export const biometricService = {
  async isAvailable(): Promise<boolean> {
    if (!platformService.isNative()) return false;
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch {
      return false;
    }
  },

  async getBiometryType(): Promise<string> {
    if (!platformService.isNative()) return 'none';
    try {
      const result = await NativeBiometric.isAvailable();
      switch (result.biometryType) {
        case BiometryType.FACE_ID: return 'Face ID';
        case BiometryType.TOUCH_ID: return 'Touch ID';
        case BiometryType.FINGERPRINT: return 'Impressão Digital';
        case BiometryType.FACE_AUTHENTICATION: return 'Reconhecimento Facial';
        case BiometryType.IRIS_AUTHENTICATION: return 'Iris';
        default: return 'Biometria';
      }
    } catch {
      return 'none';
    }
  },

  async saveCredentials(email: string, password: string): Promise<boolean> {
    if (!platformService.isNative()) return false;
    try {
      await NativeBiometric.setCredentials({
        username: email,
        password: password,
        server: CREDENTIALS_SERVER,
      });
      return true;
    } catch {
      return false;
    }
  },

  async getCredentials(): Promise<{ email: string; password: string } | null> {
    if (!platformService.isNative()) return null;
    try {
      const credentials = await NativeBiometric.getCredentials({
        server: CREDENTIALS_SERVER,
      });
      return { email: credentials.username, password: credentials.password };
    } catch {
      return null;
    }
  },

  async deleteCredentials(): Promise<void> {
    if (!platformService.isNative()) return;
    try {
      await NativeBiometric.deleteCredentials({ server: CREDENTIALS_SERVER });
    } catch {
      // ignore
    }
  },

  async authenticate(reason?: string): Promise<boolean> {
    if (!platformService.isNative()) return false;
    try {
      await NativeBiometric.verifyIdentity({
        reason: reason || 'Confirme sua identidade para entrar',
        title: 'VOLL Pilates',
        subtitle: 'Login Biométrico',
        description: 'Use sua biometria para acessar o app',
      });
      return true;
    } catch {
      return false;
    }
  },
};
