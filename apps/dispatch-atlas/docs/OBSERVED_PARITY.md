# Squawster reconstruction: observed evidence

Review date: 2026-11-19. This document describes evidence supplied by the user and the public App Store description. It is a behavioral reconstruction specification, not recovered Squawster source code. The original icon, branding and screenshots are reference material only and are not app assets in this project.

## Evidence coverage

Nine still images were available: one icon, two App Store preview screenshots and six full-resolution in-app screenshots. The recording is 21.833333 seconds, 512 × 1106, 30 fps, with an audio stream. Visual review used seven contact-sheet frames sampled every three seconds; audio was not transcribed or evaluated. This is not a claim of frame-by-frame video inspection or proof of server behavior. File hashes and dimensions are in `evidence.json`.

The recording stays on an FDNY Calls player. It shows a changing horizontal transcript ticker while the selected talkgroup and scanner metadata remain stable. No navigation, button activation, mode transition, or hold/ignore effect was observed in these samples.

## Screen inventory

| Evidence | Visible screen | Observed elements |
|---|---|---|
| IMG_2916.jpeg | App Store incident-detail preview | Severity and elapsed time; incident title; area; favorite; address and coordinates; Apple Maps preview; trigger and explanation cards; escalation audio; scene talkgroup; county feeds |
| IMG_2917.jpeg | App Store feed-detail preview | Feed description and geography; pause; live duration; scanner metadata; volume slider; favorite, archives and report; listener chart; persistent mini-player |
| IMG_2922.png | FDNY Calls history | Recent calls; play; talkgroup and description; timestamp and duration; full italic transcripts; selected row; unlabeled square and ignore icons; bottom navigation |
| IMG_2923.png | Incident introduction | AI origin and unverified status; possible errors; major-event scope; acknowledgement button; mini-player; bottom navigation |
| IMG_2924.png | Incident list, earlier scroll position | Stacked cards; severity edge strips; title, source geography, address, elapsed time; play and report buttons; waiting-for-calls mini-player |
| IMG_2925.png | Incident list, later scroll position | Additional fire, shooting and vehicle-call cards; mini-player scanner text state |
| IMG_2926.png | Category selection, upper position | Dismissible bottom sheet; category checkboxes; expansion chevrons; descriptions; fixed Clear all / All types footer; dimmed dashboard area selection behind sheet |
| IMG_2927.png | Category selection, lower position | Scrolled continuation of category list; same fixed header and footer |
| Screen recording | FDNY Calls player | Black scanner display; group/source/frequency/node values; ticker; Stop, Hold, Ignore; Previous/Next call; Groups; playlist description; Standard/Smart/Latest; recent calls |

## Feature evidence and acceptance targets

These targets describe what should be checked in the independent implementation. They do not claim implementation completion.

| Feature | Evidence status | Acceptance target / remaining unknown |
|---|---|---|
| Five navigation destinations | Observed: Listen, Favorites, Notifications, Radiant Glow, Settings | Each destination opens and retains sensible state; contents of Notifications and Settings were not supplied |
| Navy/gold appearance | Observed | Responsive readable approximation with original app identity |
| Feed list and directory search | Advertised, not shown | User can search configured sources; proprietary directory data unavailable |
| Continuous feed player | Preview visible | Play/pause/volume and honest loading/error states with configured URL |
| Persistent mini-player | Observed | Continues across app navigation; close and pause controls work |
| Scanner metadata | Observed | Show only fields actually received; do not fabricate radio identifiers |
| Calls timeline | Observed | Timestamped transcripts and durations; select previous or next call |
| Hold and Ignore | Controls observed; effects unobserved | Define clear independent semantics and test them |
| Standard, Smart, Latest | Controls observed; Smart helper says it skips queued calls to stay near live | Exact scheduling thresholds unknown; do not claim recovered algorithm |
| Favorites and Calls playlists | Favorites screen observed; playlist management advertised | Persist locally; cloud sync remains a separate service integration |
| Transcript ticker and full transcript | Observed | Ticker respects reduced motion; full text remains readable |
| Incident severity and cards | Observed | Filterable cards with labels and usable detail view |
| Incident category modal | Observed | Whole-category and individual-type selection; no selection means all types |
| Incident geographic scope | Partially observed behind modal: All favorites / Pick areas / Global | Implement explicit scope behavior; geographic picker internals unknown |
| Incident introduction | Observed | Label automated and test events; do not imply official verification |
| Incident detail map and coordinates | Preview observed | Render coordinates only when known; missing-location state instead of a city-center guess |
| Trigger/explanation/source clip | Preview observed | Preserve evidence provenance and received audio links |
| Listener counts/chart | Preview observed; counts advertised | No invented counts; show unavailable without measurements |
| Archive playback | Advertised; Archives control observed | Local or authorized imported recordings can be replayed; remote archive API not supplied |
| Push alerts | Advertised | Browser local notifications and server push are distinct; a UI toggle alone is not push delivery |
| Native background/lock-screen/CarPlay | Advertised | Requires platform implementation and device validation |
| Native tvOS and station alert display | User requirement, absent in source evidence | Dedicated large-screen layout, remote focus and explicit alert acknowledgement |
| Dispatch layout | User requirement, absent in source evidence | Incident list, map and detail in a usable wide-screen arrangement |
| Parcel/plat map and risk overlays | User requirement, absent in source evidence | Import authoritative geometry and provenance; demo geometry must remain labeled |
| Satellite and nearby POIs | User requirement, absent in source evidence | Configured imagery provider and imported/retrieved POIs; no invented building hazards |
| iOS/Android/macOS/Windows/offline web | User requirement; not established by screenshots | Validate per platform; signing, installation and device test results must be reported separately |

## Categories visible in the supplied modal

Fires & Working Fires; Mass Violence; Responder Down — Mayday; Aviation; Rail; Hazmat; Marine; Vehicle Crashes; Building Collapse & Technical Rescue; Weather & Disaster. Individual subtypes were not expanded. EMS is requested by the user but is not visible as a category in the captured modal.

Incident titles visible in the supplied list include working structure fire, smoke showing, shooting, extrication, major vehicle damage, multiple vehicles, rollover, and major brush fire. These are historical screenshot contents, not current verified incidents. Use fictional clearly labeled fixture incidents when demonstrating behavior.

## Design measurements

Colors below are exact repeated RGB values from the PNG files, not inferred source CSS. Layout values are approximate visual measurements normalized from a 1284-pixel screenshot to a 428 CSS-pixel viewport (3× scale assumed, not proven).

| Token | Value | Notes |
|---|---|---|
| Main canvas | `#050e26` | Common in IMG_2923–2927 |
| Cards/header/navigation | `#0e1b33` | Common in IMG_2923–2927 |
| Mini-player surface | `#182746` | Common in IMG_2923–2927 |
| Gold | `#e8b33c` | Buttons, active navigation, geography text |
| Main text | `#ece7da` | Off-white titles |
| Muted text | `#8da0c6` | Category labels and secondary text |
| Card outline | `#33456b` | Borders |
| Alternate Calls canvas | `#060d24` | IMG_2922 |
| Alternate Calls panel | `#101a31` | IMG_2922 |
| Alternate Calls muted | `#909fc3` | IMG_2922 |
| Side gutters | approximately 16–24 CSS px | Lists narrower than full viewport |
| Incident card radius | approximately 12 CSS px | Modals use larger top corners |
| Main list title | approximately 16–17 CSS px, heavy | System sans font appearance; exact font unavailable |
| Secondary text | approximately 13 CSS px | Muted blue |
| Mini-player height | approximately 56 CSS px | Above navigation |
| Navigation including bottom inset | approximately 78 CSS px | Five evenly distributed items |

Use local system fonts, native emoji and original SVG or CSS icons. Do not bundle Apple's Maps imagery or Squawster's eagle logo from the references.

## Public listing observations

[App Store listing](https://apps.apple.com/us/app/squawster-police-scanner/id6802709530), retrieved 2026-11-19, identifies RadioReference.com LLC as developer. It advertises Broadcastify audio, location browsing, major-incident alerts, Calls playlists, archives and synced favorites. Version 1.0.13 is shown. Release notes mention call transcripts, hold/release, archive navigation, share links, CarPlay and improved missing-location handling. These are developer claims, not independent tests. Private endpoints, authentication, subscription checks, AI prompts/models, geocoding logic and incident deduplication are not available from the listing or uploads.

## Scope of confidence

The available evidence supports rebuilding visible screens and independently specifying interactions. It cannot establish an exact functional clone, recovered backend, equivalent feed coverage, equivalent classifier performance, or successful native-device operation. The implementation should publish a tested-features report and name unconnected services.
