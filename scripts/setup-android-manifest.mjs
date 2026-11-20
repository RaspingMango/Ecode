import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
const pkgPath = path.join(rootDir, 'package.json');

if (!fs.existsSync(manifestPath)) {
  console.error('[setup-android-manifest] Android project not found. Run `npx cap add android` first.');
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');
let changed = false;

const cameraPermission = '<uses-permission android:name="android.permission.CAMERA" />';
const cameraFeature = '<uses-feature android:name="android.hardware.camera" android:required="false" />';
const legacyStoragePermission = '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />';
const fgServicePermission = '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />';
const fgMediaProjectionPermission = '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />';
const postNotificationsPermission = '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />';
const screenCaptureService = `<service
            android:name=".ScreenCaptureService"
            android:exported="false"
            android:foregroundServiceType="mediaProjection" />`;
const quickCameraTileService = `<service
            android:name=".QuickCameraTileService"
            android:exported="true"
            android:icon="@drawable/ic_tile_camera"
            android:label="@string/quick_tile_camera"
            android:permission="android.permission.BIND_QUICK_SETTINGS_TILE">
            <intent-filter>
                <action android:name="android.service.quicksettings.action.QS_TILE" />
            </intent-filter>
        </service>`;
const quickScreenTileService = `<service
            android:name=".QuickScreenTileService"
            android:exported="true"
            android:icon="@drawable/ic_tile_screen"
            android:label="@string/quick_tile_screen"
            android:permission="android.permission.BIND_QUICK_SETTINGS_TILE">
            <intent-filter>
                <action android:name="android.service.quicksettings.action.QS_TILE" />
            </intent-filter>
        </service>`;

if (!manifest.includes('android.permission.CAMERA')) {
  manifest = manifest.replace(
    /(<manifest[^>]*>)/,
    `$1\n    ${cameraPermission}\n    ${cameraFeature}`
  );
  changed = true;
} else if (!manifest.includes('android.hardware.camera')) {
  manifest = manifest.replace(
    cameraPermission,
    `${cameraPermission}\n    ${cameraFeature}`
  );
  changed = true;
}

if (!manifest.includes('android.permission.WRITE_EXTERNAL_STORAGE')) {
  manifest = manifest.replace(
    cameraFeature,
    `${cameraFeature}\n    ${legacyStoragePermission}`
  );
  changed = true;
}

for (const perm of [
  { key: 'android.permission.FOREGROUND_SERVICE"', tag: fgServicePermission },
  { key: 'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION', tag: fgMediaProjectionPermission },
  { key: 'android.permission.POST_NOTIFICATIONS', tag: postNotificationsPermission },
]) {
  if (!manifest.includes(perm.key)) {
    manifest = manifest.replace(/(<application\b)/, `${perm.tag}\n\n    $1`);
    changed = true;
  }
}

if (!manifest.includes('android:name=".ScreenCaptureService"')) {
  manifest = manifest.replace(
    /(<\/activity>)/,
    `$1\n\n        ${screenCaptureService}`
  );
  changed = true;
}

if (!manifest.includes('android:name=".QuickCameraTileService"')) {
  manifest = manifest.replace(
    /(<\/application>)/,
    `        ${quickCameraTileService}\n\n    $1`
  );
  changed = true;
}

if (!manifest.includes('android:name=".QuickScreenTileService"')) {
  manifest = manifest.replace(
    /(<\/application>)/,
    `        ${quickScreenTileService}\n\n    $1`
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('[setup-android-manifest] Updated AndroidManifest.xml permissions and services.');
} else {
  console.log('[setup-android-manifest] AndroidManifest.xml already configured.');
}

// Sync versionName in android/app/build.gradle with package.json version when present
if (fs.existsSync(buildGradlePath) && fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const appVersion = typeof pkg.version === 'string' && pkg.version !== '0.0.0' ? pkg.version : '1.4.0';
  const gradle = fs.readFileSync(buildGradlePath, 'utf8');
  const nextGradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${appVersion}"`);
  if (nextGradle !== gradle) {
    fs.writeFileSync(buildGradlePath, nextGradle, 'utf8');
    console.log(`[setup-android-manifest] Set Android versionName to ${appVersion}.`);
  }
}
