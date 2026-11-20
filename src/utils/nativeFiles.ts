import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeClipboardPlugin {
  copyImage(options: { imageBase64: string; label?: string }): Promise<{ success: boolean }>;
  readImage(): Promise<{ hasImage: boolean; dataUrl?: string }>;
}

interface NativeDownloadPlugin {
  saveFile(options: {
    fileName: string;
    mimeType: string;
    base64Data: string;
  }): Promise<{ saved: boolean; fileName: string }>;
}

const NativeClipboard = registerPlugin<NativeClipboardPlugin>('NativeClipboard');
const NativeDownload = registerPlugin<NativeDownloadPlugin>('NativeDownload');

export function sanitizeDownloadFileName(rawName: string, extension: string): string {
  const ext = extension.replace(/^\.+/, '').toLowerCase();
  const base = rawName
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  const safeBase = base || 'ectode-code';
  return ext ? `${safeBase}.${ext}` : safeBase;
}

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function dataUrlToPngBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Invalid base64 data URL');
  }
  const mimeType = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const blob = dataUrlToPngBlob(dataUrl);
  return new File([blob], fileName, { type: blob.type || 'image/png' });
}

export async function saveFileToDevice(options: {
  fileName: string;
  mimeType: string;
  dataUrl?: string;
  textContent?: string;
}): Promise<{ saved: boolean; fileName: string }> {
  const { fileName, mimeType, dataUrl, textContent } = options;

  if (Capacitor.isNativePlatform()) {
    const base64Data = dataUrl
      ? dataUrl
      : utf8ToBase64(textContent ?? '');
    const res = await NativeDownload.saveFile({
      fileName,
      mimeType,
      base64Data,
    });
    return { saved: Boolean(res?.saved), fileName: res?.fileName || fileName };
  }

  let href = dataUrl || '';
  let revokeAfter = false;
  if (!href && textContent !== undefined) {
    const blob = new Blob([textContent], { type: `${mimeType};charset=utf-8` });
    href = URL.createObjectURL(blob);
    revokeAfter = true;
  }

  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revokeAfter) {
    URL.revokeObjectURL(href);
  }
  return { saved: true, fileName };
}

export async function copyImageToDeviceClipboard(
  dataUrl: string,
  label: string = 'Ectode'
): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeClipboard.copyImage({
        imageBase64: dataUrl,
        label,
      });
      return Boolean(res?.success);
    } catch (e) {
      console.warn('Native clipboard image copy failed:', e);
      return false;
    }
  }

  try {
    const blob = dataUrlToPngBlob(dataUrl);
    if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Clipboard write failed:', e);
    return false;
  }
}

export async function readClipboardImageFromDevice(): Promise<{
  supported: boolean;
  file?: File;
  permissionDenied?: boolean;
}> {
  if (Capacitor.isNativePlatform()) {
    const res = await NativeClipboard.readImage();
    if (res?.hasImage && res.dataUrl) {
      return {
        supported: true,
        file: dataUrlToFile(res.dataUrl, 'clipboard-screenshot.png'),
      };
    }
    return { supported: true };
  }

  if (!navigator.clipboard || !navigator.clipboard.read) {
    return { supported: false };
  }

  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          return {
            supported: true,
            file: new File([blob], 'clipboard-screenshot.png', { type }),
          };
        }
      }
    }
    return { supported: true };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return { supported: true, permissionDenied: true };
    }
    throw err;
  }
}
