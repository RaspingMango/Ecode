package com.raspingmango.ectode;

import android.content.Intent;

public final class QuickActionBridge {

    public static final String ACTION_CAMERA = "camera";
    public static final String ACTION_SCREEN = "screen";

    public static final String INTENT_ACTION_CAMERA = "com.raspingmango.ectode.action.QUICK_SCAN_CAMERA";
    public static final String INTENT_ACTION_SCREEN = "com.raspingmango.ectode.action.QUICK_SCAN_SCREEN";
    public static final String EXTRA_QUICK_ACTION = "quickAction";

    public static final class QuickActionEvent {
        public final String action;
        public final long timestamp;

        public QuickActionEvent(String action, long timestamp) {
            this.action = action;
            this.timestamp = timestamp;
        }
    }

    public interface Listener {
        void onQuickActionAvailable();
    }

    private static final Object LOCK = new Object();
    private static QuickActionEvent pendingEvent = null;
    private static Listener listener = null;

    private QuickActionBridge() {}

    public static void setListener(Listener nextListener) {
        synchronized (LOCK) {
            listener = nextListener;
        }
    }

    public static String extractActionFromIntent(Intent intent) {
        if (intent == null) return null;

        String intentAction = intent.getAction();
        if (INTENT_ACTION_CAMERA.equals(intentAction)) {
            return ACTION_CAMERA;
        }
        if (INTENT_ACTION_SCREEN.equals(intentAction)) {
            return ACTION_SCREEN;
        }

        String extra = intent.getStringExtra(EXTRA_QUICK_ACTION);
        if (ACTION_CAMERA.equalsIgnoreCase(extra)) {
            return ACTION_CAMERA;
        }
        if (ACTION_SCREEN.equalsIgnoreCase(extra)) {
            return ACTION_SCREEN;
        }
        return null;
    }

    public static void publishIntentIfQuickAction(Intent intent) {
        String action = extractActionFromIntent(intent);
        if (action == null) return;

        // Clear extra/action from consumed intent so activity recreation doesn't replay it
        if (intent != null) {
            intent.removeExtra(EXTRA_QUICK_ACTION);
            if (INTENT_ACTION_CAMERA.equals(intent.getAction()) || INTENT_ACTION_SCREEN.equals(intent.getAction())) {
                intent.setAction(Intent.ACTION_MAIN);
            }
        }

        publishAction(action);
    }

    public static void publishAction(String action) {
        if (!ACTION_CAMERA.equals(action) && !ACTION_SCREEN.equals(action)) return;
        Listener currentListener;
        synchronized (LOCK) {
            pendingEvent = new QuickActionEvent(action, System.currentTimeMillis());
            currentListener = listener;
        }
        if (currentListener != null) {
            currentListener.onQuickActionAvailable();
        }
    }

    public static QuickActionEvent consumePendingAction() {
        synchronized (LOCK) {
            QuickActionEvent event = pendingEvent;
            pendingEvent = null;
            return event;
        }
    }
}
