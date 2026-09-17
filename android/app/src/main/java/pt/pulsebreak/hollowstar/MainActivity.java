package pt.pulsebreak.hollowstar;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * The Hollow Star corre de bordo a bordo, sem barras de sistema, e mantém o
 * ecrã ligado enquanto se joga.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        esconderBarras();
    }

    @Override
    public void onWindowFocusChanged(boolean temFoco) {
        super.onWindowFocusChanged(temFoco);
        if (temFoco) {
            esconderBarras();
        }
    }

    /** Modo imersivo: as barras só aparecem se o jogador deslizar a partir do bordo. */
    private void esconderBarras() {
        View raiz = getWindow().getDecorView();
        WindowInsetsControllerCompat controlador = WindowCompat.getInsetsController(getWindow(), raiz);
        controlador.hide(WindowInsetsCompat.Type.systemBars());
        controlador.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
    }
}
