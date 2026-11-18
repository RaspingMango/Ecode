import jsQR from 'jsqr';
import * as ZXingNS from '@zxing/library';
import type { BarcodeFormat as ZXingBarcodeFormat } from '@zxing/library';
import type { CodeFormat } from './qrLogic';

export const ZXing: typeof ZXingNS =
  (ZXingNS as unknown as { BarcodeFormat?: unknown; default?: typeof ZXingNS }).BarcodeFormat
    ? ZXingNS
    : ((ZXingNS as unknown as { default: typeof ZXingNS }).default ?? ZXingNS);

export interface ScanResult {
  data: string;
  format: CodeFormat;
  location?: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  };
}

let cachedReader: ZXingNS.MultiFormatReader | null = null;

function getZxingReader(): ZXingNS.MultiFormatReader {
  if (cachedReader) return cachedReader;

  const reader = new ZXing.MultiFormatReader();
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.ITF,
    ZXing.BarcodeFormat.CODABAR,
  ]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);
  cachedReader = reader;
  return reader;
}

export function mapZxingFormatToCodeFormat(zxingFormat: ZXingBarcodeFormat): CodeFormat {
  switch (zxingFormat) {
    case ZXing.BarcodeFormat.CODE_128:
      return 'CODE_128';
    case ZXing.BarcodeFormat.EAN_13:
      return 'EAN_13';
    case ZXing.BarcodeFormat.EAN_8:
      return 'EAN_8';
    case ZXing.BarcodeFormat.UPC_A:
      return 'UPC_A';
    case ZXing.BarcodeFormat.UPC_E:
      return 'UPC_E';
    case ZXing.BarcodeFormat.CODE_39:
      return 'CODE_39';
    case ZXing.BarcodeFormat.ITF:
      return 'ITF';
    case ZXing.BarcodeFormat.CODABAR:
      return 'CODABAR';
    case ZXing.BarcodeFormat.QR_CODE:
    default:
      return 'QR_CODE';
  }
}

/**
 * Converts RGBA pixel buffer to 1-channel grayscale luminance array for ZXing
 */
export function rgbaToLuminance(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const len = width * height;
  const luminances = new Uint8ClampedArray(len);
  for (let i = 0; i < len; i++) {
    const offset = i * 4;
    const a = rgba[offset + 3];
    if (a === 0) {
      luminances[i] = 255;
    } else {
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      luminances[i] = (r + 2 * g + b) >> 2;
    }
  }
  return luminances;
}

/**
 * Scan RGBA ImageData using ZXing MultiFormatReader (1D barcodes + QR fallback)
 */
export function scanBarcodeWithZxing(imageData: ImageData): ScanResult | null {
  try {
    const reader = getZxingReader();
    const luminances = rgbaToLuminance(imageData.data, imageData.width, imageData.height);
    const source = new ZXing.RGBLuminanceSource(luminances, imageData.width, imageData.height);
    const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(source));
    try {
      const result = reader.decodeWithState(bitmap);
      if (result && result.getText()) {
        return {
          data: result.getText(),
          format: mapZxingFormatToCodeFormat(result.getBarcodeFormat()),
        };
      }
    } catch {
      // Try inverted contrast below
    }

    // Try inverted contrast (light bars on dark background)
    const invertedBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(source.invert()));
    const invertedResult = reader.decodeWithState(invertedBitmap);
    if (invertedResult && invertedResult.getText()) {
      return {
        data: invertedResult.getText(),
        format: mapZxingFormatToCodeFormat(invertedResult.getBarcodeFormat()),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Scan raw ImageData for QR codes (via jsQR fast path) and 1D barcodes (via ZXing)
 */
export function scanImageData(imageData: ImageData): ScanResult | null {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && code.data) {
      return {
        data: code.data,
        format: 'QR_CODE',
        location: code.location,
      };
    }
  } catch (err) {
    console.error('jsQR scanning error:', err);
  }

  return scanBarcodeWithZxing(imageData);
}

/**
 * Scan an HTML Image, Video, or Canvas element (with 90° fallback for vertical barcodes on static images)
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

  // Scale down if extremely large while maintaining crisp bar edges
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
  const firstPass = scanImageData(imageData);
  if (firstPass) return firstPass;

  // For static images, retry rotated 90 degrees so vertical 1D barcodes also decode
  if (!(imageSource instanceof HTMLVideoElement)) {
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = canvas.height;
    rotCanvas.height = canvas.width;
    const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
    if (rotCtx) {
      rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rotCtx.rotate(Math.PI / 2);
      rotCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      const rotData = rotCtx.getImageData(0, 0, rotCanvas.width, rotCanvas.height);
      const rotPass = scanImageData(rotData);
      if (rotPass) return rotPass;
    }
  }

  return null;
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
