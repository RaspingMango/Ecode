import { useState, useEffect } from 'react';
import {
  ScanLine,
  Image as GalleryIcon,
  PlusCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Smartphone,
  Info,
  X,
  QrCode,
  Settings as SettingsIcon,
} from 'lucide-react';
import { ScannerView } from './components/ScannerView';
import { GalleryView } from './components/GalleryView';
import { GeneratorView } from './components/GeneratorView';
import { SettingsView } from './components/SettingsView';
import { CleanQrModal } from './components/CleanQrModal';
import { FolderModal } from './components/FolderModal';
import { TurnstileModal } from './components/TurnstileModal';
import {
  StoredQrItem,
  Folder,
} from './utils/qrLogic';
import {
  loadStoredQrItems,
  saveStoredQrItems,
  loadStoredFolders,
  saveStoredFolders,
  resetToSeedData,
} from './utils/storage';
import { playTapSound, triggerHaptic } from './utils/audio';
import { Language, TRANSLATIONS, getInitialLanguage, saveLanguagePreference } from './utils/i18n';
import { ThemeMode, getInitialTheme, applyTheme } from './utils/theme';

type AppTab = 'scanner' | 'gallery' | 'generator' | 'settings';

export default function App() {
  const [lang, setLang] = useState<Language>(() => getInitialLanguage());
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [activeTab, setActiveTab] = useState<AppTab>('scanner');
  const [items, setItems] = useState<StoredQrItem[]>(() => loadStoredQrItems());
  const [folders, setFolders] = useState<Folder[]>(() => loadStoredFolders());
  const [hapticEnabled, setHapticEnabled] = useState(true);

  const t = TRANSLATIONS[lang];

  // Modal states
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  const [scannedRawContent, setScannedRawContent] = useState<string>('');
  const [scannedSource, setScannedSource] = useState<'camera' | 'screen' | 'file' | 'generated'>('camera');
  const [selectedItemForModal, setSelectedItemForModal] = useState<StoredQrItem | null>(null);

  // Turnstile quick view modal
  const [turnstileModalOpen, setTurnstileModalOpen] = useState(false);
  const [turnstileTarget, setTurnstileTarget] = useState<StoredQrItem | null>(null);

  // Folder creator modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);

  // Sound FX toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // About modal
  const [aboutOpen, setAboutOpen] = useState(false);

  // Save items and folders on change
  useEffect(() => {
    saveStoredQrItems(items);
  }, [items]);

  useEffect(() => {
    saveStoredFolders(folders);
  }, [folders]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleLanguageChange = (nextLang: Language) => {
    setLang(nextLang);
    saveLanguagePreference(nextLang);
  };

  const handleResetDemoData = () => {
    const reset = resetToSeedData();
    setItems(reset.items);
    setFolders(reset.folders);
  };

  // Handle scanned QR detection from Camera, Screen capture, or File
  const handleQrDetected = (rawText: string, source: 'camera' | 'screen' | 'file') => {
    setScannedRawContent(rawText);
    setScannedSource(source);
    setSelectedItemForModal(null);
    setCleanModalOpen(true);
  };

  // Open existing item from gallery in CleanQrModal
  const handleSelectItemFromGallery = (item: StoredQrItem) => {
    setScannedRawContent(item.rawContent);
    setScannedSource(item.source);
    setSelectedItemForModal(item);
    setCleanModalOpen(true);
  };

  // Open turnstile mode directly from gallery card
  const handleOpenTurnstile = (item: StoredQrItem) => {
    setTurnstileTarget(item);
    setTurnstileModalOpen(true);
  };

  // Save or update an item in gallery
  const handleSaveToGallery = (
    itemData: Omit<StoredQrItem, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      setItems((prev) =>
        prev.map((it) => (it.id === existingId ? { ...it, ...itemData } : it))
      );
    } else {
      const newItem: StoredQrItem = {
        ...itemData,
        id: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
      };
      setItems((prev) => [newItem, ...prev]);
    }
  };

  const handleToggleFavorite = (id: string) => {
    triggerHaptic(15);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isFavorite: !it.isFavorite } : it))
    );
  };

  const handleDeleteItem = (id: string) => {
    triggerHaptic(20);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleMoveItem = (id: string, targetFolderId: string) => {
    triggerHaptic(15);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, folderId: targetFolderId } : it))
    );
  };

  const handleSaveFolder = (newFolder: Folder) => {
    setFolders((prev) => {
      const exists = prev.some((f) => f.id === newFolder.id);
      if (exists) {
        return prev.map((f) => (f.id === newFolder.id ? newFolder : f));
      }
      return [...prev, newFolder];
    });
  };

  const handleExportBackup = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecode-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (importedItems: StoredQrItem[]) => {
    setItems(importedItems);
    alert(`${t.backupRestored} ${importedItems.length}`);
  };

  return (
    <div className="min-h-screen bg-[#121316] text-[#e3e2e6] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Material You 3 Top App Bar */}
      <header className="sticky top-0 z-30 bg-[#121316]/95 backdrop-blur-md px-4 py-3 border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo & Brand (Clean: "Material You" badge removed as requested) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#244927] flex items-center justify-center shadow-sm">
              <QrCode className="w-5 h-5 text-[#a8f09b]" />
            </div>

            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-[#e3e2e6] leading-tight">
                Ecode
              </h1>
              <p className="text-xs text-[#8e918f] -mt-0.5">
                {t.appSlogan}
              </p>
            </div>
          </div>

          {/* Right Header Action Icons: Settings, Sound, About */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Settings Quick Button */}
            <button
              onClick={() => {
                playTapSound();
                setActiveTab('settings');
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
                activeTab === 'settings'
                  ? 'bg-[#a8f09b] text-[#0b3810] shadow-sm border-transparent'
                  : 'bg-[#1e1f23] hover:bg-[#282a2f] text-[#c4c7c5] hover:text-[#e3e2e6] border-white/[0.04]'
              }`}
              title={t.tabSettings}
              aria-label={t.tabSettings}
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                playTapSound();
                setSoundEnabled(!soundEnabled);
              }}
              className="w-10 h-10 rounded-full bg-[#1e1f23] hover:bg-[#282a2f] active:scale-95 flex items-center justify-center text-[#c4c7c5] hover:text-[#e3e2e6] transition-all border border-white/[0.04]"
              title={soundEnabled ? t.soundOn : t.soundOff}
              aria-label={t.soundOn}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#a8f09b]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#8e918f]" />
              )}
            </button>

            {/* About App */}
            <button
              onClick={() => {
                playTapSound();
                setAboutOpen(true);
              }}
              className="w-10 h-10 rounded-full bg-[#1e1f23] hover:bg-[#282a2f] active:scale-95 flex items-center justify-center text-[#c4c7c5] hover:text-[#e3e2e6] transition-all border border-white/[0.04]"
              title={t.aboutApp}
              aria-label={t.aboutApp}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content View */}
      <main className="flex-1 pb-28 pt-2">
        {activeTab === 'scanner' && (
          <ScannerView onQrDetected={handleQrDetected} lang={lang} />
        )}

        {activeTab === 'gallery' && (
          <GalleryView
            items={items}
            folders={folders}
            lang={lang}
            onSelectItem={handleSelectItemFromGallery}
            onOpenTurnstile={handleOpenTurnstile}
            onToggleFavorite={handleToggleFavorite}
            onDeleteItem={handleDeleteItem}
            onMoveItem={handleMoveItem}
            onOpenCreateFolder={() => setFolderModalOpen(true)}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onNavigateToScan={() => setActiveTab('scanner')}
            onNavigateToCreate={() => setActiveTab('generator')}
          />
        )}

        {activeTab === 'generator' && (
          <GeneratorView
            folders={folders}
            lang={lang}
            theme={theme}
            onSaveToGallery={handleSaveToGallery}
            onOpenGallery={() => setActiveTab('gallery')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            lang={lang}
            onLanguageChange={handleLanguageChange}
            theme={theme}
            onThemeChange={(newTheme) => setTheme(newTheme)}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            hapticEnabled={hapticEnabled}
            onToggleHaptic={() => setHapticEnabled(!hapticEnabled)}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetDemoData={handleResetDemoData}
            onOpenAbout={() => setAboutOpen(true)}
          />
        )}
      </main>

      {/* Material You 3 Navigation Bar (M3 Signature Pill Bar) */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-30 bg-[#1e1f23] border-t border-white/[0.04] px-3 py-2 safe-bottom shadow-2xl"
        aria-label="Основная навигация"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {/* Scanner Tab */}
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('scanner');
            }}
            className="flex flex-col items-center justify-center py-1 group"
            aria-label={t.tabScanner}
          >
            <div
              className={`w-14 sm:w-16 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                activeTab === 'scanner'
                  ? 'bg-[#a8f09b] text-[#0b3810] shadow-sm'
                  : 'text-[#c4c7c5] hover:bg-white/[0.06]'
              }`}
            >
              <ScanLine className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] sm:text-xs mt-1 transition-colors ${
                activeTab === 'scanner'
                  ? 'font-bold text-[#e3e2e6]'
                  : 'text-[#8e918f]'
              }`}
            >
              {t.tabScanner}
            </span>
          </button>

          {/* Gallery Tab */}
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('gallery');
            }}
            className="flex flex-col items-center justify-center py-1 group relative"
            aria-label={t.tabGallery}
          >
            <div
              className={`w-14 sm:w-16 h-8 rounded-full flex items-center justify-center transition-all duration-200 relative ${
                activeTab === 'gallery'
                  ? 'bg-[#a8f09b] text-[#0b3810] shadow-sm'
                  : 'text-[#c4c7c5] hover:bg-white/[0.06]'
              }`}
            >
              <GalleryIcon className="w-5 h-5" />
              {items.length > 0 && (
                <span className="absolute -top-1 right-2 sm:right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#f2b8b5] text-[#601410] font-extrabold text-[10px] flex items-center justify-center shadow-sm">
                  {items.length > 99 ? '99+' : items.length}
                </span>
              )}
            </div>
            <span
              className={`text-[11px] sm:text-xs mt-1 transition-colors ${
                activeTab === 'gallery'
                  ? 'font-bold text-[#e3e2e6]'
                  : 'text-[#8e918f]'
              }`}
            >
              {t.tabGallery}
            </span>
          </button>

          {/* Generator Tab */}
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('generator');
            }}
            className="flex flex-col items-center justify-center py-1 group"
            aria-label={t.tabCreate}
          >
            <div
              className={`w-14 sm:w-16 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                activeTab === 'generator'
                  ? 'bg-[#a8f09b] text-[#0b3810] shadow-sm'
                  : 'text-[#c4c7c5] hover:bg-white/[0.06]'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] sm:text-xs mt-1 transition-colors ${
                activeTab === 'generator'
                  ? 'font-bold text-[#e3e2e6]'
                  : 'text-[#8e918f]'
              }`}
            >
              {t.tabCreate}
            </span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('settings');
            }}
            className="flex flex-col items-center justify-center py-1 group"
            aria-label={t.tabSettings}
          >
            <div
              className={`w-14 sm:w-16 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                activeTab === 'settings'
                  ? 'bg-[#a8f09b] text-[#0b3810] shadow-sm'
                  : 'text-[#c4c7c5] hover:bg-white/[0.06]'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] sm:text-xs mt-1 transition-colors ${
                activeTab === 'settings'
                  ? 'font-bold text-[#e3e2e6]'
                  : 'text-[#8e918f]'
              }`}
            >
              {t.tabSettings}
            </span>
          </button>
        </div>
      </nav>

      {/* Pristine Clean Reconstruction Modal */}
      <CleanQrModal
        isOpen={cleanModalOpen}
        onClose={() => setCleanModalOpen(false)}
        rawContent={scannedRawContent}
        existingItem={selectedItemForModal}
        source={scannedSource}
        folders={folders}
        lang={lang}
        theme={theme}
        onSaveToGallery={handleSaveToGallery}
      />

      {/* Turnstile High Brightness Fullscreen Modal */}
      {turnstileTarget && (
        <TurnstileModal
          isOpen={turnstileModalOpen}
          onClose={() => {
            setTurnstileModalOpen(false);
            setTurnstileTarget(null);
          }}
          title={turnstileTarget.title}
          rawContent={turnstileTarget.rawContent}
          folderName={folders.find((f) => f.id === turnstileTarget.folderId)?.name}
          lang={lang}
        />
      )}

      {/* Custom Folder Creator Modal */}
      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        lang={lang}
        onSave={handleSaveFolder}
      />

      {/* About Modal */}
      {aboutOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-label={t.aboutApp}
        >
          <div className={`${theme === 'dark' ? 'bg-[#1e1f23] text-[#e3e2e6] border-white/[0.06]' : 'bg-white text-[#191c19] border-black/[0.08]'} w-full max-w-sm rounded-[28px] p-6 shadow-2xl space-y-4 border`}>
            <div className={`flex items-center justify-between border-b pb-3 ${theme === 'dark' ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-[#244927] text-[#a8f09b]' : 'bg-[#e8f5e9] text-[#2e6c31]'}`}>
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-[#e3e2e6]' : 'text-[#191c19]'}`}>
                  {t.aboutTitle}
                </h3>
              </div>
              <button
                onClick={() => setAboutOpen(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  theme === 'dark' ? 'bg-white/[0.04] hover:bg-white/[0.1] text-[#c4c7c5] hover:text-white' : 'bg-black/[0.04] hover:bg-black/[0.08] text-[#575a56] hover:text-[#191c19]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`space-y-3 text-xs leading-relaxed ${theme === 'dark' ? 'text-[#c4c7c5]' : 'text-[#404943]'}`}>
              <div className={`flex items-start gap-3 p-2.5 rounded-2xl ${theme === 'dark' ? 'bg-[#282a2f]' : 'bg-[#eef1ec]'}`}>
                <Smartphone className={`w-4 h-4 shrink-0 mt-0.5 ${theme === 'dark' ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
                <span>
                  <strong className={theme === 'dark' ? 'text-[#e3e2e6]' : 'text-[#191c19]'}>{t.feature1Title}:</strong> {t.feature1Desc}
                </span>
              </div>
              <div className={`flex items-start gap-3 p-2.5 rounded-2xl ${theme === 'dark' ? 'bg-[#282a2f]' : 'bg-[#eef1ec]'}`}>
                <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${theme === 'dark' ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
                <span>
                  <strong className={theme === 'dark' ? 'text-[#e3e2e6]' : 'text-[#191c19]'}>{t.feature2Title}:</strong> {t.feature2Desc}
                </span>
              </div>
              <div className={`flex items-start gap-3 p-2.5 rounded-2xl ${theme === 'dark' ? 'bg-[#282a2f]' : 'bg-[#eef1ec]'}`}>
                <GalleryIcon className={`w-4 h-4 shrink-0 mt-0.5 ${theme === 'dark' ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
                <span>
                  <strong className={theme === 'dark' ? 'text-[#e3e2e6]' : 'text-[#191c19]'}>{t.feature3Title}:</strong> {t.feature3Desc}
                </span>
              </div>
            </div>

            <button
              onClick={() => setAboutOpen(false)}
              className="w-full py-3 rounded-full bg-[#a8f09b] text-[#0b3810] font-bold text-xs hover:brightness-105 active:scale-98 transition-all shadow-md"
            >
              {t.aboutUnderstood}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
