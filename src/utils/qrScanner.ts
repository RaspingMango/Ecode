import jsQR from 'jsqr';

export interface ScanResult {
  data: string;
  location?: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  };
}

/**
 * Scan raw ImageData using jsQR with fallback inversion attempts
 */
export function scanImageData(imageData: ImageData): ScanResult | null {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && code.data) {
      return {
        data: code.data,
        location: code.location,
      };
    }
    return null;
  } catch (err) {
    console.error('jsQR scanning error:', err);
    return null;
  }
}

/**
 * Scan an HTML Image or Canvas element
 */
export async function scanImageSource(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<ScanResult | null> {
  const canvas = document.createElement('canvas');
  let width = 0;
  let height = 0;

  if (imageSource instanceof HTMLVideoElement) {
    width = imageSource.videoWidth;
    height = imageSource.videoHeight;
  } else if (imageSource instanceof HTMLImageElement) {
    width = imageSource.naturalWidth || imageSource.width;
    height = imageSource.naturalHeight || imageSource.height;
  } else {
    width = imageSource.width;
    height = imageSource.height;
  }

  if (!width || !height) return null;

  // Scale down if extremely large to improve scanning speed while maintaining sharpness
  const maxDim = 1200;
  let scale = 1;
  if (width > maxDim || height > maxDim) {
    scale = Math.min(maxDim / width, maxDim / height);
  }

  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return scanImageData(imageData);
}

/**
 * Scan an image file (e.g. from file picker, screenshot upload, or drag-and-drop)
 */
export async function scanImageFile(file: File | Blob): Promise<ScanResult | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        const result = await scanImageSource(img);
        URL.revokeObjectURL(url);
        resolve(result);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось загрузить изображение для сканирования: ' + err));
    };

    img.src = url;
  });
}
