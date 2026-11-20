package com.raspingmango.ectode;

import android.app.StatusBarManager;
import android.content.ComponentName;
import android.content.Context;
import android.graphics.drawable.Icon;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "QuickAction")
public class QuickActionPlugin extends Plugin {

    private volatile boolean isResumed = false;

    @Override
    public void load() {
        super.load();
        QuickActionBridge.setListener(() -> {
            if (isResumed) {
                deliverPendingActionIfAny();
            }
        });
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        isResumed = true;
        deliverPendingActionIfAny();
    }

    @Override
    protected void handleOnPause() {
        isResumed = false;
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        QuickActionBridge.setListener(null);
        super.handleOnDestroy();
    }

    @PluginMethod
    public void consumePendingQuickAction(PluginCall call) {
        QuickActionBridge.QuickActionEvent event = QuickActionBridge.consumePendingAction();
        JSObject result = new JSObject();
        if (event != null) {
            result.put("hasAction", true);
            result.put("action", event.action);
            result.put("timestamp", event.timestamp);
        } else {
            result.put("hasAction", false);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void canRequestPinTile(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU);
        result.put("sdkInt", Build.VERSION.SDK_INT);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPinTile(PluginCall call) {
        final Context context = getContext();
        if (context == null) {
            call.reject("Context not available");
            return;
        }

        final String tileType = call.getString("tile", QuickActionBridge.ACTION_CAMERA);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject unsupported = new JSObject();
            unsupported.put("status", "unsupported");
            unsupported.put("sdkInt", Build.VERSION.SDK_INT);
            call.resolve(unsupported);
            return;
        }

        StatusBarManager statusBarManager = context.getSystemService(StatusBarManager.class);
        if (statusBarManager == null) {
            JSObject unavailable = new JSObject();
            unavailable.put("status", "error");
            call.resolve(unavailable);
            return;
        }

        final boolean isScreenTile = QuickActionBridge.ACTION_SCREEN.equalsIgnoreCase(tileType);
        final ComponentName componentName = new ComponentName(
            context,
            isScreenTile ? QuickScreenTileService.class : QuickCameraTileService.class
        );
        final CharSequence label = context.getString(
            isScreenTile ? R.string.quick_tile_screen : R.string.quick_tile_camera
        );
        final Icon icon = Icon.createWithResource(
            context,
            isScreenTile ? R.drawable.ic_tile_screen : R.drawable.ic_tile_camera
        );

        try {
            statusBarManager.requestAddTileService(
                componentName,
                label,
                icon,
                ContextCompat.getMainExecutor(context),
                resultCode -> {
                    JSObject res = new JSObject();
                    res.put("code", resultCode);
                    if (resultCode == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED) {
                        res.put("status", "added");
                    } else if (resultCode == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED) {
                        res.put("status", "already_added");
                    } else if (resultCode == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_NOT_ADDED) {
                        res.put("status", "dismissed");
                    } else {
                        res.put("status", "error");
                    }
                    call.resolve(res);
                }
            );
        } catch (Exception e) {
            JSObject err = new JSObject();
            err.put("status", "error");
            err.put("message", e.getMessage());
            call.resolve(err);
        }
    }

    private void deliverPendingActionIfAny() {
        QuickActionBridge.QuickActionEvent event = QuickActionBridge.consumePendingAction();
        if (event == null) return;

        JSObject payload = new JSObject();
        payload.put("action", event.action);
        payload.put("timestamp", event.timestamp);
        notifyListeners("quickAction", payload, true);
    }
}
