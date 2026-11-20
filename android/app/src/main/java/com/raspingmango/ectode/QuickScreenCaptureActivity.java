package com.raspingmango.ectode;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.projection.MediaProjectionConfig;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.content.ContextCompat;

/**
 * Invisible no-history bridge launched by QuickScreenTileService so the user
 * stays on their current app while approving MediaProjection. Starts
 * ScreenCaptureService in fast one-shot mode and finishes immediately.
 */
public class QuickScreenCaptureActivity extends Activity {

    private static final int REQUEST_NOTIF_PERMISSION = 3101;
    private static final int REQUEST_MEDIA_PROJECTION = 3102;
    private static final String PREFS_NAME = "ectode_screen_capture_prefs";
    private static final String KEY_NOTIF_PROMPTED = "notifications_prompted";
    private static final String KEY_PROMPT_LAUNCHED = "quick_prompt_launched";

    private boolean promptLaunched = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        disableTransitions();

        if (ScreenCaptureBridge.isCapturing()) {
            Intent stopIntent = new Intent(this, ScreenCaptureService.class);
            stopIntent.setAction(ScreenCaptureService.ACTION_STOP);
            try {
                startService(stopIntent);
            } catch (Exception ignored) {
            }
            ScreenCaptureBridge.notifyStateChanged(false, "tile_stop");
            finishSilently();
            return;
        }

        if (savedInstanceState != null) {
            promptLaunched = savedInstanceState.getBoolean(KEY_PROMPT_LAUNCHED, false);
        }

        if (!promptLaunched) {
            promptLaunched = true;
            if (shouldRequestNotificationPermissionOnce()) {
                requestPermissions(
                    new String[] { Manifest.permission.POST_NOTIFICATIONS },
                    REQUEST_NOTIF_PERMISSION
                );
            } else {
                launchProjectionPrompt();
            }
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putBoolean(KEY_PROMPT_LAUNCHED, promptLaunched);
    }

    private boolean shouldRequestNotificationPermissionOnce() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return false;
        }
        boolean hasPerm = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean alreadyPrompted = prefs.getBoolean(KEY_NOTIF_PROMPTED, false);

        if (!hasPerm && !alreadyPrompted) {
            prefs.edit().putBoolean(KEY_NOTIF_PROMPTED, true).apply();
            return true;
        }
        return false;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_NOTIF_PERMISSION) {
            launchProjectionPrompt();
        }
    }

    @SuppressWarnings("deprecation")
    private void launchProjectionPrompt() {
        MediaProjectionManager projectionManager =
            (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (projectionManager == null) {
            finishSilently();
            return;
        }

        try {
            Intent captureIntent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                captureIntent = projectionManager.createScreenCaptureIntent(
                    MediaProjectionConfig.createConfigForDefaultDisplay()
                );
            } else {
                captureIntent = projectionManager.createScreenCaptureIntent();
            }
            startActivityForResult(captureIntent, REQUEST_MEDIA_PROJECTION);
            disableTransitions();
        } catch (Exception ignored) {
            finishSilently();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_MEDIA_PROJECTION) {
            finishSilently();
            return;
        }

        if (resultCode == Activity.RESULT_OK && data != null) {
            Intent serviceIntent = new Intent(this, ScreenCaptureService.class);
            serviceIntent.setAction(ScreenCaptureService.ACTION_START);
            serviceIntent.putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, resultCode);
            serviceIntent.putExtra(ScreenCaptureService.EXTRA_DATA, data);
            serviceIntent.putExtra(ScreenCaptureService.EXTRA_QUICK_ONESHOT, true);
            serviceIntent.putExtra(
                ScreenCaptureService.EXTRA_NOTIF_TITLE,
                getString(R.string.screen_capture_notif_title)
            );
            serviceIntent.putExtra(
                ScreenCaptureService.EXTRA_NOTIF_TEXT,
                getString(R.string.screen_capture_quick_notif_text)
            );
            serviceIntent.putExtra(
                ScreenCaptureService.EXTRA_NOTIF_STOP,
                getString(R.string.screen_capture_notif_stop)
            );
            serviceIntent.putExtra(
                ScreenCaptureService.EXTRA_DETECTED_TITLE,
                getString(R.string.screen_capture_detected_title)
            );
            serviceIntent.putExtra(
                ScreenCaptureService.EXTRA_DETECTED_TEXT,
                getString(R.string.screen_capture_detected_text)
            );

            try {
                ContextCompat.startForegroundService(this, serviceIntent);
            } catch (Exception ignored) {
            }
        }

        finishSilently();
    }

    private void finishSilently() {
        finish();
        disableTransitions();
    }

    @SuppressWarnings("deprecation")
    private void disableTransitions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            overrideActivityTransition(Activity.OVERRIDE_TRANSITION_OPEN, 0, 0);
            overrideActivityTransition(Activity.OVERRIDE_TRANSITION_CLOSE, 0, 0);
        } else {
            overridePendingTransition(0, 0);
        }
    }
}
