import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { platformService } from './platformService';

export interface PhotoResult {
  dataUrl: string;
  format: string;
}

export const cameraService = {
  async takePhoto(): Promise<PhotoResult | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 800,
        height: 800,
        correctOrientation: true,
      });

      if (image.dataUrl) {
        return {
          dataUrl: image.dataUrl,
          format: image.format,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async pickFromGallery(): Promise<PhotoResult | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 800,
        height: 800,
        correctOrientation: true,
      });

      if (image.dataUrl) {
        return {
          dataUrl: image.dataUrl,
          format: image.format,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async chooseSource(): Promise<PhotoResult | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        width: 800,
        height: 800,
        correctOrientation: true,
        promptLabelHeader: 'Selecionar Foto',
        promptLabelPhoto: 'Galeria',
        promptLabelPicture: 'Câmera',
      });

      if (image.dataUrl) {
        return {
          dataUrl: image.dataUrl,
          format: image.format,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async captureDocument(): Promise<PhotoResult | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1200,
        correctOrientation: true,
      });

      if (image.dataUrl) {
        return {
          dataUrl: image.dataUrl,
          format: image.format,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  },
};
