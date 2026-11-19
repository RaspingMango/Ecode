package com.raspingmango.ecode;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.projection.MediaProjectionManager;
import android.os.Build;

import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "ScreenCapture",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class ScreenCapturePlugin extends Plugin {

    private static final String PREFS_NAME = "ecode_screen_capture_prefs";
    private static final String KEY_NOTIF_PROMPTED = "notifications_prompted";

    private volatile boolean isResumed = false;

    @Override
    public void load() {
        super.load();
        ScreenCaptureBridge.setListener(new ScreenCaptureBridge.Listener() {
            @Override
            public void onStateChanged(boolean capturing, String reason) {
                JSObject payload = new JSObject();
                payload.put("capturing", capturing);
                payload.put("reason", reason != null ? reason : "");
                notifyListeners("captureState", payload);
            }

            @Override
            public void onDetectionAvailable() {
                if (isResumed) {
                    deliverPendingDetectionIfAny();
                }
            }
        });
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        isResumed = true;
        cancelDetectedNotification();
        deliverPendingDetectionIfAny();

        JSObject statePayload = new JSObject();
        statePayload.put("capturing", ScreenCaptureBridge.isCapturing());
        statePayload.put("reason", "resume");
        notifyListeners("captureState", statePayload);
    }

    @Override
    protected void handleOnPause() {
        isResumed = false;
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        ScreenCaptureBridge.setListener(null);
        super.handleOnDestroy();
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", true);
        result.put("platform", "android");
        call.resolve(result);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("capturing", ScreenCaptureBridge.isCapturing());
        call.resolve(result);
    }

    @PluginMethod
    public void consumePendingDetection(PluginCall call) {
        cancelDetectedNotification();
        ScreenCaptureBridge.DetectionResult pending = ScreenCaptureBridge.consumePendingDetection();
        JSObject result = new JSObject();
        if (pending != null) {
            result.put("hasResult", true);
            result.put("data", pending.data);
            result.put("format", pending.format);
            result.put("timestamp", pending.timestamp);
        } else {
            result.put("hasResult", false);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void startCapture(PluginCall call) {
        Context context = getContext();
        Activity activity = getActivity();
        if (context == null || activity == null) {
            call.reject("Activity not available");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean hasNotifPerm = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean alreadyPrompted = prefs.getBoolean(KEY_NOTIF_PROMPTED, false);

            if (!hasNotifPerm && !alreadyPrompted) {
                prefs.edit().putBoolean(KEY_NOTIF_PROMPTED, true).apply();
                requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
                return;
            }
        }

        launchProjectionPermissionPrompt(call);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        // Proceed with screen capture consent regardless of whether notification permission was granted.
        launchProjectionPermissionPrompt(call);
    }

    private void launchProjectionPermissionPrompt(PluginCall call) {
        Context context = getContext();
        Activity activity = getActivity();
        if (context == null || activity == null) {
            call.reject("Activity not available");
            return;
        }

        MediaProjectionManager projectionManager =
            (MediaProjectionManager) context.getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (projectionManager == null) {
            call.reject("MediaProjectionManager is not available on this device");
            return;
        }

        Intent captureIntent = projectionManager.createScreenCaptureIntent();
        startActivityForResult(call, captureIntent, "handleScreenCaptureResult");
    }

    @ActivityCallback
    private void handleScreenCaptureResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        Context context = getContext();
        if (context == null) {
            call.reject("Context not available");
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("started", false);
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        Intent serviceIntent = new Intent(context, ScreenCaptureService.class);
        serviceIntent.setAction(ScreenCaptureService.ACTION_START);
        serviceIntent.putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.getResultCode());
        serviceIntent.putExtra(ScreenCaptureService.EXTRA_DATA, result.getData());
        serviceIntent.putExtra(ScreenCaptureService.EXTRA_NOTIF_TITLE, call.getString("notifTitle", "Ecode"));
        serviceIntent.putExtra(
            ScreenCaptureService.EXTRA_NOTIF_TEXT,
            call.getString("notifText", "Scanning screen for QR & barcodes")
        );
        serviceIntent.putExtra(ScreenCaptureService.EXTRA_NOTIF_STOP, call.getString("notifStop", "Stop"));
        serviceIntent.putExtra(ScreenCaptureService.EXTRA_DETECTED_TITLE, call.getString("detectedTitle", "Ecode"));
        serviceIntent.putExtra(
            ScreenCaptureService.EXTRA_DETECTED_TEXT,
            call.getString("detectedText", "Code detected — tap to view")
        );

        try {
            ContextCompat.startForegroundService(context, serviceIntent);
            JSObject started = new JSObject();
            started.put("started", true);
            started.put("cancelled", false);
            call.resolve(started);
        } catch (Exception e) {
            call.reject("Failed to start screen capture service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopCapture(PluginCall call) {
        Context context = getContext();
        if (context != null) {
            Intent stopIntent = new Intent(context, ScreenCaptureService.class);
            stopIntent.setAction(ScreenCaptureService.ACTION_STOP);
            try {
                context.startService(stopIntent);
            } catch (Exception ignored) {
            }
        }
        ScreenCaptureBridge.notifyStateChanged(false, "user");
        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }

    private void deliverPendingDetectionIfAny() {
        ScreenCaptureBridge.DetectionResult pending = ScreenCaptureBridge.consumePendingDetection();
        if (pending == null) return;

        cancelDetectedNotification();
        JSObject payload = new JSObject();
        payload.put("data", pending.data);
        payload.put("format", pending.format);
        payload.put("timestamp", pending.timestamp);
        notifyListeners("codeDetected", payload, true);
    }

    private void cancelDetectedNotification() {
        Context context = getContext();
        if (context == null) return;
        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(ScreenCaptureService.DETECTED_NOTIF_ID);
        }
    }
}
