import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import {
  CodeFormat,
  DownloadImageFormat,
  getDownloadFileExtension,
  getJsBarcodeFormat,
  is1DBarcodeFormat,
  validateBarcodePayload,
} from './qrLogic';
import {
  copyImageToDeviceClipboard,
  sanitizeDownloadFileName,
  saveFileToDevice,
} from './nativeFiles';

export interface QrRenderOptions {
  fgColor?: string;
  bgColor?: string;
  ecc?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  width?: number;
  codeFormat?: CodeFormat;
  displayValue?: boolean;
  imageFormat?: 'png' | 'jpeg';
}

export const DEFAULT_QR_OPTIONS: Required<QrRenderOptions> = {
  fgColor: '#000000',
  bgColor: '#ffffff',
  ecc: 'M',
  margin: 2,
  width: 512,
  codeFormat: 'QR_CODE',
  displayValue: true,
  imageFormat: 'png',
};

function getBarcodeDimensions(targetWidth: number, margin: number) {
  const isThumb = targetWidth <= 200;
  const barWidth = isThumb ? 2 : targetWidth >= 850 ? 4 : 3;
  const barHeight = isThumb ? 72 : targetWidth >= 850 ? 180 : 130;
  const fontSize = isThumb ? 14 : targetWidth >= 850 ? 24 : 18;
  const pixelMargin = Math.max(8, margin * (isThumb ? 5 : 8));
  return { barWidth, barHeight, fontSize, pixelMargin };
}

/**
 * Generates a clean high-resolution data URL (PNG) for QR codes and 1D barcodes
 */
export async function generateQrDataUrl(
  text: string,
  options: QrRenderOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };

  if (is1DBarcodeFormat(opts.codeFormat)) {
    const validation = validateBarcodePayload(text, opts.codeFormat);
    if (!validation.valid) {
      throw new Error(`Invalid ${opts.codeFormat} barcode payload: ${validation.errorKey}`);
    }

    const canvas = document.createElement('canvas');
    const { barWidth, barHeight, fontSize, pixelMargin } = getBarcodeDimensions(opts.width, opts.margin);
    JsBarcode(canvas, validation.normalizedValue, {
      format: getJsBarcodeFormat(opts.codeFormat),
      lineColor: opts.fgColor,
      background: opts.bgColor,
      width: barWidth,
      height: barHeight,
      margin: pixelMargin,
      displayValue: opts.displayValue,
      font: 'monospace',
      fontOptions: 'bold',
      fontSize,
      textMargin: 6,
    });
    return opts.imageFormat === 'jpeg'
      ? canvas.toDataURL('image/jpeg', 0.95)
      : canvas.toDataURL('image/png');
  }

  try {
    if (opts.imageFormat === 'jpeg') {
      return await QRCode.toDataURL(text, {
        type: 'image/jpeg',
        rendererOpts: { quality: 0.95 },
        errorCorrectionLevel: opts.ecc,
        margin: opts.margin,
        width: opts.width,
        color: {
          dark: opts.fgColor,
          light: opts.bgColor,
        },
      });
    }

    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: opts.ecc,
      margin: opts.margin,
      width: opts.width,
      color: {
        dark: opts.fgColor,
        light: opts.bgColor,
      },
    });
  } catch (err) {
    console.error('Error generating QR code data URL:', err);
    throw err;
  }
}

/**
 * Generates pristine vector SVG string for QR codes and 1D barcodes
 */
export async function generateQrSvg(
  text: string,
  options: QrRenderOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };

  if (is1DBarcodeFormat(opts.codeFormat)) {
    const validation = validateBarcodePayload(text, opts.codeFormat);
    if (!validation.valid) {
      throw new Error(`Invalid ${opts.codeFormat} barcode payload: ${validation.errorKey}`);
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const { barWidth, barHeight, fontSize, pixelMargin } = getBarcodeDimensions(opts.width, opts.margin);
    JsBarcode(svg, validation.normalizedValue, {
      format: getJsBarcodeFormat(opts.codeFormat),
      lineColor: opts.fgColor,
      background: opts.bgColor,
      width: barWidth,
      height: barHeight,
      margin: pixelMargin,
      displayValue: opts.displayValue,
      font: 'monospace',
      fontOptions: 'bold',
      fontSize,
      textMargin: 6,
    });
    return new XMLSerializer().serializeToString(svg);
  }

  try {
    return await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: opts.ecc,
      margin: opts.margin,
      width: opts.width,
      color: {
        dark: opts.fgColor,
        light: opts.bgColor,
      },
    });
  } catch (err) {
    console.error('Error generating QR SVG:', err);
    throw err;
  }
}

/**
 * Download pristine QR or barcode as PNG, SVG, or JPEG file
 */
export async function downloadQr(
  text: string,
  fileName: string = 'ectode-code',
  format: DownloadImageFormat = 'png',
  options: QrRenderOptions = {}
): Promise<{ saved: boolean; fileName: string }> {
  const fullFileName = sanitizeDownloadFileName(fileName, getDownloadFileExtension(format));

  if (format === 'svg') {
    const svgStr = await generateQrSvg(text, options);
    return saveFileToDevice({
      fileName: fullFileName,
      mimeType: 'image/svg+xml',
      textContent: svgStr,
    });
  }

  const imageFormat = format === 'jpeg' ? 'jpeg' : 'png';
  const mimeType = imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = await generateQrDataUrl(text, {
    ...options,
    width: 1024,
    imageFormat,
  });
  return saveFileToDevice({
    fileName: fullFileName,
    mimeType,
    dataUrl,
  });
}

/**
 * Copies the pristine QR or barcode image directly to clipboard
 */
export async function copyQrToClipboard(
  text: string,
  options: QrRenderOptions = {}
): Promise<boolean> {
  try {
    const dataUrl = await generateQrDataUrl(text, { ...options, width: 768 });
    return await copyImageToDeviceClipboard(dataUrl, 'Ectode');
  } catch (e) {
    console.warn('Clipboard write failed:', e);
    return false;
  }
}
