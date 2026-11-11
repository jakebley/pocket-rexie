import XCTest

/// A scripted ECHO player: the same bot as expo-prototype/test/echo-bots.ts. It reads the pattern from the game state (a stand-in
/// for a good memory) and answers it with a given reliability. Deterministic (seeded), no system randomness.
final class EchoBot {
    struct Skill {
        var err: Double
        var grow: Double
        var tempo: Double
        var chordFail: Double
        var random: Bool
    }

    static let skills: [String: Skill] = [
        "perfect": Skill(err: 0, grow: 0, tempo: 300, chordFail: 0, random: false),
        "good": Skill(err: 0.012, grow: 0.012, tempo: 450, chordFail: 0.01, random: false),
        "okay": Skill(err: 0.035, grow: 0.025, tempo: 550, chordFail: 0.03, random: false),
        "casual": Skill(err: 0.09, grow: 0.045, tempo: 700, chordFail: 0.06, random: false),
        "random": Skill(err: 1, grow: 0, tempo: 300, chordFail: 0, random: true),
    ]

    private let skill: Skill
    private let rng: MiniRng
    private var nextAt: Double = 0
    private var lastPhase: EchoPhase?
    private var lastRound = -1

    init(skill name: String, seed: Int) {
        skill = EchoBot.skills[name] ?? EchoBot.skills["perfect"]!
        rng = MiniRng(seed: seed * 104729 + 3)
    }

    /// The buttons that play a slot (a chord pad is two buttons at once).
    static func buttons(_ slot: Int) -> GameInput {
        switch slot {
        case 0: return GameInput(left: true)
        case 2: return GameInput(act: true)
        case 4: return GameInput(right: true)
        case 1: return GameInput(left: true, act: true)
        default: return GameInput(right: true, act: true)
        }
    }

    func decide(_ game: MiniGame, _ t: Double) -> GameInput {
        guard let g = game as? EchoGame else { return GameInput() }
        let s = g.state
        if lastPhase != s.phase || lastRound != s.round {
            if s.phase == .input { nextAt = t + 500 }
            lastPhase = s.phase
            lastRound = s.round
        }
        if s.phase != .input || t < nextAt { return GameInput() }
        nextAt = t + skill.tempo
        var slot: Int = s.pattern[s.entered]
        if skill.random {
            slot = s.active[rng.int(s.active.count)]
        } else if rng.chance(skill.err + skill.grow * Double(s.pattern.count - 3)) {
            let others: [Int] = s.active.filter { $0 != slot }
            slot = others[rng.int(others.count)]
        } else if (slot == 1 || slot == 3) && rng.chance(skill.chordFail) {
            slot = slot == 1 ? 0 : 4
        }
        return EchoBot.buttons(slot)
    }
}

/// Mirrors expo-prototype/test/echo.ts: the pattern generator (and its Expo golden patterns), the controls (buttons, chords, taps),
/// the Expo golden runs, the bots (a perfect player clears every pattern, a random one never reaches bronze), the pet
/// modifiers, determinism and the painter for every family in both looks. Kept fast: no more than a few seconds in all.
final class EchoTests: XCTestCase {
    private let t0: Double = 1_800_000_000
    private let idle = GameInput()

    // MARK: helpers

    private func adultOf(_ family: String) -> Species {
        let all = Species.all
        return all.first { $0.family == family && $0.stage == .adult } ?? all.first { $0.family == family }!
    }

    private func params(_ species: String, _ stage: Stage = .adult, sick: Bool = false, smarts: Int = 30) -> GameParams {
        MiniTuning.params(for: MiniBody(species: species, stage: stage, heavy: false, sick: sick, hunger: 4), game: "echo", smarts: smarts)
    }

    private func pet(_ species: String) -> Pet {
        var p = Pet(now: Date(timeIntervalSince1970: t0 - 86400 * 10))
        p.seed = 9
        p.stage = .adult
        p.species = species
        p.family = Species.named(species)?.family ?? "dino"
        p.named = true
        p.name = "Rexie"
        p.lastTick = Date(timeIntervalSince1970: t0)
        p.hunger = 4
        p.happy = 2
        p.weight = p.baseWeight
        return p
    }

    private func play(_ species: String, _ skill: String, _ seed: Int, stage: Stage = .adult, sick: Bool = false) -> EchoGame {
        let bot = EchoBot(skill: skill, seed: seed)
        let g = MiniSession.playOut(EchoGame.def, params(species, stage, sick: sick), seed: seed) { bot.decide($0, $1) }
        return g as! EchoGame
    }

    private func newGame(_ seed: Int = 5, species: String? = nil) -> EchoGame {
        let sp = species ?? adultOf("fox").id
        return EchoGame(seed: seed, params: params(sp))
    }

    /// Step an idle game until the player's turn.
    @discardableResult
    private func toInput(_ g: EchoGame) -> EchoState {
        var n = 0
        while g.state.phase != .input && n < 2000 { g.step(idle, dtMs: 50); n += 1 }
        return g.state
    }

    private func rows(_ text: String) -> [[String]] {
        text.split(separator: ",").map { $0.split(separator: "|", omittingEmptySubsequences: false).map(String.init) }
    }

    // MARK: 1. Expo golden traces

    func testPatternsReproduceTheExpoPatterns() {
        let seeds = MiniGameData.goldenEchoPatterns.split(separator: ",")
        XCTAssertEqual(seeds.count, 12)
        for entry in seeds {
            let parts = entry.split(separator: ":").map(String.init)
            guard parts.count == 2, let seed = Int(parts[0]) else { XCTFail("bad golden pattern row"); continue }
            let mine: String = EchoGame.makePatterns(seed).map { $0.map { String($0) }.joined() }.joined(separator: "/")
            XCTAssertEqual(mine, parts[1], "seed \(seed): the same patterns as Expo")
        }
    }

    func testScriptedRunsReproduceTheExpoScores() {
        let golden = rows(MiniGameData.goldenEcho)
        XCTAssertGreaterThanOrEqual(golden.count, 12)
        for f in golden {
            guard f.count == 13, let stage = Stage(rawValue: f[1]), let seed = Int(f[4]) else { XCTFail("bad golden row \(f)"); continue }
            let g = play(f[0], f[3], seed, stage: stage, sick: f[2] == "1")
            let s = g.state
            let label = "\(f[0]) \(f[1]) \(f[3]) seed \(seed)"
            XCTAssertEqual(g.score, Int(f[5]), "\(label): score")
            XCTAssertEqual(s.points, Double(f[6]) ?? -1, accuracy: 0.0001, "\(label): points")
            XCTAssertEqual(s.cleared, Int(f[7]), "\(label): rounds cleared")
            XCTAssertEqual(s.mistakes, Int(f[8]), "\(label): mistakes")
            XCTAssertEqual(s.round, Int(f[9]), "\(label): round reached")
            XCTAssertEqual(s.retries, Int(f[10]), "\(label): retries left")
            XCTAssertEqual(s.won ? 1 : 0, Int(f[11]), "\(label): won")
            XCTAssertEqual(s.t, Double(f[12]) ?? -1, accuracy: 0.001, "\(label): game time")
        }
    }

    // MARK: 2. the pattern generator and the numbers

    func testPatternRules() {
        XCTAssertEqual(EchoGame.lengths, [3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8])
        XCTAssertEqual(EchoGame.rounds, 12)
        XCTAssertEqual(EchoGame.thresholds, Thresholds(bronze: 14, silver: 38, gold: 78))
        XCTAssertEqual(EchoGame.activeSlots(0), [0, 2, 4])
        XCTAssertEqual(EchoGame.activeSlots(EchoGame.unlockAB), [0, 1, 2, 4])
        XCTAssertEqual(EchoGame.activeSlots(EchoGame.unlockBC), [0, 1, 2, 3, 4])
        var bad = 0, repeats = 0, newMissing = 0
        for seed in 1...60 {
            let ps = EchoGame.makePatterns(seed)
            if ps.count != EchoGame.rounds { bad += 1; continue }
            for (r, p) in ps.enumerated() {
                let act = EchoGame.activeSlots(r)
                if p.count != EchoGame.lengths[r] || !p.allSatisfy({ act.contains($0) }) { bad += 1 }
                if p.count > 2 { for i in 2..<p.count where p[i] == p[i - 1] && p[i] == p[i - 2] { bad += 1 } }
                if Set(p).count < 2 { bad += 1 }
                if r > 0 && p == ps[r - 1] { repeats += 1 }
            }
            if !ps[EchoGame.unlockAB].contains(1) { newMissing += 1 }
            if !ps[EchoGame.unlockBC].contains(3) { newMissing += 1 }
            if EchoGame.makePatterns(seed) != ps { bad += 1 }
        }
        XCTAssertEqual(bad, 0, "right length, only unlocked slots, never 3 in a row, 2+ symbols, deterministic")
        XCTAssertEqual(repeats, 0, "the same pattern never comes twice in a row")
        XCTAssertEqual(newMissing, 0, "a round that unlocks a pad uses it")
        XCTAssertNotEqual(EchoGame.makePatterns(1), EchoGame.makePatterns(2))
    }

    func testPadGeometryAndTapZones() {
        for k in [3, 4, 5] {
            let r = EchoGame.padRects(k)
            XCTAssertEqual(r.count, k)
            for (i, q) in r.enumerated() {
                XCTAssertTrue(q.x >= 0 && q.x + q.w <= 64 && q.y + q.h <= 63 && q.w >= 10, "\(k) pads: pad \(i) fits")
                if i > 0 { XCTAssertGreaterThanOrEqual(q.x, r[i - 1].x + r[i - 1].w, "\(k) pads do not overlap") }
            }
        }
        let g = newGame()
        for round in [0, EchoGame.unlockAB, EchoGame.unlockBC] {
            g.state.active = EchoGame.activeSlots(round)
            let zones = EchoGame.tapZones(g)
            XCTAssertEqual(zones.count, g.state.active.count + 1, "the pads plus the stage")
            XCTAssertEqual(zones.first?.x, 0)
            let pads = Array(zones.dropLast())
            XCTAssertEqual(pads.last.map { $0.x + $0.w }, 64, "the pad zones reach both edges")
            for i in 1..<pads.count { XCTAssertEqual(pads[i - 1].x + pads[i - 1].w, pads[i].x, "pad zones tile with no gap") }
            XCTAssertEqual(zones.last?.id, "stage")
            XCTAssertTrue(zones.last.map { $0.y + $0.h <= EchoGame.padY } ?? false, "the stage zone stays above the pads")
        }
        XCTAssertNotNil(EchoGame.def.tapZones)
    }

    func testScoringNumbers() {
        XCTAssertEqual(EchoGame.roundPoints(4, 0), 4, accuracy: 1e-9)
        XCTAssertEqual(EchoGame.roundPoints(4, 5), 6, accuracy: 1e-9)
        XCTAssertEqual(EchoGame.roundPoints(4, 50), 6, accuracy: 1e-9, "the streak bonus is capped at +50%")
        XCTAssertGreaterThanOrEqual(EchoGame.litFor(11, 0), 320)
        XCTAssertLessThan(EchoGame.litFor(11, 0), EchoGame.litFor(0, 0))
        XCTAssertEqual(EchoGame.litFor(0, 100), 800)
        XCTAssertEqual(EchoGame.gapFor(0), 260)
        XCTAssertEqual(EchoGame.gapFor(11), 140)
    }

    // MARK: 3. controls

    func testPressesBeforeThePlayersTurnAreIgnored() {
        let g = newGame()
        for _ in 0..<12 { g.step(GameInput(left: true, right: true, act: true), dtMs: 50) }
        XCTAssertEqual(g.state.mistakes, 0)
        XCTAssertEqual(g.state.entered, 0)
    }

    func testButtonsPlayTheirPads() {
        let cases: [(GameInput, Int)] = [(GameInput(left: true), 0), (GameInput(act: true), 2), (GameInput(right: true), 4)]
        for (inp, slot) in cases {
            let g = newGame()
            let want = toInput(g).pattern[0]
            g.step(inp, dtMs: 50)
            XCTAssertEqual(g.state.pressed, slot, "the button for slot \(slot) plays that pad")
            if slot == want { XCTAssertEqual(g.state.entered, 1) } else { XCTAssertEqual(g.state.mistakes, 1) }
        }
    }

    func testTapsPickPadsAndTheStageIsIgnored() {
        let g = newGame()
        toInput(g)
        let zones = EchoGame.tapZones(g)
        g.step(GameInput(pick: zones.count - 1), dtMs: 50)
        XCTAssertTrue(g.state.mistakes == 0 && g.state.entered == 0, "a tap on the stage is ignored")
        g.step(GameInput(pick: 99), dtMs: 50)
        XCTAssertEqual(g.state.mistakes, 0, "a pick outside the pads is ignored")
        let want = g.state.pattern[0]
        g.step(GameInput(pick: g.state.active.firstIndex(of: want) ?? 0), dtMs: 50)
        XCTAssertEqual(g.state.entered, 1, "a tap on the right pad counts")
    }

    /// A game at the start of round 4 (A+B in play) waiting for the first answer, with a known pattern.
    private func chordGame(_ pattern: [Int], rounds clearTo: Int = EchoGame.unlockAB) -> EchoGame {
        let g = newGame()
        let bot = EchoBot(skill: "perfect", seed: 5)
        var t: Double = 0
        while g.state.round < clearTo && t < 400_000 {
            g.step(bot.decide(g, t), dtMs: 50)
            t += 50
        }
        toInput(g)
        g.state.pattern = pattern
        g.state.patterns[g.state.round] = pattern
        return g
    }

    func testChordTiming() {
        // A then B 50 ms apart is the A+B chord
        let c = chordGame([1, 0, 2, 1])
        XCTAssertEqual(c.state.active, [0, 1, 2, 4])
        c.step(GameInput(left: true), dtMs: 50)
        c.step(GameInput(act: true), dtMs: 50)
        for _ in 0..<4 { c.step(idle, dtMs: 50) }
        XCTAssertTrue(c.state.entered == 1 && c.state.mistakes == 0, "A then B within 100 ms is the A+B chord")
        // 250 ms apart they are two presses: A is wrong where A+B was wanted
        let d = chordGame([1, 0, 2, 1])
        d.step(GameInput(left: true), dtMs: 50)
        for _ in 0..<4 { d.step(idle, dtMs: 50) }
        d.step(GameInput(act: true), dtMs: 50)
        for _ in 0..<4 { d.step(idle, dtMs: 50) }
        XCTAssertEqual(d.state.mistakes, 1, "A then B 250 ms apart are two separate presses")
        // both buttons in the same step are a chord too
        let e = chordGame([1, 0, 2, 1])
        e.step(GameInput(left: true, act: true), dtMs: 50)
        XCTAssertEqual(e.state.entered, 1, "both buttons in one step are a chord")
        // a single lone press is held for the chord window (100 ms), then counts as itself
        let f = chordGame([0, 1, 2, 4])
        f.step(GameInput(left: true), dtMs: 50)
        XCTAssertEqual(f.state.entered, 0, "a lone press waits for a possible chord partner")
        f.step(idle, dtMs: 50)
        f.step(idle, dtMs: 50)
        XCTAssertEqual(f.state.entered, 1, "and counts as itself after 100 ms")
        // A and C together are not a chord pad: they are two presses, in order A then C
        let h = chordGame([0, 4, 2, 0])
        h.step(GameInput(left: true, right: true), dtMs: 50)
        XCTAssertTrue(h.state.entered == 2 && h.state.mistakes == 0, "A and C together play A then C")
        // B+C needs round 7
        let k = chordGame([3, 1, 2, 3], rounds: EchoGame.unlockBC)
        XCTAssertEqual(k.state.active, [0, 1, 2, 3, 4])
        k.step(GameInput(right: true, act: true), dtMs: 50)
        XCTAssertTrue(k.state.entered == 1 && k.state.mistakes == 0, "B and C together are the B+C chord")
        // with 4 pads in play, B and C together are two separate presses
        let m = chordGame([2, 4, 0, 2])
        m.step(GameInput(right: true, act: true), dtMs: 50)
        XCTAssertTrue(m.state.entered == 2 && m.state.mistakes == 0, "without the B+C pad, B and C are plain presses")
    }

    func testOneRetryThenTheRunEnds() {
        let g = newGame()
        let s0 = toInput(g)
        let first = s0.pattern
        func wrong(_ slot: Int) -> GameInput { slot == 0 ? GameInput(right: true) : GameInput(left: true) }
        g.step(wrong(first[0]), dtMs: 50)
        XCTAssertTrue(g.state.phase == .oops && g.state.retries == 0 && g.state.mood == .shrug, "the pet shrugs and the retry is used")
        var n = 0
        while g.state.phase != .input && n < 2000 { g.step(idle, dtMs: 50); n += 1 }
        XCTAssertTrue(g.state.round == 0 && g.state.pattern == first && g.state.entered == 0, "the retry shows the same pattern again")
        g.step(wrong(g.state.pattern[0]), dtMs: 50)
        n = 0
        while !g.done && n < 2000 { g.step(idle, dtMs: 50); n += 1 }
        XCTAssertTrue(g.done && !g.state.won, "the second mistake ends the run")
        XCTAssertEqual(g.overLabel, "OOPS")
    }

    func testIdlePlayerEndsTheRunWithNothing() {
        let g = newGame()
        var n = 0
        while !g.done && n < 6000 { g.step(idle, dtMs: 50); n += 1 }
        XCTAssertTrue(g.done && g.score == 0 && g.rank == .none)
    }

    func testPressesMakeSounds() {
        let g = newGame()
        toInput(g)
        let seq = g.state.sfx.seq
        g.step(GameInput(left: true), dtMs: 50)
        XCTAssertGreaterThan(g.state.sfx.seq, seq)
        XCTAssertEqual(g.sfx?.seq, g.state.sfx.seq)
    }

    func testAPerfectRunSaysCleared() {
        let g = play(adultOf("fox").id, "perfect", 2)
        XCTAssertTrue(g.state.won && g.done)
        XCTAssertEqual(g.overLabel, "CLEARED")
        XCTAssertEqual(g.progress, 1, accuracy: 1e-9)
    }

    // MARK: 4. bots

    func testPerfectBotClearsEveryRoundForEveryFamily() {
        var expectBase: Double = 0
        for (i, n) in EchoGame.lengths.enumerated() { expectBase += EchoGame.roundPoints(n, i) }
        for fam in MiniThemes.families {
            let sp = adultOf(fam)
            for seed in [1, 2] {
                let g = play(sp.id, "perfect", seed)
                let s = g.state
                XCTAssertTrue(g.done && s.won && s.cleared == EchoGame.rounds && s.mistakes == 0, "\(fam)/\(seed): all 12 rounds, no mistake")
                let mul = params(sp.id).scoreMul
                XCTAssertEqual(g.score, Int((expectBase * mul + 1e-9).rounded(.down)), "\(fam)/\(seed): the perfect score")
                XCTAssertEqual(g.rank, .gold, "\(fam)/\(seed): gold")
            }
        }
    }

    func testPerfectBotClearsEveryStageAndKind() {
        let stages: [Stage] = [.baby, .child, .teen, .adult, .ultimate]
        for (ki, kind) in MiniTuning.allKinds.enumerated() where ki % 6 == 0 {
            guard let sp = Species.all.first(where: { MiniTuning.bodyKind(ofSpecies: $0.id) == kind }) else { continue }
            let g = play(sp.id, "perfect", 10 + ki, stage: stages[ki % 5])
            XCTAssertTrue(g.done && g.state.cleared == EchoGame.rounds, "\(kind): clearable")
        }
        for (i, sp) in Species.all.enumerated() where i % 17 == 0 {
            let g = play(sp.id, "perfect", 20 + i)
            XCTAssertTrue(g.done && g.state.cleared == EchoGame.rounds, "\(sp.id): clearable")
        }
    }

    func testARandomBotNeverReachesBronze() {
        var best = 0
        for fam in MiniThemes.families {
            for seed in 1...5 {
                let g = play(adultOf(fam).id, "random", seed)
                best = max(best, g.score)
                XCTAssertEqual(g.rank, .none, "\(fam)/\(seed): a random player gets nothing (\(g.score))")
            }
        }
        XCTAssertLessThan(best, EchoGame.thresholds.bronze)
    }

    func testSkilledBotsOrderByScore() {
        var mean: [String: Double] = [:]
        for skill in ["good", "okay", "casual"] {
            var sum = 0, n = 0
            for fam in MiniThemes.families {
                for seed in 1...6 { sum += play(adultOf(fam).id, skill, seed).score; n += 1 }
            }
            mean[skill] = Double(sum) / Double(n)
        }
        XCTAssertGreaterThan(mean["good"] ?? 0, mean["okay"] ?? 0)
        XCTAssertGreaterThan(mean["okay"] ?? 0, mean["casual"] ?? 0)
    }

    // MARK: 5. pet modifiers, determinism

    func testMemoryModifiersAndTheFavouriteMultiplier() {
        func species(ofKind k: String) -> Species { Species.all.first { MiniTuning.bodyKind(ofSpecies: $0.id) == k }! }
        let brainy = params(species(ofKind: "floppy").id)
        let dull = params(species(ofKind: "dozer").id)
        XCTAssertGreaterThan(EchoGame.memoryBonus(brainy), EchoGame.memoryBonus(dull), "a high-memory body type sees each symbol for longer")
        XCTAssertGreaterThan(EchoGame.idleFor(brainy), EchoGame.idleFor(dull), "and has more patience")
        var smart = dull; smart.smarts = 90
        var dim = dull; dim.smarts = 10
        XCTAssertGreaterThan(EchoGame.memoryBonus(smart), EchoGame.memoryBonus(dim), "smarts add display time")
        var baby = dull; baby.stage = .baby
        var adult = dull; adult.stage = .adult
        XCTAssertGreaterThan(EchoGame.memoryBonus(baby), EchoGame.memoryBonus(adult), "a baby gets more display time")
        let sick = params(species(ofKind: "dozer").id, .adult, sick: true)
        XCTAssertLessThanOrEqual(EchoGame.memoryBonus(sick), EchoGame.memoryBonus(dull), "a sick pet sees symbols for less time")
        let favourite = Species.all.first { params($0.id).scoreMul > 1 }!
        let plain = Species.all.first { params($0.id).scoreMul == 1 }!
        let a = play(favourite.id, "perfect", 4).score
        let b = play(plain.id, "perfect", 4).score
        XCTAssertTrue(abs(Double(a) - Double(b) * 1.25) < 1.01, "the favourite game multiplies the score by 1.25 (\(a) vs \(b))")
    }

    func testDeterministicAndAnyStepSizePlaysTheSameGame() {
        let sp = adultOf("bot").id
        func run(_ stepMs: Double) -> String {
            let bot = EchoBot(skill: "good", seed: 3)
            let g = MiniSession.playOut(EchoGame.def, params(sp), seed: 3, stepMs: stepMs) { bot.decide($0, $1) } as! EchoGame
            return "\(g.score)|\(g.state.cleared)|\(g.state.mistakes)"
        }
        XCTAssertEqual(run(50), run(50))
        let g = newGame(1)
        XCTAssertTrue(EchoGame.def.maxMs > 60_000 && g.progress == 0 && g.hud.left.count <= 16 && g.hud.right.count <= 16)
        XCTAssertEqual(g.id, "echo")
    }

    func testRegisteredAsOneGame() {
        XCTAssertEqual(MiniGames.all.filter { $0.def.id == "echo" }.count, 1)
        XCTAssertEqual(MiniGames.entry("echo")?.layout == .field, true)
        XCTAssertEqual(MiniGameID.all.contains("echo"), true)
    }

    // MARK: 6. painting

    /// Every family paints every phase in both looks (Technicolor = all cells, Traditional = the lit ones) with the pet on screen.
    func testEveryFamilyPaintsEveryPhase() {
        for fam in MiniThemes.families {
            let sp = adultOf(fam)
            let p = pet(sp.id)
            let prm = MiniTuning.params(for: p, game: "echo")
            var seen = Set<String>()
            for skill in ["perfect", "random"] {
                let s = MiniSession(def: EchoGame.def, params: prm, seed: 6)
                s.begin()
                let bot = EchoBot(skill: skill, seed: 6)
                var t: Double = 0
                while s.phase == .play && t < 200_000 {
                    if let g = s.game { s.pending = bot.decide(g, t) }
                    _ = s.tick(50)
                    t += 50
                    guard let g = s.game as? EchoGame else { continue }
                    let st = g.state
                    let key = "\(st.phase)\(st.active.count)\(st.mood)"
                    if !seen.contains(key) || Int(t) % 10000 == 0 {
                        seen.insert(key)
                        let r = MiniPaint.frame(session: s, pet: p, ms: t)
                        XCTAssertGreaterThan(r.inkCount, 40, "\(fam)/\(skill)/\(st.phase): Traditional paints")
                        XCTAssertGreaterThanOrEqual(r.cells.filter { $0 != 0 }.count, r.inkCount, "\(fam)/\(st.phase): Technicolor paints at least as much")
                        let petPixels = r.cells.filter { $0 >= SceneLayer.bodyLight.rawValue && $0 <= SceneLayer.glint.rawValue && $0 != SceneLayer.ball.rawValue }.count
                        XCTAssertGreaterThan(petPixels, 8, "\(fam)/\(st.phase): the pet is drawn")
                    }
                }
                // the banner frame after the game
                let r = MiniPaint.frame(session: s, pet: p, ms: t)
                XCTAssertGreaterThan(r.inkCount, 40, "\(fam)/\(skill): the game over frame paints")
            }
            for phase in ["intro", "show", "input", "ok", "oops"] {
                XCTAssertTrue(seen.contains(where: { $0.hasPrefix(phase) }), "\(fam): painted \(phase)")
            }
            XCTAssertTrue(seen.contains(where: { $0.hasPrefix("show5") || $0.hasPrefix("input5") }), "\(fam): painted the five-pad round")
        }
    }

    func testALitPadIsASolidBlockAndNewPadsAreLabelled() {
        let sp = adultOf("fox")
        let p = pet(sp.id)
        let s = MiniSession(def: EchoGame.def, params: MiniTuning.params(for: p, game: "echo"), seed: 6)
        s.begin()
        let g = s.game as! EchoGame
        var n = 0
        while !(g.state.phase == .show && g.state.lit >= 0) && n < 400 { _ = s.tick(50); n += 1 }
        XCTAssertGreaterThanOrEqual(g.state.lit, 0)
        let slot = g.state.lit
        let rects = EchoGame.padRects(g.state.active.count)
        let q = rects[g.state.active.firstIndex(of: slot) ?? 0]
        let r = MiniPaint.frame(session: s, pet: p, ms: 0)
        var lit = 0, area = 0
        for y in (q.y + 1)..<(q.y + q.h - 1) {
            for x in (q.x + 1)..<(q.x + q.w - 1) {
                area += 1
                if r.cells[y * SceneRaster.side + x] != 0 { lit += 1 }
            }
        }
        XCTAssertEqual(lit, area, "the lit pad is filled edge to edge")
    }
}
