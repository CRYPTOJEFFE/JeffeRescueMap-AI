import SwiftUI
import MapKit
import AVFoundation

struct AtlasPOI: Codable, Identifiable {
    var name: String
    var kind: String?
    var lat: Double?
    var lon: Double?
    var source: String?
    var verifiedAt: String?
    var notes: String?
    var id: String { "\(name)-\(lat ?? 0)-\(lon ?? 0)" }
}

struct AtlasIncident: Codable, Identifiable {
    var id: String
    var title: String
    var emoji: String?
    var agency: String?
    var area: String?
    var address: String?
    var crossStreets: [String]?
    var lat: Double?
    var lon: Double?
    var priority: String?
    var status: String?
    var reportedAt: String?
    var units: [String]?
    var transcript: String?
    var trigger: String?
    var source: String?
    var verification: String?
    var demo: Bool?
    var pois: [AtlasPOI]?
    var isDemo: Bool { demo == true || verification == "demo" }
    var coordinate: CLLocationCoordinate2D? {
        guard let lat, let lon, lat.isFinite, lon.isFinite,
              (-90...90).contains(lat), (-180...180).contains(lon) else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }
    static let example = AtlasIncident(
        id: "training-001", title: "Training • Possible structure fire", emoji: "💨🔥",
        agency: "Dispatch Atlas training", area: "Fictional scenario", address: "TRAINING ADDRESS • No operational location",
        crossStreets: ["Example Avenue", "Training Street"], lat: nil, lon: nil,
        priority: "high", status: "training", reportedAt: nil,
        units: ["Training Engine", "Training Ladder"],
        transcript: "Training scenario only. Units respond to a simulated report of smoke.", trigger: "Smoke reported",
        source: "Bundled fictional fixture", verification: "demo", demo: true,
        pois: [AtlasPOI(name: "Example commercial exposure", kind: "commercial", source: "Fictional training fixture", notes: "No real property identified.")])
}
struct AtlasEnvelope: Codable { var incidents: [AtlasIncident] }
private struct CachedSnapshot: Codable { var savedAt: Date; var incidents: [AtlasIncident] }

@MainActor
final class IncidentStore: ObservableObject {
    @Published var incidents: [AtlasIncident] = [.example]
    @Published var selectedID = AtlasIncident.example.id
    @Published var lastRefresh: Date?
    @Published var connection = "Training data • endpoint not configured"
    @Published var fetching = false
    @Published var cached = false
    @Published var showAlert = false
    @Published var playing = false
    let speech = AVSpeechSynthesizer()
    private var player: AVPlayer?
    private var lastEndpoint: String?
    private var cacheURL: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("DispatchAtlasIncidents.json")
    }
    init() {
        if let bytes = try? Data(contentsOf: cacheURL), let snapshot = try? JSONDecoder().decode(CachedSnapshot.self, from: bytes) {
            incidents = snapshot.incidents
            selectedID = incidents.first?.id ?? ""
            lastRefresh = snapshot.savedAt
            cached = true
            connection = "Saved snapshot • connection not checked"
        }
    }
    var selected: AtlasIncident? { incidents.first(where: { $0.id == selectedID }) ?? incidents.first }
    func refresh(endpoint: String) async {
        guard !fetching else { return }
        let trimmed = endpoint.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), url.scheme == "https", url.host != nil, url.user == nil, url.password == nil else {
            connection = trimmed.isEmpty ? "Endpoint not configured • training or saved data" : "Enter a valid HTTPS incident endpoint"
            cached = lastRefresh != nil
            return
        }
        fetching = true
        defer { fetching = false }
        do {
            var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 12)
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            let (bytes, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode), response.url?.scheme == "https" else {
                throw URLError(.badServerResponse)
            }
            guard bytes.count <= 2_000_000 else { throw URLError(.dataLengthExceedsMaximum) }
            let envelope = try JSONDecoder().decode(AtlasEnvelope.self, from: bytes)
            guard envelope.incidents.count <= 2000, Set(envelope.incidents.map(\.id)).count == envelope.incidents.count else {
                throw URLError(.cannotParseResponse)
            }
            incidents = envelope.incidents
            if !incidents.contains(where: { $0.id == selectedID }) { selectedID = incidents.first?.id ?? "" }
            lastRefresh = Date()
            lastEndpoint = trimmed
            cached = false
            connection = incidents.contains(where: \.isDemo) ? "Connected • contains training fixtures" : "Connected • source reports remain unverified"
            let snapshot = CachedSnapshot(savedAt: Date(), incidents: incidents)
            if let encoded = try? JSONEncoder().encode(snapshot) { try? encoded.write(to: cacheURL, options: .atomic) }
        } catch {
            cached = true
            connection = "Connection failed • showing saved data"
        }
    }
    func playStream(_ raw: String) {
        if playing { player?.pause(); playing = false; return }
        guard let url = URL(string: raw), url.scheme == "https", url.host != nil,
              url.user == nil, url.password == nil else { connection = "Audio requires a direct HTTPS stream URL"; return }
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
            player = AVPlayer(url: url)
            player?.play()
            playing = true
        } catch { connection = "Audio session unavailable" }
    }
    func announceTraining() {
        showAlert = true
        let words = "Training alert. This is a demonstration. " + (selected?.title ?? "No call selected")
        let utterance = AVSpeechUtterance(string: words)
        speech.speak(utterance)
    }
}

@main
struct DispatchAtlasTVApp: App {
    var body: some Scene { WindowGroup { StationDashboard().preferredColorScheme(.dark) } }
}

struct StationDashboard: View {
    @StateObject private var store = IncidentStore()
    @StateObject private var parcelStore = ParcelStore()
    @AppStorage("incidentEndpoint") private var endpoint = ""
    @AppStorage("audioEndpoint") private var audioEndpoint = ""
    @AppStorage("parcelEndpoint") private var parcelEndpoint = ""
    @AppStorage("stationName") private var stationName = "DISPATCH ATLAS • STATION"
    @AppStorage("stationUnit") private var stationUnit = ""
    @State private var stationMode = true
    @State private var satellite = false
    @State private var showParcels = true
    @State private var settings = false
    @Environment(\.scenePhase) private var scenePhase
    let navy = Color(red: 0.035, green: 0.065, blue: 0.13)
    let gold = Color(red: 0.94, green: 0.72, blue: 0.20)
    private var visibleIncidents: [AtlasIncident] {
        let unit = stationUnit.trimmingCharacters(in: .whitespacesAndNewlines)
        return stationMode && !unit.isEmpty ? store.incidents.filter { $0.units?.contains(where: { $0.localizedCaseInsensitiveContains(unit) }) == true } : store.incidents
    }
    private var incident: AtlasIncident? { visibleIncidents.first(where: { $0.id == store.selectedID }) ?? visibleIncidents.first }
    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack {
                VStack(alignment: .leading) {
                    Text(stationName).font(.headline).foregroundStyle(gold)
                    Text(stationMode ? "Station View" : "Dispatch View").font(.largeTitle.bold())
                }
                Spacer()
                Button(stationMode ? "Dispatch view" : "Station view") { stationMode.toggle() }
                Button("Settings") { settings = true }
            }
            HStack {
                Text(store.connection).font(.caption)
                Spacer()
                if let refresh = store.lastRefresh {
                    TimelineView(.periodic(from: .now, by: 1)) { ctx in
                        Text("\(store.cached || ctx.date.timeIntervalSince(refresh) > 60 ? "STALE SNAPSHOT" : "Fetched") • \(Int(ctx.date.timeIntervalSince(refresh)))s ago")
                            .foregroundStyle(store.cached || ctx.date.timeIntervalSince(refresh) > 60 ? Color.orange : Color.green).font(.caption)
                    }
                }
            }
            if store.showAlert {
                HStack {
                    Text("TRAINING ALERT • No operational dispatch").font(.title3.bold())
                    Spacer()
                    Button("Dismiss") { store.showAlert = false; store.speech.stopSpeaking(at: .immediate) }
                }.padding().background(Color.orange.opacity(0.24)).clipShape(RoundedRectangle(cornerRadius: 18))
            }
            HStack(alignment: .top, spacing: 28) {
                if !stationMode {
                    ScrollView {
                        VStack(spacing: 14) {
                            ForEach(visibleIncidents) { item in
                                Button { store.selectedID = item.id } label: {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("\(item.emoji ?? "📍") \(item.title)").font(.headline)
                                        Text(item.agency ?? "Source unknown").foregroundStyle(gold)
                                        Text(item.address ?? "Location not supplied").font(.caption)
                                        Text(item.isDemo ? "TRAINING FIXTURE" : "SOURCE REPORT • UNVERIFIED").font(.caption2.bold())
                                    }.frame(maxWidth: .infinity, alignment: .leading).padding(16)
                                }.buttonStyle(.card)
                            }
                        }.padding(12)
                    }.frame(width: 450)
                }
                if let item = incident {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack {
                            Text(item.isDemo ? "TRAINING FIXTURE" : "UNVERIFIED SOURCE REPORT").font(.caption.bold()).foregroundStyle(gold)
                            Spacer()
                            Text((item.priority ?? "Unknown priority").uppercased()).font(.caption.bold())
                        }
                        Text("\(item.emoji ?? "📍") \(item.title)").font(.system(size: stationMode ? 46 : 34, weight: .bold))
                        Text(item.address ?? "Location not supplied").font(.title3)
                        Text("Cross streets: \(item.crossStreets?.joined(separator: " / ") ?? "Not provided")").font(.callout).foregroundStyle(.secondary)
                        HStack(alignment: .top, spacing: 24) {
                            VStack(spacing: 14) {
                                IncidentMap(incident: item, satellite: satellite, parcels: showParcels ? parcelStore.parcels : []).frame(minHeight: 300, maxHeight: 450).clipShape(RoundedRectangle(cornerRadius: 18))
                                HStack {
                                    Button(satellite ? "Street map" : "Satellite map") { satellite.toggle() }
                                    Button("Refresh") { Task { await store.refresh(endpoint: endpoint) } }.disabled(store.fetching)
                                    Button(showParcels ? "Hide parcels" : "Show parcels") { showParcels.toggle() }
                                }
                                Text("Online Apple imagery • " + parcelStore.status).font(.caption2).foregroundStyle(.secondary)
                            }.frame(maxWidth: .infinity)
                            ScrollView {
                                VStack(alignment: .leading, spacing: 18) {
                                    Text("ASSIGNED UNITS").foregroundStyle(gold).font(.caption.bold())
                                    Text(item.units?.joined(separator: "  •  ") ?? "No assignment supplied").font(.title3.bold())
                                    Text("NEARBY POIs & EXPOSURES").foregroundStyle(gold).font(.caption.bold())
                                    if item.pois?.isEmpty != false { Text("No verified exposure data supplied.").font(.callout) }
                                    ForEach(item.pois ?? []) { poi in
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text(poi.name).font(.headline)
                                            Text(poi.kind ?? "POI").font(.caption)
                                            Text(poi.notes ?? "").font(.caption)
                                            Text("Source: \(poi.source ?? "unknown")").font(.caption2).foregroundStyle(.secondary)
                                            Text("Verified: \(poi.verifiedAt ?? "not verified")").font(.caption2).foregroundStyle(.secondary)
                                        }.padding(14).background(.white.opacity(0.05)).clipShape(RoundedRectangle(cornerRadius: 12))
                                    }
                                    if let transcript = item.transcript { Text("RADIO TEXT").foregroundStyle(gold).font(.caption.bold()); Text(transcript).font(.caption) }
                                    Text("Reported: \(item.reportedAt ?? "training / no timestamp")").font(.caption2)
                                }
                            }.frame(width: stationMode ? 420 : 340, height: 430)
                        }
                    }.padding(22).background(.white.opacity(0.04)).clipShape(RoundedRectangle(cornerRadius: 24))
                } else {
                    ContentUnavailableView("No matching calls", systemImage: "antenna.radiowaves.left.and.right", description: Text("No incident matches this station's unit filter. Check Settings or switch to Dispatch View."))
                }
            }
            Spacer(minLength: 0)
            HStack {
                Button("Test training announcement") { store.announceTraining() }
                Button(store.playing ? "Stop audio" : "Play configured audio") { store.playStream(audioEndpoint) }.disabled(audioEndpoint.isEmpty)
                Spacer()
                Text("Situational awareness • Source reports are not CAD verification").font(.caption2).foregroundStyle(.secondary)
            }
        }.padding(48).background(navy).tint(gold)
        .sheet(isPresented: $settings) {
            VStack(alignment: .leading, spacing: 24) {
                Text("Station configuration").font(.largeTitle.bold())
                TextField("Station name", text: $stationName)
                TextField("Assigned-unit filter (blank = all)", text: $stationUnit)
                TextField("HTTPS URL returning {incidents:[…]}", text: $endpoint).textInputAutocapitalization(.never).autocorrectionDisabled()
                TextField("Direct HTTPS audio stream (optional)", text: $audioEndpoint).textInputAutocapitalization(.never).autocorrectionDisabled()
                TextField("HTTPS parcel GeoJSON URL (optional)", text: $parcelEndpoint).textInputAutocapitalization(.never).autocorrectionDisabled()
                HStack {
                    Button("Load parcel GeoJSON") { Task { await parcelStore.load(endpoint: parcelEndpoint) } }.disabled(parcelStore.loading)
                    Button("Clear parcel snapshot") { parcelStore.clear() }
                }
                Text(parcelStore.status).font(.caption)
                Text("Do not put secret API keys in these URLs. Use your authenticated gateway. Refresh runs every 15 seconds while this app is active. Cached snapshots remain visibly stale when disconnected.").font(.callout).foregroundStyle(.secondary)
                Button("Save and refresh") { settings = false; Task { await store.refresh(endpoint: endpoint) } }
                Button("Close") { settings = false }
            }.padding(70)
        }
        .task {
            if !parcelEndpoint.isEmpty { await parcelStore.load(endpoint: parcelEndpoint) }
            while !Task.isCancelled {
                if scenePhase == .active { await store.refresh(endpoint: endpoint) }
                do { try await Task.sleep(for: .seconds(15)) } catch { break }
            }
        }
    }
}

struct IncidentMap: View {
    let incident: AtlasIncident
    let satellite: Bool
    let parcels: [AtlasParcel]
    var body: some View {
        if let coordinate = incident.coordinate {
            Map(initialPosition: .region(MKCoordinateRegion(center: coordinate, span: MKCoordinateSpan(latitudeDelta: 0.012, longitudeDelta: 0.012)))) {
                ForEach(parcels) { parcel in
                    MapPolygon(parcel.polygon).foregroundStyle(.yellow.opacity(0.12)).stroke(.yellow, lineWidth: 2)
                }
                Marker(incident.title, coordinate: coordinate).tint(.orange)
                ForEach(incident.pois ?? []) { poi in
                    if let lat = poi.lat, let lon = poi.lon, (-90...90).contains(lat), (-180...180).contains(lon) {
                        Marker(poi.name, coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lon)).tint(.yellow)
                    }
                }
            }.mapStyle(satellite ? .hybrid : .standard).id(incident.id)
        } else {
            VStack(spacing: 15) {
                Image(systemName: "mappin.slash").font(.largeTitle)
                Text("No precise coordinates supplied").font(.headline)
                Text("An approximate city-center pin will not be substituted.").font(.caption)
            }.frame(maxWidth: .infinity, minHeight: 300).background(.white.opacity(0.05))
        }
    }
}
