# Dispatch Atlas

Dispatch Atlas is an independent scanner and incident workspace reconstructed from the supplied Squawster screenshots, sampled screen recording, and public product information. It follows the observed navy-and-gold visual style and scanner interactions, with added dispatch and firehouse displays. It uses its own identity and implementation; Squawster's logo, proprietary code, private APIs, and backend were not copied.

This delivery includes runnable browser editions, a local incident service, native source projects, and **successful CI builds for Android, iOS Simulator, tvOS Simulator, macOS, and Windows**. It is not an exact feature-parity claim or a signed, device-tested release for every platform. Bundled incidents, addresses, transcripts, and risk examples are explicitly fictional training fixtures. Named channel entries are unconnected configuration placeholders.

## Quick start

| Edition | Open or run | Behavior |
| --- | --- | --- |
| Online single HTML | `dist/Dispatch_Atlas_Online.html` | Self-contained interface; optional incident URLs, authorized audio URLs, and online map layers. |
| Offline single HTML | `dist/Dispatch_Atlas_Offline.html` | Saved/imported incidents, local recordings, and imported GeoJSON; endpoint fetches, remote playback, and online tiles disabled. |
| Online folder | `dist/online/index.html` | Folder edition with separate assets and service worker for supported hosted browser contexts. |
| Offline folder | `dist/offline/index.html` | Folder edition with network sources disabled. |
| Local service + web app | `npm start` | Opens a server at `http://127.0.0.1:8787`; web UI starts with labeled training data, server API starts empty. |

Use a current browser that supports HTML audio, IndexedDB, and local storage. Single-file pages can be opened directly. Browser restrictions differ for `file://` documents; use the hosted folder edition for installability and online map behavior. Offline editions do not include a downloaded street or satellite basemap. Their map is a coordinate overview with supplied incident/POI markers and imported geometry.

From this source directory, with Node.js 22 or newer:

```sh
npm test
npm run build
npm start
```

The browser app and local service have no package dependencies to install. `npm run build` generates both HTML files and both folders. Native shells have their own build prerequisites and dependencies. `npm test` runs **39 passing core, application-state, server, and map tests**. CI also passed **11 real Chromium browser flows**. Native compilation passed as listed below; physical-device installation and runtime acceptance remain untested. See [delivery status](docs/DELIVERY_STATUS.md).

## Use the workspace

1. Browse incidents, open a detail panel, and filter by area, category/type, text, or priority. Save dashboard filters and favorite incidents or feeds.
2. Use **Listen** to configure a direct authorized audio URL or import a local recording. Feed names alone do not establish a provider connection. Training transcript playback is clearly labeled speech, not original radio audio.
3. Use **Dispatch view** for the incident list and map, or **Station view** for an enlarged call display, unit filter, local acknowledgment, and explicit alert test.
4. Import a normalized JSON dataset in **Settings**. Export your workspace before transferring devices. Exported JSON includes preferences and records but does not include local recording bytes.
5. Import authoritative WGS84 GeoJSON for parcel/plat geometry. Add source-attributed POIs and exposure records to incident data. Commercial, high-rise, industrial, tire-yard, or vacant-building labels are supplied data, never inferred real hazards.
6. In the online edition, enter an incident JSON endpoint in Settings. For the bundled service use `http://127.0.0.1:8787/api/incidents`. New imports are polled while the app is open. Unavailable connections show saved-data state.

The browser data service uses the shared `{incidents, feeds, calls}` contract. Authentication for writing, validation, sample import, and deployment details are in [server/README.md](server/README.md). The included service has no provider credentials and no user-account system.

## Platform support in this delivery

| Platform | Included implementation | Verification / remaining requirement |
| --- | --- | --- |
| Web online | Responsive browser interface, direct audio configuration, incident polling, map links and optional tiles | 39 Node tests and 11 real Chromium flows passed in CI; physical-device coverage remains open. |
| Web offline | Standalone HTML and folder editions, local records/preferences, local recording storage, GeoJSON display | Browser flows tested in CI; no internet feeds, server polling, or downloaded street/satellite imagery. |
| iOS / iPadOS | Local-asset WKWebView, iOS/iPadOS 17+ target | iOS Simulator build passed; simulator runtime, device signing/install, and device tests remain; foreground audio only. |
| tvOS | Native SwiftUI Station/Dispatch, remote controls, MapKit layers, HTTPS polling/cache, supplied POIs/parcels | tvOS Simulator build passed; remote/TV runtime and device signing/install remain; no offline imagery or automated station hardware. |
| macOS | WKWebView app for macOS 14+, plus Electron option | Unsigned native app and unsigned Electron DMG builds passed; installation/runtime and signing/notarization remain. |
| Windows | Sandboxed Electron source and unsigned portable executable | CI packaging and artifact upload passed; installation/runtime and release signing remain unverified. |
| Android | Kotlin WebView/AndroidX local asset loader, Android 8+ | Debug APK build passed; device installation/runtime and release signing remain; no native background audio, push, or Android TV target. |

Build evidence is in [GitHub Actions run 44635479873](https://github.com/CRYPTOJEFFE/JeffeRescueMap-AI/actions/runs/44635479873), commit `4d2868fc5c5c55aec07b7c787df94d663c52829b`. Download the available artifacts from that run while signed in to GitHub. They expire **December 3, 2026**; rerun the repository's build workflow to regenerate them.

For Android, extract the Android artifact and install its debug APK on a test device. For macOS, extract the macOS artifact and open the unsigned DMG; production distribution still requires signing/notarization. iOS/tvOS artifacts target simulators and cannot be installed directly on physical devices; use Xcode and your signing team for device builds. For Windows, extract the portable artifact and run its unsigned executable on a test computer; no installation/runtime result is claimed. See [platforms/README.md](platforms/README.md) for rebuild commands and platform restrictions. A successful build is not an app-launch or device-runtime test.

## Maps and data connections

The map offers a coordinate overview, hosted OpenStreetMap street tiles, optional Mapbox satellite tiles using a user-supplied public `pk.` token, and imported plat/parcel geometry. No private Mapbox key is bundled. The token is session-only. Apple Maps, Google Maps, Street View, and Waze are external links in the online edition. Cross streets and risk attributes must come from the imported incident/GIS records. No automatic parcel, building-risk, or cross-street database has been connected.

Primary references:

- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/) — attribution, valid browser referrer, normal caching, no bulk/offline downloading from the public tile service.
- [Mapbox Static Tiles API](https://docs.mapbox.com/api/maps/static-tiles/) — supported style raster tiles, public access token, and request limits/costs.
- [GeoJSON RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946) — WGS84 longitude/latitude geometry format.
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) — map and Street View links.
- [Apple MapKit for SwiftUI](https://developer.apple.com/documentation/mapkit/mapkit-for-swiftui) — native tvOS map implementation.

## Reconstruction evidence

The REA workflow was consulted through [CRYPTOJEFFE/rea](https://github.com/CRYPTOJEFFE/rea) at revision `71cc6b6f8523647a9997137caf5c684142a73fff`. No REA engine, app binary analysis, private-source recovery, or authenticated Squawster backend inspection occurred. The reference recording was sampled; unseen transitions are not established. See [observed parity](docs/OBSERVED_PARITY.md) and [evidence metadata](docs/evidence.json).

The [private web edition](https://dispatch-atlas-jeffe.jeffjoseph1129.chatgpt.site) was successfully deployed on 2026-11-19. Cloud-browser inspection reached the OpenAI sign-in page. Separately, the source passed 11 real Chromium flows in GitHub CI. The desktop incident, desktop station, and mobile category screenshots were visually reviewed and fit their viewports; the mobile suite also checked horizontal overflow. These checks do not establish authenticated rendering of the deployed preview. The source is isolated under `apps/dispatch-atlas` on a feature branch of `CRYPTOJEFFE/JeffeRescueMap-AI`.

## Next connections required

- Authorized radio feed/archive URLs or a supported provider integration, plus a gateway for private credentials.
- An authenticated HTTPS incident endpoint for phones, Apple TV, and shared station displays; authoritative parcel, cross-street, POI, and preplan data for the intended coverage area.
- Physical-device installation/runtime checks and release signing for Apple, Android, and desktop builds.
- Separate implementation and testing for background push, cloud synchronization, native background audio, speech transcription, and operational station alert hardware.
