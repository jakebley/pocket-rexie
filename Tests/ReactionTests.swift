import XCTest

final class ReactionTests: XCTestCase {
    private func make(_ sp: Species) -> Pet {
        var p = Pet(now: Date(timeIntervalSince1970: 1_767_603_600))
        p.species = sp.id
        p.stage = sp.stage
        p.name = sp.name
        p.hunger = 4
        p.happy = 4
        p.poops = 0
        p.sick = false
        return p
    }

    func testEverySpeciesHasKindAndCleanLines() {
        XCTAssertEqual(Species.all.count, 438)
        for sp in Species.all {
            XCTAssertNotNil(Reactions.kindOf[sp.id], "no reaction kind for \(sp.id)")
            let pet = make(sp)
            var states: [Pet] = [pet]
            var sick = pet; sick.sick = true; states.append(sick)
            var hungry = pet; hungry.hunger = 0; states.append(hungry)
            var dirty = pet; dirty.poops = 3; states.append(dirty)
            var sad = pet; sad.happy = 0; states.append(sad)
            var heavy = pet; heavy.weight = pet.baseWeight + 20; states.append(heavy)
            for state in states {
                for step in 0..<12 {
                    let line = Reactions.line(for: state, step: step)
                    XCTAssertFalse(line.isEmpty, sp.id)
                    XCTAssertFalse(line.contains("{n}"), "\(sp.id): \(line)")
                    XCTAssertTrue(line.contains(sp.name), "\(sp.id): \(line)")
                    XCTAssertLessThanOrEqual(line.count, 40, "\(sp.id): \(line)")
                    if sp.family != "dino" {
                        XCTAssertFalse(line.contains("Dinos can"), "\(sp.id): \(line)")
                    }
                    if sp.family != "cat" {
                        XCTAssertFalse(line.lowercased().contains("purr"), "\(sp.id): \(line)")
                    }
                }
            }
        }
    }

    func testEveryRawLineIsShortEnough() {
        for sp in Species.all {
            for raw in Reactions.allLines(species: sp.id) {
                let line = raw.replacingOccurrences(of: "{n}", with: sp.name)
                XCTAssertLessThanOrEqual(line.count, 40, "\(sp.id): \(line)")
            }
        }
    }

    func testSickPetSaysSo() {
        guard let sp = Species.all.first else { return XCTFail("no species") }
        var pet = make(sp)
        pet.sick = true
        for step in 0..<6 {
            let line = Reactions.line(for: pet, step: step)
            XCTAssertTrue(line.contains("unwell") || line.contains("weak"), line)
        }
        pet.sick = false
        pet.hunger = 0
        for step in 0..<6 {
            let line = Reactions.line(for: pet, step: step)
            XCTAssertTrue(line.contains("hungry") || line.contains("tummy"), line)
        }
    }

    func testTapsVary() {
        for id in ["pip", "rawr", "cat_hearthpurr"] {
            guard let sp = Species.named(id) else { XCTFail("missing \(id)"); continue }
            let pet = make(sp)
            var seen = Set<String>()
            for step in 0..<9 { seen.insert(Reactions.line(for: pet, step: step)) }
            XCTAssertGreaterThanOrEqual(seen.count, 2, id)
        }
    }

    func testSameStepIsDeterministicAndPetUsesIt() {
        guard let sp = Species.named("rawr") else { return XCTFail("missing rawr") }
        var a = make(sp)
        var b = make(sp)
        a.stage = .teen; b.stage = .teen
        XCTAssertEqual(a.pet(step: 4), b.pet(step: 4))
        XCTAssertFalse(a.pet(step: 5).contains("Dinos can purr"))
    }

    func testOnlyCatsPurrSoCatSpeciesLineExists() {
        guard let cat = Species.named("cat_hearthpurr") else { return XCTFail("missing cat") }
        let lines = Reactions.allLines(species: cat.id).map { $0.lowercased() }
        XCTAssertTrue(lines.contains { $0.contains("purr") })
    }
}
