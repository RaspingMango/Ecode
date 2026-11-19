package com.raspingmango.ecode;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenBrightnessPlugin.class);
        registerPlugin(NativeSharePlugin.class);
        registerPlugin(NativeClipboardPlugin.class);
        registerPlugin(NativeDownloadPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
