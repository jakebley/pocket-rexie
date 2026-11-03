import Foundation

// Draws the 64x64 home scene into a plain pixel buffer. Foundation only, so the same code feeds
// the animated LCDScreen, the static widget picture and the unit tests. SwiftUI turns the
// buffer into paths (see LCDPainter.path).

/// A 64x64 one-bit picture. `ink` pixels are dark; `shade` pixels are the dim dither mask.
struct SceneRaster: Equatable {
    static let side = 64
    /// Row of the ground line (two rows thick); the pet's feet rest on the row above it.
    static let groundY = 58
    /// Bottom row of a standing sprite.
    static let footY = 57

    var ink = [Bool](repeating: false, count: SceneRaster.side * SceneRaster.side)
    var shade = [Bool](repeating: false, count: SceneRaster.side * SceneRaster.side)

    func isSet(_ x: Int, _ y: Int) -> Bool {
        guard x >= 0, x < SceneRaster.side, y >= 0, y < SceneRaster.side else { return false }
        return ink[y * SceneRaster.side + x]
    }

    mutating func set(_ x: Int, _ y: Int, _ on: Bool = true) {
        guard x >= 0, x < SceneRaster.side, y >= 0, y < SceneRaster.side else { return }
        ink[y * SceneRaster.side + x] = on
    }

    /// Draws a string-row bitmap; `mirror` flips it left to right.
    mutating func draw(_ rows: [String], x: Int, y: Int, mirror: Bool = false) {
        for (r, row) in rows.enumerated() {
            let chars = Array(row)
            let w = chars.count
            for (c, ch) in chars.enumerated() where ch == "X" {
                set(x + (mirror ? w - 1 - c : c), y + r)
            }
        }
    }

    /// Clears a rectangle (used to keep the HUD and bubbles legible over the scene).
    mutating func knockout(x: Int, y: Int, w: Int, h: Int) {
        guard w > 0, h > 0 else { return }
        for yy in y..<(y + h) {
            for xx in x..<(x + w) { set(xx, yy, false) }
        }
    }

    mutating func invert() {
        for i in 0..<ink.count { ink[i].toggle() }
        for i in 0..<shade.count { shade[i] = false }
    }

    var inkCount: Int { ink.reduce(0) { $0 + ($1 ? 1 : 0) } }
}

/// Offsets that turn an action into a pose, derived from the two existing sprite frames.
struct ScenePose: Equatable {
    /// Horizontal shift in cells, relative to the facing (positive is forward).
    var dxF = 0
    var dy = 0
    /// Use the second (blink / half-closed eyes) frame.
    var blink = false
    /// Mirror the sprite against its facing (dance).
    var flip = false

    static let hopTable = [0, -7, -9, -7, 0]
    static let danceTable = [0, -4, -6, -4]

    static func make(action: SceneAction, age: Int, lookUp: Bool) -> ScenePose {
        var p = ScenePose()
        let a = max(0, age)
        switch action {
        case .idle:
            break
        case .walk, .play:
            p.dy = (a / 2) % 2 == 0 ? 0 : -1
        case .look:
            if lookUp { p.dy = (a / 4) % 2 == 0 ? 0 : -1 }
        case .hop, .train:
            p.dy = hopTable[a % 5]
        case .sit, .droop:
            p.dy = 2
            p.blink = true
        case .sleep:
            p.dy = -2
            p.blink = true
        case .eat:
            p.blink = (a / 2) % 2 == 1
        case .poop:
            p.dy = a < 7 ? 2 : 0
            p.blink = a < 7
        case .dance:
            p.dy = danceTable[a % 4]
            p.flip = Int(Double(a) / 2.4) % 2 == 1
        case .shiver:
            p.dxF = a % 2 == 0 ? 0 : 1
        case .sweat:
            break
        case .sneeze:
            if a < 4 { p.dxF = -2 } else if a < 6 { p.dxF = 3 }
            p.blink = a >= 3 && a < 6
        case .stretch:
            p.blink = true
            p.dy = (a >= 2 && a < 6) ? -2 : 0
        case .react:
            p.dxF = a < 3 ? -2 : 0
            p.blink = a < 4
        case .greet:
            p.dy = hopTable[a % 5] / 2
        case .battle:
            if (a >= 10 && a <= 12) || (a >= 14 && a <= 16) || (a >= 18 && a <= 20) {
                p.dxF = a % 2 == 0 ? 2 : -2
            }
        }
        return p
    }
}

/// The room's clock-driven ambience: period of day and the weather, from the local time.
struct SceneAmbient: Equatable {
    enum Period: Equatable { case dawn, day, dusk, night }
    enum Weather: Equatable { case clear, cloudy, rain }

    var hour: Int
    var minute: Int
    var period: Period
    var weather: Weather

    var fractionalHour: Double { Double(hour) + Double(minute) / 60.0 }

    init(seed: UInt64, date: Date, calendar: Calendar) {
        let c = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        hour = c.hour ?? 12
        minute = c.minute ?? 0
        switch hour {
        case 5..<8: period = .dawn
        case 8..<18: period = .day
        case 18..<21: period = .dusk
        default: period = .night
        }
        let key = max(0, (c.year ?? 2000) * 372 + (c.month ?? 1) * 31 + (c.day ?? 1))
        let r = SceneRNG.hash(seed, UInt64(key), 77) % 10
        weather = r < 2 ? .rain : (r < 5 ? .cloudy : .clear)
    }
}

/// Where the pet's ink ended up on screen.
struct ScenePlacement {
    var rows: [String]
    var x: Int
    var top: Int
    var mirror: Bool
    var left: Int
    var right: Int
    var inkTop: Int
    var bottom: Int
    var centerX: Int { (left + right) / 2 }
}

struct SceneRenderOptions {
    /// False for still pictures: no blinking, no drift, frame zero of every animation.
    var animated = true
    var reducedMotion = false
    var calendar = Calendar.current
    /// Rows drawn in place of the pet sprite (the hatching crack frame).
    var spriteOverride: [String]?
}

enum SceneRenderer {
    /// The pet at rest in its room, for widgets: deterministic from the Pet and its `lastTick`.
    static func still(pet: Pet, calendar: Calendar = .current) -> SceneRaster {
        var options = SceneRenderOptions()
        options.animated = false
        options.calendar = calendar
        return render(pet: pet, state: SceneState.still(for: pet), date: pet.lastTick, options: options)
    }

    static func render(pet: Pet, state: SceneState, date: Date,
                       options: SceneRenderOptions = SceneRenderOptions()) -> SceneRaster {
        var r = SceneRaster()
        let t = date.timeIntervalSinceReferenceDate
        let motion = options.animated && !options.reducedMotion
        let frame = options.animated ? Int((t / 0.6).rounded(.down)) : 0
        let amb = SceneAmbient(seed: pet.seed, date: date, calendar: options.calendar)

        drawSky(&r, amb: amb, seed: pet.seed, t: t, frame: frame, motion: motion)
        drawGround(&r, seed: pet.seed, frame: frame, motion: motion)

        let place = placement(pet: pet, state: state, frame: frame, motion: motion,
                              override: options.spriteOverride)
        if pet.stage == .ghost || pet.stage == .egg {
            r.draw(place.rows, x: place.x, y: place.top, mirror: place.mirror)
            return r
        }

        if state.action == .sleep {
            r.draw(SceneGlyph.mat, x: place.centerX - 10, y: SceneRaster.footY - 1)
        }
        if let e = state.effect, e.kind == .food {
            drawFood(&r, e: e, state: state)
        }
        r.draw(place.rows, x: place.x, y: place.top, mirror: place.mirror)
        drawAccessories(&r, pet: pet, state: state, place: place, motion: motion)
        drawPoops(&r, pet: pet, state: state, frame: frame, motion: motion)
        if let e = state.effect {
            drawEffect(&r, e: e, pet: pet, state: state, place: place, frame: frame)
        }
        drawHeartPop(&r, state: state, place: place)
        drawHUD(&r, pet: pet, frame: frame, animated: options.animated)

        if let call = pet.call, !pet.asleep || call == .light {
            let visible = !motion || frame % 4 != 3
            if visible { drawBubble(&r, icon: bubbleIcon(for: call), place: place) }
        }

        if !pet.lightOn {
            for y in 20..<SceneRaster.groundY {
                for x in 0..<SceneRaster.side where (x + y) % 2 == 0 && !r.isSet(x, y) {
                    r.shade[y * SceneRaster.side + x] = true
                }
            }
            for y in 0..<20 {
                for x in 33..<SceneRaster.side where (x + y) % 2 == 0 && !r.isSet(x, y) {
                    r.shade[y * SceneRaster.side + x] = true
                }
            }
        }

        if motion && flashes(state: state) { r.invert() }
        return r
    }

    /// One-frame screen flashes: a sneeze and the start of a battle.
    private static func flashes(state: SceneState) -> Bool {
        if state.action == .sneeze && state.actionAge == 4 { return true }
        if let e = state.effect, e.kind == .foe {
            let age = state.tick - e.start
            return age >= 0 && age < 2
        }
        return false
    }

    // MARK: pet placement

    private static func inkExtent(_ rows: [String]) -> (c0: Int, c1: Int, r0: Int, r1: Int)? {
        var c0 = Int.max, c1 = -1, r0 = Int.max, r1 = -1
        for (r, row) in rows.enumerated() {
            for (c, ch) in row.enumerated() where ch == "X" {
                c0 = min(c0, c); c1 = max(c1, c); r0 = min(r0, r); r1 = max(r1, r)
            }
        }
        if c1 < 0 { return nil }
        return (c0: c0, c1: c1, r0: r0, r1: r1)
    }

    static func placement(pet: Pet, state: SceneState, frame: Int, motion: Bool,
                          override: [String]?) -> ScenePlacement {
        var rows: [String]
        var ix = Int(state.x.rounded())
        var dy = 0
        var mirror = state.facing < 0

        switch pet.stage {
        case .ghost:
            rows = Sprite.graveHi
            ix = 16
            mirror = false
        case .egg:
            rows = Sprite.eggHi
            ix = 16 + (motion ? [0, -1, 0, 1][frame & 3] : 0)
            mirror = false
        default:
            let pose = ScenePose.make(action: state.action, age: state.actionAge, lookUp: state.lookUp)
            var blink = pose.blink
            if motion && !blink && state.action != .eat {
                blink = ((state.tick &+ Int(pet.seed % 32)) & 31) < 2
            }
            rows = override ?? Sprite.sprite(for: pet, blink: blink)
            dy = pose.dy
            let base = ix
            ix += pose.dxF * state.facing
            // pose wiggles (squat, shiver, sneeze) must not push the ink into a poop
            if state.action != .sleep {
                let lim = Int(SceneState.limit(species: pet.species, poops: state.groundPoops(for: pet)))
                if ix > lim { ix = max(lim, base) }
            }
            mirror = (state.facing < 0) != pose.flip
        }

        let width = rows.first?.count ?? SceneState.spriteSize
        let e = inkExtent(rows) ?? (c0: 0, c1: width - 1, r0: 0, r1: rows.count - 1)
        let top = SceneRaster.footY - e.r1 + dy
        var c0 = e.c0, c1 = e.c1
        if mirror { c0 = width - 1 - e.c1; c1 = width - 1 - e.c0 }
        return ScenePlacement(rows: rows, x: ix, top: top, mirror: mirror,
                              left: ix + c0, right: ix + c1, inkTop: top + e.r0, bottom: top + e.r1)
    }

    // MARK: background

    private static func drawSky(_ r: inout SceneRaster, amb: SceneAmbient, seed: UInt64,
                                t: Double, frame: Int, motion: Bool) {
        let fh = amb.fractionalHour
        // The sun is 11x11 and the moon 9x9; positions are their centres.
        func sun(_ cx: Int, _ cy: Int) { r.draw(SceneGlyph.sun, x: cx - 5, y: cy - 5) }

        switch amb.period {
        case .dawn:
            let p = min(1, max(0, (fh - 5) / 3))
            sun(Int(5 + 12 * p), Int(52 - 7 * p))
            drawHaze(&r)
        case .day:
            let p = min(1, max(0, (fh - 8) / 10))
            sun(Int(5 + 54 * p), Int(52 - 28 * sin(Double.pi * p)))
        case .dusk:
            let p = min(1, max(0, (fh - 18) / 3))
            sun(Int(54 - 8 * p), Int(46 + 6 * p))
            drawHaze(&r)
        case .night:
            let shifted = fh >= 21 ? fh - 21 : fh + 3
            let p = min(1, max(0, shifted / 8))
            r.draw(SceneGlyph.moon, x: Int(8 + 48 * p) - 4, y: Int(50 - 26 * sin(Double.pi * p)) - 4)
            for i in 0..<12 {
                let h = SceneRNG.hash(seed, UInt64(i), 5)
                let sx = Int(h % 64)
                let sy = 21 + Int((h >> 8) % 28)
                if motion && (frame + i) % 3 == 0 { continue }
                if motion && (frame + i) % 4 == 1 {
                    r.draw(SceneGlyph.star3, x: sx - 1, y: sy - 1)
                } else {
                    r.set(sx, sy)
                }
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
        for i in 0..<clouds {
            let base = Int(SceneRNG.hash(seed, UInt64(i), 11) % UInt64(cycle))
            let cx = ((base + drift) % cycle + cycle) % cycle - 17
            r.draw(SceneGlyph.cloud, x: cx, y: rows[i])
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
                    r.draw(Int(t * 4) % 2 == 0 ? SceneGlyph.butterflyA : SceneGlyph.butterflyB, x: bx, y: by)
                }
            }
        }

        // Fine rain: two-pixel slanted streaks falling through the sky.
        if amb.weather == .rain {
            for i in 0..<26 {
                let h = SceneRNG.hash(seed, UInt64(i), 21)
                let col = Int(h % 64)
                let y0 = Int((h >> 16) % 36)
                let y = 20 + (motion ? (y0 + Int(t * 14)) % 36 : y0)
                r.set(col, y)
                if y + 1 < 56 { r.set(col - 1, y + 1) }
            }
        }
    }

    private static func drawHaze(_ r: inout SceneRaster) {
        for row in [50, 53] {
            for x in 0..<SceneRaster.side where (x + row) % 2 == 0 { r.set(x, row) }
        }
    }

    private static func drawGround(_ r: inout SceneRaster, seed: UInt64, frame: Int, motion: Bool) {
        let g = SceneRaster.groundY
        for x in 0..<SceneRaster.side {
            r.set(x, g); r.set(x, g + 1)
            if x % 2 == 0 { r.set(x, g + 2) } else { r.set(x, g + 3) }
            if x % 4 == 0 { r.set(x, g + 4) }
            if x % 4 == 2 { r.set(x, g + 5) }
        }
        // Dense two-height grass with pebbles and the odd tiny flower.
        for (i, base) in stride(from: 1, to: 62, by: 5).enumerated() {
            let h = SceneRNG.hash(seed, UInt64(i), 41)
            let x = min(60, max(0, base + Int(h % 3) - 1))
            let swayed = motion && (frame + i) % 2 == 1
            switch (h >> 8) % 8 {
            case 0, 1, 2:
                r.draw(swayed ? SceneGlyph.tuftTallB : SceneGlyph.tuftTallA, x: x, y: g - 4)
            case 3, 4:
                r.draw(swayed ? SceneGlyph.tuftShortB : SceneGlyph.tuftShortA, x: x, y: g - 2)
            case 6:
                r.draw(SceneGlyph.flower, x: x, y: g - 5)
            default:
                r.draw(SceneGlyph.pebble, x: x, y: g - 2)
            }
        }
    }

    // MARK: pet extras

    /// Top row of the poop glyphs: they stand on the ground, level with the pet's feet.
    private static let poopY = SceneRaster.footY - 6

    private static func drawPoops(_ r: inout SceneRaster, pet: Pet, state: SceneState,
                                  frame: Int, motion: Bool) {
        var shown = min(pet.poops, 3)
        var broomX: Double?
        if let e = state.effect, e.kind == .broom {
            shown = min(e.count, 3)
            broomX = broomLeft(age: state.tick - e.start)
        } else {
            shown = state.groundPoops(for: pet)   // the one being dropped is not down yet
        }
        guard shown > 0 else { return }
        for i in 0..<shown {
            let spot = SceneState.poopSpots[i]
            if let b = broomX, Double(spot) <= b + 4 { continue }
            let jiggle = (motion && (frame + i) % 2 == 0) ? 1 : 0
            r.draw(SceneGlyph.poop, x: spot + jiggle, y: poopY)
        }
    }

    /// Left edge of the 9x9 broom `age` ticks into its 1.2 s sweep across the 64 columns.
    private static func broomLeft(age: Int) -> Double { -9 + Double(age) * 7.2 }

    private static func drawFood(_ r: inout SceneRaster, e: SceneEffect, state: SceneState) {
        let age = max(0, state.tick - e.start)
        let fx = Int(e.x.rounded())
        if e.flag {
            if state.action == .eat {
                let y = SceneRaster.footY
                r.set(fx + 1, y - 1); r.set(fx + 5, y); r.set(fx + 3, y - 2); r.set(fx + 7, y - 1)
            }
            return
        }
        r.draw(SceneGlyph.food(e.food), x: fx, y: min(SceneRaster.footY - 8, 20 + age * 3))
    }

    private static func drawHeartPop(_ r: inout SceneRaster, state: SceneState, place: ScenePlacement) {
        let age = state.tick - state.heartPop
        guard age >= 0, age < 10 else { return }
        r.draw(SceneGlyph.heart5, x: place.centerX - 2, y: max(0, place.inkTop - 7 - age / 2))
    }

    private static func drawAccessories(_ r: inout SceneRaster, pet: Pet, state: SceneState,
                                        place p: ScenePlacement, motion: Bool) {
        let age = state.actionAge
        let dir = p.mirror ? -1 : 1
        let front = p.mirror ? p.left : p.right
        switch state.action {
        case .sleep:
            for k in 0..<2 {
                let a = motion ? ((state.tick + k * 10) % 20 + 20) % 20 : 4 + k * 8
                if a < 18 {
                    r.draw(SceneGlyph.z5, x: p.right - 3 + (a % 6 < 3 ? 0 : 2) + k * 3, y: p.inkTop - 6 - a / 2)
                }
            }
        case .sweat:
            r.draw(SceneGlyph.bead5, x: p.centerX - 2, y: p.inkTop - 7 + (age / 2) % 4)
            r.set(p.left - 2, p.inkTop + 6 + age % 2); r.set(p.left - 3, p.inkTop + 9 + age % 2)
            r.set(p.right + 2, p.inkTop + 6 + (age + 1) % 2); r.set(p.right + 3, p.inkTop + 9 + (age + 1) % 2)
        case .dance:
            r.draw(SceneGlyph.note, x: p.centerX - 3 + ((age / 3) % 2 == 0 ? -9 : 9), y: max(0, p.inkTop - 9))
        case .train:
            r.draw(SceneGlyph.dumbbell, x: p.centerX - 4, y: max(0, p.inkTop - 12))
            if age % 5 == 2 {
                r.set(p.left - 3, p.inkTop + 5); r.set(p.left - 5, p.inkTop + 3)
                r.set(p.right + 3, p.inkTop + 5); r.set(p.right + 5, p.inkTop + 3)
            }
        case .greet:
            let w = (age / 2) % 2 * 2
            r.set(front + dir * 3, p.inkTop + 6 + w); r.set(front + dir * 4, p.inkTop + 6 + w)
            r.set(front + dir * 5, p.inkTop + 4 + w); r.set(front + dir * 6, p.inkTop + 4 + w)
        case .react:
            if (age / 2) % 2 == 0 {
                r.draw(SceneGlyph.spark5, x: p.right - 2, y: max(0, p.inkTop - 6))
            } else {
                r.draw(SceneGlyph.spark5, x: p.left - 2, y: max(0, p.inkTop - 4))
            }
        case .battle:
            if (age >= 10 && age <= 12) || (age >= 14 && age <= 16) || (age >= 18 && age <= 20) {
                r.draw(SceneGlyph.spark, x: max(0, (p.right + 46) / 2 - 4), y: 44)
            }
        case .sneeze:
            if age >= 4 && age < 7 {
                r.set(front + dir * 3, p.inkTop + 8); r.set(front + dir * 5, p.inkTop + 9)
                r.set(front + dir * 4, p.inkTop + 11)
            }
        default:
            break
        }
    }

    private static func drawEffect(_ r: inout SceneRaster, e: SceneEffect, pet: Pet, state: SceneState,
                                   place p: ScenePlacement, frame: Int) {
        let age = state.tick - e.start
        guard age >= 0 else { return }
        switch e.kind {
        case .food:
            break   // drawn under the pet
        case .broom:
            let bx = Int(broomLeft(age: age))
            r.draw(SceneGlyph.broom, x: bx, y: SceneRaster.footY - 8)
            for k in 0..<4 {
                r.set(bx - 3 - k * 4, SceneRaster.footY - 7 + (k * 2 + age) % 5)
            }
        case .syringe:
            guard age < 12 else { return }
            let prog = min(1.0, Double(age) / 10.0)
            let startX = e.dir > 0 ? 64.0 : -9.0
            let endX = Double(e.dir > 0 ? p.right - 4 : p.left - 5)
            let sx = Int(startX + (endX - startX) * prog)
            let sy = max(0, p.inkTop + 8 + Int(-14.0 * sin(Double.pi * prog)))
            r.draw(SceneGlyph.syringe, x: sx, y: sy, mirror: e.dir < 0)
        case .foe:
            guard age < 26 else { return }
            var fx = max(46, 64 - age * 3)
            if age >= 22 { fx = 46 + (age - 22) * 3 }
            drawFoe(&r, seed: pet.seed, start: e.start, x: fx)
        case .ball:
            guard age < 26 else { return }
            let h = Int(14.0 * abs(sin(Double(age) * 0.9)))
            r.draw(SceneGlyph.ball, x: Int(SceneEffect.ballX(age: age)), y: SceneRaster.footY - 8 - h)
        case .puff:
            if e.flag {
                for j in 0..<3 {
                    let px = (age * 6 + j * 21) % 64
                    for k in 0..<5 { r.set(px + k, 26 + j * 6) }
                }
            } else {
                for j in 0..<4 where (age + j) % 2 == 0 {
                    r.draw(SceneGlyph.spark5, x: j * 16 + 3, y: 26 + ((age + j) % 3) * 3)
                }
            }
        case .shell:
            let y = min(SceneRaster.footY - 2, 44 + age)
            r.draw(SceneGlyph.shellLeft, x: p.centerX - 8 - age / 3, y: y)
            r.draw(SceneGlyph.shellRight, x: p.centerX + 3 + age / 3, y: y)
        }
    }

    /// The wild opponent: a random species' 16x16 sprite, facing left, ink only.
    private static func drawFoe(_ r: inout SceneRaster, seed: UInt64, start: Int, x: Int) {
        let all = Species.all
        guard !all.isEmpty else { return }
        let idx = Int(SceneRNG.hash(seed, SceneRNG.bits(start), 31) % UInt64(all.count))
        guard let frame = all[idx].frames.first else { return }
        r.draw(frame, x: x, y: SceneRaster.footY - 15, mirror: true)
    }

    // MARK: HUD and bubble

    private static func drawHUD(_ r: inout SceneRaster, pet: Pet, frame: Int, animated: Bool) {
        for i in 0..<Pet.maxHearts {
            r.knockout(x: 1 + 8 * i, y: 1, w: 7, h: 7)
            r.draw(i < pet.hunger ? SceneGlyph.heartFull : SceneGlyph.heartEmpty, x: 1 + 8 * i, y: 1)
            r.knockout(x: 1 + 8 * i, y: 10, w: 7, h: 7)
            r.draw(i < pet.happy ? SceneGlyph.smileFull : SceneGlyph.smileEmpty, x: 1 + 8 * i, y: 10)
        }
        // Status glyphs stack down the top-right corner (x 56..62).
        if pet.needsAttention && (!animated || frame % 2 == 0) {
            r.knockout(x: 56, y: 1, w: 7, h: 7)
            r.draw(SceneGlyph.alert, x: 56, y: 1)
        }
        if pet.sick {
            r.knockout(x: 56, y: 10, w: 7, h: 7)
            r.draw(SceneGlyph.skull, x: 56, y: 10)
        }
        if !pet.asleep {
            if pet.temp >= 2 {
                r.knockout(x: 56, y: 19, w: 7, h: 7)
                r.draw(SceneGlyph.drop, x: 56, y: 19)
            } else if pet.temp <= -2 {
                r.knockout(x: 56, y: 19, w: 7, h: 7)
                r.draw(SceneGlyph.flake, x: 56, y: 19)
            }
        }
    }

    static func bubbleIcon(for call: Call) -> [String] {
        switch call {
        case .hungry: return SceneGlyph.meat7
        case .bored: return SceneGlyph.ball7
        case .poop: return SceneGlyph.poop
        case .sick: return SceneGlyph.syringe7
        case .naughty: return SceneGlyph.alert
        case .light: return SceneGlyph.bulb
        case .hot: return SceneGlyph.drop
        case .cold: return SceneGlyph.flake
        }
    }

    /// A 13x9 bubble with a 7x7 icon, above the head or (when the head is high) beside it.
    private static func drawBubble(_ r: inout SceneRaster, icon: [String], place p: ScenePlacement) {
        var bx = p.centerX - 6
        var by = p.inkTop - 11
        let tailX: Int
        let tailY: Int
        if by >= 17 {
            bx = min(max(bx, 0), 51)
            tailX = min(max(p.centerX, bx + 3), bx + 9)
            tailY = by + 9
            r.knockout(x: bx, y: by, w: 13, h: 10)
        } else {
            let right = p.centerX < 32
            bx = min(max(right ? p.right + 4 : p.left - 16, 0), 51)
            by = min(max(20, p.inkTop), 48)
            tailX = right ? bx - 1 : bx + 13
            tailY = by + 4
            r.knockout(x: bx, y: by, w: 13, h: 9)
        }
        r.draw(SceneGlyph.bubble, x: bx, y: by)
        r.draw(icon, x: bx + 3, y: by + 1)
        r.set(tailX, tailY)
    }
}
