import Foundation

// DASH (timing, 40 s): the pet runs, hops, swims or flies along a scrolling course of the family's obstacles. One input (A, B or a tap) jumps.
// The course speeds up from the first step to the last. Score = distance + bonus items floating over the obstacles + near misses + streaks.
// A hit stuns the pet: the world slows, the streak breaks and a few points are lost, but nobody is eliminated.
// Same rules and numbers as expo-prototype/src/core/minigames/games/dash.ts (the constants are generated).
//
// Fair play: the course is a function of the seed and of the pet's body type and stage only (sickness and weight lower the jump, never the
// course). Every obstacle, or pair that one jump has to cover, is generated against the HEALTHY jump arc of the same body type and stage.

struct DashObstacle: Equatable {
    var id: Int
    /// Left edge of the 7-wide glyph, screen px (moves left).
    var x: Double
    /// Index into theme.obstacles: 0 low, 1 tall, 2 spiky.
    var kind: Int
    /// Hitbox: columns [x+hl, x+hr) and effective height above the ground.
    var hl: Double
    var hr: Double
    var h: Double
    var hit: Bool = false
    var overlapped: Bool = false
    var minClear: Double = 99
    var settled: Bool = false
}

struct DashItem: Equatable {
    var id: Int
    /// Centre column, centre height above the ground.
    var x: Double
    var hc: Double
    var bonus: Bool
    var glyph: Int
}

enum DashPopKind { case item, bonus, near, streak, hit }

struct DashPop: Equatable {
    var x: Double
    var y: Double
    var age: Double
    var text: String
    var kind: DashPopKind
}

struct DashState {
    var t: Double = 0
    var duration: Double
    var cd: Double
    var speed: Double
    var dist: Double = 0
    var scroll: Double = 0
    var petX: Double
    var petW: Double
    var petH: Double
    var hbW: Double
    var hbH: Double
    var hp: Double = 0
    var vy: Double = 0
    var grounded: Bool = true
    var air: Double = 0
    var stun: Double = 0
    var invul: Double = 0
    var cheer: Double = 0
    var jumpBuf: Double = 0
    var land: Double = 0
    var obstacles: [DashObstacle] = []
    var items: [DashItem] = []
    var pops: [DashPop] = []
    var points: Int = 0
    var cleared: Int = 0
    var hits: Int = 0
    var near: Int = 0
    var streak: Int = 0
    var best: Int = 0
    var picked: Int = 0
    var jumps: Int = 0
}

struct DashBox: Equatable {
    var left: Int
    var right: Int
    var hl: Int
    var hr: Int
    var ho: Int
    var h: Int
}

struct DashDims {
    var petW: Double
    var petH: Double
    var hbW: Double
    var hbH: Double
}

struct DashJump {
    var v0: Double
    var g: Double
    /// Pet height after k ticks since take-off, k = 1 ... airTicks-1.
    var arc: [Double]
    var airTicks: Int
    var apex: Double
}

final class DashGame: MiniGame {
    let id = "dash"
    var state: DashState

    static let ms = MiniGameData.dashMs
    static let countMs = MiniGameData.dashCountMs
    static let width = MiniGameData.dashW
    static let ground = MiniGameData.dashGround
    static let petColumn = MiniGameData.dashPetX
    static let thresholds = Thresholds(bronze: MiniGameData.dashThresholds[0], silver: MiniGameData.dashThresholds[1],
                                       gold: MiniGameData.dashThresholds[2])
    private static let dt: Double = MiniGameData.tickMs / 1000

    private let rng: MiniRng
    private let tuning: Tuning
    private let mul: Double
    private let theme: FamilyTheme
    private let jump: DashJump
    private let ref: DashJump
    private let boxes: [DashBox]
    private var nextID = 1
    /// Centre column and half width of the last placed group, and the time gap (s) the next group wants after it.
    private var lastCx: Double = 22
    private var lastHalf: Double = 0
    private var gapSec: Double = 1.9
    private var ticker = MiniTicker()
    private var pending = GameInput()

    init(seed: Int, params: GameParams) {
        rng = MiniRng(seed: seed)
        tuning = params.tuning
        mul = params.scoreMul
        theme = params.theme
        jump = DashGame.jumpFor(params.tuning, healthy: false)
        ref = DashGame.jumpFor(params.tuning, healthy: true)
        boxes = params.theme.obstacles.map { DashGame.obstacleBox($0) }
        let d = DashGame.dims(params.tuning)
        state = DashState(duration: DashGame.ms, cd: DashGame.countMs, speed: DashGame.courseSpeed(0, params.tuning),
                          petX: DashGame.petColumn, petW: d.petW, petH: d.petH, hbW: d.hbW, hbH: d.hbH)
    }

    // MARK: geometry

    /// The hitbox of a 7x7 obstacle glyph: forgiving (one column in from each side when wide, one row off the top).
    static func obstacleBox(_ gl: MiniGlyph) -> DashBox {
        var l = 7, r = 0, top = 7
        for (y, row) in gl.rows.enumerated() {
            var any = false
            for (x, c) in row.enumerated() where c != "." {
                l = min(l, x); r = max(r, x + 1); any = true
            }
            if any { top = min(top, y) }
        }
        if r == 0 { l = 2; r = 5; top = 4 }
        let wide = r - l >= 5
        let ho = 7 - top
        return DashBox(left: l, right: r, hl: l + (wide ? 1 : 0), hr: r - (wide ? 1 : 0), ho: ho, h: max(2, ho - 1))
    }

    static func dims(_ t: Tuning) -> DashDims {
        let raw: Double = 8 + 7 * t.size
        let petW: Double = max(12, min(20, Double(MiniPaint.jsRound(raw))))
        return DashDims(petW: petW, petH: petW, hbW: max(5, Double(MiniPaint.jsRound(petW * 0.4))), hbH: Double(MiniPaint.jsRound(petW * 0.55)))
    }

    /// The jump of a body type. `healthy` ignores weight and health (the reference the course is built against).
    static func jumpFor(_ t: Tuning, healthy: Bool) -> DashJump {
        let s: Double = t.size
        var hh: Double = 21 + 9 * (s - 1)
        var tt: Double = 0.64 + 0.26 * (s - 1)
        let c: Double = healthy ? 1 : min(1, t.speed / t.baseSpeed)
        hh *= c
        tt *= c.squareRoot()
        let g: Double = (8 * hh) / (tt * tt)
        let v0: Double = (4 * hh) / tt
        var arc: [Double] = []
        var hp: Double = 0
        var vy: Double = v0
        var k = 1
        while k < 60 {
            hp += vy * dt - (g * dt * dt) / 2
            vy -= g * dt
            if hp <= 0 { return DashJump(v0: v0, g: g, arc: arc, airTicks: k, apex: max(0, arc.max() ?? 0)) }
            arc.append(hp)
            k += 1
        }
        return DashJump(v0: v0, g: g, arc: arc, airTicks: 60, apex: max(0, arc.max() ?? 0))
    }

    /// Number of ticks (and the first one) of a jump during which the pet is at or above height h.
    static func windowAbove(_ j: DashJump, _ h: Double) -> (first: Int, count: Int) {
        var first = -1, count = 0
        for (i, v) in j.arc.enumerated() where v >= h {
            if first < 0 { first = i + 1 }
            count += 1
        }
        return (first: first, count: count)
    }

    /// The body type's speed factor on the course: quick light kinds start faster, slow heavy ones start gentler.
    static func courseFactor(_ t: Tuning) -> Double { 1 + 0.4 * (t.baseSpeed - 1) }

    static func courseSpeed(_ p: Double, _ t: Tuning) -> Double {
        (MiniGameData.dashVStart + (MiniGameData.dashVEnd - MiniGameData.dashVStart) * min(1, max(0, p))) * courseFactor(t)
    }

    // MARK: MiniGame

    var done: Bool { state.t >= state.duration }
    var score: Int { Int((max(0, state.dist / MiniGameData.dashDistPerPoint + Double(state.points)) * mul + 1e-9).rounded(.down)) }
    var rank: Rank { DashGame.thresholds.rank(of: score) }
    var progress: Double { min(1, state.t / state.duration) }
    var hud: Hud {
        let left = max(0, Int(((state.duration - state.t) / 1000).rounded(.up)))
        return Hud(left: "SCORE \(score)", right: "0:" + (left < 10 ? "0\(left)" : "\(left)"))
    }

    func step(_ input: GameInput, dtMs: Double) {
        if done { return }
        pending.left = pending.left || input.left
        pending.right = pending.right || input.right
        pending.act = pending.act || input.act
        var t = ticker
        t.advance(dtMs) { self.tick() }
        ticker = t
    }

    // MARK: rules

    private func tick() {
        let tickMs: Double = MiniGameData.tickMs
        let dt: Double = DashGame.dt
        let inp = pending
        pending = GameInput()
        if state.cd > 0 {
            // countdown: the world idles past, the pet trots on the spot
            state.cd -= tickMs
            state.scroll += 9 * dt
            return
        }
        if inp.left || inp.right || inp.act { state.jumpBuf = MiniGameData.dashJumpBufferMs }
        let base = DashGame.courseSpeed(progress, tuning)
        state.speed = state.stun > 0 ? base * MiniGameData.dashStunSlow : base
        state.t += tickMs
        if state.stun > 0 { state.stun -= tickMs }
        if state.invul > 0 { state.invul -= tickMs }
        if state.cheer > 0 { state.cheer -= tickMs }
        let move: Double = state.speed * dt
        state.dist += move
        state.scroll += move
        for i in 0..<state.obstacles.count { state.obstacles[i].x -= move }
        for i in 0..<state.items.count { state.items[i].x -= move }
        lastCx -= move
        // the pet
        if state.jumpBuf > 0 { state.jumpBuf -= tickMs }
        if state.land > 0 { state.land -= tickMs }
        if state.grounded && state.jumpBuf > 0 && state.stun <= 0 && state.land <= 0 {
            state.grounded = false; state.vy = jump.v0; state.air = 0; state.jumpBuf = 0; state.jumps += 1
        }
        if !state.grounded {
            state.air += tickMs
            state.hp += state.vy * dt - (jump.g * dt * dt) / 2
            state.vy -= jump.g * dt
            if state.hp <= 0 {
                state.hp = 0; state.vy = 0; state.grounded = true; state.air = 0; state.land = MiniGameData.dashLandLagMs
            }
        }
        collide()
        pickUp()
        spawn()
        for i in 0..<state.pops.count { state.pops[i].age += tickMs }
        state.pops.removeAll { $0.age >= 800 }
        state.obstacles.removeAll { !($0.x + 8 > 0) }
        state.items.removeAll { !($0.x > -6) }
    }

    private func pop(_ x: Double, _ y: Double, _ text: String, _ kind: DashPopKind) {
        state.pops.append(DashPop(x: x, y: y, age: 0, text: text, kind: kind))
    }

    private func collide() {
        let left: Double = state.petX - state.hbW / 2
        let right: Double = state.petX + state.hbW / 2
        for i in 0..<state.obstacles.count {
            if state.obstacles[i].settled { continue }
            let o = state.obstacles[i]
            let ol: Double = o.x + o.hl
            let or: Double = o.x + o.hr
            if or > left && ol < right {
                state.obstacles[i].overlapped = true
                if !o.hit {
                    state.obstacles[i].minClear = min(o.minClear, state.hp - o.h)
                    if state.hp < o.h - 1e-6 {
                        state.obstacles[i].hit = true
                        if state.invul <= 0 { hurt() }
                    }
                }
            } else if or <= left {
                state.obstacles[i].settled = true
                if !o.hit && o.overlapped { clear(state.obstacles[i]) }
            }
        }
    }

    private func hurt() {
        state.hits += 1
        state.streak = 0
        state.stun = MiniGameData.dashStunMs
        state.invul = MiniGameData.dashInvulMs
        state.jumpBuf = 0
        let lost: Int = min(Int(MiniGameData.dashHitPenalty), max(0, state.points))
        state.points -= lost
        pop(state.petX, DashGame.ground - state.petH - 4, lost > 0 ? "-\(lost)" : "OUCH", .hit)
    }

    private func clear(_ o: DashObstacle) {
        state.cleared += 1
        state.streak += 1
        state.best = max(state.best, state.streak)
        if o.minClear >= 0 && o.minClear <= MiniGameData.dashNearMissPx {
            let pts = Int(MiniGameData.dashNearMissPoints)
            state.near += 1
            state.points += pts
            state.cheer = 300
            pop(state.petX + 4, DashGame.ground - state.petH - 6, "+\(pts)", .near)
        }
        if state.streak % Int(MiniGameData.dashStreakEvery) == 0 {
            let pts = Int(MiniGameData.dashStreakPoints)
            state.points += pts
            pop(state.petX + 6, DashGame.ground - state.petH - 12, "+\(pts)", .streak)
        }
    }

    private func pickUp() {
        var keep: [DashItem] = []
        let size: Double = MiniGameData.dashItemSize
        let hw: Double = state.hbW / 2 + size / 2 - 2
        let hh: Double = state.hbH / 2 + size / 2 - 3
        let pc: Double = state.hp + state.hbH / 2
        for it in state.items {
            if abs(it.x - state.petX) < hw && abs(it.hc - pc) < hh {
                let pts = it.bonus ? Int(MiniGameData.dashBonusPoints) : Int(MiniGameData.dashItemPoints)
                state.points += pts
                state.picked += 1
                state.cheer = 400
                pop(it.x, DashGame.ground - it.hc - 8, "+\(pts)", it.bonus ? .bonus : .item)
                continue
            }
            keep.append(it)
        }
        state.items = keep
    }

    // MARK: the course

    /// The healthy pet's course speed where a group at screen column x will be when it arrives.
    private func arrivalSpeed(_ x: Double) -> Double {
        let here = DashGame.courseSpeed(progress, tuning)
        let eta: Double = max(0, x - DashGame.petColumn) / max(1, here)
        return DashGame.courseSpeed(progress + (eta * 1000) / state.duration, tuning)
    }

    /// Can the healthy jump clear a hitbox of height h and the given span, with `margin` ticks to spare?
    private func fits(_ h: Double, _ spanPx: Double, _ v: Double, _ margin: Int) -> Bool {
        let w = DashGame.windowAbove(ref, h)
        if w.count <= 0 { return false }
        let overlapTicks: Int = Int(((spanPx + state.hbW) / (v * DashGame.dt)).rounded(.up)) + 1
        return w.count - overlapTicks >= margin
    }

    private func spawn() {
        let pr = progress
        let margin = Int(MiniGameData.dashMarginTicks)
        var guardN = 0
        while guardN < 4 {
            guardN += 1
            let cx: Double = lastCx + gapSec * arrivalSpeed(lastCx + 20)
            if cx - 8 > DashGame.width + 8 { return }
            let v = arrivalSpeed(cx)
            // the group: one obstacle, or a pair that a single jump has to cover
            let w0: Double = 0.42, w1: Double = 0.3, w2: Double = 0.28 + 0.1 * pr
            let r: Double = rng.next() * (w0 + w1 + w2)
            var k: Int = r < w0 ? 0 : (r < w0 + w1 ? 1 : 2)
            var boxA = boxes[k]
            var pair = false
            if pr > 0.12 { pair = rng.chance(0.25 + 0.2 * pr) }
            let kindB = rng.int(3)
            // a single obstacle must fit the healthy arc; otherwise fall back to the lowest one, then to a breather
            if !fits(Double(boxA.h), Double(boxA.hr - boxA.hl), v, margin) {
                k = 0; boxA = boxes[0]; pair = false
                if !fits(Double(boxA.h), Double(boxA.hr - boxA.hl), v, margin) {
                    lastCx = cx; lastHalf = 0; gapSec = 0.4
                    continue
                }
            }
            var group: [(kind: Int, off: Int, box: DashBox)] = [(kind: k, off: 0, box: boxA)]
            if pair {
                let boxB = boxes[kindB]
                let off: Int = boxA.hr + 1 + rng.int(3) - boxB.hl + 1  // 1..3 px of clear air between the hitboxes
                let span: Int = off + boxB.hr - boxA.hl
                if fits(Double(max(boxA.h, boxB.h)), Double(span), v, margin + 1) { group.append((kind: kindB, off: off, box: boxB)) }
            }
            guard let last = group.last else { continue }
            let hitL: Double = Double(boxA.hl)
            let hitR: Double = Double(last.off + last.box.hr)
            let spanW: Double = hitR - hitL
            let x0: Double = cx - (hitL + spanW / 2)
            // keep a visible gap behind the previous group
            if cx - spanW / 2 < lastCx + lastHalf + 5 {
                lastCx = cx; lastHalf = 0; gapSec = 0.3
                continue
            }
            for g in group {
                state.obstacles.append(DashObstacle(id: nextID, x: x0 + Double(g.off), kind: g.kind, hl: Double(g.box.hl), hr: Double(g.box.hr), h: Double(g.box.h)))
                nextID += 1
            }
            placeItems(cx, v)
            lastCx = cx
            lastHalf = spanW / 2
            // the wait before the next group: the jump's air time plus landing slack (wider for big kinds), then some air that shrinks as the course speeds up
            let size: Double = tuning.size
            let slack: Double = MiniGameData.dashLandSlackS + 0.1 * max(0, size - 1) - 0.04 * max(0, 1 - size)
            gapSec = max(Double(ref.airTicks) * DashGame.dt + slack, MiniGameData.dashPaceS) + rng.range(0, 0.9) * (1.0 - 0.6 * pr)
        }
    }

    private func placeItems(_ cx: Double, _ v: Double) {
        let luck = tuning.luck
        let chance: Double = max(0.55, min(0.9, 0.72 + 0.15 * (luck - 1)))
        if !rng.chance(chance) { return }
        let mid: Int = max(1, min(ref.arc.count, MiniPaint.jsRound(Double(ref.airTicks) / 2)))
        let spread: Double = max(2, Double(MiniPaint.jsRound(0.22 / DashGame.dt)))
        let offs: [Double] = rng.chance(0.35) ? [-spread / 2, spread / 2] : [-spread, 0, spread]
        for o in offs {
            let k: Int = max(1, min(ref.arc.count, MiniPaint.jsRound(Double(mid) + o)))
            let bonus: Bool = rng.chance(MiniGameData.dashBonusChance * luck) && o == 0
            let glyph: Int = rng.int(theme.good.count)
            state.items.append(DashItem(id: nextID, x: cx + o * DashGame.dt * v, hc: ref.arc[k - 1] + state.hbH / 2, bonus: bonus, glyph: glyph))
            nextID += 1
        }
    }
}

// MARK: definition and painter

extension DashGame {
    static let verbs: [String: String] = {
        var out: [String: String] = [:]
        for row in MiniGameData.dashVerbs.split(separator: ",") {
            let f = row.split(separator: ":").map(String.init)
            if f.count == 2 { out[f[0]] = f[1] }
        }
        return out
    }()

    static let def = GameDef(
        id: "dash", name: "DASH", unit: "POINTS", thresholds: DashGame.thresholds, usesRight: false,
        hint: "A/B: jump | C: quit",
        rules: { t in ["\(t.move) AND DODGE", "A/B/TAP: \(DashGame.verbs[t.move] ?? "HOP")", "GRAB \(t.goodNoun)"] },
        maxMs: DashGame.ms + DashGame.countMs + 2000,
        make: { seed, params in DashGame(seed: seed, params: params) })

    /// The family's biome scrolling past in parallax, the pet running on the spot, obstacles and bonus items sliding in.
    static let entry = GameEntry(def: DashGame.def, layout: .field) { r, c in
        guard let g = c.game as? DashGame else { return }
        DashPainter.paint(&r, g.state, c)
    }
}

enum DashPainter {
    enum Shape: String { case mound, tree, spire, block, reed, cloud, flower, disc, dots }

    struct Band {
        var shape: Shape
        var layer: SceneLayer
        var acc: SceneLayer?
        var speed: Double
        var cw: Double
        var base: Int
        var h0: Double
        var h1: Double
        var chance: Double
    }

    /// biome | shape,layer,accent,speed,cell width,baseline,h0,h1,chance ; ... (compact, parsed once)
    private static let styleData: String = """
meadow|mound,hill,-,0.12,26,58,8,14,0.8;mound,clover,-,0.4,14,59,3,5,0.6
woods|tree,canopy,bark,0.12,16,58,16,26,0.85;mound,fern,-,0.4,13,59,3,6,0.6
underwater|mound,coralA,-,0.12,22,58,7,14,0.75;reed,seaweed,-,0.4,11,59,5,10,0.65;dots,airBubble,-,0.25,9,50,20,40,0.5
sky|cloud,cloudShade,-,0.1,30,34,4,6,0.8;cloud,cloud,-,0.3,24,22,3,4,0.7
yard|block,roof,window,0.12,26,58,12,20,0.8;block,wood,-,0.4,8,59,5,7,0.9
clouds|cloud,cloudShade,-,0.1,28,40,5,8,0.8;cloud,cloud,-,0.32,22,24,3,5,0.7
ember|spire,crag,-,0.12,24,58,12,24,0.8;spire,ember,-,0.4,13,59,3,6,0.6;dots,ash,-,0.3,10,50,12,40,0.5
warren|mound,burrow,-,0.12,24,58,8,15,0.8;mound,clover,-,0.4,12,59,3,5,0.6
crags|spire,crag,-,0.12,26,58,14,28,0.85;spire,rock,-,0.4,14,59,4,8,0.6
workshop|block,panel,ledA,0.12,24,58,14,26,0.85;reed,cable,-,0.4,12,59,4,9,0.55
swamp|tree,moss,bark,0.12,18,58,14,24,0.8;reed,glowShroom,-,0.4,12,59,3,7,0.6
garden|reed,leafBig,-,0.12,14,58,14,26,0.8;flower,leafBig,daisy,0.4,12,59,5,8,0.6
space|disc,planet,planetShade,0.06,64,30,8,12,0.9;dots,twinkle,-,0.2,7,30,10,48,0.6;mound,crater,-,0.4,14,59,2,4,0.6
"""

    private static func layerNamed(_ n: String) -> SceneLayer {
        switch n {
        case "hill": return .hill
        case "clover": return .clover
        case "canopy": return .canopy
        case "bark": return .bark
        case "fern": return .fern
        case "coralA": return .coralA
        case "seaweed": return .seaweed
        case "airBubble": return .airBubble
        case "cloudShade": return .cloudShade
        case "cloud": return .cloud
        case "roof": return .roof
        case "window": return .window
        case "wood": return .wood
        case "crag": return .crag
        case "ember": return .ember
        case "ash": return .ash
        case "burrow": return .burrow
        case "rock": return .rock
        case "panel": return .panel
        case "ledA": return .ledA
        case "cable": return .cable
        case "moss": return .moss
        case "glowShroom": return .glowShroom
        case "leafBig": return .leafBig
        case "daisy": return .daisy
        case "planet": return .planet
        case "planetShade": return .planetShade
        case "twinkle": return .twinkle
        case "crater": return .crater
        default: return .ink
        }
    }

    static let styles: [String: [Band]] = {
        var out: [String: [Band]] = [:]
        for line in styleData.split(separator: "\n") {
            let parts = line.split(separator: "|").map(String.init)
            guard parts.count == 2 else { continue }
            var bands: [Band] = []
            for b in parts[1].split(separator: ";") {
                let f = b.split(separator: ",").map(String.init)
                guard f.count == 9, let shape = Shape(rawValue: f[0]), let sp = Double(f[3]), let cw = Double(f[4]), let base = Int(f[5]),
                      let h0 = Double(f[6]), let h1 = Double(f[7]), let ch = Double(f[8]) else { continue }
                bands.append(Band(shape: shape, layer: layerNamed(f[1]), acc: f[2] == "-" ? nil : layerNamed(f[2]),
                                  speed: sp, cw: cw, base: base, h0: h0, h1: h1, chance: ch))
            }
            out[parts[0]] = bands
        }
        return out
    }()

    private static func rnd(_ i: Double) -> Double {
        let v: Double = sin(i * 12.9898 + 4.1414) * 43758.5453
        return v - v.rounded(.down)
    }

    /// Scenery only lands on empty pixels or other scenery, never on a shared layer (Traditional keeps its plain scene).
    private static func put(_ r: inout SceneRaster, _ x: Int, _ y: Int, _ l: SceneLayer) {
        if x < 0 || y < 9 || x >= SceneRaster.side || y >= SceneRaster.side { return }
        let v: UInt8 = r.cells[y * SceneRaster.side + x] & 0x7f
        if v == 0 || v >= SceneLayer.sceneryFrom { r.set(x, y, l) }
    }

    private static func fdiv(_ a: Double, _ b: Double) -> Int { Int((a / b).rounded(.down)) }

    private static func drawBand(_ r: inout SceneRaster, _ band: Band, _ scroll: Double, _ seed: Double) {
        let n = Double(SceneRaster.side)
        let off: Double = scroll * band.speed
        let k0: Int = fdiv(off, band.cw) - 1
        let k1: Int = fdiv(off + n, band.cw) + 1
        if k1 < k0 { return }
        for k in k0...k1 {
            let kd = Double(k)
            if rnd(kd * 3.7 + seed) > band.chance { continue }
            let h: Int = MiniPaint.jsRound(band.h0 + (band.h1 - band.h0) * rnd(kd * 5.1 + seed + 1))
            let cx: Int = MiniPaint.jsRound(kd * band.cw + band.cw * (0.25 + 0.5 * rnd(kd * 2.3 + seed + 2)) - off)
            let base = band.base
            let l = band.layer
            let a = band.acc ?? band.layer
            let hd = Double(h)
            switch band.shape {
            case .mound:
                let w = h * 2 + 2
                for i in -w...w {
                    let top: Int = MiniPaint.jsRound(hd * max(0, 1 - Double(i * i) / Double(w * w)).squareRoot())
                    var j = 0
                    while j < top { put(&r, cx + i, base - j, l); j += 1 }
                }
            case .tree:
                let trunk: Int = max(3, MiniPaint.jsRound(hd * 0.4))
                for j in 0..<trunk { put(&r, cx, base - j, a) }
                let rad: Int = max(3, MiniPaint.jsRound(hd * 0.3))
                for j in -rad...rad {
                    for i in -rad...rad where i * i + j * j <= rad * rad + 1 { put(&r, cx + i, base - trunk - rad + 1 + j, l) }
                }
            case .spire:
                for j in 0..<h {
                    let hw: Int = MiniPaint.jsRound((Double(j) / hd) * (hd / 3 + 1))
                    if hw < 0 { continue }
                    for i in -hw...hw { put(&r, cx + i, base - h + 1 + j, l) }
                }
            case .block:
                let w: Int = max(4, MiniPaint.jsRound(hd * 0.7))
                for j in 0..<h {
                    for i in 0..<w { put(&r, cx - (w >> 1) + i, base - j, l) }
                }
                if a != l {
                    var j = 2
                    while j < h - 1 {
                        var i = 1
                        while i < w - 1 { put(&r, cx - (w >> 1) + i, base - j, a); i += 3 }
                        j += 4
                    }
                }
            case .reed:
                for j in 0..<h {
                    let dx: Int = (Double(j) > hd * 0.6) ? ((j & 2) != 0 ? 1 : 0) : 0
                    put(&r, cx + dx, base - j, l)
                }
                if h > 4 { put(&r, cx, base - h, a) }
            case .cloud:
                let w = h * 3
                for i in -w...w {
                    let t: Int = MiniPaint.jsRound(hd * max(0, 1 - Double(i * i) / Double(w * w)).squareRoot())
                    for j in -(t >> 1)...(t >> 1) { put(&r, cx + i, base + j, l) }
                }
            case .flower:
                for j in 0..<max(0, h - 1) { put(&r, cx, base - j, l) }
                put(&r, cx, base - h + 1, a); put(&r, cx - 1, base - h + 2, a); put(&r, cx + 1, base - h + 2, a); put(&r, cx, base - h + 3, a)
            case .disc:
                let r2: Double = hd / 2
                for j in -h...h {
                    for i in -h...h where Double(i * i + j * j) <= r2 * r2 * 4 {
                        put(&r, cx + i, base + j - 6, Double(i + j) > hd * 0.4 ? a : l)
                    }
                }
            case .dots:
                let y: Int = base - MiniPaint.jsRound(hd * rnd(kd + seed + 9))
                put(&r, cx, y, l)
            }
        }
    }

    private static func ground(_ r: inout SceneRaster, _ scroll: Double, _ biome: Biome) {
        let n = SceneRaster.side
        let gnd = Int(DashGame.ground)
        let s: Int = Int(scroll.rounded(.down))
        for x in 0..<n { r.set(x, gnd + 3, .off); r.set(x, gnd + 4, .off) }
        for x in 0..<n {
            if (x + s) % 4 == 0 { r.set(x, gnd + 3, .dirt) }
            if (x + s * 2) % 7 == 3 { r.set(x, gnd + 4, .dirt) }
        }
        // little tufts or pebbles on the line, so Traditional shows the speed too
        let hard = biome == .workshop || biome == .space || biome == .crags || biome == .ember
        let k0: Int = fdiv(Double(s), 9) - 1
        for k in k0...(k0 + 9) {
            let kd = Double(k)
            if rnd(kd * 1.9 + 3) > 0.55 { continue }
            let x: Int = k * 9 + Int((rnd(kd + 8) * 6).rounded(.down)) - s
            if x < -2 || x > n { continue }
            if !hard {
                put(&r, x, gnd, .grass); put(&r, x - 1, gnd - 1, .grass); put(&r, x + 1, gnd - 1, .grass)
            } else {
                put(&r, x, gnd, .dirt); put(&r, x + 1, gnd, .dirt)
            }
        }
    }

    private static func speedLines(_ r: inout SceneRaster, _ s: DashState) {
        let level: Double = (s.speed / MiniGameData.dashVEnd) * (s.stun > 0 ? 0 : 1)
        if level < 0.8 { return }
        let n = level > 1.05 ? 5 : 3
        for i in 0..<n {
            let id = Double(i)
            let y: Int = 14 + Int((rnd(id * 7.7 + 1) * 40).rounded(.down))
            let len: Int = 5 + Int((rnd(id + 3) * 5).rounded(.down))
            let a: Int = Int((rnd(id * 3.1) * 64).rounded(.down)) - Int((s.scroll * 3.2).rounded(.down))
            let x: Int = ((a % 70) + 70) % 70 - 4
            for j in 0..<len where r.cells.indices.contains(y * 64 + x + j) && x + j >= 0 && x + j < 64 {
                if r.cells[y * 64 + x + j] == 0 { r.set(x + j, y, .cloud) }
            }
        }
    }

    private static func pose(_ s: DashState, _ move: String) -> (blink: Bool, dy: Int) {
        if s.stun > 0 { return (true, 0) }
        if !s.grounded { return (s.vy < 0, 0) }
        let ph: Int = Int((s.scroll / 4.5).rounded(.down)) % 2
        switch move {
        case "HOP": return (ph == 1, ph == 0 ? -1 : 0)
        case "RUN", "ROLL", "SLIDE": return (ph == 1, ph == 1 ? -1 : 0)
        default:
            let bob: Int = Int((s.scroll / 9).rounded(.down)) % 2
            return (ph == 1, bob == 1 ? -2 : -1)
        }
    }

    static func paint(_ r: inout SceneRaster, _ s: DashState, _ c: PaintCtx) {
        let th = c.params.theme
        let biome = Biome.of(c.pet)
        let n = SceneRaster.side
        let gnd = Int(DashGame.ground)
        // scenery
        for (i, band) in (styles[biome.rawValue] ?? []).enumerated() { drawBand(&r, band, s.scroll, Double(i * 11)) }
        // far clouds in Traditional too: a few dashes drifting slowly
        for i in 0..<3 {
            let a: Int = i * 27 + 9 - Int((s.scroll * 0.15).rounded(.down))
            let x: Int = ((a % 80) + 80) % 80 - 12
            let y: Int = 12 + ((i * 7) % 12)
            for j in 0..<6 where biome != .underwater && x + j >= 0 && x + j < n {
                if r.cells[y * n + x + j] == 0 { r.set(x + j, y, .cloud) }
            }
        }
        ground(&r, s.scroll, biome)
        speedLines(&r, s)
        // bonus items
        for it in s.items {
            if it.x < -4 || it.x > Double(n) + 4 { continue }
            let gl: MiniGlyph = it.bonus ? th.bonus : th.good[it.glyph % max(1, th.good.count)]
            r.glyph(gl, Double(MiniPaint.jsRound(it.x) - 3), Double(MiniPaint.jsRound(DashGame.ground - it.hc - 3)),
                    halo: true, mark: it.bonus ? .prize : .none, ms: (s.scroll * 40).rounded(.down))
        }
        // obstacles
        for o in s.obstacles {
            if o.x < -8 || o.x > Double(n) + 1 { continue }
            let gl: MiniGlyph = th.obstacles[o.kind % max(1, th.obstacles.count)]
            // a bumped obstacle flickers so the player sees what hurt
            if o.hit && Int((s.t / 100).rounded(.down)) % 2 == 1 { continue }
            r.glyph(gl, Double(MiniPaint.jsRound(o.x)), Double(gnd - 6), halo: true)
        }
        // the pet
        let po = pose(s, th.move)
        let shake: Int = s.stun > 0 ? (Int((s.t / 70).rounded(.down)) % 2 == 1 ? 1 : -1) : 0
        // after a bump the pet flickers between its two frames while it is safe, but it is always on screen
        let flicker: Bool = s.invul > 0 && s.stun <= 0 && Int((s.invul / 90).rounded(.down)) % 2 == 0
        let footY: Int = gnd - MiniPaint.jsRound(s.hp)
        // trail: dust for runners, bubbles for swimmers, sparks for floaters
        if s.cd <= 0 || s.cd < 600 {
            let back: Int = MiniPaint.jsRound(s.petX - s.petW / 2)
            let ph: Int = Int((s.scroll / 4.5).rounded(.down))
            let mv = th.move
            if s.grounded && s.stun <= 0 && (mv == "RUN" || mv == "HOP" || mv == "ROLL" || mv == "SLIDE") {
                r.set(back - 1 - (ph % 3), gnd, .sand); r.set(back - 3 - ((ph + 1) % 3), gnd - 1, .sand)
            } else if mv == "SWIM" {
                r.set(back - 2 - (ph % 3), footY - 6 - (ph % 4), .bubble); r.set(back - 5 - ((ph + 1) % 3), footY - 8 - ((ph + 2) % 4), .bubble)
            } else if mv == "FLOAT" {
                r.set(back - 2 - (ph % 3), footY - 4 - (ph % 5), .spark)
            } else if mv == "FLY" && !s.grounded {
                r.set(back - 1, footY - 3, .cloud); r.set(back - 3, footY - 5, .cloud)
            }
        }
        r.petFit(species: c.pet.species, cx: s.petX, footY: footY, boxW: Int(s.petW), boxH: Int(s.petH),
                 blink: po.blink != flicker, flip: false, dx: shake, dy: po.dy)
        if s.stun > 0 {
            // dizzy stars over the head
            let a: Int = Int((s.t / 90).rounded(.down)) % 4
            let hx: Int = Int(s.petX), hy: Int = footY - Int(s.petH) - 2
            let pts: [(Int, Int)] = [(-4, 0), (0, -2), (4, 0), (0, 1)]
            r.set(hx + pts[a].0, hy + pts[a].1, .spark)
            r.set(hx + pts[(a + 2) % 4].0, hy + pts[(a + 2) % 4].1, .spark)
        }
        // pops
        for p in s.pops {
            let w = SceneRaster.textWidth(p.text)
            let x: Int = max(0, min(n - w, MiniPaint.jsRound(p.x - Double(w) / 2)))
            let y: Int = max(9, MiniPaint.jsRound(p.y - p.age / 55))
            r.fill(x - 1, y - 1, w + 2, 7, .off)
            r.text(p.text, x, y, layer: p.kind == .hit ? .alert : .spark)
        }
        // the course speeds up in three steps: say so
        let third: Double = s.duration / 3
        let announce: Bool = [1.0, 2.0].contains { k in s.t >= k * third && s.t < k * third + 900 }
        if s.cd <= 0 && announce && Int((s.t / 150).rounded(.down)) % 2 == 0 {
            let w = SceneRaster.textWidth("FASTER!")
            r.fill(((n - w) >> 1) - 2, 11, w + 4, 9, .off)
            r.text("FASTER!", (n - w) >> 1, 13, layer: .alert)
        }
        // countdown and GO
        if s.cd > 0 || s.t < 600 {
            let txt: String = s.cd > 0 ? String(min(3, Int((s.cd / 600).rounded(.up)))) : "GO!"
            let w = SceneRaster.textWidth(txt, scale: 3)
            let x = (n - w) >> 1
            r.fill(x - 4, 14, w + 8, 21, .off)
            r.frame(x - 4, 14, w + 8, 21)
            r.text(txt, x, 19, scale: 3, layer: .ink)
        }
    }
}
