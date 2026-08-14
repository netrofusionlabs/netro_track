import { api } from '../../../shared/services/api';
import axios from 'axios';

export const profileService = {
  getUploadUrl: async (mimeType: string) => {
    const res = await api.post('/users/me/profile-picture/upload-url', { mimeType });
    return res.data.data;
  },

  completeUpload: async (fileId: string) => {
    const res = await api.post('/users/me/profile-picture/complete', { fileId });
    return res.data.data;
  },

  uploadToR2: async (uploadUrl: string, imageUri: string, mimeType: string) => {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    await axios.put(uploadUrl, blob, {
      headers: {
        'Content-Type': mimeType,
      },
    });
  }
};
