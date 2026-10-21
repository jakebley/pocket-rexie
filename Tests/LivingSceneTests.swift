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
                XCTAssertLessThanOrEqual(st.x, 16)
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
        XCTAssertLessThanOrEqual(lo, 4)
        XCTAssertGreaterThanOrEqual(hi, 12)
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
