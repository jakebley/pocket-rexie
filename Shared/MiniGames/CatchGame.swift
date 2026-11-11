import Foundation

// CATCH (reflex, 30 s): items fall from the sky, the pet slides left and right under them. Catch the family's good
// items, dodge the bad ones. A = slide left, C = slide right (the pet keeps sliding until a wall or B), B = stop.
// Same rules and numbers as expo-prototype/src/core/minigames/games/catch.ts (the constants are generated).
// Fair play: every good item is placed so a HEALTHY pet of the same body type could reach it after the one before
// (see `reach`), and a bad item is never put on top of a good one, whatever the pet's stage.

enum CatchItemKind { case good, bonus, bad }

struct CatchItem: Equatable {
    var id: Int
    /// Centre x.
    var x: Double
    /// Top y.
    var y: Double
    var vy: Double
    var kind: CatchItemKind
    /// Index into the theme's good / bad list.
    var glyph: Int
    /// ms (game time) at which it reaches the pet's head.
    var arrival: Double
}

struct CatchPop: Equatable {
    var x: Double
    var y: Double
    var age: Double
    var kind: CatchItemKind
    var pts: Int
}

struct CatchState {
    var t: Double = 0
    var duration: Double
    var petX: Double
    var petW: Double
    var petH: Double
    var petTop: Double
    var dir: Int = 0
    var face: Int = 1
    var stun: Double = 0
    var cheer: Double = 0
    var items: [CatchItem] = []
    var pops: [CatchPop] = []
    var points: Int = 0
    var caught: Int = 0
    var hits: Int = 0
    var missed: Int = 0
}

struct CatchDims {
    var petW: Double
    var petH: Double
    var petTop: Double
    var vp: Double
    var refVp: Double
}

final class CatchGame: MiniGame {
    let id = "catch"
    var state: CatchState

    static let ms = MiniGameData.catchMs
    static let width = MiniGameData.catchW
    static let ground = MiniGameData.catchGround
    static let item = MiniGameData.catchItem
    static let thresholds = Thresholds(bronze: MiniGameData.catchThresholds[0], silver: MiniGameData.catchThresholds[1],
                                       gold: MiniGameData.catchThresholds[2])

    private let rng: MiniRng
    private let dims: CatchDims
    private let luck: Double
    private let mul: Double
    private let theme: FamilyTheme
    private var nextID = 1
    private var spawnIn: Double = 600
    /// The most recent good item placed (kept after it is caught, so the path rules still know where the pet rests).
    private var lastGood: (x: Double, arrival: Double)?
    private var ticker = MiniTicker()
    private var pending = GameInput()

    init(seed: Int, params: GameParams) {
        let d = CatchGame.dims(params)
        rng = MiniRng(seed: seed)
        dims = d
        luck = params.tuning.luck
        mul = params.scoreMul
        theme = params.theme
        state = CatchState(duration: CatchGame.ms, petX: CatchGame.width / 2, petW: d.petW, petH: d.petH, petTop: d.petTop)
    }

    static func dims(_ p: GameParams) -> CatchDims {
        let raw: Double = 8 + 7 * p.tuning.size
        let w: Double = max(12, min(20, (raw + 0.5).rounded(.down)))
        return CatchDims(petW: w, petH: w, petTop: ground - w + 1, vp: MiniGameData.catchBaseSpeed * p.tuning.speed,
                         refVp: MiniGameData.catchBaseSpeed * p.tuning.baseSpeed)
    }

    /// How far a healthy pet can get between two arrivals dtMs apart (slack for reaction and the time an item spends passing the head).
    static func reach(refVp: Double, dtMs: Double, petW: Double, vy: Double) -> Double {
        let window: Double = (petW / vy) * 1000 * 0.5
        return refVp * max(0, (dtMs + window - 120) / 1000) * 0.88 + petW / 2 + 1
    }

    private static func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double { a + (b - a) * t }

    // MARK: MiniGame

    var done: Bool { state.t >= state.duration }
    var score: Int { Int((Double(max(0, state.points)) * mul + 1e-9).rounded(.down)) }
    var rank: Rank { CatchGame.thresholds.rank(of: score) }
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
        let dt: Double = MiniGameData.tickMs
        let inp = pending
        pending = GameInput()
        if state.stun <= 0 {
            if inp.left { state.dir = -1; state.face = -1 }
            if inp.right { state.dir = 1; state.face = 1 }
            if inp.act { state.dir = 0 }
        }
        state.t += dt
        if state.stun > 0 { state.stun -= dt; state.dir = 0 }
        if state.cheer > 0 { state.cheer -= dt }
        if state.dir != 0 {
            let half = dims.petW / 2
            state.petX += Double(state.dir) * dims.vp * (dt / 1000)
            if state.petX <= half { state.petX = half; state.dir = 0 }
            if state.petX >= CatchGame.width - half { state.petX = CatchGame.width - half; state.dir = 0 }
        }
        spawnIn -= dt
        if spawnIn <= 0 && state.t < state.duration - 1500 { spawn() }
        moveItems(dt)
        for i in 0..<state.pops.count { state.pops[i].age += dt }
        state.pops.removeAll { $0.age >= 700 }
    }

    private func spawn() {
        let pr = progress
        spawnIn = CatchGame.lerp(MiniGameData.catchSpawnFrom, MiniGameData.catchSpawnTo, pr) * rng.range(0.85, 1.15)
        let d = dims
        let vy = CatchGame.lerp(MiniGameData.catchFallFrom, MiniGameData.catchFallTo, pr)
        let arrival = state.t + (d.petTop / vy) * 1000
        let r = rng.next()
        var kind = CatchItemKind.good
        if r < CatchGame.lerp(MiniGameData.catchBadFrom, MiniGameData.catchBadTo, pr) {
            kind = .bad
        } else if rng.chance(MiniGameData.catchBonusChance * luck) {
            kind = .bonus
        }
        let lo: Double = (CatchGame.item / 2).rounded(.up) + 1
        let hi: Double = CatchGame.width - lo
        // Stable sort by arrival (the Expo array sort is stable).
        let goods: [CatchItem] = state.items.enumerated().filter { $0.element.kind != .bad }
            .sorted { $0.element.arrival != $1.element.arrival ? $0.element.arrival < $1.element.arrival : $0.offset < $1.offset }
            .map { $0.element }
        let bads: [CatchItem] = state.items.filter { $0.kind == .bad }
        let window: Double = (d.petW / vy) * 1000
        let m: Double = d.petW / 2 + 3
        func clearOf(_ a: Double, _ b: Double, _ x: Double) -> Bool { x < min(a, b) - m || x > max(a, b) + m }
        var prev: (x: Double, arrival: Double)?
        if let g = goods.last(where: { $0.arrival <= arrival }) {
            prev = (x: g.x, arrival: g.arrival)
        } else if let lg = lastGood, lg.arrival <= arrival {
            prev = lg
        }
        let next: CatchItem? = goods.first(where: { $0.arrival > arrival })
        if kind == .bad && prev == nil { return }  // no bad item before the pet has a good one to go for
        let petX = state.petX

        func goodOK(_ cand: Double, _ relaxed: Bool) -> Bool {
            let ref: Double = prev?.x ?? petX
            let prevT: Double = prev.map { arrival - $0.arrival } ?? 1200
            if abs(cand - ref) > CatchGame.reach(refVp: d.refVp, dtMs: prevT, petW: d.petW, vy: vy) + 0.01 { return false }
            if !relaxed && abs(cand - petX) < d.petW * 0.9 + 2 { return false }
            if let n = next, abs(cand - n.x) > CatchGame.reach(refVp: d.refVp, dtMs: n.arrival - arrival, petW: d.petW, vy: vy) + 0.01 { return false }
            if let p = prev {
                for b in bads where b.arrival >= p.arrival && b.arrival <= arrival && !clearOf(p.x, cand, b.x) { return false }
            }
            if let n = next {
                for b in bads where b.arrival > arrival && b.arrival <= n.arrival && !clearOf(cand, n.x, b.x) { return false }
            }
            for b in bads where abs(b.arrival - arrival) < window + 400 && abs(b.x - cand) < d.petW + 4 { return false }
            return true
        }

        var x: Double = -1
        var tries = 0
        while tries < 16 && x < 0 {
            defer { tries += 1 }
            if kind != .bad {
                let ref: Double = prev?.x ?? petX
                let prevT: Double = prev.map { arrival - $0.arrival } ?? 1200
                let rr = CatchGame.reach(refVp: d.refVp, dtMs: prevT, petW: d.petW, vy: vy)
                // aim for the far end of what is reachable, mostly further away from where the pet stands; if that side is walled or blocked, try the other
                let away: Double = rng.chance(0.75) == (ref >= petX) ? 1 : -1
                for sign in [away, -away] {
                    let cand = max(lo, min(hi, ref + sign * rr * rng.range(0.45, 0.98)))
                    if goodOK(cand, tries >= 12) { x = cand; break }
                }
            } else {
                guard let p = prev else { continue }
                let ref = p.x
                var cand = rng.range(lo, hi)
                // a trap close to the pet's path, but never on it
                if tries < 8 {
                    let side: Double = rng.chance(0.5) ? 1 : -1
                    cand = max(lo, min(hi, ref + side * rng.range(d.petW + 5, d.petW * 2.6)))
                }
                if abs(cand - ref) < d.petW + 5 { continue }
                if let n = next, !clearOf(ref, n.x, cand) { continue }
                var blocked = false
                for o in goods where abs(o.arrival - arrival) < window + 500 && abs(o.x - cand) < d.petW + 5 { blocked = true; break }
                if blocked { continue }
                x = cand
            }
        }
        if x < 0 { return }
        let count = kind == .bad ? theme.bad.count : theme.good.count
        let glyph = kind == .bonus ? 0 : rng.int(count)
        state.items.append(CatchItem(id: nextID, x: x, y: -CatchGame.item, vy: vy, kind: kind, glyph: glyph, arrival: arrival))
        nextID += 1
        if kind != .bad { lastGood = (x: x, arrival: arrival) }
    }

    private func moveItems(_ dt: Double) {
        let d = dims
        let hw: Double = d.petW / 2 - 1 + CatchGame.item / 2 - 1
        var keep: [CatchItem] = []
        for var it in state.items {
            it.y += it.vy * (dt / 1000)
            let bottom = it.y + CatchGame.item
            if bottom > state.petTop + 1 && it.y < CatchGame.ground + 1 && abs(it.x - state.petX) < hw {
                collect(it)
                continue
            }
            if it.y > CatchGame.ground {
                if it.kind != .bad { state.missed += 1 }
                continue
            }
            keep.append(it)
        }
        state.items = keep
    }

    private func collect(_ it: CatchItem) {
        let penalty = Int(MiniGameData.catchBadPenalty)
        if it.kind == .bad {
            state.points = max(0, state.points - penalty)
            state.hits += 1
            state.stun = MiniGameData.catchStunMs
            state.dir = 0
            state.pops.append(CatchPop(x: it.x, y: state.petTop - 2, age: 0, kind: .bad, pts: -penalty))
        } else {
            let pts = it.kind == .bonus ? Int(MiniGameData.catchBonusPoints) : 1
            state.points += pts
            state.caught += 1
            state.cheer = 400
            state.pops.append(CatchPop(x: it.x, y: state.petTop - 2, age: 0, kind: it.kind, pts: pts))
        }
    }
}

extension CatchGame {
    static let def = GameDef(
        id: "catch", name: "CATCH", unit: "POINTS", thresholds: CatchGame.thresholds, usesRight: true,
        hint: "A: left | B: stop | C: right",
        rules: { t in ["CATCH \(t.goodNoun)", "DODGE \(t.badNoun)", "A/C SLIDE B STOP"] },
        maxMs: CatchGame.ms + 2000,
        make: { seed, params in CatchGame(seed: seed, params: params) })

    /// Family items falling over the biome, the pet sliding underneath, little "+1" pops.
    static let entry = GameEntry(def: CatchGame.def, layout: .field) { r, c in
        guard let g = c.game as? CatchGame else { return }
        let s = g.state
        let th = c.params.theme
        for it in s.items {
            let list: [MiniGlyph] = it.kind == .bad ? th.bad : th.good
            let gl: MiniGlyph = it.kind == .bonus ? th.bonus : list[it.glyph % max(1, list.count)]
            let mark: GlyphMark = it.kind == .bad ? .danger : (it.kind == .bonus ? .prize : .none)
            r.glyph(gl, it.x - 3, it.y, halo: true, mark: mark, ms: c.ms)
        }
        // the pet: stunned pets blink and shake, happy ones hop
        let stunned = s.stun > 0
        let shake = stunned ? ((Int((c.ms / 80).rounded(.down)) % 2) == 1 ? 1 : -1) : 0
        let hop = (s.cheer > 0 && (Int((c.ms / 120).rounded(.down)) % 2) == 0) ? -1 : 0
        r.petFit(species: c.pet.species, cx: s.petX, footY: Int(CatchGame.ground), boxW: Int(s.petW), boxH: Int(s.petH),
                 blink: stunned, flip: s.face == -1, dx: shake, dy: hop)
        for p in s.pops {
            let txt = p.pts > 0 ? "+\(p.pts)" : String(p.pts)
            let w = txt.count * 4 - 1
            let x = max(0, min(SceneRaster.side - w, MiniPaint.jsRound(p.x - Double(w) / 2)))
            let y = MiniPaint.jsRound(p.y - p.age / 60)
            r.fill(x - 1, y - 1, w + 2, 7, .off)
            r.text(txt, x, y, layer: p.kind == .bad ? .alert : .spark)
        }
    }
}
