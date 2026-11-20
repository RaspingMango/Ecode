import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { Language, TRANSLATIONS } from './i18n';

export type QuickActionType = 'camera' | 'screen';
export type TilePinResultStatus = 'added' | 'already_added' | 'dismissed' | 'unsupported' | 'error';

export interface QuickActionEvent {
  action: QuickActionType;
  timestamp?: number;
}

export interface QuickActionRequest {
  action: QuickActionType;
  nonce: number;
}

interface QuickActionPlugin {
  consumePendingQuickAction(): Promise<{
    hasAction: boolean;
    action?: string;
    timestamp?: number;
  }>;
  canRequestPinTile(): Promise<{
    supported: boolean;
    sdkInt?: number;
  }>;
  requestPinTile(options: { tile: QuickActionType }): Promise<{
    status: TilePinResultStatus;
    code?: number;
    message?: string;
  }>;
  addListener(
    eventName: 'quickAction',
    listenerFunc: (event: { action?: string; timestamp?: number }) => void
  ): Promise<PluginListenerHandle>;
}

const QuickAction = registerPlugin<QuickActionPlugin>('QuickAction');

export function normalizeQuickAction(raw?: string | null): QuickActionType | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'camera' || cleaned === 'com.raspingmango.ectode.action.quick_scan_camera') {
    return 'camera';
  }
  if (cleaned === 'screen' || cleaned === 'com.raspingmango.ectode.action.quick_scan_screen') {
    return 'screen';
  }
  return null;
}

export function resolveScannerModeFromQuickAction(
  action: QuickActionType | null | undefined
): 'camera' | 'screen' | null {
  if (action === 'camera') return 'camera';
  if (action === 'screen') return 'screen';
  return null;
}

export function shouldAutoStartScreenFromQuickAction(
  action: QuickActionType | null | undefined
): boolean {
  return action === 'screen';
}

export function buildTilePinOutcomeMessage(
  status: TilePinResultStatus,
  lang: Language
): string {
  const t = TRANSLATIONS[lang];
  switch (status) {
    case 'added':
      return t.tilePinAdded;
    case 'already_added':
      return t.tilePinAlreadyAdded;
    case 'dismissed':
      return t.tilePinDismissed;
    case 'unsupported':
      return t.tilePinManualTip;
    case 'error':
    default:
      return t.tilePinError;
  }
}

export function isQuickTilesNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function consumePendingQuickAction(): Promise<QuickActionEvent | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const res = await QuickAction.consumePendingQuickAction();
    const action = normalizeQuickAction(res?.action);
    if (res?.hasAction && action) {
      return { action, timestamp: res.timestamp };
    }
    return null;
  } catch {
    return null;
  }
}

export async function addQuickActionListener(
  callback: (event: QuickActionEvent) => void
): Promise<PluginListenerHandle | null> {
  if (!Capacitor.isNativePlatform()) return null;
  return QuickAction.addListener('quickAction', (rawEvent) => {
    const action = normalizeQuickAction(rawEvent?.action);
    if (action) {
      callback({ action, timestamp: rawEvent?.timestamp });
    }
  });
}

export async function canRequestPinQuickTile(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await QuickAction.canRequestPinTile();
    return Boolean(res?.supported);
  } catch {
    return false;
  }
}

export async function requestPinQuickTile(
  tile: QuickActionType
): Promise<TilePinResultStatus> {
  if (!Capacitor.isNativePlatform()) return 'unsupported';
  try {
    const res = await QuickAction.requestPinTile({ tile });
    return res?.status || 'error';
  } catch {
    return 'error';
  }
}
