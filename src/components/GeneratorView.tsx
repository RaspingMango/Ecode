import { useState, useMemo, useEffect } from 'react';
import {
  Type,
  Globe,
  Wifi,
  Ticket,
  CreditCard,
  User,
  Phone,
  BookmarkPlus,
  Download,
  Copy,
  Maximize2,
  Check,
  CheckCircle2,
  Sparkles,
  Barcode,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  BARCODE_FORMATS,
  BarcodeValidationResult,
  CodeFormat,
  Folder,
  StoredQrItem,
  QrDataType,
  buildWifiQrString,
  buildVCardQrString,
  getBarcodeFormatLabel,
  getSampleBarcodeValue,
  is1DBarcodeFormat,
  suggestFolderForType,
  validateBarcodePayload,
} from '../utils/qrLogic';
import { generateQrDataUrl, downloadQr, copyQrToClipboard } from '../utils/qrRenderer';
import { TurnstileModal } from './TurnstileModal';
import { playTapSound, triggerHaptic } from '../utils/audio';
import { Language, TRANSLATIONS, getLocalizedFolderName } from '../utils/i18n';
import { ThemeMode } from '../utils/theme';
import { FolderSelect } from './FolderSelect';
import { CodeColorPicker } from './CodeColorPicker';

interface GeneratorViewProps {
  folders: Folder[];
  lang?: Language;
  theme?: ThemeMode;
  onSaveToGallery: (item: Omit<StoredQrItem, 'id' | 'createdAt'>) => void;
  onOpenGallery: () => void;
}

type GeneratorTemplate = 'text' | 'url' | 'wifi' | 'ticket' | 'loyalty' | 'barcode' | 'vcard' | 'phone';

export function GeneratorView({ folders, lang = 'ru', theme = 'dark', onSaveToGallery, onOpenGallery }: GeneratorViewProps) {
  const isDark = theme === 'dark';
  const t = TRANSLATIONS[lang];
  const [template, setTemplate] = useState<GeneratorTemplate>('text');

  // Form Fields
  const [textContent, setTextContent] = useState('');
  const [urlContent, setUrlContent] = useState('https://');

  // Wi-Fi fields
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [wifiAuth, setWifiAuth] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [wifiHidden, setWifiHidden] = useState(false);

  // Ticket fields
  const [ticketEvent, setTicketEvent] = useState('');
  const [ticketSeat, setTicketSeat] = useState('');
  const [ticketCode, setTicketCode] = useState('');

  // Loyalty card fields
  const [loyaltyStore, setLoyaltyStore] = useState('');
  const [loyaltyNumber, setLoyaltyNumber] = useState('');

  // Barcode fields
  const [barcodeFormat, setBarcodeFormat] = useState<CodeFormat>('CODE_128');
  const [barcodeValue, setBarcodeValue] = useState<string>(() => getSampleBarcodeValue('CODE_128'));

  // vCard fields
  const [vcardName, setVcardName] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [vcardOrg, setVcardOrg] = useState('');

  // Phone field
  const [phoneNumber, setPhoneNumber] = useState('');

  // Metadata & Customization
  const [customTitle, setCustomTitle] = useState('');
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState('docs');
  const [notes, setNotes] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [ecc, setEcc] = useState<'L' | 'M' | 'Q' | 'H'>('M');

  // Status & Previews
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const activeCodeFormat: CodeFormat = template === 'barcode' ? barcodeFormat : 'QR_CODE';
  const isBarcodeMode = is1DBarcodeFormat(activeCodeFormat);

  const barcodeValidation = useMemo<BarcodeValidationResult>(() => {
    if (!isBarcodeMode) {
      return { valid: true, normalizedValue: '' };
    }
    return validateBarcodePayload(barcodeValue, barcodeFormat);
  }, [isBarcodeMode, barcodeValue, barcodeFormat]);

  const barcodeErrorText = useMemo(() => {
    if (!isBarcodeMode || barcodeValidation.valid) return null;
    switch (barcodeValidation.errorKey) {
      case 'empty': return t.barcodeErrEmpty;
      case 'ean13Digits': return t.barcodeErrEan13Digits;
      case 'ean13CheckDigit': return t.barcodeErrEan13Check;
      case 'ean8Digits': return t.barcodeErrEan8Digits;
      case 'ean8CheckDigit': return t.barcodeErrEan8Check;
      case 'upcaDigits': return t.barcodeErrUpcaDigits;
      case 'upcaCheckDigit': return t.barcodeErrUpcaCheck;
      case 'upceDigits': return t.barcodeErrUpceDigits;
      case 'code39Chars': return t.barcodeErrCode39;
      case 'itfDigits': return t.barcodeErrItf;
      case 'codabarChars': return t.barcodeErrCodabar;
      case 'code128Ascii':
      default:
        return t.barcodeErrCode128;
    }
  }, [isBarcodeMode, barcodeValidation, t]);

  // Compute Raw String based on template
  const rawQrString = useMemo(() => {
    switch (template) {
      case 'text':
        return textContent.trim() || (lang === 'ru' ? 'Привет от Ecode!' : 'Hello from Ecode!');
      case 'url':
        return urlContent.trim() || 'https://google.com';
      case 'wifi':
        return buildWifiQrString(
          wifiSsid.trim() || 'MyNetwork',
          wifiPass.trim(),
          wifiAuth,
          wifiHidden
        );
      case 'ticket':
        return `TICKET:${ticketEvent || 'EVENT'}:${ticketSeat || 'GENERAL'}:${ticketCode || Date.now()}`;
      case 'loyalty':
        return `LOYALTY:${loyaltyStore || 'STORE'}:${loyaltyNumber || '123456789'}`;
      case 'barcode':
        return barcodeValidation.normalizedValue || barcodeValue.trim();
      case 'vcard':
        return buildVCardQrString(
          vcardName.trim() || (lang === 'ru' ? 'Имя Фамилия' : 'John Doe'),
          vcardPhone.trim(),
          vcardEmail.trim(),
          vcardOrg.trim()
        );
      case 'phone':
        return `tel:${phoneNumber.replace(/\s+/g, '')}`;
      default:
        return textContent.trim() || 'Ecode QR';
    }
  }, [
    template,
    textContent,
    urlContent,
    wifiSsid,
    wifiPass,
    wifiAuth,
    wifiHidden,
    ticketEvent,
    ticketSeat,
    ticketCode,
    loyaltyStore,
    loyaltyNumber,
    barcodeValidation.normalizedValue,
    barcodeValue,
    vcardName,
    vcardPhone,
    vcardEmail,
    vcardOrg,
    phoneNumber,
    lang,
  ]);

  // Determine auto title & suggested folder
  useEffect(() => {
    let type: QrDataType = 'text';
    let defaultTitle = '';

    if (template === 'text') {
      type = 'text';
      defaultTitle = textContent.slice(0, 24) || (lang === 'ru' ? 'Текстовый QR' : 'Text QR');
    } else if (template === 'url') {
      type = 'url';
      defaultTitle = urlContent.replace(/^https?:\/\//, '').split('/')[0] || (lang === 'ru' ? 'Веб-ссылка' : 'Web Link');
    } else if (template === 'wifi') {
      type = 'wifi';
      defaultTitle = wifiSsid ? `Wi-Fi: ${wifiSsid}` : (lang === 'ru' ? 'Wi-Fi сеть' : 'Wi-Fi Network');
    } else if (template === 'ticket') {
      type = 'ticket';
      defaultTitle = ticketEvent ? `${lang === 'ru' ? 'Билет' : 'Ticket'}: ${ticketEvent}` : (lang === 'ru' ? 'Электронный билет' : 'E-Ticket');
    } else if (template === 'loyalty') {
      type = 'loyalty';
      defaultTitle = loyaltyStore ? `${lang === 'ru' ? 'Карта' : 'Card'}: ${loyaltyStore}` : (lang === 'ru' ? 'Карта лояльности' : 'Loyalty Card');
    } else if (template === 'barcode') {
      type = 'barcode';
      const fmtLabel = getBarcodeFormatLabel(barcodeFormat);
      const val = barcodeValidation.normalizedValue || barcodeValue.trim();
      defaultTitle = val ? `${fmtLabel}: ${val}` : fmtLabel;
    } else if (template === 'vcard') {
      type = 'vcard';
      defaultTitle = vcardName || (lang === 'ru' ? 'Контакт vCard' : 'vCard Contact');
    } else if (template === 'phone') {
      type = 'phone';
      defaultTitle = phoneNumber ? `Tel: ${phoneNumber}` : (lang === 'ru' ? 'Телефон' : 'Phone');
    }

    setSelectedFolderId(suggestFolderForType(type));
    if (!titleManuallyEdited) {
      setCustomTitle(defaultTitle);
    }
  }, [
    template,
    wifiSsid,
    ticketEvent,
    loyaltyStore,
    barcodeFormat,
    barcodeValidation.normalizedValue,
    barcodeValue,
    vcardName,
    phoneNumber,
    urlContent,
    textContent,
    titleManuallyEdited,
    lang,
  ]);

  useEffect(() => {
    if (isBarcodeMode && !barcodeValidation.valid) {
      setPreviewDataUrl('');
      return;
    }

    generateQrDataUrl(rawQrString, {
      fgColor,
      bgColor,
      ecc,
      margin: 2,
      width: 500,
      codeFormat: activeCodeFormat,
    })
      .then(setPreviewDataUrl)
      .catch(() => setPreviewDataUrl(''));
  }, [rawQrString, fgColor, bgColor, ecc, activeCodeFormat, isBarcodeMode, barcodeValidation.valid]);

  const handleSelectBarcodeFormat = (fmt: CodeFormat) => {
    playTapSound();
    const isCurrentSample = BARCODE_FORMATS.some((other) => getSampleBarcodeValue(other) === barcodeValue.trim());
    setBarcodeFormat(fmt);
    if (!barcodeValue.trim() || isCurrentSample || !validateBarcodePayload(barcodeValue, fmt).valid) {
      setBarcodeValue(getSampleBarcodeValue(fmt));
    }
  };

  const canGenerate = !isBarcodeMode || barcodeValidation.valid;

  const handleSave = () => {
    if (!canGenerate) return;
    playTapSound();
    triggerHaptic([30, 20, 50]);

    let dataType: QrDataType = 'text';
    if (template === 'url') dataType = 'url';
    if (template === 'wifi') dataType = 'wifi';
    if (template === 'ticket') dataType = 'ticket';
    if (template === 'loyalty') dataType = 'loyalty';
    if (template === 'barcode') {
      const isRetail = barcodeFormat === 'EAN_13' || barcodeFormat === 'EAN_8' || barcodeFormat === 'UPC_A' || barcodeFormat === 'UPC_E';
      dataType = isRetail ? 'loyalty' : 'barcode';
    }
    if (template === 'vcard') dataType = 'vcard';
    if (template === 'phone') dataType = 'phone';

    onSaveToGallery({
      title: customTitle.trim() || 'Ecode',
      rawContent: rawQrString,
      folderId: selectedFolderId,
      dataType,
      codeFormat: activeCodeFormat,
      notes: notes.trim(),
      isFavorite: false,
      source: 'generated',
      style: {
        fgColor,
        bgColor,
        ecc,
      },
    });

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a8f09b', '#78dc77', '#ffdcc2'],
      });
    } catch {}

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onOpenGallery();
    }, 900);
  };

  const handleDownload = async (format: 'png' | 'svg') => {
    if (!canGenerate) return;
    playTapSound();
    await downloadQr(rawQrString, customTitle || 'ecode', format, {
      fgColor,
      bgColor,
      ecc,
      codeFormat: activeCodeFormat,
    });
  };

  const handleCopyImage = async () => {
    if (!canGenerate) return;
    playTapSound();
    const success = await copyQrToClipboard(rawQrString, {
      fgColor,
      bgColor,
      ecc,
      codeFormat: activeCodeFormat,
    });
    if (success) {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    }
  };

  const templatesList = [
    { id: 'text', label: t.templateText, icon: Type },
    { id: 'url', label: t.templateUrl, icon: Globe },
    { id: 'wifi', label: t.templateWifi, icon: Wifi },
    { id: 'ticket', label: t.templateTicket, icon: Ticket },
    { id: 'loyalty', label: t.templateLoyalty, icon: CreditCard },
    { id: 'barcode', label: t.templateBarcode, icon: Barcode },
    { id: 'vcard', label: t.templateContact, icon: User },
    { id: 'phone', label: t.templatePhone, icon: Phone },
  ] as const;

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4 py-2 space-y-4">
      {/* Material You 3 Filter Chips for Templates */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {templatesList.map((tItem) => {
          const Icon = tItem.icon;
          const isSelected = template === tItem.id;
          return (
            <button
              key={tItem.id}
              onClick={() => {
                playTapSound();
                setTemplate(tItem.id);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                isSelected
                  ? isDark
                    ? 'bg-[#a8f09b] text-[#0b3810] font-bold shadow-md'
                    : 'bg-[#2e6c31] text-white font-bold shadow-md'
                  : 'bg-[#1e1f23] text-[#c4c7c5] hover:bg-[#282a2f] border border-white/[0.04]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tItem.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Input Form Column (7 cols on desktop) */}
        <div className="md:col-span-7 bg-[#1e1f23] rounded-[28px] p-5 sm:p-6 space-y-4 shadow-xl border border-white/[0.04]">
          <h4 className="font-bold text-sm text-[#e3e2e6] flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-[#a8f09b]' : 'bg-[#2e6c31]'}`} />
            <span>{t.generatorTitle}</span>
          </h4>

          {template === 'text' && (
            <div>
              <label className="text-xs font-semibold text-[#c4c7c5] block mb-1.5">
                {t.enterTextLabel}
              </label>
              <textarea
                rows={4}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={t.enterTextPlaceholder}
                className="w-full px-4 py-3 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] resize-none border-none"
              />
            </div>
          )}

          {template === 'url' && (
            <div>
              <label className="text-xs font-semibold text-[#c4c7c5] block mb-1.5">
                {t.enterUrlLabel}
              </label>
              <input
                type="url"
                value={urlContent}
                onChange={(e) => setUrlContent(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
              />
            </div>
          )}

          {template === 'wifi' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1">
                  {t.wifiSsidLabel}
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="Home_WiFi_5G"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1">
                  {t.wifiPassLabel}
                </label>
                <input
                  type="text"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  placeholder="SecretPassword"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                />
              </div>

              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="text-[11px] font-medium text-[#8e918f] block mb-1">
                    {t.wifiAuthLabel}
                  </label>
                  <select
                    value={wifiAuth}
                    onChange={(e) => setWifiAuth(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                  >
                    <option value="WPA">WPA/WPA2/WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">{lang === 'ru' ? 'Без пароля (Open)' : 'No Password (Open)'}</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-4 text-xs text-[#c4c7c5]">
                  <input
                    type="checkbox"
                    checked={wifiHidden}
                    onChange={(e) => setWifiHidden(e.target.checked)}
                    className={`w-4 h-4 rounded bg-[#282a2f] border-none ${
                      isDark ? 'accent-[#a8f09b]' : 'accent-[#2e6c31]'
                    }`}
                  />
                  <span>{t.wifiHiddenLabel}</span>
                </label>
              </div>
            </div>
          )}

          {template === 'ticket' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1">
                  {t.ticketEventLabel}
                </label>
                <input
                  type="text"
                  value={ticketEvent}
                  onChange={(e) => setTicketEvent(e.target.value)}
                  placeholder={t.ticketEventPlaceholder}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-[#8e918f] block mb-1">
                    {t.ticketSeatLabel}
                  </label>
                  <input
                    type="text"
                    value={ticketSeat}
                    onChange={(e) => setTicketSeat(e.target.value)}
                    placeholder="Row 5, Seat 12"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#8e918f] block mb-1">
                    {t.ticketCodeLabel}
                  </label>
                  <input
                    type="text"
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value)}
                    placeholder="TICK-9948201"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                  />
                </div>
              </div>
            </div>
          )}

          {template === 'loyalty' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1">
                  {t.loyaltyStoreLabel}
                </label>
                <input
                  type="text"
                  value={loyaltyStore}
                  onChange={(e) => setLoyaltyStore(e.target.value)}
                  placeholder={t.loyaltyStorePlaceholder}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1">
                  {t.loyaltyNumberLabel}
                </label>
                <input
                  type="text"
                  value={loyaltyNumber}
                  onChange={(e) => setLoyaltyNumber(e.target.value)}
                  placeholder="2984920194827"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none font-mono"
                />
              </div>
            </div>
          )}

          {template === 'barcode' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-2">
                  {t.barcodeFormatSelectLabel}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BARCODE_FORMATS.map((fmt) => {
                    const isFmtSelected = barcodeFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => handleSelectBarcodeFormat(fmt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isFmtSelected
                            ? isDark
                              ? 'bg-[#a8f09b] text-[#0b3810] shadow-sm'
                              : 'bg-[#2e6c31] text-white shadow-sm'
                            : 'bg-[#282a2f] text-[#c4c7c5] hover:bg-[#33353a]'
                        }`}
                      >
                        {getBarcodeFormatLabel(fmt)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#c4c7c5]">
                    {t.barcodeValueLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setBarcodeValue(getSampleBarcodeValue(barcodeFormat));
                    }}
                    className={`text-[11px] font-semibold hover:underline flex items-center gap-1 ${
                      isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'
                    }`}
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>{t.barcodeSampleFill}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  placeholder={getSampleBarcodeValue(barcodeFormat)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none font-mono"
                />
              </div>

              {barcodeErrorText && (
                <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
                  isDark
                    ? 'bg-[#371e1d] text-[#ffdad6] border-[#ffb4ab]/20'
                    : 'bg-[#fde8e8] text-[#690005] border-[#b3261e]/20'
                }`}>
                  <AlertCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#ffb4ab]' : 'text-[#b3261e]'}`} />
                  <span>{barcodeErrorText}</span>
                </div>
              )}
            </div>
          )}

          {template === 'vcard' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1">
                  {t.vcardNameLabel}
                </label>
                <input
                  type="text"
                  value={vcardName}
                  onChange={(e) => setVcardName(e.target.value)}
                  placeholder="Alex Smith"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-[#8e918f] block mb-1">
                    {t.vcardPhoneLabel}
                  </label>
                  <input
                    type="tel"
                    value={vcardPhone}
                    onChange={(e) => setVcardPhone(e.target.value)}
                    placeholder="+1 555 123-4567"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#8e918f] block mb-1">
                    {t.vcardEmailLabel}
                  </label>
                  <input
                    type="email"
                    value={vcardEmail}
                    onChange={(e) => setVcardEmail(e.target.value)}
                    placeholder="alex@techcorp.com"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1">
                  {t.vcardOrgLabel}
                </label>
                <input
                  type="text"
                  value={vcardOrg}
                  onChange={(e) => setVcardOrg(e.target.value)}
                  placeholder="Google, Lead Engineer"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                />
              </div>
            </div>
          )}

          {template === 'phone' && (
            <div>
              <label className="text-xs font-semibold text-[#c4c7c5] block mb-1.5">
                {t.phoneLabel}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 800 555-0199"
                className="w-full px-4 py-3 rounded-2xl bg-[#282a2f] text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
              />
            </div>
          )}

          {/* Organizing fields (Title, Folder, Notes) */}
          <div className="pt-3 border-t border-white/[0.04] space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1">
                  {t.nameForGallery}
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    setTitleManuallyEdited(true);
                  }}
                  placeholder="Ecode"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1.5">
                  {t.folderLabel}
                </label>
                <FolderSelect
                  folders={folders}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={setSelectedFolderId}
                  lang={lang}
                  theme={theme}
                  ariaLabel={t.folderLabel}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#8e918f] block mb-1">
                {t.noteLabel}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notePlaceholder}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
              />
            </div>
          </div>
        </div>

        {/* Live Pristine Preview Column (5 cols on desktop) */}
        <div className="md:col-span-5 flex flex-col justify-between bg-[#1e1f23] rounded-[28px] p-5 sm:p-6 shadow-xl space-y-4 border border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#e3e2e6] flex items-center gap-1.5">
              <Sparkles className={`w-4 h-4 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
              {t.liveVectorPreview}
            </span>
            <button
              onClick={() => {
                if (!canGenerate) return;
                playTapSound();
                setShowTurnstile(true);
              }}
              disabled={!canGenerate}
              className={`px-3 py-1.5 rounded-full disabled:opacity-40 text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95 ${
                isDark
                  ? 'bg-[#244927] hover:bg-[#2f5c33] text-[#c4fbb8]'
                  : 'bg-[#e8f5e9] hover:bg-[#d7eed9] text-[#1b5e20]'
              }`}
            >
              <Maximize2 className={`w-3 h-3 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
              <span>{t.turnstileBtn}</span>
            </button>
          </div>

          {/* Clean Preview Center Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-[#1a1b1f] rounded-[24px] border border-white/[0.04]">
            <div
              className={`rounded-3xl shadow-xl transition-all my-2 border border-black/10 flex items-center justify-center ${
                isBarcodeMode ? 'w-full px-4 py-5' : 'p-4'
              }`}
              style={{ backgroundColor: bgColor }}
            >
              {isBarcodeMode && barcodeErrorText ? (
                <div className="w-full h-36 flex flex-col items-center justify-center text-center px-3 gap-2">
                  <Barcode className="w-8 h-8 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">{barcodeErrorText}</span>
                </div>
              ) : previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt={isBarcodeMode ? 'Barcode Preview' : 'QR Preview'}
                  className={
                    isBarcodeMode
                      ? 'w-full h-36 sm:h-40 object-contain'
                      : 'w-48 h-48 sm:w-56 sm:h-56 object-contain image-rendering-pixelated'
                  }
                />
              ) : (
                <div className={isBarcodeMode ? 'w-full h-36 flex items-center justify-center' : 'w-48 h-48 flex items-center justify-center'}>
                  <div className={`w-6 h-6 border-2 ${isDark ? 'border-[#a8f09b]' : 'border-[#2e6c31]'} border-t-transparent rounded-full animate-spin`} />
                </div>
              )}
            </div>
            <span className="text-xs text-[#8e918f] font-medium">
              {isBarcodeMode
                ? `${getBarcodeFormatLabel(activeCodeFormat)} • ${t.pristineVectorQuality}`
                : t.pristineVectorQuality}
            </span>
          </div>

          {/* Material You Palette & Custom RGB Picker */}
          <div className="bg-[#1a1b1f] rounded-[24px] p-3.5 border border-white/[0.04]">
            <CodeColorPicker
              fgColor={fgColor}
              bgColor={bgColor}
              onChange={({ fgColor: nextFg, bgColor: nextBg }) => {
                setFgColor(nextFg);
                setBgColor(nextBg);
              }}
              lang={lang}
              theme={theme}
              compactPresets
            />
          </div>

          {/* Export & Save Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleSave}
              disabled={savedSuccess || !canGenerate}
              className={`w-full py-3.5 px-5 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-40 transition-all ${
                isDark
                  ? 'bg-[#a8f09b] hover:brightness-105 text-[#0b3810]'
                  : 'bg-[#2e6c31] hover:bg-[#255928] text-white'
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.savedToGalleryGen}</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  <span>{t.saveToGalleryGen}</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleDownload('png')}
                disabled={!canGenerate}
                className="py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] disabled:opacity-40 text-[#e3e2e6] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className={`w-3.5 h-3.5 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
                <span>PNG</span>
              </button>
              <button
                onClick={() => handleDownload('svg')}
                disabled={!canGenerate}
                className="py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] disabled:opacity-40 text-[#e3e2e6] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className={`w-3.5 h-3.5 ${isDark ? 'text-[#a8c7fa]' : 'text-[#1d4ed8]'}`} />
                <span>SVG</span>
              </button>
              <button
                onClick={handleCopyImage}
                disabled={!canGenerate}
                className="py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] disabled:opacity-40 text-[#e3e2e6] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                {copiedImage ? (
                  <Check className={`w-3.5 h-3.5 ${isDark ? 'text-[#a8f09b]' : 'text-[#2e6c31]'}`} />
                ) : (
                  <Copy className={`w-3.5 h-3.5 ${isDark ? 'text-[#d0bcff]' : 'text-[#6d28d9]'}`} />
                )}
                <span>{copiedImage ? t.copiedImage : t.copyImage}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <TurnstileModal
        isOpen={showTurnstile}
        onClose={() => setShowTurnstile(false)}
        title={customTitle || 'Ecode'}
        rawContent={rawQrString}
        codeFormat={activeCodeFormat}
        folderName={getLocalizedFolderName(selectedFolderId, folders.find((f) => f.id === selectedFolderId)?.name || '', lang)}
        lang={lang}
      />
    </div>
  );
}
