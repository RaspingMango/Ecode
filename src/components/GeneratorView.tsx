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
  Palette,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Folder,
  StoredQrItem,
  QrDataType,
  buildWifiQrString,
  buildVCardQrString,
  suggestFolderForType,
} from '../utils/qrLogic';
import { generateQrDataUrl, downloadQr, copyQrToClipboard } from '../utils/qrRenderer';
import { TurnstileModal } from './TurnstileModal';
import { playTapSound, triggerHaptic } from '../utils/audio';
import { Language, TRANSLATIONS, getLocalizedFolderName } from '../utils/i18n';

interface GeneratorViewProps {
  folders: Folder[];
  lang?: Language;
  onSaveToGallery: (item: Omit<StoredQrItem, 'id' | 'createdAt'>) => void;
  onOpenGallery: () => void;
}

type GeneratorTemplate = 'text' | 'url' | 'wifi' | 'ticket' | 'loyalty' | 'vcard' | 'phone';

const COLOR_PRESETS = [
  { name: 'Классический ч/б', nameEn: 'Classic B/W', fg: '#000000', bg: '#ffffff' },
  { name: 'Мятный M3', nameEn: 'Mint M3', fg: '#003a0f', bg: '#e8f5e9' },
  { name: 'Сапфир M3', nameEn: 'Sapphire M3', fg: '#00325b', bg: '#e3f2fd' },
  { name: 'Аметист M3', nameEn: 'Amethyst M3', fg: '#381e72', bg: '#f3e5f5' },
  { name: 'AMOLED Тёмный', nameEn: 'AMOLED Dark', fg: '#a8f09b', bg: '#121316' },
];

export function GeneratorView({ folders, lang = 'ru', onSaveToGallery, onOpenGallery }: GeneratorViewProps) {
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
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [ecc, setEcc] = useState<'L' | 'M' | 'Q' | 'H'>('M');

  // Status & Previews
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

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
    vcardName,
    phoneNumber,
    urlContent,
    textContent,
    titleManuallyEdited,
    lang,
  ]);

  useEffect(() => {
    generateQrDataUrl(rawQrString, {
      fgColor: selectedColor.fg,
      bgColor: selectedColor.bg,
      ecc,
      margin: 2,
      width: 500,
    })
      .then(setPreviewDataUrl)
      .catch(console.error);
  }, [rawQrString, selectedColor, ecc]);

  const handleSave = () => {
    playTapSound();
    triggerHaptic([30, 20, 50]);

    let dataType: QrDataType = 'text';
    if (template === 'url') dataType = 'url';
    if (template === 'wifi') dataType = 'wifi';
    if (template === 'ticket') dataType = 'ticket';
    if (template === 'loyalty') dataType = 'loyalty';
    if (template === 'vcard') dataType = 'vcard';
    if (template === 'phone') dataType = 'phone';

    onSaveToGallery({
      title: customTitle.trim() || 'Ecode QR',
      rawContent: rawQrString,
      folderId: selectedFolderId,
      dataType,
      notes: notes.trim(),
      isFavorite: false,
      source: 'generated',
      style: {
        fgColor: selectedColor.fg,
        bgColor: selectedColor.bg,
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
    playTapSound();
    await downloadQr(rawQrString, customTitle || 'ecode-qr', format, {
      fgColor: selectedColor.fg,
      bgColor: selectedColor.bg,
      ecc,
    });
  };

  const handleCopyImage = async () => {
    playTapSound();
    const success = await copyQrToClipboard(rawQrString, {
      fgColor: selectedColor.fg,
      bgColor: selectedColor.bg,
      ecc,
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
                  ? 'bg-[#a8f09b] text-[#0b3810] font-bold shadow-md'
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
            <span className="w-2.5 h-2.5 rounded-full bg-[#a8f09b]" />
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
                    className="w-4 h-4 rounded text-[#a8f09b] focus:ring-[#a8f09b] bg-[#282a2f] border-none"
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
                  placeholder="QR Name"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#c4c7c5] block mb-1">
                  {t.folderLabel}
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#282a2f] text-xs text-[#e3e2e6] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] cursor-pointer border-none"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {getLocalizedFolderName(f.id, f.name, lang)}
                    </option>
                  ))}
                </select>
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
              <Sparkles className="w-4 h-4 text-[#a8f09b]" />
              {t.liveVectorPreview}
            </span>
            <button
              onClick={() => {
                playTapSound();
                setShowTurnstile(true);
              }}
              className="px-3 py-1.5 rounded-full bg-[#244927] hover:bg-[#2f5c33] text-[#c4fbb8] text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95"
            >
              <Maximize2 className="w-3 h-3 text-[#a8f09b]" />
              <span>{t.turnstileBtn}</span>
            </button>
          </div>

          {/* Clean Preview Center Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-[#1a1b1f] rounded-[24px] border border-white/[0.04]">
            <div
              className="p-4 rounded-3xl shadow-xl transition-all my-2 border border-black/10"
              style={{ backgroundColor: selectedColor.bg }}
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="QR Preview"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain image-rendering-pixelated"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#a8f09b] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <span className="text-xs text-[#8e918f] font-medium">
              {t.pristineVectorQuality}
            </span>
          </div>

          {/* Material You Palette Presets */}
          <div className="bg-[#1a1b1f] rounded-[24px] p-3.5 space-y-2 border border-white/[0.04]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#c4c7c5]">
              <div className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#a8f09b]" />
                <span>{t.styleLabel}</span>
              </div>
              <span className="text-[11px] text-[#8e918f]">
                {lang === 'ru' ? selectedColor.name : selectedColor.nameEn}
              </span>
            </div>

            <div className="flex gap-2">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setSelectedColor(p);
                  }}
                  className={`flex-1 py-1.5 rounded-full border flex items-center justify-center transition-all ${
                    selectedColor.name === p.name
                      ? 'border-[#a8f09b] bg-[#394738]'
                      : 'border-white/[0.06] bg-[#282a2f]'
                  }`}
                  title={lang === 'ru' ? p.name : p.nameEn}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: p.fg }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Export & Save Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleSave}
              disabled={savedSuccess}
              className={`w-full py-3.5 px-5 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all ${
                savedSuccess
                  ? 'bg-[#a8f09b] text-[#0b3810] font-bold'
                  : 'bg-[#a8f09b] hover:brightness-105 text-[#0b3810]'
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
                className="py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#a8f09b]" />
                <span>PNG</span>
              </button>
              <button
                onClick={() => handleDownload('svg')}
                className="py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#a8c7fa]" />
                <span>SVG</span>
              </button>
              <button
                onClick={handleCopyImage}
                className="py-2.5 px-2 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                {copiedImage ? (
                  <Check className="w-3.5 h-3.5 text-[#a8f09b]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#d0bcff]" />
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
        title={customTitle || 'Ecode QR'}
        rawContent={rawQrString}
        folderName={getLocalizedFolderName(selectedFolderId, folders.find((f) => f.id === selectedFolderId)?.name || '', lang)}
        lang={lang}
      />
    </div>
  );
}
