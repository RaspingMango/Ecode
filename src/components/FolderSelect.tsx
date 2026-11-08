import { useState, useRef, useEffect } from 'react';
import {
  Ticket,
  CreditCard,
  Wifi,
  Globe,
  User,
  FileText,
  Folder as FolderIcon,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Folder } from '../utils/qrLogic';
import { Language, getLocalizedFolderName } from '../utils/i18n';
import { ThemeMode } from '../utils/theme';
import { playTapSound, triggerHaptic } from '../utils/audio';

export function getFolderIcon(folder?: Folder | null, className: string = "w-4 h-4") {
  if (!folder) return <FolderIcon className={className} />;

  const iconName = (folder.icon || '').toLowerCase();
  const folderId = (folder.id || '').toLowerCase();

  if (folderId === 'tickets' || iconName === 'ticket') {
    return <Ticket className={className} />;
  }
  if (folderId === 'loyalty' || iconName === 'creditcard' || iconName === 'card') {
    return <CreditCard className={className} />;
  }
  if (folderId === 'wifi' || iconName === 'wifi') {
    return <Wifi className={className} />;
  }
  if (folderId === 'links' || iconName === 'globe' || iconName === 'link') {
    return <Globe className={className} />;
  }
  if (folderId === 'contacts' || iconName === 'user' || iconName === 'contact') {
    return <User className={className} />;
  }
  if (folderId === 'docs' || iconName === 'filetext' || iconName === 'document' || iconName === 'file') {
    return <FileText className={className} />;
  }

  return <FolderIcon className={className} />;
}

interface FolderSelectProps {
  folders: Folder[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  lang?: Language;
  theme?: ThemeMode;
  className?: string;
  ariaLabel?: string;
}

export function FolderSelect({
  folders,
  selectedFolderId,
  onSelectFolder,
  lang = 'ru',
  theme = 'dark',
  className = '',
  ariaLabel = 'Выбор папки',
}: FolderSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || folders[0];
  const selectedName = selectedFolder ? getLocalizedFolderName(selectedFolder.id, selectedFolder.name, lang) : '';

  // Close on outside click
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

  // Close on Escape
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
    setIsOpen(!isOpen);
  };

  const handleSelect = (folderId: string) => {
    playTapSound();
    triggerHaptic(15);
    onSelectFolder(folderId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button replacing the plain select */}
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between transition-all duration-200 border text-left cursor-pointer outline-none focus:ring-2 ${
          isDark
            ? 'bg-[#282a2f] hover:bg-[#33353a] border-white/[0.06] text-[#e3e2e6] focus:ring-[#a8f09b]'
            : 'bg-[#eef1ec] hover:bg-[#e4e8e1] border-black/[0.06] text-[#191c19] focus:ring-[#2e6c31]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedFolder && (
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              style={{
                backgroundColor: `${selectedFolder.color}25`,
                color: selectedFolder.color,
              }}
            >
              {getFolderIcon(selectedFolder, "w-4 h-4")}
            </div>
          )}
          <span className="font-semibold text-xs sm:text-sm truncate">
            {selectedName}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            } ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}
          />
        </div>
      </button>

      {/* Material You 3 Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl p-1.5 shadow-2xl border space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto ${
            isDark
              ? 'bg-[#1e1f23] border-white/[0.08] text-[#e3e2e6]'
              : 'bg-white border-black/[0.08] text-[#191c19]'
          }`}
        >
          {folders.map((f) => {
            const isSelected = f.id === selectedFolderId;
            const folderName = getLocalizedFolderName(f.id, f.name, lang);

            return (
              <button
                key={f.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(f.id)}
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
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${f.color}25`,
                      color: f.color,
                    }}
                  >
                    {getFolderIcon(f, "w-4 h-4")}
                  </div>
                  <span className="truncate">{folderName}</span>
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
