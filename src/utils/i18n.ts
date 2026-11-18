export type Language = 'ru' | 'en';

export const TRANSLATIONS = {
  ru: {
    // App Header
    appSlogan: 'QR и штрихкоды • Захват экрана • Галерея',
    soundOn: 'Звук включен',
    soundOff: 'Звук выключен',
    aboutApp: 'О приложении Ecode',

    // Bottom Navigation
    tabScanner: 'Сканер',
    tabGallery: 'Галерея',
    tabCreate: 'Создать',
    tabSettings: 'Настройки',

    // Settings Screen
    settingsTitle: 'Настройки',
    settingsSubtitle: 'Тема, язык и параметры Ecode',
    appearanceSection: 'Внешний вид',
    themeLabel: 'Тема оформления',
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
    themeSystem: 'Системная',
    themeDarkDesc: 'Тёмные поверхности Material You (AMOLED)',
    themeLightDesc: 'Светлые мягкие поверхности Material 3',
    languageSection: 'Язык интерфейса',
    langRussian: 'Русский',
    langEnglish: 'English',
    feedbackSection: 'Звук и тактильный отклик',
    soundTitle: 'Звуковые сигналы',
    soundDesc: 'Звуковой сигнал при сканировании и кликах',
    hapticTitle: 'Виброотклик',
    hapticDesc: 'Тактильная вибрация при сканировании',
    dataSection: 'Управление данными',
    backupDataTitle: 'Скачать резервную копию',
    backupDataDesc: 'Сохранить все коды и папки в JSON-файл',
    restoreDataTitle: 'Восстановить из файла',
    restoreDataDesc: 'Загрузить резервную копию кодов',
    resetDemoTitle: 'Сбросить к демо-данным',
    resetDemoDesc: 'Вернуть начальные примеры билетов и карт',
    resetConfirm: 'Вы уверены? Это действие вернет базовый набор билетов и карт.',
    resetSuccess: 'Базовый набор кодов успешно восстановлен!',
    aboutSection: 'О приложении',
    appVersion: 'Версия',

    // Scanner
    modeCamera: 'Камера',
    modeScreen: 'Захват экрана',
    modeScreenshot: 'Скриншот',
    scanningCamera: 'Поиск QR и штрихкодов...',
    scanningScreen: 'Захват экрана: поиск кода...',
    screenModeTitle: 'Сканирование с экрана',
    screenModeDesc: 'Считывайте QR-коды и штрихкоды прямо из активного окна, Telegram, билета или сайта на вашем экране без второго телефона.',
    startScreenCapture: 'Выбрать экран / окно для сканирования',
    stopScreenCapture: 'Остановить захват экрана',
    screenModeTip: 'Выберите окно с QR или штрихкодом. Ecode моментально распознает его и откроет в чистом векторном качестве!',
    screenshotTitle: 'Скриншот или фото',
    screenshotDesc: 'Сделайте снимок экрана или выберите изображение с QR-кодом или штрихкодом — Ecode моментально его восстановит.',
    chooseFromGallery: 'Выбрать из галереи',
    pasteScreenshot: 'Вставить скриншот',
    analyzingImage: 'Анализ изображения и декодирование...',
    cameraDisabled: 'Камера отключена или ожидает разрешения.',
    enableCamera: 'Включить камеру',
    cameraNotFound: 'Камера на устройстве не найдена. Попробуйте режим захвата экрана или загрузку скриншота.',
    quickScanTest: 'Быстрый тест сканирования:',
    testWithoutCamera: 'Для проверки без камеры',
    sampleTicket: '🎫 Авиабилет',
    sampleLoyalty: '💳 Карта скидок',
    sampleWifi: '📶 Wi-Fi сеть',
    sampleBarcode: '📊 EAN-13 Штрихкод',

    // Clean QR Modal
    cleanModalTitle: 'Чистая реконструкция QR',
    cleanBarcodeModalTitle: 'Чистый штрихкод',
    cleanModalSubtitle: 'Преобразован в идеальный векторный оригинал',
    fullScreenTurnstile: 'Во весь экран',
    vectorOriginalBadge: '✓ 100% Векторный оригинал',
    eccCorrection: 'Коррекция',
    formatBadgeLabel: 'Формат',
    downloadPng: 'PNG',
    downloadSvg: 'SVG',
    copyImage: 'Картинка',
    copiedImage: 'Готово',
    shareQr: 'Поделиться',
    customizeStyle: 'Настроить палитру и уровень защиты QR',
    customizeBarcodeStyle: 'Настроить палитру и формат штрихкода',
    paletteLabel: 'Цветовая гамма Material You:',
    eccLabel: 'Уровень избыточности (ECC):',
    barcodeFormatLabel: 'Формат штрихкода:',
    copyText: 'Копировать текст',
    copiedText: 'Скопировано!',
    openInBrowser: 'Открыть в браузере',
    executeAction: 'Выполнить действие',
    saveToGalleryHeader: 'Сохранение в Галерею',
    inFavorites: 'В избранном',
    addToFavorites: 'В избранное',
    qrTitleLabel: 'Название кода:',
    qrTitlePlaceholder: 'Например: Билет на самолет или Карта скидок',
    folderLabel: 'Папка для сортировки:',
    noteLabel: 'Заметка (опционально):',
    notePlaceholder: 'Любые подробности, пин-код или дата...',
    cancelBtn: 'Отмена',
    saveBtn: 'Сохранить в Галерею',
    updateBtn: 'Обновить в Галерее',
    savedSuccessText: 'Сохранено в',

    // Turnstile Modal
    turnstileTitle: 'Ecode • Максимальная яркость',
    turnstileTip: 'Поднесите экран к сканеру турникета или кассы',
    turnstileClose: 'Готово / Вернуться в Ecode',

    // Gallery
    searchPlaceholder: 'Поиск кодов в Ecode...',
    allCodesChip: 'Все коды',
    favoritesChip: 'Избранное',
    newFolderChip: 'Новая папка',
    emptyTitle: 'В этой папке пока пусто',
    emptySearchTitle: 'Ничего не найдено',
    emptyDesc: 'Отсканируйте QR или штрихкод с экрана или камеры, либо создайте чистый код в Ecode!',
    emptySearchDesc: 'Попробуйте изменить поисковый запрос или выбрать другую папку.',
    scanFirstBtn: 'Отсканировать код',
    createFirstBtn: 'Создать код',
    turnstileBtn: 'Турникет',
    moveToFolderTooltip: 'Переместить в другую папку',
    moveToTitle: 'Переместить в:',
    deleteTooltip: 'Удалить код',
    deleteConfirmTitle: 'Удалить код?',
    deleteConfirm: 'Удалить этот код из галереи Ecode?',
    deleteBtn: 'Удалить',
    totalSavedFooter: 'Всего в Ecode',
    backupBtn: 'Резервная копия',
    restoreBtn: 'Восстановить',
    backupRestored: 'Успешно восстановлено кодов:',
    backupError: 'Не удалось прочитать файл резервной копии.',
    sortNewest: 'Новые',
    sortOldest: 'Старые',
    sortFavorites: '⭐ Избранные',
    sortAlphabetical: 'А-Я',
    sourceCamera: 'Камера',
    sourceScreen: 'Захват экрана',
    sourceFile: 'Скриншот',
    sourceGenerated: 'Сгенерирован',

    // Generator
    generatorTitle: 'Параметры содержимого',
    liveVectorPreview: 'Живой векторный просмотр',
    pristineVectorQuality: 'Безупречное векторное качество',
    saveToGalleryGen: 'Сохранить в галерею',
    savedToGalleryGen: 'Сохранено в Ecode!',
    templateText: 'Текст',
    templateUrl: 'Ссылка',
    templateWifi: 'Wi-Fi',
    templateTicket: 'Билет',
    templateLoyalty: 'Карта',
    templateBarcode: 'Штрихкод',
    templateContact: 'Контакт',
    templatePhone: 'Телефон',
    barcodeFormatSelectLabel: 'Стандарт штрихкода:',
    barcodeValueLabel: 'Значение штрихкода:',
    barcodeSampleFill: 'Пример',
    barcodeErrEmpty: 'Введите данные для генерации штрихкода',
    barcodeErrEan13Digits: 'Для EAN-13 введите 12 или 13 цифр',
    barcodeErrEan13Check: 'Неверная контрольная цифра EAN-13 (последняя цифра)',
    barcodeErrEan8Digits: 'Для EAN-8 введите 7 или 8 цифр',
    barcodeErrEan8Check: 'Неверная контрольная цифра EAN-8',
    barcodeErrUpcaDigits: 'Для UPC-A введите 11 или 12 цифр',
    barcodeErrUpcaCheck: 'Неверная контрольная цифра UPC-A',
    barcodeErrUpceDigits: 'Для UPC-E введите 6–8 цифр (начиная с 0 или 1)',
    barcodeErrCode39: 'Code 39 поддерживает 0–9, A–Z, пробел и - . $ / + %',
    barcodeErrItf: 'ITF-14 требует чётное количество цифр',
    barcodeErrCodabar: 'Codabar поддерживает цифры 0–9 и - $ : / . +',
    barcodeErrCode128: 'Code 128 поддерживает латиницу, цифры и ASCII-символы',
    codeTypeSwitchLabel: 'Тип кода:',
    codeKindQr: 'QR-код',
    codeKindBarcode: 'Штрихкод',
    enterTextLabel: 'Введите произвольный текст:',
    enterTextPlaceholder: 'Любой текст, заметка, промокод или инструкция...',
    enterUrlLabel: 'Веб-ссылка (URL):',
    wifiSsidLabel: 'Имя сети (SSID):',
    wifiPassLabel: 'Пароль:',
    wifiAuthLabel: 'Шифрование:',
    wifiHiddenLabel: 'Скрытая сеть',
    ticketEventLabel: 'Событие / Рейс / Фильм:',
    ticketEventPlaceholder: 'Например: Сапсан Москва-СПб или Кино: Дюна',
    ticketSeatLabel: 'Место / Сектор:',
    ticketCodeLabel: 'Код билета:',
    loyaltyStoreLabel: 'Магазин / Бренд:',
    loyaltyStorePlaceholder: 'ВкусВилл, Золотое Яблоко, Перекресток...',
    loyaltyNumberLabel: 'Номер карты / Штрихкод:',
    vcardNameLabel: 'Полное имя:',
    vcardPhoneLabel: 'Телефон:',
    vcardEmailLabel: 'Email:',
    vcardOrgLabel: 'Компания / Должность:',
    phoneLabel: 'Номер телефона:',
    nameForGallery: 'Название для галереи:',
    styleLabel: 'Палитра:',
    rgbPaletteTitle: 'Своя RGB-палитра:',
    codeColorLabel: 'Цвет кода',
    bgColorLabel: 'Цвет фона',
    swapColors: 'Поменять местами',
    customRgbBadge: 'Свой RGB',
    lowContrastWarning: 'Низкий контраст — сканер может не считать код',
    redLabel: 'R',
    greenLabel: 'G',
    blueLabel: 'B',

    // Folder Modal
    newFolderTitle: 'Новая папка в Ecode',
    editFolderTitle: 'Редактировать папку',
    folderNameLabel: 'Название папки:',
    folderNamePlaceholder: 'Например: Поездка, Магазины, Счета...',
    folderNameError: 'Введите название папки',
    folderColorLabel: 'Цветовой акцент Material You:',
    saveFolderBtn: 'Сохранить',

    // About Modal
    aboutTitle: 'Ecode',
    feature1Title: 'Захват экрана и камеры',
    feature1Desc: 'Считывайте QR-коды и штрихкоды прямо с экрана в любых приложениях без второго устройства.',
    feature2Title: 'Векторная реконструкция',
    feature2Desc: 'Считанный QR или штрихкод преобразуется в безупречный векторный оригинал для турникетов и касс.',
    feature3Title: 'Галерея и папки',
    feature3Desc: 'Раскладывайте билеты, карты лояльности, Wi-Fi и штрихкоды по категориям.',
    aboutUnderstood: 'Понятно',

    // Default Folder Translations
    folderTickets: 'Билеты',
    folderLoyalty: 'Карты лояльности',
    folderWifi: 'Wi-Fi сети',
    folderLinks: 'Ссылки',
    folderContacts: 'Контакты',
    folderDocs: 'Документы & Другое',
  },
  en: {
    // App Header
    appSlogan: 'QR & Barcodes • Screen Capture • Gallery',
    soundOn: 'Sound enabled',
    soundOff: 'Sound muted',
    aboutApp: 'About Ecode',

    // Bottom Navigation
    tabScanner: 'Scanner',
    tabGallery: 'Gallery',
    tabCreate: 'Create',
    tabSettings: 'Settings',

    // Settings Screen
    settingsTitle: 'Settings',
    settingsSubtitle: 'Theme, language & Ecode options',
    appearanceSection: 'Appearance',
    themeLabel: 'Color Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeSystem: 'System',
    themeDarkDesc: 'Material You dark surfaces (AMOLED)',
    themeLightDesc: 'Material 3 light soft surfaces',
    languageSection: 'Language',
    langRussian: 'Русский',
    langEnglish: 'English',
    feedbackSection: 'Sound & Haptic Feedback',
    soundTitle: 'Sound Effects',
    soundDesc: 'Synthesized chime on scan and taps',
    hapticTitle: 'Haptic Feedback',
    hapticDesc: 'Tactile vibration when scanning',
    dataSection: 'Data Management',
    backupDataTitle: 'Download Backup',
    backupDataDesc: 'Export all codes and folders to JSON file',
    restoreDataTitle: 'Restore from Backup',
    restoreDataDesc: 'Import JSON backup file',
    resetDemoTitle: 'Reset to Sample Data',
    resetDemoDesc: 'Restore default sample tickets and loyalty cards',
    resetConfirm: 'Reset entire gallery to default demo sample codes?',
    resetSuccess: 'Sample codes successfully restored!',
    aboutSection: 'About Ecode',
    appVersion: 'Version',

    // Scanner
    modeCamera: 'Camera',
    modeScreen: 'Screen Capture',
    modeScreenshot: 'Screenshot',
    scanningCamera: 'Scanning for QR & barcodes...',
    scanningScreen: 'Screen capture: scanning for codes...',
    screenModeTitle: 'Scan from Screen',
    screenModeDesc: 'Read QR codes and barcodes directly from any active window, Telegram, PDF ticket, or website on your screen without a second device.',
    startScreenCapture: 'Select Screen / Window to Scan',
    stopScreenCapture: 'Stop Screen Capture',
    screenModeTip: 'Select any window with a QR or barcode. Ecode instantly recognizes it and displays it in pristine vector quality!',
    screenshotTitle: 'Screenshot or Photo',
    screenshotDesc: 'Take a screenshot or select a photo with a QR code or barcode — Ecode will instantly reconstruct it.',
    chooseFromGallery: 'Choose from Files',
    pasteScreenshot: 'Paste Screenshot',
    analyzingImage: 'Analyzing image and decoding...',
    cameraDisabled: 'Camera is disabled or awaiting permission.',
    enableCamera: 'Enable Camera',
    cameraNotFound: 'Camera was not detected on this device. Try Screen Capture or upload a screenshot.',
    quickScanTest: 'Quick Scan Demo Test:',
    testWithoutCamera: 'Test without physical camera',
    sampleTicket: '🎫 Flight Ticket',
    sampleLoyalty: '💳 Discount Card',
    sampleWifi: '📶 Wi-Fi Network',
    sampleBarcode: '📊 EAN-13 Barcode',

    // Clean QR Modal
    cleanModalTitle: 'Pristine QR Reconstruction',
    cleanBarcodeModalTitle: 'Pristine Barcode',
    cleanModalSubtitle: 'Converted to original pristine vector quality',
    fullScreenTurnstile: 'Full Screen',
    vectorOriginalBadge: '✓ 100% Vector Original',
    eccCorrection: 'ECC',
    formatBadgeLabel: 'Format',
    downloadPng: 'PNG',
    downloadSvg: 'SVG',
    copyImage: 'Image',
    copiedImage: 'Copied',
    shareQr: 'Share',
    customizeStyle: 'Customize Material You Palette & ECC',
    customizeBarcodeStyle: 'Customize Palette & Barcode Format',
    paletteLabel: 'Material You Color Scheme:',
    eccLabel: 'Error Correction Level (ECC):',
    barcodeFormatLabel: 'Barcode Standard:',
    copyText: 'Copy Text',
    copiedText: 'Copied!',
    openInBrowser: 'Open in Browser',
    executeAction: 'Perform Action',
    saveToGalleryHeader: 'Save to Gallery',
    inFavorites: 'Favorited',
    addToFavorites: 'Favorite',
    qrTitleLabel: 'Code Name:',
    qrTitlePlaceholder: 'e.g. Flight Boarding Pass or Store Card',
    folderLabel: 'Folder Category:',
    noteLabel: 'Note (optional):',
    notePlaceholder: 'Any details, PIN code, or expiration date...',
    cancelBtn: 'Cancel',
    saveBtn: 'Save to Gallery',
    updateBtn: 'Update in Gallery',
    savedSuccessText: 'Saved in',

    // Turnstile Modal
    turnstileTitle: 'Ecode • Max Brightness & Contrast',
    turnstileTip: 'Hold your screen to the turnstile or checkout scanner',
    turnstileClose: 'Done / Return to Ecode',

    // Gallery
    searchPlaceholder: 'Search codes in Ecode...',
    allCodesChip: 'All Codes',
    favoritesChip: 'Favorites',
    newFolderChip: 'New Folder',
    emptyTitle: 'This folder is empty',
    emptySearchTitle: 'No codes found',
    emptyDesc: 'Scan a QR or barcode from screen or camera, or generate a clean code in Ecode!',
    emptySearchDesc: 'Try adjusting your search query or pick a different folder.',
    scanFirstBtn: 'Scan Code',
    createFirstBtn: 'Create Code',
    turnstileBtn: 'Turnstile',
    moveToFolderTooltip: 'Move to another folder',
    moveToTitle: 'Move to:',
    deleteTooltip: 'Delete Code',
    deleteConfirmTitle: 'Delete Code?',
    deleteConfirm: 'Delete this code from Ecode gallery?',
    deleteBtn: 'Delete',
    totalSavedFooter: 'Total in Ecode',
    backupBtn: 'Backup',
    restoreBtn: 'Restore',
    backupRestored: 'Successfully restored codes:',
    backupError: 'Failed to read backup file.',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortFavorites: '⭐ Favorites',
    sortAlphabetical: 'A-Z',
    sourceCamera: 'Camera',
    sourceScreen: 'Screen Capture',
    sourceFile: 'Screenshot',
    sourceGenerated: 'Generated',

    // Generator
    generatorTitle: 'Code Content Parameters',
    liveVectorPreview: 'Live Vector Preview',
    pristineVectorQuality: 'Flawless Vector Quality',
    saveToGalleryGen: 'Save to Gallery',
    savedToGalleryGen: 'Saved to Ecode!',
    templateText: 'Text',
    templateUrl: 'URL',
    templateWifi: 'Wi-Fi',
    templateTicket: 'Ticket',
    templateLoyalty: 'Card',
    templateBarcode: 'Barcode',
    templateContact: 'Contact',
    templatePhone: 'Phone',
    barcodeFormatSelectLabel: 'Barcode Standard:',
    barcodeValueLabel: 'Barcode Value:',
    barcodeSampleFill: 'Sample',
    barcodeErrEmpty: 'Enter data to generate barcode',
    barcodeErrEan13Digits: 'EAN-13 requires 12 or 13 digits',
    barcodeErrEan13Check: 'Invalid EAN-13 check digit (last digit)',
    barcodeErrEan8Digits: 'EAN-8 requires 7 or 8 digits',
    barcodeErrEan8Check: 'Invalid EAN-8 check digit',
    barcodeErrUpcaDigits: 'UPC-A requires 11 or 12 digits',
    barcodeErrUpcaCheck: 'Invalid UPC-A check digit',
    barcodeErrUpceDigits: 'UPC-E requires 6–8 digits (starting with 0 or 1)',
    barcodeErrCode39: 'Code 39 allows 0–9, A–Z, space, and - . $ / + %',
    barcodeErrItf: 'ITF-14 requires an even number of digits',
    barcodeErrCodabar: 'Codabar allows digits 0–9 and - $ : / . +',
    barcodeErrCode128: 'Code 128 supports ASCII text and digits',
    codeTypeSwitchLabel: 'Code Type:',
    codeKindQr: 'QR Code',
    codeKindBarcode: 'Barcode',
    enterTextLabel: 'Enter custom text:',
    enterTextPlaceholder: 'Any text, note, promo code, or instruction...',
    enterUrlLabel: 'Website URL:',
    wifiSsidLabel: 'Network Name (SSID):',
    wifiPassLabel: 'Password:',
    wifiAuthLabel: 'Encryption:',
    wifiHiddenLabel: 'Hidden Network',
    ticketEventLabel: 'Event / Flight / Movie:',
    ticketEventPlaceholder: 'e.g. S7 Flight S7-2044 or Dune Part Two',
    ticketSeatLabel: 'Seat / Gate / Row:',
    ticketCodeLabel: 'Ticket Code:',
    loyaltyStoreLabel: 'Store / Brand:',
    loyaltyStorePlaceholder: 'Apple, Starbucks, Sephora, Target...',
    loyaltyNumberLabel: 'Card Number / Barcode:',
    vcardNameLabel: 'Full Name:',
    vcardPhoneLabel: 'Phone:',
    vcardEmailLabel: 'Email:',
    vcardOrgLabel: 'Company / Job Title:',
    phoneLabel: 'Phone Number:',
    nameForGallery: 'Title for Gallery:',
    styleLabel: 'Palette:',
    rgbPaletteTitle: 'Custom RGB Palette:',
    codeColorLabel: 'Code Color',
    bgColorLabel: 'Background',
    swapColors: 'Swap colors',
    customRgbBadge: 'Custom RGB',
    lowContrastWarning: 'Low contrast — scanners may fail to read this code',
    redLabel: 'R',
    greenLabel: 'G',
    blueLabel: 'B',

    // Folder Modal
    newFolderTitle: 'New Folder in Ecode',
    editFolderTitle: 'Edit Folder',
    folderNameLabel: 'Folder Name:',
    folderNamePlaceholder: 'e.g. Trip, Loyalty Cards, Invoices...',
    folderNameError: 'Please enter a folder name',
    folderColorLabel: 'Material You Color Accent:',
    saveFolderBtn: 'Save Folder',

    // About Modal
    aboutTitle: 'Ecode',
    feature1Title: 'Screen & Camera Capture',
    feature1Desc: 'Read QR codes and barcodes directly from your active screen in any app or via camera.',
    feature2Title: 'Vector Reconstruction',
    feature2Desc: 'Converts scanned QR or barcode into a flawless vector original for turnstiles and checkout scanners.',
    feature3Title: 'Gallery & Folders',
    feature3Desc: 'Organize tickets, loyalty cards, Wi-Fi credentials and barcodes with ease.',
    aboutUnderstood: 'Got It',

    // Default Folder Translations
    folderTickets: 'Tickets',
    folderLoyalty: 'Loyalty Cards',
    folderWifi: 'Wi-Fi Networks',
    folderLinks: 'Links',
    folderContacts: 'Contacts',
    folderDocs: 'Documents & Other',
  },
} as const;

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem('ecode_language');
    if (saved === 'ru' || saved === 'en') return saved;
    return typeof navigator !== 'undefined' && navigator.language?.startsWith('ru') ? 'ru' : 'en';
  } catch {
    return 'ru';
  }
}

export function saveLanguagePreference(lang: Language): void {
  try {
    localStorage.setItem('ecode_language', lang);
  } catch {}
}

export function getLocalizedFolderName(folderId: string, defaultName: string, lang: Language): string {
  const dict = TRANSLATIONS[lang];
  switch (folderId) {
    case 'tickets': return dict.folderTickets;
    case 'loyalty': return dict.folderLoyalty;
    case 'wifi': return dict.folderWifi;
    case 'links': return dict.folderLinks;
    case 'contacts': return dict.folderContacts;
    case 'docs': return dict.folderDocs;
    default: return defaultName;
  }
}

export function getLocalizedDetailKey(key: string, lang: Language): string {
  if (lang === 'ru') return key;
  switch (key) {
    case 'Формат': return 'Format';
    case 'Значение': return 'Value';
    case 'Сеть (SSID)': return 'Network (SSID)';
    case 'Пароль': return 'Password';
    case 'Шифрование': return 'Security';
    case 'Скрытая сеть': return 'Hidden Network';
    case 'Имя': return 'Name';
    case 'Телефон': return 'Phone';
    case 'Организация': return 'Organization';
    default: return key;
  }
}

export function getLocalizedDetailValue(value: string, lang: Language): string {
  if (lang === 'ru') return value;
  switch (value) {
    case '(Без пароля)': return '(No password)';
    case 'Неизвестная сеть': return 'Unknown network';
    case 'Да': return 'Yes';
    case 'Нет': return 'No';
    case 'Контакт': return 'Contact';
    default: return value;
  }
}

