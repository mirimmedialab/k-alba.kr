package kr.co.mirimmedialab.kalba;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

/**
 * MainActivity
 *
 * 위치 권한: Capacitor Geolocation 플러그인의 requestPermissions()가
 * 일부 Android(14/15)에서 콜백이 hang 되어 OS 권한 팝업이 안 뜨는 이슈가 있어,
 * 표준 Android 권한요청(ActivityCompat.requestPermissions)을 네이티브에서 직접 호출한다.
 * 권한이 부여되면 Geolocation 플러그인의 checkPermissions/getCurrentPosition 은 정상 동작.
 */
public class MainActivity extends BridgeActivity {

    private static final int REQ_LOCATION = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestLocationIfNeeded();
    }

    private void requestLocationIfNeeded() {
        boolean fine = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean coarse = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        if (!fine && !coarse) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    REQ_LOCATION
            );
        }
    }
}
