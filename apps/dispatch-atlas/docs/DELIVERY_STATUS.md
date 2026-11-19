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
| Browser | Online/offline single HTML and folder build outputs; responsive interface | Browser UI acceptance and full device coverage are not claimed by this status snapshot. |
| iOS/iPadOS 17+ | WKWebView local-asset project | Swift compilation, simulator/device run, signing, background playback, lock-screen integration, push, and Blob export behavior. |
| tvOS 17+ | Native SwiftUI station/dispatch project; focus controls; MapKit; HTTPS polling/cache; parcel import; optional foreground AVPlayer | Compilation, remote/TV tests, signing, reliable background delivery, offline map imagery, and station hardware integration. |
| macOS 14+ | WKWebView project; Electron alternative | Native builds, physical OS tests, signing/notarization and release packaging. |
| Windows | Sandboxed Electron project and portable-build recipe | Compilation/packaging on Windows, signing, installer execution and native permissions. |
| Android 8+ | Kotlin WebView/AndroidX asset loader project | Gradle/SDK build, device execution, signing, background audio, native push, geolocation/Blob-download bridging; Android TV target absent. |

Native project instructions and precise limitations are in [platforms/README.md](../platforms/README.md).

## Validation evidence

| Check | Status |
| --- | --- |
| Core data validation/filtering tests | 17 passed on Node.js in this workspace. |
| Local service integration/security/persistence tests | 9 passed on Node.js in this workspace. |
| Application-state integration | 7 passed with a DOM double; not a rendering test. |
| Map projection and tile-origin policy | 6 passed. |
| `npm test` aggregate | 39 tests passed at this status snapshot. |
| Desktop shell JavaScript syntax | Parsed successfully; Electron runtime was not installed or executed. |
| Native asset-copy script | Python compilation checked. |
| Apple YAML / Android XML | Structural parsing only. |
| Browser UI smoke suite | Separate script supplied; no passing UI result is asserted here. |
| Native apps, simulators, installers | Not compiled or executed here. |

Tests do not establish provider availability, accuracy of third-party incident reports, or notification delivery reliability. Training fixtures are labeled throughout and are not evidence of real incidents.

## Build and hosting status

`npm run build` generates `dist/Dispatch_Atlas_Online.html`, `dist/Dispatch_Atlas_Offline.html`, `dist/online/`, and `dist/offline/`. `npm start` serves `web/` on `127.0.0.1:8787`. The native asset-copy step is separate; see the platform guide.

The [private web edition](https://dispatch-atlas-jeffe.jeffjoseph1129.chatgpt.site) deployment succeeded on 2026-11-19 (source commit `a0601ea0af0fa3412ba8e5f02e1d07e4b6a32e47`). Cloud-browser inspection reached the OpenAI sign-in page; no successful visual inspection is claimed. Local Chromium testing was blocked by the host socket policy. Source is isolated on `feat/dispatch-atlas-2026-11-19` under `apps/dispatch-atlas` in `CRYPTOJEFFE/JeffeRescueMap-AI`.

## Next deployment requirements

1. Connect authorized audio/archive sources and an authenticated HTTPS JSON gateway. Keep private credentials server-side; do not substitute a subscription for undocumented API access.
2. Supply authoritative local GIS/preplan records, parcel geometry, cross streets, and source-attributed exposure data. Configure a public Mapbox token if satellite imagery is wanted.
3. Build and run Apple targets on a Mac with Xcode/XcodeGen and signing access; Android with the SDK/JDK/Gradle; Electron on Windows/macOS. Complete target-device acceptance for playback, storage/import/export, remote focus, accessibility, and network interruption.
4. Implement and validate background push, cloud accounts/synchronization, native background media, ASR, and station hardware integration as separate capabilities before claiming those features.

Mapping references are linked in [README.md](../README.md). Public OpenStreetMap tiles are for permitted interactive online use, not bulk/offline downloads. Offline parcels are user-provided WGS84 GeoJSON, not a claim of authoritative land boundaries.
