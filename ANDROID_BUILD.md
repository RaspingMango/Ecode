# Сборка Android APK для Ecode

В репозитории настроен **Capacitor** (`capacitor.config.ts`) и скрипты сборки под Android.

---

## Способ 1: Автоматическая сборка на GitHub (без Android Studio)

В проект добавлен workflow `.github/workflows/android-apk.yml`:
1. Запушьте изменения в ветку `main` (или `master`), либо откройте на GitHub вкладку **Actions → Build Android APK → Run workflow**.
2. После завершения сборки скачайте готовый файл из раздела **Artifacts → `Ecode-debug-apk`** (`app-debug.apk`).
3. Перенесите `.apk` на смартфон Android и установите (разрешив установку из выбранного источника).

---

## Способ 2: Локальная сборка на компьютере

### Требования
- **Node.js 20+**
- **JDK 21**
- **Android SDK** (проще всего установить через Android Studio)

### Команды
```bash
# 1. Установить зависимости
npm install

# 2. Собрать веб-приложение, создать android/ (если ещё нет),
#    добавить разрешение CAMERA и синхронизировать Capacitor
npm run android:prepare

# 3. Собрать Debug APK через Gradle
npm run android:apk
```

Готовый файл будет создан по пути:
`android/app/build/outputs/apk/debug/app-debug.apk`

Дополнительные команды:
- `npm run android:open` — открыть подготовленный проект в Android Studio (удобно для запуска на телефоне по USB или сборки подписанного Release APK).
- `npm run android:sync` — обновить веб-сборку внутри уже существующей папки `android/`.

---

## Примечания по работе на Android
- **Камера, фото из галереи, генератор и режим «Турникет»** работают автономно внутри приложения (скрипт `scripts/setup-android-manifest.mjs` автоматически добавляет `<uses-permission android:name="android.permission.CAMERA" />`).
- Веб-функция **«Захват экрана» (`getDisplayMedia`)** не поддерживается стандартным Android WebView — на смартфоне для распознавания кода с экрана используйте вкладку **«Скриншот»** и выберите скриншот из галереи.
