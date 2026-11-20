package com.raspingmango.ectode;

import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

public class QuickCameraTileService extends TileService {

    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        if (tile == null) return;

        tile.setLabel(getString(R.string.quick_tile_camera));
        tile.setIcon(Icon.createWithResource(this, R.drawable.ic_tile_camera));
        tile.setState(Tile.STATE_INACTIVE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.setSubtitle(getString(R.string.quick_tile_camera_sub));
        }
        tile.updateTile();
    }

    @Override
    public void onClick() {
        super.onClick();
        if (isLocked()) {
            unlockAndRun(this::launchCameraScanner);
        } else {
            launchCameraScanner();
        }
    }

    private void launchCameraScanner() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setAction(QuickActionBridge.INTENT_ACTION_CAMERA);
        intent.putExtra(QuickActionBridge.EXTRA_QUICK_ACTION, QuickActionBridge.ACTION_CAMERA);
        intent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );

        openAndCollapse(intent, 201);
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
