package com.hush.plus;

import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Collections;

public class MainActivity extends Activity {
    private WebView web;
    private EditText urlBar;
    private String hushScript = "";
    private boolean docStartInjected = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            InputStream in = getAssets().open("hush.js");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            hushScript = out.toString("UTF-8");
        } catch (Exception ignored) {}

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);

        urlBar = new EditText(this);
        urlBar.setSingleLine(true);
        urlBar.setHint("Adres veya arama");
        urlBar.setImeOptions(EditorInfo.IME_ACTION_GO);
        urlBar.setSelectAllOnFocus(true);
        bar.addView(urlBar, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        Button go = new Button(this);
        go.setText("Git");
        bar.addView(go, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        web = new WebView(this);
        root.addView(bar, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        root.addView(web, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // Script her sayfada ve iframe'lerde, sayfa kodlarindan ONCE calissin
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(web, hushScript, Collections.singleton("*"));
            docStartInjected = true;
        }

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView v, String url, Bitmap favicon) {
                if (!docStartInjected) v.evaluateJavascript(hushScript, null);
                if (!urlBar.hasFocus()) urlBar.setText(url);
            }
        });

        go.setOnClickListener(v -> navigate());
        urlBar.setOnEditorActionListener((v, actionId, e) -> {
            if (actionId == EditorInfo.IME_ACTION_GO
                    || (e != null && e.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
                navigate();
                return true;
            }
            return false;
        });

        web.loadUrl("https://www.google.com");
    }

    private void navigate() {
        String t = urlBar.getText().toString().trim();
        if (t.isEmpty()) return;
        String url;
        if (t.startsWith("http://") || t.startsWith("https://")) {
            url = t;
        } else if (t.contains(".") && !t.contains(" ")) {
            url = "https://" + t;
        } else {
            url = "https://www.google.com/search?q=" + android.net.Uri.encode(t);
        }
        web.loadUrl(url);
        urlBar.clearFocus();
        InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        if (imm != null) imm.hideSoftInputFromWindow(urlBar.getWindowToken(), 0);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
