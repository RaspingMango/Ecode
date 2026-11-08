import QRCode from 'qrcode';

export interface QrRenderOptions {
  fgColor?: string;
  bgColor?: string;
  ecc?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  width?: number;
}

export const DEFAULT_QR_OPTIONS: Required<QrRenderOptions> = {
  fgColor: '#000000',
  bgColor: '#ffffff',
  ecc: 'M',
  margin: 2,
  width: 512,
};

/**
 * Generates a clean high-resolution data URL (PNG)
 */
export async function generateQrDataUrl(
  text: string,
  options: QrRenderOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };
  try {
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
 * Generates pristine vector SVG string
 */
export async function generateQrSvg(
  text: string,
  options: QrRenderOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_QR_OPTIONS, ...options };
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
 * Download pristine QR as PNG or SVG file
 */
export async function downloadQr(
  text: string,
  fileName: string = 'clean-qr-code',
  format: 'png' | 'svg' = 'png',
  options: QrRenderOptions = {}
): Promise<void> {
  const safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'qr-code';

  if (format === 'svg') {
    const svgStr = await generateQrSvg(text, options);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    const dataUrl = await generateQrDataUrl(text, { ...options, width: 1024 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Copies the pristine QR image directly to clipboard
 */
export async function copyQrToClipboard(
  text: string,
  options: QrRenderOptions = {}
): Promise<boolean> {
  try {
    const dataUrl = await generateQrDataUrl(text, { ...options, width: 768 });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (navigator.clipboard && 'write' in navigator.clipboard) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Clipboard write failed:', e);
    return false;
  }
}
