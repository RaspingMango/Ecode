package com.raspingmango.ectode;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(
    name = "NativeDownload",
    permissions = {
        @Permission(
            strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE },
            alias = "storage"
        )
    }
)
public class NativeDownloadPlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        final Context context = getContext();
        if (context == null) {
            call.reject("Context not available");
            return;
        }

        final String rawFileName = call.getString("fileName", "ectode-code.png");
        final String mimeType = call.getString("mimeType", "application/octet-stream");
        final String base64Data = call.getString("base64Data", "");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("File data is empty");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (getPermissionState("storage") != PermissionState.GRANTED &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("storage", call, "storagePermissionCallback");
                return;
            }
        }

        performSave(call, context, rawFileName, mimeType, base64Data);
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        final Context context = getContext();
        if (context == null) {
            call.reject("Context not available");
            return;
        }
        final String rawFileName = call.getString("fileName", "ectode-code.png");
        final String mimeType = call.getString("mimeType", "application/octet-stream");
        final String base64Data = call.getString("base64Data", "");
        performSave(call, context, rawFileName, mimeType, base64Data);
    }

    private void performSave(
        PluginCall call,
        Context context,
        String rawFileName,
        String mimeType,
        String base64Data
    ) {
        final String safeFileName = sanitizeFileName(rawFileName);
        final byte[] bytes;
        try {
            String cleanBase64 = base64Data;
            int commaIdx = cleanBase64.indexOf(',');
            if (commaIdx >= 0) {
                cleanBase64 = cleanBase64.substring(commaIdx + 1);
            }
            bytes = Base64.decode(cleanBase64, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid base64 payload", e);
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, safeFileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Ectode");
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                ContentResolver resolver = context.getContentResolver();
                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    throw new IOException("MediaStore returned null URI");
                }

                try (OutputStream os = resolver.openOutputStream(uri)) {
                    if (os == null) {
                        throw new IOException("Unable to open output stream");
                    }
                    os.write(bytes);
                    os.flush();
                } catch (IOException writeErr) {
                    resolver.delete(uri, null, null);
                    throw writeErr;
                }

                ContentValues doneValues = new ContentValues();
                doneValues.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(uri, doneValues, null, null);

                JSObject result = new JSObject();
                result.put("saved", true);
                result.put("fileName", safeFileName);
                result.put("uri", uri.toString());
                call.resolve(result);
            } else {
                File baseDir;
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
                    baseDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Ectode");
                } else {
                    File appDownloads = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    baseDir = appDownloads != null ? appDownloads : new File(context.getFilesDir(), "Downloads");
                }
                if (!baseDir.exists()) {
                    baseDir.mkdirs();
                }

                File outFile = resolveUniqueFile(baseDir, safeFileName);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(bytes);
                    fos.flush();
                }

                MediaScannerConnection.scanFile(
                    context,
                    new String[] { outFile.getAbsolutePath() },
                    new String[] { mimeType },
                    null
                );

                JSObject result = new JSObject();
                result.put("saved", true);
                result.put("fileName", outFile.getName());
                result.put("path", outFile.getAbsolutePath());
                call.resolve(result);
            }
        } catch (IOException e) {
            call.reject("Failed to save file to Downloads: " + e.getMessage(), e);
        }
    }

    private static File resolveUniqueFile(File dir, String fileName) {
        File candidate = new File(dir, fileName);
        if (!candidate.exists()) return candidate;

        int dotIdx = fileName.lastIndexOf('.');
        String base = dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName;
        String ext = dotIdx > 0 ? fileName.substring(dotIdx) : "";
        int counter = 1;
        while (candidate.exists() && counter < 1000) {
            candidate = new File(dir, base + " (" + counter + ")" + ext);
            counter++;
        }
        return candidate;
    }

    private static String sanitizeFileName(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return "ectode-code.png";
        }
        String cleaned = raw.replaceAll("[\\\\/:*?\"<>|]+", "_").trim();
        return cleaned.isEmpty() ? "ectode-code.png" : cleaned;
    }
}
