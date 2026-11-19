import Foundation
import MapKit
import Combine

struct AtlasParcel: Identifiable {
    let id: Int
    let polygon: MKPolygon
}

@MainActor
final class ParcelStore: ObservableObject {
    @Published var parcels: [AtlasParcel] = []
    @Published var status = "Parcel layer not configured"
    @Published var loading = false
    private var cacheURL: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("DispatchAtlasParcels.geojson")
    }
    init() {
        if let bytes = try? Data(contentsOf: cacheURL), let shapes = try? Self.decode(bytes) {
            parcels = shapes
            status = "Saved parcel snapshot • verify currency with source"
        }
    }
    private static func decode(_ data: Data) throws -> [AtlasParcel] {
        let objects = try MKGeoJSONDecoder().decode(data)
        var polygons: [MKPolygon] = []
        func append(_ object: MKGeoJSONObject) {
            if let polygon = object as? MKPolygon { polygons.append(polygon) }
            else if let multi = object as? MKMultiPolygon { polygons.append(contentsOf: multi.polygons) }
            else if let feature = object as? MKGeoJSONFeature {
                for shape in feature.geometry { append(shape) }
            }
        }
        for object in objects { append(object) }
        guard polygons.count <= 2000, polygons.reduce(0, { $0 + $1.pointCount }) <= 200_000 else {
            throw URLError(.dataLengthExceedsMaximum)
        }
        return polygons.enumerated().map { AtlasParcel(id: $0.offset, polygon: $0.element) }
    }
    func load(endpoint: String) async {
        guard !loading else { return }
        let raw = endpoint.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: raw), url.scheme == "https", url.host != nil, url.user == nil, url.password == nil else {
            status = raw.isEmpty ? "No parcel URL • existing snapshot only" : "Parcel URL must use HTTPS"
            return
        }
        loading = true
        defer { loading = false }
        do {
            let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
            let (bytes, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode), response.url?.scheme == "https",
                  bytes.count <= 5_000_000 else { throw URLError(.badServerResponse) }
            parcels = try Self.decode(bytes)
            try? bytes.write(to: cacheURL, options: .atomic)
            status = "\(parcels.count) parcel polygons • \(url.host ?? "supplied source") • verify source date"
        } catch { status = "Parcel refresh failed • saved snapshot only" }
    }
    func clear() {
        parcels = []
        try? FileManager.default.removeItem(at: cacheURL)
        status = "Parcel layer cleared"
    }
}
