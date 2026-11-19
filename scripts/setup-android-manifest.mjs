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

if (changed) {
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('[setup-android-manifest] Updated AndroidManifest.xml permissions.');
} else {
  console.log('[setup-android-manifest] AndroidManifest.xml already configured.');
}

// Sync versionName in android/app/build.gradle with package.json version when present
if (fs.existsSync(buildGradlePath) && fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const appVersion = typeof pkg.version === 'string' && pkg.version !== '0.0.0' ? pkg.version : '1.3.3';
  const gradle = fs.readFileSync(buildGradlePath, 'utf8');
  const nextGradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${appVersion}"`);
  if (nextGradle !== gradle) {
    fs.writeFileSync(buildGradlePath, nextGradle, 'utf8');
    console.log(`[setup-android-manifest] Set Android versionName to ${appVersion}.`);
  }
}
