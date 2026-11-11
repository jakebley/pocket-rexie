import XCTest

/// A scripted CATCH player with adjustable skill: the same bot as expo-prototype/test/minigame-bots.ts, so the same
/// rank-threshold facts hold. Deterministic (seeded), no system randomness.
final class CatchBot {
    struct Skill {
        var react: Double
        var noise: Double
        var miss: Double
        var careful: Bool
        var vp: Double
    }

    static let skills: [(name: String, react: Double, noise: Double, miss: Double, careful: Bool)] = [
        ("perfect", 0, 0, 0, true),
        ("good", 250, 2, 0.1, true),
        ("okay", 450, 4, 0.25, true),
        ("casual", 650, 6, 0.4, false),
    ]

    private let skill: Skill
    private let rng: MiniRng
    private var queue: [(at: Double, inp: GameInput)] = []
    private var aim: [Int: Double] = [:]
    private let period: Double

    init(skill: Skill, seed: Int) {
        self.skill = skill
        rng = MiniRng(seed: seed * 7919 + 1)
        period = max(50, Double(MiniPaint.jsRound(skill.react / 2 / 50)) * 50)
    }

    /// The input for step time t (ms): commands reach the game `react` ms after the bot decided them.
    func decide(_ game: MiniGame, _ t: Double) -> GameInput {
        guard let g = game as? CatchGame else { return GameInput() }
        let s = g.state
        var inp = GameInput()
        let nowDecision = Int(t) % Int(period) == 0
        if s.stun <= 0 && nowDecision && !rng.chance(skill.miss) {
            let c = think(s)
            if c.left || c.right || c.act { queue.append((at: t + skill.react, inp: c)) }
        }
        while let first = queue.first, first.at <= t {
            queue.removeFirst()
            inp.left = inp.left || first.inp.left
            inp.right = inp.right || first.inp.right
            inp.act = inp.act || first.inp.act
        }
        return inp
    }

    private func think(_ s: CatchState) -> GameInput {
        var inp = GameInput()
        let hw = s.petW / 2 - 1 + CatchGame.item / 2 - 1
        let bads: [CatchItem] = s.items.filter { $0.kind == .bad }
        var goods: [CatchItem] = s.items.filter { $0.kind != .bad }
        if skill.careful {
            goods = goods.filter { g in
                !bads.contains { b in abs(b.arrival - g.arrival) < 350 && abs(b.x - g.x) < s.petW + 2 }
            }
        }
        goods = goods.enumerated().sorted { a, b in
            a.element.arrival != b.element.arrival ? a.element.arrival < b.element.arrival : a.offset < b.offset
        }.map { $0.element }
        var target: Double?
        for g in goods {
            let tLeft = (g.arrival - s.t) / 1000 + (s.petW / g.vy) * 0.4
            if abs(g.x - s.petX) - hw * 0.5 <= skill.vp * max(0, tLeft) + 1 {
                if aim[g.id] == nil { aim[g.id] = (rng.next() * 2 - 1) * skill.noise }
                target = g.x + (aim[g.id] ?? 0)
                break
            }
        }
        guard let tx = target else {
            // nothing to chase: step out of the way of a bad item above the pet
            if skill.careful {
                if let threat = bads.first(where: { abs($0.x - s.petX) < s.petW + 2 && $0.arrival - s.t < 900 }) {
                    if threat.x < s.petX { inp.right = s.dir != 1 } else { inp.left = s.dir != -1 }
                    return inp
                }
            }
            if s.dir != 0 { inp.act = true }
            return inp
        }
        let diff = tx - s.petX
        let stepPx = skill.vp * 0.05
        if abs(diff) <= max(1, stepPx) {
            if s.dir != 0 { inp.act = true }
        } else if diff < 0 {
            if s.dir != -1 { inp.left = true }
        } else if s.dir != 1 {
            inp.right = true
        }
        return inp
    }
}

/// Mirrors expo-prototype/test/minigames.ts: seeded randomness, themes, tuning, the score store, rewards and the day cap,
/// HI-LO, CATCH (determinism, rules, fairness, reachable thresholds), the registry and session machine, and every game
/// playing out for every family. The Expo traces in MiniGameData prove Swift plays the same games.
final class MiniGameTests: XCTestCase {
    private let stages: [Stage] = [.baby, .child, .teen, .adult, .ultimate]
    private let t0: Double = 1_800_000_000

    // MARK: helpers

    private func adultOf(_ family: String) -> Species {
        let all = Species.all
        return all.first { $0.family == family && $0.stage == .adult } ?? all.first { $0.family == family }!
    }

    private func speciesOfKind(_ kind: String) -> Species {
        Species.all.first { MiniTuning.bodyKind(ofSpecies: $0.id) == kind }!
    }

    private func catchParams(_ species: String, _ stage: Stage, sick: Bool = false, heavy: Bool = false, hunger: Int = 4,
                             mul: Double? = nil) -> GameParams {
        var p = MiniTuning.params(for: MiniBody(species: species, stage: stage, heavy: heavy, sick: sick, hunger: hunger), game: "catch")
        if let mul { p.scoreMul = mul }
        return p
    }

    private func pet(_ species: String, stage: Stage = .adult, edit: (inout Pet) -> Void = { _ in }) -> Pet {
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
        edit(&p)
        return p
    }

    private func memoryStore() -> MiniScoreStore {
        let suite = "com.pocketrexie.tests-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: suite)!
        d.removePersistentDomain(forName: suite)
        return MiniScoreStore(defaults: d)
    }

    private func entry(_ score: Int, species: String = "rawr", name: String = "Rexie") -> MiniScoreEntry {
        MiniScoreEntry(score: score, rank: 1, name: name, species: species, speciesName: species.uppercased(), date: t0)
    }

    private func stateHash(_ g: CatchGame) -> String {
        let s = g.state
        let items = s.items.map { "\($0.id):\($0.x):\($0.y):\($0.kind)" }.joined(separator: ",")
        return "\(s.t)|\(s.petX)|\(s.dir)|\(s.points)|\(s.caught)|\(s.hits)|\(s.missed)|\(s.stun)|\(items)"
    }

    // MARK: 1. seeded randomness

    func testRngIsDeterministicAndInRange() {
        let a = MiniRng(seed: 5), b = MiniRng(seed: 5), c = MiniRng(seed: 6)
        let xs = (0..<20).map { _ in a.next() }
        let ys = (0..<20).map { _ in b.next() }
        let zs = (0..<20).map { _ in c.next() }
        XCTAssertEqual(xs, ys, "same seed, same stream")
        XCTAssertNotEqual(xs, zs, "another seed, another stream")
        XCTAssertTrue(xs.allSatisfy { $0 >= 0 && $0 < 1 })
        let r = MiniRng(seed: 1)
        XCTAssertTrue((0..<200).allSatisfy { _ in let v = r.int(7); return v >= 0 && v < 7 })
    }

    // MARK: 2. themes

    func testThemesCoverEveryFamilyAndGlyphIsWellFormed() {
        let families = Species.families.map { $0.id }
        XCTAssertEqual(MiniThemes.families, families, "a theme for each of the 12 families, in family order")
        XCTAssertEqual(families.count, 12)
        for fam in families {
            guard let t = MiniThemes.all[fam] else { XCTFail("no theme for \(fam)"); continue }
            XCTAssertEqual(t.family, fam)
            XCTAssertGreaterThanOrEqual(t.good.count, 2, fam)
            XCTAssertGreaterThanOrEqual(t.bad.count, 2, fam)
            XCTAssertEqual(t.obstacles.count, 3, fam)
            XCTAssertEqual(t.symbols.count, 5, fam)
            for g in t.allGlyphs {
                let ok = g.rows.count == MiniGlyph.size && g.rows.allSatisfy { row in
                    row.count == MiniGlyph.size && row.allSatisfy { ".#aow".contains($0) }
                }
                XCTAssertTrue(ok, "\(fam)/\(g.name): 7x7 glyph with known characters")
                let lit = g.rows.joined().filter { $0 != "." }.count
                XCTAssertTrue(lit >= 8 && lit <= 45, "\(fam)/\(g.name): \(lit) lit pixels")
                let ink = g.rows.joined().filter { $0 == "#" || $0 == "a" }.count
                XCTAssertGreaterThanOrEqual(ink, 6, "\(fam)/\(g.name): enough ink without the detail pixels")
                XCTAssertTrue(g.name.count >= 3 && g.name.count <= 12 && g.name == g.name.uppercased(), "\(fam)/\(g.name): name")
            }
            let items = (t.good + [t.bonus] + t.bad).map { $0.name }
            XCTAssertEqual(Set(items).count, items.count, "\(fam): item names are distinct")
            XCTAssertEqual(Set(t.symbols.map { $0.rows.joined(separator: "|") }).count, 5, "\(fam): symbol bitmaps are distinct")
            for id in MiniGameID.all {
                let title = t.titles[id] ?? ""
                XCTAssertTrue(title.count > 0 && title.count <= 16 && title == title.uppercased(), "\(fam): \(id) title (\(title))")
            }
            for r in Rank.allCases {
                let line = t.winLine(r)
                XCTAssertTrue(line.count > 0 && line.count <= 18, "\(fam): win line for \(r.key)")
            }
            XCTAssertTrue(t.goodNoun.count <= 10 && t.badNoun.count <= 10, "\(fam): nouns fit")
        }
        XCTAssertEqual(MiniThemes.theme(for: "nope").family, "dino", "an unknown family falls back to dino")
        let firstItems = families.compactMap { MiniThemes.all[$0]?.good.first }.map { $0.main.rawValue + $0.name }
        XCTAssertEqual(Set(firstItems).count, 12, "each family collects something different")
    }

    // MARK: 3. tuning

    func testTuningCoversAll123BodyKindsAndFavourites() {
        XCTAssertEqual(MiniTuning.allKinds.count, 123)
        XCTAssertEqual(MiniTuning.kinds.count, 123)
        let used = Set(Reactions.kindOf.values)
        XCTAssertEqual(used, Set(MiniTuning.allKinds), "the tuning table lists exactly the kinds species have")
        for k in MiniTuning.allKinds {
            guard let t = MiniTuning.kinds[k] else { XCTFail("kind \(k)"); continue }
            XCTAssertTrue(t.speed >= 0.75 && t.speed <= 1.3 && t.size >= 0.75 && t.size <= 1.3, "\(k): speed and size in range")
            XCTAssertTrue(t.luck > 0 && t.luck <= 2 && t.memory >= 0 && t.memory <= 700, "\(k): luck and memory in range")
            XCTAssertTrue(MiniGameID.all.contains(t.favourite), "\(k): favourite is a known game (\(t.favourite))")
        }
        for s in Species.all { XCTAssertNotNil(MiniTuning.kinds[MiniTuning.bodyKind(ofSpecies: s.id)], "\(s.id): its kind has tuning") }
        for g in MiniGameID.all {
            XCTAssertTrue(MiniTuning.kinds.values.contains { $0.favourite == g }, "some body type loves \(g)")
        }
        XCTAssertEqual(MiniTuning.kinds["fennec"]?.favourite, "catch")
        XCTAssertEqual(MiniTuning.kinds["heron"]?.favourite, "dash")
        XCTAssertEqual(MiniTuning.kinds["brainfloat"]?.favourite, "echo")
        let fennec = MiniTuning.kinds["fennec"]!, dozer = MiniTuning.kinds["dozer"]!
        XCTAssertTrue(fennec.speed > dozer.speed && fennec.size < dozer.size, "light kinds are quick and small")
    }

    func testStageWeightAndHealthScaleTheTuning() {
        func tune(_ stage: Stage, heavy: Bool = false, sick: Bool = false, hunger: Int = 4) -> Tuning {
            MiniTuning.tuning(for: MiniBody(species: "swiftail", stage: stage, heavy: heavy, sick: sick, hunger: hunger))
        }
        let fine = tune(.adult)
        XCTAssertLessThan(tune(.baby).size, fine.size)
        XCTAssertGreaterThan(tune(.baby).baseSpeed, fine.baseSpeed)
        XCTAssertLessThan(tune(.adult, heavy: true).speed, fine.speed)
        XCTAssertTrue(tune(.adult, sick: true).speed < fine.speed && tune(.adult, sick: true).luck < fine.luck)
        XCTAssertLessThan(tune(.adult, hunger: 1).speed, fine.speed)
        XCTAssertLessThan(tune(.adult, hunger: 0).speed, tune(.adult, hunger: 1).speed)
        XCTAssertEqual(fine.baseSpeed, tune(.adult, heavy: true, sick: true, hunger: 0).baseSpeed, "baseSpeed ignores health and weight")
        let p = pet("swiftail")
        XCTAssertEqual(MiniTuning.favourite(of: p), "catch")
        XCTAssertEqual(MiniTuning.params(for: p, game: "catch").scoreMul, MiniTuning.favouriteMul)
        XCTAssertEqual(MiniTuning.params(for: p, game: "dash").scoreMul, 1)
        var heavy = pet("swiftail"); heavy.weight = 60
        XCTAssertEqual(MiniTuning.tuning(for: heavy).condition, .heavy)
        XCTAssertNil(MiniTuning.favourite(of: Pet(now: Date(timeIntervalSince1970: t0))), "an egg has no favourite")
    }

    // MARK: 4. the score store

    func testScoreStoreRecordsPersistsAndSurvivesBrokenData() {
        let suite = "com.pocketrexie.tests-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: suite)!
        d.removePersistentDomain(forName: suite)
        let st = MiniScoreStore(defaults: d)
        var r = st.submit("catch", entry(10))
        XCTAssertTrue(r.recordSpecies && r.recordOverall && r.previous == nil, "the first score is a record")
        r = st.submit("catch", entry(10))
        XCTAssertTrue(!r.recordSpecies && !r.recordOverall, "an equal score is not a record")
        r = st.submit("catch", entry(8))
        XCTAssertFalse(r.recordSpecies)
        XCTAssertEqual(st.best("catch", species: "rawr")?.score, 10)
        r = st.submit("catch", entry(12, species: "sprig", name: "Sprout"))
        XCTAssertTrue(r.recordOverall && r.recordSpecies)
        XCTAssertEqual(st.best("catch")?.name, "Sprout")
        r = st.submit("catch", entry(11))
        XCTAssertTrue(r.recordSpecies && !r.recordOverall, "a species record can be below the overall record")
        XCTAssertEqual(st.best("catch")?.score, 12)
        XCTAssertFalse(st.submit("hilo", entry(0)).recordOverall, "a score of 0 is never a record")
        XCTAssertNil(st.best("dash"))
        XCTAssertNil(st.best("catch", species: "nobody"))
        // a new store on the same defaults (an app restart, or a new pet) sees the same scores
        let st2 = MiniScoreStore(defaults: d)
        XCTAssertEqual(st2.best("catch")?.score, 12)
        XCTAssertEqual(st2.best("catch", species: "rawr")?.score, 11)
        XCTAssertEqual(st2.best("catch", species: "rawr")?.name, "Rexie")
        r = st2.submit("catch", entry(13, species: "rawr", name: "Second Pet"))
        XCTAssertTrue(r.recordOverall)
        XCTAssertEqual(st2.best("catch")?.name, "Second Pet")
        // another reader (the watch, a widget) reloads and sees it
        st.reload()
        XCTAssertEqual(st.best("catch")?.score, 13)
        // broken data starts empty and is kept for recovery
        let bad = UserDefaults(suiteName: suite + "-bad")!
        bad.removePersistentDomain(forName: suite + "-bad")
        bad.set(Data("{not json".utf8), forKey: MiniScoreStore.key)
        let st3 = MiniScoreStore(defaults: bad)
        XCTAssertNil(st3.best("catch"))
        XCTAssertTrue(st3.submit("catch", entry(3)).recordOverall)
        XCTAssertNotNil(bad.data(forKey: MiniScoreStore.key + ".unreadable"))
        let e = st2.best("catch")!
        XCTAssertTrue(e.date == t0 && !e.speciesName.isEmpty)
        st.clear()
        XCTAssertNil(st.best("catch"))
    }

    func testTheStoreUsesTheSharedAppGroupDefaultsByDefault() {
        // The default argument is PetStore.defaults (the app group), which is what the watch and widgets read.
        let suite = "com.pocketrexie.tests-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: suite)!
        d.removePersistentDomain(forName: suite)
        PetStore.overrideDefaults = d
        defer { PetStore.overrideDefaults = nil }
        let a = MiniScoreStore()
        a.submit("catch", entry(7))
        let b = MiniScoreStore()
        XCTAssertEqual(b.best("catch")?.score, 7)
    }

    // MARK: 5. rewards and the day cap

    func testRewardsAndTheDayCap() {
        func mk() -> Pet { pet("rawr", stage: .adult) { $0.happy = 1; $0.smarts = 0; $0.weight = 40 } }
        XCTAssertEqual(CatchGame.thresholds.rank(of: 0), .none)
        XCTAssertEqual(CatchGame.thresholds.rank(of: 12), .bronze)
        XCTAssertEqual(CatchGame.thresholds.rank(of: 22), .silver)
        XCTAssertEqual(CatchGame.thresholds.rank(of: 99), .gold)
        var p = mk()
        var r = MiniRewards.apply(&p, rank: .bronze, now: t0)
        XCTAssertTrue(r.rewarded && p.smarts == 3 && p.happy == 1 && p.stageSmarts == 3, "BRONZE: smarts +3, no heart")
        XCTAssertEqual(p.weight, 39, "weight burns a little")
        p = mk(); r = MiniRewards.apply(&p, rank: .silver, now: t0)
        XCTAssertTrue(p.smarts == 3 && p.happy == 2 && r.lines == ["SMARTS +3", "HAPPY +1"], "SILVER: smarts and a heart")
        p = mk(); r = MiniRewards.apply(&p, rank: .gold, now: t0)
        XCTAssertTrue(p.smarts == 3 && p.happy == 2, "GOLD: same as silver")
        p = mk(); r = MiniRewards.apply(&p, rank: .none, now: t0)
        XCTAssertTrue(r.rewarded && p.smarts == 0 && p.happy == 1 && p.weight == 39, "no rank: only the weight burn")
        p = mk(); p.happy = 4; r = MiniRewards.apply(&p, rank: .silver, now: t0)
        XCTAssertEqual(p.happy, 4, "hearts stay capped")
        // the cap: 3 rewarded plays per 24 h
        p = mk()
        let results = (0..<5).map { MiniRewards.apply(&p, rank: .silver, now: t0 + Double($0) * 60) }
        XCTAssertTrue(results[0..<3].allSatisfy { $0.rewarded && !$0.capped }, "the first 3 plays of the day are rewarded")
        XCTAssertTrue(results[3].capped && !results[3].rewarded && results[4].capped, "the 4th and 5th are capped")
        XCTAssertEqual(results[3].lines.joined(separator: " "), "DAY LIMIT NO REWARD")
        XCTAssertTrue(results[3].msg.lowercased().contains("no reward"))
        XCTAssertTrue(p.smarts == 9 && p.happy == 4, "a capped play changes nothing")
        XCTAssertEqual(MiniRewards.left(p, now: t0 + 300), 0)
        XCTAssertEqual(MiniRewards.left(p, now: t0 + MiniRewards.day + 60), 2, "the window slides")
        XCTAssertEqual(MiniRewards.left(p, now: t0 + MiniRewards.day + 180), 3)
        let later = MiniRewards.apply(&p, rank: .bronze, now: t0 + MiniRewards.day + 61)
        XCTAssertTrue(later.rewarded && p.rewardedPlays.count == 2, "after a day the next play is rewarded again")
        // the log survives the save (it is part of the pet)
        let data = try? JSONEncoder().encode(p)
        let reloaded = data.flatMap { try? JSONDecoder().decode(Pet.self, from: $0) }
        XCTAssertNotNil(reloaded)
        if let reloaded {
            XCTAssertEqual(MiniRewards.left(reloaded, now: t0 + MiniRewards.day + 62), MiniRewards.dailyRewardedPlays - 2)
        }
        // eggs and ghosts get nothing
        var egg = Pet(now: Date(timeIntervalSince1970: t0))
        XCTAssertEqual(egg.finishRanked(.gold), "...")
        XCTAssertEqual(MiniRewards.apply(&egg, rank: .gold, now: t0).msg, "")
        // economy: 20 plays in 10 hours still give 3 rewards
        var sim = mk()
        for i in 0..<20 { _ = MiniRewards.apply(&sim, rank: .gold, now: t0 + Double(i) * 1800) }
        XCTAssertEqual(sim.smarts, 9)
        // advance() keeps the play log
        var adv = mk()
        _ = MiniRewards.apply(&adv, rank: .gold, now: t0)
        adv.advance(to: adv.lastTick.addingTimeInterval(3600))
        XCTAssertEqual(adv.rewardedPlays.count, 1)
    }

    func testAnOldSaveWithoutTheRewardLogStillLoads() throws {
        var p = pet("rawr")
        p.rewardedPlays = [t0]
        let data = try JSONEncoder().encode(p)
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertNotNil(json["rewardedPlays"])
        json.removeValue(forKey: "rewardedPlays")
        let old = try JSONSerialization.data(withJSONObject: json)
        let loaded = try JSONDecoder().decode(Pet.self, from: old)
        XCTAssertEqual(loaded.rewardedPlays, [])
        XCTAssertEqual(loaded.species, "rawr")
        var l = loaded
        XCTAssertTrue(MiniRewards.apply(&l, rank: .bronze, now: t0).rewarded)
    }

    // MARK: 6. HI-LO

    private func playHiLo(_ seed: Int, _ choose: (HiLoState) -> GameInput) -> HiLoGame {
        let g = HiLoGame(seed: seed, params: MiniTuning.params(for: MiniBody(species: "rawr", stage: .adult), game: "hilo"))
        var t = 0
        while !g.done && t < 60000 {
            if g.state.phase == .guess { g.step(choose(g.state), dtMs: 50) } else { g.step(.none, dtMs: 100) }
            t += 100
        }
        return g
    }

    func testHiLoRulesAndDeterminism() {
        let act = GameInput(left: false, right: false, act: true, pick: nil)
        let a = playHiLo(3) { _ in act }, b = playHiLo(3) { _ in act }
        XCTAssertEqual(a.state, b.state)
        XCTAssertEqual(a.score, b.score)
        XCTAssertTrue(a.done && a.state.round == 5, "ends after 5 rounds")
        let params = MiniTuning.params(for: MiniBody(species: "rawr", stage: .adult), game: "hilo")
        for seed in 1...60 {
            let g = HiLoGame(seed: seed, params: params)
            let s0 = g.state
            XCTAssertTrue(s0.shown >= 2 && s0.shown <= 8 && s0.round == 1 && s0.phase == .guess && s0.sel == 0)
            g.step(GameInput(left: true), dtMs: 50)
            XCTAssertEqual(g.state.sel, 1, "A switches HIGHER to LOWER")
            g.step(GameInput(act: true), dtMs: 50)
            let s1 = g.state
            XCTAssertTrue(s1.phase == .reveal && s1.revealed != nil && s1.revealed != s1.shown, "B reveals a different digit")
            XCTAssertEqual(s1.correct, (s1.revealed ?? 0) < s1.shown, "LOWER wins when the digit is lower")
            g.step(.none, dtMs: HiLoGame.revealMs - 50)
            XCTAssertEqual(g.state.phase, .reveal, "the reveal lasts 1.4 s")
            g.step(.none, dtMs: 100)
            XCTAssertTrue(g.state.phase == .guess && g.state.round == 2 && g.state.sel == 1, "then the next round, same choice")
        }
        let p = HiLoGame(seed: 2, params: params)
        p.step(GameInput(pick: 1), dtMs: 50)
        XCTAssertTrue(p.state.sel == 1 && p.state.phase == .reveal, "a tap on a row chooses it")
        var wins = 0
        for seed in 1...200 { wins += playHiLo(seed) { _ in act }.state.won }
        let share = Double(wins) / 1000.0
        XCTAssertTrue(share > 0.3 && share < 0.7, "HI-LO is not rigged (\(share))")
        XCTAssertEqual(HiLoGame.thresholds, Thresholds(bronze: 3, silver: 4, gold: 5))
        let fav = HiLoGame(seed: 1, params: params)
        XCTAssertTrue(fav.score == 0 && fav.rank == .none)
    }

    // MARK: 7. CATCH rules

    func testCatchIsDeterministicAndChunkIndependent() {
        let params = catchParams("swiftail", .adult)
        let d = CatchGame.dims(params)
        func script(_ seed: Int) -> CatchBot {
            CatchBot(skill: CatchBot.Skill(react: 250, noise: 2, miss: 0.1, careful: true, vp: d.vp), seed: seed)
        }
        let b1 = script(1), b2 = script(1), b3 = script(1)
        let a = MiniSession.playOut(CatchGame.def, params, seed: 7) { b1.decide($0, $1) } as! CatchGame
        let b = MiniSession.playOut(CatchGame.def, params, seed: 7) { b2.decide($0, $1) } as! CatchGame
        let c = MiniSession.playOut(CatchGame.def, params, seed: 8) { b3.decide($0, $1) } as! CatchGame
        XCTAssertEqual(stateHash(a), stateHash(b))
        XCTAssertNotEqual(stateHash(a), stateHash(c))
        XCTAssertTrue(a.done && a.state.t == CatchGame.ms, "CATCH lasts 30 s")
        let g1 = CatchGame(seed: 4, params: params), g2 = CatchGame(seed: 4, params: params), g3 = CatchGame(seed: 4, params: params)
        var t: Double = 0
        while t < CatchGame.ms { g1.step(.none, dtMs: 50); t += 50 }
        t = 0
        while t < CatchGame.ms { g2.step(.none, dtMs: 17); t += 17 }
        t = 0
        while t < CatchGame.ms { g3.step(.none, dtMs: 250); t += 250 }
        XCTAssertEqual(stateHash(g1), stateHash(g2))
        XCTAssertEqual(stateHash(g1), stateHash(g3), "50, 17 and 250 ms steps play the same game")
        XCTAssertTrue(g1.done && g1.score == g2.score)
        let before = g1.score
        g1.step(GameInput(left: true), dtMs: 50)
        XCTAssertEqual(g1.score, before, "stepping a finished game is harmless")
    }

    func testCatchControlsAndScoring() {
        let params = catchParams("swiftail", .adult)
        let g = CatchGame(seed: 1, params: params)
        let x0 = g.state.petX
        g.step(GameInput(left: true), dtMs: 50)
        g.step(.none, dtMs: 500)
        XCTAssertTrue(g.state.petX < x0 - 10 && g.state.dir == -1 && g.state.face == -1, "A: slides left and keeps sliding")
        g.step(GameInput(act: true), dtMs: 50)
        let xs = g.state.petX
        g.step(.none, dtMs: 500)
        XCTAssertTrue(g.state.petX == xs && g.state.dir == 0, "B: stops")
        g.step(GameInput(right: true), dtMs: 50)
        g.step(.none, dtMs: 5000)
        XCTAssertTrue(g.state.petX == 64 - g.state.petW / 2 && g.state.dir == 0, "C: slides right and stops at the wall")
        // items and pet stay on the field; bad items never come before a good one
        for seed in 1...8 {
            let gg = CatchGame(seed: seed, params: params)
            var inField = true
            var t: Double = 0
            while t < CatchGame.ms {
                gg.step(.none, dtMs: 50)
                t += 50
                let s = gg.state
                for it in s.items { inField = inField && it.x >= 4 && it.x <= 60 && it.y.isFinite && it.y <= 60 }
                inField = inField && s.petX >= s.petW / 2 && s.petX <= 64 - s.petW / 2 && s.points >= 0
            }
            XCTAssertTrue(inField, "seed \(seed): items and pet stay on the field")
        }
        // a bad item costs points and stuns; good +1; bonus +3; never below 0
        let gg = CatchGame(seed: 1, params: params)
        gg.state.points = 5
        let y = gg.state.petTop - 8
        gg.state.items.append(CatchItem(id: 99, x: gg.state.petX, y: y, vy: 30, kind: .bad, glyph: 0, arrival: 0))
        gg.step(.none, dtMs: 200)
        XCTAssertTrue(gg.state.points == 3 && gg.state.hits == 1 && gg.state.stun > 0, "a bad item costs 2 points and stuns")
        gg.state.items.append(CatchItem(id: 100, x: gg.state.petX, y: y, vy: 30, kind: .good, glyph: 0, arrival: 0))
        gg.step(.none, dtMs: 200)
        XCTAssertTrue(gg.state.points == 4 && gg.state.caught == 1, "a good item is +1")
        gg.state.items.append(CatchItem(id: 101, x: gg.state.petX, y: y, vy: 30, kind: .bonus, glyph: 0, arrival: 0))
        gg.step(.none, dtMs: 200)
        XCTAssertEqual(gg.state.points, 7, "a bonus item is +3")
        gg.state.points = 0
        gg.state.stun = 0
        gg.state.items.append(CatchItem(id: 102, x: gg.state.petX, y: y, vy: 30, kind: .bad, glyph: 0, arrival: 0))
        gg.step(.none, dtMs: 200)
        XCTAssertTrue(gg.state.points == 0 && gg.score == 0, "the score never goes below 0")
    }

    func testCatchFavouriteBonusAndBodyTypes() {
        let fav = catchParams("swiftail", .adult)
        var nofav = fav
        nofav.scoreMul = 1
        let d = CatchGame.dims(fav)
        var favTotal = 0, plainTotal = 0, favMore = 0
        for seed in 1...12 {
            let b1 = CatchBot(skill: CatchBot.Skill(react: 250, noise: 2, miss: 0.1, careful: true, vp: d.vp), seed: seed)
            let b2 = CatchBot(skill: CatchBot.Skill(react: 250, noise: 2, miss: 0.1, careful: true, vp: d.vp), seed: seed)
            let x = MiniSession.playOut(CatchGame.def, fav, seed: seed) { b1.decide($0, $1) } as! CatchGame
            let y = MiniSession.playOut(CatchGame.def, nofav, seed: seed) { b2.decide($0, $1) } as! CatchGame
            favTotal += x.score; plainTotal += y.score
            if x.score >= y.score { favMore += 1 }
            XCTAssertEqual(x.score, Int((Double(x.state.points) * 1.25 + 1e-9).rounded(.down)), "seed \(seed): favourite is points x 1.25")
        }
        XCTAssertTrue(favMore == 12 && Double(favTotal) > Double(plainTotal) * 1.15, "the favourite scores about 25% more (\(favTotal) vs \(plainTotal))")
        let dFast = CatchGame.dims(catchParams(speciesOfKind("fennec").id, .teen))
        let dHeavy = CatchGame.dims(catchParams(speciesOfKind("dozer").id, .teen))
        XCTAssertTrue(dFast.vp > dHeavy.vp * 1.3 && dFast.petW < dHeavy.petW, "a fennec is faster and smaller than a dozer")
        XCTAssertLessThan(CatchGame.dims(catchParams("swiftail", .baby)).petW, CatchGame.dims(catchParams("swiftail", .ultimate)).petW)
        XCTAssertLessThan(CatchGame.dims(catchParams("swiftail", .adult, sick: true)).vp, CatchGame.dims(catchParams("swiftail", .adult)).vp)
    }

    /// Expo played these games (scripted input) and MiniGameData holds what happened: Swift must end the same way.
    func testCatchAndHiLoReproduceTheExpoTraces() {
        let rows = MiniGameData.goldenCatch.split(separator: ",").map { $0.split(separator: "|", omittingEmptySubsequences: false).map(String.init) }
        XCTAssertGreaterThanOrEqual(rows.count, 12)
        for f in rows {
            guard f.count == 12, let seed = Int(f[5]), let stage = Stage(rawValue: f[1]) else { XCTFail("bad golden row \(f)"); continue }
            let params = catchParams(f[0], stage, sick: f[2] == "1", heavy: f[3] == "1", hunger: Int(f[4]) ?? 4)
            let rng = MiniRng(seed: seed * 977 + 5)
            let g = CatchGame(seed: seed, params: params)
            var t: Double = 0
            while !g.done && t <= CatchGame.def.maxMs + 5000 {
                let l = rng.chance(0.15), r = rng.chance(0.15), a = rng.chance(0.2)
                g.step(GameInput(left: l, right: r, act: a), dtMs: 50)
                t += 50
            }
            let s = g.state
            let label = "\(f[0]) \(f[1]) seed \(seed)"
            XCTAssertEqual(g.score, Int(f[6]), "\(label): score")
            XCTAssertEqual(s.points, Int(f[7]), "\(label): points")
            XCTAssertEqual(s.caught, Int(f[8]), "\(label): caught")
            XCTAssertEqual(s.hits, Int(f[9]), "\(label): hits")
            XCTAssertEqual(s.missed, Int(f[10]), "\(label): missed")
            XCTAssertEqual(s.petX, Double(f[11]) ?? -1, accuracy: 0.0001, "\(label): petX")
        }
        let hilo = MiniGameData.goldenHilo.split(separator: ",").map { $0.split(separator: "|", omittingEmptySubsequences: false).map(String.init) }
        XCTAssertEqual(hilo.count, 8)
        for f in hilo {
            guard f.count == 4, let seed = Int(f[0]) else { XCTFail("bad golden row"); continue }
            let g = HiLoGame(seed: seed, params: MiniTuning.params(for: MiniBody(species: Species.all.first { $0.family == "dino" && $0.stage == .adult }!.id, stage: .adult), game: "hilo"))
            var trace = ""
            var t = 0
            while !g.done && t < 60000 {
                if g.state.phase == .guess {
                    let shown = g.state.shown
                    g.step(GameInput(act: true), dtMs: 50)
                    trace += "\(shown)\(g.state.revealed ?? 0)"
                } else {
                    g.step(.none, dtMs: 100)
                }
                t += 100
            }
            XCTAssertEqual(trace, f[1], "HI-LO seed \(seed): digits")
            XCTAssertEqual(g.state.won, Int(f[2]), "HI-LO seed \(seed): wins")
            XCTAssertEqual(g.score, Int(f[3]), "HI-LO seed \(seed): score")
        }
    }

    // MARK: 8. CATCH thresholds and fairness (bots)

    func testCatchRankThresholdsAreReachableNotTrivialAndFair() {
        let th = CatchGame.thresholds
        XCTAssertEqual(th, Thresholds(bronze: 12, silver: 22, gold: 30), "the Expo thresholds")
        var avg: [String: [Double]] = ["perfect": [], "good": [], "okay": [], "casual": []]
        var perfectRuns: [Int] = []
        var hits = 0, missed = 0, runs = 0
        var idleMax = 0, mashRuns = 0, mashBronze = 0, mashSilver = 0
        // every body kind, at a stage that rotates through the five (the whole 123 x 5 grid runs in the Expo test)
        for (ki, kind) in MiniTuning.allKinds.enumerated() {
            let stage = stages[ki % 5]
            let params = catchParams(speciesOfKind(kind).id, stage, mul: 1)
            let d = CatchGame.dims(params)
            for sk in CatchBot.skills {
                var tot = 0
                for seed in 1...4 {
                    let bot = CatchBot(skill: CatchBot.Skill(react: sk.react, noise: sk.noise, miss: sk.miss, careful: sk.careful, vp: d.vp), seed: seed)
                    let g = MiniSession.playOut(CatchGame.def, params, seed: seed) { bot.decide($0, $1) } as! CatchGame
                    tot += g.score
                    if sk.name == "perfect" {
                        perfectRuns.append(g.score); hits += g.state.hits; missed += g.state.missed; runs += 1
                    }
                }
                avg[sk.name, default: []].append(Double(tot) / 4)
            }
            for seed in 1...2 {
                let idle = MiniSession.playOut(CatchGame.def, params, seed: seed) { _, _ in .none }
                idleMax = max(idleMax, idle.score)
                let rng = MiniRng(seed: seed * 31 + kind.count)
                let m = MiniSession.playOut(CatchGame.def, params, seed: seed) { _, _ in
                    let l = rng.chance(0.1), r = rng.chance(0.1), a = rng.chance(0.1)
                    return GameInput(left: l, right: r, act: a)
                }.score
                mashRuns += 1
                if m >= th.bronze { mashBronze += 1 }
                if m >= th.silver { mashSilver += 1 }
            }
        }
        func lo(_ a: [Double]) -> Double { a.min() ?? 0 }
        func med(_ a: [Double]) -> Double { a.sorted()[a.count / 2] }
        let msg = "perfect min \(lo(avg["perfect"]!)) med \(med(avg["perfect"]!)) | good \(lo(avg["good"]!))/\(med(avg["good"]!)) | okay \(lo(avg["okay"]!))/\(med(avg["okay"]!)) | casual med \(med(avg["casual"]!)) | idle \(idleMax) mash \(mashBronze)/\(mashRuns)/\(mashSilver)"
        print("CATCH bots: \(msg)")
        XCTAssertGreaterThanOrEqual(lo(avg["perfect"]!), Double(th.gold), "a perfect player reaches GOLD with every body type (\(msg))")
        XCTAssertGreaterThanOrEqual(perfectRuns.min() ?? 0, th.silver + 2, "...and never drops below SILVER in a single game")
        XCTAssertTrue(hits == 0 && Double(missed) / Double(max(1, runs)) < 1, "fair: a perfect player is never forced into a bad item (\(hits)) and misses < 1 a game")
        XCTAssertGreaterThanOrEqual(lo(avg["good"]!), Double(th.silver), "a good player gets SILVER or better everywhere")
        XCTAssertGreaterThanOrEqual(med(avg["good"]!), Double(th.gold - 3), "a good player is close to GOLD at the median")
        XCTAssertGreaterThanOrEqual(lo(avg["okay"]!), Double(th.bronze + 4), "an okay player gets BRONZE everywhere")
        XCTAssertTrue(med(avg["okay"]!) >= Double(th.silver) && med(avg["okay"]!) < Double(th.gold), "an okay player is around SILVER")
        XCTAssertTrue(med(avg["casual"]!) < Double(th.silver) && med(avg["casual"]!) >= Double(th.bronze), "a casual player earns BRONZE")
        XCTAssertLessThan(idleMax, th.bronze, "standing still never earns a rank")
        XCTAssertTrue(Double(mashBronze) / Double(mashRuns) < 0.1 && Double(mashSilver) / Double(mashRuns) < 0.01, "mashing rarely earns a rank")
        XCTAssertTrue(avg["perfect"]!.allSatisfy { $0 < 60 }, "scores stay in a sane range")
    }

    func testSickHungryAndHeavyPetsPlayWorseButCanStillRank() {
        let conditions: [(String, Bool, Bool, Int)] = [("sick", true, false, 4), ("starving", false, false, 0), ("heavy", false, true, 4), ("all", true, true, 0)]
        for (name, sick, heavy, hunger) in conditions {
            var healthy = 0, ill = 0, n = 0
            for kind in ["fennec", "dino_trex", "dozer", "whale", "hare", "kitten", "mech", "baby"] {
                for stage in [Stage.baby, .adult] {
                    let sp = speciesOfKind(kind).id
                    let ph = catchParams(sp, stage, mul: 1)
                    let pi = catchParams(sp, stage, sick: sick, heavy: heavy, hunger: hunger, mul: 1)
                    for seed in 1...3 {
                        let skill = { (p: GameParams) in CatchBot.Skill(react: 250, noise: 2, miss: 0.1, careful: true, vp: CatchGame.dims(p).vp) }
                        let bh = CatchBot(skill: skill(ph), seed: seed), bi = CatchBot(skill: skill(pi), seed: seed)
                        healthy += MiniSession.playOut(CatchGame.def, ph, seed: seed) { bh.decide($0, $1) }.score
                        ill += MiniSession.playOut(CatchGame.def, pi, seed: seed) { bi.decide($0, $1) }.score
                        n += 1
                    }
                }
            }
            XCTAssertLessThan(ill, healthy, "\(name) pets play worse")
            XCTAssertGreaterThanOrEqual(Double(ill) / Double(n), Double(CatchGame.thresholds.bronze - 1), "\(name) pets can still earn BRONZE")
        }
    }

    // MARK: 9. registry and session

    func testRegistryAndDefinitions() {
        let ids = MiniGames.all.map { $0.def.id }
        XCTAssertEqual(Set(ids).count, ids.count)
        XCTAssertTrue(ids.contains("hilo") && ids.contains("catch"))
        for e in MiniGames.all {
            let d = e.def
            XCTAssertNotNil(MiniGames.entry(d.id))
            XCTAssertTrue(d.name.count <= 12 && d.name == d.name.uppercased() && d.unit.count <= 8, "\(d.id): name and unit fit the menu")
            XCTAssertTrue(d.thresholds.bronze > 0 && d.thresholds.bronze < d.thresholds.silver && d.thresholds.silver < d.thresholds.gold)
            XCTAssertTrue(d.hint.count > 0 && d.hint.count <= 40)
            XCTAssertGreaterThan(d.maxMs, 0)
            for fam in MiniThemes.families {
                let rules = d.rules(MiniThemes.theme(for: fam))
                XCTAssertTrue(rules.count >= 1 && rules.count <= 3 && rules.allSatisfy { $0.count > 0 && $0.count <= 18 }, "\(d.id)/\(fam): rules fit (\(rules))")
            }
        }
        let rows = MiniGames.menuRows
        XCTAssertEqual(Array(rows.suffix(2)), ["HIGH SCORES", "CANCEL"])
        XCTAssertEqual(rows.count, MiniGames.all.count + 2)
    }

    func testSessionStateMachine() {
        let p0 = pet("swiftail")
        var p = p0
        let store = memoryStore()
        let s = MiniSession(def: CatchGame.def, params: MiniTuning.params(for: p, game: "catch"), seed: 5)
        XCTAssertTrue(s.phase == .ready && s.game == nil, "a session starts on the ready screen")
        XCTAssertEqual(s.press(.a), .none)
        XCTAssertEqual(s.phase, .ready)
        XCTAssertEqual(MiniSession(def: CatchGame.def, params: s.params, seed: 5).press(.c), .menu, "C on ready goes back")
        _ = s.press(.b)
        XCTAssertTrue(s.phase == .play && s.game != nil, "B starts the game")
        let g = s.game as! CatchGame
        _ = s.press(.a); _ = s.tick(50)
        XCTAssertEqual(g.state.dir, -1, "A slides left")
        _ = s.press(.c); _ = s.tick(50)
        XCTAssertEqual(g.state.dir, 1, "C slides right (CATCH uses it)")
        _ = s.tapSide(-1); _ = s.tick(50)
        XCTAssertEqual(g.state.dir, -1, "a tap on the left half slides left")
        _ = s.tapSide(1); _ = s.tick(50)
        XCTAssertEqual(g.state.dir, 1, "a tap on the right half slides right")
        var t: Double = 0
        while t < CatchGame.ms + 2000 && s.phase == .play { _ = s.tick(50); t += 50 }
        XCTAssertEqual(s.phase, .over, "the game ends with a short time-up beat")
        XCTAssertEqual(s.press(.b), .none)
        XCTAssertEqual(s.phase, .over, "buttons are ignored during the beat")
        var got = false
        t = 0
        while t < MiniSession.overMs + 200 && !got { got = s.tick(100); t += 100 }
        XCTAssertTrue(got && s.phase == .result)
        let beforeSmarts = p.smarts
        let res = s.settle(pet: &p, store: store, now: t0)
        XCTAssertNotNil(res)
        guard let res else { return }
        XCTAssertTrue(res.score == g.score && res.rank == g.rank && res.reward.rewarded)
        XCTAssertTrue(res.rank == .none || p.smarts > beforeSmarts, "a ranked game raises smarts")
        if res.score > 0 { XCTAssertEqual(store.best("catch", species: p.species)?.score, res.score) } else { XCTAssertNil(store.best("catch", species: p.species)) }
        XCTAssertEqual(res.recordOverall, res.score > 0)
        XCTAssertEqual(res.winLine, s.params.theme.winLine(res.rank))
        XCTAssertEqual(s.press(.b), .menu)
        XCTAssertEqual(s.press(.a), .menu)
        XCTAssertEqual(s.press(.c), .home, "on the result A/B go to the menu, C goes home")
        XCTAssertEqual(s.tapSide(1), .menu)
        // a game that uses A/B only: C quits
        let h = MiniSession(def: HiLoGame.def, params: MiniTuning.params(for: p, game: "hilo"), seed: 3)
        _ = h.press(.b)
        XCTAssertEqual(h.press(.c), .menu, "HI-LO: C quits")
        h.tapPick(1); _ = h.tick(50)
        let hg = h.game as! HiLoGame
        XCTAssertTrue(hg.state.sel == 1 && hg.state.phase == .reveal, "a tap picks a row")
        // the 4th rewarded play of a day is capped and says so
        var p2 = pet("swiftail")
        var rs: [SessionResult] = []
        for i in 0..<4 {
            let sn = MiniSession(def: CatchGame.def, params: MiniTuning.params(for: p2, game: "catch"), seed: 20 + i)
            _ = sn.press(.b)
            let cg = sn.game as! CatchGame
            cg.state.points = 15
            cg.state.t = CatchGame.ms
            if let r = sn.settle(pet: &p2, store: store, now: t0 + Double(i)) { rs.append(r) }
        }
        XCTAssertEqual(rs.count, 4)
        XCTAssertTrue(rs[0].reward.rewarded && rs[2].reward.rewarded && rs[3].reward.capped, "the 4th play today is capped")
        XCTAssertTrue(rs[3].reward.lines.joined(separator: " ").lowercased().contains("limit"))
        XCTAssertEqual(rs[3].score, rs[0].score, "a capped play still scores")
    }

    // MARK: 10. every game, every family: it plays out and paints

    func testAMonkeyFinishesEveryGameForEveryFamily() {
        for e in MiniGames.all {
            for fam in MiniThemes.families {
                let sp = adultOf(fam)
                for seed in [1, 2] {
                    let params = MiniTuning.params(for: MiniBody(species: sp.id, stage: .adult), game: e.def.id)
                    let rng = MiniRng(seed: seed * 13)
                    let g = MiniSession.playOut(e.def, params, seed: seed) { _, _ in
                        let l = rng.chance(0.15), r = rng.chance(0.15), a = rng.chance(0.2)
                        let pick: Int? = rng.chance(0.1) ? rng.int(3) : nil
                        return GameInput(left: l, right: r, act: a, pick: pick)
                    }
                    XCTAssertTrue(g.done, "\(e.def.id)/\(fam)/\(seed): a monkey finishes")
                    XCTAssertTrue(g.score >= 0 && g.progress >= 0 && g.progress <= 1, "\(e.def.id)/\(fam): sane score and progress")
                    XCTAssertTrue(g.hud.left.count <= 16 && g.hud.right.count <= 16, "\(e.def.id)/\(fam): the HUD fits")
                    let r2 = MiniRng(seed: seed * 13)
                    let g2 = MiniSession.playOut(e.def, params, seed: seed) { _, _ in
                        let l = r2.chance(0.15), r = r2.chance(0.15), a = r2.chance(0.2)
                        let pick: Int? = r2.chance(0.1) ? r2.int(3) : nil
                        return GameInput(left: l, right: r, act: a, pick: pick)
                    }
                    XCTAssertEqual(g.score, g2.score, "\(e.def.id)/\(fam): deterministic")
                }
            }
        }
    }

    /// Every family's game screens paint pixels, the pet is on screen in field games, and Traditional keeps the shapes.
    func testEveryFamilyPaintsEveryGameFrame() {
        for fam in MiniThemes.families {
            let sp = adultOf(fam)
            let p = pet(sp.id)
            for e in MiniGames.all {
                for upto in [0.0, 400, 3000, 9000, 15000, 29000] {
                    let s = MiniSession(def: e.def, params: MiniTuning.params(for: p, game: e.def.id), seed: 4)
                    _ = s.press(.b)
                    let rng = MiniRng(seed: Int(upto) + 1)
                    var t: Double = 0
                    while t < upto && s.phase == .play {
                        let l = rng.chance(0.2), a = rng.chance(0.2)
                        s.pending = GameInput(left: l, right: false, act: a)
                        _ = s.tick(50)
                        t += 50
                    }
                    let r = MiniPaint.frame(session: s, pet: p, ms: upto)
                    XCTAssertGreaterThan(r.inkCount, 20, "\(fam)/\(e.def.id)@\(Int(upto)): the frame draws")
                    if e.layout == .field {
                        XCTAssertTrue(r.hasSky && r.groundRow == 60, "\(fam)/\(e.def.id): a field game paints on the biome sky")
                        let petPixels = r.cells.filter { $0 >= SceneLayer.bodyLight.rawValue && $0 <= SceneLayer.glint.rawValue && $0 != SceneLayer.ball.rawValue }.count
                        XCTAssertGreaterThan(petPixels, 8, "\(fam)/\(e.def.id)@\(Int(upto)): the pet is drawn")
                    }
                }
            }
        }
    }

    func testBadItemsGetADottedOutlineAndTraditionalStaysOneInk() {
        let p = pet(adultOf("fox").id)
        let s = MiniSession(def: CatchGame.def, params: MiniTuning.params(for: p, game: "catch"), seed: 3)
        _ = s.press(.b)
        let g = s.game as! CatchGame
        g.state.items = [CatchItem(id: 1, x: 32, y: 20, vy: 0, kind: .bad, glyph: 0, arrival: 9999)]
        let r = MiniPaint.frame(session: s, pet: p, ms: 0)
        let alert = r.cells.filter { $0 == SceneLayer.alert.rawValue }.count
        XCTAssertGreaterThan(alert, 8, "a bad item gets a dotted red outline")
        // in Traditional, only layers it prints count as ink; scenery and glyph details are unlit
        XCTAssertLessThan(r.ink.filter { $0 }.count, r.cells.filter { $0 != 0 }.count, "Technicolor-only pixels are unlit in Traditional")
        // the outline is a dotted ring (a checker), not a solid frame
        XCTAssertLessThan(alert, 40)
    }

    func testPetFitScalesToTheBoxAndNeverUp() {
        for sp in Species.all.prefix(200) {
            let rows = MiniPaint.fitted(species: sp, boxW: 12, boxH: 12, blink: false)
            XCTAssertTrue(rows.count <= 12 && (rows.first?.count ?? 0) <= 12, "\(sp.id): fits a 12x12 box")
            XCTAssertTrue(rows.joined().contains("X"), "\(sp.id): something is left")
        }
        let big = Species.all.first { $0.stage == .adult }!
        let a = MiniPaint.fitted(species: big, boxW: 64, boxH: 64, blink: false)
        let src = big.hiFrames[0]
        let lit: [Int] = src.indices.filter { src[$0].contains("X") }
        let height = (lit.last ?? 0) - (lit.first ?? 0) + 1
        XCTAssertLessThanOrEqual(a.count, height, "never scaled up")
    }
}
