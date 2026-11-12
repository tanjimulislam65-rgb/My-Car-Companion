
package com.tanzim.mycarcompanion

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.webkit.WebViewAssetLoader

class MainActivity : Activity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler(
                "/assets/",
                WebViewAssetLoader.AssetsPathHandler(this)
            )
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                url: String
            ): android.webkit.WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(
                    android.net.Uri.parse(url)
                )
            }
        }

        webView.loadUrl(
            "https://appassets.androidplatform.net/assets/index.html"
        )

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    webView.evaluateJavascript(
                        """
                        (function() {
                            const active = document.querySelector('.page.active');
                            if (active && active.id !== 'dashboard') {
                                navigate('dashboard');
                                return 'handled';
                            }
                            return 'exit';
                        })();
                        """
                    ) { result ->
                        if (result == "\"exit\"") {
                            finish()
                        }
                    }
                }
            }
        )
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
