import { Capacitor, registerPlugin } from '@capacitor/core';

interface ScreenBrightnessPlugin {
  setBrightness(options: { brightness: number }): Promise<void>;
  getBrightness(): Promise<{ brightness: number }>;
}

const ScreenBrightness = registerPlugin<ScreenBrightnessPlugin>('ScreenBrightness');

export async function enableMaxTurnstileBrightness(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return -1;
  try {
    const { brightness } = await ScreenBrightness.getBrightness();
    await ScreenBrightness.setBrightness({ brightness: 1.0 });
    return typeof brightness === 'number' ? brightness : -1;
  } catch {
    return -1;
  }
}

export async function restoreTurnstileBrightness(previousBrightness: number = -1): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await ScreenBrightness.setBrightness({ brightness: previousBrightness });
  } catch {
    // Ignore when native plugin is unavailable
  }
}
