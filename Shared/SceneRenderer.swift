import Foundation

// Draws the 32x32 home scene into a plain pixel buffer. Foundation only, so the same code feeds
// the animated LCDScreen, the static widget picture and the unit tests. SwiftUI turns the
// buffer into paths (see LCDPainter.path).

/// A 32x32 one-bit picture. `ink` pixels are dark; `shade` pixels are the dim dither mask.
struct SceneRaster: Equatable {
    static let side = 32

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

    static let hopTable = [0, -3, -4, -3, 0]
    static let danceTable = [0, -2, -3, -2]

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
            p.dy = 1
            p.blink = true
        case .sleep:
            p.dy = -1
            p.blink = true
        case .eat:
            p.blink = (a / 2) % 2 == 1
        case .poop:
            p.dy = a < 7 ? 1 : 0
            p.blink = a < 7
        case .dance:
            p.dy = danceTable[a % 4]
            p.flip = Int(Double(a) / 2.4) % 2 == 1
        case .shiver:
            p.dxF = a % 2 == 0 ? 0 : 1
        case .sweat:
            break
        case .sneeze:
            if a < 4 { p.dxF = -1 } else if a < 6 { p.dxF = 2 }
            p.blink = a >= 3 && a < 6
        case .stretch:
            p.blink = true
            p.dy = (a >= 2 && a < 6) ? -1 : 0
        case .react:
            p.dxF = a < 3 ? -1 : 0
            p.blink = a < 4
        case .greet:
            p.dy = hopTable[a % 5] / 2
        case .battle:
            if (a >= 10 && a <= 12) || (a >= 14 && a <= 16) || (a >= 18 && a <= 20) {
                p.dxF = a % 2 == 0 ? 1 : -1
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
            r.draw(SceneGlyph.mat, x: place.centerX - 5, y: 26)
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
            for y in 11..<28 {
                for x in 0..<SceneRaster.side where (x + y) % 2 == 0 && !r.isSet(x, y) {
                    r.shade[y * SceneRaster.side + x] = true
                }
            }
            for y in 0..<11 {
                for x in 24..<SceneRaster.side where (x + y) % 2 == 0 && !r.isSet(x, y) {
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
        return c1 < 0 ? nil : (c0, c1, r0, r1)
    }

    static func placement(pet: Pet, state: SceneState, frame: Int, motion: Bool,
                          override: [String]?) -> ScenePlacement {
        var rows: [String]
        var ix = Int(state.x.rounded())
        var dy = 0
        var mirror = state.facing < 0

        switch pet.stage {
        case .ghost:
            rows = Sprite.grave
            ix = 8
            mirror = false
        case .egg:
            rows = Sprite.egg
            ix = 8 + (motion ? [0, -1, 0, 1][frame & 3] : 0)
            mirror = false
        default:
            let pose = ScenePose.make(action: state.action, age: state.actionAge, lookUp: state.lookUp)
            var blink = pose.blink
            if motion && !blink && state.action != .eat {
                blink = ((state.tick &+ Int(pet.seed % 32)) & 31) < 2
            }
            rows = override ?? Sprite.sprite(for: pet, blink: blink)
            dy = pose.dy
            ix += pose.dxF * state.facing
            mirror = (state.facing < 0) != pose.flip
        }

        let width = rows.first?.count ?? 16
        let e = inkExtent(rows) ?? (c0: 0, c1: width - 1, r0: 0, r1: rows.count - 1)
        let top = 27 - e.r1 + dy
        var c0 = e.c0, c1 = e.c1
        if mirror { c0 = width - 1 - e.c1; c1 = width - 1 - e.c0 }
        return ScenePlacement(rows: rows, x: ix, top: top, mirror: mirror,
                              left: ix + c0, right: ix + c1, inkTop: top + e.r0, bottom: top + e.r1)
    }

    // MARK: background

    private static func drawSky(_ r: inout SceneRaster, amb: SceneAmbient, seed: UInt64,
                                t: Double, frame: Int, motion: Bool) {
        let fh = amb.fractionalHour

        switch amb.period {
        case .dawn:
            let p = min(1, max(0, (fh - 5) / 3))
            r.draw(SceneGlyph.sun, x: Int(2 + 6 * p) - 2, y: Int(14 - 3 * p) - 2)
            drawHaze(&r)
        case .day:
            let p = min(1, max(0, (fh - 8) / 10))
            r.draw(SceneGlyph.sun, x: Int(3 + 22 * p) - 2, y: Int(11 - 8 * sin(Double.pi * p)) - 2)
        case .dusk:
            let p = min(1, max(0, (fh - 18) / 3))
            r.draw(SceneGlyph.sun, x: Int(26 - 4 * p) - 2, y: Int(10 + 4 * p) - 2)
            drawHaze(&r)
        case .night:
            let shifted = fh >= 21 ? fh - 21 : fh + 3
            let p = min(1, max(0, shifted / 8))
            r.draw(SceneGlyph.moon, x: Int(4 + 22 * p) - 2, y: Int(10 - 5 * sin(Double.pi * p)) - 2)
            for i in 0..<6 {
                let h = SceneRNG.hash(seed, UInt64(i), 5)
                let sx = Int(h % 32)
                let sy = 1 + Int((h >> 8) % 9)
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
        case .cloudy, .rain: clouds = 2
        }
        let drift = motion ? Int((t / 10).rounded(.down)) : 0
        let rows = [8, 3, 5]
        for i in 0..<clouds {
            let base = Int(SceneRNG.hash(seed, UInt64(i), 11) % 41)
            let cx = ((base + drift) % 41 + 41) % 41 - 9
            r.draw(SceneGlyph.cloud, x: cx, y: rows[i])
        }

        if amb.weather == .rain {
            for i in 0..<10 {
                let h = SceneRNG.hash(seed, UInt64(i), 21)
                let col = Int(h % 32)
                let y0 = Int((h >> 16) % 28)
                let y = motion ? (y0 + Int(t * 10)) % 28 : y0
                r.set(col, y)
                if y + 1 < 28 { r.set(col, y + 1) }
            }
        }
    }

    private static func drawHaze(_ r: inout SceneRaster) {
        for row in [11, 13] {
            for x in 0..<SceneRaster.side where (x + row) % 2 == 0 { r.set(x, row) }
        }
    }

    private static func drawGround(_ r: inout SceneRaster, seed: UInt64, frame: Int, motion: Bool) {
        for x in 0..<SceneRaster.side {
            r.set(x, 28); r.set(x, 29)
            if x % 2 == 0 { r.set(x, 30) } else { r.set(x, 31) }
        }
        let xs = [1, 7, 13, 20, 27]
        for (i, base) in xs.enumerated() {
            let jitter = Int(SceneRNG.hash(seed, UInt64(i), 41) % 3) - 1
            let x = min(29, max(0, base + jitter))
            if i % 3 == 2 {
                r.draw(SceneGlyph.pebble, x: x, y: 25)
            } else {
                let swayed = motion && (frame + i) % 2 == 1
                r.draw(swayed ? SceneGlyph.tuftB : SceneGlyph.tuftA, x: x, y: 25)
            }
        }
    }

    // MARK: pet extras

    private static func drawPoops(_ r: inout SceneRaster, pet: Pet, state: SceneState,
                                  frame: Int, motion: Bool) {
        var shown = min(pet.poops, 3)
        var broomX: Double?
        if let e = state.effect, e.kind == .broom {
            shown = min(e.count, 3)
            broomX = -5 + Double(state.tick - e.start) * 3.7
        } else if state.action == .poop && state.actionAge < 7 {
            shown = max(0, shown - 1)
        }
        guard shown > 0 else { return }
        for i in 0..<shown {
            let spot = SceneState.poopSpots[i]
            if let b = broomX, Double(spot) <= b { continue }
            let jiggle = (motion && (frame + i) % 2 == 0) ? 1 : 0
            r.draw(Sprite.poop, x: spot + jiggle, y: 23)
        }
    }

    private static func drawFood(_ r: inout SceneRaster, e: SceneEffect, state: SceneState) {
        let age = max(0, state.tick - e.start)
        let fx = Int(e.x.rounded())
        if e.flag {
            if state.action == .eat {
                r.set(fx, 26); r.set(fx + 3, 27); r.set(fx + 2, 25)
            }
            return
        }
        r.draw(SceneGlyph.food(e.food), x: fx, y: min(23, age * 2))
    }

    private static func drawHeartPop(_ r: inout SceneRaster, state: SceneState, place: ScenePlacement) {
        let age = state.tick - state.heartPop
        guard age >= 0, age < 10 else { return }
        r.draw(SceneGlyph.heart3, x: place.centerX - 1, y: max(0, place.inkTop - 4 - age / 3))
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
                    r.draw(SceneGlyph.z3, x: p.right - 2 + (a % 6 < 3 ? 0 : 1), y: p.inkTop - 3 - a / 3)
                }
            }
        case .sweat:
            r.draw(SceneGlyph.bead3, x: p.centerX - 1, y: p.inkTop - 4 + (age / 2) % 3)
            r.set(p.left - 1, p.inkTop + 3 + age % 2)
            r.set(p.right + 1, p.inkTop + 3 + (age + 1) % 2)
        case .dance:
            r.draw(Sprite.note, x: p.centerX - 2 + ((age / 3) % 2 == 0 ? -4 : 4), y: max(0, p.inkTop - 6))
        case .train:
            r.draw(SceneGlyph.dumbbell, x: p.centerX - 2, y: max(0, p.inkTop - 6))
            if age % 5 == 2 {
                r.set(p.left - 2, p.inkTop + 2); r.set(p.left - 3, p.inkTop + 1)
                r.set(p.right + 2, p.inkTop + 2); r.set(p.right + 3, p.inkTop + 1)
            }
        case .greet:
            let w = (age / 2) % 2
            r.set(front + dir * 2, p.inkTop + 2 + w)
            r.set(front + dir * 3, p.inkTop + 1 + w)
        case .react:
            if (age / 2) % 2 == 0 {
                r.draw(SceneGlyph.spark3, x: p.right - 1, y: max(0, p.inkTop - 3))
            } else {
                r.draw(SceneGlyph.spark3, x: p.left - 1, y: max(0, p.inkTop - 2))
            }
        case .battle:
            if (age >= 10 && age <= 12) || (age >= 14 && age <= 16) || (age >= 18 && age <= 20) {
                r.draw(SceneGlyph.spark, x: max(0, (p.right + 24) / 2 - 2), y: 16)
            }
        case .sneeze:
            if age >= 4 && age < 7 { r.set(front + dir * 2, p.inkTop + 4); r.set(front + dir * 3, p.inkTop + 5) }
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
            let bx = -5 + Int(Double(age) * 3.7)
            r.draw(SceneGlyph.broom, x: bx, y: 23)
            for k in 0..<3 {
                r.set(bx - 2 - k * 3, 24 + (k * 2 + age) % 3)
            }
        case .syringe:
            guard age < 12 else { return }
            let prog = min(1.0, Double(age) / 10.0)
            let startX = e.dir > 0 ? 31.0 : -4.0
            let endX = Double(e.dir > 0 ? p.right - 1 : p.left - 3)
            let sx = Int(startX + (endX - startX) * prog)
            let sy = max(0, p.inkTop + 4 + Int(-8.0 * sin(Double.pi * prog)))
            r.draw(SceneGlyph.syringe, x: sx, y: sy, mirror: e.dir < 0)
        case .foe:
            guard age < 26 else { return }
            var fx = max(24, 32 - age)
            if age >= 22 { fx = 24 + (age - 22) * 2 }
            drawFoe(&r, seed: pet.seed, start: e.start, x: fx)
        case .ball:
            guard age < 26 else { return }
            let h = Int(6.0 * abs(sin(Double(age) * 0.9)))
            r.draw(SceneGlyph.ball, x: Int(SceneEffect.ballX(age: age)), y: 22 - h)
        case .puff:
            if e.flag {
                for j in 0..<3 {
                    let px = (age * 3 + j * 9) % 32
                    r.set(px, 12 + j * 3); r.set(px + 1, 12 + j * 3); r.set(px + 2, 12 + j * 3)
                }
            } else {
                for j in 0..<4 where (age + j) % 2 == 0 {
                    r.draw(SceneGlyph.spark3, x: j * 8 + 2, y: 12 + ((age + j) % 3) * 2)
                }
            }
        case .shell:
            let y = min(26, 18 + age)
            r.draw(SceneGlyph.shellLeft, x: p.centerX - 4 - age / 4, y: y)
            r.draw(SceneGlyph.shellRight, x: p.centerX + 2 + age / 4, y: y)
        }
    }

    /// The wild opponent: a species sprite halved to 8x8 and facing left, ink only.
    private static func drawFoe(_ r: inout SceneRaster, seed: UInt64, start: Int, x: Int) {
        let all = Species.all
        guard !all.isEmpty else { return }
        let idx = Int(SceneRNG.hash(seed, SceneRNG.bits(start), 31) % UInt64(all.count))
        guard let frame = all[idx].frames.first else { return }
        let rows = frame.map { Array($0) }
        guard rows.count >= 16 else { return }
        for br in 0..<8 {
            for bc in 0..<8 {
                var on = false
                for dr in 0..<2 {
                    for dc in 0..<2 {
                        let row = rows[br * 2 + dr]
                        if br * 2 + dr < rows.count, bc * 2 + dc < row.count, row[bc * 2 + dc] == "X" { on = true }
                    }
                }
                if on { r.set(x + (7 - bc), 20 + br) }
            }
        }
    }

    // MARK: HUD and bubble

    private static func drawHUD(_ r: inout SceneRaster, pet: Pet, frame: Int, animated: Bool) {
        for i in 0..<Pet.maxHearts {
            r.knockout(x: 1 + 6 * i, y: 0, w: 5, h: 5)
            r.draw(i < pet.hunger ? Sprite.heartFull : Sprite.heartEmpty, x: 1 + 6 * i, y: 0)
            r.knockout(x: 1 + 6 * i, y: 6, w: 5, h: 5)
            r.draw(i < pet.happy ? Sprite.smileFull : Sprite.smileEmpty, x: 1 + 6 * i, y: 6)
        }
        if pet.needsAttention && (!animated || frame % 2 == 0) {
            r.knockout(x: 26, y: 0, w: 5, h: 5)
            r.draw(Sprite.alert, x: 26, y: 0)
        }
        if pet.sick {
            r.knockout(x: 26, y: 6, w: 5, h: 5)
            r.draw(Sprite.skull, x: 26, y: 6)
        }
        if !pet.asleep {
            if pet.temp >= 2 {
                r.knockout(x: 26, y: 12, w: 5, h: 5)
                r.draw(Sprite.drop, x: 26, y: 12)
            } else if pet.temp <= -2 {
                r.knockout(x: 26, y: 12, w: 5, h: 5)
                r.draw(Sprite.flake, x: 26, y: 12)
            }
        }
    }

    static func bubbleIcon(for call: Call) -> [String] {
        switch call {
        case .hungry: return SceneGlyph.meat
        case .bored: return SceneGlyph.ball
        case .poop: return Sprite.poop
        case .sick: return SceneGlyph.syringe
        case .naughty: return Sprite.alert
        case .light: return SceneGlyph.bulb
        case .hot: return Sprite.drop
        case .cold: return Sprite.flake
        }
    }

    /// A 9x7 bubble with a 5x5 icon, above the head or (when the head is high) beside it.
    private static func drawBubble(_ r: inout SceneRaster, icon: [String], place p: ScenePlacement) {
        var bx = p.centerX - 4
        var by = p.inkTop - 9
        let tailX: Int
        let tailY: Int
        if by >= 11 {
            bx = min(max(bx, 0), 23)
            tailX = min(max(p.centerX, bx + 2), bx + 6)
            tailY = by + 7
            r.knockout(x: bx, y: by, w: 9, h: 8)
        } else {
            let right = p.centerX < 16
            bx = min(max(right ? p.right + 2 : p.left - 10, 0), 23)
            by = min(max(11, p.inkTop), 21)
            tailX = right ? bx - 1 : bx + 9
            tailY = by + 3
            r.knockout(x: bx, y: by, w: 9, h: 7)
        }
        r.draw(SceneGlyph.bubble, x: bx, y: by)
        r.draw(icon, x: bx + 2, y: by + 1)
        r.set(tailX, tailY)
    }
}
