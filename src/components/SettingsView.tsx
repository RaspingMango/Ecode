import { useState } from 'react';
import {
  Moon,
  Sun,
  Globe2,
  Volume2,
  VolumeX,
  Vibrate,
  Smartphone,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  QrCode,
  Check,
  CheckCircle2,
  FolderSync,
  Info,
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
  onExportBackup: () => void;
  onImportBackup: (items: any[]) => void;
  onResetDemoData: () => void;
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
  onExportBackup,
  onImportBackup,
  onResetDemoData,
  onOpenAbout,
}: SettingsViewProps) {
  const t = TRANSLATIONS[lang];
  const [resetSuccess, setResetSuccess] = useState(false);

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
          onImportBackup(parsed);
        }
      } catch (err) {
        alert('File error: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetConfirm = () => {
    playTapSound();
    if (confirm(t.resetConfirm)) {
      triggerHaptic(30);
      onResetDemoData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    }
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

      {/* 1. Theme Section (Светлая / Тёмная тема) */}
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
      </div>

      {/* 2. Language Section (Переключатель локализации) */}
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
        <div className="flex items-center justify-between py-1 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
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

      {/* 4. Data Management: Backup & Reset */}
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
            <Upload className="w-4 h-4 text-[#a8c7fa]" />
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

        {/* Reset Demo Data */}
        <button
          type="button"
          onClick={handleResetConfirm}
          className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-colors ${
            isDark ? 'bg-[#282a2f] hover:bg-[#371e1d]' : 'bg-[#f2f4ef] hover:bg-[#fde8e8]'
          }`}
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-[#f2b8b5]" />
            <div className="text-left">
              <div className="text-xs font-semibold text-[#f2b8b5]">
                {t.resetDemoTitle}
              </div>
              <p className={`text-[10px] ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
                {t.resetDemoDesc}
              </p>
            </div>
          </div>
        </button>

        {resetSuccess && (
          <div className="p-3 rounded-2xl bg-[#244927] text-[#c4fbb8] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#a8f09b]" />
            <span>{t.resetSuccess}</span>
          </div>
        )}
      </div>

      {/* 5. App Info Card */}
      <div className={`rounded-[28px] p-5 shadow-xl transition-colors duration-200 border flex items-center justify-between ${
        isDark ? 'bg-[#1e1f23] border-white/[0.04]' : 'bg-white border-black/[0.06] shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <Info className={`w-5 h-5 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
          <div>
            <div className="text-xs font-bold">
              Ecode • {t.appVersion} 1.2
            </div>
            <p className={`text-[10px] ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
              Material You • Offline First • Private
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            onOpenAbout();
          }}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
            isDark
              ? 'bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6]'
              : 'bg-[#e9ece5] hover:bg-[#dfe3db] text-[#191c19]'
          }`}
        >
          {t.aboutApp}
        </button>
      </div>
    </div>
  );
}
