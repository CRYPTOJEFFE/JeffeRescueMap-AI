# Dispatch Atlas delivery status

Status recorded 2026-11-19. This document distinguishes implemented source, executed validation, external dependencies, and unfinished work. It does not certify exact Squawster parity or operational emergency dispatch readiness.

## Evidence and implementation identity

- Target: [Squawster App Store listing](https://apps.apple.com/us/app/squawster-police-scanner/id6802709530), supplied screenshots, and the 21.833-second screen recording sampled at three-second intervals.
- Independent product name: **Dispatch Atlas**. The observed color/style and common interactions were reconstructed with original code; no proprietary logo, app code, or private API access was used.
- REA workflow source: [CRYPTOJEFFE/rea revision 71cc6b6f8523647a9997137caf5c684142a73fff](https://github.com/CRYPTOJEFFE/rea/tree/71cc6b6f8523647a9997137caf5c684142a73fff). No REA engine or binary inspection was performed.
- The screenshots establish only visible behavior; advertised features and inaccessible behavior are recorded separately in [OBSERVED_PARITY.md](OBSERVED_PARITY.md).

## Feature delivery matrix

| Capability | Implemented now | Dependency or unfinished portion |
| --- | --- | --- |
| Matching interface direction | Navy/gold styling, incident cards/detail, player controls, category/type selector | Exact visual and interaction parity across all unobserved screens is not established. |
| Incident browsing | Search, area/priority/type filters, favorites, saved dashboard filters | No automatically connected nationwide incident service. |
| Radio playback | Direct authorized URL configuration, media player, call list, Hold/Ignore, playback ordering | No authenticated Broadcastify login, entitlement integration, feed-directory sync, or supplied live streams. |
| Offline audio | User-imported local recordings stored on device | Browser storage capacity and WebView export support vary; exported JSON does not carry audio bytes. |
| Transcripts | Display of imported transcripts and explicit reading of training text | No trained ASR model, radio ingestion pipeline, model training, or quality benchmark. |
| Transcript classification | Local rule-based candidate extraction | This is not AI confirmation or a trained classifier. |
| Incident maps | Supplied coordinates, markers, pan/zoom, POIs, unknown-location state | No automatic geocoding/cross-street service or incident-location verification. |
| Street / satellite | Online tile integration and attribution; satellite uses supplied public token | Network/provider availability, token configuration, and tile policy requirements apply. |
| Plat / parcels | Imported GeoJSON rendering; native tvOS parcel loader/cache | Authoritative parcel/preplan datasets must be supplied; no bundled cadastral database. |
| Nearby building exposures | Supplied POIs and risk records, distance, provenance/verification display | No verified list of local high-rises, industrial yards, tire storage, or vacant structures. Training examples do not describe real hazards. |
| Dispatch view | List/map workspace | Production CAD integration and operational acceptance are absent. |
| Station view | Enlarged selected call, units, cross streets, map, exposure list, local acknowledgment and alert test | No firehouse hardware interface, guaranteed alert delivery, or operational tone-out certification. |
| Notifications | Browser permission request and alerts while polling in an open app | Background push/APNs/FCM delivery and closed-app alerting are unfinished. |
| Persistence | Local preferences, saved datasets, JSON import/export, local service snapshot | No user accounts, cloud sync, multi-user conflict resolution, or cross-device identity. |
| Offline editions | Embedded interface and data, imported geometry/local recordings; online calls disabled | No offline street/satellite tile package; updates require later imports. |
| Local gateway | Empty initial API, token-protected validated imports, atomic persistence and exports | HTTPS and reader authentication must be added at deployment boundary. |

## Platform delivery matrix

| Platform | What is delivered | What has not been verified |
| --- | --- | --- |
| Browser | Online/offline single HTML and folder builds; 11 real Chromium flows passed in CI | Authenticated deployed-preview rendering and full physical-device/browser coverage. |
| iOS/iPadOS 17+ | WKWebView project; iOS Simulator build passed | Simulator runtime, device installation, distribution signing, background playback, lock-screen integration, push, and device export behavior. |
| tvOS 17+ | Native SwiftUI station/dispatch; tvOS Simulator build passed | Simulator/TV runtime, remote behavior, device signing/install, reliable background delivery, offline imagery, station hardware. |
| macOS 14+ | Unsigned universal native WKWebView app and Electron DMG; both contain Intel `x86_64` and Apple Silicon `arm64` | Installation/runtime, physical OS tests, signing/notarization. |
| Windows | Sandboxed Electron project; unsigned portable executable packaging and artifact upload passed | Release signing, executable launch, installation/runtime and native permissions. |
| Android 8+ | Kotlin WebView/AndroidX asset loader; debug APK built successfully | Device install/runtime, release signing, background audio, native push, geolocation/Blob-download bridging; Android TV target absent. |

Native implementation details and rebuild commands are in [platforms/README.md](../platforms/README.md). Successful compilation does not establish simulator execution or physical-device behavior.

## Validation evidence

| Check | Status |
| --- | --- |
| Core, application-state, server, and map tests | 39 Node tests passed in CI. Application-state doubles remain distinct from rendering tests. |
| Browser UI smoke suite | 11 real Chromium browser flows passed in GitHub CI. |
| Android | Debug APK compilation/package passed in CI. |
| Apple native targets | iOS Simulator, tvOS Simulator, and unsigned native macOS builds passed in CI. |
| Electron macOS | Unsigned DMG packaging passed in the original CI run; supplementary universal build and both-architecture checks also passed. |
| Electron Windows | Unsigned portable executable packaging and artifact upload passed in CI. |
| Screenshots | Reviewed `desktop-incidents.png`, `desktop-station.png`, and `mobile-categories.png` from CI artifact `14584830394`; layouts fit their viewports. The mobile browser suite also asserted no horizontal overflow. |
| Physical devices | No installation, app launch, or native-runtime test completed. |

Evidence: [GitHub Actions run 44635479873](https://github.com/CRYPTOJEFFE/JeffeRescueMap-AI/actions/runs/44635479873), source head `4d2868fc5c5c55aec07b7c787df94d663c52829b`; all jobs completed successfully. The earlier local Chromium attempt was blocked by the workspace socket policy. That local limitation is separate from the successful real-browser execution in GitHub CI.

Supplementary Mac evidence: [run 44636797892](https://github.com/CRYPTOJEFFE/JeffeRescueMap-AI/actions/runs/44636797892), source head `98590e7295b7071e2823fd9630d5ebf715d1464c`, passed native Release compilation, Electron universal DMG packaging, `lipo` checks for both `arm64` and `x86_64`, and artifact upload. This extends Mac architecture coverage to Intel and Apple Silicon; it is not a physical Mac runtime test. The original 39 Node / 11 Chromium and other-platform results remain attributed to run 44635479873.

Tests do not establish provider availability, accuracy of third-party incident reports, or notification delivery reliability. Training fixtures are labeled throughout and are not evidence of real incidents.

## Build and hosting status

`npm run build` generates `dist/Dispatch_Atlas_Online.html`, `dist/Dispatch_Atlas_Offline.html`, `dist/online/`, and `dist/offline/`. `npm start` serves `web/` on `127.0.0.1:8787`. The native asset-copy step is separate; see the platform guide.

The [private web edition](https://dispatch-atlas-jeffe.jeffjoseph1129.chatgpt.site) deployment succeeded on 2026-11-19 (source commit `a0601ea0af0fa3412ba8e5f02e1d07e4b6a32e47`). Cloud-browser inspection reached the OpenAI sign-in page, so authenticated visual inspection of the deployed site remains unverified. The source subsequently passed 11 real Chromium flows in GitHub CI. Source is isolated on `feat/dispatch-atlas-2026-11-19` under `apps/dispatch-atlas` in `CRYPTOJEFFE/JeffeRescueMap-AI`.

## Download and install the CI artifacts

Open the [verified build run](https://github.com/CRYPTOJEFFE/JeffeRescueMap-AI/actions/runs/44635479873) while signed in to GitHub and download its available artifacts. Extract the Android artifact to get the debug APK for a test device; download the Mac artifacts from the [supplementary universal run](https://github.com/CRYPTOJEFFE/JeffeRescueMap-AI/actions/runs/44636797892) to get the unsigned universal DMG and native app for Intel or Apple Silicon. The original run's Mac packages were Apple Silicon only. Physical-device installation remains a next step. iOS/tvOS outputs are simulator builds, not signed device-installable IPA files; build/sign device targets with Xcode. For Windows, extract the portable artifact and run its unsigned executable on a test computer; physical runtime remains untested.

Artifacts expire **December 3, 2026**. Rerun the repository's build workflow to regenerate them; source and build instructions remain in the repository. Do not treat an unsigned/test package as an App Store or production-signed release.

## Next deployment requirements

1. Connect authorized audio/archive sources and an authenticated HTTPS JSON gateway. Keep private credentials server-side; do not substitute a subscription for undocumented API access.
2. Supply authoritative local GIS/preplan records, parcel geometry, cross streets, and source-attributed exposure data. Configure a public Mapbox token if satellite imagery is wanted.
3. Install and run the completed builds on target devices. Use Apple signing access for physical iOS/tvOS builds and release signing/notarization for distribution. Complete acceptance for playback, storage/import/export, remote focus, accessibility, and network interruption.
4. Implement and validate background push, cloud accounts/synchronization, native background media, ASR, and station hardware integration as separate capabilities before claiming those features.

Mapping references are linked in [README.md](../README.md). Public OpenStreetMap tiles are for permitted interactive online use, not bulk/offline downloads. Offline parcels are user-provided WGS84 GeoJSON, not a claim of authoritative land boundaries.
