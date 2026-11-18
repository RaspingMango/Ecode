export type QrCategory = 
  | 'tickets' 
  | 'loyalty' 
  | 'wifi' 
  | 'links' 
  | 'contacts' 
  | 'docs' 
  | string;

export interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

export type CodeFormat =
  | 'QR_CODE'
  | 'CODE_128'
  | 'EAN_13'
  | 'EAN_8'
  | 'UPC_A'
  | 'UPC_E'
  | 'CODE_39'
  | 'ITF'
  | 'CODABAR';

export type QrDataType = 'url' | 'wifi' | 'vcard' | 'ticket' | 'loyalty' | 'barcode' | 'phone' | 'email' | 'text';

export interface ParsedQrData {
  type: QrDataType;
  codeFormat: CodeFormat;
  rawText: string;
  displayTitle: string;
  details?: Record<string, string>;
  actionUrl?: string;
}

export interface StoredQrItem {
  id: string;
  title: string;
  rawContent: string;
  folderId: string;
  dataType: QrDataType;
  codeFormat?: CodeFormat;
  notes?: string;
  createdAt: number;
  isFavorite: boolean;
  source: 'camera' | 'screen' | 'file' | 'generated';
  style?: {
    fgColor?: string;
    bgColor?: string;
    ecc?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
  };
}

export const BARCODE_FORMATS: CodeFormat[] = [
  'CODE_128',
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'CODE_39',
  'ITF',
  'CODABAR',
];

export function is1DBarcodeFormat(format?: CodeFormat | null): boolean {
  return Boolean(format && format !== 'QR_CODE');
}

export function getBarcodeFormatLabel(format?: CodeFormat | null): string {
  switch (format) {
    case 'CODE_128': return 'Code 128';
    case 'EAN_13': return 'EAN-13';
    case 'EAN_8': return 'EAN-8';
    case 'UPC_A': return 'UPC-A';
    case 'UPC_E': return 'UPC-E';
    case 'CODE_39': return 'Code 39';
    case 'ITF': return 'ITF-14';
    case 'CODABAR': return 'Codabar';
    case 'QR_CODE':
    default:
      return 'QR Code';
  }
}

export function getJsBarcodeFormat(format: CodeFormat): string {
  switch (format) {
    case 'EAN_13': return 'EAN13';
    case 'EAN_8': return 'EAN8';
    case 'UPC_A': return 'UPC';
    case 'UPC_E': return 'UPCE';
    case 'CODE_39': return 'CODE39';
    case 'ITF': return 'ITF';
    case 'CODABAR': return 'codabar';
    case 'CODE_128':
    default:
      return 'CODE128';
  }
}

/**
 * Computes GS1 / Mod-10 check digit for EAN-13 (12 digits), EAN-8 (7 digits), UPC-A (11 digits)
 */
export function computeGs1CheckDigit(digitsWithoutCheck: string): number {
  let sum = 0;
  // Standard GS1 weight: starting from rightmost digit before check digit, weights alternate 3, 1, 3, 1...
  for (let i = 0; i < digitsWithoutCheck.length; i++) {
    const d = Number(digitsWithoutCheck[digitsWithoutCheck.length - 1 - i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

export interface BarcodeValidationResult {
  valid: boolean;
  errorKey?:
    | 'empty'
    | 'ean13Digits'
    | 'ean13CheckDigit'
    | 'ean8Digits'
    | 'ean8CheckDigit'
    | 'upcaDigits'
    | 'upcaCheckDigit'
    | 'upceDigits'
    | 'code39Chars'
    | 'itfDigits'
    | 'codabarChars'
    | 'code128Ascii';
  normalizedValue: string;
}

export function validateBarcodePayload(value: string, format: CodeFormat): BarcodeValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, errorKey: 'empty', normalizedValue: trimmed };
  }

  if (format === 'QR_CODE') {
    return { valid: true, normalizedValue: trimmed };
  }

  switch (format) {
    case 'EAN_13': {
      if (!/^\d{12,13}$/.test(trimmed)) {
        return { valid: false, errorKey: 'ean13Digits', normalizedValue: trimmed };
      }
      const expected = computeGs1CheckDigit(trimmed.slice(0, 12));
      if (trimmed.length === 13 && Number(trimmed[12]) !== expected) {
        return { valid: false, errorKey: 'ean13CheckDigit', normalizedValue: trimmed };
      }
      const full = trimmed.length === 12 ? `${trimmed}${expected}` : trimmed;
      return { valid: true, normalizedValue: full };
    }
    case 'EAN_8': {
      if (!/^\d{7,8}$/.test(trimmed)) {
        return { valid: false, errorKey: 'ean8Digits', normalizedValue: trimmed };
      }
      const expected = computeGs1CheckDigit(trimmed.slice(0, 7));
      if (trimmed.length === 8 && Number(trimmed[7]) !== expected) {
        return { valid: false, errorKey: 'ean8CheckDigit', normalizedValue: trimmed };
      }
      const full = trimmed.length === 7 ? `${trimmed}${expected}` : trimmed;
      return { valid: true, normalizedValue: full };
    }
    case 'UPC_A': {
      if (!/^\d{11,12}$/.test(trimmed)) {
        return { valid: false, errorKey: 'upcaDigits', normalizedValue: trimmed };
      }
      const expected = computeGs1CheckDigit(trimmed.slice(0, 11));
      if (trimmed.length === 12 && Number(trimmed[11]) !== expected) {
        return { valid: false, errorKey: 'upcaCheckDigit', normalizedValue: trimmed };
      }
      const full = trimmed.length === 11 ? `${trimmed}${expected}` : trimmed;
      return { valid: true, normalizedValue: full };
    }
    case 'UPC_E': {
      if (!/^[01]\d{5,7}$/.test(trimmed) && !/^\d{6,8}$/.test(trimmed)) {
        return { valid: false, errorKey: 'upceDigits', normalizedValue: trimmed };
      }
      return { valid: true, normalizedValue: trimmed };
    }
    case 'CODE_39': {
      const upper = trimmed.toUpperCase();
      if (!/^[0-9A-Z\-. $/+%]+$/.test(upper)) {
        return { valid: false, errorKey: 'code39Chars', normalizedValue: upper };
      }
      return { valid: true, normalizedValue: upper };
    }
    case 'ITF': {
      if (!/^\d+$/.test(trimmed) || trimmed.length % 2 !== 0) {
        return { valid: false, errorKey: 'itfDigits', normalizedValue: trimmed };
      }
      return { valid: true, normalizedValue: trimmed };
    }
    case 'CODABAR': {
      if (!/^[A-Da-d]?[0-9\-$:/.+]+[A-Da-d]?$/.test(trimmed)) {
        return { valid: false, errorKey: 'codabarChars', normalizedValue: trimmed };
      }
      return { valid: true, normalizedValue: trimmed };
    }
    case 'CODE_128':
    default: {
      // Standard printable ASCII (0x20-0x7E)
      if (!/^[\x20-\x7E]+$/.test(trimmed)) {
        return { valid: false, errorKey: 'code128Ascii', normalizedValue: trimmed };
      }
      return { valid: true, normalizedValue: trimmed };
    }
  }
}

export function getSampleBarcodeValue(format: CodeFormat): string {
  switch (format) {
    case 'EAN_13': return '4607004650932';
    case 'EAN_8': return '46012340';
    case 'UPC_A': return '036000291452';
    case 'UPC_E': return '01234565';
    case 'CODE_39': return 'ECODE-2026';
    case 'ITF': return '123456789012';
    case 'CODABAR': return 'A40156B';
    case 'CODE_128':
    default:
      return 'ECODE-8849201';
  }
}

export const DEFAULT_FOLDERS: Folder[] = [
  { id: 'tickets', name: 'Билеты', icon: 'Ticket', color: '#f59e0b', isDefault: true },
  { id: 'loyalty', name: 'Карты лояльности', icon: 'CreditCard', color: '#10b981', isDefault: true },
  { id: 'wifi', name: 'Wi-Fi сети', icon: 'Wifi', color: '#3b82f6', isDefault: true },
  { id: 'links', name: 'Ссылки', icon: 'Globe', color: '#8b5cf6', isDefault: true },
  { id: 'contacts', name: 'Контакты', icon: 'User', color: '#ec4899', isDefault: true },
  { id: 'docs', name: 'Документы & Другое', icon: 'FileText', color: '#64748b', isDefault: true },
];

/**
 * Parses raw text from a scanned QR code or 1D barcode and returns structured metadata
 */
export function parseQrContent(raw: string, codeFormat: CodeFormat = 'QR_CODE'): ParsedQrData {
  const trimmed = raw.trim();

  // If 1D barcode format, classify directly as barcode / loyalty retail code
  if (is1DBarcodeFormat(codeFormat)) {
    const formatLabel = getBarcodeFormatLabel(codeFormat);
    const isRetail = codeFormat === 'EAN_13' || codeFormat === 'EAN_8' || codeFormat === 'UPC_A' || codeFormat === 'UPC_E';
    return {
      type: isRetail ? 'loyalty' : 'barcode',
      codeFormat,
      rawText: trimmed,
      displayTitle: `${formatLabel}: ${trimmed}`,
      details: {
        'Формат': formatLabel,
        'Значение': trimmed,
      },
    };
  }

  // 1. Wi-Fi: WIFI:S:MySSID;T:WPA;P:MyPassword;;
  if (trimmed.startsWith('WIFI:') || trimmed.startsWith('wifi:')) {
    const ssidMatch = trimmed.match(/S:([^;]+)/i);
    const passMatch = trimmed.match(/P:([^;]+)/i);
    const typeMatch = trimmed.match(/T:([^;]+)/i);
    const hiddenMatch = trimmed.match(/H:([^;]+)/i);

    const ssid = ssidMatch ? ssidMatch[1] : 'Неизвестная сеть';
    const pass = passMatch ? passMatch[1] : '';
    const auth = typeMatch ? typeMatch[1] : 'WPA';

    return {
      type: 'wifi',
      codeFormat,
      rawText: trimmed,
      displayTitle: `Wi-Fi: ${ssid}`,
      details: {
        'Сеть (SSID)': ssid,
        'Пароль': pass || '(Без пароля)',
        'Шифрование': auth,
        'Скрытая сеть': hiddenMatch && hiddenMatch[1] === 'true' ? 'Да' : 'Нет',
      },
    };
  }

  // 2. vCard / MECARD (Contact)
  if (trimmed.startsWith('BEGIN:VCARD') || trimmed.startsWith('MECARD:')) {
    const fnMatch = trimmed.match(/FN:(.+)/i) || trimmed.match(/N:([^;]+)/i);
    const telMatch = trimmed.match(/TEL[^:]*:([0-9+\s()-]+)/i);
    const emailMatch = trimmed.match(/EMAIL[^:]*:([^\s\n\r]+)/i);
    const orgMatch = trimmed.match(/ORG:(.+)/i);

    const name = fnMatch ? fnMatch[1].trim() : 'Контакт';
    return {
      type: 'vcard',
      codeFormat,
      rawText: trimmed,
      displayTitle: name,
      details: {
        'Имя': name,
        ...(telMatch ? { 'Телефон': telMatch[1].trim() } : {}),
        ...(emailMatch ? { 'Email': emailMatch[1].trim() } : {}),
        ...(orgMatch ? { 'Организация': orgMatch[1].trim() } : {}),
      },
      actionUrl: telMatch ? `tel:${telMatch[1].trim().replace(/\s+/g, '')}` : undefined,
    };
  }

  // 3. URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      let title = url.hostname;
      if (url.pathname && url.pathname !== '/') {
        title += url.pathname;
      }
      return {
        type: 'url',
        codeFormat,
        rawText: trimmed,
        displayTitle: title,
        actionUrl: trimmed,
      };
    } catch {
      return {
        type: 'url',
        codeFormat,
        rawText: trimmed,
        displayTitle: trimmed,
        actionUrl: trimmed,
      };
    }
  }

  // 4. Phone
  if (trimmed.startsWith('tel:') || /^\+?[0-9\s()-]{7,}$/.test(trimmed)) {
    const cleanNumber = trimmed.replace(/^tel:/i, '').trim();
    return {
      type: 'phone',
      codeFormat,
      rawText: trimmed,
      displayTitle: `Тел: ${cleanNumber}`,
      actionUrl: `tel:${cleanNumber.replace(/\s+/g, '')}`,
    };
  }

  // 5. Email
  if (trimmed.startsWith('mailto:') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    const cleanEmail = trimmed.replace(/^mailto:/i, '').split('?')[0].trim();
    return {
      type: 'email',
      codeFormat,
      rawText: trimmed,
      displayTitle: `Email: ${cleanEmail}`,
      actionUrl: trimmed.startsWith('mailto:') ? trimmed : `mailto:${cleanEmail}`,
    };
  }

  // 6. Ticket or Loyalty heuristics
  const lower = trimmed.toLowerCase();
  if (lower.includes('ticket') || lower.includes('билет') || lower.includes('pass') || lower.includes('boarding')) {
    return {
      type: 'ticket',
      codeFormat,
      rawText: trimmed,
      displayTitle: `Билет: ${trimmed.slice(0, 24)}...`,
    };
  }

  if (lower.includes('loyalty') || lower.includes('карты') || lower.includes('card') || lower.includes('bonus') || lower.includes('discount')) {
    return {
      type: 'loyalty',
      codeFormat,
      rawText: trimmed,
      displayTitle: `Карта: ${trimmed.slice(0, 24)}...`,
    };
  }

  // Default Plain Text
  const shortText = trimmed.length > 32 ? trimmed.slice(0, 32) + '...' : trimmed;
  return {
    type: 'text',
    codeFormat,
    rawText: trimmed,
    displayTitle: shortText || 'QR Код',
  };
}

/**
 * Determine default suggested folder based on data type
 */
export function suggestFolderForType(type: QrDataType): string {
  switch (type) {
    case 'ticket':
      return 'tickets';
    case 'loyalty':
      return 'loyalty';
    case 'barcode':
      return 'loyalty';
    case 'wifi':
      return 'wifi';
    case 'url':
      return 'links';
    case 'vcard':
    case 'phone':
    case 'email':
      return 'contacts';
    default:
      return 'docs';
  }
}

/**
 * Filter & sort helper for gallery items
 */
export function filterAndSortQrItems(
  items: StoredQrItem[],
  folderId: string,
  searchQuery: string,
  sortBy: 'newest' | 'oldest' | 'alphabetical' | 'favoritesFirst'
): StoredQrItem[] {
  let filtered = [...items];

  // Folder filter
  if (folderId !== 'all') {
    if (folderId === 'favorites') {
      filtered = filtered.filter(item => item.isFavorite);
    } else {
      filtered = filtered.filter(item => item.folderId === folderId);
    }
  }

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.rawContent.toLowerCase().includes(q) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );
  }

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'favoritesFirst') {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      return b.createdAt - a.createdAt;
    }
    if (sortBy === 'oldest') {
      return a.createdAt - b.createdAt;
    }
    if (sortBy === 'alphabetical') {
      return a.title.localeCompare(b.title, 'ru');
    }
    // 'newest'
    return b.createdAt - a.createdAt;
  });

  return filtered;
}

/**
 * Builds formatted string for WiFi QR code
 */
export function buildWifiQrString(ssid: string, pass: string, auth: string = 'WPA', hidden: boolean = false): string {
  const cleanSsid = ssid.replace(/([\\;,:"])/g, '\\$1');
  const cleanPass = pass.replace(/([\\;,:"])/g, '\\$1');
  return `WIFI:S:${cleanSsid};T:${auth};P:${cleanPass};H:${hidden ? 'true' : 'false'};;`;
}

/**
 * Builds formatted vCard 3.0 string
 */
export function buildVCardQrString(name: string, phone: string, email: string, org: string): string {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    phone ? `TEL;TYPE=CELL:${phone}` : '',
    email ? `EMAIL:${email}` : '',
    org ? `ORG:${org}` : '',
    'END:VCARD'
  ].filter(Boolean).join('\n');
}
