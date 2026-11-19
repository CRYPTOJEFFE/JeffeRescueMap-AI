import SwiftUI
import WebKit
#if os(macOS)
import AppKit
#else
import UIKit
#endif

@main
struct DispatchAtlasApp: App {
    var body: some Scene {
        WindowGroup {
            AtlasWebView().ignoresSafeArea(edges: .bottom)
                .preferredColorScheme(.dark)
        }
    }
}

final class AtlasNavigation: NSObject, WKNavigationDelegate, WKUIDelegate {
    private let root: URL
    init(root: URL) { self.root = root.standardizedFileURL; super.init() }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if navigationAction.targetFrame?.isMainFrame == false {
            decisionHandler(url.scheme == "https" ? .allow : .cancel); return
        }
        if url.isFileURL && url.standardizedFileURL.path.hasPrefix(root.path + "/") {
            decisionHandler(.allow); return
        }
        decisionHandler(.cancel)
        openExternal(url)
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { openExternal(url) }
        return nil
    }
    private func openExternal(_ url: URL) {
        guard ["https", "http"].contains(url.scheme?.lowercased() ?? ""), url.host != nil,
              url.user == nil, url.password == nil else { return }
        #if os(macOS)
        NSWorkspace.shared.open(url)
        #else
        UIApplication.shared.open(url)
        #endif
    }
    #if os(macOS)
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.begin { response in completionHandler(response == .OK ? panel.urls : nil) }
    }
    #endif
}

private func makeWebView(delegate: AtlasNavigation) -> WKWebView {
    let configuration = WKWebViewConfiguration()
    #if os(iOS)
    configuration.allowsInlineMediaPlayback = true
    configuration.mediaTypesRequiringUserActionForPlayback = .all
    #endif
    let web = WKWebView(frame: .zero, configuration: configuration)
    web.navigationDelegate = delegate
    web.uiDelegate = delegate
    web.allowsBackForwardNavigationGestures = true
    if let root = Bundle.main.url(forResource: "web", withExtension: nil) {
        web.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
    } else {
        web.loadHTMLString("<h1>Web assets missing</h1><p>Run platforms/copy-assets.py before building.</p>", baseURL: nil)
    }
    return web
}

#if os(macOS)
struct AtlasWebView: NSViewRepresentable {
    func makeCoordinator() -> AtlasNavigation {
        AtlasNavigation(root: Bundle.main.url(forResource: "web", withExtension: nil) ?? Bundle.main.bundleURL)
    }
    func makeNSView(context: Context) -> WKWebView { makeWebView(delegate: context.coordinator) }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
}
#else
struct AtlasWebView: UIViewRepresentable {
    func makeCoordinator() -> AtlasNavigation {
        AtlasNavigation(root: Bundle.main.url(forResource: "web", withExtension: nil) ?? Bundle.main.bundleURL)
    }
    func makeUIView(context: Context) -> WKWebView { makeWebView(delegate: context.coordinator) }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
#endif
