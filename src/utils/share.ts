import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeSharePlugin {
  share(options: {
    title?: string;
    text?: string;
    dialogTitle?: string;
    imageBase64?: string;
    fileName?: string;
  }): Promise<void>;
}

const NativeShare = registerPlugin<NativeSharePlugin>('NativeShare');

export type ShareResult = 'shared' | 'copied' | 'cancelled';

export interface ShareCodeOptions {
  title: string;
  rawContent: string;
  dialogTitle?: string;
  imageDataUrl?: string | null;
}

export function sanitizeShareFileName(rawTitle: string): string {
  const cleaned = rawTitle
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return cleaned || 'ecode-code';
}

export function extractPngBase64(dataUrl?: string | null): string | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  return match ? match[1] : null;
}

function base64ToPngFile(base64: string, fileName: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], `${fileName}.png`, { type: 'image/png' });
}

export async function shareCodeContent({
  title,
  rawContent,
  dialogTitle,
  imageDataUrl,
}: ShareCodeOptions): Promise<ShareResult> {
  const safeTitle = title.trim() || 'Ecode';
  const fileName = sanitizeShareFileName(safeTitle);
  const imageBase64 = extractPngBase64(imageDataUrl);

  if (Capacitor.isNativePlatform()) {
    try {
      await NativeShare.share({
        title: safeTitle,
        text: rawContent,
        dialogTitle: dialogTitle || safeTitle,
        imageBase64: imageBase64 ?? undefined,
        fileName,
      });
      return 'shared';
    } catch {
      // Fall through to clipboard fallback if native share fails unexpectedly
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (imageBase64 && typeof File !== 'undefined') {
        const pngFile = base64ToPngFile(imageBase64, fileName);
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [pngFile] })) {
          await navigator.share({
            title: safeTitle,
            text: rawContent,
            files: [pngFile],
          });
          return 'shared';
        }
      }

      await navigator.share({
        title: safeTitle,
        text: rawContent,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall through to clipboard fallback when Web Share fails (e.g. unsupported browser context)
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(rawContent);
      return 'copied';
    } catch {
      // Ignore clipboard write failure
    }
  }

  return 'cancelled';
}
