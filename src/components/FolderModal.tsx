import { useEffect, useState } from 'react';
import { X, FolderPlus, Check, Pipette } from 'lucide-react';
import { Folder } from '../utils/qrLogic';
import { playTapSound, triggerHaptic } from '../utils/audio';
import { Language, TRANSLATIONS, getLocalizedFolderName } from '../utils/i18n';
import { ThemeMode } from '../utils/theme';
import { FOLDER_ICON_OPTIONS, getFolderIconByName } from './FolderSelect';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folder: Folder) => void;
  existingFolder?: Folder | null;
  lang?: Language;
  theme?: ThemeMode;
}

const FOLDER_COLORS = [
  '#a8f09b', // mint M3
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ffb4ab', // coral M3
  '#80d5d5', // cyan
];

export function FolderModal({
  isOpen,
  onClose,
  onSave,
  existingFolder,
  lang = 'ru',
  theme = 'dark',
}: FolderModalProps) {
  const isDark = theme === 'dark';
  const t = TRANSLATIONS[lang];
  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [icon, setIcon] = useState('Folder');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (existingFolder) {
      setName(getLocalizedFolderName(existingFolder.id, existingFolder.name, lang));
      setColor(existingFolder.color || FOLDER_COLORS[0]);
      setIcon(existingFolder.icon || 'Folder');
    } else {
      setName('');
      setColor(FOLDER_COLORS[0]);
      setIcon('Folder');
    }
    setError('');
  }, [isOpen, existingFolder, lang]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();

    if (!name.trim()) {
      setError(t.folderNameError);
      return;
    }

    triggerHaptic(20);
    onSave({
      id: existingFolder?.id || `folder-${Date.now()}`,
      name: name.trim(),
      color,
      icon,
      isDefault: existingFolder?.isDefault,
    });
    setName('');
    setError('');
    onClose();
  };

  const previewTitle = name.trim() || (lang === 'ru' ? 'Новая папка' : 'New Folder');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={existingFolder ? t.editFolderTitle : t.newFolderTitle}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-[28px] p-6 shadow-2xl space-y-4 border max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-[#1e1f23] text-[#e3e2e6] border-white/[0.06]' : 'bg-white text-[#191c19] border-black/[0.08]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isDark ? 'bg-[#244927] text-[#a8f09b]' : 'bg-[#e8f5e9] text-[#2e6c31]'
            }`}>
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base">
              {existingFolder ? t.editFolderTitle : t.newFolderTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-[#c4c7c5] hover:text-white' : 'bg-black/[0.04] hover:bg-black/[0.08] text-[#575a56] hover:text-[#191c19]'
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Folder Chip Preview */}
        <div className={`p-3 rounded-2xl flex items-center justify-between border ${
          isDark ? 'bg-[#1a1b1f] border-white/[0.04]' : 'bg-[#f7f9f5] border-black/[0.06]'
        }`}>
          <span className={`text-[11px] font-medium ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
            {t.folderPreviewLabel}
          </span>
          <div className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
            isDark ? 'bg-[#282a2f] border-white/[0.06] text-[#e3e2e6]' : 'bg-white border-black/[0.08] text-[#191c19] shadow-xs'
          }`}>
            <span className="shrink-0" style={{ color }}>
              {getFolderIconByName(icon, 'w-4 h-4')}
            </span>
            <span className="truncate max-w-[180px]">{previewTitle}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-[#c4c7c5]' : 'text-[#404943]'}`}>
              {t.folderNameLabel}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder={t.folderNamePlaceholder}
              autoFocus
              className={`w-full px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 border-none ${
                isDark
                  ? 'bg-[#282a2f] text-[#e3e2e6] placeholder:text-[#8e918f] focus:ring-[#a8f09b]'
                  : 'bg-[#eef1ec] text-[#191c19] placeholder:text-[#575a56] focus:ring-[#2e6c31]'
              }`}
            />
            {error && (
              <p className={`text-xs mt-1.5 ${isDark ? 'text-[#ffb4ab]' : 'text-[#b3261e]'}`}>
                {error}
              </p>
            )}
          </div>

          {/* Folder Icon Picker */}
          <div>
            <label className={`text-xs font-semibold block mb-2 ${isDark ? 'text-[#c4c7c5]' : 'text-[#404943]'}`}>
              {t.folderIconLabel}
            </label>
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_ICON_OPTIONS.map((opt) => {
                const isSelected = icon.toLowerCase() === opt.id.toLowerCase();
                const iconLabel = lang === 'ru' ? opt.labelRu : opt.labelEn;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setIcon(opt.id);
                    }}
                    title={iconLabel}
                    aria-label={iconLabel}
                    className={`h-10 rounded-2xl flex items-center justify-center transition-all border ${
                      isSelected
                        ? isDark
                          ? 'bg-[#394738] border-[#a8f09b] ring-1 ring-[#a8f09b] scale-105'
                          : 'bg-[#e8f5e9] border-[#2e6c31] ring-1 ring-[#2e6c31] scale-105'
                        : isDark
                          ? 'bg-[#282a2f] border-white/[0.04] hover:bg-[#33353a]'
                          : 'bg-[#eef1ec] border-black/[0.04] hover:bg-[#e2e6df]'
                    }`}
                  >
                    <span style={{ color: isSelected ? color : isDark ? '#c4c7c5' : '#404943' }}>
                      {getFolderIconByName(opt.id, 'w-4 h-4')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Folder Icon Color Picker (Presets + Custom RGB Color) */}
          <div>
            <label className={`text-xs font-semibold block mb-2 ${isDark ? 'text-[#c4c7c5]' : 'text-[#404943]'}`}>
              {t.folderColorLabel}
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {FOLDER_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setColor(c);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? `scale-110 ring-2 ${isDark ? 'ring-white ring-offset-[#1e1f23]' : 'ring-[#191c19] ring-offset-white'} ring-offset-2`
                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-black drop-shadow" />}
                  </button>
                );
              })}

              {/* Custom RGB Color Wheel Input */}
              <label
                className={`relative h-8 px-2.5 rounded-full flex items-center gap-1.5 cursor-pointer border text-xs font-semibold transition-colors ${
                  isDark
                    ? 'bg-[#282a2f] border-white/[0.1] text-[#c4c7c5] hover:text-white'
                    : 'bg-[#eef1ec] border-black/[0.1] text-[#404943] hover:text-[#191c19]'
                }`}
                title={t.customColorLabel}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: color }}
                />
                <Pipette className="w-3.5 h-3.5" />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label={t.customColorLabel}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 rounded-full font-semibold text-xs transition-colors ${
                isDark ? 'bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6]' : 'bg-[#eef1ec] hover:bg-[#e2e6df] text-[#191c19]'
              }`}
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 px-4 rounded-full font-bold text-xs shadow-md transition-all active:scale-95 ${
                isDark
                  ? 'bg-[#a8f09b] hover:brightness-105 text-[#0b3810]'
                  : 'bg-[#2e6c31] hover:bg-[#255928] text-white'
              }`}
            >
              {t.saveFolderBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
