import { Cloudinary } from '@cloudinary/url-gen';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Cloudinary instance configured with environment variables.
 * Use VITE_CLOUDINARY_CLOUD_NAME for client-side usage.
 */
export const cloudinary = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  },
});

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  thumbnail_url?: string;
  [key: string]: any;
}

/**
 * Uploads a file to Cloudinary using unsigned upload presets.
 * requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to be set.
 */
export async function uploadToCloudinary(
  file: File | Blob, 
  resourceType: 'image' | 'video' = 'image',
  customPath?: string
): Promise<CloudinaryUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (customPath) {
    formData.append('customPath', customPath);
  }
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        secure_url: data.url,
        public_id: data.filename || `local_${Date.now()}`,
        thumbnail_url: data.thumbnail_url || data.url,
        is_local: true
      };
    }
  } catch (error) {
    console.error('Local upload error, falling back to Firebase:', error);
  }

  return firebaseFallback(file, customPath);
}

async function firebaseFallback(file: File | Blob, customPath?: string): Promise<CloudinaryUploadResponse> {
  console.warn('Falling back to Firebase Storage.');
  
  try {
    const timePrefix = Date.now();
    const cleanName = file instanceof File ? file.name.replace(/[^a-zA-Z0-9.]/g, '_') : 'file';
    const folder = customPath ? `groups/${customPath}` : 'uploads';
    const isConvertibleImage = file.type?.startsWith('image/') && file.type !== 'image/svg+xml';
    
    if (isConvertibleImage) {
      // 1. Upload original file to preserve and protect the thumbnail
      const originalFileName = `${folder}/${timePrefix}_original_${cleanName}`;
      const originalStorageRef = ref(storage, originalFileName);
      const originalSnapshot = await uploadBytes(originalStorageRef, file);
      const originalUrl = await getDownloadURL(originalSnapshot.ref);
      
      // 2. Load the image into memory to read its size dimensions
      let width = 800;
      let height = 800;
      try {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file instanceof Blob ? file : new Blob([file]));
        img.src = objectUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => {
            width = img.naturalWidth || 800;
            height = img.naturalHeight || 800;
            URL.revokeObjectURL(objectUrl);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve();
          };
        });
      } catch (dimErr) {
        console.warn('Could not determine image dimensions client-side:', dimErr);
      }

      // 3. Convert image to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 4. Create responsive SVG
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
  <image href="${base64Data}" x="0" y="0" width="${width}" height="${height}" />
</svg>`;

      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const cleanBaseName = cleanName.replace(/\.[^/.]+$/, "");
      const svgFileName = `${folder}/${timePrefix}_${cleanBaseName}.svg`;
      const svgStorageRef = ref(storage, svgFileName);
      const svgSnapshot = await uploadBytes(svgStorageRef, svgBlob);
      const svgUrl = await getDownloadURL(svgSnapshot.ref);

      return {
        secure_url: svgUrl,
        public_id: svgFileName,
        thumbnail_url: originalUrl, // Protected original media picture thumbnail
        is_firebase: true
      };
    } else {
      // Standard upload for non-images
      const fileName = `${folder}/${timePrefix}_${cleanName}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      return {
        secure_url: url,
        public_id: fileName,
        thumbnail_url: url,
        is_firebase: true
      };
    }
  } catch (err) {
    console.error("Firebase Storage fallback failed:", err);
    // Last resort: Base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          secure_url: e.target?.result as string,
          public_id: `temp_${Date.now()}`,
          thumbnail_url: e.target?.result as string,
          is_fallback: true
        });
      };
      reader.readAsDataURL(file);
    });
  }
}
