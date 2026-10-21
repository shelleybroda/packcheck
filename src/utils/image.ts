export interface ProcessedImage {
  base64: string; // pure base64 without data: prefix
  dataUrl: string; // full data URL for preview
  mimeType: string;
  width: number;
  height: number;
  sizeKb: number;
}

export function validateImageFile(file: File | Blob): { valid: boolean; error?: string } {
  // Reject files over 25MB before attempting canvas decode
  if (file.size > 25 * 1024 * 1024) {
    return { valid: false, error: 'The selected photo is larger than 25MB. Please choose a smaller photo.' };
  }

  const type = file.type.toLowerCase();
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

  // Some phones omit exact mimeType or use generic application/octet-stream for camera photos
  if (type && !allowed.includes(type) && !type.startsWith('image/')) {
    return {
      valid: false,
      error: `Unsupported format (${type || 'unknown'}). Please choose or capture a JPEG, PNG, or WebP photo.`,
    };
  }

  return { valid: true };
}

export async function resizeAndCompressImage(
  fileOrBlob: File | Blob,
  maxDimension = 1280,
  quality = 0.82
): Promise<ProcessedImage> {
  const validation = validateImageFile(fileOrBlob);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width === 0 || height === 0) {
          reject(new Error('The image could not be decoded. Please retake the photo.'));
          return;
        }

        // Calculate aspect-ratio preserving dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context is not supported in this browser.'));
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(',')[1] || '';
        const sizeKb = Math.round((base64.length * 3) / 4 / 1024);

        resolve({
          base64,
          dataUrl,
          mimeType,
          width,
          height,
          sizeKb,
        });
      } catch (err: any) {
        reject(new Error(err?.message || 'Failed to process and compress photo.'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image file. Please ensure it is a valid photo.'));
    };

    img.src = objectUrl;
  });
}
