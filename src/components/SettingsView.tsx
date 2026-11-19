import { useState } from 'react';
import {
  Moon,
  Sun,
  Globe2,
  Volume2,
  VolumeX,
  Vibrate,
  Download,
  Upload,
  QrCode,
  Check,
  Info,
  AlertCircle,
  Github,
  ExternalLink,
  Hash,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { ThemeMode } from '../utils/theme';
import { playTapSound, triggerHaptic } from '../utils/audio';

interface SettingsViewProps {
  lang: Language;
  onLanguageChange: (newLang: Language) => void;
  theme: ThemeMode;
  onThemeChange: (newTheme: ThemeMode) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hapticEnabled: boolean;
  onToggleHaptic: () => void;
  showGalleryBadge: boolean;
  onToggleGalleryBadge: () => void;
  onExportBackup: () => void;
  onImportBackup: (items: any[]) => void;
  onOpenAbout: () => void;
}

export function SettingsView({
  lang,
  onLanguageChange,
  theme,
  onThemeChange,
  soundEnabled,
  onToggleSound,
  hapticEnabled,
  onToggleHaptic,
  showGalleryBadge,
  onToggleGalleryBadge,
  onExportBackup,
  onImportBackup,
  onOpenAbout,
}: SettingsViewProps) {
  const t = TRANSLATIONS[lang];
  const [importError, setImportError] = useState<string | null>(null);

  const handleLangSelect = (selectedLang: Language) => {
    playTapSound();
    triggerHaptic(15);
    onLanguageChange(selectedLang);
  };

  const handleThemeSelect = (selectedTheme: ThemeMode) => {
    playTapSound();
    triggerHaptic(15);
    onThemeChange(selectedTheme);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          setImportError(null);
          onImportBackup(parsed);
        } else {
          setImportError(t.backupError);
        }
      } catch {
        setImportError(t.backupError);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto px-4 py-2 space-y-4">
      {/* Settings Header Card */}
      <div className={`rounded-[28px] p-5 shadow-xl transition-colors duration-200 border ${
        isDark ? 'bg-[#1e1f23] border-white/[0.04]' : 'bg-white border-black/[0.06] shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isDark ? 'bg-[#244927] text-[#a8f09b]' : 'bg-[#e8f5e9] text-[#2e6c31]'
          }`}>
            <QrCode className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-lg font-black tracking-tight">
              {t.settingsTitle}
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
              {t.settingsSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Theme Section (Light / Dark Theme) */}
      <div className={`rounded-[28px] p-5 shadow-xl transition-colors duration-200 border space-y-3.5 ${
        isDark ? 'bg-[#1e1f23] border-white/[0.04]' : 'bg-white border-black/[0.06] shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-[#a8f09b]' : 'bg-[#2e6c31]'}`} />
            <h3 className="font-bold text-sm tracking-tight">
              {t.themeLabel}
            </h3>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
            isDark ? 'bg-[#282a2f] text-[#c4c7c5]' : 'bg-[#e9ece5] text-[#575a56]'
          }`}>
            {isDark ? t.themeDark : t.themeLight}
          </span>
        </div>

        {/* Material 3 Segmented Theme Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Dark Theme Card */}
          <button
            type="button"
            onClick={() => handleThemeSelect('dark')}
            className={`p-4 rounded-[22px] flex flex-col items-start gap-2.5 transition-all text-left border ${
              isDark
                ? 'bg-[#244927]/60 border-[#a8f09b] text-[#e3e2e6] shadow-md ring-1 ring-[#a8f09b]'
                : 'bg-[#f2f4ef] border-transparent text-[#575a56] hover:bg-[#eaece6]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                isDark ? 'bg-[#a8f09b] text-[#0b3810]' : 'bg-white text-[#191c19]'
              }`}>
                <Moon className="w-5 h-5" />
              </div>
              {isDark && <Check className="w-4 h-4 text-[#a8f09b]" />}
            </div>

            <div>
              <div className="font-bold text-sm leading-tight">
                {t.themeDark}
              </div>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[#c4fbb8]' : 'text-[#8e918f]'}`}>
                {t.themeDarkDesc}
              </p>
            </div>
          </button>

          {/* Light Theme Card */}
          <button
            type="button"
            onClick={() => handleThemeSelect('light')}
            className={`p-4 rounded-[22px] flex flex-col items-start gap-2.5 transition-all text-left border ${
              !isDark
                ? 'bg-[#e8f5e9] border-[#2e6c31] text-[#191c19] shadow-md ring-1 ring-[#2e6c31]'
                : 'bg-[#282a2f] border-transparent text-[#8e918f] hover:bg-[#33353a]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                !isDark ? 'bg-[#2e6c31] text-white' : 'bg-[#1e1f23] text-[#e3e2e6]'
              }`}>
                <Sun className="w-5 h-5" />
              </div>
              {!isDark && <Check className="w-4 h-4 text-[#2e6c31]" />}
            </div>

            <div>
              <div className="font-bold text-sm leading-tight">
                {t.themeLight}
              </div>
              <p className={`text-[10px] mt-0.5 ${!isDark ? 'text-[#2e6c31]' : 'text-[#8e918f]'}`}>
                {t.themeLightDesc}
              </p>
            </div>
          </button>
        </div>

        {/* Gallery Counter Badge Toggle */}
        <div className={`flex items-center justify-between py-1 pt-3 border-t ${
          isDark ? 'border-white/[0.04]' : 'border-black/[0.06]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              showGalleryBadge
                ? isDark ? 'bg-[#244927] text-[#a8f09b]' : 'bg-[#e8f5e9] text-[#2e6c31]'
                : isDark ? 'bg-[#282a2f] text-[#8e918f]' : 'bg-[#e9ece5] text-[#575a56]'
            }`}>
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs leading-tight">
                {t.galleryBadgeTitle}
              </div>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
                {t.galleryBadgeDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapSound();
              onToggleGalleryBadge();
            }}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
              showGalleryBadge
                ? isDark ? 'bg-[#a8f09b]' : 'bg-[#2e6c31]'
                : isDark ? 'bg-[#33353a]' : 'bg-[#e0e4dd]'
            }`}
            aria-label={t.galleryBadgeTitle}
            aria-pressed={showGalleryBadge}
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform ${
                showGalleryBadge
                  ? isDark ? 'translate-x-5 bg-[#0b3810]' : 'translate-x-5 bg-white'
                  : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Language Section (Language Switcher) */}
      <div className={`rounded-[28px] p-5 shadow-xl transition-colors duration-200 border space-y-3.5 ${
        isDark ? 'bg-[#1e1f23] border-white/[0.04]' : 'bg-white border-black/[0.06] shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className={`w-4 h-4 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
            <h3 className="font-bold text-sm tracking-tight">
              {t.languageSection}
            </h3>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
            isDark ? 'bg-[#282a2f] text-[#c4c7c5]' : 'bg-[#e9ece5] text-[#575a56]'
          }`}>
            {lang === 'ru' ? 'RU • Русский' : 'EN • English'}
          </span>
        </div>

        {/* Material 3 Segmented Language Switcher */}
        <div className={`p-1 rounded-full flex gap-1 border ${
          isDark ? 'bg-[#121316] border-white/[0.04]' : 'bg-[#f2f4ef] border-black/[0.04]'
        }`}>
          <button
            type="button"
            onClick={() => handleLangSelect('ru')}
            className={`flex-1 py-3 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              lang === 'ru'
                ? isDark
                  ? 'bg-[#394738] text-[#a8f09b] shadow-sm'
                  : 'bg-white text-[#2e6c31] shadow-sm'
                : isDark
                  ? 'text-[#8e918f] hover:text-[#e3e2e6]'
                  : 'text-[#575a56] hover:text-[#191c19]'
            }`}
          >
            <span>🇷🇺</span>
            <span>{t.langRussian}</span>
            {lang === 'ru' && <Check className="w-3.5 h-3.5 ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => handleLangSelect('en')}
            className={`flex-1 py-3 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              lang === 'en'
                ? isDark
                  ? 'bg-[#394738] text-[#a8f09b] shadow-sm'
                  : 'bg-white text-[#2e6c31] shadow-sm'
                : isDark
                  ? 'text-[#8e918f] hover:text-[#e3e2e6]'
                  : 'text-[#575a56] hover:text-[#191c19]'
            }`}
          >
            <span>🇬🇧</span>
            <span>{t.langEnglish}</span>
            {lang === 'en' && <Check className="w-3.5 h-3.5 ml-1" />}
          </button>
        </div>
      </div>

      {/* 3. Feedback: Sound & Haptics */}
      <div className={`rounded-[28px] p-5 shadow-xl transition-colors duration-200 border space-y-3 ${
        isDark ? 'bg-[#1e1f23] border-white/[0.04]' : 'bg-white border-black/[0.06] shadow-sm'
      }`}>
        <h3 className="font-bold text-sm tracking-tight mb-1">
          {t.feedbackSection}
        </h3>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              soundEnabled
                ? isDark ? 'bg-[#244927] text-[#a8f09b]' : 'bg-[#e8f5e9] text-[#2e6c31]'
                : isDark ? 'bg-[#282a2f] text-[#8e918f]' : 'bg-[#e9ece5] text-[#575a56]'
            }`}>
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>
            <div>
              <div className="font-semibold text-xs leading-tight">
                {t.soundTitle}
              </div>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
                {t.soundDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapSound();
              onToggleSound();
            }}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
              soundEnabled
                ? isDark ? 'bg-[#a8f09b]' : 'bg-[#2e6c31]'
                : isDark ? 'bg-[#33353a]' : 'bg-[#e0e4dd]'
            }`}
            aria-label={t.soundTitle}
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform ${
                soundEnabled
                  ? isDark ? 'translate-x-5 bg-[#0b3810]' : 'translate-x-5 bg-white'
                  : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>

        {/* Haptic Toggle */}
        <div className={`flex items-center justify-between py-1 pt-2 border-t ${
          isDark ? 'border-white/[0.04]' : 'border-black/[0.06]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              hapticEnabled
                ? isDark ? 'bg-[#244927] text-[#a8f09b]' : 'bg-[#e8f5e9] text-[#2e6c31]'
                : isDark ? 'bg-[#282a2f] text-[#8e918f]' : 'bg-[#e9ece5] text-[#575a56]'
            }`}>
              <Vibrate className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs leading-tight">
                {t.hapticTitle}
              </div>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
                {t.hapticDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapSound();
              onToggleHaptic();
            }}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
              hapticEnabled
                ? isDark ? 'bg-[#a8f09b]' : 'bg-[#2e6c31]'
                : isDark ? 'bg-[#33353a]' : 'bg-[#e0e4dd]'
            }`}
            aria-label={t.hapticTitle}
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform ${
                hapticEnabled
                  ? isDark ? 'translate-x-5 bg-[#0b3810]' : 'translate-x-5 bg-white'
                  : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. Data Management: Backup & Restore */}
      <div className={`rounded-[28px] p-5 shadow-xl transition-colors duration-200 border space-y-3 ${
        isDark ? 'bg-[#1e1f23] border-white/[0.04]' : 'bg-white border-black/[0.06] shadow-sm'
      }`}>
        <h3 className="font-bold text-sm tracking-tight mb-1">
          {t.dataSection}
        </h3>

        {/* Download Backup */}
        <button
          type="button"
          onClick={() => {
            playTapSound();
            onExportBackup();
          }}
          className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-colors ${
            isDark ? 'bg-[#282a2f] hover:bg-[#33353a]' : 'bg-[#f2f4ef] hover:bg-[#eaece6]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Download className={`w-4 h-4 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
            <div className="text-left">
              <div className="text-xs font-semibold">{t.backupDataTitle}</div>
              <p className={`text-[10px] ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
                {t.backupDataDesc}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#8e918f]">JSON</span>
        </button>

        {/* Restore Backup */}
        <label className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-colors cursor-pointer ${
          isDark ? 'bg-[#282a2f] hover:bg-[#33353a]' : 'bg-[#f2f4ef] hover:bg-[#eaece6]'
        }`}>
          <div className="flex items-center gap-3">
            <Upload className={`w-4 h-4 ${isDark ? 'text-[#a8c7fa]' : 'text-[#1d4ed8]'}`} />
            <div className="text-left">
              <div className="text-xs font-semibold">{t.restoreDataTitle}</div>
              <p className={`text-[10px] ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
                {t.restoreDataDesc}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#8e918f]">JSON</span>
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />
        </label>

        {importError && (
          <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
            isDark
              ? 'bg-[#371e1d] text-[#ffdad6] border-[#ffb4ab]/20'
              : 'bg-[#fde8e8] text-[#690005] border-[#b3261e]/20'
          }`}>
            <AlertCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#ffb4ab]' : 'text-[#b3261e]'}`} />
            <span>{importError}</span>
          </div>
        )}
      </div>

      {/* 5. App Info Card */}
      <div className={`rounded-[28px] p-5 shadow-xl transition-colors duration-200 border space-y-3 ${
        isDark ? 'bg-[#1e1f23] border-white/[0.04]' : 'bg-white border-black/[0.06] shadow-sm'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Info className={`w-5 h-5 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
            <div>
              <div className="text-xs font-bold">
                Ecode • {t.appVersion} 1.3.3
              </div>
              <p className={`text-[10px] ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
                Offline First • Private
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapSound();
              onOpenAbout();
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors shrink-0 ${
              isDark
                ? 'bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6]'
                : 'bg-[#e9ece5] hover:bg-[#dfe3db] text-[#191c19]'
            }`}
          >
            {t.aboutApp}
          </button>
        </div>

        <a
          href="https://github.com/RaspingMango/Ecode"
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full p-3 rounded-2xl flex items-center justify-between gap-2 transition-colors border ${
            isDark
              ? 'bg-[#282a2f] hover:bg-[#33353a] border-white/[0.04] text-[#e3e2e6]'
              : 'bg-[#f2f4ef] hover:bg-[#eaece6] border-black/[0.05] text-[#191c19]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Github className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-tight">{t.githubRepoTitle}</div>
              <div className={`text-[11px] truncate ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`}>
                https://github.com/RaspingMango/Ecode
              </div>
            </div>
          </div>
          <ExternalLink className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`} />
        </a>
      </div>
    </div>
  );
}
