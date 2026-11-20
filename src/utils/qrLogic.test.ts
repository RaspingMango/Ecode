import test from 'node:test';
import assert from 'node:assert/strict';
import JsBarcode from 'jsbarcode';
import {
  parseQrContent,
  suggestFolderForType,
  filterAndSortQrItems,
  buildWifiQrString,
  buildVCardQrString,
  validateBarcodePayload,
  computeGs1CheckDigit,
  is1DBarcodeFormat,
  getBarcodeFormatLabel,
  getJsBarcodeFormat,
  getSampleBarcodeValue,
  resolveSafeCodeFormat,
  mergeDemoItems,
  stripDemoItems,
  BARCODE_FORMATS,
  DOWNLOAD_IMAGE_FORMATS,
  normalizeDownloadImageFormat,
  getDownloadFileExtension,
  StoredQrItem,
} from './qrLogic';
import { scanBarcodeWithZxing, mapZxingFormatToCodeFormat, ZXing } from './qrScanner';
import { hexToRgb, rgbToHex, normalizeHexColor, getColorContrastRatio } from './color';
import {
  getLocalizedDetailKey,
  getLocalizedDetailValue,
  getLocalizedFolderName,
  formatCodeCount,
  resolveDeviceLanguage,
  TRANSLATIONS,
} from './i18n';
import { sanitizeShareFileName, extractPngBase64 } from './share';
import { sanitizeDownloadFileName, utf8ToBase64 } from './nativeFiles';
import {
  mapNativeCodeFormat,
  shouldAcceptDetectedCode,
  shouldUseNativeScreenCapture,
} from './screenCapture';
import {
  normalizeQuickAction,
  resolveScannerModeFromQuickAction,
  shouldAutoStartScreenFromQuickAction,
  buildTilePinOutcomeMessage,
} from './quickActions';

test('parseQrContent parses Wi-Fi payload correctly', () => {
  const raw = 'WIFI:S:Home_Network_5G;T:WPA;P:SuperSecret123;H:false;;';
  const parsed = parseQrContent(raw);
  assert.equal(parsed.type, 'wifi');
  assert.equal(parsed.codeFormat, 'QR_CODE');
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

test('parseQrContent classifies 1D barcodes cleanly', () => {
  const retail = parseQrContent('4607004650932', 'EAN_13');
  assert.equal(retail.type, 'loyalty');
  assert.equal(retail.codeFormat, 'EAN_13');
  assert.equal(retail.displayTitle, 'EAN-13: 4607004650932');
  assert.equal(suggestFolderForType(retail.type), 'loyalty');

  const code128 = parseQrContent('ECTODE-8849201', 'CODE_128');
  assert.equal(code128.type, 'barcode');
  assert.equal(code128.codeFormat, 'CODE_128');
  assert.equal(code128.displayTitle, 'Code 128: ECTODE-8849201');
  assert.equal(suggestFolderForType(code128.type), 'loyalty');
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

test('GS1 check digit calculation and EAN/UPC validation', () => {
  assert.equal(computeGs1CheckDigit('460700465093'), 2);
  assert.equal(computeGs1CheckDigit('4601234'), 0);
  assert.equal(computeGs1CheckDigit('03600029145'), 2);

  // Valid 13-digit EAN-13 and 12-digit auto-completion
  assert.deepEqual(validateBarcodePayload('4607004650932', 'EAN_13'), {
    valid: true,
    normalizedValue: '4607004650932',
  });
  assert.deepEqual(validateBarcodePayload('460700465093', 'EAN_13'), {
    valid: true,
    normalizedValue: '4607004650932',
  });

  // Invalid EAN-13 check digit and wrong length
  assert.equal(validateBarcodePayload('4607004650939', 'EAN_13').errorKey, 'ean13CheckDigit');
  assert.equal(validateBarcodePayload('12345', 'EAN_13').errorKey, 'ean13Digits');

  // EAN-8 & UPC-A
  assert.equal(validateBarcodePayload('46012340', 'EAN_8').valid, true);
  assert.equal(validateBarcodePayload('036000291452', 'UPC_A').valid, true);

  // Code 128, Code 39, ITF, Codabar
  assert.equal(validateBarcodePayload('ECTODE-8849201', 'CODE_128').valid, true);
  assert.equal(validateBarcodePayload('Кириллица', 'CODE_128').errorKey, 'code128Ascii');
  assert.equal(validateBarcodePayload('ectode-2026', 'CODE_39').normalizedValue, 'ECTODE-2026');
  assert.equal(validateBarcodePayload('12345', 'ITF').errorKey, 'itfDigits');
  assert.equal(validateBarcodePayload('123456', 'ITF').valid, true);
  assert.equal(validateBarcodePayload('A40156B', 'CODABAR').valid, true);
});

test('barcode format helpers and all sample values validate & encode with JsBarcode cleanly', () => {
  assert.equal(is1DBarcodeFormat('QR_CODE'), false);
  assert.equal(is1DBarcodeFormat('EAN_13'), true);
  assert.equal(getBarcodeFormatLabel('EAN_13'), 'EAN-13');
  assert.equal(getJsBarcodeFormat('UPC_A'), 'UPC');
  assert.equal(mapZxingFormatToCodeFormat(ZXing.BarcodeFormat.EAN_13), 'EAN_13');

  for (const fmt of BARCODE_FORMATS) {
    const sample = getSampleBarcodeValue(fmt);
    assert.equal(validateBarcodePayload(sample, fmt).valid, true, `Sample for ${fmt} should be valid`);
    const out: { encodings?: Array<{ data: string }> } = {};
    JsBarcode(out as any, sample, { format: getJsBarcodeFormat(fmt) });
    assert.ok(out.encodings && out.encodings.length > 0 && out.encodings[0].data.length > 0, `JsBarcode should encode ${fmt}`);
  }
});

test('scanBarcodeWithZxing decodes generated EAN-13 and CODE_128 barcode pixels round-trip', () => {
  const cases: Array<{ value: string; jsFmt: string; expected: string }> = [
    { value: '4607004650932', jsFmt: 'EAN13', expected: 'EAN_13' },
    { value: 'ECTODE-8849201', jsFmt: 'CODE128', expected: 'CODE_128' },
  ];

  for (const c of cases) {
    const container: { encodings?: Array<{ data: string }> } = {};
    JsBarcode(container as any, c.value, { format: c.jsFmt });
    const bits = (container.encodings || []).map((e) => e.data).join('');
    assert.ok(bits && bits.length > 0, `JsBarcode should emit binary bar data for ${c.jsFmt}`);

    const scaleX = 3;
    const margin = 24;
    const width = bits.length * scaleX + margin * 2;
    const height = 80;
    const rgba = new Uint8ClampedArray(width * height * 4);
    rgba.fill(255); // White background

    for (let y = 12; y < height - 12; y++) {
      for (let i = 0; i < bits.length; i++) {
        if (bits[i] === '1') {
          for (let sx = 0; sx < scaleX; sx++) {
            const x = margin + i * scaleX + sx;
            const idx = (y * width + x) * 4;
            rgba[idx] = 0;
            rgba[idx + 1] = 0;
            rgba[idx + 2] = 0;
            rgba[idx + 3] = 255;
          }
        }
      }
    }

    const fakeImageData = { data: rgba, width, height } as ImageData;
    const decoded = scanBarcodeWithZxing(fakeImageData);
    assert.ok(decoded, `ZXing should decode ${c.jsFmt} barcode`);
    assert.equal(decoded.data, c.value);
    assert.equal(decoded.format, c.expected);
  }
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

test('RGB/HEX color conversion and contrast ratio helpers work accurately', () => {
  assert.deepEqual(hexToRgb('#ff8000'), { r: 255, g: 128, b: 0 });
  assert.equal(rgbToHex(18, 52, 86), '#123456');
  assert.equal(rgbToHex(300, -10, 127.6), '#ff0080');
  assert.equal(normalizeHexColor('abc', '#000000'), '#aabbcc');
  assert.equal(normalizeHexColor('invalid', '#123456'), '#123456');

  const bwContrast = getColorContrastRatio('#000000', '#ffffff');
  assert.ok(bwContrast > 20.9);
  const lowContrast = getColorContrastRatio('#eeeeee', '#ffffff');
  assert.ok(lowContrast < 1.3);
});

test('detail key and value localization translates Russian metadata cleanly for English UI', () => {
  assert.equal(getLocalizedDetailKey('Формат', 'en'), 'Format');
  assert.equal(getLocalizedDetailKey('Значение', 'en'), 'Value');
  assert.equal(getLocalizedDetailKey('Сеть (SSID)', 'en'), 'Network (SSID)');
  assert.equal(getLocalizedDetailValue('(Без пароля)', 'en'), '(No password)');
  assert.equal(getLocalizedDetailKey('Формат', 'ru'), 'Формат');
});

test('getLocalizedFolderName translates stock names and preserves custom renames', () => {
  assert.equal(getLocalizedFolderName('tickets', 'Билеты', 'en'), 'Tickets');
  assert.equal(getLocalizedFolderName('tickets', 'Tickets', 'ru'), 'Билеты');
  assert.equal(getLocalizedFolderName('tickets', 'Авиаперелёты', 'en'), 'Авиаперелёты');
  assert.equal(getLocalizedFolderName('folder-123', 'Путешествия', 'en'), 'Путешествия');
});

test('formatCodeCount handles Russian and English plural forms', () => {
  assert.equal(formatCodeCount(0, 'ru'), '0 кодов');
  assert.equal(formatCodeCount(1, 'ru'), '1 код');
  assert.equal(formatCodeCount(2, 'ru'), '2 кода');
  assert.equal(formatCodeCount(5, 'ru'), '5 кодов');
  assert.equal(formatCodeCount(11, 'ru'), '11 кодов');
  assert.equal(formatCodeCount(21, 'ru'), '21 код');
  assert.equal(formatCodeCount(1, 'en'), '1 code');
  assert.equal(formatCodeCount(3, 'en'), '3 codes');
});

test('resolveSafeCodeFormat preserves valid barcode formats and falls back to QR_CODE on mismatch', () => {
  assert.equal(resolveSafeCodeFormat('4607004650932', 'EAN_13'), 'EAN_13');
  assert.equal(resolveSafeCodeFormat('TICKET:SU-2026-VIP', 'EAN_13'), 'QR_CODE');
  assert.equal(resolveSafeCodeFormat('ECTODE-8849201', 'CODE_128'), 'CODE_128');
  assert.equal(resolveSafeCodeFormat('https://example.com', undefined), 'QR_CODE');
});

test('mergeDemoItems and stripDemoItems preserve user items while toggling demo data', () => {
  const userItem: StoredQrItem = {
    id: 'qr-user-1',
    title: 'My Pass',
    rawContent: 'USER-PASS-1',
    folderId: 'tickets',
    dataType: 'ticket',
    createdAt: 1000,
    isFavorite: true,
    source: 'generated',
  };
  const demoItems: StoredQrItem[] = [
    {
      id: 'seed-1',
      title: 'Demo 1',
      rawContent: 'DEMO-1',
      folderId: 'tickets',
      dataType: 'ticket',
      createdAt: 500,
      isFavorite: false,
      source: 'camera',
    },
    {
      id: 'seed-2',
      title: 'Demo 2',
      rawContent: 'DEMO-2',
      folderId: 'wifi',
      dataType: 'wifi',
      createdAt: 600,
      isFavorite: false,
      source: 'generated',
    },
  ];

  const mergedOnce = mergeDemoItems([userItem], demoItems);
  assert.equal(mergedOnce.length, 3);
  assert.equal(mergedOnce[0].id, 'qr-user-1');

  // Calling mergeDemoItems again does not duplicate existing demo items
  const mergedTwice = mergeDemoItems(mergedOnce, demoItems);
  assert.equal(mergedTwice.length, 3);

  // Stripping demo items restores only the user item
  const stripped = stripDemoItems(mergedTwice, demoItems.map((d) => d.id));
  assert.equal(stripped.length, 1);
  assert.equal(stripped[0].id, 'qr-user-1');
});

test('share helpers sanitize file names and extract PNG base64 payloads safely', () => {
  assert.equal(sanitizeShareFileName('My Ticket 2026!'), 'My_Ticket_2026');
  assert.equal(sanitizeShareFileName('Билет: Концерт'), 'ectode-code');
  assert.equal(sanitizeShareFileName('   '), 'ectode-code');

  assert.equal(extractPngBase64('data:image/png;base64,iVBORw0KGgo='), 'iVBORw0KGgo=');
  assert.equal(extractPngBase64('data:text/plain;base64,abc'), null);
  assert.equal(extractPngBase64(null), null);
});

test('download helpers sanitize filenames and encode UTF-8 SVG/JSON cleanly to base64', () => {
  assert.equal(sanitizeDownloadFileName('Билет: Концерт / VIP', 'png'), 'Билет_ Концерт _ VIP.png');
  assert.equal(sanitizeDownloadFileName('   ', 'svg'), 'ectode-code.svg');

  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Привет</text></svg>';
  const encoded = utf8ToBase64(svg);
  assert.equal(Buffer.from(encoded, 'base64').toString('utf8'), svg);
});

test('screen capture helpers map native ZXing formats, route platform cleanly, and deduplicate detections', () => {
  assert.equal(shouldUseNativeScreenCapture(true), true);
  assert.equal(shouldUseNativeScreenCapture(false), false);

  assert.equal(mapNativeCodeFormat('QR_CODE'), 'QR_CODE');
  assert.equal(mapNativeCodeFormat('ean_13'), 'EAN_13');
  assert.equal(mapNativeCodeFormat('CODE_128'), 'CODE_128');
  assert.equal(mapNativeCodeFormat('AZTEC'), 'QR_CODE');
  assert.equal(mapNativeCodeFormat(undefined), 'QR_CODE');

  const first = shouldAcceptDetectedCode({ data: 'https://ectode.app', format: 'QR_CODE' }, null, 0, 1000);
  assert.equal(first.accept, true);
  assert.equal(first.key, 'QR_CODE::https://ectode.app');

  const dup = shouldAcceptDetectedCode({ data: 'https://ectode.app', format: 'QR_CODE' }, first.key, 1000, 1500);
  assert.equal(dup.accept, false);

  const afterWindow = shouldAcceptDetectedCode({ data: 'https://ectode.app', format: 'QR_CODE' }, first.key, 1000, 3500);
  assert.equal(afterWindow.accept, true);

  const empty = shouldAcceptDetectedCode({ data: '   ', format: 'QR_CODE' }, first.key, 1000, 1500);
  assert.equal(empty.accept, false);
});

test('quick action helpers normalize intents, map scanner modes, and format tile pin outcomes', () => {
  assert.equal(normalizeQuickAction('camera'), 'camera');
  assert.equal(normalizeQuickAction('com.raspingmango.ectode.action.QUICK_SCAN_CAMERA'), 'camera');
  assert.equal(normalizeQuickAction('screen'), 'screen');
  assert.equal(normalizeQuickAction('com.raspingmango.ectode.action.QUICK_SCAN_SCREEN'), 'screen');
  assert.equal(normalizeQuickAction('unknown'), null);
  assert.equal(normalizeQuickAction(undefined), null);

  assert.equal(resolveScannerModeFromQuickAction('camera'), 'camera');
  assert.equal(resolveScannerModeFromQuickAction('screen'), 'screen');
  assert.equal(resolveScannerModeFromQuickAction(null), null);

  assert.equal(shouldAutoStartScreenFromQuickAction('screen'), true);
  assert.equal(shouldAutoStartScreenFromQuickAction('camera'), false);
  assert.equal(shouldAutoStartScreenFromQuickAction(null), false);

  assert.match(buildTilePinOutcomeMessage('added', 'ru'), /закреплена/i);
  assert.match(buildTilePinOutcomeMessage('already_added', 'en'), /already/i);
  assert.match(buildTilePinOutcomeMessage('unsupported', 'ru'), /шторку/i);
  assert.match(buildTilePinOutcomeMessage('dismissed', 'en'), /cancelled/i);
});

test('turnstileTitle omits brand prefix and matches clean brightness labels', () => {
  assert.equal(TRANSLATIONS.ru.turnstileTitle, 'Максимальная яркость');
  assert.equal(TRANSLATIONS.en.turnstileTitle, 'Max Brightness');
});

test('download format helpers support PNG, SVG, and JPEG normalization & extensions', () => {
  assert.deepEqual(DOWNLOAD_IMAGE_FORMATS, ['png', 'svg', 'jpeg']);
  assert.equal(normalizeDownloadImageFormat('png'), 'png');
  assert.equal(normalizeDownloadImageFormat('SVG'), 'svg');
  assert.equal(normalizeDownloadImageFormat('jpeg'), 'jpeg');
  assert.equal(normalizeDownloadImageFormat('jpg'), 'jpeg');
  assert.equal(normalizeDownloadImageFormat('webp'), 'png');
  assert.equal(normalizeDownloadImageFormat(undefined), 'png');

  assert.equal(getDownloadFileExtension('png'), 'png');
  assert.equal(getDownloadFileExtension('svg'), 'svg');
  assert.equal(getDownloadFileExtension('jpeg'), 'jpg');
  assert.equal(sanitizeDownloadFileName('My Code', getDownloadFileExtension('jpeg')), 'My Code.jpg');

  assert.equal(TRANSLATIONS.ru.downloadJpeg, 'JPEG');
  assert.equal(TRANSLATIONS.en.downloadJpeg, 'JPEG');
});

test('resolveDeviceLanguage defaults to ru for Russian locales and en for all other locales', () => {
  assert.equal(resolveDeviceLanguage('ru'), 'ru');
  assert.equal(resolveDeviceLanguage('ru-RU'), 'ru');
  assert.equal(resolveDeviceLanguage('RU_KZ'), 'ru');
  assert.equal(resolveDeviceLanguage('en-US'), 'en');
  assert.equal(resolveDeviceLanguage('de-DE'), 'en');
  assert.equal(resolveDeviceLanguage('uk-UA'), 'en');
  assert.equal(resolveDeviceLanguage('run'), 'en');
  assert.equal(resolveDeviceLanguage(''), 'en');
  assert.equal(resolveDeviceLanguage(undefined), 'en');
});






