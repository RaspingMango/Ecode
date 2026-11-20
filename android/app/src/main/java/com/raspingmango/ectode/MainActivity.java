package com.raspingmango.ectode;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenBrightnessPlugin.class);
        registerPlugin(NativeSharePlugin.class);
        registerPlugin(NativeClipboardPlugin.class);
        registerPlugin(NativeDownloadPlugin.class);
        registerPlugin(ScreenCapturePlugin.class);
        registerPlugin(QuickActionPlugin.class);
        super.onCreate(savedInstanceState);
        QuickActionBridge.publishIntentIfQuickAction(getIntent());
        publishCapturedIntentIfPresent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        QuickActionBridge.publishIntentIfQuickAction(intent);
        publishCapturedIntentIfPresent(intent);
    }

    private void publishCapturedIntentIfPresent(Intent intent) {
        if (intent == null) return;
        String capturedData = intent.getStringExtra(ScreenCaptureService.EXTRA_CAPTURED_DATA);
        if (capturedData == null || capturedData.isEmpty()) return;
        String capturedFormat = intent.getStringExtra(ScreenCaptureService.EXTRA_CAPTURED_FORMAT);
        intent.removeExtra(ScreenCaptureService.EXTRA_CAPTURED_DATA);
        intent.removeExtra(ScreenCaptureService.EXTRA_CAPTURED_FORMAT);
        ScreenCaptureBridge.publishIfAbsent(capturedData, capturedFormat);
    }
}
