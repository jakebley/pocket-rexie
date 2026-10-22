import XCTest

final class PetEngineTests: XCTestCase {
    private var utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    /// 09:00 UTC on a Monday.
    private let start = Date(timeIntervalSince1970: 1_767_603_600)

    private func newPet(gentle: Bool = true) -> Pet {
        var p = Pet(now: start, gentle: gentle)
        p.seed = 12345
        return p
    }

    private func run(_ p: inout Pet, days: Double, policy: (inout Pet) -> Void = { _ in }) {
        var t = start
        let end = start.addingTimeInterval(days * 86400)
        while t < end && p.stage != .ghost {
            t = t.addingTimeInterval(300)
            p.advance(to: t, calendar: utc)
            policy(&p)
        }
    }

    func testEggHatchesIntoABabyAfterTenMinutes() {
        var p = newPet()
        p.advance(to: start.addingTimeInterval(5 * 60), calendar: utc)
        XCTAssertEqual(p.stage, .egg)
        p.advance(to: start.addingTimeInterval(11 * 60), calendar: utc)
        XCTAssertEqual(p.stage, .baby)
        XCTAssertTrue(SpeciesData.babies.contains(p.species))
        XCTAssertEqual(p.dex, [p.species])
    }

    func testPetSleepsAtNightAndWakesInTheMorning() {
        var p = newPet()
        p.advance(to: start.addingTimeInterval(13 * 3600), calendar: utc)   // 22:00
        XCTAssertTrue(p.asleep)
        p.advance(to: start.addingTimeInterval(24 * 3600), calendar: utc)   // 09:00 next day
        XCTAssertFalse(p.asleep)
    }

    func testDecayIsPausedWhileAsleep() {
        var p = newPet()
        p.advance(to: start.addingTimeInterval(13 * 3600), calendar: utc)   // just asleep
        let hunger = p.hunger
        p.advance(to: start.addingTimeInterval(23 * 3600), calendar: utc)   // 08:00 next day
        XCTAssertEqual(p.hunger, hunger)
    }

    func testDiligentMeatEaterReachesAnUltimateAndRetires() {
        var p = newPet()
        run(&p, days: 25) { p in
            if p.asleep { if p.lightOn { _ = p.toggleLight() }; return }
            if p.hunger <= 2 { _ = p.feed(.meat) }
            if p.poops > 0 { _ = p.clean() }
            if p.sick { _ = p.giveMedicine(); _ = p.giveMedicine() }
            if p.temp != 0 { _ = p.climate() }
            if p.happy <= 2 { _ = p.feedSnack() }
            if p.call == .naughty { _ = p.scold() }
            _ = p.train(); _ = p.battle()
        }
        XCTAssertTrue(p.dex.count >= 5, "expected one species per stage, got \(p.dex)")
        XCTAssertEqual(p.stage, .ghost)
        XCTAssertEqual(p.causeOfDeath, "lived a full, happy life")
        XCTAssertEqual(Species.named(p.dex.last!)?.stage, .ultimate)
    }

    func testDietSteersTheEvolutionLine() {
        for (food, child) in [(Food.meat, "rawr"), (.veggie, "sprig"), (.pasta, "twirl")] {
            var p = newPet()
            run(&p, days: 2) { p in
                if p.asleep { if p.lightOn { _ = p.toggleLight() }; return }
                if p.hunger <= 2 { _ = p.feed(food) }
                if p.poops > 0 { _ = p.clean() }
                if p.sick { _ = p.giveMedicine(); _ = p.giveMedicine() }
                if p.temp != 0 { _ = p.climate() }
                if p.happy <= 2 { _ = p.feedSnack() }
            }
            XCTAssertTrue(p.dex.contains(child), "\(food) should reach \(child), got \(p.dex)")
        }
    }

    func testClassicModeNeglectEndsInDeathButGentleModeDoesNot() {
        var classic = newPet(gentle: false)
        run(&classic, days: 25)
        XCTAssertEqual(classic.stage, .ghost)
        XCTAssertNotEqual(classic.causeOfDeath, "lived a full, happy life")

        var gentle = newPet(gentle: true)
        run(&gentle, days: 12)
        XCTAssertNotEqual(gentle.stage, .ghost)
    }

    func testNeglectTakesTheScruffyBranch() {
        var p = newPet()
        run(&p, days: 6)
        XCTAssertTrue(p.dex.contains("mud"), "neglected baby should become Mudpie, got \(p.dex)")
    }

    /// A player who looks in twice a day and cares properly must not be pushed onto the neglect line.
    func testTwiceADayPlayerIsNotTreatedAsNeglectful() {
        var neglectLines = 0
        for seed in 1...6 {
            var p = Pet(now: start, gentle: true)
            p.seed = UInt64(seed) * 7919 + 13
            var t = start
            let end = start.addingTimeInterval(14 * 86400)
            while t < end && p.stage != .ghost {
                t = t.addingTimeInterval(300)
                p.advance(to: t, calendar: utc)
                let hour = utc.component(.hour, from: t), minute = utc.component(.minute, from: t)
                if p.asleep, p.lightOn, hour >= 21 { _ = p.toggleLight() }
                guard !p.asleep, p.stage != .egg, minute < 5, hour == 8 || hour == 19 else { continue }
                for _ in 0..<4 where p.hunger < Pet.maxHearts { _ = p.feed(.meat) }
                if p.poops > 0 { _ = p.clean() }
                if p.sick { _ = p.giveMedicine(); _ = p.giveMedicine() }
                if p.temp != 0 { _ = p.climate() }
                for _ in 0..<4 where p.happy < Pet.maxHearts { _ = p.finishPlay(wins: 4) }
            }
            if p.dex.contains("mud") || p.dex.contains("grime") || p.dex.contains("gremlin") { neglectLines += 1 }
        }
        XCTAssertLessThanOrEqual(neglectLines, 1, "twice-a-day care ended on the neglect line in \(neglectLines) of 6 runs")
    }

    func testOverfeedingSnacksMakesAPetHeavyButNormalFeedingDoesNot() {
        var normal = newPet()
        run(&normal, days: 4) { p in
            if p.asleep { if p.lightOn { _ = p.toggleLight() }; return }
            if p.hunger <= 2 { _ = p.feed(.meat) }
            if p.happy <= 1 { _ = p.finishPlay(wins: 4) }
            if p.poops > 0 { _ = p.clean() }
            if p.sick { _ = p.giveMedicine(); _ = p.giveMedicine() }
        }
        XCTAssertFalse(normal.overweight, "normal feeding should not make the pet heavy")

        var snacker = newPet()
        run(&snacker, days: 4) { p in
            if p.asleep { if p.lightOn { _ = p.toggleLight() }; return }
            if p.hunger <= 2 { _ = p.feed(.meat) }
            while p.happy < 4 { _ = p.feedSnack() }
            if p.poops > 0 { _ = p.clean() }
            if p.sick { _ = p.giveMedicine(); _ = p.giveMedicine() }
        }
        XCTAssertTrue(snacker.overweight, "constant snacking should make the pet heavy, weight \(snacker.weight)")
    }

    func testVacationModeFreezesTime() {
        var p = newPet()
        p.advance(to: start.addingTimeInterval(20 * 60), calendar: utc)
        p.paused = true
        let hunger = p.hunger, age = p.age
        p.advance(to: start.addingTimeInterval(3 * 86400), calendar: utc)
        XCTAssertEqual(p.hunger, hunger)
        XCTAssertEqual(p.age, age, accuracy: 1)
    }

    func testTrainingAndBattleHaveCooldowns() {
        var p = newPet()
        p.advance(to: start.addingTimeInterval(11 * 60), calendar: utc)
        XCTAssertEqual(p.train(), "\(p.name) is too little")
        p.stage = .child; p.species = "rawr"
        XCTAssertEqual(p.train(), "Good workout!")
        XCTAssertEqual(p.train(), "\(p.name) needs a rest")
    }

    func testSaveRoundTripsAndOldSavesStillDecode() throws {
        var p = newPet()
        run(&p, days: 3)
        let data = try JSONEncoder().encode(p)
        XCTAssertEqual(try JSONDecoder().decode(Pet.self, from: data), p)

        // A save from an older version that lacks newer fields.
        var dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        for key in ["temp", "dex", "trains", "battles", "stageTrain", "paused", "lastTrain"] { dict.removeValue(forKey: key) }
        let old = try JSONSerialization.data(withJSONObject: dict)
        let decoded = try JSONDecoder().decode(Pet.self, from: old)
        XCTAssertEqual(decoded.name, p.name)
        XCTAssertEqual(decoded.species, p.species)
        XCTAssertEqual(decoded.temp, 0)
    }

    func testEveryEvolutionTableEndsWithAGuaranteedBranch() {
        for sp in Species.all where sp.stage != .ultimate {
            XCTAssertFalse(sp.evolutions.isEmpty, "\(sp.id) has no evolutions")
            for e in sp.evolutions {
                let target = Species.named(e.to)
                XCTAssertNotNil(target, "\(sp.id) -> \(e.to) missing")
            }
            let fallback = sp.evolutions.contains { $0.req.mistMin == 0 && $0.req.train == 0 && $0.req.wins == 0
                && $0.req.smarts == 0 && !$0.req.heavy && $0.req.lead == nil }
            let leads = Set(sp.evolutions.compactMap { $0.req.lead })
            XCTAssertTrue(fallback || leads.count == 3, "\(sp.id) may have no matching branch")
        }
    }

    func testEventsRecordWhatHappenedWhileAway() {
        var p = newPet()
        run(&p, days: 3)
        let kinds = Set(p.events.map { $0.kind })
        XCTAssertTrue(kinds.isSuperset(of: ["hatched", "sleep", "wake"]), "got \(kinds)")
        XCTAssertLessThanOrEqual(p.events.count, 40)
        XCTAssertEqual(p.events.first?.kind, "hatched")
        XCTAssertEqual(p.events, p.events.sorted { $0.at < $1.at })
    }

    func testSpritesAreSixteenBySixteen() {
        for sp in Species.all {
            XCTAssertEqual(sp.frames.count, 2)
            for frame in sp.frames {
                XCTAssertEqual(frame.count, 16, sp.id)
                XCTAssertTrue(frame.allSatisfy { $0.count == 16 }, sp.id)
            }
        }
    }
}
