const { app, BrowserWindow, protocol, net, shell, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const ROOT = path.join(__dirname, 'web');
protocol.registerSchemesAsPrivileged([
  { scheme: 'atlas', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);
function external(url) {
  try {
    const u = new URL(url);
    if (['https:', 'http:'].includes(u.protocol) && u.hostname && !u.username && !u.password) shell.openExternal(u.href);
  } catch {}
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 960, minWidth: 390, minHeight: 640,
    backgroundColor: '#0e1a30', title: 'Dispatch Atlas',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('atlas://app/')) { event.preventDefault(); external(url); }
  });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.loadURL('atlas://app/index.html');
}
app.whenReady().then(() => {
  protocol.handle('atlas', async request => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'app') return new Response('Forbidden', { status: 403 });
      const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(ROOT + path.sep) || !fs.statSync(file).isFile()) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).href);
    } catch { return new Response('Not found', { status: 404 }); }
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.url.startsWith('atlas://app/')) return callback({ responseHeaders: details.responseHeaders });
    callback({ responseHeaders: { ...details.responseHeaders,
      'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: data: https:; connect-src 'self' https: http://127.0.0.1:*; frame-src https:; object-src 'none'; base-uri 'self'"]
    }});
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
