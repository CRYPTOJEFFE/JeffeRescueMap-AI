# Dispatch Atlas native editions

These projects wrap the shared web edition on iOS, macOS, Android, and desktop, and provide a separate native station/dispatch display on tvOS. The source projects are accompanied by GitHub Actions build outputs. The iOS and tvOS **simulator apps**, native unsigned macOS app, Android debug APK, unsigned Electron macOS DMG, and unsigned Windows portable EXE compiled/packaged successfully in run 44635479873 on 2026-11-19. Physical-device behavior, native background audio, signing/notarization, and store distribution have not been tested. Simulator apps are not installable on physical iPhones or Apple TVs.

The supplementary [universal Mac run 44636797892](https://github.com/CRYPTOJEFFE/JeffeRescueMap-AI/actions/runs/44636797892), commit `98590e7295b7071e2823fd9630d5ebf715d1464c`, also passed native Release and Electron DMG builds. `lipo` checks verified **both Intel `x86_64` and Apple Silicon `arm64`** in each app executable, and artifact uploads succeeded. Use these newer universal Mac artifacts instead of the original Apple Silicon-only Mac outputs. They remain unsigned and have not been launched on a physical Mac.

## Package the shared web application

Run from the project root after building the web edition:

```sh
python3 platforms/copy-assets.py
```

This copies `web/` into the three shells. It does not generate or download additional dependencies. Re-run whenever the web source changes. The standalone `dist/Dispatch_Atlas_Online.html` and `dist/Dispatch_Atlas_Offline.html` are separate deliverables; native shells use the folder edition.

## iPhone, iPad, and Mac

Requirements: a Mac with Xcode 15 or newer, the iOS/macOS SDKs, and XcodeGen. Targets require iOS/iPadOS 17 or macOS 14. The Apple sources use only Apple's system frameworks.

```sh
cd platforms/apple
xcodegen generate
open DispatchAtlas.xcodeproj
```

Select `DispatchAtlasIOS` or `DispatchAtlasMac`, choose your signing team, select a simulator or your device, then Run. Device/store distribution requires your Apple developer signing configuration. `project.yml` generates the Info.plist and macOS sandbox entitlements; do not add broad network security exceptions.

Optional simulator compilation checks on a Mac:

```sh
xcodebuild -project DispatchAtlas.xcodeproj -scheme DispatchAtlasIOS -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
xcodebuild -project DispatchAtlas.xcodeproj -scheme DispatchAtlasMac -destination 'platform=macOS' CODE_SIGNING_ALLOWED=NO build
```

The WebKit shell loads local assets without remote application code or a JavaScript/native bridge. It opens ordinary external web links in the system browser. Audio in this starter shell is foreground audio; native background playback, lock-screen metadata, push notifications, and OS-wide audio interruption recovery require additional native integration and testing. Browser downloads/export behavior must be verified on each OS; use the ordinary browser edition when exporting fails in a WebView.

## Apple TV

Select `DispatchAtlasTV` after generating the same Xcode project. This target requires tvOS 17. It uses SwiftUI and MapKit; it does **not** try to run a web view on Apple TV.

```sh
xcodebuild -project DispatchAtlas.xcodeproj -scheme DispatchAtlasTV -sdk appletvsimulator -destination 'generic/platform=tvOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Use the remote to switch Station View/Dispatch View, select calls, switch street/satellite imagery, and open Settings. Set a station title, an optional assigned-unit filter, and an HTTPS URL returning an incident envelope. The app fetches every 15 seconds while active; failed or old snapshots show a stale indicator. A saved snapshot is available after restart. Training fixtures remain labeled. The training announcement is an explicit test action, not an automated operational alert. An optional direct HTTPS stream URL enables foreground AVPlayer playback; the app has no provider login, entitlement bypass, or feed-directory API.

The station screen shows reported address, supplied cross streets, assigned units, exact supplied coordinates, and supplied POIs/exposures with their source/verification metadata. It never derives real building hazards from the fictional fixture. In Settings, load an authoritative GeoJSON parcel URL to show Polygon/MultiPolygon boundaries. The layer can be hidden, cleared, and reloaded; its last snapshot remains available after restart. Imported polygons do not establish authoritative parcel ownership or building risks. Apple map imagery requires connectivity; offline tile downloads are not implemented. No precision pin is substituted for missing coordinates.

### TV gateway contract

The app accepts this subset of the shared incident contract (additional fields are ignored):

```json
{
  "incidents": [{
    "id": "training-001",
    "title": "Training • Possible structure fire",
    "emoji": "💨🔥",
    "agency": "Training channel",
    "area": "Fictional scenario",
    "address": "Training address",
    "crossStreets": ["Example Avenue", "Training Street"],
    "lat": null,
    "lon": null,
    "priority": "high",
    "status": "training",
    "reportedAt": "2026-11-19T12:00:00Z",
    "units": ["Training Engine"],
    "transcript": "Fictional training transmission.",
    "trigger": "Smoke reported",
    "source": "Training fixture",
    "verification": "demo",
    "demo": true,
    "pois": [{
      "name": "Example commercial exposure",
      "kind": "commercial",
      "lat": null,
      "lon": null,
      "source": "Fictional training fixture",
      "verifiedAt": null,
      "notes": "No real property identified."
    }]
  }]
}
```

`id` and `title` are required. Optional fields can be omitted. Duplicate IDs or more than 2,000 calls reject the snapshot. Responses above 2 MB reject the snapshot after download. A failed response does not erase the last readable snapshot. The starter TV app has no authentication UI; expose only data appropriate to the device/network and place authorization at your gateway. Do not put credentials or private API keys into URL query strings.

## Android

Requirements: Android Studio with SDK 35, JDK 17, and Gradle 8.9. Minimum OS: Android 8.0 (API 26). The checked-in build files use Android Gradle Plugin 8.7.3, Kotlin 2.0.21, and AndroidX WebKit 1.12.1; review/pin current maintained dependency releases before distribution.

Open `platforms/android` in Android Studio and sync. Or, with Gradle 8.9 installed:

```sh
cd platforms/android
gradle wrapper --gradle-version 8.9
./gradlew assembleDebug
```

On Windows use `gradlew.bat assembleDebug`. Debug output is `app/build/outputs/apk/debug/app-debug.apk`. A release requires your own keystore and signing setup. The Gradle wrapper binary is not bundled; the command above generates it using your installed Gradle.

Local assets are served through AndroidX `WebViewAssetLoader` at `https://appassets.androidplatform.net/assets/web/index.html`. File import uses the system picker, cleartext traffic is disabled, mixed content is rejected, and no JavaScript/native bridge is exposed. JSON Blob export and device geolocation are not bridged by this initial shell. Use the browser/PWA edition for those flows. Background audio, push notifications, Android Auto, and an Android TV launch target are not implemented by this minimal Android shell.

## Windows, macOS, and Linux desktop shell

Requirements: Node.js/npm on the target OS. Review the pinned dependency ranges and generate a lockfile before release.

```sh
cd platforms/desktop
npm install
npm start
```

Build on the target platform:

```sh
npm run build:win
npm run build:mac
npm run build:linux
```

Outputs appear in `platforms/desktop/release`. Windows produces a portable executable, macOS a DMG, Linux an AppImage. Signing/notarization requires your own configuration and credentials. GitHub Actions successfully packaged the unsigned macOS DMG and Windows portable EXE; build details are recorded below.

The Electron shell serves local assets using its `atlas://app` protocol, keeps Node integration disabled and the renderer sandboxed, uses context isolation, prevents embedded webviews, opens only HTTP(S) links externally, and denies permission requests by default. Local import works through normal HTML file controls. Geolocation and native notifications need deliberate permission UI before enabling them. The shell is not a remote content browser.

## Integration boundaries

The web edition's gateway CORS configuration must explicitly allow the shell origin being used:

| Shell | Origin seen by a gateway |
| --- | --- |
| Apple local WebKit | `null` (file document) |
| Android | `https://appassets.androidplatform.net` |
| Electron | `atlas://app` |
| Apple TV native URLSession | No browser CORS enforcement |

Do not use unrestricted CORS as a substitute for authorization. Production endpoints and native media should use HTTPS. The development server's `http://127.0.0.1:8787` address is local to each device and will not reach your Mac/NAS from a phone or TV. Put the gateway behind a trusted HTTPS hostname for network devices.

## Build validation

- `node --check platforms/desktop/main.cjs`: passed.
- `python3 -m py_compile platforms/copy-assets.py`: passed.
- Apple project YAML and Android XML are parsed as structural validation.
- GitHub Actions run [44635479873](https://github.com/CRYPTOJEFFE/JeffeRescueMap-AI/actions/runs/44635479873), source commit `4d2868fc5c5c55aec07b7c787df94d663c52829b`: iOS simulator app, tvOS simulator app, native unsigned macOS app, Android debug APK, and Electron macOS DMG **build/packaging passed**.
- Supplementary [Mac universal run 44636797892](https://github.com/CRYPTOJEFFE/JeffeRescueMap-AI/actions/runs/44636797892), commit `98590e7295b7071e2823fd9630d5ebf715d1464c`: native Release app, Electron universal DMG, `arm64`/`x86_64` verification with `lipo`, and uploads **passed**.
- Electron Windows portable EXE packaging and artifact upload: **passed** in the same run.
- Shared web tests: 39 Node tests and 11 Chromium acceptance tests passed, as recorded by the main project validation.
- Build success is not a native runtime test. No physical iPhone, Apple TV, Android, Windows, or Mac device was exercised. No simulator interaction tests were run. No hardware-signed iOS/tvOS IPA, release-signed Android APK, notarized Mac app, or signed Windows release is included.
- iOS/tvOS ZIP files contain simulator `.app` bundles for Xcode Simulator. They cannot be installed on physical devices. For hardware builds, open the source project on a Mac, select your signing team and target device, then compile for that device.

Primary implementation references: [Apple MapKit for SwiftUI](https://developer.apple.com/documentation/mapkit/mapkit-for-swiftui), [Apple web views](https://developer.apple.com/design/human-interface-guidelines/web-views), [Android local web content](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), and [Electron security](https://www.electronjs.org/docs/latest/tutorial/security).

## Optional manual GitHub build workflow

`docs/native-build-workflow.yml` is an inactive template. To enable it, copy it into the repository as `.github/workflows/dispatch-atlas-native.yml`, commit it to the repository default branch, then select **Actions → Dispatch Atlas native build checks → Run workflow**. Its paths assume this project is located at `apps/dispatch-atlas`.

The template compiles iOS/tvOS simulator apps and an unsigned native macOS app, an Android debug APK, and unsigned Electron Windows portable/macOS DMG packages. Successful jobs upload artifacts retained for 14 days. Apple simulator artifacts cannot install on physical iPhones or Apple TVs. Android uses a debug signing identity; macOS/Windows distributions are not release signed or notarized. The workflow does not publish a GitHub release, send anything to an app store, or require signing secrets. GitHub-hosted runner usage may consume your account's Actions allowance.

The workflow has only `contents: read` permission, is manual-only, and pins action dependencies to verified commit SHAs. It installs build tools and dependencies when you run it. The template was statically parsed. An active copy of the workflow ran in GitHub Actions; actual job results are recorded above. A build artifact does not establish that its device interactions were tested. Once a lockfile is generated for the Electron package, commit it so the job uses `npm ci`.
