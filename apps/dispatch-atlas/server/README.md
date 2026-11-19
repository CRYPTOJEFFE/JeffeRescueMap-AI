# Dispatch Atlas local data service

This dependency-free Node.js service serves the web app and a validated JSON incident endpoint. It starts with **no incidents or feeds**. It does not scrape Squawster, connect to private Broadcastify endpoints, generate radio transcripts, or claim that imported reports are confirmed.

## Start locally

Use Node.js 22 or newer from the project root:

```sh
node server/server.mjs
```

Open `http://127.0.0.1:8787`. Static web files are loaded from `web/`. The data service can run offline. A fresh server supplies empty arrays, so an offline snapshot must first be imported to have incident data.

To enable ingestion, set `ATLAS_INGEST_TOKEN` to a long, randomly generated secret on the server. Do not place the token in the client HTML, commit it, or include it in shared screenshots.

```sh
export ATLAS_INGEST_TOKEN='replace-with-a-long-random-local-secret'
node server/server.mjs
```

PowerShell:

```powershell
$env:ATLAS_INGEST_TOKEN = 'replace-with-a-long-random-local-secret'
node server/server.mjs
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `ATLAS_HOST` | `127.0.0.1` | Bind interface. Keep the default for one computer. |
| `ATLAS_PORT` | `8787` | HTTP port. |
| `ATLAS_DATA_DIR` | `server/data` | Private writable snapshot directory. |
| `ATLAS_INGEST_TOKEN` | unset | Enables authenticated writes when set. |
| `ATLAS_ALLOWED_ORIGIN` | unset | Optional single browser origin, such as `https://atlas.example.org`; wildcard is rejected. |

## API contract

| Route | Method | Result |
| --- | --- | --- |
| `/api/health` | GET | Configuration flag, counts, snapshot update time, and `empty`, `demo`, `mixed`, or `imported` mode. |
| `/api/incidents` | GET | `{ "incidents": [], "feeds": [], "calls": [] }` populated only from accepted imports. |
| `/api/export` | GET | Same normalized payload with attachment headers. |
| `/api/ingest` | POST | Validates and atomically merges supplied records by stable ID; requires bearer token. |

Reads intentionally need no token on localhost. There is no account system or remote authentication layer in this service. **A server update timestamp means the snapshot was imported, not that the incident is current or verified.** Clients must compare each incident's `reportedAt` and show stale/offline state when polling fails.

`GET /api/incidents` also returns `X-Atlas-Data-Mode` and, after ingestion, `X-Atlas-Updated-At`. These headers describe the dataset, not an official live status.

POST accepts one or more of the arrays `incidents`, `feeds`, and `calls`. Omitted arrays remain intact. An existing record with the same ID is replaced by the newly validated record. Empty arrays make no deletions. Unknown collection names, duplicate IDs in one collection, invalid coordinates, malformed dates, unsupported priorities, and invalid media URLs are rejected before saving. Up to 5,000 records per collection are retained; requests have a 2 MiB limit. Supplied strings are normalized by `web/core.js`, and unrecognized record fields are dropped.

The sample import is a fictional training exercise. Import it with:

```sh
curl --fail-with-body http://127.0.0.1:8787/api/ingest \
  -H "Authorization: Bearer $ATLAS_INGEST_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @server/sample-import.json
```

No sample data is automatically loaded by the service. To archive or reset stored incidents, stop the service, back up `server/data/snapshot.json`, and move that file out of the data directory. The next start is empty. In-place ingestion does not silently delete history.

## Authorized data connections

A CAD, radio archive, or transcription process can post normalized reports to `/api/ingest`. It must supply real provenance and timestamps. Use `verification: "unconfirmed"` for machine-generated candidates; marking a report `verified` requires a source, named verifier, and verification time. AI confidence is not incident confirmation. `lat` and `lon` must both be known valid numbers or both null; there is no city-center fallback pin.

The web player consumes a feed's `streamUrl` or a call's `audioUrl`. Supply authorized HTTP(S) media URLs with formats the target device can play. This server never fetches those URLs or acts as an open proxy. Media transport, provider permissions, CORS, subscription access, expiring URLs, and archive licenses remain provider-specific. Browser clients served over HTTPS generally require HTTPS media.

There is no transcription model included here. If an independently configured transcription service is used, keep its credentials server-side and send only the resulting authorized call records to this API.

## Station displays and other devices

For a trusted isolated LAN, binding `ATLAS_HOST=0.0.0.0` allows devices to reach the host's LAN address. Local firewall rules determine reachability. Plain HTTP exposes read data on that network, and iOS/tvOS shells may require HTTPS. For deployed station displays, put this service behind an HTTPS reverse proxy that authenticates readers and writers and restricts access to the station network. Keep the Node service on loopback and configure `ATLAS_ALLOWED_ORIGIN` to the externally visible HTTPS origin. The service does not trust forwarded host/protocol headers.

Native clients can poll `/api/incidents` using their configured HTTPS endpoint. A browser app on a different origin must match `ATLAS_ALLOWED_ORIGIN`; all other cross-origin API requests are rejected. CORS is not authentication and does not restrict non-browser clients.

Protect and back up the snapshot directory. Do not expose it through the web server or place private operational data into a public repository. Requests cannot read outside `web/`; dotfiles, traversal, and symlinks escaping that directory are rejected. Saved snapshots are atomically replaced, and concurrent imports are serialized to avoid lost updates. Corrupt saved snapshots cause startup to fail without overwriting the file.

## Validation

```sh
node --test tests/server.test.mjs
```

Tests cover empty startup, token enforcement, ID merges, persistence/reload, invalid coordinates and URLs, duplicate IDs, concurrent imports, body limits, CORS, traversal, symlink escapes, and preservation of corrupt snapshots.
