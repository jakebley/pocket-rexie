import XCTest

/// Animal families: data, hatching, food labels, Plus gating, Technicolor body colors.
@MainActor
final class FamilyTests: XCTestCase {
    private var utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    /// 09:00 UTC on a Monday.
    private let start = Date(timeIntervalSince1970: 1_767_603_600)

    private let familyIDs = ["dino", "fox", "fish", "bird", "cat", "spirits", "bunny", "dragon", "bot", "slime", "bug", "alien"]
    private let dexSizes = ["dino": 39, "fox": 36, "fish": 38, "bird": 36, "cat": 36, "spirits": 36,
                            "bunny": 35, "dragon": 35, "bot": 36, "slime": 36, "bug": 37, "alien": 38]

    private func deadPet(family: String = "dino") -> Pet {
        var p = Pet(now: start)
        p.family = family
        p.stage = .ghost
        return p
    }

    // MARK: data

    func testEveryFamilyResolvesItsSpecies() {
        XCTAssertEqual(Species.families.map { $0.id }, familyIDs)
        XCTAssertTrue(Species.families[0].isFree)
        XCTAssertEqual(Species.families.filter { $0.isFree }.count, 1, "only dino is free")
        for fam in Species.families {
            let members = Species.all.filter { $0.family == fam.id }
            XCTAssertGreaterThan(members.count, 30, fam.id)
            XCTAssertEqual(Species.dexSize(family: fam.id), members.count, fam.id)
            XCTAssertEqual(members.count, dexSizes[fam.id], fam.id)
            let babies = Species.babies(family: fam.id)
            XCTAssertFalse(babies.isEmpty, fam.id)
            for id in babies {
                XCTAssertEqual(Species.named(id)?.stage, .baby, id)
                XCTAssertEqual(Species.named(id)?.family, fam.id, id)
            }
            for sp in members {
                for evo in sp.evolutions {
                    XCTAssertEqual(Species.named(evo.to)?.family, fam.id, "\(sp.id) -> \(evo.to) stays in family")
                }
            }
        }
    }

    // MARK: hatching

    func testHatchPicksFromTheFamilysBabies() {
        for fam in familyIDs {
            for seed in [1, 2, 3, 99, 12345] as [UInt64] {
                var p = Pet(now: start)
                p.seed = seed
                p.family = fam
                p.advance(to: start.addingTimeInterval(15 * 60), calendar: utc)
                XCTAssertEqual(p.stage, .baby, "\(fam) egg hatches")
                XCTAssertTrue(Species.babies(family: fam).contains(p.species), "\(fam): \(p.species)")
                XCTAssertEqual(Species.named(p.species)?.family, fam)
            }
        }
    }

    func testPetRoundTripsWithItsFamily() throws {
        for fam in familyIDs {
            var p = Pet(now: start)
            p.seed = 7
            p.family = fam
            p.advance(to: start.addingTimeInterval(15 * 60), calendar: utc)
            let back = try JSONDecoder().decode(Pet.self, from: JSONEncoder().encode(p))
            XCTAssertEqual(back.family, fam)
            XCTAssertEqual(back, p)
        }
    }

    // MARK: food

    func testFoodLabelsPerFamily() {
        XCTAssertEqual(Species.foodLabels(family: "dino"), ["Meat", "Veggies", "Pasta"])
        XCTAssertEqual(Species.foodLabels(family: "fox"), ["Mice", "Berries", "Fish"])
        XCTAssertEqual(Species.foodLabels(family: "fish"), ["Shrimp", "Algae", "Plankton"])
        XCTAssertEqual(Species.foodLabels(family: "bird"), ["Worms", "Seeds", "Minnows"])
        XCTAssertEqual(Species.foodLabels(family: "cat"), ["Tuna", "Catnip", "Milk"])
        // every family: three non-empty labels that match its Family record and fit one line of pixel text
        for fam in Species.families {
            XCTAssertEqual(Species.foodLabels(family: fam.id), fam.foods, fam.id)
            XCTAssertEqual(fam.foods.count, 3, fam.id)
            XCTAssertTrue(fam.foods.allSatisfy { !$0.isEmpty && $0.count <= 12 }, fam.id)
        }
        XCTAssertEqual(Species.foodLabels(family: "no-such-family"), ["Meat", "Veggies", "Pasta"])
    }

    // MARK: entitlements

    func testFreeEntitlementsUnlockOnlyDino() {
        let free = FreeEntitlements()
        XCTAssertFalse(free.isPlus)
        XCTAssertTrue(free.canHatch(family: "dino"))
        for fam in familyIDs where fam != "dino" { XCTAssertFalse(free.canHatch(family: fam), fam) }
        XCTAssertFalse(free.canHatch(family: "no-such-family"))
        let plus = PreviewEntitlements()
        XCTAssertTrue(plus.isPlus)
        for fam in familyIDs { XCTAssertTrue(plus.canHatch(family: fam), fam) }
        XCTAssertFalse(plus.canHatch(family: "no-such-family"))
    }

    func testPreviewSwitchSelectsEntitlements() {
        let suite = "com.pocketrexie.familytests"
        let defaults = UserDefaults(suiteName: suite) ?? .standard
        defaults.removePersistentDomain(forName: suite)
        XCTAssertFalse(EntitlementStore.current(defaults: defaults).isPlus)
        XCTAssertFalse(EntitlementStore.chooserEnabled(defaults: defaults))
        defaults.set(true, forKey: EntitlementStore.previewKey)
        #if DEBUG
        XCTAssertTrue(EntitlementStore.current(defaults: defaults).canHatch(family: "fox"))
        XCTAssertTrue(EntitlementStore.chooserEnabled(defaults: defaults))
        #else
        XCTAssertFalse(EntitlementStore.current(defaults: defaults).isPlus, "release ignores the tester switch")
        #endif
        defaults.removePersistentDomain(forName: suite)
    }

    func testTesterToolsGating() {
        let sandbox = URL(fileURLWithPath: "/private/var/mobile/Containers/Data/Application/X/StoreKit/sandboxReceipt")
        let store = URL(fileURLWithPath: "/private/var/mobile/Containers/Data/Application/X/StoreKit/receipt")
        XCTAssertTrue(TesterTools.isTestFlight(receiptURL: sandbox))
        XCTAssertFalse(TesterTools.isTestFlight(receiptURL: store), "App Store builds are not TestFlight")
        XCTAssertFalse(TesterTools.isTestFlight(receiptURL: nil))
        XCTAssertTrue(TesterTools.isEnabled(debug: true, receiptURL: nil))
        XCTAssertTrue(TesterTools.isEnabled(debug: false, receiptURL: sandbox))
        XCTAssertFalse(TesterTools.isEnabled(debug: false, receiptURL: store), "production never shows the tester tools")
        XCTAssertFalse(TesterTools.isEnabled(debug: false, receiptURL: nil))
    }

    func testSwitchesIgnoredWhenToolsOff() {
        let suite = "com.pocketrexie.testergating"
        let defaults = UserDefaults(suiteName: suite) ?? .standard
        defaults.removePersistentDomain(forName: suite)
        defaults.set(true, forKey: EntitlementStore.previewKey)
        defaults.set(true, forKey: EntitlementStore.chooserKey)
        XCTAssertFalse(EntitlementStore.previewEnabled(defaults: defaults, testerTools: false))
        XCTAssertFalse(EntitlementStore.chooserEnabled(defaults: defaults, testerTools: false))
        XCTAssertFalse(EntitlementStore.current(defaults: defaults, testerTools: false).canHatch(family: "fox"))
        XCTAssertTrue(EntitlementStore.previewEnabled(defaults: defaults, testerTools: true))
        XCTAssertTrue(EntitlementStore.chooserEnabled(defaults: defaults, testerTools: true))
        XCTAssertTrue(EntitlementStore.current(defaults: defaults, testerTools: true).canHatch(family: "fox"))
        defaults.removePersistentDomain(forName: suite)
    }

    func testTesterNewEggAnyFamily() {
        let model = GameModel(pet: Pet(now: Date()), persist: { _ in }, entitlements: FreeEntitlements())
        model.testerNewEgg(family: "fox", testerTools: false)
        XCTAssertEqual(model.pet.family, "dino", "no effect when tester tools are off")
        model.testerNewEgg(family: "fox", testerTools: true)
        XCTAssertEqual(model.pet.family, "fox")
        XCTAssertEqual(model.pet.stage, .egg)
        model.testerNewEgg(family: "no-such-family", testerTools: true)
        XCTAssertEqual(model.pet.family, "fox", "unknown family is ignored")
    }

    func testLockedFamilyCannotBeHatched() {
        let model = GameModel(pet: deadPet(), persist: { _ in }, entitlements: FreeEntitlements())
        model.chooseEgg(family: "fox")
        XCTAssertEqual(model.pet.stage, .ghost, "a locked family does not start an egg")
        XCTAssertTrue(model.message.contains("Plus"))
        model.startNewEgg(family: "fox")
        XCTAssertEqual(model.pet.stage, .egg)
        XCTAssertEqual(model.pet.family, "dino", "forcing a locked family falls back to dino")
    }

    func testUnlockedFamilyStartsItsEgg() {
        let model = GameModel(pet: deadPet(), persist: { _ in }, entitlements: PreviewEntitlements())
        model.chooseEgg(family: "cat")
        XCTAssertEqual(model.pet.stage, .egg)
        XCTAssertEqual(model.pet.family, "cat")
        XCTAssertEqual(model.mode, .home)
    }

    func testChooserNavigationWithTheButtons() {
        let model = GameModel(pet: deadPet(), persist: { _ in }, entitlements: FreeEntitlements())
        model.requestNewEgg()
        XCTAssertEqual(model.mode, .chooseEgg)
        XCTAssertEqual(model.menuIndex, 0)
        model.cycleSelection()            // fox: locked
        model.confirm()
        XCTAssertEqual(model.mode, .chooseEgg)
        XCTAssertEqual(model.pet.stage, .ghost)
        model.menuIndex = 0
        model.confirm()                   // dino
        XCTAssertEqual(model.pet.stage, .egg)
        XCTAssertEqual(model.pet.family, "dino")
        XCTAssertEqual(model.mode, .home)

        let again = GameModel(pet: deadPet(), persist: { _ in }, entitlements: FreeEntitlements())
        again.requestNewEgg()
        again.menuIndex = Species.families.count
        again.confirm()                   // cancel row
        XCTAssertEqual(again.mode, .home)
        XCTAssertEqual(again.pet.stage, .ghost)
    }

    func testNewEggKeepsAnUnlockedFamilyByDefault() {
        let model = GameModel(pet: deadPet(family: "fish"), persist: { _ in }, entitlements: PreviewEntitlements())
        model.startNewEgg()
        XCTAssertEqual(model.pet.family, "fish")
        let free = GameModel(pet: deadPet(family: "fish"), persist: { _ in }, entitlements: FreeEntitlements())
        free.startNewEgg()
        XCTAssertEqual(free.pet.family, "dino", "a lapsed Plus family gives way to dino for the next egg")
    }

    func testDexFamilyCyclesThroughEveryFamily() {
        let model = GameModel(pet: deadPet(), persist: { _ in }, entitlements: FreeEntitlements())
        var seen = [model.dexFamily ?? model.pet.family]
        for _ in 1..<familyIDs.count {
            model.cycleDexFamily()
            seen.append(model.dexFamily ?? "")
        }
        XCTAssertEqual(seen, familyIDs)
        model.cycleDexFamily()
        XCTAssertEqual(model.dexFamily, "dino")
    }

    // MARK: Technicolor body colors

    private func table(_ sp: Species, _ appearance: ScenePalette.Appearance) -> [RGB] {
        ScenePalette.table(mode: .technicolor, appearance: appearance, night: false,
                           line: PetLine(rawValue: sp.line) ?? .baby, bodyHex: sp.bodyHex)
    }

    func testEverySpeciesHasABodyColorInTechnicolor() {
        let body = Int(SceneLayer.body.rawValue)
        for sp in Species.all {
            if sp.family == "dino" {
                XCTAssertNil(sp.bodyHex, "dinos keep PetLine colors: \(sp.id)")
                XCTAssertNotNil(PetLine(rawValue: sp.line), sp.id)
            } else {
                XCTAssertNotNil(sp.bodyHex, "\(sp.id) needs a bodyHex from its family's LINE_COLORS")
                if let hex = sp.bodyHex {
                    XCTAssertEqual(hex.count, 7, sp.id)
                    XCTAssertEqual(table(sp, .light)[body], RGB(hex: hex), sp.id)
                }
            }
        }
    }

    func testLineColorsAnchorTheSpread() {
        // Hatchlings keep the family's plain line color; the other species spread around theirs.
        for sp in Species.all where sp.family == "fox" && sp.line == "baby" {
            XCTAssertEqual(sp.bodyHex, "#E7DCC0", sp.id)
        }
        let foxHex = Set(Species.all.filter { $0.family == "fox" }.compactMap { $0.bodyHex })
        XCTAssertGreaterThan(foxHex.count, 10, "look-alike species get different colors")
    }

    func testRendererCarriesTheFamilyColor() {
        for sp in Species.all where sp.family != "dino" {
            var p = Pet(now: start)
            p.family = sp.family
            p.stage = sp.stage
            p.species = sp.id
            p.lastTick = start
            XCTAssertEqual(SceneRenderer.bodyHexOf(p), sp.bodyHex, sp.id)
            XCTAssertEqual(SceneRenderer.still(pet: p, calendar: utc).bodyHex, sp.bodyHex, sp.id)
        }
        var egg = Pet(now: start)
        egg.family = "fox"
        XCTAssertNil(SceneRenderer.bodyHexOf(egg))
        var ghost = egg
        ghost.stage = .ghost
        XCTAssertNil(SceneRenderer.bodyHexOf(ghost))
    }

    func testTraditionalIgnoresTheBodyColor() {
        for appearance in [ScenePalette.Appearance.light, .dark] {
            let plain = ScenePalette.table(mode: .traditional, appearance: appearance, night: false, line: .meat)
            let withHex = ScenePalette.table(mode: .traditional, appearance: appearance, night: false,
                                             line: .meat, bodyHex: "#123456")
            XCTAssertEqual(plain, withHex, "Traditional output must not depend on the family color")
        }
    }
}
