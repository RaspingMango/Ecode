import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseQrContent,
  suggestFolderForType,
  filterAndSortQrItems,
  buildWifiQrString,
  buildVCardQrString,
  StoredQrItem,
} from './qrLogic';

test('parseQrContent parses Wi-Fi payload correctly', () => {
  const raw = 'WIFI:S:Home_Network_5G;T:WPA;P:SuperSecret123;H:false;;';
  const parsed = parseQrContent(raw);
  assert.equal(parsed.type, 'wifi');
  assert.equal(parsed.displayTitle, 'Wi-Fi: Home_Network_5G');
  assert.equal(parsed.details?.['Сеть (SSID)'], 'Home_Network_5G');
  assert.equal(parsed.details?.['Пароль'], 'SuperSecret123');
  assert.equal(suggestFolderForType(parsed.type), 'wifi');
});

test('parseQrContent parses URLs with clean title and actionUrl', () => {
  const raw = 'https://example.com/events/concert-2026';
  const parsed = parseQrContent(raw);
  assert.equal(parsed.type, 'url');
  assert.equal(parsed.actionUrl, 'https://example.com/events/concert-2026');
  assert.equal(suggestFolderForType(parsed.type), 'links');
});

test('parseQrContent parses vCard contacts correctly', () => {
  const vcard = 'BEGIN:VCARD\nVERSION:3.0\nFN:Иван Иванов\nTEL;TYPE=CELL:+79991234567\nEMAIL:ivan@test.ru\nEND:VCARD';
  const parsed = parseQrContent(vcard);
  assert.equal(parsed.type, 'vcard');
  assert.equal(parsed.displayTitle, 'Иван Иванов');
  assert.equal(parsed.details?.['Телефон'], '+79991234567');
  assert.equal(parsed.actionUrl, 'tel:+79991234567');
  assert.equal(suggestFolderForType(parsed.type), 'contacts');
});

test('buildWifiQrString properly escapes special characters', () => {
  const str = buildWifiQrString('My;Wifi:SSID', 'pass123;word', 'WPA', false);
  assert.match(str, /WIFI:S:My\\;Wifi\\:SSID;T:WPA;P:pass123\\;word;/);
});

test('buildVCardQrString produces valid vCard 3.0 lines', () => {
  const card = buildVCardQrString('Алексей Смирнов', '+79001112233', 'alex@mail.ru', 'TechCorp');
  assert.match(card, /BEGIN:VCARD/);
  assert.match(card, /FN:Алексей Смирнов/);
  assert.match(card, /TEL;TYPE=CELL:\+79001112233/);
  assert.match(card, /ORG:TechCorp/);
  assert.match(card, /END:VCARD/);
});

test('filterAndSortQrItems filters by folder, query, and sorts correctly', () => {
  const items: StoredQrItem[] = [
    {
      id: '1',
      title: 'Билет на поезд Сапсан',
      rawContent: 'TICKET-SPB-MOSCOW-8899',
      folderId: 'tickets',
      dataType: 'ticket',
      createdAt: 1000,
      isFavorite: false,
      source: 'camera',
    },
    {
      id: '2',
      title: 'Карта ВкусВилл',
      rawContent: 'LOYALTY-9922883',
      folderId: 'loyalty',
      dataType: 'loyalty',
      createdAt: 2000,
      isFavorite: true,
      source: 'screen',
    },
    {
      id: '3',
      title: 'Wi-Fi в коворкинге',
      rawContent: 'WIFI:S:Coworking;T:WPA;P:1234;;',
      folderId: 'wifi',
      dataType: 'wifi',
      createdAt: 3000,
      isFavorite: false,
      source: 'generated',
    },
  ];

  // Filter by folder 'tickets'
  const ticketsOnly = filterAndSortQrItems(items, 'tickets', '', 'newest');
  assert.equal(ticketsOnly.length, 1);
  assert.equal(ticketsOnly[0].id, '1');

  // Filter by search query
  const searchResult = filterAndSortQrItems(items, 'all', 'Сапсан', 'newest');
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].title, 'Билет на поезд Сапсан');

  // Sort favoritesFirst
  const sortedFavs = filterAndSortQrItems(items, 'all', '', 'favoritesFirst');
  assert.equal(sortedFavs[0].id, '2'); // Favorite item is first
});
