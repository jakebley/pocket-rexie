import Foundation

// Drawing kit for the 96x96 biome painters of set B (sky, ember, crags, workshop, swamp, space), a port of
// expo-prototype/src/ui/biome96/kit.ts and kitB.ts. A `CvB` is a 96x96 grid of layer codes; static art is painted once per
// (biome, part, period, rain) and cached (`Biome96BCache`), animated bits are painted per frame into a fresh grid and merged.
//
// The Expo painters wrote through `Buf.set`, which silently ignores a fractional coordinate (a typed-array index like 3.5 is
// a no-op). The ports reproduce that where the art relied on it by only drawing on integral coordinates.

/// JS Math.round: half up.
@inline(__always) func jr(_ v: Double) -> Int { Int((v + 0.5).rounded(.down)) }

/// Splits "3 9 3, 14 7 3" into [[3, 9, 3], [14, 7, 3]] (compact per-biome data; no array literals of arrays).
func ints(_ s: String) -> [[Int]] {
    s.split(separator: ",").map { part in part.split(separator: " ").compactMap { Int($0) } }
}

/// Same for fractional numbers.
func dbls(_ s: String) -> [[Double]] {
    s.split(separator: ",").map { part in part.split(separator: " ").compactMap { Double($0) } }
}

/// Deterministic pseudo-random in [0, 1), the same hash as the Expo kit.
func rndB(_ i: Int) -> Double {
    let v = sin(Double(i) * 12.9898 + 4.1414) * 43758.5453
    return v - v.rounded(.down)
}

private let bayerTable: [Int] = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
func bayerB(_ x: Int, _ y: Int, _ k: Double) -> Bool { Double(bayerTable[(y & 3) * 4 + (x & 3)]) < k * 16 }

struct CvB {
    static let n = 96
    static let gy = 90
    var px: [UInt8]

    init() { px = [UInt8](repeating: 0, count: CvB.n * CvB.n) }
    init(copying cells: [UInt8]) { px = cells }

    @inline(__always) mutating func set(_ x: Int, _ y: Int, _ l: UInt8) {
        if x >= 0 && y >= 0 && x < 96 && y < 96 { px[y * 96 + x] = l }
    }

    /// A fractional coordinate is ignored, like `Buf.set` with a non-integer index.
    mutating func setD(_ x: Double, _ y: Double, _ l: UInt8) {
        if x == x.rounded() && y == y.rounded() { set(Int(x), Int(y), l) }
    }

    func at(_ x: Int, _ y: Int) -> UInt8 {
        if x < 0 || y < 0 || x >= 96 || y >= 96 { return 0 }
        return px[y * 96 + x]
    }

    mutating func pts(_ list: [[Int]], _ l: UInt8) {
        for p in list where p.count >= 2 { set(p[0], p[1], l) }
    }

    mutating func rect(_ x: Int, _ y: Int, _ w: Int, _ h: Int, _ l: UInt8) {
        if w <= 0 || h <= 0 { return }
        for yy in y..<(y + h) {
            for xx in x..<(x + w) { set(xx, yy, l) }
        }
    }

    mutating func hline(_ x0: Int, _ x1: Int, _ y: Int, _ l: UInt8) {
        if x1 < x0 { return }
        for x in x0...x1 { set(x, y, l) }
    }

    /// hline with fractional ends like the Expo loop `for (x = x0; x <= x1; x++)`: nothing is drawn when x0 is fractional.
    mutating func hlineD(_ x0: Double, _ x1: Double, _ y: Int, _ l: UInt8) {
        if x0 != x0.rounded() || x1 < x0 { return }
        hline(Int(x0), Int(x1.rounded(.down)), y, l)
    }

    mutating func vline(_ x: Int, _ y0: Int, _ y1: Int, _ l: UInt8) {
        if y1 < y0 { return }
        for y in y0...y1 { set(x, y, l) }
    }

    /// Bresenham line.
    mutating func line(_ ax: Int, _ ay: Int, _ bx: Int, _ by: Int, _ l: UInt8) {
        let dx = abs(bx - ax), dy = -abs(by - ay)
        var e = dx + dy
        var x = ax, y = ay
        let sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1
        var guardN = 0
        while guardN < 400 {
            guardN += 1
            set(x, y, l)
            if x == bx && y == by { break }
            let e2 = 2 * e
            if e2 >= dy { e += dy; x += sx }
            if e2 <= dx { e += dx; y += sy }
        }
    }

    /// Line with rounded endpoints (kit.ts `line`).
    mutating func lineR(_ ax: Double, _ ay: Double, _ bx: Double, _ by: Double, _ l: UInt8) {
        line(jr(ax), jr(ay), jr(bx), jr(by), l)
    }

    /// kit.ts `px`: rounds the coordinates.
    mutating func pxr(_ x: Double, _ y: Double, _ l: UInt8) { set(jr(x), jr(y), l) }

    /// kitB disc: pixel in when its centre is within r (+ half a pixel of slack in r squared).
    mutating func disc(_ cx: Double, _ cy: Double, _ r: Double, _ l: UInt8) {
        let r2 = r * r + 0.5
        let y0 = Int((cy - r).rounded(.down)), y1 = Int((cy + r).rounded(.up))
        let x0 = Int((cx - r).rounded(.down)), x1 = Int((cx + r).rounded(.up))
        if y1 < y0 || x1 < x0 { return }
        for y in y0...y1 {
            for x in x0...x1 {
                let dx = Double(x) - cx, dy = Double(y) - cy
                if dx * dx + dy * dy <= r2 { set(x, y, l) }
            }
        }
    }

    /// kitB ellipse.
    mutating func ellipse(_ cx: Double, _ cy: Double, _ rx: Double, _ ry: Double, _ l: UInt8) {
        let y0 = Int((cy - ry).rounded(.down)), y1 = Int((cy + ry).rounded(.up))
        let x0 = Int((cx - rx).rounded(.down)), x1 = Int((cx + rx).rounded(.up))
        if y1 < y0 || x1 < x0 { return }
        for y in y0...y1 {
            for x in x0...x1 {
                let u = (Double(x) - cx) / rx, v = (Double(y) - cy) / ry
                if u * u + v * v <= 1.02 { set(x, y, l) }
            }
        }
    }

    /// kit.ts `ell` (the A kit): radius plus 0.3.
    mutating func ell(_ cx: Double, _ cy: Double, _ rx: Double, _ ry: Double, _ l: UInt8) {
        let y0 = Int((cy - ry).rounded(.down)), y1 = Int((cy + ry).rounded(.up))
        let x0 = Int((cx - rx).rounded(.down)), x1 = Int((cx + rx).rounded(.up))
        if y1 < y0 || x1 < x0 { return }
        for y in y0...y1 {
            for x in x0...x1 {
                let dx = (Double(x) - cx) / (rx + 0.3), dy = (Double(y) - cy) / (ry + 0.3)
                if dx * dx + dy * dy <= 1 { set(x, y, l) }
            }
        }
    }

    mutating func discA(_ cx: Double, _ cy: Double, _ r: Double, _ l: UInt8) { ell(cx, cy, r, r, l) }

    /// A lit ball: light from the top left.
    mutating func ball(_ cx: Double, _ cy: Double, _ rx: Double, _ ry: Double, _ dark: UInt8, _ mid: UInt8, _ light: UInt8) {
        let y0 = Int((cy - ry).rounded(.down)), y1 = Int((cy + ry).rounded(.up))
        let x0 = Int((cx - rx).rounded(.down)), x1 = Int((cx + rx).rounded(.up))
        if y1 < y0 || x1 < x0 { return }
        for y in y0...y1 {
            for x in x0...x1 {
                let dx = (Double(x) - cx) / (rx + 0.3), dy = (Double(y) - cy) / (ry + 0.3)
                let d = dx * dx + dy * dy
                if d > 1 { continue }
                let k = dx * 0.55 + dy * 0.85
                let l: UInt8 = (k < -0.35 && d < 0.8) ? light : (k > 0.3 ? dark : mid)
                set(x, y, l)
            }
        }
    }

    /// Even-odd scanline polygon fill.
    mutating func poly(_ pts: [[Int]], _ l: UInt8) {
        if pts.count < 3 { return }
        var y0 = 999, y1 = -999
        for p in pts { y0 = min(y0, p[1]); y1 = max(y1, p[1]) }
        for y in y0...y1 {
            var xs: [Double] = []
            for i in 0..<pts.count {
                let a = pts[i], b = pts[(i + 1) % pts.count]
                let ay = a[1], by = b[1]
                if (ay <= y && by > y) || (by <= y && ay > y) {
                    xs.append(Double(a[0]) + (Double(y - ay) / Double(by - ay)) * Double(b[0] - a[0]))
                }
            }
            xs.sort()
            var k = 0
            while k + 1 < xs.count {
                let xa = jr(xs[k]), xb = jr(xs[k + 1])
                if xb >= xa { for x in xa...xb { set(x, y, l) } }
                k += 2
            }
        }
    }

    /// Sprite from rows; `legend` maps a character to a layer (anything else is skipped).
    mutating func spr(_ rows: [String], _ x: Int, _ y: Int, _ legend: [UInt8: UInt8]) {
        for (j, row) in rows.enumerated() {
            var i = 0
            for ch in row.utf8 {
                if let l = legend[ch] { set(x + i, y + j, l) }
                i += 1
            }
        }
    }

    /// Fill below a height function: top(x) is the first row filled, down to `to` (exclusive).
    mutating func ridge(to: Int, edge: UInt8 = 0, _ l: UInt8, _ top: (Int) -> Double) {
        for x in 0..<96 {
            let t = jr(top(x))
            if t <= to - 1 { vline(x, t, to - 1, l) }
            if edge != 0 { set(x, t, edge) }
        }
    }

    /// A leaf: a lens along a spine with a midrib (kit.ts).
    mutating func leaf(_ x0: Double, _ y0: Double, _ x1: Double, _ y1: Double, _ hw: Double, _ l: UInt8, _ rib: UInt8) {
        let dx = x1 - x0, dy = y1 - y0
        let len2 = dx * dx + dy * dy
        if len2 == 0 { return }
        let len = len2.squareRoot()
        let minX = Int((min(x0, x1) - hw).rounded(.down)), maxX = Int((max(x0, x1) + hw).rounded(.up))
        let minY = Int((min(y0, y1) - hw).rounded(.down)), maxY = Int((max(y0, y1) + hw).rounded(.up))
        for y in minY...maxY {
            for x in minX...maxX {
                let fx = Double(x), fy = Double(y)
                let t = ((fx - x0) * dx + (fy - y0) * dy) / len2
                if t < 0 || t > 1 { continue }
                let d = abs((fx - x0) * dy - (fy - y0) * dx) / len
                if d <= hw * pow(sin(Double.pi * t), 0.7) { set(x, y, (d < 0.6 && rib != 0) ? rib : l) }
            }
        }
    }

    /// A clump of foliage: overlapping little balls shaded dark / mid / light.
    mutating func clump(_ cx: Double, _ cy: Double, _ r: Double, _ seed: Int, _ dark: UInt8, _ mid: UInt8, _ light: UInt8, _ n: Int = 7) {
        for i in 0..<n {
            let a = rndB(seed + i) * 6.283
            let d = rndB(seed + i + 50) * r * 0.55
            let k = rndB(seed + i + 90)
            ball(cx + cos(a) * d, cy + sin(a) * d * 0.8, r * (0.45 + k * 0.25), r * (0.4 + k * 0.2), dark, mid, light)
        }
    }

    /// Merges `src` over this grid: lit cells overwrite.
    mutating func blit(_ src: [UInt8]) {
        px.withUnsafeMutableBufferPointer { dst in
            src.withUnsafeBufferPointer { s in
                for i in 0..<s.count where s[i] != 0 { dst[i] = s[i] }
            }
        }
    }

    /// Clears sun, moon, stars, clouds and butterflies where `back` has scenery in front (crags: the sun sets behind the rock).
    mutating func occlude(_ back: [UInt8]) {
        px.withUnsafeMutableBufferPointer { dst in
            back.withUnsafeBufferPointer { s in
                for i in 0..<s.count where s[i] != 0 && Biome96BSky.isSky(dst[i]) { dst[i] = s[i] }
            }
        }
    }

    /// Removes the outdoor sky (sun, moon, stars, clouds, rain) in the first `rows` rows; for caves, workshops and space.
    mutating func clearSky(_ back: [UInt8]?, rows: Int = 90) {
        let area = rows * 96
        px.withUnsafeMutableBufferPointer { dst in
            for i in 0..<area {
                let v = dst[i]
                if Biome96BSky.isSky(v) || v == SceneLayer.rain.rawValue {
                    dst[i] = back.map { $0[i] } ?? 0
                }
            }
        }
    }
}

enum Biome96BSky {
    private static let table: [Bool] = {
        var t = [Bool](repeating: false, count: 256)
        for l in [SceneLayer.sun, .moon, .star, .cloud, .butterfly] { t[Int(l.rawValue)] = true }
        return t
    }()
    @inline(__always) static func isSky(_ code: UInt8) -> Bool { table[Int(code)] }
}

/// Cache of the static layers: one 96x96 grid per (biome, part, period, rain).
enum Biome96BCache {
    private static let lock = NSLock()
    private static var store: [Int: [UInt8]] = [:]

    static func period(_ p: SceneAmbient.Period) -> Int {
        switch p {
        case .dawn: return 0
        case .day: return 1
        case .dusk: return 2
        case .night: return 3
        }
    }

    static func part(_ biome: Biome, _ name: String, _ period: SceneAmbient.Period, _ rain: Bool, _ paint: (inout CvB) -> Void) -> [UInt8] {
        let key = ((Biome.allCases.firstIndex(of: biome) ?? 0) * 8 + (name == "back" ? 0 : 4) + Biome96BCache.period(period)) * 2 + (rain ? 1 : 0)
        lock.lock()
        let hit = store[key]
        lock.unlock()
        if let hit { return hit }
        var cv = CvB()
        paint(&cv)
        lock.lock()
        store[key] = cv.px
        lock.unlock()
        return cv.px
    }

    /// Number of cached grids (tests: drawing a scene again must not paint again).
    static var count: Int {
        lock.lock()
        defer { lock.unlock() }
        return store.count
    }
}
