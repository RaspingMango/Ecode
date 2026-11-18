import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Palette } from 'lucide-react';
import {
  MATERIAL_COLOR_PRESETS,
  getColorContrastRatio,
  hexToRgb,
  normalizeHexColor,
  rgbToHex,
} from '../utils/color';
import { playTapSound } from '../utils/audio';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { ThemeMode } from '../utils/theme';

interface CodeColorPickerProps {
  fgColor: string;
  bgColor: string;
  onChange: (next: { fgColor: string; bgColor: string }) => void;
  lang: Language;
  theme: ThemeMode;
  compactPresets?: boolean;
  label?: string;
}

type ColorTarget = 'fg' | 'bg';

export function CodeColorPicker({
  fgColor,
  bgColor,
  onChange,
  lang,
  theme,
  compactPresets = false,
  label,
}: CodeColorPickerProps) {
  const isDark = theme === 'dark';
  const t = TRANSLATIONS[lang];
  const [activeTarget, setActiveTarget] = useState<ColorTarget>('fg');

  const currentHex = activeTarget === 'fg' ? fgColor : bgColor;
  const [hexDraft, setHexDraft] = useState(currentHex);

  useEffect(() => {
    setHexDraft(currentHex);
  }, [currentHex]);

  const activeRgb = hexToRgb(currentHex);
  const contrastRatio = getColorContrastRatio(fgColor, bgColor);
  const isLowContrast = contrastRatio < 2.4;

  const matchingPreset = MATERIAL_COLOR_PRESETS.find(
    (p) => p.fg.toLowerCase() === fgColor.toLowerCase() && p.bg.toLowerCase() === bgColor.toLowerCase()
  );

  const updateTargetColor = (target: ColorTarget, nextHex: string) => {
    if (target === 'fg') {
      onChange({ fgColor: nextHex, bgColor });
    } else {
      onChange({ fgColor, bgColor: nextHex });
    }
  };

  const updateChannel = (channel: 'r' | 'g' | 'b', val: number) => {
    const nextRgb = { ...activeRgb, [channel]: val };
    updateTargetColor(activeTarget, rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  };

  const handleHexInput = (val: string) => {
    setHexDraft(val);
    const cleaned = val.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      updateTargetColor(activeTarget, normalizeHexColor(val, currentHex));
    }
  };

  const handleHexBlur = () => {
    const normalized = normalizeHexColor(hexDraft, currentHex);
    setHexDraft(normalized);
    updateTargetColor(activeTarget, normalized);
  };

  const activeLabel = activeTarget === 'fg' ? t.codeColorLabel : t.bgColorLabel;

  return (
    <div className="space-y-3">
      {/* Material You Presets Header & Swatches */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-[#c4c7c5] mb-2">
          <div className="flex items-center gap-1.5">
            <Palette className={`w-3.5 h-3.5 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
            <span>{label || t.styleLabel}</span>
          </div>
          <span className="text-[11px] text-[#8e918f]">
            {matchingPreset
              ? lang === 'ru'
                ? matchingPreset.name
                : matchingPreset.nameEn
              : t.customRgbBadge}
          </span>
        </div>

        <div className={compactPresets ? 'flex gap-2' : 'flex flex-wrap gap-2'}>
          {MATERIAL_COLOR_PRESETS.map((p) => {
            const isSelected = matchingPreset?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  onChange({ fgColor: p.fg, bgColor: p.bg });
                }}
                title={lang === 'ru' ? p.name : p.nameEn}
                className={
                  compactPresets
                    ? `flex-1 py-1.5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? isDark
                            ? 'border-[#a8f09b] bg-[#394738]'
                            : 'border-[#2e6c31] bg-[#d8f3d2]'
                          : 'border-white/[0.06] bg-[#282a2f]'
                      }`
                    : `px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#394738] text-[#a8f09b] ring-1 ring-[#a8f09b]'
                          : 'bg-[#282a2f] text-[#c4c7c5] hover:text-[#e3e2e6]'
                      }`
                }
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                  style={{ background: `linear-gradient(135deg, ${p.fg} 50%, ${p.bg} 50%)` }}
                />
                {!compactPresets && <span>{lang === 'ru' ? p.name : p.nameEn}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom RGB Palette (Separate Code Foreground & Background) */}
      <div className={`pt-2.5 border-t space-y-2.5 ${isDark ? 'border-white/[0.06]' : 'border-black/[0.08]'}`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#8e918f]">
            {t.rgbPaletteTitle}
          </span>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onChange({ fgColor: bgColor, bgColor: fgColor });
            }}
            className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
              isDark
                ? 'bg-[#282a2f] text-[#c4c7c5] hover:text-white'
                : 'bg-[#e8ece4] text-[#404943] hover:text-[#191c19]'
            }`}
            title={t.swapColors}
            aria-label={t.swapColors}
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span>{t.swapColors}</span>
          </button>
        </div>

        {/* Target Switcher Cards: Code Foreground & Background */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'fg' as const, title: t.codeColorLabel, color: fgColor },
            { key: 'bg' as const, title: t.bgColorLabel, color: bgColor },
          ]).map((targetItem) => {
            const isActive = activeTarget === targetItem.key;
            const rgb = hexToRgb(targetItem.color);
            return (
              <div
                key={targetItem.key}
                className={`rounded-2xl p-2 flex items-center gap-2 transition-all border ${
                  isActive
                    ? isDark
                      ? 'bg-[#282a2f] border-[#a8f09b] ring-1 ring-[#a8f09b]/50'
                      : 'bg-[#e8f5e9] border-[#2e6c31] ring-1 ring-[#2e6c31]/30'
                    : isDark
                      ? 'bg-[#282a2f]/70 border-white/[0.06]'
                      : 'bg-[#eef1ec] border-black/[0.06]'
                }`}
              >
                <label
                  className="relative w-8 h-8 rounded-full border border-black/25 shrink-0 cursor-pointer shadow-inner overflow-hidden"
                  style={{ backgroundColor: targetItem.color }}
                  title={targetItem.title}
                >
                  <input
                    type="color"
                    value={normalizeHexColor(targetItem.color)}
                    onChange={(e) => {
                      setActiveTarget(targetItem.key);
                      updateTargetColor(targetItem.key, e.target.value.toLowerCase());
                    }}
                    aria-label={`${targetItem.title} picker`}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setActiveTarget(targetItem.key);
                  }}
                  className="flex-1 min-w-0 text-left"
                  aria-label={targetItem.title}
                >
                  <div className="text-[11px] font-bold text-[#e3e2e6] truncate">
                    {targetItem.title}
                  </div>
                  <div className="text-[10px] font-mono text-[#8e918f] truncate">
                    {targetItem.color.toUpperCase()} • {rgb.r},{rgb.g},{rgb.b}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* R / G / B Sliders + Numeric Inputs + HEX Input for Selected Target */}
        <div className={`rounded-2xl p-3 space-y-2 ${isDark ? 'bg-[#282a2f]/80' : 'bg-[#eef1ec]'}`}>
          <div className="flex items-center justify-between gap-2 pb-1">
            <span className="text-[11px] font-bold text-[#e3e2e6]">
              {activeLabel} (RGB)
            </span>
            <input
              type="text"
              value={hexDraft}
              onChange={(e) => handleHexInput(e.target.value)}
              onBlur={handleHexBlur}
              maxLength={7}
              aria-label={`${activeLabel} HEX`}
              className={`w-22 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold text-center border focus:outline-none focus:ring-2 ${
                isDark
                  ? 'bg-[#1a1b1f] text-[#e3e2e6] border-white/[0.08] focus:ring-[#a8f09b]'
                  : 'bg-white text-[#191c19] border-black/[0.1] focus:ring-[#2e6c31]'
              }`}
            />
          </div>

          {([
            { key: 'r' as const, label: t.redLabel, val: activeRgb.r, accent: 'accent-red-500', badge: 'text-red-400' },
            { key: 'g' as const, label: t.greenLabel, val: activeRgb.g, accent: 'accent-emerald-500', badge: 'text-emerald-400' },
            { key: 'b' as const, label: t.blueLabel, val: activeRgb.b, accent: 'accent-blue-500', badge: 'text-blue-400' },
          ]).map((ch) => (
            <div key={ch.key} className="flex items-center gap-2">
              <span className={`w-4 text-[11px] font-extrabold font-mono ${isDark ? ch.badge : 'text-[#191c19]'}`}>
                {ch.label}
              </span>
              <input
                type="range"
                min={0}
                max={255}
                value={ch.val}
                onChange={(e) => updateChannel(ch.key, Number(e.target.value))}
                aria-label={`${activeLabel} ${ch.label}`}
                className={`flex-1 h-1.5 rounded-lg cursor-pointer ${ch.accent}`}
              />
              <input
                type="number"
                min={0}
                max={255}
                value={ch.val}
                onChange={(e) => updateChannel(ch.key, Number(e.target.value))}
                aria-label={`${activeLabel} ${ch.label} value`}
                className={`w-13 px-1.5 py-0.5 rounded-lg text-[11px] font-mono text-center border focus:outline-none ${
                  isDark
                    ? 'bg-[#1a1b1f] text-[#e3e2e6] border-white/[0.08]'
                    : 'bg-white text-[#191c19] border-black/[0.1]'
                }`}
              />
            </div>
          ))}
        </div>

        {isLowContrast && (
          <div className="px-3 py-2 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className={isDark ? 'text-amber-200' : 'text-amber-900'}>
              {t.lowContrastWarning}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
