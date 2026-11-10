import Foundation

// Draws the 64x64 home scene into a plain pixel buffer. Foundation only, so the same code feeds
// the animated LCDScreen, the static widget picture and the unit tests. SwiftUI turns the
// buffer into paths (see LCDPainter.path).

/// What a lit pixel of the scene is made of. 0 is "unlit". Traditional mode renders every non-zero
/// code as ink; Technicolor maps each code to a palette color (see `ScenePalette`). The numbering
/// matches `Layer` in expo-prototype/src/ui/layers.ts.
enum SceneLayer: UInt8, CaseIterable {
    case off = 0
    /// default dark ink: outlines, HUD frames, text, icons, anything not listed
    case ink = 1
    case body = 2
    case outline = 3
    case sun = 4
    case moon = 5
    case star = 6
    case cloud = 7
    case rain = 8
    case grass = 9
    case ground = 10
    case dirt = 11
    case flowerA = 12
    case flowerB = 13
    case heart = 14
    case smile = 15
    case poop = 16
    case foodMeat = 17
    case foodVeg = 18
    case foodPasta = 19
    case snack = 20
    case tool = 21
    case spark = 22
    case bubble = 23
    case waterDrop = 24
    case snow = 25
    case mat = 26
    case butterfly = 27
    case alert = 28
    /// soft top-left highlight on the pet body
    case bodyLight = 29
    /// the play ball (its own tone; tools stay wooden)
    case ball = 30

    // MARK: pet shading (Technicolor tones; Traditional prints all of them as ink, see PetShading.swift)

    /// shadow side of the body (bottom-right, cool)
    case shade = 31
    /// deep underside shadow
    case deep = 32
    /// lighter belly / chest
    case belly = 33
    /// accent tip: analogous hue
    case accent = 34
    /// accent tip: dark (socks, ear tips)
    case accentDark = 35
    /// accent tip: cream (paws, tail tip, horns)
    case accentLight = 36
    /// outline on the lit (top-left) side: rim light
    case rim = 37
    /// dark ring of an eye hole
    case eye = 38
    /// tiny specular glint / sheen
    case glint = 39

    // Codes 40...86 are reserved for the biome cues and scenery (Expo `Layer.WAVE`...`LEAF_BIG`); a later
    // change adds them here with the same numbers. Until then their table entries are plain ink.

    // MARK: pet eyes (Technicolor only, like scenery: Traditional leaves the unlit eye hole unlit)

    /// opaque pupil that fills a see-through eye hole
    case eyeFill = 87
    /// catch-light in the pupil
    case eyeShine = 88

    /// First biome-scenery code. Codes from here up are Technicolor-only: Traditional draws them unlit
    /// (the biome cue codes 40...42 are below it and print as ink, like the Expo `SCENERY_FROM`).
    static let sceneryFrom: UInt8 = 43

    /// Highest code in use; color tables have `maxCode + 1` entries.
    static let maxCode: UInt8 = 88

    /// Does Traditional mode draw this code? (Every shared layer, the pet shading layers and the cues: yes, as
    /// ink. Scenery and the eye fills: no, they print as unlit.) Mirrors `tradVisible` in layers.ts.
    static func isTraditionalLit(_ code: UInt8) -> Bool { code != 0 && code < sceneryFrom }

    /// Codes a pet sprite can carry (the scenery must never overwrite these).
    var isPetLayer: Bool {
        switch self {
        case .outline, .body, .bodyLight, .shade, .deep, .belly, .accent, .accentDark, .accentLight,
             .rim, .eye, .glint, .eyeFill, .eyeShine: return true
        default: return false
        }
    }

    /// Splits a sprite into pet layers, one entry per cell: `outline` is a lit pixel with an unlit
    /// 4-neighbour (or on the grid edge), `bodyLight` an interior pixel whose upper or left neighbour
    /// is outline, otherwise `body`. Unlit cells stay `off`.
    static func petLayers(_ rows: [String]) -> [[SceneLayer]] {
        let grid = rows.map { Array($0) }
        let h = grid.count
        func on(_ x: Int, _ y: Int) -> Bool {
            y >= 0 && y < h && x >= 0 && x < grid[y].count && grid[y][x] == "X"
        }
        func outline(_ x: Int, _ y: Int) -> Bool {
            on(x, y) && !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1))
        }
        return (0..<h).map { y -> [SceneLayer] in
            (0..<grid[y].count).map { x -> SceneLayer in
                guard on(x, y) else { return SceneLayer.off }
                if outline(x, y) { return SceneLayer.outline }
                return (outline(x, y - 1) || outline(x - 1, y)) ? SceneLayer.bodyLight : SceneLayer.body
            }
        }
    }
}

/// A 64x64 picture of layer codes plus the dim dither mask. Everything that is not `.off` is lit.
struct SceneRaster: Equatable {
    static let side = 64
    /// Row of the ground line (two rows thick); the pet's feet rest on the row above it.
    static let groundY = 58
    /// Bottom row of a standing sprite.
    static let footY = 57

    /// Layer code per cell, row by row (`SceneLayer.rawValue`).
    var cells = [UInt8](repeating: 0, count: SceneRaster.side * SceneRaster.side)
    var shade = [Bool](repeating: false, count: SceneRaster.side * SceneRaster.side)

    // Context for coloring (Technicolor): set by `SceneRenderer.render`.
    /// The picture is a room with sky (above `groundY`) and soil (below), not a text screen.
    var hasSky = false
    var hour = 12
    var weather: SceneAmbient.Weather = .clear
    var line: PetLine = .baby
    /// Family body color ("#RRGGBB") that overrides `line` in Technicolor; nil for dinos, eggs and ghosts.
    var bodyHex: String?
    /// Lights off: the sky is darkened and `shade` marks the dither.
    var dim = false

    /// Lit cells in Traditional (any layer it draws), the one-bit picture of old. Technicolor-only codes
    /// (eye fills, scenery) are unlit here.
    var ink: [Bool] { cells.map { SceneLayer.isTraditionalLit($0) } }

    func isSet(_ x: Int, _ y: Int) -> Bool {
        guard x >= 0, x < SceneRaster.side, y >= 0, y < SceneRaster.side else { return false }
        return SceneLayer.isTraditionalLit(cells[y * SceneRaster.side + x])
    }

    func layer(_ x: Int, _ y: Int) -> SceneLayer {
        guard x >= 0, x < SceneRaster.side, y >= 0, y < SceneRaster.side else { return .off }
        return SceneLayer(rawValue: cells[y * SceneRaster.side + x]) ?? .ink
    }

    mutating func set(_ x: Int, _ y: Int, _ layer: SceneLayer = .ink) {
        guard x >= 0, x < SceneRaster.side, y >= 0, y < SceneRaster.side else { return }
        cells[y * SceneRaster.side + x] = layer.rawValue
    }

    mutating func clear(_ x: Int, _ y: Int) { set(x, y, .off) }

    /// Draws a string-row bitmap in one layer; `mirror` flips it left to right.
    mutating func draw(_ rows: [String], x: Int, y: Int, mirror: Bool = false, layer: SceneLayer = .ink) {
        for (r, row) in rows.enumerated() {
            let chars = Array(row)
            let w = chars.count
            for (c, ch) in chars.enumerated() where ch == "X" {
                set(x + (mirror ? w - 1 - c : c), y + r, layer)
            }
        }
    }

    /// Draws a pet sprite with procedural shading (PetShading: highlight, shade, belly, accents, rim, eyes),
    /// after mirroring, so the light stays on the upper-left of what is seen. The lit pixel set is exactly the
    /// sprite's. Eye fills (Technicolor-only codes) go only on cells that are not already lit in Traditional,
    /// so Traditional output is unchanged. `family` picks the per-family rules.
    mutating func drawPet(_ rows: [String], x: Int, y: Int, mirror: Bool = false, family: String = "") {
        let shown = mirror ? rows.map { String($0.reversed()) } : rows
        let shaded = PetShading.layers(rows: shown, family: family)
        for r in 0..<shaded.height {
            for c in 0..<shaded.width {
                let code = shaded.codes[r * shaded.width + c]
                if code == 0 { continue }
                let px = x + c, py = y + r
                if code == SceneLayer.eyeFill.rawValue || code == SceneLayer.eyeShine.rawValue {
                    guard px >= 0, px < SceneRaster.side, py >= 0, py < SceneRaster.side else { continue }
                    if SceneLayer.isTraditionalLit(cells[py * SceneRaster.side + px]) { continue }
                    cells[py * SceneRaster.side + px] = code
                } else {
                    guard px >= 0, px < SceneRaster.side, py >= 0, py < SceneRaster.side else { continue }
                    cells[py * SceneRaster.side + px] = code
                }
            }
        }
    }

    /// Clears a rectangle (used to keep the HUD and bubbles legible over the scene).
    mutating func knockout(x: Int, y: Int, w: Int, h: Int) {
        guard w > 0, h > 0 else { return }
        for yy in y..<(y + h) {
            for xx in x..<(x + w) { clear(xx, yy) }
        }
    }

    mutating func invert() {
        for i in 0..<cells.count { cells[i] = SceneLayer.isTraditionalLit(cells[i]) ? 0 : SceneLayer.ink.rawValue }
        for i in 0..<shade.count { shade[i] = false }
    }

    var inkCount: Int { cells.reduce(0) { $0 + (SceneLayer.isTraditionalLit($1) ? 1 : 0) } }
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
    enum Period: Equatable {
        case dawn, day, dusk, night

        static func of(hour: Int) -> Period {
            switch hour {
            case 5..<8: return .dawn
            case 8..<18: return .day
            case 18..<21: return .dusk
            default: return .night
            }
        }
    }
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
        period = Period.of(hour: hour)
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

        r.hasSky = true
        r.hour = amb.hour
        r.weather = amb.weather
        r.line = lineOf(pet)
        r.bodyHex = bodyHexOf(pet)

        let place = placement(pet: pet, state: state, frame: frame, motion: motion,
                              override: options.spriteOverride)
        let bubble = bubbleLayout(pet: pet, place: place)

        drawSky(&r, amb: amb, seed: pet.seed, t: t, frame: frame, motion: motion, avoid: bubble?.avoidRect)
        drawGround(&r, seed: pet.seed, frame: frame, motion: motion)

        if pet.stage == .ghost || pet.stage == .egg {
            r.drawPet(place.rows, x: place.x, y: place.top, mirror: place.mirror, family: "")
            return r
        }

        if state.action == .sleep {
            r.draw(SceneGlyph.mat, x: place.centerX - 10, y: SceneRaster.footY - 1, layer: .mat)
        }
        if let e = state.effect, e.kind == .food {
            drawFood(&r, e: e, state: state)
        }
        r.drawPet(place.rows, x: place.x, y: place.top, mirror: place.mirror,
                  family: Species.named(pet.species)?.family ?? "")
        drawAccessories(&r, pet: pet, state: state, place: place, motion: motion)
        drawPoops(&r, pet: pet, state: state, frame: frame, motion: motion)
        if let e = state.effect {
            drawEffect(&r, e: e, pet: pet, state: state, place: place, frame: frame)
        }
        drawHeartPop(&r, state: state, place: place)
        drawHUD(&r, pet: pet, frame: frame, animated: options.animated)

        if let call = pet.call, let layout = bubble {
            let visible = !motion || frame % 4 != 3
            if visible {
                drawBubble(&r, icon: bubbleIcon(for: call), layer: bubbleLayer(for: call), layout: layout)
            }
        }

        if !pet.lightOn {
            r.dim = true
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

    /// Lineage of the pet's species: tints its body in Technicolor. An egg is eggshell cream, a grave stormy gray.
    static func lineOf(_ pet: Pet) -> PetLine {
        switch pet.stage {
        case .egg: return .baby
        case .ghost: return .neglect
        default:
            guard let sp = Species.named(pet.species) else { return .baby }
            if let known = PetLine(rawValue: sp.line) { return known }
            // A line only its family knows (raptor, reef...): the family's `bodyHex` sets the color;
            // this only picks the dark-appearance blend, which is stronger for hatchlings.
            return sp.stage == .baby ? .baby : .meat
        }
    }

    /// Family body color of the pet's species (nil for eggs, ghosts and families without their own palette).
    static func bodyHexOf(_ pet: Pet) -> String? {
        switch pet.stage {
        case .egg, .ghost: return nil
        default: return Species.named(pet.species)?.bodyHex
        }
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

    /// A pixel rectangle clouds keep out of (the thought bubble and a margin around it).
    struct AvoidRect: Equatable {
        var minX: Int
        var minY: Int
        var maxX: Int
        var maxY: Int

        func intersects(x: Int, y: Int, w: Int, h: Int) -> Bool {
            x < maxX && x + w > minX && y < maxY && y + h > minY
        }
    }

    private static func drawSky(_ r: inout SceneRaster, amb: SceneAmbient, seed: UInt64,
                                t: Double, frame: Int, motion: Bool, avoid: AvoidRect? = nil) {
        let fh = amb.fractionalHour
        // The sun is 11x11 and the moon 9x9; positions are their centres.
        func sun(_ cx: Int, _ cy: Int) { r.draw(SceneGlyph.sun, x: cx - 5, y: cy - 5, layer: .sun) }

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
            r.draw(SceneGlyph.moon, x: Int(8 + 48 * p) - 4, y: Int(50 - 26 * sin(Double.pi * p)) - 4, layer: .moon)
            for i in 0..<12 {
                let h = SceneRNG.hash(seed, UInt64(i), 5)
                let sx = Int(h % 64)
                let sy = 21 + Int((h >> 8) % 28)
                if motion && (frame + i) % 3 == 0 { continue }
                if motion && (frame + i) % 4 == 1 {
                    r.draw(SceneGlyph.star3, x: sx - 1, y: sy - 1, layer: .star)
                } else {
                    r.set(sx, sy, .star)
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
        let cloudW = SceneGlyph.cloud[0].count
        let cloudH = SceneGlyph.cloud.count
        for i in 0..<clouds {
            let base = Int(SceneRNG.hash(seed, UInt64(i), 11) % UInt64(cycle))
            var cx = ((base + drift) % cycle + cycle) % cycle - 17
            // A cloud never sits behind the thought bubble: it slides to whichever side is nearer
            // (and still on screen).
            if let a = avoid, a.intersects(x: cx, y: rows[i], w: cloudW, h: cloudH) {
                let left = a.minX - cloudW
                let right = a.maxX
                var pick = abs(cx - left) <= abs(cx - right) ? left : right
                if pick + cloudW <= 0 { pick = right } else if pick >= SceneRaster.side { pick = left }
                cx = pick
            }
            r.draw(SceneGlyph.cloud, x: cx, y: rows[i], layer: .cloud)
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
                    r.draw(Int(t * 4) % 2 == 0 ? SceneGlyph.butterflyA : SceneGlyph.butterflyB,
                           x: bx, y: by, layer: .butterfly)
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
                r.set(col, y, .rain)
                if y + 1 < 56 { r.set(col - 1, y + 1, .rain) }
            }
        }
    }

    private static func drawHaze(_ r: inout SceneRaster) {
        for row in [50, 53] {
            for x in 0..<SceneRaster.side where (x + row) % 2 == 0 { r.set(x, row, .cloud) }
        }
    }

    private static func drawGround(_ r: inout SceneRaster, seed: UInt64, frame: Int, motion: Bool) {
        let g = SceneRaster.groundY
        for x in 0..<SceneRaster.side {
            r.set(x, g, .ground); r.set(x, g + 1, .ground)
            if x % 2 == 0 { r.set(x, g + 2, .dirt) } else { r.set(x, g + 3, .dirt) }
            if x % 4 == 0 { r.set(x, g + 4, .dirt) }
            if x % 4 == 2 { r.set(x, g + 5, .dirt) }
        }
        // Dense two-height grass with pebbles and the odd tiny flower.
        for (i, base) in stride(from: 1, to: 62, by: 5).enumerated() {
            let h = SceneRNG.hash(seed, UInt64(i), 41)
            let x = min(60, max(0, base + Int(h % 3) - 1))
            let swayed = motion && (frame + i) % 2 == 1
            switch (h >> 8) % 8 {
            case 0, 1, 2:
                r.draw(swayed ? SceneGlyph.tuftTallB : SceneGlyph.tuftTallA, x: x, y: g - 4, layer: .grass)
            case 3, 4:
                r.draw(swayed ? SceneGlyph.tuftShortB : SceneGlyph.tuftShortA, x: x, y: g - 2, layer: .grass)
            case 6:
                // colored head (top three rows), green stem
                let head = Array(SceneGlyph.flower.prefix(3))
                let stem = Array(SceneGlyph.flower.dropFirst(3))
                r.draw(head, x: x, y: g - 5, layer: i % 2 == 0 ? .flowerA : .flowerB)
                r.draw(stem, x: x, y: g - 2, layer: .grass)
            default:
                r.draw(SceneGlyph.pebble, x: x, y: g - 2, layer: .dirt)
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
            // The jiggle goes left: the right-most poop stands at the edge of the screen.
            let jiggle = (motion && (frame + i) % 2 == 0) ? 1 : 0
            r.draw(SceneGlyph.poop, x: spot - jiggle, y: poopY, layer: .poop)
        }
    }

    /// Left edge of the 9x9 broom `age` ticks into its 1.2 s sweep across the 64 columns.
    private static func broomLeft(age: Int) -> Double { -9 + Double(age) * 7.2 }

    private static func foodLayer(_ food: Food?) -> SceneLayer {
        switch food {
        case .some(.meat): return .foodMeat
        case .some(.veggie): return .foodVeg
        case .some(.pasta): return .foodPasta
        case .none: return .snack
        }
    }

    private static func drawFood(_ r: inout SceneRaster, e: SceneEffect, state: SceneState) {
        let age = max(0, state.tick - e.start)
        let fx = Int(e.x.rounded())
        let layer = foodLayer(e.food)
        if e.flag {
            if state.action == .eat {
                let y = SceneRaster.footY
                r.set(fx + 1, y - 1, layer); r.set(fx + 5, y, layer)
                r.set(fx + 3, y - 2, layer); r.set(fx + 7, y - 1, layer)
            }
            return
        }
        r.draw(SceneGlyph.food(e.food), x: fx, y: min(SceneRaster.footY - 8, 20 + age * 3), layer: layer)
    }

    private static func drawHeartPop(_ r: inout SceneRaster, state: SceneState, place: ScenePlacement) {
        let age = state.tick - state.heartPop
        guard age >= 0, age < 10 else { return }
        r.draw(SceneGlyph.heart5, x: place.centerX - 2, y: max(0, place.inkTop - 7 - age / 2), layer: .spark)
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
            r.draw(SceneGlyph.bead5, x: p.centerX - 2, y: p.inkTop - 7 + (age / 2) % 4, layer: .waterDrop)
            r.set(p.left - 2, p.inkTop + 6 + age % 2, .waterDrop)
            r.set(p.left - 3, p.inkTop + 9 + age % 2, .waterDrop)
            r.set(p.right + 2, p.inkTop + 6 + (age + 1) % 2, .waterDrop)
            r.set(p.right + 3, p.inkTop + 9 + (age + 1) % 2, .waterDrop)
        case .dance:
            r.draw(SceneGlyph.note, x: p.centerX - 3 + ((age / 3) % 2 == 0 ? -9 : 9), y: max(0, p.inkTop - 9),
                   layer: .spark)
        case .train:
            r.draw(SceneGlyph.dumbbell, x: p.centerX - 4, y: max(0, p.inkTop - 12), layer: .tool)
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
                r.draw(SceneGlyph.spark5, x: p.right - 2, y: max(0, p.inkTop - 6), layer: .spark)
            } else {
                r.draw(SceneGlyph.spark5, x: p.left - 2, y: max(0, p.inkTop - 4), layer: .spark)
            }
        case .battle:
            if (age >= 10 && age <= 12) || (age >= 14 && age <= 16) || (age >= 18 && age <= 20) {
                r.draw(SceneGlyph.spark, x: max(0, (p.right + 46) / 2 - 4), y: 44, layer: .spark)
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
            r.draw(SceneGlyph.broom, x: bx, y: SceneRaster.footY - 8, layer: .tool)
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
            r.draw(SceneGlyph.syringe, x: sx, y: sy, mirror: e.dir < 0, layer: .tool)
        case .foe:
            guard age < 26 else { return }
            var fx = max(46, 64 - age * 3)
            if age >= 22 { fx = 46 + (age - 22) * 3 }
            drawFoe(&r, seed: pet.seed, start: e.start, x: fx)
        case .ball:
            guard age < 26 else { return }
            let h = Int(14.0 * abs(sin(Double(age) * 0.9)))
            r.draw(SceneGlyph.ball, x: Int(SceneEffect.ballX(age: age)), y: SceneRaster.footY - 8 - h, layer: .ball)
        case .puff:
            if e.flag {
                for j in 0..<3 {
                    let px = (age * 6 + j * 21) % 64
                    for k in 0..<5 { r.set(px + k, 26 + j * 6, .cloud) }
                }
            } else {
                for j in 0..<4 where (age + j) % 2 == 0 {
                    r.draw(SceneGlyph.spark5, x: j * 16 + 3, y: 26 + ((age + j) % 3) * 3, layer: .spark)
                }
            }
        case .shell:
            let y = min(SceneRaster.footY - 2, 44 + age)
            r.draw(SceneGlyph.shellLeft, x: p.centerX - 8 - age / 3, y: y, layer: .cloud)
            r.draw(SceneGlyph.shellRight, x: p.centerX + 3 + age / 3, y: y, layer: .cloud)
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
            r.draw(i < pet.hunger ? SceneGlyph.heartFull : SceneGlyph.heartEmpty, x: 1 + 8 * i, y: 1, layer: .heart)
            r.knockout(x: 1 + 8 * i, y: 10, w: 7, h: 7)
            r.draw(i < pet.happy ? SceneGlyph.smileFull : SceneGlyph.smileEmpty, x: 1 + 8 * i, y: 10, layer: .smile)
        }
        // Status glyphs stack down the top-right corner (x 56..62).
        if pet.needsAttention && (!animated || frame % 2 == 0) {
            r.knockout(x: 56, y: 1, w: 7, h: 7)
            r.draw(SceneGlyph.alert, x: 56, y: 1, layer: .alert)
        }
        if pet.sick {
            r.knockout(x: 56, y: 10, w: 7, h: 7)
            r.draw(SceneGlyph.skull, x: 56, y: 10)
        }
        if !pet.asleep {
            if pet.temp >= 2 {
                r.knockout(x: 56, y: 19, w: 7, h: 7)
                r.draw(SceneGlyph.drop, x: 56, y: 19, layer: .waterDrop)
            } else if pet.temp <= -2 {
                r.knockout(x: 56, y: 19, w: 7, h: 7)
                r.draw(SceneGlyph.flake, x: 56, y: 19, layer: .snow)
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

    /// The layer a bubble icon is drawn in (its own tone in Technicolor).
    static func bubbleLayer(for call: Call) -> SceneLayer {
        switch call {
        case .hungry: return .foodMeat
        case .bored: return .ball
        case .poop: return .poop
        case .sick: return .tool
        case .naughty: return .alert
        case .light: return .spark
        case .hot: return .waterDrop
        case .cold: return .snow
        }
    }

    /// Where the 13x9 thought bubble goes: above the head or (when the head is high) beside it.
    struct BubbleLayout: Equatable {
        var x: Int
        var y: Int
        var tailX: Int
        var tailY: Int
        /// Rows cleared behind the bubble (10 above the head, 9 beside it).
        var clearH: Int

        /// The bubble plus a two pixel margin, which clouds keep out of.
        var avoidRect: AvoidRect {
            AvoidRect(minX: x - 2, minY: y - 2, maxX: x + 15, maxY: y + clearH + 2)
        }
    }

    /// nil when the pet shows no bubble (no call, asleep without the light call, egg or grave).
    static func bubbleLayout(pet: Pet, place p: ScenePlacement) -> BubbleLayout? {
        guard pet.stage != .ghost, pet.stage != .egg, let call = pet.call,
              !pet.asleep || call == .light else { return nil }
        var bx = p.centerX - 6
        var by = p.inkTop - 11
        if by >= 17 {
            bx = min(max(bx, 0), 51)
            let tailX = min(max(p.centerX, bx + 3), bx + 9)
            return BubbleLayout(x: bx, y: by, tailX: tailX, tailY: by + 9, clearH: 10)
        }
        let right = p.centerX < 32
        bx = min(max(right ? p.right + 4 : p.left - 16, 0), 51)
        by = min(max(20, p.inkTop), 48)
        return BubbleLayout(x: bx, y: by, tailX: right ? bx - 1 : bx + 13, tailY: by + 4, clearH: 9)
    }

    private static func drawBubble(_ r: inout SceneRaster, icon: [String], layer: SceneLayer, layout l: BubbleLayout) {
        r.knockout(x: l.x, y: l.y, w: 13, h: l.clearH)
        r.draw(SceneGlyph.bubble, x: l.x, y: l.y, layer: .bubble)
        r.draw(icon, x: l.x + 3, y: l.y + 1, layer: layer)
        r.set(l.tailX, l.tailY, .bubble)
    }
}
