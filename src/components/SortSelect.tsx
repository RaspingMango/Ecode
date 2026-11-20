import { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  Clock,
  History,
  Star,
  ArrowDownAZ,
  Check,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { ThemeMode } from '../utils/theme';
import { playTapSound, triggerHaptic } from '../utils/audio';

export type GallerySortOption = 'newest' | 'oldest' | 'favoritesFirst' | 'alphabetical';

interface SortSelectProps {
  value: GallerySortOption;
  onChange: (value: GallerySortOption) => void;
  lang?: Language;
  theme?: ThemeMode;
  className?: string;
}

export function SortSelect({
  value,
  onChange,
  lang = 'ru',
  theme = 'dark',
  className = '',
}: SortSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';
  const t = TRANSLATIONS[lang];

  const options: Array<{
    id: GallerySortOption;
    label: string;
    iconBgDark: string;
    iconBgLight: string;
    icon: typeof Clock;
    iconClass?: string;
  }> = [
    {
      id: 'newest',
      label: t.sortNewest,
      iconBgDark: 'bg-[#a8f09b]/15 text-[#a8f09b]',
      iconBgLight: 'bg-[#e8f5e9] text-[#2e6c31]',
      icon: Clock,
    },
    {
      id: 'oldest',
      label: t.sortOldest,
      iconBgDark: 'bg-[#a8c7fa]/15 text-[#a8c7fa]',
      iconBgLight: 'bg-[#e8f0fe] text-[#1d4ed8]',
      icon: History,
    },
    {
      id: 'favoritesFirst',
      label: t.sortFavorites,
      iconBgDark: 'bg-[#ffdcc2]/15 text-[#ffdcc2]',
      iconBgLight: 'bg-[#fef3c7] text-[#d97706]',
      icon: Star,
      iconClass: isDark ? 'fill-[#ffdcc2]' : 'fill-[#d97706]',
    },
    {
      id: 'alphabetical',
      label: t.sortAlphabetical,
      iconBgDark: 'bg-[#d0bcff]/15 text-[#d0bcff]',
      iconBgLight: 'bg-[#ede9fe] text-[#6d28d9]',
      icon: ArrowDownAZ,
    },
  ];

  const activeOption = options.find((opt) => opt.id === value) || options[0];

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    playTapSound();
    triggerHaptic(10);
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (nextValue: GallerySortOption) => {
    playTapSound();
    triggerHaptic(15);
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Sort"
        className={`py-2.5 pl-3.5 pr-3 rounded-full text-xs flex items-center gap-2 transition-all duration-200 border cursor-pointer outline-none focus:ring-2 ${
          isOpen
            ? isDark
              ? 'bg-[#282a2f] border-[#a8f09b] text-[#e3e2e6] ring-2 ring-[#a8f09b]'
              : 'bg-[#eef1ec] border-[#2e6c31] text-[#191c19] ring-2 ring-[#2e6c31]'
            : isDark
              ? 'bg-[#1e1f23] hover:bg-[#282a2f] border-white/[0.06] text-[#c4c7c5] focus:ring-[#a8f09b]'
              : 'bg-white hover:bg-[#eef1ec] border-black/[0.07] text-[#404943] focus:ring-[#2e6c31]'
        }`}
      >
        <span className="font-medium whitespace-nowrap">{activeOption.label}</span>
        <SlidersHorizontal
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isOpen
              ? isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'
              : isDark ? 'text-[#8e918f]' : 'text-[#575a56]'
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Sort"
          className={`absolute right-0 top-full mt-1.5 min-w-[184px] z-50 rounded-2xl p-1.5 shadow-2xl border space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-[#1e1f23] border-white/[0.08] text-[#e3e2e6]'
              : 'bg-white border-black/[0.08] text-[#191c19]'
          }`}
        >
          {options.map((opt) => {
            const isSelected = opt.id === value;
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.id)}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold transition-colors duration-150 text-left ${
                  isSelected
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
                    <Icon className={`w-4 h-4 ${opt.iconClass || ''}`} />
                  </div>
                  <span className="truncate">{opt.label}</span>
                </div>

                {isSelected && (
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
