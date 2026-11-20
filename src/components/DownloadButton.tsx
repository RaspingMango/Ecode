import { useState, useRef, useEffect } from 'react';
import { Download, Check, FileImage, Shapes, Image as ImageIcon } from 'lucide-react';
import { DownloadImageFormat } from '../utils/qrLogic';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { ThemeMode } from '../utils/theme';
import { playTapSound, triggerHaptic } from '../utils/audio';

const LONG_PRESS_MS = 420;
const MOVE_TOLERANCE_PX = 10;

interface DownloadButtonProps {
  defaultFormat: DownloadImageFormat;
  onDownload: (format: DownloadImageFormat) => Promise<void> | void;
  downloaded?: boolean;
  disabled?: boolean;
  layout?: 'tile' | 'compact';
  menuPlacement?: 'top' | 'bottom';
  lang?: Language;
  theme?: ThemeMode;
  className?: string;
}

export function DownloadButton({
  defaultFormat,
  onDownload,
  downloaded = false,
  disabled = false,
  layout = 'tile',
  menuPlacement = 'bottom',
  lang = 'ru',
  theme = 'dark',
  className = '',
}: DownloadButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);

  const isDark = theme === 'dark';
  const t = TRANSLATIONS[lang];

  const cancelLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPointRef.current = null;
  };

  useEffect(() => {
    return () => cancelLongPress();
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const openContextMenu = () => {
    cancelLongPress();
    playTapSound();
    triggerHaptic(20);
    setIsMenuOpen(true);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return;
    longPressTriggeredRef.current = false;
    startPointRef.current = { x: e.clientX, y: e.clientY };
    cancelLongPress();
    timerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openContextMenu();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startPointRef.current || !timerRef.current) return;
    const dx = Math.abs(e.clientX - startPointRef.current.x);
    const dy = Math.abs(e.clientY - startPointRef.current.y);
    if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
      cancelLongPress();
    }
  };

  const handlePointerEnd = () => {
    cancelLongPress();
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled) return;
    openContextMenu();
  };

  const handleClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (disabled) return;
    if (isMenuOpen) {
      setIsMenuOpen(false);
      return;
    }
    void onDownload(defaultFormat);
  };

  const handleSelectFormat = (format: DownloadImageFormat) => {
    setIsMenuOpen(false);
    triggerHaptic(15);
    void onDownload(format);
  };

  const options: Array<{
    id: DownloadImageFormat;
    label: string;
    desc: string;
    icon: typeof FileImage;
    iconBgDark: string;
    iconBgLight: string;
  }> = [
    {
      id: 'png',
      label: t.downloadPng,
      desc: t.downloadFormatPngDesc,
      icon: FileImage,
      iconBgDark: 'bg-[#a8f09b]/15 text-[#a8f09b]',
      iconBgLight: 'bg-[#e8f5e9] text-[#2e6c31]',
    },
    {
      id: 'svg',
      label: t.downloadSvg,
      desc: t.downloadFormatSvgDesc,
      icon: Shapes,
      iconBgDark: 'bg-[#a8c7fa]/15 text-[#a8c7fa]',
      iconBgLight: 'bg-[#e8f0fe] text-[#1d4ed8]',
    },
    {
      id: 'jpeg',
      label: t.downloadJpeg,
      desc: t.downloadFormatJpegDesc,
      icon: ImageIcon,
      iconBgDark: 'bg-[#ffdcc2]/15 text-[#ffdcc2]',
      iconBgLight: 'bg-[#fef3c7] text-[#b45309]',
    },
  ];

  const activeAccentClass =
    defaultFormat === 'svg'
      ? isDark ? 'text-[#a8c7fa]' : 'text-[#1d4ed8]'
      : defaultFormat === 'jpeg'
        ? isDark ? 'text-[#ffdcc2]' : 'text-[#b45309]'
        : isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]';

  const badgeSurfaceClass = isDark
    ? 'bg-white/[0.08] text-[#c4c7c5]'
    : 'bg-black/[0.07] text-[#404943]';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label={`${t.downloadBtn} (${defaultFormat.toUpperCase()})`}
        style={{ WebkitTouchCallout: 'none' }}
        className={`w-full select-none transition-all active:scale-95 disabled:opacity-40 cursor-pointer outline-none focus:ring-2 ${
          isDark
            ? 'bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6] focus:ring-[#a8f09b]'
            : 'bg-[#e9ece5] hover:bg-[#dfe3db] text-[#191c19] focus:ring-[#2e6c31]'
        } ${
          isMenuOpen
            ? isDark
              ? 'ring-2 ring-[#a8f09b]'
              : 'ring-2 ring-[#2e6c31]'
            : ''
        } ${
          layout === 'tile'
            ? 'flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl text-xs font-semibold'
            : 'py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5'
        }`}
      >
        {layout === 'tile' ? (
          <>
            <div className="flex items-center gap-1 mb-1">
              {downloaded ? (
                <Check className={`w-4 h-4 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
              ) : (
                <Download className={`w-4 h-4 ${activeAccentClass}`} />
              )}
              <span className={`text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-md leading-none ${badgeSurfaceClass}`}>
                {defaultFormat.toUpperCase()}
              </span>
            </div>
            <span className="leading-tight truncate max-w-full">
              {downloaded ? t.downloadedBtn : t.downloadBtn}
            </span>
          </>
        ) : (
          <>
            {downloaded ? (
              <Check className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
            ) : (
              <Download className={`w-3.5 h-3.5 shrink-0 ${activeAccentClass}`} />
            )}
            <span className="truncate">{downloaded ? t.downloadedBtn : t.downloadBtn}</span>
            <span className={`text-[10px] font-extrabold tracking-wide px-1.5 py-0.5 rounded-md leading-none shrink-0 ${badgeSurfaceClass}`}>
              {defaultFormat.toUpperCase()}
            </span>
          </>
        )}
      </button>

      {isMenuOpen && (
        <div
          role="menu"
          aria-label={t.downloadMenuTitle}
          className={`absolute left-0 ${
            menuPlacement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } min-w-[216px] z-50 rounded-2xl p-1.5 shadow-2xl border space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-[#1e1f23] border-white/[0.08] text-[#e3e2e6]'
              : 'bg-white border-black/[0.08] text-[#191c19]'
          }`}
        >
          <div className={`px-2.5 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isDark ? 'text-[#8e918f]' : 'text-[#575a56]'
          }`}>
            {t.downloadMenuTitle}
          </div>

          {options.map((opt) => {
            const Icon = opt.icon;
            const isDefault = opt.id === defaultFormat;

            return (
              <button
                key={opt.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelectFormat(opt.id)}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold transition-colors duration-150 text-left ${
                  isDefault
                    ? isDark
                      ? 'bg-[#394738] text-[#a8f09b]'
                      : 'bg-[#e8f5e9] text-[#2e6c31]'
                    : isDark
                      ? 'hover:bg-[#282a2f] text-[#c4c7c5] hover:text-[#e3e2e6]'
                      : 'hover:bg-[#f1f4ee] text-[#404943] hover:text-[#191c19]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? opt.iconBgDark : opt.iconBgLight
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold leading-tight">{opt.label}</div>
                    <div className={`text-[10px] font-normal truncate ${
                      isDefault
                        ? isDark ? 'text-[#c4fbb8]/80' : 'text-[#2e6c31]/80'
                        : isDark ? 'text-[#8e918f]' : 'text-[#575a56]'
                    }`}>
                      {opt.desc}
                    </div>
                  </div>
                </div>

                {isDefault && (
                  <Check className={`w-4 h-4 shrink-0 ml-2 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
