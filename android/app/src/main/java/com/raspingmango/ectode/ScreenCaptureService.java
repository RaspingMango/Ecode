package com.raspingmango.ectode;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.service.quicksettings.TileService;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.WindowManager;
import android.view.WindowMetrics;

import androidx.core.app.NotificationCompat;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.ReaderException;
import com.google.zxing.Result;
import com.google.zxing.common.GlobalHistogramBinarizer;
import com.google.zxing.common.HybridBinarizer;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public class ScreenCaptureService extends Service {

    public static final String ACTION_START = "com.raspingmango.ectode.action.START_SCREEN_CAPTURE";
    public static final String ACTION_STOP = "com.raspingmango.ectode.action.STOP_SCREEN_CAPTURE";

    public static final String EXTRA_RESULT_CODE = "resultCode";
    public static final String EXTRA_DATA = "data";
    public static final String EXTRA_NOTIF_TITLE = "notifTitle";
    public static final String EXTRA_NOTIF_TEXT = "notifText";
    public static final String EXTRA_NOTIF_STOP = "notifStop";
    public static final String EXTRA_DETECTED_TITLE = "detectedTitle";
    public static final String EXTRA_DETECTED_TEXT = "detectedText";

    public static final int ONGOING_NOTIF_ID = 4101;
    public static final int DETECTED_NOTIF_ID = 4102;

    private static final String CHANNEL_ONGOING = "ectode_screen_capture_ongoing";
    private static final String CHANNEL_DETECTED = "ectode_screen_capture_detected";

    private static final long SCAN_INTERVAL_MS = 400L;
    private static final long INITIAL_SETTLE_MS = 350L;
    private static final int MAX_CAPTURE_DIMENSION = 1080;

    private MediaProjection mediaProjection;
    private MediaProjection.Callback projectionCallback;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private HandlerThread workerThread;
    private Handler workerHandler;

    private MultiFormatReader zxingReader;
    private int[] reusablePixels;
    private int[] reusableRotatedPixels;
    private byte[] reusableRowBuffer;

    private volatile boolean isStopping = false;
    private volatile boolean hasDetected = false;
    private long captureStartMs = 0L;
    private long lastScanMs = 0L;
    private int scanAttemptCount = 0;

    private String detectedTitle = "Ectode";
    private String detectedText = "Code detected — tap to open";

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopCaptureInternal("user");
            return START_NOT_STICKY;
        }

        if (!ACTION_START.equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        final int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0);
        final Intent projectionData = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            ? intent.getParcelableExtra(EXTRA_DATA, Intent.class)
            : intent.getParcelableExtra(EXTRA_DATA);

        if (projectionData == null) {
            ScreenCaptureBridge.notifyStateChanged(false, "invalid_intent");
            stopSelf();
            return START_NOT_STICKY;
        }

        final String notifTitle = nonEmptyOrDefault(intent.getStringExtra(EXTRA_NOTIF_TITLE), "Ectode");
        final String notifText = nonEmptyOrDefault(
            intent.getStringExtra(EXTRA_NOTIF_TEXT),
            "Scanning screen for QR & barcodes"
        );
        final String notifStop = nonEmptyOrDefault(intent.getStringExtra(EXTRA_NOTIF_STOP), "Stop");
        detectedTitle = nonEmptyOrDefault(intent.getStringExtra(EXTRA_DETECTED_TITLE), "Ectode");
        detectedText = nonEmptyOrDefault(
            intent.getStringExtra(EXTRA_DETECTED_TEXT),
            "Code detected — tap to view"
        );

        ensureNotificationChannels();
        Notification ongoingNotification = buildOngoingNotification(notifTitle, notifText, notifStop);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    ONGOING_NOTIF_ID,
                    ongoingNotification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                );
            } else {
                startForeground(ONGOING_NOTIF_ID, ongoingNotification);
            }
        } catch (Exception e) {
            ScreenCaptureBridge.notifyStateChanged(false, "foreground_error");
            stopSelf();
            return START_NOT_STICKY;
        }

        startProjectionSession(resultCode, projectionData);
        return START_NOT_STICKY;
    }

    private void startProjectionSession(int resultCode, Intent projectionData) {
        releaseResourcesOnly();
        isStopping = false;
        hasDetected = false;
        captureStartMs = System.currentTimeMillis();
        lastScanMs = 0L;
        scanAttemptCount = 0;

        MediaProjectionManager projectionManager =
            (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (projectionManager == null) {
            ScreenCaptureBridge.notifyStateChanged(false, "unavailable");
            stopSelf();
            return;
        }

        try {
            mediaProjection = projectionManager.getMediaProjection(resultCode, projectionData);
        } catch (Exception e) {
            mediaProjection = null;
        }

        if (mediaProjection == null) {
            ScreenCaptureBridge.notifyStateChanged(false, "projection_null");
            stopSelf();
            return;
        }

        workerThread = new HandlerThread("EctodeScreenScan");
        workerThread.start();
        workerHandler = new Handler(workerThread.getLooper());

        initZxingReader();

        projectionCallback = new MediaProjection.Callback() {
            @Override
            public void onStop() {
                if (!isStopping) {
                    stopCaptureInternal(hasDetected ? "detected" : "system");
                }
            }
        };
        mediaProjection.registerCallback(projectionCallback, workerHandler);

        int[] dims = computeCaptureDimensions();
        int width = dims[0];
        int height = dims[1];
        int densityDpi = dims[2];

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
        imageReader.setOnImageAvailableListener(reader -> {
            if (isStopping || hasDetected) {
                drainLatestImage(reader);
                return;
            }
            processAvailableImage(reader);
        }, workerHandler);

        try {
            virtualDisplay = mediaProjection.createVirtualDisplay(
                "EctodeScreenScanner",
                width,
                height,
                densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(),
                null,
                workerHandler
            );
            ScreenCaptureBridge.clearPendingDetection();
            ScreenCaptureBridge.notifyStateChanged(true, "started");
            requestScreenTileSync();
        } catch (Exception e) {
            stopCaptureInternal("virtual_display_error");
        }
    }

    private void drainLatestImage(ImageReader reader) {
        Image image = null;
        try {
            image = reader.acquireLatestImage();
        } catch (Exception ignored) {
        } finally {
            if (image != null) {
                image.close();
            }
        }
    }

    private void processAvailableImage(ImageReader reader) {
        Image image = null;
        try {
            image = reader.acquireLatestImage();
            if (image == null) return;

            long now = System.currentTimeMillis();
            if (now - captureStartMs < INITIAL_SETTLE_MS) {
                return;
            }
            if (now - lastScanMs < SCAN_INTERVAL_MS) {
                return;
            }
            lastScanMs = now;
            scanAttemptCount++;

            int width = image.getWidth();
            int height = image.getHeight();
            if (width <= 0 || height <= 0) return;

            Image.Plane[] planes = image.getPlanes();
            if (planes == null || planes.length == 0) return;

            Image.Plane plane = planes[0];
            ByteBuffer buffer = plane.getBuffer();
            if (buffer == null) return;

            int pixelStride = plane.getPixelStride();
            int rowStride = plane.getRowStride();
            if (pixelStride < 3 || rowStride < width * pixelStride) return;

            int totalPixels = width * height;
            if (reusablePixels == null || reusablePixels.length != totalPixels) {
                reusablePixels = new int[totalPixels];
            }
            if (reusableRowBuffer == null || reusableRowBuffer.length < rowStride) {
                reusableRowBuffer = new byte[rowStride];
            }

            buffer.rewind();
            int limit = buffer.limit();
            for (int y = 0; y < height; y++) {
                int rowPos = y * rowStride;
                if (rowPos >= limit) break;
                int bytesToRead = Math.min(rowStride, limit - rowPos);
                buffer.position(rowPos);
                buffer.get(reusableRowBuffer, 0, bytesToRead);

                int destRow = y * width;
                for (int x = 0; x < width; x++) {
                    int srcOffset = x * pixelStride;
                    if (srcOffset + 2 >= bytesToRead) break;
                    int r = reusableRowBuffer[srcOffset] & 0xff;
                    int g = reusableRowBuffer[srcOffset + 1] & 0xff;
                    int b = reusableRowBuffer[srcOffset + 2] & 0xff;
                    reusablePixels[destRow + x] = 0xff000000 | (r << 16) | (g << 8) | b;
                }
            }

            Result decoded = decodePixels(reusablePixels, width, height);
            if (decoded == null && (scanAttemptCount % 2 == 0)) {
                int[] rotated = rotatePixels90Cw(reusablePixels, width, height);
                decoded = decodePixels(rotated, height, width);
            }

            if (decoded != null && decoded.getText() != null && !decoded.getText().isEmpty()) {
                hasDetected = true;
                String text = decoded.getText();
                String format = decoded.getBarcodeFormat() != null
                    ? decoded.getBarcodeFormat().name()
                    : "QR_CODE";

                onCodeFound(text, format);
            }
        } catch (Exception ignored) {
        } finally {
            if (image != null) {
                image.close();
            }
        }
    }

    private Result decodePixels(int[] pixels, int width, int height) {
        if (zxingReader == null) return null;
        RGBLuminanceSource source = new RGBLuminanceSource(width, height, pixels);

        Result result = tryDecodeSource(new BinaryBitmap(new HybridBinarizer(source)));
        if (result != null) return result;

        result = tryDecodeSource(new BinaryBitmap(new GlobalHistogramBinarizer(source)));
        if (result != null) return result;

        try {
            return tryDecodeSource(new BinaryBitmap(new HybridBinarizer(source.invert())));
        } catch (Exception ignored) {
            return null;
        }
    }

    private Result tryDecodeSource(BinaryBitmap bitmap) {
        try {
            return zxingReader.decodeWithState(bitmap);
        } catch (ReaderException ignored) {
            return null;
        } finally {
            zxingReader.reset();
        }
    }

    private int[] rotatePixels90Cw(int[] src, int width, int height) {
        int total = width * height;
        if (reusableRotatedPixels == null || reusableRotatedPixels.length != total) {
            reusableRotatedPixels = new int[total];
        }
        for (int y = 0; y < height; y++) {
            int rowOffset = y * width;
            int destCol = height - 1 - y;
            for (int x = 0; x < width; x++) {
                reusableRotatedPixels[x * height + destCol] = src[rowOffset + x];
            }
        }
        return reusableRotatedPixels;
    }

    private void onCodeFound(String text, String format) {
        ScreenCaptureBridge.publishDetected(text, format);
        showDetectedNotification();

        Handler mainHandler = new Handler(Looper.getMainLooper());
        mainHandler.post(() -> {
            try {
                Intent openIntent = new Intent(this, MainActivity.class);
                openIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                );
                startActivity(openIntent);
            } catch (Exception ignored) {
                // On Android 14+, background activity launch may be restricted; high-priority notification handles tap-to-open.
            }
            stopCaptureInternal("detected");
        });
    }

    private void initZxingReader() {
        MultiFormatReader reader = new MultiFormatReader();
        Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
        List<BarcodeFormat> formats = Arrays.asList(
            BarcodeFormat.QR_CODE,
            BarcodeFormat.CODE_128,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_39,
            BarcodeFormat.ITF,
            BarcodeFormat.CODABAR,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.AZTEC
        );
        hints.put(DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
        reader.setHints(hints);
        zxingReader = reader;
    }

    private int[] computeCaptureDimensions() {
        int rawWidth = 1080;
        int rawHeight = 1920;
        int densityDpi = getResources().getDisplayMetrics().densityDpi;
        if (densityDpi <= 0) {
            densityDpi = DisplayMetrics.DENSITY_DEFAULT;
        }

        WindowManager windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        if (windowManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowMetrics metrics = windowManager.getMaximumWindowMetrics();
                Rect bounds = metrics.getBounds();
                if (bounds.width() > 0 && bounds.height() > 0) {
                    rawWidth = bounds.width();
                    rawHeight = bounds.height();
                }
            } else {
                DisplayMetrics metrics = new DisplayMetrics();
                @SuppressWarnings("deprecation")
                Display display = windowManager.getDefaultDisplay();
                if (display != null) {
                    display.getRealMetrics(metrics);
                    if (metrics.widthPixels > 0 && metrics.heightPixels > 0) {
                        rawWidth = metrics.widthPixels;
                        rawHeight = metrics.heightPixels;
                    }
                    if (metrics.densityDpi > 0) {
                        densityDpi = metrics.densityDpi;
                    }
                }
            }
        }

        int maxDim = Math.max(rawWidth, rawHeight);
        float scale = maxDim > MAX_CAPTURE_DIMENSION ? ((float) MAX_CAPTURE_DIMENSION / maxDim) : 1.0f;
        int targetWidth = Math.max(320, Math.round(rawWidth * scale));
        int targetHeight = Math.max(320, Math.round(rawHeight * scale));
        targetWidth &= ~1;
        targetHeight &= ~1;

        return new int[] { targetWidth, targetHeight, densityDpi };
    }

    private void ensureNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        NotificationChannel ongoing = new NotificationChannel(
            CHANNEL_ONGOING,
            "Ectode Screen Scan",
            NotificationManager.IMPORTANCE_LOW
        );
        ongoing.setShowBadge(false);
        manager.createNotificationChannel(ongoing);

        NotificationChannel detected = new NotificationChannel(
            CHANNEL_DETECTED,
            "Ectode Detected Codes",
            NotificationManager.IMPORTANCE_HIGH
        );
        detected.setShowBadge(true);
        manager.createNotificationChannel(detected);
    }

    private Notification buildOngoingNotification(String title, String text, String stopLabel) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            101,
            openIntent,
            pendingIntentFlags()
        );

        Intent stopIntent = new Intent(this, ScreenCaptureService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            102,
            stopIntent,
            pendingIntentFlags()
        );

        int iconRes = getApplicationInfo().icon != 0
            ? getApplicationInfo().icon
            : android.R.drawable.ic_menu_camera;

        return new NotificationCompat.Builder(this, CHANNEL_ONGOING)
            .setSmallIcon(iconRes)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(openPendingIntent)
            .addAction(0, stopLabel, stopPendingIntent)
            .build();
    }

    private void showDetectedNotification() {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            103,
            openIntent,
            pendingIntentFlags()
        );

        int iconRes = getApplicationInfo().icon != 0
            ? getApplicationInfo().icon
            : android.R.drawable.ic_menu_camera;

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_DETECTED)
            .setSmallIcon(iconRes)
            .setContentTitle(detectedTitle)
            .setContentText(detectedText)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(Notification.DEFAULT_ALL)
            .setContentIntent(openPendingIntent)
            .build();

        try {
            manager.notify(DETECTED_NOTIF_ID, notification);
        } catch (SecurityException ignored) {
        }
    }

    private static int pendingIntentFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.FLAG_UPDATE_CURRENT;
    }

    private static String nonEmptyOrDefault(String value, String fallback) {
        return (value != null && !value.trim().isEmpty()) ? value : fallback;
    }

    private void stopCaptureInternal(String reason) {
        if (isStopping) return;
        isStopping = true;
        releaseResourcesOnly();
        ScreenCaptureBridge.notifyStateChanged(false, reason);
        requestScreenTileSync();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            @SuppressWarnings("deprecation")
            boolean unused = true;
            stopForeground(true);
        }
        stopSelf();
    }

    private void requestScreenTileSync() {
        try {
            TileService.requestListeningState(
                this,
                new ComponentName(this, QuickScreenTileService.class)
            );
        } catch (Exception ignored) {
        }
    }

    private void releaseResourcesOnly() {
        if (virtualDisplay != null) {
            try {
                virtualDisplay.release();
            } catch (Exception ignored) {
            }
            virtualDisplay = null;
        }

        if (imageReader != null) {
            try {
                imageReader.setOnImageAvailableListener(null, null);
                imageReader.close();
            } catch (Exception ignored) {
            }
            imageReader = null;
        }

        if (mediaProjection != null) {
            try {
                if (projectionCallback != null) {
                    mediaProjection.unregisterCallback(projectionCallback);
                }
            } catch (Exception ignored) {
            }
            try {
                mediaProjection.stop();
            } catch (Exception ignored) {
            }
            mediaProjection = null;
            projectionCallback = null;
        }

        if (workerThread != null) {
            workerThread.quitSafely();
            workerThread = null;
            workerHandler = null;
        }

        reusablePixels = null;
        reusableRotatedPixels = null;
        reusableRowBuffer = null;
        zxingReader = null;
    }

    @Override
    public void onDestroy() {
        isStopping = true;
        releaseResourcesOnly();
        ScreenCaptureBridge.notifyStateChanged(false, "destroyed");
        super.onDestroy();
    }
}
