import Foundation

// Biomes A at 96x96: meadow (dino), woods (fox), underwater (fish), clouds (spirits), garden (bug), yard (cat), warren (bunny).
// Port of expo-prototype/src/ui/biome96/{meadow,woods,underwater,clouds,garden,yard,warren}.ts. The static art is generated
// (Biome96AData, tools/gen_biome96a.ts); the animated parts are here, line for line with the Expo painters. Every painter owns its
// ground band: the scene skips the generic ground for these biomes.
enum Biome96A {
    typealias Period = SceneAmbient.Period
    /// The first slots are glow slots by convention: they keep their light in the dark appearance.
    static let glowSlots = 6
    private static let G = 90
    private static let N = 96

    static func handles(_ biome: Biome) -> Bool {
        switch biome {
        case .meadow, .woods, .underwater, .clouds, .garden, .yard, .warren: return true
        default: return false
        }
    }

    static func periodName(_ p: Period) -> String {
        switch p {
        case .dawn: return "dawn"
        case .day: return "day"
        case .dusk: return "dusk"
        case .night: return "night"
        }
    }

    static func periodSlot(_ p: Period) -> Int {
        switch p {
        case .dawn: return 0
        case .day: return 1
        case .dusk: return 2
        case .night: return 3
        }
    }

    // MARK: static layers

    private enum Part: Int { case back = 0, fore = 1, back1 = 2, back2 = 3, back3 = 4
        var name: String {
            switch self {
            case .back: return "back"
            case .fore: return "fore"
            case .back1: return "back1"
            case .back2: return "back2"
            case .back3: return "back3"
            }
        }
    }

    private static let index: [String: Int] = {
        var out: [String: Int] = [:]
        for line in Biome96AData.index.split(separator: "\n") {
            guard let eq = line.firstIndex(of: "="), let id = Int(line[line.index(after: eq)...]) else { continue }
            out[String(line[..<eq])] = id
        }
        return out
    }()

    private static let colorRows: [String: [String]] = {
        var out: [String: [String]] = [:]
        for line in Biome96AData.colors.split(separator: "\n") {
            guard let eq = line.firstIndex(of: "=") else { continue }
            out[String(line[..<eq])] = line[line.index(after: eq)...].split(separator: ",", omittingEmptySubsequences: false).map(String.init)
        }
        return out
    }()

    private static let lock = NSLock()
    private static var decoded: [Int: [UInt8]] = [:]
    private static var resolved: [Int: [UInt8]] = [:]

    private static func biomeIndex(_ b: Biome) -> Int { Biome.allCases.firstIndex(of: b) ?? 0 }

    /// The decoded static layer for (biome, part, period, rain); empty when the biome has none there.
    private static func layer(_ biome: Biome, _ part: Part, _ period: Period, _ rain: Bool) -> [UInt8] {
        let key = ((biomeIndex(biome) * 8 + part.rawValue) * 4 + Biome96A.periodSlot(period)) * 2 + (rain ? 1 : 0)
        lock.lock()
        if let hit = resolved[key] { lock.unlock(); return hit }
        lock.unlock()
        let name = "\(biome.rawValue).\(Biome96A.periodName(period)).\(rain ? 1 : 0).\(part.name)"
        var cells: [UInt8] = []
        if let id = index[name], id < Biome96AData.grids.count {
            lock.lock()
            let known = decoded[id]
            lock.unlock()
            if let known {
                cells = known
            } else {
                cells = Layer96.decode(Biome96AData.grids[id])
                lock.lock(); decoded[id] = cells; lock.unlock()
            }
        }
        lock.lock(); resolved[key] = cells; lock.unlock()
        return cells
    }

    /// Hex slot colours of a biome in a phase (nil for the biomes that use the shared layers only).
    static func slotColors(biome: Biome, period: Period, rain: Bool) -> [String]? {
        colorRows["\(biome.rawValue).\(Biome96A.periodName(period)).\(rain ? 1 : 0)"]
    }

    /// FNV-1a hashes the generator recorded for the Expo backdrop layers ("biome.phase.rain.back=hash"), for the tests.
    static let expoHashes: [String: UInt32] = {
        var out: [String: UInt32] = [:]
        for line in Biome96AData.hashes.split(separator: "\n") {
            guard let eq = line.firstIndex(of: "="), let v = UInt32(line[line.index(after: eq)...], radix: 16) else { continue }
            out[String(line[..<eq])] = v
        }
        return out
    }()

    /// The back layer a still scene shows (tests).
    static func backLayer(_ biome: Biome, _ period: Period, _ rain: Bool) -> [UInt8] { layer(biome, .back, period, rain) }

    // MARK: dispatch

    static func backdrop(into r: inout SceneRaster, biome: Biome, period: Period, live: BiomeLive) {
        let rain = live.rain
        switch biome {
        case .underwater:
            // the light shafts shimmer in four steps
            let step = live.still ? 0 : Int((live.seconds * 1000 / 900).rounded(.down)) % 4
            let part: Part = step == 0 ? .back : (step == 1 ? .back1 : (step == 2 ? .back2 : .back3))
            r.blit(layer(biome, part, period, rain))
        case .clouds:
            r.blit(layer(biome, .back, period, rain))
            cloudsLive(&r, live)
        case .yard:
            r.blit(layer(biome, .back, period, rain))
            yardLive(&r, live, period)
        default:
            r.blit(layer(biome, .back, period, rain))
        }
    }

    static func fore(into r: inout SceneRaster, biome: Biome, period: Period, live: BiomeLive) {
        let rain = live.rain
        if biome == .garden || biome == .warren { r.occlude(layer(biome, .back, period, rain)) }
        r.blit(layer(biome, .fore, period, rain))
        switch biome {
        case .meadow: meadowLive(&r, live, period)
        case .woods: woodsLive(&r, live, period)
        case .underwater: underwaterLive(&r, live, period)
        case .garden: gardenLive(&r, live, period)
        case .warren: warrenLive(&r, live, period)
        default: break
        }
    }

    // MARK: meadow

    private static let tufts = [7, 19, 31, 44, 56, 68, 80, 92]
    private static let tuftBlades: [(Int, Int)] = [(0, 6), (2, 8), (4, 5), (-2, 4)]

    private static func meadowLive(_ r: inout SceneRaster, _ s: BiomeLive, _ period: Period) {
        typealias K = Biome96AData.Slot.Meadow
        let sw = s.still ? 0 : Int((s.seconds * 1000 / 1200).rounded(.down))
        for (i, x) in tufts.enumerated() {
            let lean = ((sw + i) % 2) * 2 - 1
            for (dx, h) in tuftBlades {
                r.vline(x + dx, G - h + 2, G - 1, K.blade)
                let l = dx % 4 != 0 ? lean : -lean
                r.put(x + dx + l, G - h + 1, K.grassLight)
                r.put(x + dx + l * 2, G - h, K.grassLight)
            }
        }
        let T = s.tick
        if period == .day || period == .dawn {
            for i in 0..<4 {
                let x = BiomeDraw.jsRound((Double(i * 29) + Double(T) * 0.35).truncatingRemainder(dividingBy: Double(N + 10)) - 5)
                let y = BiomeDraw.jsRound(Double(54 + i * 6) + sin(Double(T) / 6 + Double(i * 2)) * 3)
                if !s.still || i == 0 { r.put(x, y, K.glint); r.put(x + 1, y + 1, K.glint) }
            }
        } else {
            for i in 0..<9 {
                if ((T >> 2) + i * 3) % 7 == 0 { continue }
                let x = BiomeDraw.jsRound(Double(6 + i * 10) + 4 * sin(Double(T) / 9 + Double(i)))
                let y = BiomeDraw.jsRound(Double(52 + ((i * 7) % 30)) + 3 * cos(Double(T) / 11 + Double(i * 2)))
                r.put(x, y, K.firefly)
                if i % 3 == 0 { r.put(x + 1, y, K.firefly) }
            }
        }
    }

    // MARK: woods

    private static func woodsLive(_ r: inout SceneRaster, _ s: BiomeLive, _ period: Period) {
        typealias K = Biome96AData.Slot.Woods
        let T = s.tick
        if period == .dusk || period == .night {
            for i in 0..<12 {
                if ((T >> 2) + i * 3) % 6 == 0 { continue }
                let x = BiomeDraw.jsRound(6 + Double(i) * 7.5 + 5 * sin(Double(T) / 9 + Double(i)))
                let y = BiomeDraw.jsRound(Double(44 + ((i * 7) % 40)) + 4 * cos(Double(T) / 11 + Double(i * 2)))
                r.put(x, y, K.firefly)
                if i % 3 == 0 { r.put(x + 1, y, K.firefly) }
            }
        } else {
            // dust motes in the light rays and two leaves drifting down
            for i in 0..<6 {
                let x = BiomeDraw.jsRound(Double(40 + i * 5) + 2 * sin(Double(T) / 12 + Double(i * 2)))
                let y = BiomeDraw.jsRound(26 + (Double(T) / 3 + Double(i * 17)).truncatingRemainder(dividingBy: 50))
                r.put(x, y, K.mote)
            }
            for i in 0..<2 {
                let y = BiomeDraw.jsRound((Double(T) / 2 + Double(i * 38)).truncatingRemainder(dividingBy: 80) + 8)
                let x = BiomeDraw.jsRound(Double(30 + i * 30) + 5 * sin(Double(T) / 7 + Double(i * 3)))
                r.put(x, y, K.litterA); r.put(x + 1, y, K.litterC); r.put(x, y + 1, K.litterB)
            }
        }
    }

    // MARK: underwater

    private static let surf = 27
    private static let kelps: [(Int, Int, Int)] = [(11, 38, 0), (1, 30, 1), (79, 34, 2), (92, 42, 3), (58, 24, 4), (47, 18, 5)]
    private static let fishR = ["..ff....", "ffFFff.f", ".fFFFfff", "..ff...."]
    private static let fishL = ["....ff..", "f.ffFFff", "fffFFFf.", "....ff.."]
    private static let vents = [14, 27, 38, 50, 60, 72, 86]

    private static func underwaterLive(_ r: inout SceneRaster, _ s: BiomeLive, _ period: Period) {
        typealias K = Biome96AData.Slot.Water
        let T = s.tick, t = s.seconds
        let wave = SceneLayer.wave.rawValue
        // wave line and rain rings
        for x in 0..<N where (x + (T >> 2)) % 6 < 3 {
            r.put(x, surf - 1 + (((x + (T >> 2)) % 12) < 6 ? 0 : 1), wave)
        }
        if s.rain {
            for i in 0..<4 {
                let w = 2 + ((T >> 1) + i * 5) % 9, cx = 14 + i * 22
                r.hline(cx - w, cx - w + 1, surf + 3 + (i & 1), K.bubble)
                r.hline(cx + w - 1, cx + w, surf + 3 + (i & 1), K.bubble)
                r.hline(cx - 2, cx + 2, surf + 5 + (i & 1), K.bubble)
            }
        }
        // far school (silhouettes drift slowly)
        let school: [UInt8: UInt8] = [UInt8(ascii: "f"): K.farFish, UInt8(ascii: "F"): K.farRockDark]
        for i in 0..<7 {
            let dir = i < 4 ? 1.0 : -1.0
            let drift = ((t * 2 * dir + Double(i * 23)).truncatingRemainder(dividingBy: 130) + 130).truncatingRemainder(dividingBy: 130) - 17
            let x = BiomeDraw.jsRound(drift)
            let y = 40 + (i % 4) * 5 + (i > 3 ? 12 : 0) + BiomeDraw.jsRound(sin(t + Double(i)) * 1.2)
            r.spr(dir == 1 ? fishR : fishL, x, y, school)
        }
        // kelp: each strand is a stalk with leaves that sway more toward the top
        for (x, h, seed) in kelps {
            for k in 0..<h {
                let sway = sin(t * 1.2 + Double(k) * 0.28 + Double(seed)) * 2.2 * (Double(k) / Double(h))
                let xx = BiomeDraw.jsRound(Double(x) + sway), y = G - 1 - k
                r.put(xx, y, k % 2 != 0 ? K.kelp : K.kelpDark); r.put(xx + 1, y, K.kelp)
                if k % 7 == 3 { r.put(xx - 1, y, K.kelpLight); r.put(xx - 2, y - 1, K.kelpLight); r.put(xx - 3, y - 1, K.kelp) }
                if k % 7 == 6 { r.put(xx + 2, y, K.kelpLight); r.put(xx + 3, y - 1, K.kelpLight); r.put(xx + 4, y - 1, K.kelp) }
            }
        }
        // bubbles from the vents
        for (i, x0) in vents.enumerated() {
            let u = ((s.still ? 0 : t * Double(6 + (i % 3) * 2)) + Double(i * 17)).truncatingRemainder(dividingBy: 62)
            let y = BiomeDraw.jsRound(Double(G - 3) - u)
            let x = BiomeDraw.jsRound(Double(x0) + sin(t * 1.5 + Double(i)) * 2 + u * 0.05 * Double((i % 2) * 2 - 1))
            if i % 2 != 0 {
                r.put(x, y, K.bubble); r.put(x + 1, y, K.bubble); r.put(x, y + 1, K.bubble); r.put(x + 1, y + 1, K.bubble)
            } else {
                r.put(x + 1, y, K.bubble); r.put(x, y + 1, K.bubble); r.put(x + 2, y + 1, K.bubble); r.put(x + 1, y + 2, K.bubble)
                r.put(x + 1, y + 1, K.glint)
            }
            if u < 30 { r.put(x + 3, y + 7, K.bubble) }
        }
        // a jellyfish drifts up and down on the right
        let jx = 70 + BiomeDraw.jsRound(sin(t / 3) * 5), jy = 44 + BiomeDraw.jsRound(sin(t / 2) * 4)
        let pulse = Int((t * 1.5).rounded(.down)) % 2
        r.ell(Double(jx), Double(jy), 4, 2.4, K.jelly); r.hline(jx - 3, jx + 3, jy + 2, K.jelly); r.put(jx - 1, jy - 1, K.glint)
        for i in stride(from: -2, through: 2, by: 2) {
            for k in 0..<(4 + pulse) { r.put(jx + i + (k % 2) * (i == 0 ? 1 : 0), jy + 3 + k, K.jelly) }
        }
        if period == .night || period == .dusk {
            for i in 0..<8 {
                r.putR(Double(6 + i * 11) + sin(t + Double(i)) * 3, Double(50 + (i * 9) % 34) + cos(t * 0.7 + Double(i)) * 3, K.plankton)
            }
        }
    }

    // MARK: clouds

    private static let twinkles: [(Int, Int)] = [(20, 28), (34, 34), (46, 26), (8, 40), (58, 50), (30, 56), (88, 62), (16, 60), (64, 18), (74, 40), (52, 44)]

    private static func cloudsLive(_ r: inout SceneRaster, _ s: BiomeLive) {
        typealias K = Biome96AData.Slot.Clouds
        let T = s.tick
        for (i, p) in twinkles.enumerated() {
            let ph = ((T >> 2) + i * 3) % 6
            if ph == 0 { continue }
            let x = p.0, y = p.1
            let big = i % 3 == 0
            r.put(x, y, K.star)
            if big && ph != 1 {
                r.put(x - 1, y, K.star); r.put(x + 1, y, K.star); r.put(x, y - 1, K.star); r.put(x, y + 1, K.star)
                if ph == 3 || ph == 4 { r.put(x - 2, y, K.starW); r.put(x + 2, y, K.starW); r.put(x, y - 2, K.starW); r.put(x, y + 2, K.starW) }
            } else if ph == 3 {
                r.put(x - 1, y, K.starW); r.put(x + 1, y, K.starW)
            }
        }
        // dust sparkles rise from the floor
        for i in 0..<7 {
            let u = (Double(T) * (1 + Double(i % 2) * 0.5) * 0.4 + Double(i * 11)).truncatingRemainder(dividingBy: 50)
            r.putR(Double(8 + i * 13) + sin(Double(T) / 9 + Double(i)) * 3, 88 - u, K.dust)
        }
    }

    // MARK: yard

    private static let windows: [(Int, Int)] = [(52, 44), (67, 44)]

    private static func yardLive(_ r: inout SceneRaster, _ s: BiomeLive, _ period: Period) {
        typealias K = Biome96AData.Slot.Yard
        let T = s.tick, t = s.seconds
        // chimney smoke: puffs rise, widen and drift right
        let puffs = period == .night ? 3 : 5
        for i in 0..<puffs {
            let u = (t * 4 + Double(i * 9)).truncatingRemainder(dividingBy: 44) / 44
            let y = BiomeDraw.jsRound(15 - u * 18)
            let x = BiomeDraw.jsRound(59 + u * 10 + sin(t + Double(i * 2)) * 1.2)
            let rad = 1.3 + u * 2.2
            if u < 0.8 { r.ell(Double(x), Double(y), rad, rad * 0.8, K.smoke) }
        }
        // the window next to the door flickers at night (a television)
        if period == .night || period == .dusk {
            let f = (T >> 1) % 5
            for i in 0..<9 where (i + f) % 3 == 0 { r.put(windows[1].0 + i, windows[1].1 + 7, K.glass) }
            r.put(windows[0].0 + 4, windows[0].1 + 5 + (f & 1), K.windowHi)
        }
    }

    // MARK: garden

    private static let gardenBlades: [(Int, Int, Int)] = [(1, 24, 0), (4, 19, 1), (7, 14, 0), (10, 9, 1), (13, 6, 0), (28, 6, 1), (41, 5, 0),
                                                         (51, 7, 1), (58, 6, 0), (68, 5, 1), (90, 13, 0), (93, 20, 1), (95, 25, 0), (87, 8, 1)]
    private static let dewSpots: [(Int, Int)] = [(14, 70), (22, 62), (10, 80), (80, 68), (86, 78), (72, 62), (30, 56)]

    private static func gardenLive(_ r: inout SceneRaster, _ s: BiomeLive, _ period: Period) {
        let T = s.tick
        let leafHi = SceneLayer.moss.rawValue, stem = SceneLayer.clover.rawValue, leafC = SceneLayer.leafBig.rawValue
        let vein = SceneLayer.fern.rawValue, daisy = SceneLayer.daisy.rawValue, cable = SceneLayer.cable.rawValue
        let amp = s.rain ? 0.8 : 1.5
        for (x, h, tone) in gardenBlades {
            for k in 0..<h {
                let f = Double(k) / Double(h)
                let off = BiomeDraw.jsRound(sin(Double(T) / 12 + Double(x) * 0.6) * amp * f * f * 1.7)
                r.put(x + off, G - 1 - k, k >= h - 3 ? leafHi : (tone != 0 ? stem : leafC))
                if k < h - 6 && h > 10 { r.put(x + off + 1, G - 1 - k, tone != 0 ? leafC : vein) }
            }
        }
        // a dew glint blinks on the leaves in turn
        let g = (T >> 3) % 8
        if g < dewSpots.count {
            let (x, y) = dewSpots[g]
            r.put(x - 1, y, daisy); r.put(x + 2, y, daisy); r.put(x, y - 1, daisy); r.put(x + 1, y + 2, daisy)
        }
        // the ladybug walks up the left leaf's midrib and back
        let cyc = 160, u = (T >> 1) % cyc
        let f = u < cyc / 2 ? Double(u) / Double(cyc / 2) : 2 - Double(u) / Double(cyc / 2)
        let bx = BiomeDraw.jsRound(8 + f * 22), by = BiomeDraw.jsRound(86 - f * 34)
        r.fill(bx, by, 4, 3, SceneLayer.shroom.rawValue); r.put(bx + 1, by, cable); r.put(bx + 2, by + 2, cable)
        r.hline(bx, bx + 3, by - 1, cable)
        r.put(bx + (T % 2), by + 3, cable)
        // a bee passes by day
        if period == .day || period == .dawn {
            let w = (T >> 1) % 150
            if w < 70 {
                let x = BiomeDraw.jsRound(-6 + Double(w) * 1.5), y = BiomeDraw.jsRound(40 + sin(Double(w) / 5) * 4)
                r.fill(x, y, 4, 2, SceneLayer.twinkle.rawValue); r.put(x + 1, y, cable); r.put(x + 2, y + 1, cable)
                r.put(x + 1, y - 1, daisy); r.put(x + 2, y - 1, daisy)
            }
        }
    }

    // MARK: warren

    private static let warrenBlades: [(Int, Int, Int)] = [(1, 19, 0), (4, 14, 1), (8, 10, 0), (12, 7, 1), (28, 6, 1), (31, 9, 0), (39, 5, 1), (57, 8, 0),
                                                         (66, 7, 1), (72, 6, 0), (92, 17, 1), (94, 21, 0), (89, 12, 0), (86, 8, 1), (51, 5, 0), (22, 5, 0)]
    private static let burrowX = 78

    private static func warrenLive(_ r: inout SceneRaster, _ s: BiomeLive, _ period: Period) {
        let T = s.tick
        let blade = SceneLayer.leafBig.rawValue, bladeDk = SceneLayer.fern.rawValue
        let daisy = SceneLayer.daisy.rawValue, daisyC = SceneLayer.daisyC.rawValue
        for (x, h, tone) in warrenBlades {
            let amp = (s.rain ? 0.9 : 1.6) * (h > 12 ? 1.2 : 1)
            let sgn = sin(Double(x)) > 0 ? 1.0 : (sin(Double(x)) < 0 ? -1.0 : 0)
            for k in 0..<h {
                let f = Double(k) / Double(h)
                let tip = k > h - 4 ? 0.5 * sgn : 0
                let off = BiomeDraw.jsRound(sin(Double(T) / 11 + Double(x) * 0.7) * amp * f * f * 1.6 + tip)
                r.put(x + off, G - 1 - k, k >= h - 3 ? blade : (tone != 0 ? blade : bladeDk))
                if k < h - 5 && h > 8 { r.put(x + off + 1, G - 1 - k, tone != 0 ? bladeDk : blade) }
            }
        }
        // two eyes glint in the burrow, blinking now and then
        let ph = (T >> 3) % 24
        if ph < 18 && (period == .night || period == .dusk || ph < 10) {
            if ph % 9 != 8 {
                r.put(burrowX - 3, 83, daisy); r.put(burrowX + 3, 83, daisy)
                r.put(burrowX - 3, 84, daisyC); r.put(burrowX + 3, 84, daisyC)
            }
        }
        // dandelion seeds drift past
        let d = (T >> 1) % 96
        r.putR(Double(d), 60 - Double(BiomeDraw.jsRound(sin(Double(d) / 7) * 3)), daisy)
        r.putR(Double((d + 40) % 96), 52 + Double(BiomeDraw.jsRound(sin(Double(d) / 6) * 3)), daisy)
    }
}
