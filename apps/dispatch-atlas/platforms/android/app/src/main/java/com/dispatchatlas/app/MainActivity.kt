package com.dispatchatlas.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader

class MainActivity : Activity() {
    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private val assetHost = "appassets.androidplatform.net"

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        web = WebView(this)
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = true // only files explicitly selected in the system picker
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
        }
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == "https" && uri.host == assetHost && uri.path?.startsWith("/assets/web/") == true) return false
                if (!request.isForMainFrame) return uri.scheme != "https"
                openExternal(uri)
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    startActivityForResult(params.createIntent(), 40)
                    true
                } catch (_: ActivityNotFoundException) {
                    fileCallback = null
                    callback.onReceiveValue(null)
                    false
                }
            }
        }
        web.setDownloadListener { url, _, _, _, _ ->
            if (url.startsWith("https://")) openExternal(Uri.parse(url))
            else Toast.makeText(this, "For JSON export, open the web edition in your browser.", Toast.LENGTH_LONG).show()
        }
        if (state != null) web.restoreState(state) else web.loadUrl("https://$assetHost/assets/web/index.html")
    }
    private fun openExternal(uri: Uri) {
        if (uri.scheme !in setOf("https", "http") || uri.host.isNullOrBlank() || uri.userInfo != null) return
        try { startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)) }
        catch (_: ActivityNotFoundException) { Toast.makeText(this, "No browser is available.", Toast.LENGTH_SHORT).show() }
    }
    @Deprecated("Legacy Activity result API retained to keep this shell dependency-light")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 40) {
            fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCallback = null
        }
    }
    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); web.saveState(outState) }
    @Deprecated("Use platform navigation when migrating to AndroidX Activity")
    override fun onBackPressed() { if (web.canGoBack()) web.goBack() else super.onBackPressed() }
    override fun onDestroy() { fileCallback?.onReceiveValue(null); web.destroy(); super.onDestroy() }
}
