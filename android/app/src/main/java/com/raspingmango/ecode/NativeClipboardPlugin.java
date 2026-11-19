package com.raspingmango.ecode;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

@CapacitorPlugin(name = "NativeClipboard")
public class NativeClipboardPlugin extends Plugin {

    private static final int MAX_CLIPBOARD_IMAGE_DIM = 1600;

    @PluginMethod
    public void copyImage(PluginCall call) {
        final Activity activity = getActivity();
        final Context context = getContext();
        if (activity == null || context == null) {
            call.reject("Activity not available");
            return;
        }

        final String imageBase64 = call.getString("imageBase64", "");
        final String label = call.getString("label", "Ecode");
        if (imageBase64 == null || imageBase64.isEmpty()) {
            call.reject("Image data is empty");
            return;
        }

        final Uri imageUri;
        try {
            String cleanBase64 = imageBase64;
            int commaIdx = cleanBase64.indexOf(',');
            if (commaIdx >= 0) {
                cleanBase64 = cleanBase64.substring(commaIdx + 1);
            }
            byte[] bytes = Base64.decode(cleanBase64, Base64.DEFAULT);

            File clipDir = new File(context.getCacheDir(), "clipboard");
            if (!clipDir.exists()) {
                clipDir.mkdirs();
            } else {
                File[] oldFiles = clipDir.listFiles();
                if (oldFiles != null) {
                    for (File oldFile : oldFiles) {
                        oldFile.delete();
                    }
                }
            }

            File outFile = new File(clipDir, "ecode-copy-" + System.currentTimeMillis() + ".png");
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
            call.reject("Failed to prepare clipboard image: " + e.getMessage(), e);
            return;
        }

        activity.runOnUiThread(() -> {
            ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null) {
                call.reject("Clipboard service unavailable");
                return;
            }
            ClipData clip = ClipData.newUri(context.getContentResolver(), label, imageUri);
            clipboard.setPrimaryClip(clip);
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void readImage(PluginCall call) {
        final Activity activity = getActivity();
        final Context context = getContext();
        if (activity == null || context == null) {
            call.reject("Activity not available");
            return;
        }

        activity.runOnUiThread(() -> {
            ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null || !clipboard.hasPrimaryClip()) {
                JSObject empty = new JSObject();
                empty.put("hasImage", false);
                call.resolve(empty);
                return;
            }

            ClipData clip = clipboard.getPrimaryClip();
            if (clip == null || clip.getItemCount() == 0) {
                JSObject empty = new JSObject();
                empty.put("hasImage", false);
                call.resolve(empty);
                return;
            }

            ContentResolver resolver = context.getContentResolver();
            boolean clipDescriptionHasImage = hasImageMime(clip.getDescription());

            for (int i = 0; i < clip.getItemCount(); i++) {
                ClipData.Item item = clip.getItemAt(i);
                Uri uri = item.getUri();
                if (uri == null) continue;

                String mime = null;
                try {
                    mime = resolver.getType(uri);
                } catch (Exception ignored) {
                }

                if (mime != null && !mime.startsWith("image/") && !clipDescriptionHasImage) {
                    continue;
                }

                String dataUrl = decodeUriToPngDataUrl(resolver, uri);
                if (dataUrl != null) {
                    JSObject res = new JSObject();
                    res.put("hasImage", true);
                    res.put("dataUrl", dataUrl);
                    call.resolve(res);
                    return;
                }
            }

            JSObject empty = new JSObject();
            empty.put("hasImage", false);
            call.resolve(empty);
        });
    }

    private static boolean hasImageMime(ClipDescription description) {
        if (description == null) return false;
        for (int i = 0; i < description.getMimeTypeCount(); i++) {
            String mime = description.getMimeType(i);
            if (mime != null && mime.startsWith("image/")) {
                return true;
            }
        }
        return false;
    }

    private static String decodeUriToPngDataUrl(ContentResolver resolver, Uri uri) {
        try {
            BitmapFactory.Options boundsOpts = new BitmapFactory.Options();
            boundsOpts.inJustDecodeBounds = true;
            try (InputStream boundsStream = resolver.openInputStream(uri)) {
                if (boundsStream == null) return null;
                BitmapFactory.decodeStream(boundsStream, null, boundsOpts);
            }

            if (boundsOpts.outWidth <= 0 || boundsOpts.outHeight <= 0) {
                return null;
            }

            int sampleSize = 1;
            int maxDim = Math.max(boundsOpts.outWidth, boundsOpts.outHeight);
            while (maxDim / sampleSize > MAX_CLIPBOARD_IMAGE_DIM) {
                sampleSize *= 2;
            }

            BitmapFactory.Options decodeOpts = new BitmapFactory.Options();
            decodeOpts.inSampleSize = sampleSize;
            Bitmap bitmap;
            try (InputStream imgStream = resolver.openInputStream(uri)) {
                if (imgStream == null) return null;
                bitmap = BitmapFactory.decodeStream(imgStream, null, decodeOpts);
            }
            if (bitmap == null) return null;

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos);
            bitmap.recycle();

            String base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
            return "data:image/png;base64," + base64;
        } catch (Exception e) {
            return null;
        }
    }
}
