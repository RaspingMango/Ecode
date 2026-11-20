package com.raspingmango.ectode;

import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

public class QuickScreenTileService extends TileService {

    @Override
    public void onStartListening() {
        super.onStartListening();
        syncTileState();
    }

    @Override
    public void onClick() {
        super.onClick();
        if (ScreenCaptureBridge.isCapturing()) {
            Intent stopIntent = new Intent(this, ScreenCaptureService.class);
            stopIntent.setAction(ScreenCaptureService.ACTION_STOP);
            try {
                startService(stopIntent);
            } catch (Exception ignored) {
            }
            ScreenCaptureBridge.notifyStateChanged(false, "tile_stop");
            syncTileState();
            return;
        }

        if (isLocked()) {
            unlockAndRun(this::launchScreenScanner);
        } else {
            launchScreenScanner();
        }
    }

    private void syncTileState() {
        Tile tile = getQsTile();
        if (tile == null) return;

        boolean active = ScreenCaptureBridge.isCapturing();
        tile.setLabel(getString(R.string.quick_tile_screen));
        tile.setIcon(Icon.createWithResource(this, R.drawable.ic_tile_screen));
        tile.setState(active ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.setSubtitle(getString(active ? R.string.quick_tile_screen_active : R.string.quick_tile_screen_sub));
        }
        tile.updateTile();
    }

    private void launchScreenScanner() {
        Intent intent = new Intent(this, QuickScreenCaptureActivity.class);
        intent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_NO_ANIMATION
        );

        openAndCollapse(intent, 202);
    }

    @SuppressWarnings("deprecation")
    private void openAndCollapse(Intent intent, int requestCode) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            startActivityAndCollapse(pendingIntent);
        } else {
            startActivityAndCollapse(intent);
        }
    }
}
