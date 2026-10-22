import XCTest

final class LivingSceneTests: XCTestCase {
    private var utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    /// 09:00 UTC on a Monday.
    private let base = Date(timeIntervalSince1970: 1_767_603_600)

    private func makePet(seed: UInt64 = 777, stage: Stage = .child, species: String = "rawr") -> Pet {
        var p = Pet(now: base)
        p.seed = seed
        p.stage = stage
        p.species = species
        p.hunger = 3
        p.happy = 3
        p.lastTick = base
        return p
    }

    private func time(_ i: Int) -> Date {
        base.addingTimeInterval(Double(i) * SceneState.tickLength + 0.01)
    }

    /// Steps once per tick. `first` is used on the first step only, `rest` on every other.
    @discardableResult
    private func run(_ s: inout SceneState, pet: Pet, from: Int = 0, ticks: Int,
                     first: SceneInputs = SceneInputs(), rest: SceneInputs = SceneInputs(),
                     each: ((SceneState) -> Void)? = nil) -> Int {
        for i in from..<(from + ticks) {
            s.step(pet: pet, inputs: i == from ? first : rest, now: time(i))
            each?(s)
        }
        return from + ticks
    }

    // MARK: director

    func testDeterministicForSameSeedAndClock() {
        let p = makePet()
        var a = SceneState(), b = SceneState()
        var inputs = SceneInputs()
        inputs.events = [.fed(.veggie), .petted]
        for i in 0..<700 {
            let inp = i == 30 ? inputs : SceneInputs()
            a.step(pet: p, inputs: inp, now: time(i))
            b.step(pet: p, inputs: inp, now: time(i))
            XCTAssertEqual(a, b, "diverged at tick \(i)")
        }
        var other = SceneState()
        var xsA: [Double] = [], xsB: [Double] = []
        var a2 = SceneState()
        let p2 = makePet(seed: 4242)
        for i in 0..<700 {
            a2.step(pet: p, now: time(i)); xsA.append(a2.x)
            other.step(pet: p2, now: time(i)); xsB.append(other.x)
        }
        XCTAssertNotEqual(xsA, xsB, "different seeds should wander differently")
    }

    func testXStaysInBoundsAndFacingIsValid() {
        var pets: [Pet] = []
        for seed in [1, 2, 3, 99] as [UInt64] {
            var p = makePet(seed: seed)
            pets.append(p)
            p.hunger = 0; pets.append(p)
            p.hunger = 3; p.happy = 0; pets.append(p)
            p.happy = 4; p.hunger = 4; pets.append(p)
            p.sick = true; pets.append(p)
            p.sick = false; p.asleep = true; pets.append(p)
        }
        for p in pets {
            var s = SceneState()
            var first = SceneInputs()
            first.events = [.battle(win: true), .fed(.meat), .cleaned, .played(wins: 4), .returned]
            run(&s, pet: p, ticks: 900, first: first) { st in
                XCTAssertGreaterThanOrEqual(st.x, 0)
                XCTAssertLessThanOrEqual(st.x, 32)
                XCTAssertTrue(st.facing == 1 || st.facing == -1)
            }
        }
    }

    func testSleepingPetEndsOnTheBed() {
        var p = makePet()
        p.asleep = true
        p.lightOn = false
        var s = SceneState()
        run(&s, pet: p, ticks: 240)
        XCTAssertEqual(s.x, SceneState.bedX, accuracy: 0.01)
        XCTAssertEqual(s.action, .sleep)
    }

    func testHungryPetPaces() {
        var p = makePet()
        p.hunger = 0
        var s = SceneState()
        var lo = 99.0, hi = -1.0
        run(&s, pet: p, ticks: 900) { st in lo = min(lo, st.x); hi = max(hi, st.x) }
        XCTAssertLessThanOrEqual(lo, 6)
        XCTAssertGreaterThanOrEqual(hi, 24)
    }

    func testPoopIncreaseProducesPoopState() {
        var p = makePet()
        var s = SceneState()
        let next = run(&s, pet: p, ticks: 40)
        XCTAssertEqual(s.poopsSeen, 0)
        p.poops = 1
        var sawPoop = false
        run(&s, pet: p, from: next, ticks: 240) { st in if st.action == .poop { sawPoop = true } }
        XCTAssertTrue(sawPoop)
        XCTAssertEqual(s.poopsSeen, 1)
    }

    func testFeedEventEndsInEatThenAutonomy() {
        let p = makePet()
        var s = SceneState()
        let next = run(&s, pet: p, ticks: 20)
        var first = SceneInputs()
        first.events = [.fed(.meat)]
        var actions: [SceneAction] = []
        var sawFood = false
        let end = run(&s, pet: p, from: next, ticks: 300, first: first) { st in
            if actions.last != st.action { actions.append(st.action) }
            if st.effect?.kind == .food { sawFood = true }
        }
        XCTAssertTrue(sawFood)
        let eatIndex = actions.firstIndex(of: .eat)
        XCTAssertNotNil(eatIndex)
        XCTAssertFalse(s.scripted, "back to autonomy after the reaction")
        XCTAssertNil(s.effect, "the food is gone")
        XCTAssertGreaterThan(actions.count, (eatIndex ?? 0) + 1, "something happens after eating")
        XCTAssertGreaterThan(end, next)
    }

    func testReducedMotionNeverMovesThePet() {
        var rest = SceneInputs()
        rest.reducedMotion = true
        var first = rest
        first.events = [.fed(.pasta), .battle(win: false), .cleaned, .played(wins: 5), .returned, .petted]
        first.tap = .ground(x: 30)
        var pets: [Pet] = []
        var p = makePet(); pets.append(p)
        p.hunger = 0; pets.append(p)
        p.hunger = 3; p.asleep = true; pets.append(p)
        for pet in pets {
            var s = SceneState()
            run(&s, pet: pet, ticks: 800, first: first, rest: rest) { st in
                XCTAssertEqual(st.x, SceneState.homeX, accuracy: 0.0001)
            }
        }
    }

    func testEggAndGhostStayPut() {
        var p = makePet(stage: .egg, species: "")
        var s = SceneState()
        run(&s, pet: p, ticks: 100)
        XCTAssertEqual(s.x, SceneState.homeX)
        p.stage = .ghost
        run(&s, pet: p, from: 100, ticks: 100)
        XCTAssertEqual(s.x, SceneState.homeX)
    }


    // MARK: poop spacing

    func testSceneGridAndPoopSpots() {
        XCTAssertEqual(SceneRaster.side, 48)
        XCTAssertEqual(SceneState.maxX, 32)
        XCTAssertEqual(SceneState.poopSpots, [41, 35, 29])
        XCTAssertEqual(SceneState.bedX, 8)
    }

    func testPoopLimitShrinksAsPoopsGrow() {
        for sp in Species.all {
            var lo = Int.max, hi = -1
            for f in sp.frames { for row in f { for (c, ch) in row.enumerated() where ch == "X" { lo = min(lo, c); hi = max(hi, c) } } }
            let w = SceneState.inkWidth(species: sp.id)
            XCTAssertGreaterThanOrEqual(w, hi - lo + 1, sp.id)
            XCTAssertGreaterThanOrEqual(w, hi + 1, sp.id)
            XCTAssertGreaterThanOrEqual(w, 16 - lo, sp.id)
            XCTAssertLessThanOrEqual(w, 16, sp.id)
            let lims = (0...3).map { SceneState.limit(species: sp.id, poops: $0) }
            XCTAssertEqual(lims[0], 32, sp.id)
            for n in 1...3 {
                let expect = max(0, min(32, Double(SceneState.poopSpots[n - 1] - w - 1)))
                XCTAssertEqual(lims[n], expect, "\(sp.id) \(n)")
                XCTAssertLessThanOrEqual(lims[n], lims[n - 1], "\(sp.id) shrinks")
            }
            XCTAssertLessThan(lims[1], lims[0], sp.id)
        }
        XCTAssertEqual(SceneState.limit(species: "", poops: 3), 12)   // unknown sprite counts as a whole 16 columns
    }

    func testInkNeverOverlapsPoopsWhileWandering() {
        for sp in Species.all {
            for n in 1...3 {
                var p = makePet(seed: UInt64(sp.id.count * 31 + n), stage: sp.stage, species: sp.id)
                p.poops = n
                if n == 2 { p.happy = 4; p.hunger = 4 }
                if n == 3 && sp.id.count % 2 == 1 { p.hunger = 0 }
                var s = SceneState.still(for: p)
                let spot = SceneState.poopSpots[n - 1]
                let limit = SceneState.limit(species: sp.id, poops: n)
                var walked = false
                var worst = -1
                run(&s, pet: p, ticks: 3000) { st in
                    if st.action == .walk { walked = true }
                    XCTAssertLessThanOrEqual(st.x, limit + 0.0001, "\(sp.id) x with \(n) poops")
                    let place = SceneRenderer.placement(pet: p, state: st, frame: 0, motion: true, override: nil)
                    worst = max(worst, place.right)
                }
                XCTAssertLessThan(worst, spot, "\(sp.id) ink reached column \(worst), poop at \(spot), \(n) poops")
                XCTAssertTrue(walked || limit < 4, "\(sp.id) still wanders with \(n) poops")
            }
        }
    }

    func testPetBeyondTheNewLimitWalksLeftFirst() {
        var p = makePet()
        p.poops = 3
        var s = SceneState.still(for: p)
        s.x = 31
        let limit = SceneState.limit(species: p.species, poops: 3)
        var xs: [Double] = []
        var actions: [SceneAction] = []
        run(&s, pet: p, ticks: 60) { st in
            if st.x > limit + 0.001 { actions.append(st.action) }
            xs.append(st.x)
        }
        XCTAssertFalse(actions.isEmpty)
        XCTAssertTrue(actions.allSatisfy { $0 == .walk }, "only walks until inside the limit")
        for i in 1..<xs.count where xs[i - 1] > limit + 0.001 {
            XCTAssertLessThanOrEqual(xs[i], xs[i - 1], "moves left only")
        }
        XCTAssertLessThanOrEqual(s.x, limit + 0.0001)
    }

    func testSquatStandsJustLeftOfTheNextFreeSpot() {
        var p = makePet()
        var s = SceneState()
        let next = run(&s, pet: p, ticks: 40)
        p.poops = 1
        var squatX: Double?
        var drawnBefore = false
        run(&s, pet: p, from: next, ticks: 300) { st in
            if st.action == .poop && squatX == nil { squatX = st.x }
            if squatX == nil, st.pendingPoop {
                let r = SceneRenderer.render(pet: p, state: st, date: self.base)
                if r.isSet(41 + 2, 39) || r.isSet(41 + 3, 39) { drawnBefore = true }   // top of the poop glyph
            }
        }
        let expect = Double(41 - SceneState.inkWidth(species: p.species) - 1)
        XCTAssertNotNil(squatX)
        XCTAssertEqual(squatX ?? -1, expect, accuracy: 0.01)
        XCTAssertFalse(drawnBefore, "the poop is not on the ground until it is dropped")
        XCTAssertFalse(s.pendingPoop)
    }

    func testPoopsAreDrawnOnTheGroundWithJiggle() {
        var p = makePet()
        p.poops = 3
        let s = SceneState.still(for: p)
        // The glyph's top pixel is column 2; it shifts one column between the two 0.6 s frames.
        func topColumn(_ r: SceneRaster, _ spot: Int) -> Int {
            r.isSet(spot + 2, 39) ? 0 : (r.isSet(spot + 3, 39) ? 1 : -1)
        }
        let r0 = SceneRenderer.render(pet: p, state: s, date: base)
        let r1 = SceneRenderer.render(pet: p, state: s, date: base.addingTimeInterval(0.6))
        for spot in SceneState.poopSpots {
            XCTAssertGreaterThanOrEqual(topColumn(r0, spot), 0, "poop at \(spot) drawn on the ground")
            XCTAssertGreaterThanOrEqual(topColumn(r1, spot), 0)
            XCTAssertNotEqual(topColumn(r0, spot), topColumn(r1, spot), "poop at \(spot) jiggles")
        }
    }

    // MARK: drawing

    func testEveryStateDrawsForEverySpeciesAndBothFacings() {
        for sp in Species.all {
            var p = makePet(stage: sp.stage, species: sp.id)
            p.poops = 2
            p.call = .hungry
            for action in SceneAction.allCases {
                for facing in [1, -1] {
                    for age in [0, 3, 7, 12, 25] {
                        var s = SceneState.still(for: p)
                        s.tick = 80
                        s.action = action
                        s.facing = facing
                        s.actionAge = age
                        s.lookUp = age % 2 == 0
                        let r = SceneRenderer.render(pet: p, state: s, date: base)
                        XCTAssertGreaterThan(r.inkCount, 60, "\(sp.id) \(action) \(facing)")
                    }
                }
            }
        }
    }

    func testEveryEffectDrawsAtEveryAge() {
        let p = makePet()
        for kind in SceneEffect.Kind.allCases {
            for age in [0, 1, 5, 11, 20, 30] {
                for flag in [true, false] {
                    var s = SceneState.still(for: p)
                    s.tick = 80
                    s.action = .look
                    s.effect = SceneEffect(kind: kind, start: 80 - age, duration: 40, x: 10, dir: flag ? 1 : -1,
                                           food: flag ? Food.meat : nil, flag: flag, count: 3, bound: true)
                    let r = SceneRenderer.render(pet: p, state: s, date: base)
                    XCTAssertGreaterThan(r.inkCount, 60, "\(kind) \(age)")
                }
            }
        }
    }

    func testEggGhostAndCallsDraw() {
        var p = makePet(stage: .egg, species: "")
        XCTAssertGreaterThan(SceneRenderer.still(pet: p).inkCount, 60)
        p.stage = .ghost
        XCTAssertGreaterThan(SceneRenderer.still(pet: p).inkCount, 60)
        p = makePet()
        for call in [Call.hungry, .bored, .poop, .sick, .naughty, .light, .hot, .cold] {
            p.call = call
            p.asleep = call == .light
            XCTAssertGreaterThan(SceneRenderer.still(pet: p, calendar: utc).inkCount, 60)
        }
    }

    func testGlyphsAreRectangular() {
        for g in SceneGlyph.all {
            XCTAssertFalse(g.isEmpty)
            let w = g[0].count
            for row in g {
                XCTAssertEqual(row.count, w)
                XCTAssertTrue(row.allSatisfy { $0 == "X" || $0 == "." })
            }
        }
        XCTAssertEqual(SceneGlyph.bubble.count, 7)
        XCTAssertEqual(SceneGlyph.bubble[0].count, 9)
        for g in [SceneGlyph.meat, SceneGlyph.leaf, SceneGlyph.noodle, SceneGlyph.candy, SceneGlyph.broom,
                  SceneGlyph.ball, SceneGlyph.dumbbell, SceneGlyph.syringe, SceneGlyph.spark,
                  SceneGlyph.bulb, SceneGlyph.sun, SceneGlyph.moon] {
            XCTAssertEqual(g.count, 5)
            XCTAssertEqual(g[0].count, 5)
        }
    }

    func testStillPictureIsDeterministicAndFollowsTheHour() {
        var p = makePet()
        p.lastTick = base      // 09:00 UTC
        let day1 = SceneRenderer.still(pet: p, calendar: utc)
        let day2 = SceneRenderer.still(pet: p, calendar: utc)
        XCTAssertEqual(day1, day2)
        p.lastTick = base.addingTimeInterval(14 * 3600)   // 23:00 UTC
        let night = SceneRenderer.still(pet: p, calendar: utc)
        XCTAssertNotEqual(day1.ink, night.ink)
    }

    func testDarkRoomAddsDitherAndPoopsAreDrawn() {
        var p = makePet()
        p.lastTick = base
        let lit = SceneRenderer.still(pet: p, calendar: utc)
        XCTAssertFalse(lit.shade.contains(true))
        p.lightOn = false
        XCTAssertTrue(SceneRenderer.still(pet: p, calendar: utc).shade.contains(true))
        p.lightOn = true
        p.poops = 2
        XCTAssertGreaterThan(SceneRenderer.still(pet: p, calendar: utc).inkCount, lit.inkCount)
    }

    // MARK: away line

    func testAwayLineSummarisesEvents() {
        var p = makePet()
        let last = base
        p.events = [
            PetEvent(kind: "poop", at: base.addingTimeInterval(-60)),      // before we left
            PetEvent(kind: "sleep", at: base.addingTimeInterval(600)),
            PetEvent(kind: "poop", at: base.addingTimeInterval(1200)),
            PetEvent(kind: "poop", at: base.addingTimeInterval(1800)),
        ]
        let line = AwaySummary.line(for: p, since: last, now: base.addingTimeInterval(3600))
        XCTAssertEqual(line, "WHILE YOU WERE AWAY: SLEPT, MADE 2 MESSES")
        p.events = []
        XCTAssertEqual(AwaySummary.line(for: p, since: last, now: base.addingTimeInterval(3600)),
                       "\(p.name.uppercased()) MISSED YOU")
    }
}
