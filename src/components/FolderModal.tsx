import { useState } from 'react';
import { X, FolderPlus, Check } from 'lucide-react';
import { Folder } from '../utils/qrLogic';
import { playTapSound, triggerHaptic } from '../utils/audio';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folder: Folder) => void;
  existingFolder?: Folder | null;
  lang?: Language;
}

const FOLDER_COLORS = [
  '#a8f09b', // mint M3
  '#ffdcc2', // peach / amber
  '#a8c7fa', // blue M3
  '#d0bcff', // purple M3
  '#ffb4ab', // red/coral M3
  '#78dc77', // green
  '#80d5d5', // cyan
  '#e2e2e9', // light gray
];

export function FolderModal({ isOpen, onClose, onSave, existingFolder, lang = 'ru' }: FolderModalProps) {
  const t = TRANSLATIONS[lang];
  const [name, setName] = useState(existingFolder?.name || '');
  const [color, setColor] = useState(existingFolder?.color || FOLDER_COLORS[0]);
  const [icon, setIcon] = useState(existingFolder?.icon || 'Folder');
  const [error, setError] = useState('');

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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-label="Folder Dialog"
    >
      <div className="bg-[#1e1f23] text-[#e3e2e6] w-full max-w-sm rounded-[28px] p-6 shadow-2xl space-y-4 border border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#244927] flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-[#a8f09b]" />
            </div>
            <h3 className="font-bold text-base text-[#e3e2e6]">
              {existingFolder ? t.editFolderTitle : t.newFolderTitle}
            </h3>
          </div>
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[#c4c7c5] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#c4c7c5] block mb-1.5">
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
              className="w-full px-4 py-3 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
            />
            {error && <p className="text-[#ffb4ab] text-xs mt-1.5">{error}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#c4c7c5] block mb-2">
              {t.folderColorLabel}
            </label>
            <div className="flex flex-wrap gap-3">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setColor(c);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    color === c
                      ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#1e1f23]'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                >
                  {color === c && <Check className="w-4 h-4 text-black drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-full bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6] font-semibold text-xs transition-colors"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-full bg-[#a8f09b] hover:brightness-105 text-[#0b3810] font-bold text-xs shadow-md transition-all active:scale-95"
            >
              {t.saveFolderBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
