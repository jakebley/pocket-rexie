import Foundation

// Biome backgrounds (docs/BIOMES.md), a port of expo-prototype/src/ui/biomeDraw.ts. The meadow scene (sky, sun, clouds,
// ground band, tufts, butterfly) is drawn for every family; a biome adds scenery UNDER it (`BiomeDraw.backdrop`) and floor
// props over empty pixels (`BiomeDraw.fore`), and ScenePalette re-colours the shared layers. Scenery uses the Technicolor-only
// layer codes (`SceneLayer.bark` and up), which Traditional prints as unlit, so Traditional stays the minimal scene plus a few
// tiny cues (`wave`, `hole`, `peak`).
//
// The art is drawn in the Expo coordinates (ground line at row 60) on a 64x64 canvas and then copied into the scene raster
// with `rowMap`, which closes the two-row difference to the native ground line (row 58) by merging rows 18...20 (just under
// the HUD, where only sky is). Static art is painted once per (biome, period, rain) and cached; only the animated bits are
// drawn per frame.

/// A 64x64 grid of layer codes in the Expo coordinates, with the drawing helpers the painters share.
struct BiomeCanvas {
    static let n = 64
    var px: [UInt8]

    init() { px = [UInt8](repeating: 0, count: BiomeCanvas.n * BiomeCanvas.n) }
    init(copying cells: [UInt8]) { px = cells }

    mutating func set(_ x: Int, _ y: Int, _ l: SceneLayer) {
        guard x >= 0, x < BiomeCanvas.n, y >= 0, y < BiomeCanvas.n else { return }
        px[y * BiomeCanvas.n + x] = l.rawValue
    }

    mutating func rect(_ x: Int, _ y: Int, _ w: Int, _ h: Int, _ l: SceneLayer) {
        if w <= 0 || h <= 0 { return }
        for yy in y..<(y + h) {
            for xx in x..<(x + w) { set(xx, yy, l) }
        }
    }

    mutating func hline(_ x0: Int, _ x1: Int, _ y: Int, _ l: SceneLayer) {
        if x1 < x0 { return }
        for x in x0...x1 { set(x, y, l) }
    }

    mutating func vline(_ x: Int, _ y0: Int, _ y1: Int, _ l: SceneLayer) {
        if y1 < y0 { return }
        for y in y0...y1 { set(x, y, l) }
    }

    /// A filled disc (a pixel is in when its centre is within r + a half pixel).
    mutating func disc(_ cx: Double, _ cy: Double, _ r: Double, _ l: SceneLayer) {
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

    mutating func disc(_ cx: Int, _ cy: Int, _ r: Int, _ l: SceneLayer) {
        disc(Double(cx), Double(cy), Double(r), l)
    }

    /// Triangle / cone: apex at (ax, ay), widening by `slope` columns per row down to baseY.
    mutating func cone(_ ax: Int, _ ay: Int, _ baseY: Int, _ slope: Double, _ l: SceneLayer, topHalf: Double = 0) {
        if baseY < ay { return }
        for y in ay...baseY {
            let hw = topHalf + Double(y - ay) * slope
            hline(BiomeDraw.jsRound(Double(ax) - hw), BiomeDraw.jsRound(Double(ax) + hw), y, l)
        }
    }

    /// A leaf: a lens along the spine (x0,y0)-(x1,y1) with half-width hw; the midrib is drawn in `rib`.
    mutating func leaf(_ x0: Double, _ y0: Double, _ x1: Double, _ y1: Double, _ hw: Double, _ l: SceneLayer, _ rib: SceneLayer) {
        let dx = x1 - x0, dy = y1 - y0
        let len2 = dx * dx + dy * dy
        let len = len2.squareRoot()
        let minX = Int((min(x0, x1) - hw).rounded(.down)), maxX = Int((max(x0, x1) + hw).rounded(.up))
        let minY = Int((min(y0, y1) - hw).rounded(.down)), maxY = Int((max(y0, y1) + hw).rounded(.up))
        for y in minY...maxY {
            for x in minX...maxX {
                let fx = Double(x), fy = Double(y)
                let t = ((fx - x0) * dx + (fy - y0) * dy) / len2
                if t < 0 || t > 1 { continue }
                let d = abs((fx - x0) * dy - (fy - y0) * dx) / len
                let limit = hw * pow(sin(Double.pi * t), 0.7)
                if d <= limit { set(x, y, d < 0.7 ? rib : l) }
            }
        }
    }

    /// Stamps a string-row sprite; each character maps to a layer through `legend`, anything else is skipped.
    mutating func spr(_ rows: [String], _ x: Int, _ y: Int, _ legend: [Character: SceneLayer]) {
        for (j, row) in rows.enumerated() {
            for (i, ch) in row.enumerated() {
                if let l = legend[ch] { set(x + i, y + j, l) }
            }
        }
    }
}

/// What the animated parts of a biome need from the clock.
struct BiomeLive {
    /// 125 ms ticks since the reference date (0 for a still picture).
    var tick: Int
    /// Seconds (0 for a still picture); drives the slow drifts.
    var seconds: Double
    /// The pet's seed, spreads the drifting clouds.
    var seed: Int
    var rain: Bool
}

enum BiomeDraw {
    typealias Period = SceneAmbient.Period

    static func jsRound(_ v: Double) -> Int { Int((v + 0.5).rounded(.down)) }

    /// Expo rows to native rows: the art assumes the ground line at row 60, the native scene has it at 58.
    static let rowMap: [Int] = (0..<64).map { $0 < 18 ? $0 : max(18, $0 - 2) }

    private static func rnd(_ i: Int) -> Double {
        let v = sin(Double(i) * 12.9898 + 4.1414) * 43758.5453
        return v - v.rounded(.down)
    }

    // MARK: static caches

    private static let lock = NSLock()
    private static var cache: [Int: [UInt8]] = [:]

    private static func periodSlot(_ p: Period) -> Int {
        switch p {
        case .dawn: return 0
        case .day: return 1
        case .dusk: return 2
        case .night: return 3
        }
    }

    private static func biomeSlot(_ b: Biome) -> Int {
        switch b {
        case .meadow: return 0
        case .woods: return 1
        case .underwater: return 2
        case .sky: return 3
        case .yard: return 4
        case .clouds: return 5
        case .ember: return 6
        case .warren: return 7
        case .crags: return 8
        case .workshop: return 9
        case .swamp: return 10
        case .garden: return 11
        case .space: return 12
        }
    }

    /// The painted static layer for (biome, back or fore, period, rain), kept in `cache` under an integer key.
    private static func cached(_ biome: Biome, back: Bool, _ period: Period, _ rain: Bool) -> [UInt8] {
        let key = ((biomeSlot(biome) * 2 + (back ? 1 : 0)) * 4 + periodSlot(period)) * 2 + (rain ? 1 : 0)
        lock.lock()
        let hit = cache[key]
        lock.unlock()
        if let hit { return hit }
        var canvas = BiomeCanvas()
        if back {
            paintBack(biome, &canvas, period, rain)
        } else {
            paintFore(biome, &canvas, period)
        }
        lock.lock()
        cache[key] = canvas.px
        lock.unlock()
        return canvas.px
    }

    /// Scenery behind the meadow layers (trees, hills, mountains, walls, water light...). Call on a raster with
    /// nothing drawn yet, before the sky.
    static func backdrop(into r: inout SceneRaster, biome: Biome, period: Period, live: BiomeLive, rows: [Int] = BiomeDraw.rowMap) {
        if biome == .meadow { return }
        var canvas = BiomeCanvas(copying: cached(biome, back: true, period, live.rain))
        paintLive(biome, &canvas, period, live)
        let n = BiomeCanvas.n
        canvas.px.withUnsafeBufferPointer { src in
            r.cells.withUnsafeMutableBufferPointer { dst in
                for y in 0..<n {
                    let from = y * n, to = rows[y] * n
                    for x in 0..<n {
                        let v = src[from + x]
                        if v != 0 { dst[to + x] = v }
                    }
                }
            }
        }
    }

    /// Floor props, painted only into pixels the meadow layers left unlit. Call after the ground.
    static func fore(into r: inout SceneRaster, biome: Biome, period: Period, rain: Bool, rows: [Int] = BiomeDraw.rowMap) {
        if biome == .meadow { return }
        let src = cached(biome, back: false, period, rain)
        let n = BiomeCanvas.n
        src.withUnsafeBufferPointer { src in
            r.cells.withUnsafeMutableBufferPointer { dst in
                for y in 0..<n {
                    let from = y * n, to = rows[y] * n
                    for x in 0..<n {
                        let v = src[from + x]
                        if v != 0 && dst[to + x] == 0 { dst[to + x] = v }
                    }
                }
            }
        }
    }

    private static func paintBack(_ biome: Biome, _ b: inout BiomeCanvas, _ phase: Period, _ rain: Bool) {
        switch biome {
        case .meadow: break
        case .woods: woodsBack(&b)
        case .underwater: waterBack(&b, phase, rain)
        case .sky: skyBack(&b)
        case .yard: yardBack(&b, phase)
        case .clouds: cloudsBack(&b)
        case .ember: emberBack(&b)
        case .warren: warrenBack(&b)
        case .crags: cragsBack(&b, phase)
        case .workshop: workshopBack(&b)
        case .swamp: swampBack(&b, phase)
        case .garden: gardenBack(&b)
        case .space: spaceBack(&b, phase)
        }
    }

    private static func paintFore(_ biome: Biome, _ b: inout BiomeCanvas, _ phase: Period) {
        switch biome {
        case .meadow: break
        case .woods: woodsFore(&b)
        case .underwater: waterFore(&b)
        case .sky: skyFore(&b)
        case .yard: yardFore(&b)
        case .clouds: cloudsFore(&b)
        case .ember: emberFore(&b)
        case .warren: warrenFore(&b)
        case .crags: cragsFore(&b, phase)
        case .workshop: workshopFore(&b)
        case .swamp: swampFore(&b)
        case .garden: gardenFore(&b)
        case .space: spaceFore(&b)
        }
    }

    private static func paintLive(_ biome: Biome, _ b: inout BiomeCanvas, _ phase: Period, _ s: BiomeLive) {
        switch biome {
        case .meadow: break
        case .woods: woodsLive(&b, s, phase)
        case .underwater: waterLive(&b, s)
        case .sky: skyLive(&b, s)
        case .yard: break
        case .clouds: cloudsLive(&b, s)
        case .ember: emberLive(&b, s)
        case .warren: warrenLive(&b, s)
        case .crags: cragsLive(&b, s)
        case .workshop: workshopLive(&b, s)
        case .swamp: swampLive(&b, s)
        case .garden: gardenLive(&b, s)
        case .space: spaceLive(&b, s)
        }
    }

    // MARK: woods (fox)

    private static let fernRows: [String] = ["....g....", ".g..g..g.", "..g.g.g..", "g.ggggg.g", ".ggggggg.", "...ggg..."]
    private static let shroomRows: [String] = [".rrr.", "rwrrr", "..w..", "..w.."]

    private static func woodsBack(_ b: inout BiomeCanvas) {
        // left and right trunks with roots, knots and moss
        b.rect(0, 12, 4, 48, .bark); b.rect(0, 56, 6, 4, .bark); b.rect(4, 58, 3, 2, .bark)
        b.rect(59, 8, 5, 52, .bark); b.rect(57, 56, 7, 4, .bark); b.rect(55, 58, 2, 2, .bark)
        let knots: [(Int, Int)] = [(1, 24), (1, 25), (61, 30), (61, 31), (60, 46)]
        for (x, y) in knots { b.set(x, y, .cave) }
        let mosses: [(Int, Int)] = [(3, 30), (3, 31), (2, 31), (3, 44), (59, 18), (59, 19), (60, 19), (59, 40)]
        for (x, y) in mosses { b.set(x, y, .moss) }
        // canopy: leaf masses at the corners and a ragged edge along the top right
        let leaves: [(Int, Int, Int)] = [(3, 20, 6), (9, 25, 4), (2, 29, 4), (36, 1, 4), (42, 0, 4), (49, 1, 4),
                                         (56, 2, 5), (62, 5, 6), (60, 26, 6), (56, 32, 4), (62, 34, 4)]
        for (cx, cy, r) in leaves { b.disc(cx, cy, r, .canopy) }
        for i in 0..<26 {
            b.set(Int((rnd(i) * 12).rounded(.down)), 14 + Int((rnd(i + 40) * 20).rounded(.down)), .fern)
        }
        for i in 0..<26 {
            b.set(52 + Int((rnd(i + 80) * 12).rounded(.down)), Int((rnd(i + 120) * 38).rounded(.down)), .fern)
        }
    }

    private static func woodsFore(_ b: inout BiomeCanvas) {
        let fern: [Character: SceneLayer] = ["g": .fern]
        b.spr(fernRows, 9, 54, fern); b.spr(fernRows, 28, 55, fern); b.spr(fernRows, 46, 54, fern)
        let cap: [Character: SceneLayer] = ["r": .shroom, "w": .daisy]
        b.spr(shroomRows, 19, 55, cap); b.spr(shroomRows, 40, 56, cap); b.spr(shroomRows, 36, 57, cap)
        b.hline(11, 16, 58, .moss); b.hline(10, 17, 59, .moss); b.hline(34, 41, 59, .moss); b.hline(36, 40, 58, .moss)
        for x in [5, 13, 23, 31, 33, 45, 52, 58] { b.set(x, 59, .litter) }
        for x in [8, 28, 50, 20, 42] { b.set(x, 58, .litter); b.set(x + 1, 59, .litter) }
        b.set(24, 59, .shroom); b.set(55, 59, .shroom)
    }

    private static func woodsLive(_ b: inout BiomeCanvas, _ s: BiomeLive, _ phase: Period) {
        if phase != .dusk && phase != .night { return }
        let t = s.tick
        for i in 0..<8 {
            if ((t >> 2) + i * 3) % 6 == 0 { continue }
            let wobX = 4 * sin(Double(t) / 9 + Double(i))
            let wobY = 3 * cos(Double(t) / 11 + Double(i * 2))
            let x = jsRound(Double(8 + i * 7) + wobX)
            let y = jsRound(Double(34 + ((i * 5) % 18)) + wobY)
            b.set(x, y, .firefly)
            if i % 3 == 0 { b.set(x + 1, y, .firefly) }
        }
    }

    // MARK: underwater (fish)

    private static let coralARows: [String] = [".X...X...", ".X...X.X.", "XX..XX.X.", ".XX.X.XX.", "..XXXXX..", "...XXX...", "...XXX...", "...XXX..."]
    private static let coralBRows: [String] = ["..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "X.X.X.X.X", "...XXX...", "...XXX..."]

    private static func waterBack(_ b: inout BiomeCanvas, _ phase: Period, _ rain: Bool) {
        var beams: [Int] = []
        if !rain {
            switch phase {
            case .night: beams = [34]
            case .dusk: beams = [14, 40]
            case .dawn: beams = [10, 36]
            case .day: beams = [6, 26, 46]
            }
        }
        for x0 in beams {
            for y in 0..<58 {
                let w = 2 + (y >> 4)
                for i in 0..<w {
                    let x = x0 + (y >> 1) + i
                    if ((x + y) & 1) == 0 { b.set(x, y, .waterLight) }
                }
            }
        }
        let a: [Character: SceneLayer] = ["X": .coralA]
        let c: [Character: SceneLayer] = ["X": .coralB]
        b.spr(coralARows, 33, 52, a)
        b.spr(coralBRows, 44, 54, c)
        b.spr(Array(coralARows.dropFirst(2)), 11, 54, c)
        b.spr(Array(coralBRows.dropFirst(3)), 54, 56, a)
    }

    private static func waterFore(_ b: inout BiomeCanvas) {
        for x in [6, 20, 49] { b.hline(x, x + 2, 58, .rock); b.hline(x - 1, x + 3, 59, .rock) }
        for x in [13, 27, 41, 57] { b.hline(x, x + 4, 59, .sand); b.hline(x + 1, x + 3, 58, .sand) }
        b.set(30, 58, .coralA); b.set(29, 59, .coralA); b.set(31, 59, .coralA)
    }

    private static func waterLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let t = s.tick
        // surface shimmer line is the Traditional cue; Technicolor adds rain ripples
        for x in 0..<64 where (x + (t >> 2)) % 6 < 3 {
            let low = ((x + (t >> 2)) % 12) < 6
            b.set(x, 17 + (low ? 0 : 1), .wave)
        }
        if s.rain {
            for i in 0..<3 {
                let w = 2 + ((t >> 1) + i * 4) % 7
                let cx = 12 + i * 20
                let row = 19 + (i & 1)
                b.hline(cx - w, cx - w + 1, row, .waterLight); b.hline(cx + w - 1, cx + w, row, .waterLight)
                b.hline(cx - 1, cx + 1, 21 + (i & 1), .waterLight)
            }
        }
        // seaweed
        let strands: [(Int, Int)] = [(3, 16), (21, 12), (50, 18), (61, 14)]
        for (i, strand) in strands.enumerated() {
            let x = strand.0, h = strand.1
            for k in 0..<h {
                let sway = sin(Double(t) / 10 + Double(k) * 0.45 + Double(i)) * 1.6 * (Double(k) / Double(h))
                let xx = x + jsRound(sway)
                b.set(xx, 59 - k, .seaweed)
                if k % 4 < 2 { b.set(xx + 1, 59 - k, .seaweed) }
            }
        }
        // bubbles
        let bx: [Int] = [6, 17, 29, 41, 53, 60]
        for i in 0..<bx.count {
            let rise = ((t * (1 + (i % 3))) >> 1) + i * 11
            let y = 58 - rise % 54
            let x = bx[i] + jsRound(sin(Double(t) / 9 + Double(i)) * 1.5)
            b.set(x + 1, y, .airBubble); b.set(x, y + 1, .airBubble); b.set(x + 2, y + 1, .airBubble); b.set(x + 1, y + 2, .airBubble)
            if i % 2 == 1 { b.set(x + 4, y - 5, .airBubble) }
        }
    }

    // MARK: open sky (bird)

    private static let nestRows: [String] = ["..ww..ww..", ".LLLLLLLL.", "LLLLLLLLLL"]

    private static func skyBack(_ b: inout BiomeCanvas) {
        for x in 0..<64 {
            let fx = Double(x)
            let h = jsRound(6 + 2.5 * sin(fx / 7) + 1.5 * sin(fx / 3.1 + 1))
            b.vline(x, 59 - h, 59, .hill)
        }
        let bushes: [(Int, Int, Int)] = [(5, 59, 6), (17, 60, 5), (31, 59, 6), (58, 59, 6), (64, 57, 4)]
        for (cx, cy, r) in bushes { b.disc(cx, cy, r, .canopy) }
        for i in 0..<24 {
            let x = Int((rnd(i) * 64).rounded(.down)), y = 54 + Int((rnd(i + 9) * 5).rounded(.down))
            b.set(x, y, .moss)
        }
    }

    private static func skyFore(_ b: inout BiomeCanvas) {
        b.spr(nestRows, 41, 57, ["w": .daisy, "L": .litter])
        for x in [8, 24, 54] { b.set(x, 59, .canopy); b.set(x + 1, 58, .canopy); b.set(x + 2, 58, .canopy); b.set(x + 3, 59, .canopy) }
        for x in [14, 30, 36, 60] { b.set(x, 59, .bark) }
    }

    private static func skyLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let d = s.seconds
        func wrap(_ v: Double) -> Double {
            let span = 100.0
            return (v.truncatingRemainder(dividingBy: span) + span).truncatingRemainder(dividingBy: span) - 20
        }
        let clouds: [(Double, Double, Double, Double)] = [
            (Double(s.seed % 64), 25, 0.5, 1),
            (Double((s.seed * 3) % 64 + 20), 44, 0.8, 0.8),
        ]
        // two big drifting clouds, soft blue-white
        for (x0, y, sp, sc) in clouds {
            let x = wrap(x0 + d * sp)
            b.disc(x + 8 * sc, y, 5 * sc, .cloudShade)
            b.disc(x + 15 * sc, y - 3 * sc, 6 * sc, .cloudShade)
            b.disc(x + 23 * sc, y, 5 * sc, .cloudShade)
            b.rect(jsRound(x + 8 * sc), jsRound(y), jsRound(15 * sc), jsRound(5 * sc), .cloudShade)
        }
    }

    // MARK: backyard (cat)

    private static func yardBack(_ b: inout BiomeCanvas, _ phase: Period) {
        // neighbour's house: roof, wall, chimney, windows (lit at dusk and night)
        for y in 25..<35 { b.hline(jsRound(55 - Double(y - 24) * 1.5), 63, y, .roof) }
        b.rect(60, 21, 3, 7, .bark)
        b.rect(41, 35, 23, 6, .wall)
        let lit = phase == .dusk || phase == .night
        let win: SceneLayer = lit ? .window : .hill
        b.rect(46, 36, 4, 3, win); b.rect(56, 36, 4, 3, win)
        if lit {
            b.set(45, 37, .window); b.set(60, 37, .window); b.vline(48, 36, 38, .wood); b.vline(58, 36, 38, .wood)
        }
        // wooden fence: pointed planks and two rails
        for x in stride(from: 0, to: 64, by: 5) {
            b.rect(x, 41, 4, 19, .wood)
            b.set(x, 41, .off); b.set(x + 3, 41, .off); b.rect(x + 1, 40, 2, 1, .wood)
        }
        b.hline(0, 63, 46, .bark); b.hline(0, 63, 54, .bark)
        for x in stride(from: 2, to: 64, by: 5) { b.set(x, 46, .cave); b.set(x, 54, .cave) }
    }

    private static func yardFore(_ b: inout BiomeCanvas) {
        // garden bed with bushes and blooms, a flowerpot and a ball of yarn
        b.hline(27, 52, 59, .bark); b.hline(28, 51, 58, .litter)
        for cx in [32, 39, 46] { b.disc(cx, 55, 3, .canopy) }
        let blooms: [(Int, Int, SceneLayer)] = [(31, 54, .coralA), (39, 53, .daisy), (46, 54, .coralB), (36, 56, .coralA), (43, 56, .daisy)]
        for (x, y, l) in blooms { b.set(x, y, l) }
        b.spr([".gg.", "gggg", "LLLL", ".LL.", ".LL."], 56, 55, ["g": .canopy, "L": .litter])
        b.set(57, 55, .daisy); b.set(59, 55, .coralA)
        b.disc(6, 56, 3, .yarn)
        let threads: [(Int, Int)] = [(5, 54), (6, 55), (7, 56), (4, 57), (6, 58)]
        for (x, y) in threads { b.set(x, y, .coralB) }
        b.hline(9, 14, 59, .yarn); b.set(8, 58, .yarn)
    }

    // MARK: cloud realm (spirits) and ember realm

    private static let twinkles: [(Int, Int)] = [(20, 18), (34, 22), (46, 17), (8, 28), (52, 34), (28, 34), (60, 42), (16, 42), (38, 12), (24, 46)]

    private static func cloudsBack(_ b: inout BiomeCanvas) {
        let puffs: [(Int, Int, Int)] = [(6, 50, 5), (14, 52, 6), (24, 51, 5), (40, 52, 6), (50, 50, 5), (58, 52, 6)]
        for (cx, cy, r) in puffs { b.disc(cx, cy, r, .cloudShade) }
        b.rect(4, 52, 58, 8, .cloudShade)
    }

    private static func cloudsFore(_ b: inout BiomeCanvas) {
        for cx in [4, 14, 27, 38, 50, 60] { b.disc(cx, 60, 3, .cloudShade) }
        for x in stride(from: 0, to: 64, by: 3) { b.set(x, 63, .cloudShade) }
    }

    private static func cloudsLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let t = s.tick
        for (i, p) in twinkles.enumerated() {
            if ((t >> 2) + i * 3) % 6 == 0 { continue }
            let x = p.0, y = p.1
            b.set(x, y, .twinkle)
            if i % 3 == 0 { b.set(x - 1, y, .twinkle); b.set(x + 1, y, .twinkle); b.set(x, y - 1, .twinkle); b.set(x, y + 1, .twinkle) }
        }
    }

    private static let spiresL: [Int] = [22, 24, 21, 17, 14, 11, 8, 6, 3]
    private static let spiresR: [Int] = [3, 6, 9, 14, 12, 18, 23, 20, 22]

    private static func emberBack(_ b: inout BiomeCanvas) {
        for y in 48..<60 {
            for x in 0..<64 where (x + y) % 2 == 0 && (x * 7 + y * 3) % 11 < (y - 46) { b.set(x, y, .ember) }
        }
        for (x, h) in spiresL.enumerated() { b.vline(x, 59 - h - 6, 59, .rock) }
        for (i, h) in spiresR.enumerated() { b.vline(55 + i, 59 - h - 6, 59, .rock) }
        let lavaDots: [(Int, Int)] = [(2, 44), (3, 50), (5, 54), (58, 40), (60, 48), (61, 52)]
        for (x, y) in lavaDots { b.set(x, y, .lava) }
    }

    private static func emberFore(_ b: inout BiomeCanvas) {
        let stones: [(Int, Int)] = [(12, 2), (24, 3), (36, 2), (47, 3)]
        for (cx, r) in stones { b.disc(cx, 60, r, .rock) }
        for x in stride(from: 3, to: 64, by: 7) { b.set(x, 62, .lava); b.set(x + 1, 63, .lava) }
    }

    private static func emberLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let t = s.tick
        for i in 0..<7 {
            let y = 58 - ((((t * (1 + (i % 2))) >> 1) + i * 8) % 50)
            let x = jsRound(Double(i * 9 + 3) + sin(Double(t) / 7 + Double(i)) * 2)
            b.set(x, y, .ember)
        }
        for i in 0..<8 { b.set((i * 8 + (t >> 2)) % 64, 18 + (((t >> 1) + i * 13) % 40), .ash) }
    }

    // MARK: warren (bunny)

    private static let carrotRows: [String] = ["g.g", ".g.", "CCC", "CCC", ".C.", ".C."]
    private static let daisyRows: [String] = [".w.", "wcw", ".w.", ".g.", ".g.", ".g."]
    private static let cloverRows: [String] = [".g.g.", "ggggg", ".ggg.", "..g.."]

    private static func warrenBack(_ b: inout BiomeCanvas) {
        // earth mound with the burrow mouth (`hole` is the Traditional cue: just the outline)
        for y in 48..<60 {
            let hw = 3 + Double(y - 48) * 0.65
            b.hline(jsRound(54 - hw), jsRound(54 + hw), y, .litter)
        }
        let spans: [(Int, Int)] = [(52, 55), (51, 56), (50, 57), (50, 57), (50, 57), (50, 57), (50, 57)]
        for (i, sp) in spans.enumerated() { b.hline(sp.0, sp.1, 53 + i, .burrow) }
        b.hline(52, 55, 52, .hole); b.set(51, 53, .hole); b.set(56, 53, .hole)
        b.vline(49, 54, 59, .hole); b.vline(58, 54, 59, .hole); b.set(50, 53, .hole); b.set(57, 53, .hole)
    }

    private static func warrenFore(_ b: inout BiomeCanvas) {
        let carrot: [Character: SceneLayer] = ["g": .clover, "C": .carrot]
        b.spr(carrotRows, 24, 54, carrot); b.spr(carrotRows, 11, 55, carrot)
        let daisy: [Character: SceneLayer] = ["w": .daisy, "c": .daisyC, "g": .clover]
        b.spr(daisyRows, 3, 54, daisy); b.spr(daisyRows, 33, 53, daisy); b.spr(daisyRows, 42, 54, daisy)
        let clover: [Character: SceneLayer] = ["g": .clover]
        b.spr(cloverRows, 17, 56, clover); b.spr(cloverRows, 38, 57, clover)
        b.spr(cloverRows, 29, 57, ["g": .moss])
    }

    private static func warrenLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let t = s.tick
        let xs: [Int] = [1, 2, 7, 15, 22, 36, 46, 61]
        let hs: [Int] = [11, 9, 7, 8, 6, 8, 9, 10]
        for i in 0..<xs.count {
            let x = xs[i], h = hs[i]
            for k in 0..<h {
                let sway = sin(Double(t) / 12 + Double(x)) * 1.4 * (Double(k) / Double(h))
                b.set(x + jsRound(sway), 59 - k, k % 3 == 0 ? .moss : .clover)
            }
        }
    }

    // MARK: crags (dragon)

    private static func cragsBack(_ b: inout BiomeCanvas, _ phase: Period) {
        let hot = phase == .dusk || phase == .night
        b.cone(50, 28, 59, 0.55, .rock, topHalf: 3)            // volcano (darker)
        b.cone(14, 26, 59, 0.9, .crag)                          // front crag
        for y in 26..<60 {                                      // shaded right flank
            let dy = Double(y - 26)
            b.hline(14 + jsRound(dy * 0.2), jsRound(14 + dy * 0.9), y, .rock)
        }
        for y in 26...35 {
            let dy = Double(y - 26)
            b.set(jsRound(14 - dy * 0.9), y, .peak); b.set(jsRound(14 + dy * 0.9), y, .peak)
        }
        // volcano crater, lava streams, glow
        b.hline(47, 53, 28, .lava); b.hline(48, 52, 29, .lava)
        for y in 30..<40 where y % 2 == 0 { b.set(49 + (y >> 3), y, .lava) }
        for y in 30..<35 where y % 2 == 1 { b.set(52, y, .lava) }
        if hot {
            for y in 21..<28 {
                for x in 41..<60 where (x + y) % 2 == 0 {
                    let reach = Double(abs(x - 50)) + Double(27 - y) * 1.3
                    if reach < 12 { b.set(x, y, .ember) }
                }
            }
        }
        // cave mouth
        let arch: [(Int, Int)] = [(11, 16), (10, 17), (9, 18)]
        for (i, a) in arch.enumerated() { b.hline(a.0, a.1, 46 + i, .cave) }
        for y in 49..<60 { b.hline(8, 19, y, .cave) }
        if hot { b.set(13, 57, .ember); b.set(14, 58, .ember); b.set(15, 57, .ember) }
    }

    private static func cragsFore(_ b: inout BiomeCanvas, _ phase: Period) {
        let stones: [(Int, Int)] = [(30, 2), (44, 3), (58, 2)]
        for (cx, r) in stones { b.disc(cx, 60, r, .rock) }
        for x in [24, 36] { b.hline(x, x + 2, 58, .crag); b.hline(x - 1, x + 3, 59, .crag) }
        if phase == .night {
            for x in stride(from: 2, to: 64, by: 6) { b.set(x, 62, .lava); b.set(x + 1, 62, .lava); b.set(x + 3, 63, .lava) }
        } else if phase == .dusk {
            for x in stride(from: 5, to: 64, by: 12) { b.set(x, 62, .lava) }
        }
    }

    private static func cragsLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let t = s.tick
        for i in 0..<3 {
            let u = ((t >> 1) + i * 9) % 27
            b.disc(49 + Double(u) * 0.5 + Double(i), 24 - Double(u) * 0.5, Double(1 + (u >> 3)), .ash)
        }
    }

    // MARK: workshop (bot)

    private static func workshopBack(_ b: inout BiomeCanvas) {
        // wall plates with rivets
        let plates: [(Int, Int, Int, Int)] = [(2, 32, 20, 14), (24, 19, 19, 13), (46, 30, 16, 16)]
        for (x, y, w, h) in plates {
            b.rect(x, y, w, h, .panel)
            let rivets: [(Int, Int)] = [(x + 1, y + 1), (x + w - 2, y + 1), (x + 1, y + h - 2), (x + w - 2, y + h - 2)]
            for (rx, ry) in rivets { b.set(rx, ry, .gear) }
        }
        // monitor: dark frame, stand
        b.rect(47, 33, 14, 11, .cable); b.rect(51, 44, 6, 2, .cable); b.rect(49, 46, 10, 1, .cable)
        // cables
        for x in 0..<26 {
            b.set(x, 24 + jsRound(5 * sin(Double.pi * Double(x) / 26)), .cable)
        }
        for x in 40..<64 {
            b.set(x, 18 + jsRound(6 * sin(Double.pi * Double(x - 40) / 24)), .cable)
        }
        b.vline(30, 46, 52, .cable)
    }

    private static func workshopFore(_ b: inout BiomeCanvas) {
        for x in 0..<64 where x % 8 < 5 { b.set(x, 62, .gridline) }
        for x in stride(from: 2, to: 64, by: 8) { b.set(x, 63, .gridline); b.set(x + 1, 63, .gridline) }
        for x in 8..<30 { b.set(x, 58 + jsRound(sin(Double(x) / 3.2)), .cable) }
        for x in 40..<52 { b.set(x, 59 - jsRound(sin(Double(x - 40) / 2.5)), .cable) }
    }

    private static func gear(_ b: inout BiomeCanvas, _ cx: Int, _ cy: Int, _ r: Int, _ ang: Double) {
        let fr = Double(r)
        for dy in (-r - 1)...(r + 1) {
            for dx in (-r - 1)...(r + 1) {
                let d2 = Double(dx * dx + dy * dy)
                let inner = (fr - 1.4) * (fr - 1.4)
                if d2 <= fr * fr + 1 && d2 >= inner { b.set(cx + dx, cy + dy, .gear) }
            }
        }
        for k in 0..<8 {
            let a = ang + Double(k) * Double.pi / 4
            b.set(jsRound(Double(cx) + cos(a) * (fr + 1.5)), jsRound(Double(cy) + sin(a) * (fr + 1.5)), .gear)
        }
        b.set(cx, cy, .cable)
        for k in 0..<4 {
            let a = ang + Double(k) * Double.pi / 2
            b.set(jsRound(Double(cx) + cos(a) * (fr - 2)), jsRound(Double(cy) + sin(a) * (fr - 2)), .cable)
        }
    }

    private static func workshopLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let t = s.tick
        gear(&b, 33, 25, 4, Double(t) / 9)
        gear(&b, 40, 29, 3, -Double(t) / 7 + 0.4)
        // monitor scan lines
        b.rect(48, 34, 12, 9, .screen)
        for k in 0..<4 {
            b.hline(49, 49 + 3 + ((k * 5 + (t >> 2) * 3) % 7), 35 + k * 2, .cable)
        }
        // blinking LEDs
        let leds: [(Int, Int, Int)] = [(46, 22, 0), (49, 22, 1), (52, 22, 2), (4, 28, 1), (7, 28, 0), (3, 36, 2), (10, 36, 1)]
        for (x, y, i) in leds {
            let on = ((t >> 3) + i) % 3 != 0
            let l: SceneLayer = on ? (i % 2 == 1 ? .ledB : .ledA) : .cable
            b.rect(x, y, 2, 2, l)
        }
    }

    // MARK: swamp (slime)

    private static let glowShroomRows: [String] = [".XXXXX.", "XXXXXXX"]

    private static func swampBack(_ b: inout BiomeCanvas, _ phase: Period) {
        b.vline(0, 14, 59, .stalac); b.vline(1, 20, 59, .stalac); b.vline(2, 28, 59, .stalac)
        b.vline(63, 10, 59, .stalac); b.vline(62, 18, 59, .stalac); b.vline(61, 30, 59, .stalac)
        let drips: [(Int, Int)] = [(34, 8), (38, 4), (44, 12), (50, 7), (27, 5), (58, 6)]
        for (x, len) in drips {
            for k in 0..<len {
                let half = jsRound(Double(len - k) / Double(len) * 2.4)
                b.hline(x - half, x + half, k, .stalac)
            }
        }
        let shrooms: [(Int, Int, Int)] = [(8, 54, 1), (24, 57, 0), (41, 56, 1), (55, 55, 0)]
        for (x, y, big) in shrooms {
            b.spr(glowShroomRows, x, y, ["X": .glowShroom])
            b.vline(x + 3, y + 2, 59, .stalac)
            if big == 1 { b.vline(x + 2, y + 2, 59, .stalac) }
            if phase != .day {
                for dy in -2..<4 {
                    for dx in -2..<10 where (dx + dy) % 2 == 0 && (dx < 0 || dx > 6 || dy < 0) {
                        b.set(x + dx, y + dy, .glowShroom)
                    }
                }
            }
        }
    }

    private static func swampFore(_ b: inout BiomeCanvas) {
        b.hline(4, 16, 59, .puddle); b.hline(6, 14, 58, .puddle); b.hline(44, 58, 59, .puddle); b.hline(46, 56, 58, .puddle)
        for x in stride(from: 0, to: 64, by: 2) { b.set(x, 62, .stalac) }
        for x in stride(from: 1, to: 64, by: 5) { b.set(x, 63, .puddle) }
        b.set(10, 58, .dew); b.set(51, 58, .dew)
    }

    private static func swampLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let t = s.tick
        let drops: [(Int, Int)] = [(44, 11), (50, 6), (34, 7)]
        for (i, d) in drops.enumerated() {
            let x = d.0, tip = d.1
            let u = ((t >> 1) + i * 7) % 20
            let y = tip + jsRound(Double(u * u) / 7)
            if y < 58 {
                b.set(x, y, .dew); b.set(x, y + 1, .dew)
            } else if u < 19 && x >= 44 {
                b.set(x - 1, 59, .dew); b.set(x + 1, 59, .dew)
            }
        }
    }

    // MARK: garden (bug)

    private static func gardenBack(_ b: inout BiomeCanvas) {
        b.leaf(0, 59, 19, 28, 5.5, .leafBig, .canopy)
        b.leaf(63, 59, 45, 32, 5.5, .leafBig, .canopy)
        b.leaf(12, 59, 3, 40, 3, .canopy, .leafBig)
        // flower heads on stems
        b.vline(26, 44, 59, .clover); b.vline(36, 49, 59, .clover)
        b.disc(26, 40, 4.4, .coralA); b.disc(26, 40, 2, .daisyC)
        b.disc(36, 46, 3.2, .coralB); b.disc(36, 46, 1.2, .daisyC)
        let notches: [(Int, Int)] = [(23, 37), (29, 37), (23, 43), (29, 43)]
        for (x, y) in notches { b.set(x, y, .off) }
    }

    private static func gardenFore(_ b: inout BiomeCanvas) {
        for x in [9, 22, 33, 50] { b.hline(x, x + 2, 58, .rock); b.hline(x - 1, x + 3, 59, .rock) }
        for x in stride(from: 1, to: 64, by: 4) { b.set(x, 62, .bark) }
    }

    private static func gardenLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let t = s.tick
        let xs: [Int] = [1, 4, 8, 13, 31, 55, 58, 62]
        let hs: [Int] = [17, 14, 11, 8, 6, 12, 15, 18]
        for i in 0..<xs.count {
            let x = xs[i], h = hs[i]
            for k in 0..<h {
                let sway = sin(Double(t) / 14 + Double(x)) * 1.6 * (Double(k) / Double(h))
                b.set(x + jsRound(sway), 59 - k, i % 2 == 1 ? .clover : .canopy)
            }
        }
        let dews: [(Int, Int)] = [(8, 45), (12, 40), (53, 45), (49, 40), (5, 52)]
        for (i, d) in dews.enumerated() where ((t >> 3) + i) % 4 != 0 {
            b.set(d.0, d.1, .dew); b.set(d.0 + 1, d.1, .dew); b.set(d.0, d.1 + 1, .dew)
        }
    }

    // MARK: space (alien)

    private static let saucerX = 3
    private static let saucerY = 47

    private static func crystal(_ b: inout BiomeCanvas, _ x: Int, _ top: Int, _ w: Int, _ h: Int, _ l: SceneLayer) {
        b.cone(x + (w >> 1), top, top + 3, 0.75, l)
        b.rect(x, top + 4, w, h - 4, l)
        b.set(x + (w >> 1), top - 1, l)
    }

    private static func ring(_ b: inout BiomeCanvas, _ cx: Int, _ cy: Int, front: Bool) {
        for k in 0..<120 {
            let a = Double(k) / 120 * Double.pi * 2
            let sn = sin(a), cs = cos(a)
            if (sn >= 0) != front { continue }
            let x = jsRound(Double(cx) + cs * 15)
            let y = jsRound(Double(cy) + sn * 3.6 + cs * 2.6)
            b.set(x, y, .crag)
        }
    }

    private static func spaceBack(_ b: inout BiomeCanvas, _ phase: Period) {
        // starfield: tiny dim stars, a few two-pixel dashes
        for i in 0..<60 {
            let x = Int((rnd(i + 7) * 64).rounded(.down)), y = 2 + Int((rnd(i + 91) * 50).rounded(.down))
            b.set(x, y, .starfield)
            if i % 9 == 0 { b.set(x + 1, y, .starfield) }
        }
        // a small far moon
        b.disc(11, 21, 3, .hull); b.set(10, 20, .crater); b.set(12, 22, .crater)
        // the ringed planet: ring behind, disc with bands and a shadowed limb, ring in front
        let cx = 49, cy = 28
        ring(&b, cx, cy, front: false)
        b.disc(cx, cy, 8, .planet)
        for y in (cy - 8)...(cy + 8) {
            for x in (cx - 8)...(cx + 8) {
                let dx = x - cx, dy = y - cy
                if Double(dx * dx + dy * dy) > 64.5 { continue }
                let lit = Double(dx) * 0.62 + Double(dy) * 0.78
                if lit > 3.6 || dy == -3 || dy == 2 { b.set(x, y, .planetShade) }
            }
        }
        ring(&b, cx, cy, front: true)
        // lunar horizon: low rolling hills of grey rock with pits
        for x in 0..<64 {
            let fx = Double(x)
            let h = jsRound(5 + 2.4 * sin(fx / 9) + 1.4 * sin(fx / 4 + 1))
            b.vline(x, 59 - h, 59, .rock)
        }
        let pits: [(Int, Int, Int)] = [(24, 56, 4), (41, 54, 5), (57, 57, 3)]
        for (x, y, w) in pits { b.hline(x - w, x + w, y, .crater); b.hline(x - w + 1, x + w - 1, y + 1, .crater) }
        // a landed saucer, left: legs, rim, dome, windows
        let sx = saucerX, sy = saucerY
        b.vline(sx + 2, sy + 8, 58, .hull); b.vline(sx + 11, sy + 8, 58, .hull)
        b.hline(sx + 1, sx + 3, 59, .hull); b.hline(sx + 10, sx + 12, 59, .hull)
        for y in 0..<5 {
            let u = Double(y - 2) / 2.6
            let hw = jsRound(7 * (1 - u * u).squareRoot())
            b.hline(sx + 7 - hw, sx + 7 + hw, sy + 3 + y, .hull)
        }
        b.hline(sx + 3, sx + 11, sy + 7, .planetShade)
        let dome: [Int] = [1, 2, 3, 3]
        for y in 0..<4 { b.hline(sx + 7 - dome[y], sx + 7 + dome[y], sy - 1 + y, .hull) }
        b.hline(sx + 6, sx + 8, sy + 1, .crystal)
        // glowing crystals, right: tall and short prisms
        let glow = phase != .day
        let prisms: [(Int, Int, Int, Int)] = [(55, 42, 3, 17), (59, 47, 3, 12), (51, 50, 2, 9)]
        for (x, top, w, h) in prisms {
            crystal(&b, x, top, w, h, .crystal)
            if glow {
                for dy in -3..<(h + 1) {
                    for dx in -3..<(w + 3) where (dx + dy) % 2 == 0 && (dx < 0 || dx >= w || dy < 0) && !(x + dx >= 64) {
                        b.set(x + dx, top + dy, .crystal)
                    }
                }
            }
        }
    }

    private static func spaceFore(_ b: inout BiomeCanvas) {
        for x in [8, 20, 34, 46] { b.hline(x, x + 2, 58, .rock); b.hline(x - 1, x + 3, 59, .rock) }
        let c: [Character: SceneLayer] = ["C": .crystal]
        b.spr([".C.", "CCC", "CCC"], 29, 56, c); b.spr([".C.", "CCC"], 14, 57, c)
        for x in stride(from: 2, to: 64, by: 7) { b.set(x, 62, .crater) }
        for x in stride(from: 5, to: 64, by: 9) { b.set(x, 63, .crater); b.set(x + 1, 63, .crater) }
    }

    private static let spaceTwinkles: [(Int, Int)] = [(6, 8), (14, 30), (23, 18), (31, 34), (38, 10), (45, 44), (58, 14), (61, 36), (4, 40), (27, 46)]

    private static func spaceLive(_ b: inout BiomeCanvas, _ s: BiomeLive) {
        let t = s.tick
        for (i, p) in spaceTwinkles.enumerated() {
            if ((t >> 2) + i * 3) % 5 == 0 { continue }
            let x = p.0, y = p.1
            b.set(x, y, .twinkle)
            if i % 3 == 0 { b.set(x - 1, y, .twinkle); b.set(x + 1, y, .twinkle); b.set(x, y - 1, .twinkle); b.set(x, y + 1, .twinkle) }
        }
        // a shooting star every few seconds
        let u = (t >> 1) % 60
        if u < 14 {
            for k in 0..<4 {
                let x = jsRound(10 + Double(u) * 3.6 - Double(k) * 1.5)
                let y = jsRound(18 + Double(u) * 1.6 - Double(k) * 0.7)
                b.set(x, y, .twinkle)
            }
        }
        // the saucer's lights blink in turn; a crystal tip glints
        let leds: [(Int, Int)] = [(saucerX + 2, saucerY + 6), (saucerX + 7, saucerY + 7), (saucerX + 12, saucerY + 6)]
        for (i, p) in leds.enumerated() {
            let phase = ((t >> 3) + i) % 3
            let l: SceneLayer = phase == 0 ? .ledA : (phase == 1 ? .ledB : .hull)
            b.set(p.0, p.1, l)
        }
        if (t >> 3) % 4 == 0 { b.set(56, 41, .twinkle); b.set(56, 40, .twinkle) }
    }
}
