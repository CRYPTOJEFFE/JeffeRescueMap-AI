# Dispatch Atlas

Dispatch Atlas is an independent scanner and incident workspace reconstructed from the supplied Squawster screenshots, sampled screen recording, and public product information. It follows the observed navy-and-gold visual style and scanner interactions, with added dispatch and firehouse displays. It uses its own identity and implementation; Squawster's logo, proprietary code, private APIs, and backend were not copied.

This delivery includes runnable browser editions, a local incident service, and **uncompiled native source projects**. It is not an exact feature-parity claim or a signed, device-tested release for every platform. Bundled incidents, addresses, transcripts, and risk examples are explicitly fictional training fixtures. Named channel entries are unconnected configuration placeholders.

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

The browser app and local service have no package dependencies to install. `npm run build` generates both HTML files and both folders. Native shells have their own build prerequisites and dependencies. `npm test` currently runs **39 passing core, application-state, server, and map tests**. Browser UI and native-device acceptance remain separate checks; see [delivery status](docs/DELIVERY_STATUS.md).

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
| Web online | Responsive browser interface, direct audio configuration, incident polling, map links and optional tiles | Core/server tested; UI/device acceptance not claimed here. |
| Web offline | Standalone HTML and folder editions, local records/preferences, local recording storage, GeoJSON display | No internet feeds, server polling, or downloaded satellite/street imagery. |
| iOS / iPadOS | Local-asset WKWebView source, iOS/iPadOS 17+ target | Xcode build, signing, simulator/device tests required; foreground audio only. |
| tvOS | Native SwiftUI Station/Dispatch source, remote controls, MapKit layers, HTTPS polling/cache, supplied POIs/parcels, optional foreground stream | tvOS 17+; uncompiled; no web view; no offline imagery or automated station hardware control. |
| macOS | WKWebView source for macOS 14+, plus Electron source option | Build and signing/notarization required; OS integration unverified. |
| Windows | Sandboxed Electron source and portable-build command | Windows build, installer verification, signing, and device tests required. |
| Android | Kotlin WebView source with AndroidX local asset loader, Android 8+ target | Android SDK/Gradle build and signing required; no native background audio, push, or Android TV target. |

See [platforms/README.md](platforms/README.md) for exact build commands, minimum OS versions, platform limitations, and network-origin requirements. The web build is not evidence that the native apps compiled or ran.

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

The [private web edition](https://dispatch-atlas-jeffe.jeffjoseph1129.chatgpt.site) was successfully deployed on 2026-11-19. Cloud-browser inspection reached the OpenAI sign-in page; interactive rendering remains unverified. The source is isolated under `apps/dispatch-atlas` on a feature branch of `CRYPTOJEFFE/JeffeRescueMap-AI`.

## Next connections required

- Authorized radio feed/archive URLs or a supported provider integration, plus a gateway for private credentials.
- An authenticated HTTPS incident endpoint for phones, Apple TV, and shared station displays; authoritative parcel, cross-street, POI, and preplan data for the intended coverage area.
- Apple and Android build/signing environments and target devices; Windows/macOS packaging and signing environments.
- Separate implementation and testing for background push, cloud synchronization, native background audio, speech transcription, and operational station alert hardware.
