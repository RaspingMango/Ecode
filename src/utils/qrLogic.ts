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

export type QrDataType = 'url' | 'wifi' | 'vcard' | 'ticket' | 'loyalty' | 'phone' | 'email' | 'text';

export interface ParsedQrData {
  type: QrDataType;
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

export const DEFAULT_FOLDERS: Folder[] = [
  { id: 'tickets', name: 'Билеты', icon: 'Ticket', color: '#f59e0b', isDefault: true },
  { id: 'loyalty', name: 'Карты лояльности', icon: 'CreditCard', color: '#10b981', isDefault: true },
  { id: 'wifi', name: 'Wi-Fi сети', icon: 'Wifi', color: '#3b82f6', isDefault: true },
  { id: 'links', name: 'Ссылки', icon: 'Globe', color: '#8b5cf6', isDefault: true },
  { id: 'contacts', name: 'Контакты', icon: 'User', color: '#ec4899', isDefault: true },
  { id: 'docs', name: 'Документы & Другое', icon: 'FileText', color: '#64748b', isDefault: true },
];

/**
 * Parses raw text from a scanned QR code and returns structured metadata
 */
export function parseQrContent(raw: string): ParsedQrData {
  const trimmed = raw.trim();

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
        rawText: trimmed,
        displayTitle: title,
        actionUrl: trimmed,
      };
    } catch {
      return {
        type: 'url',
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
      rawText: trimmed,
      displayTitle: `Билет: ${trimmed.slice(0, 24)}...`,
    };
  }

  if (lower.includes('loyalty') || lower.includes('карты') || lower.includes('card') || lower.includes('bonus') || lower.includes('discount')) {
    return {
      type: 'loyalty',
      rawText: trimmed,
      displayTitle: `Карта: ${trimmed.slice(0, 24)}...`,
    };
  }

  // Default Plain Text
  const shortText = trimmed.length > 32 ? trimmed.slice(0, 32) + '...' : trimmed;
  return {
    type: 'text',
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
