import { useState, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Share2,
  ExternalLink,
  Folder as FolderIcon,
  Palette,
  Maximize2,
  Check,
  CheckCircle2,
  BookmarkPlus,
  Wifi,
  Phone,
  Mail,
  User,
  Ticket,
  CreditCard,
  FileText,
  Star,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Folder, ParsedQrData, parseQrContent, StoredQrItem, suggestFolderForType } from '../utils/qrLogic';
import { generateQrDataUrl, downloadQr, copyQrToClipboard, QrRenderOptions } from '../utils/qrRenderer';
import { TurnstileModal } from './TurnstileModal';
import { playTapSound, triggerHaptic } from '../utils/audio';
import { Language, TRANSLATIONS, getLocalizedFolderName } from '../utils/i18n';
import { ThemeMode } from '../utils/theme';
import { FolderSelect } from './FolderSelect';

interface CleanQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawContent: string;
  existingItem?: StoredQrItem | null;
  source?: 'camera' | 'screen' | 'file' | 'generated';
  folders: Folder[];
  lang?: Language;
  theme?: ThemeMode;
  onSaveToGallery: (item: Omit<StoredQrItem, 'id' | 'createdAt'>, existingId?: string) => void;
}

const COLOR_PRESETS = [
  { name: 'Классический ч/б', nameEn: 'Classic B/W', fg: '#000000', bg: '#ffffff' },
  { name: 'Мятный M3', nameEn: 'Mint M3', fg: '#003a0f', bg: '#e8f5e9' },
  { name: 'Синий сапфир', nameEn: 'Sapphire M3', fg: '#00325b', bg: '#e3f2fd' },
  { name: 'Аметист M3', nameEn: 'Amethyst M3', fg: '#381e72', bg: '#f3e5f5' },
  { name: 'Глубокий темный', nameEn: 'Deep Dark', fg: '#a8f09b', bg: '#121316' },
];

export function CleanQrModal({
  isOpen,
  onClose,
  rawContent,
  existingItem,
  source = 'camera',
  folders,
  lang = 'ru',
  theme = 'dark',
  onSaveToGallery,
}: CleanQrModalProps) {
  const isDark = theme === 'dark';
  const t = TRANSLATIONS[lang];
  const [parsed, setParsed] = useState<ParsedQrData>(() => parseQrContent(rawContent || ''));
  const [dataUrl, setDataUrl] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [ecc, setEcc] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [showStyleSettings, setShowStyleSettings] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState('docs');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !rawContent) return;

    const parsedData = parseQrContent(rawContent);
    setParsed(parsedData);

    if (existingItem) {
      setTitle(existingItem.title);
      setFolderId(existingItem.folderId);
      setNotes(existingItem.notes || '');
      setIsFavorite(existingItem.isFavorite);
      if (existingItem.style) {
        setEcc(existingItem.style.ecc || 'M');
        const match = COLOR_PRESETS.find(c => c.fg === existingItem.style?.fgColor);
        if (match) setSelectedColor(match);
      }
    } else {
      setTitle(parsedData.displayTitle);
      setFolderId(suggestFolderForType(parsedData.type));
      setNotes('');
      setIsFavorite(false);
    }
  }, [isOpen, rawContent, existingItem]);

  useEffect(() => {
    if (!rawContent) return;

    const renderOpts: QrRenderOptions = {
      fgColor: selectedColor.fg,
      bgColor: selectedColor.bg,
      ecc: ecc,
      margin: 2,
      width: 720,
    };

    generateQrDataUrl(rawContent, renderOpts)
      .then(setDataUrl)
      .catch((err) => console.error('Error generating clean QR preview:', err));
  }, [rawContent, selectedColor, ecc]);

  if (!isOpen || !rawContent) return null;

  const currentFolder = folders.find(f => f.id === folderId) || folders[0];
  const currentFolderName = getLocalizedFolderName(currentFolder.id, currentFolder.name, lang);

  const handleCopyText = async () => {
    playTapSound();
    try {
      await navigator.clipboard.writeText(rawContent);
      setIsCopiedText(true);
      setTimeout(() => setIsCopiedText(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyImage = async () => {
    playTapSound();
    const success = await copyQrToClipboard(rawContent, {
      fgColor: selectedColor.fg,
      bgColor: selectedColor.bg,
      ecc,
    });
    if (success) {
      setIsCopiedImage(true);
      setTimeout(() => setIsCopiedImage(false), 2000);
    }
  };

  const handleDownload = async (format: 'png' | 'svg') => {
    playTapSound();
    await downloadQr(rawContent, title || 'ecode-qr', format, {
      fgColor: selectedColor.fg,
      bgColor: selectedColor.bg,
      ecc,
    });
  };

  const handleShare = async () => {
    playTapSound();
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Ecode QR',
          text: rawContent,
        });
      } catch {
        // Cancelled
      }
    } else {
      handleCopyText();
    }
  };

  const handleSave = () => {
    playTapSound();
    triggerHaptic([30, 20, 50]);

    onSaveToGallery(
      {
        title: title.trim() || parsed.displayTitle,
        rawContent,
        folderId,
        dataType: parsed.type,
        notes: notes.trim(),
        isFavorite,
        source: existingItem?.source || source,
        style: {
          fgColor: selectedColor.fg,
          bgColor: selectedColor.bg,
          ecc,
        },
      },
      existingItem?.id
    );

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#a8f09b', '#78dc77', '#ffdcc2'],
      });
    } catch {}

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const getTypeIcon = () => {
    switch (parsed.type) {
      case 'url': return <ExternalLink className="w-4 h-4 text-[#d0bcff]" />;
      case 'wifi': return <Wifi className="w-4 h-4 text-[#a8c7fa]" />;
      case 'vcard': return <User className="w-4 h-4 text-[#ffb4ab]" />;
      case 'ticket': return <Ticket className="w-4 h-4 text-[#ffdcc2]" />;
      case 'loyalty': return <CreditCard className="w-4 h-4 text-[#a8f09b]" />;
      case 'phone': return <Phone className="w-4 h-4 text-[#a8f09b]" />;
      case 'email': return <Mail className="w-4 h-4 text-[#a8c7fa]" />;
      default: return <FileText className="w-4 h-4 text-[#8e918f]" />;
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        role="dialog"
        aria-label="Clean QR View"
      >
        <div className={`w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border ${
          isDark ? 'bg-[#1e1f23] text-[#e3e2e6] border-white/[0.06]' : 'bg-white text-[#191c19] border-black/[0.08]'
        }`}>
          {/* M3 Drag Handle Bar on Mobile */}
          <div className={`w-10 h-1 rounded-full mx-auto mt-2.5 sm:hidden ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />

          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur ${
            isDark ? 'bg-[#1e1f23]/95 border-white/[0.04]' : 'bg-white/95 border-black/[0.06]'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-[#a8f09b] shadow-[0_0_8px_#a8f09b]' : 'bg-[#2e6c31]'}`} />
              <div>
                <h3 className={`font-bold text-base leading-tight ${isDark ? 'text-[#e3e2e6]' : 'text-[#191c19]'}`}>
                  {t.cleanModalTitle}
                </h3>
                <p className={`text-xs ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
                  {t.cleanModalSubtitle}
                </p>
              </div>
            </div>

            <button
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

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Pristine Reconstructed QR Code Card */}
            <div className={`flex flex-col items-center rounded-[24px] p-5 relative border ${
              isDark ? 'bg-[#1a1b1f] border-white/[0.04]' : 'bg-[#f7f9f5] border-black/[0.06]'
            }`}>
              <button
                onClick={() => {
                  playTapSound();
                  setShowTurnstile(true);
                }}
                className="absolute top-3.5 right-3.5 px-3 py-1.5 rounded-full bg-[#244927] hover:bg-[#2f5c33] text-[#c4fbb8] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                title={t.fullScreenTurnstile}
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#a8f09b]" />
                <span>{t.fullScreenTurnstile}</span>
              </button>

              <div 
                className="p-4 rounded-3xl transition-all shadow-xl my-2 border border-black/10"
                style={{ backgroundColor: selectedColor.bg }}
              >
                {dataUrl ? (
                  <img
                    src={dataUrl}
                    alt="Pristine QR"
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain image-rendering-pixelated"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-[#a8f09b] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-bold text-[#a8f09b] bg-[#244927] px-3 py-0.5 rounded-full">
                  {t.vectorOriginalBadge}
                </span>
                <span className="text-[11px] text-[#8e918f]">
                  {t.eccCorrection}: {ecc}
                </span>
              </div>

              {/* M3 Actions Row */}
              <div className="grid grid-cols-4 gap-2 w-full mt-4 pt-3.5 border-t border-white/[0.04]">
                <button
                  onClick={() => handleDownload('png')}
                  className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] active:scale-95 text-[#e3e2e6] text-xs font-semibold transition-colors"
                >
                  <Download className="w-4 h-4 mb-1 text-[#a8f09b]" />
                  {t.downloadPng}
                </button>
                <button
                  onClick={() => handleDownload('svg')}
                  className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] active:scale-95 text-[#e3e2e6] text-xs font-semibold transition-colors"
                >
                  <Download className="w-4 h-4 mb-1 text-[#a8c7fa]" />
                  {t.downloadSvg}
                </button>
                <button
                  onClick={handleCopyImage}
                  className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] active:scale-95 text-[#e3e2e6] text-xs font-semibold transition-colors"
                >
                  {isCopiedImage ? (
                    <Check className="w-4 h-4 mb-1 text-[#a8f09b]" />
                  ) : (
                    <Copy className="w-4 h-4 mb-1 text-[#d0bcff]" />
                  )}
                  {isCopiedImage ? t.copiedImage : t.copyImage}
                </button>
                <button
                  onClick={handleShare}
                  className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] active:scale-95 text-[#e3e2e6] text-xs font-semibold transition-colors"
                >
                  <Share2 className="w-4 h-4 mb-1 text-[#ffdcc2]" />
                  {t.shareQr}
                </button>
              </div>
            </div>

            {/* Customization Drawer Toggle */}
            <div className="bg-[#1a1b1f] rounded-[24px] overflow-hidden border border-white/[0.04]">
              <button
                type="button"
                onClick={() => setShowStyleSettings(!showStyleSettings)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-[#c4c7c5] hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#a8f09b]" />
                  <span>{t.customizeStyle}</span>
                </div>
                <span className="text-[11px] text-[#8e918f]">
                  {showStyleSettings ? '▲' : '▼'}
                </span>
              </button>

              {showStyleSettings && (
                <div className="p-5 pt-0 border-t border-white/[0.04] space-y-3.5">
                  <div>
                    <label className="text-[11px] font-medium text-[#8e918f] block mb-2">
                      {t.paletteLabel}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setSelectedColor(p);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                            selectedColor.name === p.name
                              ? 'bg-[#394738] text-[#a8f09b] ring-1 ring-[#a8f09b]'
                              : 'bg-[#282a2f] text-[#c4c7c5] hover:text-[#e3e2e6]'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: p.fg }}
                          />
                          {lang === 'ru' ? p.name : p.nameEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[#8e918f] block mb-2">
                      {t.eccLabel}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['L', 'M', 'Q', 'H'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setEcc(lvl);
                          }}
                          className={`py-2 rounded-full text-xs font-bold transition-colors ${
                            ecc === lvl
                              ? 'bg-[#a8f09b] text-[#0b3810] shadow-sm'
                              : 'bg-[#282a2f] text-[#c4c7c5] hover:text-white'
                          }`}
                        >
                          {lvl} {lvl === 'H' ? '(Max)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Decoded Content & Action Panel */}
            <div className="bg-[#1a1b1f] rounded-[24px] p-5 space-y-3 border border-white/[0.04]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#c4c7c5]">
                  {getTypeIcon()}
                  <span className="capitalize">{parsed.type.toUpperCase()}</span>
                </div>
                <button
                  onClick={handleCopyText}
                  className="text-xs text-[#a8f09b] hover:underline flex items-center gap-1 font-semibold"
                >
                  {isCopiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopiedText ? t.copiedText : t.copyText}
                </button>
              </div>

              {parsed.details && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-[#282a2f] rounded-2xl text-xs">
                  {Object.entries(parsed.details).map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-[10px] text-[#8e918f] uppercase tracking-wider">{k}</span>
                      <span className="font-semibold text-[#e3e2e6] select-all">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 rounded-2xl bg-[#121316] text-xs font-mono text-[#c4c7c5] break-all max-h-24 overflow-y-auto select-all border border-white/[0.04]">
                {rawContent}
              </div>

              {parsed.actionUrl && (
                <a
                  href={parsed.actionUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={playTapSound}
                  className="w-full py-3 px-4 rounded-full bg-[#244927] hover:bg-[#2f5c33] text-[#c4fbb8] text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4 text-[#a8f09b]" />
                  <span>
                    {parsed.type === 'url' ? t.openInBrowser : t.executeAction}
                  </span>
                </a>
              )}
            </div>

            {/* Gallery Save & Organize Form */}
            <div className="bg-[#1a1b1f] rounded-[24px] p-5 space-y-3.5 border border-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#e3e2e6] flex items-center gap-2">
                  <BookmarkPlus className="w-4 h-4 text-[#a8f09b]" />
                  {t.saveToGalleryHeader}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setIsFavorite(!isFavorite);
                  }}
                  className={`px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                    isFavorite
                      ? 'bg-[#ffdcc2] text-[#2e1500]'
                      : 'bg-[#282a2f] text-[#8e918f] hover:text-[#e3e2e6]'
                  }`}
                  aria-label="Favorite"
                >
                  <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[#2e1500]' : ''}`} />
                  <span>{isFavorite ? t.inFavorites : t.addToFavorites}</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#8e918f] block mb-1">
                  {t.qrTitleLabel}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.qrTitlePlaceholder}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                />
              </div>

              <div>
                <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-[#8e918f]' : 'text-[#575a56]'}`}>
                  {t.folderLabel}
                </label>
                <FolderSelect
                  folders={folders}
                  selectedFolderId={folderId}
                  onSelectFolder={setFolderId}
                  lang={lang}
                  theme={theme}
                  ariaLabel={t.folderLabel}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#8e918f] block mb-1">
                  {t.noteLabel}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.notePlaceholder}
                  className="w-full px-4 py-2 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] resize-none border-none"
                />
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className={`p-4 border-t sticky bottom-0 z-10 flex gap-2.5 ${
            isDark ? 'bg-[#1e1f23] border-white/[0.04]' : 'bg-white border-black/[0.06]'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-3.5 rounded-full active:scale-95 font-semibold text-xs transition-all ${
                isDark ? 'bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6]' : 'bg-[#eef1ec] hover:bg-[#e4e8e1] text-[#191c19]'
              }`}
            >
              {t.cancelBtn}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={savedSuccess}
              className={`flex-1 py-3.5 px-6 rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all ${
                savedSuccess
                  ? 'bg-[#a8f09b] text-[#0b3810]'
                  : 'bg-[#a8f09b] hover:brightness-105 text-[#0b3810]'
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.savedSuccessText} «{currentFolderName}»!</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  <span>{existingItem ? t.updateBtn : t.saveBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <TurnstileModal
        isOpen={showTurnstile}
        onClose={() => setShowTurnstile(false)}
        title={title || parsed.displayTitle}
        rawContent={rawContent}
        folderName={currentFolderName}
        lang={lang}
      />
    </>
  );
}
