package com.raspingmango.ectode;

import android.app.Activity;
import android.view.Window;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenBrightness")
public class ScreenBrightnessPlugin extends Plugin {

    @PluginMethod
    public void setBrightness(PluginCall call) {
        final float brightness = call.getFloat("brightness", -1.0f);
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        activity.runOnUiThread(() -> {
            Window window = activity.getWindow();
            if (window != null) {
                WindowManager.LayoutParams params = window.getAttributes();
                params.screenBrightness = brightness < 0f
                    ? WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                    : Math.min(1.0f, Math.max(0.0f, brightness));
                window.setAttributes(params);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void getBrightness(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        activity.runOnUiThread(() -> {
            float current = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
            Window window = activity.getWindow();
            if (window != null) {
                current = window.getAttributes().screenBrightness;
            }
            JSObject result = new JSObject();
            result.put("brightness", current);
            call.resolve(result);
        });
    }
}
