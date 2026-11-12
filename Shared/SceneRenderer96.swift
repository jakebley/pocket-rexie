import Foundation

// The Technicolor home scene at 96x96 (docs/RESOLUTION.md, stage 1). The pet's life stays in 64-space logic units
// (`SceneState`, `SceneRenderer.placement`); this painter converts every logic position with `g(v) = round(v * 1.5)` and
// uses finer art (`SceneGlyph96`): a 48x48 pet (Scale3x of the 16x16 base frames, shaded by `PetShading` at k = 1.5),
// 10x10 HUD glyphs, 13x13 props. It follows expo-prototype/src/ui/sceneDraw96.ts; the behaviour (poses, effects,
// bubbles, weather, lights off) is the native 64 scene's. Biome scenery is the 64 art enlarged 3/2 until stage 2.
// Traditional never comes here: it stays the 64x64 scene exactly.

extension SceneRaster {
    /// Stamps a bitmap in one layer. `halo` first clears a 1px ring around every lit cell so the glyph reads over anything.
    /// Rows are walked as UTF-8 bytes without copying (this runs dozens of times per frame).
    mutating func stamp(_ rows: [String], x: Int, y: Int, halo: Bool = false, layer: SceneLayer = .ink, mirror: Bool = false) {
        let mark = UInt8(ascii: "X")
        let code = layer.rawValue
        let size = n
        if halo {
            for (j, row) in rows.enumerated() {
                let w = row.utf8.count
                var i = 0
                for ch in row.utf8 {
                    if ch == mark {
                        let px = x + (mirror ? w - 1 - i : i)
                        let py = y + j
                        let y0 = max(0, py - 1), y1 = min(size - 1, py + 1)
                        let x0 = max(0, px - 1), x1 = min(size - 1, px + 1)
                        if y0 <= y1 && x0 <= x1 {
                            for yy in y0...y1 {
                                for xx in x0...x1 { cells[yy * size + xx] = 0 }
                            }
                        }
                    }
                    i += 1
                }
            }
        }
        for (j, row) in rows.enumerated() {
            let py = y + j
            if py < 0 || py >= size { continue }
            let w = row.utf8.count
            var i = 0
            for ch in row.utf8 {
                if ch == mark {
                    let px = x + (mirror ? w - 1 - i : i)
                    if px >= 0 && px < size { cells[py * size + px] = code }
                }
                i += 1
            }
        }
    }

    /// Stamps a bitmap whose characters map to layers (anything not in the map is skipped).
    mutating func stamp(_ rows: [String], x: Int, y: Int, map: [UInt8: SceneLayer]) {
        for (j, row) in rows.enumerated() {
            let py = y + j
            if py < 0 || py >= n { continue }
            var i = 0
            for ch in row.utf8 {
                if let l = map[ch] {
                    let px = x + i
                    if px >= 0 && px < n { cells[py * n + px] = l.rawValue }
                }
                i += 1
            }
        }
    }

    /// A filled block of cells (clipped).
    mutating func block(_ x: Int, _ y: Int, _ w: Int, _ h: Int, _ layer: SceneLayer) {
        if w <= 0 || h <= 0 { return }
        for yy in max(0, y)..<max(max(0, y), min(n, y + h)) {
            for xx in max(0, x)..<max(max(0, x), min(n, x + w)) { cells[yy * n + xx] = layer.rawValue }
        }
    }
}

extension SceneRenderer {
    /// logic units to 96 cells (Math.round, half up)
    static func g96(_ v: Int) -> Int { Int((Double(v) * 1.5 + 0.5).rounded(.down)) }
    private static let gY = SceneRaster.groundY96
    private static let fY = SceneRaster.footY96

    /// A logic-unit rectangle (at least one cell).
    private static func lrect(_ r: inout SceneRaster, _ x: Int, _ y: Int, _ w: Int, _ h: Int, _ layer: SceneLayer = .ink) {
        let x0 = g96(x), y0 = g96(y)
        r.block(x0, y0, max(1, g96(x + w) - x0), max(1, g96(y + h) - y0), layer)
    }

    // MARK: pet placement at 96

    struct Place96 {
        var rows: [String]
        var x: Int
        var top: Int
        var mirror: Bool
    }

    /// Same rules as `placement` (pose, limit, blink, mirror), with the 48x48 frames at x1.5.
    static func placement96(pet: Pet, state: SceneState, frame: Int, motion: Bool, override: [String]?) -> Place96 {
        var rows: [String]
        var ix = Int(state.x.rounded())
        var dy = 0
        var mirror = state.facing < 0
        switch pet.stage {
        case .ghost:
            rows = Sprite96.grave
            ix = 16
            mirror = false
        case .egg:
            rows = Sprite96.egg
            ix = 16 + (motion ? [0, -1, 0, 1][frame & 3] : 0)
            mirror = false
        default:
            let pose = ScenePose.make(action: state.action, age: state.actionAge, lookUp: state.lookUp)
            var blink = pose.blink
            if motion && !blink && state.action != .eat {
                blink = ((state.tick &+ Int(pet.seed % 32)) & 31) < 2
            }
            rows = override ?? Sprite96.sprite(for: pet, blink: blink)
            dy = pose.dy
            let base = ix
            ix += pose.dxF * state.facing
            if state.action != .sleep {
                let lim = Int(SceneState.limit(species: pet.species, poops: state.groundPoops(for: pet)))
                if ix > lim { ix = max(lim, base) }
            }
            mirror = (state.facing < 0) != pose.flip
        }
        // bottom ink row of the sprite: the feet rest on the 96 ground
        var r1 = rows.count - 1
        var found = false
        for j in stride(from: rows.count - 1, through: 0, by: -1) where !found {
            if rows[j].utf8.contains(UInt8(ascii: "X")) { r1 = j; found = true }
        }
        return Place96(rows: rows, x: g96(ix), top: fY - r1 + g96(dy), mirror: mirror)
    }

    // MARK: render

    static func render96(pet: Pet, state: SceneState, date: Date, options: SceneRenderOptions) -> SceneRaster {
        var r = SceneRaster(n: 96)
        let t = date.timeIntervalSinceReferenceDate
        let motion = options.animated && !options.reducedMotion
        let frame = options.animated ? Int((t / 0.6).rounded(.down)) : 0
        let amb = SceneAmbient(seed: pet.seed, date: date, calendar: options.calendar)

        r.hasSky = true
        r.hour = amb.hour
        r.weather = amb.weather
        r.line = lineOf(pet)
        r.bodyHex = bodyHexOf(pet)
        let biome = options.biome ?? Biome.of(pet)
        r.biome = biome

        // logic placement (64-space) drives the bubble, the cloud avoidance and the effects' anchor points
        let place = placement(pet: pet, state: state, frame: frame, motion: motion, override: nil)
        let big = placement96(pet: pet, state: state, frame: frame, motion: motion, override: options.spriteOverride)
        let bubble = bubbleLayout(pet: pet, place: place)

        let rain = amb.weather == .rain
        if biome != .meadow {
            let live = BiomeLive(tick: motion ? Int((t * 8).rounded(.down)) : 0, seconds: motion ? t : 0,
                                 seed: Int(pet.seed % 4096), rain: rain)
            BiomeDraw.backdrop96(into: &r, biome: biome, period: amb.period, live: live)
        }
        drawSky96(&r, amb: amb, seed: pet.seed, t: t, frame: frame, motion: motion, avoid: bubble?.avoidRect)
        drawGround96(&r, seed: pet.seed, frame: frame, motion: motion)
        if biome != .meadow {
            BiomeDraw.fore96(into: &r, biome: biome, period: amb.period, rain: rain)
        }
        // Sun, clouds, rain and scenery stay off the pet and its 1px ring in every biome, the meadow included.
        r.clearAroundPet(big.rows, x: big.x, y: big.top, mirror: big.mirror)

        if pet.stage == .ghost || pet.stage == .egg {
            if pet.stage == .egg {
                r.drawEgg(big.rows, x: big.x, y: big.top)   // the dedicated egg: solid cream shell, no PetShading, readable at 48x48
            } else {
                r.drawPet(big.rows, x: big.x, y: big.top, mirror: big.mirror, family: "")
            }
            return r
        }

        if state.action == .sleep {
            let mx = g96(place.centerX - 10)
            for i in 0..<30 {
                if i % 2 == 0 { r.set(mx + i, fY - 2, .mat) } else { r.set(mx + i, fY - 1, .mat) }
                r.set(mx + i, fY, .mat)
            }
        }
        if let e = state.effect, e.kind == .food {
            drawFood96(&r, e: e, state: state)
        }
        r.drawPet(big.rows, x: big.x, y: big.top, mirror: big.mirror, family: Species.named(pet.species)?.family ?? "")
        drawAccessories96(&r, state: state, place: place, motion: motion)
        drawPoops96(&r, pet: pet, state: state, frame: frame, motion: motion)
        if let e = state.effect {
            drawEffect96(&r, e: e, pet: pet, state: state, place: place)
        }
        let popAge = state.tick - state.heartPop
        if popAge >= 0 && popAge < 10 {
            r.stamp(SceneGlyph96.heartFull, x: g96(place.centerX - 2), y: max(0, g96(place.inkTop - 7 - popAge / 2)), halo: true, layer: .spark)
        }
        drawHUD96(&r, pet: pet, frame: frame, animated: options.animated)

        if let call = pet.call, let layout = bubble {
            let visible = !motion || frame % 4 != 3
            if visible { drawBubble96(&r, call: call, layout: layout) }
        }

        if !pet.lightOn {
            r.dim = true
            let cut = g96(20)
            for y in cut..<SceneRaster.groundY96 {
                for x in 0..<96 where (x + y) % 2 == 0 && !r.isSet(x, y) { r.shade[y * 96 + x] = true }
            }
            for y in 0..<cut {
                for x in g96(33)..<96 where (x + y) % 2 == 0 && !r.isSet(x, y) { r.shade[y * 96 + x] = true }
            }
        }
        if motion && flashes96(state: state) { r.invert() }
        return r
    }

    private static func flashes96(state: SceneState) -> Bool {
        if state.action == .sneeze && state.actionAge == 4 { return true }
        if let e = state.effect, e.kind == .foe {
            let age = state.tick - e.start
            return age >= 0 && age < 2
        }
        return false
    }

    // MARK: sky

    /// Extra faint stars the finer grid has room for (96 cells).
    private static let extraStars: [(Int, Int)] = [(10, 14), (33, 22), (58, 18), (75, 26), (88, 40), (22, 52), (49, 62), (66, 48), (81, 60), (5, 70), (38, 74), (70, 72)]

    private static func drawSky96(_ r: inout SceneRaster, amb: SceneAmbient, seed: UInt64, t: Double, frame: Int, motion: Bool, avoid: AvoidRect?) {
        let fh = amb.fractionalHour
        let sunny = amb.weather != .rain   // weather is exclusive: when it rains there is no sun, only clouds and rain
        func sun(_ lx: Int, _ ly: Int) {
            guard sunny else { return }
            let cx = g96(lx), cy = g96(ly)
            r.stamp(SceneGlyph96.sunDisc, x: cx - 6, y: cy - 6, layer: .sun)
            let a = motion ? frame % 2 : 0
            if a == 0 {
                for k in [9, 10] {
                    r.set(cx - k, cy, .sun); r.set(cx + k, cy, .sun); r.set(cx, cy - k, .sun); r.set(cx, cy + k, .sun)
                    r.set(cx - k, cy - 1, .sun); r.set(cx + k, cy - 1, .sun); r.set(cx - 1, cy - k, .sun); r.set(cx - 1, cy + k, .sun)
                }
            } else {
                for k in [7, 8] {
                    r.set(cx - k, cy - k, .sun); r.set(cx + k, cy - k, .sun); r.set(cx - k, cy + k, .sun); r.set(cx + k, cy + k, .sun)
                }
            }
        }
        switch amb.period {
        case .dawn:
            let p = min(1, max(0, (fh - 5) / 3))
            sun(Int(5 + 12 * p), Int(52 - 7 * p))
        case .day:
            let p = min(1, max(0, (fh - 8) / 10))
            sun(Int(5 + 54 * p), Int(52 - 28 * sin(Double.pi * p)))
        case .dusk:
            let p = min(1, max(0, (fh - 18) / 3))
            sun(Int(54 - 8 * p), Int(46 + 6 * p))
        case .night:
            let shifted = fh >= 21 ? fh - 21 : fh + 3
            let p = min(1, max(0, shifted / 8))
            let cx = g96(Int(8 + 48 * p)), cy = g96(Int(50 - 26 * sin(Double.pi * p)))
            r.stamp(SceneGlyph96.moon, x: cx - 6, y: cy - 6, layer: .moon)
            for i in 0..<12 {
                let h = SceneRNG.hash(seed, UInt64(i), 5)
                let sx = g96(Int(h % 64))
                let sy = g96(21 + Int((h >> 8) % 28))
                if motion && (frame + i) % 3 == 0 { continue }
                r.set(sx, sy, .star); r.set(sx + 1, sy, .star); r.set(sx, sy + 1, .star); r.set(sx + 1, sy + 1, .star)
                if motion && (frame + i) % 4 == 1 {
                    for k in 1...2 {
                        r.set(sx - k, sy, .star); r.set(sx - k, sy + 1, .star); r.set(sx + 1 + k, sy, .star); r.set(sx + 1 + k, sy + 1, .star)
                        r.set(sx, sy - k, .star); r.set(sx + 1, sy - k, .star); r.set(sx, sy + 1 + k, .star); r.set(sx + 1, sy + 1 + k, .star)
                    }
                }
            }
            for (i, s) in extraStars.enumerated() where !motion || (frame / 2 + i * 3) % 4 != 0 { r.set(s.0, s.1, .star) }
        }
        if amb.period == .dawn || amb.period == .dusk {
            let o = amb.period == .dawn ? 0 : 1
            for x in 0..<96 {
                if (x + o) % 2 == 0 { r.set(x, g96(53), .cloud) }
                if (x + o * 2) % 4 == 0 { r.set(x, g96(51), .cloud) }
                if (x + o) % 8 == 0 { r.set(x, g96(49), .cloud) }
            }
        }

        let clouds: Int
        switch amb.weather {
        case .clear: clouds = amb.period == .night ? 0 : 1
        case .cloudy: clouds = 2
        case .rain: clouds = 3
        }
        let drift = motion ? Int((t / 10).rounded(.down)) : 0
        let rows = [22, 34, 28]
        let cycle = 64 + 17
        let cloudW = SceneGlyph.cloud[0].count
        let cloudH = SceneGlyph.cloud.count
        for i in 0..<clouds {
            let base = Int(SceneRNG.hash(seed, UInt64(i), 11) % UInt64(cycle))
            var cx = ((base + drift) % cycle + cycle) % cycle - 17
            if let a = avoid, a.intersects(x: cx, y: rows[i], w: cloudW, h: cloudH) {
                let left = a.minX - cloudW
                let right = a.maxX
                var pick = abs(cx - left) <= abs(cx - right) ? left : right
                if pick + cloudW <= 0 { pick = right } else if pick >= SceneRaster.side { pick = left }
                cx = pick
            }
            let art: [String]
            switch i {
            case 0: art = amb.weather == .clear ? SceneGlyph96.cloudS : SceneGlyph96.cloudL
            case 1: art = amb.weather == .rain ? SceneGlyph96.cloudL : SceneGlyph96.cloudS
            default: art = SceneGlyph96.cloudS
            }
            r.stamp(art, x: g96(cx), y: g96(rows[i]), halo: true, layer: .cloud)
        }

        // A butterfly crosses about every 90 seconds on fair days.
        if motion && amb.period != .night && amb.weather != .rain {
            let window = Int(t.rounded(.down)) / 45
            let h = SceneRNG.hash(seed, UInt64(max(0, window)), 51)
            if h % 2 == 0 {
                let u = (t - Double(window * 45) - Double((h >> 8) % 30)) / 12
                if u >= 0 && u < 1 {
                    let fromLeft = (h >> 20) & 1 == 0
                    let bx = Int(fromLeft ? -5 + 74 * u : 69 - 74 * u)
                    let by = 42 + Int(5 * sin(u * 14))
                    r.stamp(Int(t * 4) % 2 == 0 ? SceneGlyph96.butterfly0 : SceneGlyph96.butterfly1,
                            x: g96(bx), y: g96(by), halo: true, layer: .butterfly)
                }
            }
        }

        // Rain: five-cell slanted streaks falling through the sky.
        if amb.weather == .rain {
            for i in 0..<26 {
                let h = SceneRNG.hash(seed, UInt64(i), 21)
                let col = Int(h % 64)
                let y0 = Int((h >> 16) % 36)
                let ly = 20 + (motion ? (y0 + Int(t * 14)) % 36 : y0)
                let x = g96(col) + (i % 2), y = g96(ly)
                r.set(x, y, .rain); r.set(x, y + 1, .rain); r.set(x, y + 2, .rain)
                r.set(x - 1, y + 3, .rain); r.set(x - 1, y + 4, .rain)
            }
        }
    }

    // MARK: ground

    private static func drawGround96(_ r: inout SceneRaster, seed: UInt64, frame: Int, motion: Bool) {
        let G = gY
        r.block(0, G, 96, 3, .ground)
        for x in stride(from: 0, to: 96, by: 2) { r.set(x, G + 3, .dirt) }
        for x in stride(from: 1, to: 96, by: 3) { r.set(x, G + 4, .dirt) }
        for x in stride(from: 0, to: 96, by: 5) { r.set(x, G + 5, .dirt) }
        for lx in [6, 17, 29, 41, 52, 60, 25, 47] {
            let x = g96(lx)
            r.block(x, G + 3, 2, 1, .dirt); r.block(x, G + 4, 3, 1, .dirt); r.block(x + 1, G + 5, 3, 1, .dirt)
        }
        // Dense two-height grass with pebbles and the odd flower, the slots and kinds from the seed like the 64 ground.
        let flowerMapA: [UInt8: SceneLayer] = [UInt8(ascii: "X"): .flowerA, UInt8(ascii: "o"): .sun, UInt8(ascii: "s"): .grass]
        let flowerMapB: [UInt8: SceneLayer] = [UInt8(ascii: "X"): .flowerB, UInt8(ascii: "o"): .sun, UInt8(ascii: "s"): .grass]
        for (i, base) in stride(from: 1, to: 62, by: 5).enumerated() {
            let h = SceneRNG.hash(seed, UInt64(i), 41)
            let lx = min(60, max(0, base + Int(h % 3) - 1))
            let x = g96(lx)
            let swayed = motion && (frame + i) % 2 == 1
            switch (h >> 8) % 8 {
            case 0, 1, 2:
                let a = swayed ? SceneGlyph96.tuftT1 : SceneGlyph96.tuftT0
                r.stamp(a, x: x, y: G - a.count, layer: .grass)
            case 3, 4:
                let a = swayed ? SceneGlyph96.tuftS1 : SceneGlyph96.tuftS0
                r.stamp(a, x: x, y: G - a.count, layer: .grass)
            case 6:
                let a = i % 2 == 0 ? SceneGlyph96.flower0 : SceneGlyph96.flower1
                r.stamp(a, x: x, y: G - a.count, map: i % 2 == 0 ? flowerMapA : flowerMapB)
            default:
                r.stamp(SceneGlyph96.pebble, x: x, y: G - 3, layer: .dirt)
            }
        }
    }

    // MARK: pet extras

    private static func broomLeft96(age: Int) -> Double { -9 + Double(age) * 7.2 }

    private static func foodLayer96(_ food: Food?) -> SceneLayer {
        switch food {
        case .some(.meat): return .foodMeat
        case .some(.veggie): return .foodVeg
        case .some(.pasta): return .foodPasta
        case .none: return .snack
        }
    }

    private static func drawPoops96(_ r: inout SceneRaster, pet: Pet, state: SceneState, frame: Int, motion: Bool) {
        var shown = min(pet.poops, 3)
        var broomX: Double?
        if let e = state.effect, e.kind == .broom {
            shown = min(e.count, 3)
            broomX = broomLeft96(age: state.tick - e.start)
        } else {
            shown = state.groundPoops(for: pet)
        }
        guard shown > 0 else { return }
        for i in 0..<shown {
            let spot = SceneState.poopSpots[i]
            if let b = broomX, Double(spot) <= b + 4 { continue }
            let jiggle = (motion && (frame + i) % 2 == 0) ? 1 : 0
            r.stamp(SceneGlyph96.poop, x: g96(spot) - jiggle, y: fY - 9, halo: true, layer: .poop)
        }
    }

    private static func drawFood96(_ r: inout SceneRaster, e: SceneEffect, state: SceneState) {
        let age = max(0, state.tick - e.start)
        let fx = Int(e.x.rounded())
        let layer = foodLayer96(e.food)
        if e.flag {
            if state.action == .eat {
                let y = SceneRaster.footY
                lrect(&r, fx + 1, y - 1, 1, 1, layer); lrect(&r, fx + 5, y, 1, 1, layer)
                lrect(&r, fx + 3, y - 2, 1, 1, layer); lrect(&r, fx + 7, y - 1, 1, 1, layer)
            }
            return
        }
        r.stamp(SceneGlyph96.food(e.food), x: g96(fx), y: g96(min(SceneRaster.footY - 8, 20 + age * 3)), layer: layer)
    }

    private static func drawAccessories96(_ r: inout SceneRaster, state: SceneState, place p: ScenePlacement, motion: Bool) {
        let age = state.actionAge
        let dir = p.mirror ? -1 : 1
        let front = p.mirror ? p.left : p.right
        switch state.action {
        case .sleep:
            for k in 0..<2 {
                let a = motion ? ((state.tick + k * 10) % 20 + 20) % 20 : 4 + k * 8
                if a < 18 {
                    r.stamp(SceneGlyph96.zzz, x: g96(p.right - 3 + (a % 6 < 3 ? 0 : 2) + k * 3), y: g96(p.inkTop - 6 - a / 2), halo: true)
                }
            }
        case .sweat:
            r.stamp(SceneGlyph96.dropS, x: g96(p.centerX - 2), y: g96(p.inkTop - 7 + (age / 2) % 4), halo: true, layer: .waterDrop)
            lrect(&r, p.left - 2, p.inkTop + 6 + age % 2, 2, 2, .waterDrop)
            lrect(&r, p.left - 3, p.inkTop + 9 + age % 2, 2, 2, .waterDrop)
            lrect(&r, p.right + 2, p.inkTop + 6 + (age + 1) % 2, 2, 2, .waterDrop)
            lrect(&r, p.right + 3, p.inkTop + 9 + (age + 1) % 2, 2, 2, .waterDrop)
        case .dance:
            r.stamp(SceneGlyph96.note, x: g96(p.centerX - 3 + ((age / 3) % 2 == 0 ? -9 : 9)), y: g96(max(0, p.inkTop - 9)), halo: true, layer: .spark)
        case .train:
            r.stamp(SceneGlyph96.dumbbell, x: g96(p.centerX - 4), y: g96(max(0, p.inkTop - 12)), halo: true, layer: .tool)
            if age % 5 == 2 {
                lrect(&r, p.left - 3, p.inkTop + 5, 2, 2); lrect(&r, p.left - 5, p.inkTop + 3, 2, 2)
                lrect(&r, p.right + 3, p.inkTop + 5, 2, 2); lrect(&r, p.right + 5, p.inkTop + 3, 2, 2)
            }
        case .greet:
            let w = (age / 2) % 2 * 2
            lrect(&r, front + dir * 3, p.inkTop + 6 + w, 2, 2); lrect(&r, front + dir * 5, p.inkTop + 4 + w, 2, 2)
        case .react:
            if (age / 2) % 2 == 0 {
                r.stamp(SceneGlyph96.spark, x: g96(p.right - 2), y: g96(max(0, p.inkTop - 6)), halo: true, layer: .spark)
            } else {
                r.stamp(SceneGlyph96.spark, x: g96(p.left - 2), y: g96(max(0, p.inkTop - 4)), halo: true, layer: .spark)
            }
        case .battle:
            if (age >= 10 && age <= 12) || (age >= 14 && age <= 16) || (age >= 18 && age <= 20) {
                r.stamp(SceneGlyph96.spark, x: g96(max(0, (p.right + 46) / 2 - 4)), y: g96(44), halo: true, layer: .spark)
            }
        case .sneeze:
            if age >= 4 && age < 7 {
                lrect(&r, front + dir * 3, p.inkTop + 8, 2, 2); lrect(&r, front + dir * 5, p.inkTop + 9, 2, 2)
                lrect(&r, front + dir * 4, p.inkTop + 11, 2, 2)
            }
        default:
            break
        }
    }

    private static let foeLock = NSLock()
    private static var foeCache: [Int: [String]] = [:]
    private static func foeArt(_ idx: Int, _ frame: [String]) -> [String] {
        foeLock.lock()
        if let hit = foeCache[idx] { foeLock.unlock(); return hit }
        foeLock.unlock()
        let made = SceneGlyph96.foe(frame)
        foeLock.lock()
        foeCache[idx] = made
        foeLock.unlock()
        return made
    }

    private static func drawEffect96(_ r: inout SceneRaster, e: SceneEffect, pet: Pet, state: SceneState, place p: ScenePlacement) {
        let age = state.tick - e.start
        guard age >= 0 else { return }
        switch e.kind {
        case .food:
            break   // drawn under the pet
        case .broom:
            let bx = Int(broomLeft96(age: age))
            r.stamp(SceneGlyph96.broom, x: g96(bx), y: g96(SceneRaster.footY - 8), halo: true, layer: .tool)
            for k in 0..<4 {
                lrect(&r, bx - 3 - k * 4, SceneRaster.footY - 7 + (k * 2 + age) % 5, 1, 1)
            }
        case .syringe:
            guard age < 12 else { return }
            let prog = min(1.0, Double(age) / 10.0)
            let startX = e.dir > 0 ? 64.0 : -9.0
            let endX = Double(e.dir > 0 ? p.right - 4 : p.left - 5)
            let sx = Int(startX + (endX - startX) * prog)
            let sy = max(0, p.inkTop + 8 + Int(-14.0 * sin(Double.pi * prog)))
            r.stamp(SceneGlyph96.syringeProp, x: g96(sx), y: g96(sy), halo: true, layer: .tool, mirror: e.dir < 0)
        case .foe:
            guard age < 26 else { return }
            var fx = max(46, 64 - age * 3)
            if age >= 22 { fx = 46 + (age - 22) * 3 }
            let all = Species.all
            guard !all.isEmpty else { return }
            let idx = Int(SceneRNG.hash(pet.seed, SceneRNG.bits(e.start), 31) % UInt64(all.count))
            guard let frame = all[idx].frames.first else { return }
            r.stamp(foeArt(idx, frame), x: g96(fx), y: fY - 23, halo: true, mirror: true)
        case .ball:
            guard age < 26 else { return }
            let h = Int(14.0 * abs(sin(Double(age) * 0.9)))
            r.stamp(SceneGlyph96.ballProp, x: g96(Int(SceneEffect.ballX(age: age))), y: fY - 12 - g96(h), halo: true, layer: .ball)
        case .puff:
            if e.flag {
                for j in 0..<3 {
                    let px = (age * 6 + j * 21) % 64
                    r.block(g96(px), g96(26 + j * 6), 8, 2, .cloud)
                }
            } else {
                for j in 0..<4 where (age + j) % 2 == 0 {
                    r.stamp(SceneGlyph96.spark, x: g96(j * 16 + 3), y: g96(26 + ((age + j) % 3) * 3), halo: true, layer: .spark)
                }
            }
        case .shell:
            let y = g96(min(SceneRaster.footY - 2, 44 + age))
            r.stamp(SceneGlyph96.shell, x: g96(p.centerX - 8 - age / 3), y: y, halo: true, layer: .cloud)
            r.stamp(SceneGlyph96.shell, x: g96(p.centerX + 3 + age / 3), y: y, halo: true, layer: .cloud, mirror: true)
        }
    }

    // MARK: HUD and bubble

    private static func drawHUD96(_ r: inout SceneRaster, pet: Pet, frame: Int, animated: Bool) {
        for i in 0..<Pet.maxHearts {
            r.stamp(i < pet.hunger ? SceneGlyph96.heartFull : SceneGlyph96.heartEmpty, x: 1 + 12 * i, y: 1, halo: true, layer: .heart)
            r.stamp(i < pet.happy ? SceneGlyph96.smileFull : SceneGlyph96.smileEmpty, x: 1 + 12 * i, y: 13, halo: true, layer: .smile)
        }
        // Status glyphs stack down the top-right corner (x 85..94), the same slots as the 64 scene.
        if pet.needsAttention && (!animated || frame % 2 == 0) {
            r.stamp(SceneGlyph96.alert, x: 85, y: 1, halo: true, layer: .alert)
        }
        if pet.sick {
            r.stamp(SceneGlyph96.skull, x: 85, y: 13, halo: true)
        }
        if !pet.asleep {
            if pet.temp >= 2 {
                r.stamp(SceneGlyph96.drop, x: 85, y: 25, halo: true, layer: .waterDrop)
            } else if pet.temp <= -2 {
                r.stamp(SceneGlyph96.flake, x: 85, y: 25, halo: true, layer: .snow)
            }
        }
    }

    private static func bubbleIcon96(for call: Call) -> [String] {
        switch call {
        case .hungry: return SceneGlyph96.meat
        case .bored: return SceneGlyph96.ball
        case .poop: return SceneGlyph96.poop
        case .sick: return SceneGlyph96.syringe
        case .naughty: return SceneGlyph96.alert
        case .light: return SceneGlyph96.bulb
        case .hot: return SceneGlyph96.drop
        case .cold: return SceneGlyph96.flake
        }
    }

    private static func drawBubble96(_ r: inout SceneRaster, call: Call, layout l: BubbleLayout) {
        let bx = min(96 - 20, g96(l.x)), by = g96(l.y)
        r.block(bx, by, 20, 14, .off)
        r.stamp(SceneGlyph96.bubble, x: bx, y: by, layer: .bubble)
        r.stamp(bubbleIcon96(for: call), x: bx + 5, y: by + 2, layer: bubbleLayer(for: call))
        if l.clearH == 10 {
            // the tail points down toward the pet's head
            let tx = min(max(g96(l.tailX), bx + 5), bx + 14)
            for dx in 0..<3 { r.set(tx + dx, by + 14, .bubble) }
            for dx in 0..<2 { r.set(tx - 1 + dx, by + 15, .bubble) }
            r.set(tx - 2, by + 16, .bubble)
        } else {
            // beside the head: the tail points sideways
            let out = l.tailX < l.x ? -1 : 1
            let tx = out < 0 ? bx - 1 : bx + 20
            let ty = by + 6
            r.set(tx, ty, .bubble); r.set(tx, ty + 1, .bubble)
            r.set(tx + out, ty + 1, .bubble); r.set(tx + out, ty + 2, .bubble)
        }
    }
}
