package com.raspingmango.ectode;

import android.app.Activity;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "NativeShare")
public class NativeSharePlugin extends Plugin {

    @PluginMethod
    public void share(PluginCall call) {
        final Activity activity = getActivity();
        final Context context = getContext();
        if (activity == null || context == null) {
            call.reject("Activity not available");
            return;
        }

        final String title = call.getString("title", "Ectode");
        final String text = call.getString("text", "");
        final String dialogTitle = call.getString("dialogTitle", title);
        final String imageBase64 = call.getString("imageBase64", "");
        final String fileName = sanitizeFileName(call.getString("fileName", "ectode-code"));

        Uri imageUri = null;
        if (imageBase64 != null && !imageBase64.isEmpty()) {
            try {
                String cleanBase64 = imageBase64;
                int commaIdx = cleanBase64.indexOf(',');
                if (commaIdx >= 0) {
                    cleanBase64 = cleanBase64.substring(commaIdx + 1);
                }
                byte[] bytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                File shareDir = new File(context.getCacheDir(), "share");
                if (!shareDir.exists()) {
                    shareDir.mkdirs();
                } else {
                    File[] oldFiles = shareDir.listFiles();
                    if (oldFiles != null) {
                        for (File oldFile : oldFiles) {
                            oldFile.delete();
                        }
                    }
                }
                File outFile = new File(shareDir, fileName + ".png");
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(bytes);
                    fos.flush();
                }
                imageUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    outFile
                );
            } catch (IllegalArgumentException | IOException e) {
                imageUri = null;
            }
        }

        final Uri finalImageUri = imageUri;
        activity.runOnUiThread(() -> {
            Intent sendIntent = new Intent(Intent.ACTION_SEND);
            if (finalImageUri != null) {
                sendIntent.setType("image/png");
                sendIntent.putExtra(Intent.EXTRA_STREAM, finalImageUri);
                sendIntent.setClipData(ClipData.newRawUri("", finalImageUri));
                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                sendIntent.setType("text/plain");
            }

            if (text != null && !text.isEmpty()) {
                sendIntent.putExtra(Intent.EXTRA_TEXT, text);
            }
            if (title != null && !title.isEmpty()) {
                sendIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            }

            Intent chooser = Intent.createChooser(
                sendIntent,
                dialogTitle != null && !dialogTitle.isEmpty() ? dialogTitle : "Share"
            );
            if (finalImageUri != null) {
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            try {
                activity.startActivity(chooser);
                call.resolve();
            } catch (Exception e) {
                call.reject("Unable to start share chooser: " + e.getMessage(), e);
            }
        });
    }

    private static String sanitizeFileName(String raw) {
        if (raw == null) return "ectode-code";
        String cleaned = raw.replaceAll("[^a-zA-Z0-9._-]+", "_").replaceAll("^_+|_+$", "");
        return cleaned.isEmpty() ? "ectode-code" : cleaned;
    }
}
