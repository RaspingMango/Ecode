package com.raspingmango.ectode;

public final class ScreenCaptureBridge {

    public static final class DetectionResult {
        public final String data;
        public final String format;
        public final long timestamp;

        public DetectionResult(String data, String format, long timestamp) {
            this.data = data;
            this.format = format;
            this.timestamp = timestamp;
        }
    }

    public interface Listener {
        void onStateChanged(boolean capturing, String reason);
        void onDetectionAvailable();
    }

    private static final Object LOCK = new Object();
    private static boolean capturing = false;
    private static DetectionResult pendingDetection = null;
    private static Listener listener = null;

    private ScreenCaptureBridge() {}

    public static void setListener(Listener nextListener) {
        synchronized (LOCK) {
            listener = nextListener;
        }
    }

    public static boolean isCapturing() {
        synchronized (LOCK) {
            return capturing;
        }
    }

    public static void clearPendingDetection() {
        synchronized (LOCK) {
            pendingDetection = null;
        }
    }

    public static void notifyStateChanged(boolean isCapturing, String reason) {
        Listener currentListener;
        synchronized (LOCK) {
            capturing = isCapturing;
            currentListener = listener;
        }
        if (currentListener != null) {
            currentListener.onStateChanged(isCapturing, reason);
        }
    }

    public static void publishDetected(String data, String format) {
        if (data == null || data.isEmpty()) return;
        Listener currentListener;
        synchronized (LOCK) {
            pendingDetection = new DetectionResult(data, format, System.currentTimeMillis());
            currentListener = listener;
        }
        if (currentListener != null) {
            currentListener.onDetectionAvailable();
        }
    }

    public static DetectionResult consumePendingDetection() {
        synchronized (LOCK) {
            DetectionResult result = pendingDetection;
            pendingDetection = null;
            return result;
        }
    }
}
