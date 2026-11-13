import XCTest

/// Stage 2 of the finer Technicolor screen, set B: native 96x96 painters for sky, ember, crags, workshop, swamp and space
/// (Shared/Biome96B*.swift, ports of expo-prototype/src/ui/biome96/*.ts). Mirrors expo-prototype/test/biomes96b.ts: every biome
/// draws in every period and weather, the pet is never covered or touched by scenery, the indoor biomes drop the outdoor sky,
/// the static art is cached and the animated parts move. (Expo pins no golden hashes of the 96 backdrops.)
final class Biome96BTests: XCTestCase {
    private var utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
    /// 09:00 UTC on a Monday.
    private let base = Date(timeIntervalSince1970: 1_767_603_600)

    private let set: [Biome] = [.sky, .ember, .crags, .workshop, .swamp, .space]

    private func familyOf(_ biome: Biome) -> String {
        switch biome {
        case .sky: return "bird"
        case .ember: return "spirits"
        case .crags: return "dragon"
        case .workshop: return "bot"
        case .swamp: return "slime"
        default: return "alien"
        }
    }

    private func species(_ biome: Biome, _ stage: Stage) -> Species? {
        let fam = familyOf(biome)
        if biome == .ember {
            return Species.all.first { $0.family == fam && $0.stage == stage && Biome.emberSpirits.contains($0.id) }
        }
        return Species.all.first { $0.family == fam && $0.stage == stage }
    }

    private func makePet(_ sp: Species, seed: UInt64 = 7) -> Pet {
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

    /// A seed whose weather at the date is `weather` (the weather comes from the seed and the day).
    private func seed(for weather: SceneAmbient.Weather, hour: Int) -> UInt64 {
        let date = base.addingTimeInterval(Double(hour - 9) * 3600)
        for s in 1...800 where SceneAmbient(seed: UInt64(s), date: date, calendar: utc).weather == weather { return UInt64(s) }
        return 1
    }

    private func render(_ pet: Pet, biome: Biome?, hour: Int, x: Double = 16, facing: Int = 1,
                        action: SceneAction = .idle, offset: Double = 0, animated: Bool = true) -> SceneRaster {
        var state = SceneState.still(for: pet)
        state.x = x
        state.facing = facing
        state.action = action
        var options = SceneRenderOptions()
        options.calendar = utc
        options.look = .technicolor
        options.biome = biome
        options.animated = animated
        let date = base.addingTimeInterval(Double(hour - 9) * 3600 + offset)
        return SceneRenderer.render(pet: pet, state: state, date: date, options: options)
    }

    private func isPetCode(_ c: UInt8) -> Bool { SceneLayer(rawValue: c)?.isPetLayer == true }

    // MARK: 1. every biome has a painter that draws real scenery

    func testPaintersDrawNativeScenery() {
        for b in set {
            XCTAssertTrue(Biome96B.handles(b), "\(b)")
            XCTAssertTrue(Biome96.handles(b), "\(b) paints its own ground")
            let pet = makePet(species(b, .adult)!)
            let r = render(pet, biome: b, hour: 12)
            XCTAssertEqual(r.n, 96)
            var codes = Set<UInt8>()
            var scenery = 0
            for c in r.cells where SceneLayer.isScenery(c) { codes.insert(c); scenery += 1 }
            XCTAssertGreaterThan(scenery, 2500, "\(b) fills the frame with scenery")
            XCTAssertGreaterThanOrEqual(codes.count, 8, "\(b) uses many tones")
        }
    }

    // MARK: 2. every period, weather, facing, position and stage draws

    func testEveryPeriodAndWeatherDraws() {
        var drawn = 0
        for b in set {
            for stage in [Stage.baby, .child, .adult] {
                guard let sp = species(b, stage) else { continue }
                for hour in [6, 12, 19, 23] {
                    for weather in [SceneAmbient.Weather.clear, .rain] {
                        let pet = makePet(sp, seed: seed(for: weather, hour: hour))
                        for facing in [1, -1] {
                            for x in [0.0, 20, 40] {
                                for action in [SceneAction.idle, .sleep] {
                                    let r = render(pet, biome: b, hour: hour, x: x, facing: facing, action: action)
                                    XCTAssertEqual(r.n, 96)
                                    XCTAssertEqual(r.biome, b)
                                    drawn += 1
                                }
                            }
                        }
                    }
                }
            }
        }
        XCTAssertGreaterThan(drawn, 500)
    }

    // MARK: 3. scenery never touches the pet

    func testPetIsNeverCoveredByScenery() {
        var compared = 0
        for b in set {
            for stage in [Stage.baby, .adult] {
                guard let sp = species(b, stage) else { continue }
                for hour in [6, 12, 19, 23] {
                    for x in [0.0, 18, 36] {
                        for facing in [1, -1] {
                            let pet = makePet(sp)
                            let with = render(pet, biome: b, hour: hour, x: x, facing: facing, animated: false)
                            let without = render(pet, biome: .meadow, hour: hour, x: x, facing: facing, animated: false)
                            compared += 1
                            var differ = 0, ring = 0
                            for i in 0..<with.cells.count {
                                let a = with.cells[i], c = without.cells[i]
                                if isPetCode(a) != isPetCode(c) || (isPetCode(a) && a != c) { differ += 1 }
                                if isPetCode(a) {
                                    let px = i % 96, py = i / 96
                                    for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
                                        let nx = px + dx, ny = py + dy
                                        guard nx >= 0, ny >= 0, nx < 96, ny < 96 else { continue }
                                        if SceneLayer.isScenery(with.cells[ny * 96 + nx]) { ring += 1 }
                                    }
                                }
                            }
                            XCTAssertEqual(differ, 0, "\(b) \(stage) h\(hour) x\(x): the pet's pixels are the same as on the meadow")
                            XCTAssertEqual(ring, 0, "\(b) \(stage) h\(hour) x\(x): a clear ring around the pet")
                        }
                    }
                }
            }
        }
        XCTAssertGreaterThan(compared, 40)
    }

    // MARK: 4. indoor biomes drop the outdoor sky; outdoor ones keep it

    func testSkyObjects() {
        let skyCodes: Set<UInt8> = [SceneLayer.sun, .moon, .star, .cloud, .rain, .butterfly].reduce(into: Set<UInt8>()) { $0.insert($1.rawValue) }
        for b in [Biome.workshop, .swamp, .space] {
            let pet = makePet(species(b, .adult)!)
            for hour in [6, 12, 19, 23] {
                let r = render(pet, biome: b, hour: hour, animated: false)
                var sky = 0
                for i in 0..<(90 * 96) where skyCodes.contains(r.cells[i]) { sky += 1 }
                XCTAssertEqual(sky, 0, "\(b) h\(hour): no outdoor sky objects")
            }
            let wet = makePet(species(b, .adult)!, seed: seed(for: .rain, hour: 12))
            let r = render(wet, biome: b, hour: 12, animated: false)
            XCTAssertFalse(r.cells.contains(SceneLayer.rain.rawValue), "\(b): no rain streaks indoors")
        }
        for b in [Biome.crags, .sky, .ember] {
            let pet = makePet(species(b, .adult)!, seed: seed(for: .clear, hour: 12))
            let r = render(pet, biome: b, hour: 12, animated: false)
            XCTAssertTrue(r.cells.contains(SceneLayer.sun.rawValue), "\(b): the sun is still in the sky by day")
        }
    }

    // MARK: 5. cached static art, moving live art

    func testCacheAndMotion() {
        for b in set {
            let pet = makePet(species(b, .adult)!, seed: seed(for: .clear, hour: 12))
            let a = render(pet, biome: b, hour: 12)
            let before = Biome96BCache.count
            for k in 0..<6 { _ = render(pet, biome: b, hour: 12, offset: Double(k) * 0.4) }
            XCTAssertEqual(Biome96BCache.count, before, "\(b): the static layers come from the cache")
            XCTAssertEqual(a, render(pet, biome: b, hour: 12), "\(b): same inputs, same pixels")
            var moved = 0
            for dt in [0.5, 0.9, 1.3, 2.1, 3.3] {
                let d = render(pet, biome: b, hour: 12, offset: dt)
                var diff = 0
                for i in 0..<d.cells.count where d.cells[i] != a.cells[i] { diff += 1 }
                if diff > 4 { moved += 1 }
            }
            XCTAssertGreaterThanOrEqual(moved, 3, "\(b): animated parts move (\(moved) of 5)")
        }
    }

    // MARK: 6. slot colours (sky and ember)

    func testSlotColours() {
        for b in [Biome.sky, .ember] {
            guard let def = BiomeSlots96.def(b) else { XCTFail("\(b) has slots"); continue }
            XCTAssertGreaterThan(def.slots.count, 20)
            for s in def.slots {
                XCTAssertGreaterThanOrEqual(s.code, Slot96.first)
                XCTAssertLessThanOrEqual(s.code, Slot96.last)
            }
            XCTAssertEqual(Set(def.slots.map { $0.code }).count, def.slots.count, "slot codes are unique")
            for appearance in [ScenePalette.Appearance.light, .dark] {
                for period in [SceneAmbient.Period.dawn, .day, .dusk, .night] {
                    let t = ScenePalette.table(mode: .technicolor, appearance: appearance, night: b.isDark(period), line: .meat,
                                               biome: b, period: period, rain: false)
                    XCTAssertEqual(t.count, ScenePalette.tableSize)
                    let ink = t[Int(SceneLayer.ink.rawValue)]
                    for s in def.slots where !s.glow { XCTAssertNotEqual(t[Int(s.code)], ink, "\(b) slot \(s.code)") }
                }
            }
        }
        // a tone sinks at night; a glow slot keeps its colour
        let lightDay = ScenePalette.table(mode: .technicolor, appearance: .light, night: false, line: .meat, biome: .sky, period: .day, rain: false)
        let lightNight = ScenePalette.table(mode: .technicolor, appearance: .light, night: true, line: .meat, biome: .sky, period: .night, rain: false)
        let mount = Int(BiomeSlots96.code(.sky, "mount")), glint = Int(BiomeSlots96.code(.sky, "glint"))
        XCTAssertLessThan(lightNight[mount].luminance, lightDay[mount].luminance)
        XCTAssertEqual(lightNight[glint], lightDay[glint])
        XCTAssertEqual(lightDay[mount], RGB(hex: "#88B6E0"))
    }

    // MARK: 7. cost

    private func now() -> Double { ProcessInfo.processInfo.systemUptime }

    func testFrameIsCheap() {
        for b in set {
            let pet = makePet(species(b, .adult)!)
            for k in 0..<6 { _ = render(pet, biome: b, hour: 23, offset: Double(k) * 0.125) }
            let n = 60
            let t0 = now()
            for k in 0..<n { _ = render(pet, biome: b, hour: 23, offset: 1 + Double(k) * 0.125) }
            let ms = (now() - t0) * 1000 / Double(n)
            print("BIOME96B-PERF \(b) \(String(format: "%.3f", ms)) ms/frame")
            XCTAssertLessThan(ms, 60, "\(b)")
        }
    }
}
