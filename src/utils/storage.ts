import { StoredQrItem, Folder, DEFAULT_FOLDERS, buildWifiQrString, buildVCardQrString } from './qrLogic';

const STORAGE_QR_KEY = 'clean_qr_app_items_v1';
const STORAGE_FOLDERS_KEY = 'clean_qr_app_folders_v1';

export const SEED_ITEMS: StoredQrItem[] = [
  {
    id: 'seed-ticket-1',
    title: 'Билет: Концерт Stand-Up Arena',
    rawContent: 'TICKET:SU-2026-ROW14-SEAT22-VIP-SEC88192',
    folderId: 'tickets',
    dataType: 'ticket',
    notes: 'Сектор VIP, вход 3. Предъявить штрих-код на турникете.',
    createdAt: Date.now() - 3600 * 1000 * 24 * 2,
    isFavorite: true,
    source: 'camera',
  },
  {
    id: 'seed-loyalty-1',
    title: 'Золотое Яблоко - Золотая карта 20%',
    rawContent: 'LOYALTY:GOLD-APPLE:7749201948271',
    folderId: 'loyalty',
    dataType: 'loyalty',
    notes: 'Скидочная карта 20% на весь чек.',
    createdAt: Date.now() - 3600 * 1000 * 24 * 5,
    isFavorite: true,
    source: 'screen',
  },
  {
    id: 'seed-wifi-1',
    title: 'Wi-Fi: Home_SuperFiber_5G',
    rawContent: buildWifiQrString('Home_SuperFiber_5G', 'UltraFastFiber2026!', 'WPA', false),
    folderId: 'wifi',
    dataType: 'wifi',
    notes: 'Домашняя гостевая сеть на скорости 1 Гбит/с',
    createdAt: Date.now() - 3600 * 1000 * 24 * 7,
    isFavorite: false,
    source: 'generated',
  },
  {
    id: 'seed-contact-1',
    title: 'Визитка: Михаил Смирнов (CTO)',
    rawContent: buildVCardQrString('Михаил Смирнов', '+7 (999) 821-44-33', 'mikhail.cto@android-studio.dev', 'Fintech Mobile Lab'),
    folderId: 'contacts',
    dataType: 'vcard',
    notes: 'Рабочий контакт с конференции TechConf 2026',
    createdAt: Date.now() - 3600 * 1000 * 24 * 10,
    isFavorite: false,
    source: 'camera',
  },
  {
    id: 'seed-link-1',
    title: 'Официальный портал Госуслуги',
    rawContent: 'https://www.gosuslugi.ru',
    folderId: 'links',
    dataType: 'url',
    notes: 'Быстрый доступ к электронным услугам',
    createdAt: Date.now() - 3600 * 1000 * 24 * 14,
    isFavorite: false,
    source: 'file',
  },
];

export function loadStoredQrItems(): StoredQrItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_QR_KEY);
    if (!raw) {
      saveStoredQrItems(SEED_ITEMS);
      return SEED_ITEMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_ITEMS;
  } catch {
    return SEED_ITEMS;
  }
}

export function saveStoredQrItems(items: StoredQrItem[]): void {
  try {
    localStorage.setItem(STORAGE_QR_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save QR items to localStorage:', e);
  }
}

export function loadStoredFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(STORAGE_FOLDERS_KEY);
    if (!raw) {
      saveStoredFolders(DEFAULT_FOLDERS);
      return DEFAULT_FOLDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FOLDERS;
  } catch {
    return DEFAULT_FOLDERS;
  }
}

export function saveStoredFolders(folders: Folder[]): void {
  try {
    localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error('Failed to save folders to localStorage:', e);
  }
}

export function resetToSeedData(): { items: StoredQrItem[]; folders: Folder[] } {
  saveStoredQrItems(SEED_ITEMS);
  saveStoredFolders(DEFAULT_FOLDERS);
  return { items: [...SEED_ITEMS], folders: [...DEFAULT_FOLDERS] };
}
