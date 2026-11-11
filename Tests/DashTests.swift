import XCTest

/// A scripted DASH player with adjustable skill: the same lookahead bot as expo-prototype/test/dash-bots.ts. Deterministic (seeded).
final class DashBot {
    struct Skill {
        var jitter: Double
        var late: Double
        var miss: Double
    }

    static let perfect = Skill(jitter: 0, late: 0, miss: 0)
    static let good = Skill(jitter: 2, late: 0, miss: 0.04)
    static let okay = Skill(jitter: 3, late: 1, miss: 0.12)
    static let casual = Skill(jitter: 4, late: 1, miss: 0.25)
    static func skill(_ name: String) -> Skill {
        switch name {
        case "good": return good
        case "okay": return okay
        case "casual": return casual
        default: return perfect
        }
    }

    private let skill: Skill
    private let rng: MiniRng
    private let mid: Int
    private var target = -1
    private var offset: Double = 0
    private var skip = false

    init(tuning: Tuning, skill: Skill, seed: Int) {
        self.skill = skill
        rng = MiniRng(seed: seed * 104729 + 3)
        mid = MiniPaint.jsRound(Double(DashGame.jumpFor(tuning, healthy: false).airTicks) / 2)
    }

    func decide(_ game: MiniGame) -> GameInput {
        guard let g = game as? DashGame else { return GameInput() }
        let s = g.state
        if s.cd > 0 || !s.grounded || s.stun > 0 { return GameInput() }
        let left: Double = s.petX - s.hbW / 2
        let live: [DashObstacle] = s.obstacles.filter { !$0.settled && !$0.hit && $0.x + $0.hr > left }.sorted { $0.x < $1.x }
        guard let first = live.first else { return GameInput() }
        var grp: [DashObstacle] = [first]
        var i = 1
        while i < live.count {
            guard let lastG = grp.last else { break }
            if live[i].x + live[i].hl - (lastG.x + lastG.hr) < 12 { grp.append(live[i]) } else { break }
            i += 1
        }
        if grp[0].id != target {
            target = grp[0].id
            offset = skill.late + (skill.jitter != 0 ? (rng.next() * 2 - 1) * skill.jitter : 0)
            skip = rng.chance(skill.miss)
        }
        if skip { return GameInput() }
        guard let lastG = grp.last else { return GameInput() }
        let centre: Double = (grp[0].x + grp[0].hl + lastG.x + lastG.hr) / 2 - s.petX
        let ticks: Double = centre / (s.speed * 0.05)
        return ticks <= Double(mid) + 0.5 + offset ? GameInput(act: true) : GameInput()
    }
}

/// Mirrors expo-prototype/test/dash.ts (sampled to stay fast): the generated Expo golden traces, a perfect bot that is never hit,
/// mashing and standing still, determinism, the course not depending on health, and every family painting every phase.
final class DashTests: XCTestCase {
    private let stages: [Stage] = [.baby, .child, .teen, .adult, .ultimate]
    private let t0: Double = 1_800_000_000

    private func speciesOfKind(_ kind: String) -> Species {
        Species.all.first { MiniTuning.bodyKind(ofSpecies: $0.id) == kind }!
    }

    private func adultOf(_ family: String) -> Species {
        let all = Species.all
        return all.first { $0.family == family && $0.stage == .adult } ?? all.first { $0.family == family }!
    }

    private func params(_ species: String, _ stage: Stage, sick: Bool = false, heavy: Bool = false, hunger: Int = 4, mul: Double? = nil) -> GameParams {
        var p = MiniTuning.params(for: MiniBody(species: species, stage: stage, heavy: heavy, sick: sick, hunger: hunger), game: "dash")
        if let mul { p.scoreMul = mul }
        return p
    }

    private func sampleKinds(_ every: Int) -> [String] {
        MiniTuning.allKinds.enumerated().filter { $0.offset % every == 0 }.map { $0.element }
    }

    private func pet(_ species: String, stage: Stage = .adult) -> Pet {
        var p = Pet(now: Date(timeIntervalSince1970: t0 - 86400 * 10))
        p.seed = 9
        p.stage = stage
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

    private func play(_ kind: String, _ stage: Stage, _ seed: Int, _ who: String, mul: Bool = false) -> DashGame {
        let p = params(speciesOfKind(kind).id, stage, mul: mul ? nil : 1)
        let g = DashGame(seed: seed, params: p)
        let bot = DashBot(tuning: p.tuning, skill: DashBot.skill(who), seed: seed)
        let rng = MiniRng(seed: seed * 5 + 1)
        var t: Double = 0
        while !g.done && t <= DashGame.def.maxMs + 5000 {
            var inp = GameInput()
            switch who {
            case "mash": inp = GameInput(act: rng.chance(0.2))
            case "mash2":
                let l = rng.chance(0.5)
                inp = GameInput(left: l, act: rng.chance(0.5))
            case "idle": break
            default: inp = bot.decide(g)
            }
            g.step(inp, dtMs: 50)
            t += 50
        }
        return g
    }

    private func f6(_ v: Double) -> String { String(format: "%.4f", v) }

    private func summary(_ g: DashGame) -> [String] {
        let s = g.state
        return ["\(g.score)", "\(s.points)", "\(s.cleared)", "\(s.hits)", "\(s.near)", "\(s.picked)", "\(s.jumps)", f6(s.dist)]
    }

    // MARK: 1. golden traces: Expo played these, Swift must end the same way

    func testDashReproducesTheExpoTraces() {
        let rows = MiniGameData.goldenDash.split(separator: ",").map { $0.split(separator: "|", omittingEmptySubsequences: false).map(String.init) }
        XCTAssertGreaterThanOrEqual(rows.count, 18)
        for f in rows {
            guard f.count == 14, let seed = Int(f[5]), let stage = Stage(rawValue: f[1]) else { XCTFail("bad golden row \(f)"); continue }
            let p = params(f[0], stage, sick: f[2] == "1", heavy: f[3] == "1", hunger: Int(f[4]) ?? 4)
            let rng = MiniRng(seed: seed * 977 + 5)
            let g = DashGame(seed: seed, params: p)
            var t: Double = 0
            while !g.done && t <= DashGame.def.maxMs + 5000 {
                let l = rng.chance(0.1), r = rng.chance(0.1), a = rng.chance(0.15)
                g.step(GameInput(left: l, right: r, act: a), dtMs: 50)
                t += 50
            }
            XCTAssertEqual(summary(g), Array(f[6...]), "\(f[0]) \(f[1]) seed \(seed): mashing trace")
        }
    }

    func testDashBotReproducesTheExpoTraces() {
        let rows = MiniGameData.goldenDashBot.split(separator: ",").map { $0.split(separator: "|", omittingEmptySubsequences: false).map(String.init) }
        XCTAssertGreaterThanOrEqual(rows.count, 12)
        for f in rows {
            guard f.count == 15, let seed = Int(f[5]), let stage = Stage(rawValue: f[1]) else { XCTFail("bad golden row \(f)"); continue }
            let p = params(f[0], stage, sick: f[2] == "1", heavy: f[3] == "1", hunger: Int(f[4]) ?? 4)
            let bot = DashBot(tuning: p.tuning, skill: DashBot.skill(f[6]), seed: seed)
            let g = DashGame(seed: seed, params: p)
            var t: Double = 0
            while !g.done && t <= DashGame.def.maxMs + 5000 {
                g.step(bot.decide(g), dtMs: 50)
                t += 50
            }
            XCTAssertEqual(summary(g), Array(f[7...]), "\(f[0]) \(f[1]) seed \(seed) \(f[6]): bot trace")
        }
    }

    func testDashCourseAndBoxesMatchExpo() {
        let rows = MiniGameData.goldenDashCourse.split(separator: ",").map { $0.split(separator: "|", omittingEmptySubsequences: false).map(String.init) }
        XCTAssertGreaterThanOrEqual(rows.count, 12)
        for f in rows {
            guard f.count == 8, let seed = Int(f[5]), let stage = Stage(rawValue: f[1]) else { XCTFail("bad golden row \(f)"); continue }
            let g = DashGame(seed: seed, params: params(f[0], stage, sick: f[2] == "1", heavy: f[3] == "1", hunger: Int(f[4]) ?? 4))
            for _ in 0..<90 { g.step(.none, dtMs: 50) }
            let obs = g.state.obstacles.map { "\($0.kind):\(MiniPaint.jsRound($0.x * 1000)):\(Int($0.h))" }.joined(separator: "/")
            let items = g.state.items.map { "\(MiniPaint.jsRound($0.x * 1000)):\(MiniPaint.jsRound($0.hc * 1000)):\($0.bonus ? 1 : 0):\($0.glyph)" }.joined(separator: "/")
            XCTAssertEqual(obs, f[6], "\(f[0]) seed \(seed): obstacles")
            XCTAssertEqual(items, f[7], "\(f[0]) seed \(seed): items")
        }
        for row in MiniGameData.dashBoxes.split(separator: ",") {
            let parts = row.split(separator: ":").map(String.init)
            guard parts.count == 2 else { XCTFail("bad box row"); continue }
            let theme = MiniThemes.theme(for: parts[0])
            let got = theme.obstacles.map { o -> String in
                let b = DashGame.obstacleBox(o)
                return [b.left, b.right, b.hl, b.hr, b.ho, b.h].map(String.init).joined(separator: ".")
            }.joined(separator: "/")
            XCTAssertEqual(got, parts[1], "\(parts[0]): obstacle hitboxes")
        }
    }

    // MARK: 2. determinism, geometry, rules

    func testDeterministicAndStepSizeIndependent() {
        let p = params(adultOf("fox").id, .adult)
        let a = play("fennec", .adult, 7, "good")
        let b = play("fennec", .adult, 7, "good")
        XCTAssertEqual(a.score, b.score)
        XCTAssertEqual(summary(a), summary(b))
        XCTAssertTrue(a.done && a.progress == 1)
        XCTAssertEqual(a.state.t, DashGame.ms, "the game lasts 40 s of play after the countdown")
        let e = DashGame(seed: 7, params: p), f = DashGame(seed: 7, params: p)
        for i in 0..<400 {
            let inp = GameInput(act: i % 13 == 5)
            e.step(inp, dtMs: 50)
            f.step(inp, dtMs: 10)
            for _ in 0..<4 { f.step(.none, dtMs: 10) }
        }
        XCTAssertEqual(summary(e), summary(f), "any step size plays the same game")
        XCTAssertEqual(e.state.obstacles, f.state.obstacles)
        let c = DashGame(seed: 8, params: p), d = DashGame(seed: 7, params: p)
        for _ in 0..<120 { c.step(.none, dtMs: 50); d.step(.none, dtMs: 50) }
        XCTAssertTrue(c.state.obstacles != d.state.obstacles, "another seed, another course")
    }

    func testJumpGeometryIsSane() {
        for kind in sampleKinds(6) {
            for stage in stages {
                let t = params(speciesOfKind(kind).id, stage).tuning
                let j = DashGame.jumpFor(t, healthy: true)
                let d = DashGame.dims(t)
                XCTAssertTrue(j.airTicks >= 8 && j.airTicks <= 20, "\(kind)/\(stage): jump lasts \(j.airTicks) ticks")
                XCTAssertTrue(j.apex >= 12 && j.apex <= 28, "\(kind)/\(stage): apex \(j.apex)")
                XCTAssertTrue(d.hbW >= 5 && d.hbW <= 9 && d.petW >= 12 && d.petW <= 20, "\(kind)/\(stage): hitbox")
                let sick = params(speciesOfKind(kind).id, stage, sick: true, heavy: true).tuning
                XCTAssertGreaterThan(DashGame.jumpFor(sick, healthy: false).apex, 0, "a sick and heavy pet still leaves the ground")
            }
        }
        for fam in MiniThemes.families {
            for o in MiniThemes.theme(for: fam).obstacles {
                let b = DashGame.obstacleBox(o)
                XCTAssertTrue(b.h >= 2 && b.h <= 6 && b.hr - b.hl >= 3 && b.hr - b.hl <= 7, "\(fam): hitbox sensible")
            }
        }
    }

    func testInputsCountdownHitsAndHud() {
        let p = params(adultOf("cat").id, .adult)
        for inp in [GameInput(left: true), GameInput(right: true), GameInput(act: true)] {
            let g = DashGame(seed: 1, params: p)
            for _ in 0..<40 { g.step(.none, dtMs: 50) }
            g.step(inp, dtMs: 50)
            g.step(.none, dtMs: 50)
            XCTAssertTrue(g.state.hp > 0 && g.state.jumps == 1, "A, a tap or B makes the pet jump")
        }
        let cd = DashGame(seed: 1, params: p)
        cd.step(GameInput(act: true), dtMs: 50)
        XCTAssertTrue(cd.state.jumps == 0 && cd.state.cd > 0 && cd.state.cd < DashGame.countMs, "the countdown ignores jumps")
        // standing in the way gets you hit, stuns and slows the world
        let h = DashGame(seed: 2, params: p)
        var seen = false
        var slowed = false
        var i = 0
        while i < 400 && !h.done {
            h.step(.none, dtMs: 50)
            if h.state.hits > 0 && !seen {
                seen = true
                XCTAssertTrue(h.state.streak == 0 && h.state.stun > 0, "a hit stuns and breaks the streak")
                h.step(.none, dtMs: 50)
                slowed = h.state.speed < 20
            }
            i += 1
        }
        XCTAssertTrue(seen && slowed, "standing in the way gets you hit, and the world slows")
        let g = play("cat", .adult, 1, "perfect")
        XCTAssertTrue(g.hud.left.hasPrefix("SCORE") && g.hud.right.count == 4 && g.hud.right.hasPrefix("0:"))
        XCTAssertGreaterThan(g.state.speed, 45, "the course speeds up")
        XCTAssertGreaterThan(g.state.picked, 15)
        // quick light kinds start faster than slow heavy ones
        let slow = DashGame(seed: 1, params: params(speciesOfKind("loaf").id, .adult)), quick = DashGame(seed: 1, params: params(speciesOfKind("fennec").id, .adult))
        for _ in 0..<60 { slow.step(.none, dtMs: 50); quick.step(.none, dtMs: 50) }
        XCTAssertGreaterThan(quick.state.speed, slow.state.speed)
        XCTAssertLessThanOrEqual(quick.state.hbW, slow.state.hbW)
        XCTAssertEqual(DashGame.def.rules(MiniThemes.theme(for: "fish")).count, 3)
        XCTAssertTrue(DashGame.def.rules(MiniThemes.theme(for: "fish"))[0].contains("SWIM"))
        XCTAssertFalse(DashGame.def.usesRight)
        XCTAssertNotNil(MiniGames.entry("dash"))
        XCTAssertEqual(MiniGames.entry("dash")?.layout == .field, true)
    }

    func testFavouriteMultiplierAndCourseIgnoresHealth() {
        let kind = MiniTuning.allKinds.first { params(speciesOfKind($0).id, .adult).scoreMul > 1 }!
        let a = play(kind, .adult, 1, "good", mul: true), b = play(kind, .adult, 1, "good")
        XCTAssertTrue(a.score == Int((Double(b.score) * 1.25 + 1e-9).rounded(.down)) || abs(Double(a.score) - Double(b.score) * 1.25) < 1.01, "x1.25: \(a.score) vs \(b.score)")
        let sp = speciesOfKind("cat").id
        func course(_ sick: Bool, _ heavy: Bool, _ hunger: Int) -> [DashObstacle] {
            let g = DashGame(seed: 11, params: params(sp, .adult, sick: sick, heavy: heavy, hunger: hunger))
            for _ in 0..<90 { g.step(.none, dtMs: 50) }
            return g.state.obstacles
        }
        let healthy = course(false, false, 4)
        XCTAssertEqual(healthy.map { $0.x }, course(false, true, 4).map { $0.x })
        XCTAssertEqual(healthy.map { $0.kind }, course(true, false, 4).map { $0.kind })
        XCTAssertEqual(healthy.map { $0.x }, course(false, false, 0).map { $0.x })
    }

    // MARK: 3. fairness: a perfect bot is never hit; mashing and standing still do not earn gold

    func testPerfectBotIsNeverHitAndClearsEveryStage() {
        var runs = 0
        for kind in sampleKinds(9) {
            for stage in stages {
                let g = play(kind, stage, 1, "perfect")
                runs += 1
                XCTAssertEqual(g.state.hits, 0, "perfect bot hit: \(kind)/\(stage)")
                XCTAssertGreaterThanOrEqual(g.score, DashGame.thresholds.gold, "\(kind)/\(stage): GOLD for a perfect run (\(g.score))")
                XCTAssertGreaterThanOrEqual(g.state.cleared, 18, "\(kind)/\(stage): enough obstacles")
            }
        }
        XCTAssertGreaterThanOrEqual(runs, 60)
        XCTAssertGreaterThanOrEqual(play("dino_trex", .adult, 4, "perfect", mul: true).score, DashGame.thresholds.gold)
    }

    func testMashingNeverReachesGoldAndStandingStillScoresNothing() {
        for kind in sampleKinds(10) {
            for stage in stages {
                for who in ["mash", "mash2"] {
                    let g = play(kind, stage, 2, who, mul: true)
                    XCTAssertLessThan(g.rank, .gold, "\(who) \(kind)/\(stage) reached gold (\(g.score))")
                }
                let idle = play(kind, stage, 1, "idle", mul: true)
                XCTAssertEqual(idle.rank, .none, "idle \(kind)/\(stage) earned \(idle.score)")
            }
        }
    }

    func testSkillLadderIsOrdered() {
        var by: [String: [Int]] = [:]
        for kind in sampleKinds(12) {
            for stage in stages {
                for who in ["perfect", "good", "okay", "casual"] { by[who, default: []].append(play(kind, stage, 1, who).score) }
            }
        }
        func median(_ xs: [Int]) -> Int { xs.sorted()[xs.count / 2] }
        let m = by.mapValues(median)
        XCTAssertTrue((m["perfect"] ?? 0) > (m["good"] ?? 0) && (m["good"] ?? 0) > (m["okay"] ?? 0) && (m["okay"] ?? 0) > (m["casual"] ?? 0), "ladder \(m)")
        XCTAssertGreaterThanOrEqual(m["good"] ?? 0, DashGame.thresholds.silver)
    }

    // MARK: 4. every family paints every phase

    func testEveryFamilyPaintsEveryPhase() {
        let moments: [Double] = [0, 300, 1200, 2000, 5000, 11000, 13500, 20000, 33000, 41000]
        for fam in MiniThemes.families {
            for stage in [Stage.baby, Stage.adult] {
                let sp = Species.all.first { $0.family == fam && $0.stage == stage } ?? adultOf(fam)
                let p = pet(sp.id, stage: sp.stage)
                let s = MiniSession(def: DashGame.def, params: MiniTuning.params(for: p, game: "dash"), seed: 6)
                _ = s.press(.b)
                guard let g = s.game else { XCTFail("no game"); continue }
                let bot = DashBot(tuning: s.params.tuning, skill: DashBot.okay, seed: 2)
                var t: Double = 0
                for upto in moments {
                    while t < upto && s.phase == .play {
                        s.pending = bot.decide(g)
                        _ = s.tick(50)
                        t += 50
                    }
                    let r = MiniPaint.frame(session: s, pet: p, ms: upto)
                    let label = "\(fam)/\(stage.rawValue)@\(Int(upto))"
                    // Traditional: one ink, a readable amount of it; Technicolor: the scenery adds colour pixels Traditional leaves unlit
                    let ink = r.inkCount
                    XCTAssertTrue(ink > 60 && ink < 2400, "\(label): Traditional keeps a readable amount of ink (\(ink))")
                    XCTAssertLessThanOrEqual(ink, r.cells.filter { $0 != 0 }.count, label)
                    let petPixels = r.cells.filter { $0 >= SceneLayer.bodyLight.rawValue && $0 <= SceneLayer.glint.rawValue && $0 != SceneLayer.ball.rawValue }.count
                    XCTAssertGreaterThan(petPixels, 8, "\(label): the pet is drawn")
                }
            }
        }
    }

    func testCountdownAndBannersAppear() {
        let p = pet(adultOf("fox").id)
        let s = MiniSession(def: DashGame.def, params: MiniTuning.params(for: p, game: "dash"), seed: 3)
        _ = s.press(.b)
        let early = MiniPaint.frame(session: s, pet: p, ms: 0)
        // the big countdown digit sits in a framed box at rows 14...34
        let boxRows: Int = (14...34).filter { y in (0..<64).contains { x in early.isSet(x, y) } }.count
        XCTAssertEqual(boxRows, 21)
        guard let g = s.game as? DashGame else { XCTFail("no dash"); return }
        while g.state.t < 13500 { g.step(.none, dtMs: 50) }
        let banner = MiniPaint.frame(session: s, pet: p, ms: 13500)
        XCTAssertGreaterThan(banner.cells.filter { $0 == SceneLayer.alert.rawValue }.count, 10, "the FASTER banner is drawn in the alert tone")
    }
}
