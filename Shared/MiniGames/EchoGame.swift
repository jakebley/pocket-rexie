import Foundation

// ECHO (memory, Simon-style): the pet shows a pattern of the family's symbols, the player repeats it. 12 rounds, patterns of 3 up to 8.
// Same rules and numbers as expo-prototype/src/core/minigames/games/echo.ts (the constants are generated into MiniGameData).
//
// CONTROLS: five pad slots sit in a row: A, A+B, B, B+C, C. The buttons A, B, C play the pads of the same name.
//   The two in-between pads are CHORDS: press the two neighbouring buttons together (within 100 ms) for A+B or B+C.
//   Rounds 1-3 use only A, B, C (3 pads); round 4 unlocks A+B (4 pads), round 7 unlocks B+C (5 pads).
//   A tap on a pad picks it directly (`GameInput.pick` = the index among the pads in play); taps on the stage are ignored.
// Memory is the point, not speed: a long idle only counts as a mistake. One retry per run (the same pattern again, the
// streak is lost); a second mistake ends the run. Score: pattern length x streak bonus (+10% per round in a row, up to +50%).

enum EchoPhase { case intro, show, input, ok, oops, end }
enum EchoMood { case idle, talk, nod, shrug, cheer }

struct EchoRect: Equatable {
    var x: Int
    var y: Int
    var w: Int
    var h: Int
}

struct EchoState {
    var t: Double = 0
    var phase: EchoPhase = .intro
    /// ms in the current phase
    var phaseMs: Double = 0
    /// current round, 0-based
    var round: Int = 0
    var rounds: Int = EchoGame.rounds
    var pattern: [Int] = []
    /// every round's pattern (a painter must not draw the ones to come)
    var patterns: [[Int]] = []
    var active: [Int] = [0, 2, 4]
    /// slot lit by the pet right now (-1 none) and its index in the pattern
    var lit: Int = -1
    var litIndex: Int = -1
    /// symbols of the pattern shown so far, and matched so far by the player
    var shown: Int = 0
    var entered: Int = 0
    /// the last pad the player pressed (-1 none) and how long ago (ms)
    var pressed: Int = -1
    var pressedMs: Double = 0
    /// was the last press wrong (the pad flashes the alarm layer)
    var wrong: Bool = false
    /// the slot the player should have pressed, shown after a mistake
    var expected: Int = -1
    var idleMs: Double = 0
    var idleMax: Double = 0
    var litMs: Double = 0
    var gapMs: Double = 0
    var retries: Int = 1
    var streak: Int = 0
    var points: Double = 0
    var cleared: Int = 0
    var mistakes: Int = 0
    var mood: EchoMood = .idle
    var moodMs: Double = 0
    var sfx = MiniSfx(seq: 0, kind: .note, note: 0)
    /// the run is over and the player cleared every round
    var won: Bool = false
    var finished: Bool = false
}

private struct ChordBuffer {
    var a = false
    var b = false
    var c = false
    var age = -1
}

final class EchoGame: MiniGame {
    let id = "echo"
    var state = EchoState()

    // MARK: constants (generated)

    static let rounds: Int = MiniGameData.echoRounds
    static let lengths: [Int] = MiniGameData.echoLengths.split(separator: ",").compactMap { Int($0) }
    static let unlockAB: Int = MiniGameData.echoUnlockAB
    static let unlockBC: Int = MiniGameData.echoUnlockBC
    static let thresholds = Thresholds(bronze: MiniGameData.echoThresholds[0], silver: MiniGameData.echoThresholds[1],
                                       gold: MiniGameData.echoThresholds[2])
    static let slotNames: [String] = ["A", "AB", "B", "BC", "C"]
    static let padY: Int = MiniGameData.echoPadY
    static let padH: Int = MiniGameData.echoPadH
    static let stageMemory: [String: Double] = {
        var out: [String: Double] = [:]
        for row in MiniGameData.echoStageMemory.split(separator: ",") {
            let f: [String] = row.split(separator: ":").map(String.init)
            if f.count == 2, let v = Double(f[1]) { out[f[0]] = v }
        }
        return out
    }()

    private let mul: Double
    private let bonus: Double
    private let idle: Double
    private var ticker = MiniTicker()
    private var pending = GameInput()
    private var buf = ChordBuffer()
    private var lastK = -1
    private var lost = false

    init(seed: Int, params: GameParams) {
        mul = params.scoreMul
        bonus = EchoGame.memoryBonus(params)
        idle = EchoGame.idleFor(params)
        let patterns = EchoGame.makePatterns(seed)
        var s = EchoState()
        s.pattern = patterns[0]
        s.patterns = patterns
        s.active = EchoGame.activeSlots(0)
        s.idleMax = idle
        s.litMs = EchoGame.litFor(0, bonus)
        s.gapMs = EchoGame.gapFor(0)
        state = s
    }

    // MARK: pure helpers (unit-tested against the Expo traces)

    /// The slots in play for a round, left to right.
    static func activeSlots(_ round: Int) -> [Int] {
        var s: [Int] = [0]
        if round >= unlockAB { s.append(1) }
        s.append(2)
        if round >= unlockBC { s.append(3) }
        s.append(4)
        return s
    }

    /// Where the pads sit on the 64 grid (shared by the painter and the tap zones).
    static func padRects(_ k: Int) -> [EchoRect] {
        let gap = 2
        let w = (60 - gap * (k - 1)) / k
        let x0 = (64 - (w * k + gap * (k - 1))) / 2
        var out: [EchoRect] = []
        for i in 0..<k { out.append(EchoRect(x: x0 + i * (w + gap), y: padY, w: w, h: padH)) }
        return out
    }

    private static func genPattern(_ rng: MiniRng, _ slots: [Int], _ len: Int) -> [Int] {
        var p: [Int] = []
        while p.count < len {
            let n = p.count
            let banned: Int = (n >= 2 && p[n - 1] == p[n - 2]) ? p[n - 1] : -1
            let opts: [Int] = slots.filter { $0 != banned }
            p.append(opts[rng.int(opts.count)])
        }
        return p
    }

    /// The patterns of a whole run, from the seed alone: only unlocked slots, no slot three times in a row, never the same
    /// pattern twice in a row, and the round that unlocks a pad uses it at least once.
    static func makePatterns(_ seed: Int) -> [[Int]] {
        let rng = MiniRng(seed: seed * 31 + 7)
        var out: [[Int]] = []
        for r in 0..<rounds {
            let slots = activeSlots(r)
            let fresh: Int = r == unlockAB ? 1 : (r == unlockBC ? 3 : -1)
            var attempt = 0
            while true {
                let p = genPattern(rng, slots, lengths[r])
                if fresh >= 0 && !p.contains(fresh) && attempt < 50 { attempt += 1; continue }
                if r > 0 && p == out[r - 1] && attempt < 50 { attempt += 1; continue }
                out.append(p)
                break
            }
        }
        return out
    }

    /// Extra ms each symbol stays lit for this pet: memory (body type), smarts and growth stage.
    static func memoryBonus(_ p: GameParams) -> Double {
        let stage: Double = stageMemory[p.stage.rawValue] ?? 0
        let raw: Double = p.tuning.memory * 0.6 + Double(p.smarts) * 1.5 + stage
        return Double(MiniPaint.jsRound(raw))
    }
    static func litFor(_ round: Int, _ bonus: Double) -> Double {
        let base: Double = max(320, 700 - 40 * Double(round))
        return Double(MiniPaint.jsRound(base + bonus))
    }
    static func gapFor(_ round: Int) -> Double { max(140, 260 - 12 * Double(round)) }
    static func idleFor(_ p: GameParams) -> Double { Double(MiniPaint.jsRound(MiniGameData.echoIdleBase + p.tuning.memory * 2)) }
    static func roundPoints(_ len: Int, _ streak: Int) -> Double {
        Double(len) * (1 + MiniGameData.echoStreakStep * Double(min(streak, MiniGameData.echoStreakCap)))
    }

    // MARK: MiniGame

    var done: Bool { state.finished }
    var score: Int { Int((max(0, state.points) * mul + 1e-9).rounded(.down)) }
    var rank: Rank { EchoGame.thresholds.rank(of: score) }
    var progress: Double { min(1, Double(state.cleared) / Double(state.rounds)) }
    var hud: Hud { Hud(left: "RND \(min(state.rounds, state.round + 1))", right: "SCORE \(score)") }
    var overLabel: String { state.won ? "CLEARED" : "OOPS" }
    var sfx: MiniSfx? { state.sfx }

    func step(_ input: GameInput, dtMs: Double) {
        if done { return }
        pending.left = pending.left || input.left
        pending.right = pending.right || input.right
        pending.act = pending.act || input.act
        if let p = input.pick { pending.pick = p }
        var t = ticker
        t.advance(dtMs) { self.tick() }
        ticker = t
    }

    private func tick() {
        let inp = pending
        pending = GameInput()
        let dt = MiniGameData.tickMs
        state.t += dt
        state.phaseMs += dt
        if state.moodMs > 0 {
            state.moodMs -= dt
            if state.moodMs <= 0 { state.mood = .idle; state.moodMs = 0 }
        }
        if state.pressed >= 0 {
            state.pressedMs += dt
            if state.pressedMs > MiniGameData.echoPadFlashMs { state.pressed = -1; state.wrong = false }
        }
        switch state.phase {
        case .intro:
            if state.phaseMs >= MiniGameData.echoIntroMs { go(.show) }
        case .show:
            tickShow()
        case .input:
            tickInput(inp)
        case .ok:
            if state.phaseMs >= MiniGameData.echoOkMs { nextRound() }
        case .oops:
            if state.phaseMs >= MiniGameData.echoOopsMs {
                if lost { finish(false) } else { go(.intro) }
            }
        case .end:
            if state.phaseMs >= 700 { state.finished = true }
        }
    }

    private func go(_ phase: EchoPhase) {
        state.phase = phase
        state.phaseMs = 0
        state.lit = -1
        state.litIndex = -1
        switch phase {
        case .show:
            state.shown = 0
            lastK = -1
            state.mood = .talk
            state.moodMs = 0
            state.expected = -1
        case .intro:
            state.entered = 0
            state.shown = 0
            state.expected = -1
            state.wrong = false
            state.pressed = -1
        case .input:
            state.entered = 0
            state.idleMs = 0
            buf = ChordBuffer()
            state.mood = .idle
            state.moodMs = 0
        default:
            break
        }
    }

    private func note(_ slot: Int) -> MiniSfx {
        MiniSfx(seq: state.sfx.seq + 1, kind: .note, note: MiniGameData.echoSlotNotes[slot])
    }

    private func tickShow() {
        let el = state.phaseMs - MiniGameData.echoLeadMs
        let period = state.litMs + state.gapMs
        if el < 0 { state.lit = -1; return }
        let k = Int((el / period).rounded(.down))
        if k >= state.pattern.count {
            if el - Double(state.pattern.count) * period >= 300 { go(.input) }
            state.lit = -1
            return
        }
        let r = el - Double(k) * period
        if r < state.litMs {
            state.lit = state.pattern[k]
            state.litIndex = k
            if k != lastK {
                lastK = k
                state.shown = k + 1
                state.sfx = note(state.lit)
                state.mood = .talk
                state.moodMs = 180
            }
        } else {
            state.lit = -1
        }
    }

    private func tickInput(_ inp: GameInput) {
        state.idleMs += MiniGameData.tickMs
        if let pk = inp.pick {
            if pk >= 0 && pk < state.active.count { press(state.active[pk]) }
        } else if state.active.count == 3 {
            // no chords in play: every press counts at once
            if inp.left { press(0) }
            if inp.act { press(2) }
            if inp.right { press(4) }
        } else {
            buf.a = buf.a || inp.left
            buf.b = buf.b || inp.act
            buf.c = buf.c || inp.right
            if buf.age < 0 && (buf.a || buf.b || buf.c) { buf.age = 0 } else if buf.age >= 0 { buf.age += 1 }
            let n = (buf.a ? 1 : 0) + (buf.b ? 1 : 0) + (buf.c ? 1 : 0)
            if buf.age >= 0 && (n >= 2 || buf.age >= MiniGameData.echoChordTicks) {
                let a = buf.a, b = buf.b, c = buf.c
                buf = ChordBuffer()
                if a && b && !c && state.active.contains(1) {
                    press(1)
                } else if b && c && !a && state.active.contains(3) {
                    press(3)
                } else {
                    if a { press(0) }
                    if b { press(2) }
                    if c { press(4) }
                }
            }
        }
        if state.phase == .input && state.idleMs >= state.idleMax + (state.entered == 0 ? 1500 : 0) { mistake(-1) }
    }

    private func press(_ slot: Int) {
        if state.phase != .input { return }
        state.pressed = slot
        state.pressedMs = 0
        state.wrong = false
        let want = state.pattern[state.entered]
        state.sfx = note(slot)
        if slot == want {
            state.entered += 1
            state.idleMs = 0
            state.mood = .nod
            state.moodMs = 260
            if state.entered >= state.pattern.count { clear() }
        } else {
            mistake(slot)
        }
    }

    private func clear() {
        state.points += EchoGame.roundPoints(state.pattern.count, state.streak)
        state.streak += 1
        state.cleared += 1
        state.phase = .ok
        state.phaseMs = 0
        state.mood = .cheer
        state.moodMs = MiniGameData.echoOkMs
    }

    private func mistake(_ slot: Int) {
        state.mistakes += 1
        state.wrong = slot >= 0
        if slot < 0 { state.pressed = -1 }
        state.expected = state.pattern[state.entered]
        state.streak = 0
        state.sfx = MiniSfx(seq: state.sfx.seq + 1, kind: .bad, note: 0)
        state.mood = .shrug
        state.moodMs = MiniGameData.echoOopsMs
        if state.retries > 0 { state.retries -= 1 } else { lost = true }
        state.phase = .oops
        state.phaseMs = 0
        state.lit = -1
    }

    private func nextRound() {
        if state.round + 1 >= state.rounds { finish(true); return }
        state.round += 1
        state.pattern = state.patterns[state.round]
        state.active = EchoGame.activeSlots(state.round)
        state.litMs = EchoGame.litFor(state.round, bonus)
        state.gapMs = EchoGame.gapFor(state.round)
        state.idleMax = idle
        go(.intro)
    }

    private func finish(_ won: Bool) {
        state.won = won
        state.phase = .end
        state.phaseMs = 0
        state.mood = won ? .cheer : .shrug
        state.moodMs = 700
        state.lit = -1
        // a win gets a short beat for the pet to cheer; a loss already had its shrug in the "oops" phase
        if !won { state.finished = true }
    }
}

// MARK: definition and painter

extension EchoGame {
    /// Touch zones tile the whole screen below the stage (no gaps), so a stray tap never turns into an A or C press;
    /// the last zone is the stage, which the game ignores.
    static func tapZones(_ g: MiniGame) -> [TapRow] {
        guard let e = g as? EchoGame else { return [] }
        let active: [Int] = e.state.active
        let rects = padRects(active.count)
        var out: [TapRow] = []
        for (i, r) in rects.enumerated() {
            let x0 = i == 0 ? 0 : r.x - 1
            let x1 = i == rects.count - 1 ? 64 : r.x + r.w + 1
            out.append(TapRow(id: "pad-" + slotNames[active[i]].lowercased(), y: r.y, h: 64 - r.y - 1, x: x0, w: x1 - x0))
        }
        out.append(TapRow(id: "stage", y: 0, h: padY - 2, x: 0, w: 64))
        return out
    }

    static let def = GameDef(
        id: "echo", name: "ECHO", unit: "POINTS", thresholds: EchoGame.thresholds, usesRight: true,
        hint: "A B C: pads | A+B, B+C: more",
        rules: { _ in ["WATCH THE SIGNS", "THEN COPY THEM", "A B C, A+B, B+C"] },
        tapZones: { g in EchoGame.tapZones(g) },
        maxMs: MiniGameData.echoMaxMs,
        make: { seed, params in EchoGame(seed: seed, params: params) })

    static let entry = GameEntry(def: EchoGame.def, layout: .field) { r, c in
        guard let g = c.game as? EchoGame else { return }
        EchoPaint.paint(&r, g.state, c)
    }
}

/// The ECHO painter (64 grid): HUD 0-7, stage 8-35 (pet left, bubble right), ledge 36, pattern dots 38-40, pad labels 42-46,
/// pads 47-62, patience bar 63. Traditional: one ink; a lit pad is a solid block with the symbol punched out of it, and
/// scenery-layer pixels are holes there, so the same code serves both looks.
enum EchoPaint {
    static let ledge = 36
    static let bubble = EchoRect(x: 37, y: 10, w: 24, h: 24)
    private static let heart: [String] = [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."]
    private static let darkTones: Set<MiniTone> = [.ink, .dbrown, .brown, .rust, .blue, .purple, .grey, .red]

    private static func punch(_ r: inout SceneRaster, _ g: MiniGlyph, _ x: Int, _ y: Int, _ k: Int) {
        let layer: SceneLayer = darkTones.contains(g.main) ? .daisy : .cable
        for (j, row) in g.rows.enumerated() {
            for (i, ch) in row.enumerated() where ch != "." { r.fill(x + i * k, y + j * k, k, k, layer) }
        }
    }

    private static func centerText(_ r: inout SceneRaster, _ s: String, _ cx: Double, _ y: Int, scale: Int = 1, layer: SceneLayer = .ink) {
        let x = MiniPaint.jsRound(cx - Double(SceneRaster.textWidth(s, scale: scale)) / 2)
        r.text(s, x, y, scale: scale, layer: layer)
    }

    private static func dots(_ r: inout SceneRaster, _ s: EchoState, _ ms: Double) {
        let n = s.pattern.count
        let x0 = MiniPaint.jsRound(Double(64 - (n * 6 - 2)) / 2) + 2
        var done = 0
        switch s.phase {
        case .show: done = s.shown
        case .ok: done = n
        case .input, .oops: done = s.entered
        default: done = 0
        }
        for i in 0..<n {
            let x = x0 + i * 6
            let miss = s.phase == .oops && i == s.entered && (Int((ms / 160).rounded(.down)) % 2) == 0
            if miss {
                r.fill(x, 38, 4, 3, .alert)
            } else if i < done {
                r.fill(x, 38, 4, 3, .ink)
            } else {
                r.fill(x, 38, 4, 1, .ink)
                r.fill(x, 40, 4, 1, .ink)
                r.set(x, 39, .ink)
                r.set(x + 3, 39, .ink)
            }
        }
        if s.retries > 0 {
            for (j, row) in heart.enumerated() {
                for (i, ch) in row.enumerated() where ch == "X" { r.set(1 + i, 37 + j, .heart) }
            }
        }
    }

    private static func pads(_ r: inout SceneRaster, _ s: EchoState, _ c: PaintCtx) {
        let syms: [MiniGlyph] = c.params.theme.symbols
        if syms.count < 5 { return }
        let rects = EchoGame.padRects(s.active.count)
        let k = rects[0].w >= 16 ? 2 : 1
        for (i, slot) in s.active.enumerated() {
            let q = rects[i]
            let gl = syms[slot]
            let lit = s.lit == slot || (s.pressed == slot && !s.wrong)
            let wrong = s.pressed == slot && s.wrong
            r.fill(q.x, q.y, q.w, q.h, .off)
            r.frame(q.x, q.y, q.w, q.h, .ink)
            let gx = q.x + (q.w - 7 * k) / 2
            let gy = q.y + (q.h - 7 * k) / 2
            if lit || wrong {
                r.fill(q.x + 1, q.y + 1, q.w - 2, q.h - 2, wrong ? .alert : gl.main.layer)
                punch(&r, gl, gx, gy, k)
            } else {
                r.glyphScaled(gl, gx, gy, k: k)
                // after a mistake the pad the player should have pressed blinks
                if s.phase == .oops && s.expected == slot && (Int((c.ms / 200).rounded(.down)) % 2) == 0 {
                    r.frame(q.x + 1, q.y + 1, q.w - 2, q.h - 2, .alert)
                }
            }
            let name: String = slot % 2 == 1 ? EchoGame.slotNames[slot].map { String($0) }.joined(separator: "+") : EchoGame.slotNames[slot]
            centerText(&r, name, Double(q.x) + Double(q.w) / 2, 41)
        }
    }

    private static func speech(_ r: inout SceneRaster, _ s: EchoState, _ c: PaintCtx) {
        let b = bubble
        let syms: [MiniGlyph] = c.params.theme.symbols
        if syms.count < 5 { return }
        r.fill(b.x, b.y, b.w, b.h, .off)
        r.frame(b.x, b.y, b.w, b.h, .ink)
        // the tail towards the pet
        r.set(b.x - 1, b.y + 14, .ink)
        r.set(b.x - 2, b.y + 15, .ink)
        r.fill(b.x, b.y + 13, 1, 4, .off)
        r.set(b.x - 1, b.y + 15, .off)
        let cx = Double(b.x) + Double(b.w) / 2
        func sym(_ slot: Int, _ ink: SceneLayer?, _ r: inout SceneRaster) {
            let gl = syms[slot]
            let gx = MiniPaint.jsRound(cx) - 7
            if let ink {
                for (j, row) in gl.rows.enumerated() {
                    for (i, ch) in row.enumerated() where ch != "." { r.fill(gx + i * 2, b.y + 5 + j * 2, 2, 2, ink) }
                }
            } else {
                r.glyphScaled(gl, gx, b.y + 5, k: 2)
            }
        }
        switch s.phase {
        case .intro:
            centerText(&r, "RND", cx, b.y + 4)
            centerText(&r, String(s.round + 1), cx, b.y + 11, scale: 2)
            if s.round == 3 || s.round == 6 { centerText(&r, "NEW", cx, b.y + 18, layer: .spark) }
        case .show:
            if s.lit >= 0 { sym(s.lit, nil, &r) }
        case .input:
            if s.pressed >= 0 { sym(s.pressed, s.wrong ? .alert : nil, &r) } else { centerText(&r, "GO", cx, b.y + 8, scale: 2) }
        case .ok:
            centerText(&r, "GOOD", cx, b.y + 7)
            let pts: Double = (EchoGame.roundPoints(s.pattern.count, s.streak - 1) * 10).rounded() / 10
            centerText(&r, "+" + String(format: "%g", pts), cx, b.y + 14, layer: .spark)
        case .oops:
            centerText(&r, s.mistakes >= 2 ? "OOPS" : "AGAIN", cx, b.y + 9, layer: .alert)
        case .end:
            centerText(&r, s.won ? "WOW" : "OOPS", cx, b.y + 9)
        }
    }

    static func paint(_ r: inout SceneRaster, _ s: EchoState, _ c: PaintCtx) {
        // the deck: wipe the scenery below the ledge so the labels and pads read on any biome
        r.fill(0, ledge, SceneRaster.side, SceneRaster.side - ledge, .off)
        r.fill(0, ledge, SceneRaster.side, 1, .ink)
        // the pet
        let bob = (Int((c.ms / 110).rounded(.down)) % 2) == 1
        var dx = 0, dy = 0
        var blink = false
        switch s.mood {
        case .nod: dy = bob ? 0 : 2
        case .cheer: dy = bob ? -2 : 0
        case .shrug: dx = bob ? 1 : -1; blink = true
        case .talk: dy = -1
        case .idle: break
        }
        r.petFit(species: c.pet.species, cx: 17, footY: ledge - 1, boxW: 26, boxH: 26, blink: blink, dx: dx, dy: dy)
        if s.mood == .shrug { r.text("?", 26, 11 + (bob ? 0 : 1), layer: .alert) }
        if s.mood == .cheer {
            for (x, y) in [(30, 14), (29, 14), (31, 14), (30, 13), (30, 15)] { r.set(x, y, .spark) }
        }
        speech(&r, s, c)
        dots(&r, s, c.ms)
        pads(&r, s, c)
        // patience bar: shrinks when the player is taking long
        if s.phase == .input {
            let left = 1 - s.idleMs / (s.idleMax + (s.entered == 0 ? 1500 : 0))
            if left < 0.5 { r.fill(0, 63, max(0, MiniPaint.jsRound(64 * left)), 1, .alert) }
        }
    }
}
