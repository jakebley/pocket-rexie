import XCTest

/// Native 96x96 biome painters A (docs/RESOLUTION.md stage 2): meadow, woods, underwater, clouds, garden, yard, warren.
/// Port of expo-prototype/test/biomes96.ts: the generated static art is the Expo art (hashes), every biome draws in every phase,
/// rain, facing and motion with valid codes, scenery never touches the pet, the scenes are rich, animate, and are deterministic.
final class Biome96ATests: XCTestCase {
    private var utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
    /// 09:00 UTC on a Monday.
    private let base = Date(timeIntervalSince1970: 1_767_603_600)

    private static let set: [(Biome, String)] = [(.meadow, "dino"), (.woods, "fox"), (.underwater, "fish"), (.clouds, "spirits"),
                                                 (.garden, "bug"), (.yard, "cat"), (.warren, "bunny")]
    private let hours = [6, 12, 19, 23]

    private func adult(_ family: String) -> Species {
        // clouds: a spirit that is not in the ember realm
        Species.all.first { $0.family == family && $0.stage == .adult && !Biome.emberSpirits.contains($0.id) }!
    }

    private func makePet(_ sp: Species, seed: UInt64) -> Pet {
        var p = Pet(now: base)
        p.seed = seed
        p.stage = sp.stage
        p.species = sp.id
        p.family = sp.family
        p.hunger = 3
        p.happy = 3
        p.lastTick = base
        return p
    }

    private func seed(for weather: SceneAmbient.Weather) -> UInt64 {
        for s in 1...600 where SceneAmbient(seed: UInt64(s), date: base, calendar: utc).weather == weather { return UInt64(s) }
        return 1
    }

    private func render(_ pet: Pet, hour: Int, x: Double = 14, facing: Int = 1, biome: Biome? = nil,
                        animated: Bool = true, offset: Double = 0) -> SceneRaster {
        var state = SceneState.still(for: pet)
        state.x = x
        state.facing = facing
        var options = SceneRenderOptions()
        options.calendar = utc
        options.look = .technicolor
        options.animated = animated
        options.biome = biome
        let date = base.addingTimeInterval(Double(hour - 9) * 3600 + offset)
        return SceneRenderer.render(pet: pet, state: state, date: date, options: options)
    }

    private func isPet(_ c: UInt8) -> Bool { SceneLayer(rawValue: c)?.isPetLayer == true }
    private func isScn(_ c: UInt8) -> Bool { c != 0 && SceneLayer.isScenery(c) }

    // MARK: 1. the static art is the Expo art

    func testStaticLayersMatchExpoHashes() {
        XCTAssertGreaterThanOrEqual(Biome96A.expoHashes.count, 50)
        var checked = 0
        for (key, expected) in Biome96A.expoHashes where key.hasSuffix(".back") {
            let parts = key.split(separator: ".").map(String.init)
            guard parts.count == 4, let biome = Biome(rawValue: parts[0]) else { XCTFail(key); continue }
            let period: SceneAmbient.Period = ["dawn": .dawn, "day": .day, "dusk": .dusk, "night": .night][parts[1]]!
            let cells = Biome96A.backLayer(biome, period, parts[2] == "1")
            XCTAssertEqual(cells.count, 96 * 96, key)
            XCTAssertEqual(Layer96.hash(cells), expected, "\(key) matches the Expo painter")
            checked += 1
        }
        XCTAssertEqual(checked, Biome96ATests.set.count * 8)
    }

    func testRunLengthDecode() {
        let cells = Layer96.decode("0x9214,5ax4,0x4,1x1")
        XCTAssertEqual(cells.count, 9216)
        XCTAssertEqual(cells[0], 0)
        XCTAssertEqual(cells[9214], 0x5a)
        XCTAssertEqual(cells[9217 - 1 - 4 - 0], 0)
    }

    // MARK: 2. slot colours

    func testEverySlotHasAColour() {
        let slotBiomes: [Biome] = [.meadow, .woods, .underwater, .clouds, .yard]
        for biome in slotBiomes {
            for period in [SceneAmbient.Period.dawn, .day, .dusk, .night] {
                for rain in [false, true] {
                    let slots = Biome96A.slotColors(biome: biome, period: period, rain: rain)
                    XCTAssertNotNil(slots, "\(biome)")
                    XCTAssertGreaterThan(slots?.filter { $0 != "-" }.count ?? 0, 20)
                    for appearance in [ScenePalette.Appearance.light, .dark] {
                        let t = ScenePalette.table(mode: .technicolor, appearance: appearance, night: biome.isDark(period), line: .meat,
                                                   biome: biome, period: period, rain: rain)
                        XCTAssertEqual(t.count, ScenePalette.tableSize)
                        for (i, hex) in (slots ?? []).enumerated() where hex != "-" && i >= Biome96A.glowSlots {
                            XCTAssertNotEqual(t[Int(SceneLayer.slotFirst) + i], t[Int(SceneLayer.ink.rawValue)], "\(biome) slot \(i)")
                        }
                    }
                }
            }
        }
    }

    // MARK: 3. every biome draws; the pet is never covered; the scenes are rich

    func testEveryBiomeDrawsAndNeverTouchesThePet() {
        let rainSeed = seed(for: .rain), dryHour = seed(for: .clear)
        var scenes = 0, bad = 0, ringBad = 0, hudBad = 0, richMin = Int.max
        for (biome, family) in Biome96ATests.set {
            XCTAssertTrue(BiomeDraw.ownsGround96(biome))
            let sp = adult(family)
            for sd in [dryHour, rainSeed] {
                let pet = makePet(sp, seed: sd)
                for hour in hours {
                    for facing in [1, -1] {
                        for x in [0.0, 14, 30] {
                            let a = render(pet, hour: hour, x: x, facing: facing)
                            let plain = render(pet, hour: hour, x: x, facing: facing, biome: .sky)
                            scenes += 1
                            XCTAssertEqual(a.n, 96)
                            if !a.cells.allSatisfy({ $0 <= SceneLayer.slotLast }) { bad += 1 }
                            for i in 0..<a.cells.count where isPet(a.cells[i]) != isPet(plain.cells[i]) { bad += 1; break }
                            for i in 0..<a.cells.count where isPet(a.cells[i]) {
                                let cx = i % 96, cy = i / 96
                                var hit = false
                                for dy in -1...1 where !hit {
                                    for dx in -1...1 {
                                        let nx = cx + dx, ny = cy + dy
                                        if nx >= 0 && ny >= 0 && nx < 96 && ny < 96 && isScn(a.cells[ny * 96 + nx]) { hit = true; break }
                                    }
                                }
                                if hit { ringBad += 1; break }
                            }
                            var hud = 0
                            for y in 0..<23 { for xx in 0..<50 where isScn(a.cells[y * 96 + xx]) { hud += 1 } }
                            if Double(hud) > 0.04 * 23 * 50 { hudBad += 1 }
                            richMin = min(richMin, a.cells.filter { isScn($0) }.count)
                        }
                    }
                }
            }
        }
        XCTAssertGreaterThan(scenes, 300)
        XCTAssertEqual(bad, 0, "valid codes, and the pet's pixels do not depend on the scenery")
        XCTAssertEqual(ringBad, 0, "the pet keeps a clear 1px ring")
        XCTAssertEqual(hudBad, 0, "the HUD corner stays almost free of scenery")
        XCTAssertGreaterThanOrEqual(richMin, 600, "every scene has real detail")
    }

    // MARK: 4. animation and determinism

    func testAnimatedPartsMoveAndFramesAreDeterministic() {
        for (biome, family) in Biome96ATests.set {
            let pet = makePet(adult(family), seed: seed(for: .clear))
            for hour in [12, 23] {
                let f0 = render(pet, hour: hour)
                var moved = 0
                for k in 1..<6 {
                    let f = render(pet, hour: hour, offset: Double(k) * 0.7)
                    var d = 0
                    for i in 0..<f.cells.count where f.cells[i] != f0.cells[i] { d += 1 }
                    moved = max(moved, d)
                }
                XCTAssertGreaterThanOrEqual(moved, 8, "\(biome) \(hour)h: animated parts move the picture")
                XCTAssertEqual(render(pet, hour: hour, offset: 1.234).cells, render(pet, hour: hour, offset: 1.234).cells, "\(biome) is deterministic")
            }
            let s1 = render(pet, hour: 12, animated: false, offset: 0.1)
            let s2 = render(pet, hour: 12, animated: false, offset: 9)
            XCTAssertEqual(s1.cells, s2.cells, "\(biome): a still scene is frame zero")
        }
    }

    // MARK: 5. the other biomes still fall back

    func testBiomesWithoutAPainterKeepTheEnlargedArt() {
        let sp = Species.all.first { $0.family == "bot" && $0.stage == .adult }!
        let r = render(makePet(sp, seed: 7), hour: 12)
        XCTAssertTrue(r.cells.contains { isScn($0) }, "workshop still has its scenery")
    }
}
