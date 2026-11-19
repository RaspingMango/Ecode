import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import type { CodeFormat } from './qrLogic';

export interface ScreenCaptureDetection {
  data: string;
  format?: string;
  timestamp?: number;
}

export interface ScreenCaptureStateEvent {
  capturing: boolean;
  reason?: string;
}

export interface StartNativeScreenCaptureOptions {
  notifTitle?: string;
  notifText?: string;
  notifStop?: string;
  detectedTitle?: string;
  detectedText?: string;
}

interface ScreenCapturePlugin {
  isSupported(): Promise<{ supported: boolean; platform?: string }>;
  getStatus(): Promise<{ capturing: boolean }>;
  consumePendingDetection(): Promise<{
    hasResult: boolean;
    data?: string;
    format?: string;
    timestamp?: number;
  }>;
  startCapture(options: StartNativeScreenCaptureOptions): Promise<{
    started: boolean;
    cancelled: boolean;
  }>;
  stopCapture(): Promise<{ stopped: boolean }>;
  addListener(
    eventName: 'codeDetected',
    listenerFunc: (event: ScreenCaptureDetection) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'captureState',
    listenerFunc: (event: ScreenCaptureStateEvent) => void
  ): Promise<PluginListenerHandle>;
}

const ScreenCapture = registerPlugin<ScreenCapturePlugin>('ScreenCapture');

export function shouldUseNativeScreenCapture(isNativePlatform: boolean): boolean {
  return Boolean(isNativePlatform);
}

export function isNativeScreenCapturePlatform(): boolean {
  return shouldUseNativeScreenCapture(Capacitor.isNativePlatform());
}

export function mapNativeCodeFormat(rawFormat?: string | null): CodeFormat {
  switch ((rawFormat || '').toUpperCase()) {
    case 'CODE_128':
      return 'CODE_128';
    case 'EAN_13':
      return 'EAN_13';
    case 'EAN_8':
      return 'EAN_8';
    case 'UPC_A':
      return 'UPC_A';
    case 'UPC_E':
      return 'UPC_E';
    case 'CODE_39':
      return 'CODE_39';
    case 'ITF':
      return 'ITF';
    case 'CODABAR':
      return 'CODABAR';
    case 'QR_CODE':
    default:
      return 'QR_CODE';
  }
}

export function shouldAcceptDetectedCode(
  candidate: { data?: string | null; format?: string | null } | null | undefined,
  lastAcceptedKey: string | null,
  lastAcceptedAt: number,
  now: number,
  dedupeWindowMs: number = 2000
): { accept: boolean; key: string | null } {
  const raw = candidate?.data?.trim();
  if (!raw) {
    return { accept: false, key: lastAcceptedKey };
  }
  const format = mapNativeCodeFormat(candidate?.format);
  const key = `${format}::${raw}`;
  if (lastAcceptedKey === key && now - lastAcceptedAt < dedupeWindowMs) {
    return { accept: false, key };
  }
  return { accept: true, key };
}

export async function startNativeScreenCapture(
  options: StartNativeScreenCaptureOptions
): Promise<{ started: boolean; cancelled: boolean }> {
  return ScreenCapture.startCapture(options);
}

export async function stopNativeScreenCapture(): Promise<void> {
  if (!isNativeScreenCapturePlatform()) return;
  try {
    await ScreenCapture.stopCapture();
  } catch (err) {
    console.warn('stopNativeScreenCapture failed:', err);
  }
}

export async function getNativeScreenCaptureStatus(): Promise<boolean> {
  if (!isNativeScreenCapturePlatform()) return false;
  try {
    const res = await ScreenCapture.getStatus();
    return Boolean(res?.capturing);
  } catch {
    return false;
  }
}

export async function consumePendingScreenDetection(): Promise<ScreenCaptureDetection | null> {
  if (!isNativeScreenCapturePlatform()) return null;
  try {
    const res = await ScreenCapture.consumePendingDetection();
    if (res?.hasResult && res.data) {
      return {
        data: res.data,
        format: res.format,
        timestamp: res.timestamp,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function addScreenCodeDetectedListener(
  callback: (event: ScreenCaptureDetection) => void
): Promise<PluginListenerHandle | null> {
  if (!isNativeScreenCapturePlatform()) return null;
  return ScreenCapture.addListener('codeDetected', callback);
}

export async function addScreenCaptureStateListener(
  callback: (event: ScreenCaptureStateEvent) => void
): Promise<PluginListenerHandle | null> {
  if (!isNativeScreenCapturePlatform()) return null;
  return ScreenCapture.addListener('captureState', callback);
}
