import { api } from '../../../shared/services/api';
import { base64ToUint8Array } from '../../../shared/utils/base64';

export const profileService = {
  getUploadUrl: async (mimeType: string) => {
    const res = await api.post('/users/me/profile-picture/upload-url', { mimeType });
    return res.data.data;
  },

  completeUpload: async (fileId: string) => {
    const res = await api.post('/users/me/profile-picture/complete', { fileId });
    return res.data.data;
  },

  uploadToR2: async (uploadUrl: string, base64Data: string, mimeType: string): Promise<void> => {
    const bytes = base64ToUint8Array(base64Data);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network request failed'));

      // Passing Uint8Array causes React Native to convert to base64 and decode natively to raw binary bytes in OkHttp/NSURLSession
      xhr.send(bytes);
    });
  }
};
