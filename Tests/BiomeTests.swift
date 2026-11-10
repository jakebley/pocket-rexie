import XCTest

/// Biomes (docs/BIOMES.md): the family to background mapping, drawing in every period, weather and facing, the pet is
/// never covered, Traditional stays plain, the dino meadow is unchanged, the palette is complete for every biome.
/// Mirrors expo-prototype/test/biomes.ts.
final class BiomeTests: XCTestCase {
    private var utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    /// 09:00 UTC on a Monday.
    private let base = Date(timeIntervalSince1970: 1_767_603_600)

    private let periodHours: [(String, Int)] = [("dawn", 6), ("day", 12), ("dusk", 19), ("night", 23)]
    private let appearances: [ScenePalette.Appearance] = [.light, .dark]

    private func date(hour: Int) -> Date { base.addingTimeInterval(Double(hour - 9) * 3600) }

    private func makePet(_ sp: Species, seed: UInt64 = 777) -> Pet {
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

    /// A seed whose weather on the test day is `weather` (the weather comes from the seed and the day).
    private func seed(for weather: SceneAmbient.Weather) -> UInt64 {
        for s in 1...600 {
            let amb = SceneAmbient(seed: UInt64(s), date: base, calendar: utc)
            if amb.weather == weather { return UInt64(s) }
        }
        return 1
    }

    private func render(_ pet: Pet, hour: Int, x: Double = 16, facing: Int = 1, biome: Biome? = nil,
                        animated: Bool = true, offset: Double = 0) -> SceneRaster {
        var state = SceneState.still(for: pet)
        state.x = x
        state.facing = facing
        var options = SceneRenderOptions()
        options.calendar = utc
        options.animated = animated
        options.biome = biome
        return SceneRenderer.render(pet: pet, state: state, date: date(hour: hour).addingTimeInterval(offset), options: options)
    }

    private func isCue(_ code: UInt8) -> Bool {
        code == SceneLayer.wave.rawValue || code == SceneLayer.hole.rawValue || code == SceneLayer.peak.rawValue
    }

    /// One adult of every family (plus an ember spirit), the species the render scenes use.
    private func adults() -> [Species] {
        var list: [Species] = []
        for fam in Species.families {
            if let sp = Species.all.first(where: { $0.family == fam.id && $0.stage == .adult }) { list.append(sp) }
        }
        if let ember = Species.named("spirits_emberhorn") { list.append(ember) }
        return list
    }

    // MARK: 1. mapping

    func testEveryFamilyHasABiomeAndSpiritsSplitByLine() {
        XCTAssertEqual(Species.families.count, 12)
        var seen = Set<Biome>()
        for fam in Species.families {
            let b = Biome.ofFamily(fam.id)
            seen.insert(b)
            XCTAssertEqual(b == .meadow, fam.id == "dino", fam.id)
        }
        XCTAssertEqual(seen.count, Species.families.count, "each family has its own biome")
        XCTAssertEqual(Biome.allCases.count, 13)
        XCTAssertEqual(Biome.ofFamily("dino"), .meadow)
        var ember = 0
        for sp in Species.all {
            let b = Biome.of(species: sp.id, family: sp.family)
            XCTAssertEqual(b == .meadow, sp.family == "dino", sp.id)
            XCTAssertEqual(Biome.of(makePet(sp)), b, "\(sp.id): pet biome follows the species")
            if sp.family == "spirits" {
                let isEmber = ["imp", "horn", "soot"].contains(sp.line)
                XCTAssertEqual(b == .ember, isEmber, "\(sp.id) (\(sp.line)) ember split")
                XCTAssertEqual(Biome.emberSpirits.contains(sp.id), isEmber, sp.id)
                if isEmber { ember += 1 }
                if sp.line == "halo" || sp.line == "baby" { XCTAssertEqual(b, .clouds, sp.id) }
            } else {
                XCTAssertEqual(b, Biome.ofFamily(sp.family), sp.id)
            }
        }
        XCTAssertEqual(ember, Biome.emberSpirits.count, "every ember spirit exists")
        // an unhatched egg already lives in its family's biome
        var egg = Pet(now: base)
        egg.family = "fish"
        XCTAssertEqual(Biome.of(egg), .underwater)
        XCTAssertEqual(SceneRenderer.still(pet: egg, calendar: utc).biome, .underwater)
        var grave = Pet(now: base)
        grave.family = "bot"
        grave.stage = .ghost
        XCTAssertEqual(SceneRenderer.still(pet: grave, calendar: utc).biome, .workshop)
        XCTAssertTrue(Biome.alwaysDark.contains(.swamp) && !Biome.alwaysDark.contains(.woods))
        XCTAssertTrue(Biome.workshop.isDark(.day) && !Biome.woods.isDark(.day) && Biome.woods.isDark(.night))
    }

    // MARK: 2. every species draws in every period, weather and facing

    func testEverySpeciesDrawsInEveryPeriodWeatherAndFacing() {
        let dry = seed(for: .clear), wet = seed(for: .rain)
        var draws = 0
        for sp in Species.all {
            for (name, hour) in periodHours {
                for rainy in [false, true] {
                    var p = makePet(sp, seed: rainy ? wet : dry)
                    if name == "night" && rainy { p.lightOn = false }
                    if name == "dusk" { p.poops = 2 }
                    let facing = (name == "dusk") ? -1 : 1
                    let r = render(p, hour: hour, x: name == "dawn" ? 0 : 16, facing: facing)
                    draws += 1
                    XCTAssertEqual(r.weather == .rain, rainy, "\(sp.id) \(name)")
                    XCTAssertGreaterThan(r.inkCount, 60, "\(sp.id) \(name)")
                    XCTAssertEqual(r.biome, Biome.of(p), sp.id)
                }
            }
        }
        XCTAssertGreaterThan(draws, 3000)
        // every biome with every scene state the director uses
        let fox = Species.all.first { $0.family == "fox" && $0.stage == .adult }!
        let p = makePet(fox)
        for b in Biome.allCases {
            for action in [SceneAction.idle, .walk, .sleep, .eat, .battle, .dance, .poop] {
                var state = SceneState.still(for: p)
                state.action = action
                state.x = 10
                var options = SceneRenderOptions()
                options.calendar = utc
                options.biome = b
                let r = SceneRenderer.render(pet: p, state: state, date: date(hour: 12), options: options)
                XCTAssertGreaterThan(r.inkCount, 60, "\(action) in \(b)")
            }
        }
    }

    // MARK: 3. the pet is never overwritten, scenery keeps off its silhouette

    func testThePetIsNeverCoveredByScenery() {
        var petPixels = 0, bad = 0, ringBad = 0, cases = 0
        let spots: [(Int, Double, Int)] = [(12, 0, 1), (23, 16, -1), (19, 32, 1), (6, 9, -1)]
        for sp in Species.all where sp.family != "dino" {
            let p = makePet(sp, seed: 3)
            for (hour, x, facing) in spots {
                let a = render(p, hour: hour, x: x, facing: facing)
                let m = render(p, hour: hour, x: x, facing: facing, biome: .meadow)
                cases += 1
                for i in 0..<a.cells.count {
                    let la = a.cells[i], lm = m.cells[i]
                    if SceneLayer(rawValue: lm)?.isPetLayer == true {
                        petPixels += 1
                        if la != lm { bad += 1 }
                    }
                    if SceneLayer.isScenery(la) {
                        let cx = i % SceneRaster.side, cy = i / SceneRaster.side
                        for dy in -1...1 {
                            for dx in -1...1 {
                                let nx = cx + dx, ny = cy + dy
                                if nx >= 0, ny >= 0, nx < SceneRaster.side, ny < SceneRaster.side,
                                   SceneLayer(rawValue: a.cells[ny * SceneRaster.side + nx])?.isPetLayer == true { ringBad += 1 }
                            }
                        }
                    }
                }
            }
        }
        XCTAssertGreaterThan(petPixels, 100_000, "pet pixels checked over \(cases) renders")
        XCTAssertEqual(bad, 0, "the pet's footprint is never overwritten by background pixels")
        XCTAssertEqual(ringBad, 0, "no scenery pixel touches the pet silhouette")
    }

    func testTheSceneryClearRemovesWhatShowsThroughAnEyeHole() {
        // a cloud pixel behind an eye hole is cleared in a biome (the meadow keeps its old picture)
        var r = SceneRaster()
        let rows = ["XXXXXXXX", "XXXXXXXX", "XXX.XXXX", "XXXXXXXX", "XXXXXXXX"]
        r.set(3, 2, .cloud)
        r.set(10, 2, .bark)
        r.set(8, 2, .canopy)
        r.set(8, 5, .bark)
        r.clearAroundPet(rows, x: 0, y: 0, mirror: false)
        XCTAssertEqual(r.layer(3, 2), .off, "the cloud behind the eye hole is gone")
        XCTAssertEqual(r.layer(8, 2), .off, "scenery within one pixel of the silhouette is gone")
        XCTAssertEqual(r.layer(8, 5), .off, "also below it")
        XCTAssertEqual(r.layer(10, 2), .bark, "farther scenery stays")
        r.drawPet(rows, x: 0, y: 0, family: "")
        XCTAssertTrue(r.cells[2 * SceneRaster.side + 3] == SceneLayer.eyeFill.rawValue
                      || r.cells[2 * SceneRaster.side + 3] == SceneLayer.eyeShine.rawValue)
        // mirrored: the span is flipped too
        var m = SceneRaster()
        let lopsided = ["XXX.....", "XXX.....", "XXX.....", "........"]
        m.set(8, 1, .bark)
        m.set(0, 1, .bark)
        m.clearAroundPet(lopsided, x: 0, y: 0, mirror: true)
        XCTAssertEqual(m.layer(8, 1), .off, "mirrored silhouette sits at the right edge of the box, scenery beside it is cleared")
        XCTAssertEqual(m.layer(0, 1), .bark, "the empty left side of the mirrored sprite keeps its scenery")
    }

    // MARK: 4. the dino stays the meadow

    func testDinoScenesAreTheUnchangedMeadow() {
        let dry = seed(for: .clear), wet = seed(for: .rain)
        var checked = 0
        for sp in Species.all where sp.family == "dino" {
            for (name, hour) in periodHours {
                for rainy in [false, true] {
                    let p = makePet(sp, seed: rainy ? wet : dry)
                    let a = render(p, hour: hour, x: 10)
                    let m = render(p, hour: hour, x: 10, biome: .meadow)
                    XCTAssertEqual(a.cells, m.cells, "\(sp.id) \(name)")
                    XCTAssertEqual(a.biome, .meadow)
                    XCTAssertFalse(a.cells.contains { SceneLayer.isScenery($0) || $0 == SceneLayer.wave.rawValue
                        || $0 == SceneLayer.hole.rawValue || $0 == SceneLayer.peak.rawValue }, "\(sp.id) has no biome pixels")
                    checked += 1
                }
            }
        }
        XCTAssertGreaterThan(checked, 200)
    }

    // MARK: 5. Traditional

    func testTraditionalShowsOnlyTheCuesAndNoScenery() {
        var worst = 0
        var cues = Set<UInt8>()
        var leaked = 0
        let dry = seed(for: .clear), wet = seed(for: .rain)
        for sp in Species.all where sp.stage == .adult && sp.family != "dino" {
            for (_, hour) in periodHours {
                for rainy in [false, true] {
                    let p = makePet(sp, seed: rainy ? wet : dry)
                    let a = render(p, hour: hour, x: 14)
                    let m = render(p, hour: hour, x: 14, biome: .meadow)
                    var extra = 0
                    for i in 0..<a.cells.count {
                        let code = a.cells[i]
                        if isCue(code) { cues.insert(code) }
                        if SceneLayer.isScenery(code) && SceneLayer.isTraditionalLit(code) { leaked += 1 }
                        if a.ink[i] != m.ink[i] { extra += 1 }
                    }
                    worst = max(worst, extra)
                }
            }
        }
        XCTAssertEqual(leaked, 0, "no scenery pixel is lit in Traditional")
        XCTAssertLessThanOrEqual(worst, 100, "Traditional differs from the meadow by at most \(worst) cue pixels")
        XCTAssertEqual(cues.count, 3, "all three cue layers appear")
        XCTAssertTrue(SceneLayer.isTraditionalLit(SceneLayer.peak.rawValue))
        XCTAssertTrue(SceneLayer.isTraditionalLit(SceneLayer.wave.rawValue))
        XCTAssertTrue(SceneLayer.isTraditionalLit(SceneLayer.hole.rawValue))
        XCTAssertFalse(SceneLayer.isTraditionalLit(SceneLayer.bark.rawValue))
        XCTAssertFalse(SceneLayer.isTraditionalLit(SceneLayer.hull.rawValue))
        XCTAssertEqual(SceneLayer.sceneryFrom, SceneLayer.bark.rawValue)
        // and the painter's one-bit picture is exactly the raster's `ink`
        let fish = Species.all.first { $0.family == "fish" && $0.stage == .adult }!
        let r = render(makePet(fish), hour: 12)
        XCTAssertEqual(r.ink, r.cells.map { SceneLayer.isTraditionalLit($0) })
        XCTAssertTrue(r.cells.contains { SceneLayer.isScenery($0) })
    }

    // MARK: 6. palette

    private func validHex(_ c: RGB) -> Bool { c.hex.hasPrefix("#") && c.hex.count == 7 }

    func testEveryBiomeLayerHasAColorForEveryBiomeAppearancePeriodAndRain() {
        var tables = 0
        for biome in Biome.allCases {
            for appearance in appearances {
                for (_, hour) in periodHours {
                    let period = SceneAmbient.Period.of(hour: hour)
                    for rainy in [false, true] {
                        let t = ScenePalette.table(mode: .technicolor, appearance: appearance, night: biome.isDark(period),
                                                   line: .meat, biome: biome, period: period, rain: rainy)
                        tables += 1
                        XCTAssertEqual(t.count, ScenePalette.tableSize)
                        for l in SceneLayer.allCases where l != .off {
                            XCTAssertTrue(validHex(t[Int(l.rawValue)]), "\(l) in \(biome)")
                        }
                        let sky = ScenePalette.sky(mode: .technicolor, appearance: appearance, period: period, rain: rainy, biome: biome)
                        XCTAssertTrue(validHex(sky) && validHex(ScenePalette.soil(mode: .technicolor, appearance: appearance, biome: biome)))
                        // Traditional ignores the biome
                        let trad = ScenePalette.table(mode: .traditional, appearance: appearance, night: false, line: .meat,
                                                      biome: biome, period: period, rain: rainy)
                        let ink = ScenePalette.screen(mode: .traditional, appearance: appearance).ink
                        for l in SceneLayer.allCases where l != .off { XCTAssertEqual(trad[Int(l.rawValue)], ink) }
                    }
                }
            }
        }
        XCTAssertEqual(tables, 13 * 2 * 4 * 2)
        // the meadow table is unchanged by the new parameters
        for appearance in appearances {
            let plain = ScenePalette.table(mode: .technicolor, appearance: appearance, night: false, line: .meat)
            let withBiome = ScenePalette.table(mode: .technicolor, appearance: appearance, night: false, line: .meat,
                                               biome: .meadow, period: .day, rain: true)
            XCTAssertEqual(plain, withBiome)
        }
    }

    func testBiomeSkiesAreDistinctAndTheFishSkyIsWaterBlue() {
        func sky(_ b: Biome, _ p: SceneAmbient.Period, rain: Bool = false) -> RGB {
            ScenePalette.sky(mode: .technicolor, appearance: .light, period: p, rain: rain, biome: b)
        }
        for p in [SceneAmbient.Period.dawn, .day, .dusk, .night] {
            let c = sky(.underwater, p)
            XCTAssertTrue(c.b > c.r && c.b >= c.g - 30, "underwater \(p) sky is water-blue \(c.hex)")
        }
        func lum(_ c: RGB) -> Double { RGB.contrast(c, RGB(hex: "#000000")) }
        XCTAssertGreaterThan(lum(sky(.underwater, .day)), lum(sky(.underwater, .dusk)))
        XCTAssertGreaterThan(lum(sky(.underwater, .dusk)), lum(sky(.underwater, .night)))
        XCTAssertGreaterThan(lum(sky(.underwater, .day)), lum(sky(.underwater, .day, rain: true)), "darker in rain")
        XCTAssertGreaterThanOrEqual(Set(Biome.allCases.map { sky($0, .day).hex }).count, 9, "biomes have distinct day skies")
        XCTAssertEqual(sky(.meadow, .day).hex, "#A9C9D6")
        XCTAssertEqual(sky(.meadow, .day, rain: true).hex, "#9AA8B0")
        XCTAssertEqual(sky(.space, .night).hex, "#0A0C2A")
        // the hour based call agrees
        XCTAssertEqual(ScenePalette.sky(mode: .technicolor, appearance: .light, hour: 12, weather: .clear, biome: .woods).hex,
                       sky(.woods, .day).hex)
    }

    func testInkAndHeartsStayReadableOnEveryBiomeBackdrop() {
        for sp in adults() {
            let biome = Biome.of(species: sp.id, family: sp.family)
            for appearance in appearances {
                for (name, hour) in periodHours {
                    let period = SceneAmbient.Period.of(hour: hour)
                    for rainy in [false, true] {
                        let t = ScenePalette.table(mode: .technicolor, appearance: appearance, night: biome.isDark(period),
                                                   line: .meat, biome: biome, period: period, rain: rainy)
                        let sky = ScenePalette.sky(mode: .technicolor, appearance: appearance, period: period, rain: rainy, biome: biome)
                        let tag = "\(biome) \(name)\(rainy ? "/rain" : "") \(appearance)"
                        let ink = RGB.contrast(t[Int(SceneLayer.ink.rawValue)], sky)
                        let heart = RGB.contrast(t[Int(SceneLayer.heart.rawValue)], sky)
                        XCTAssertGreaterThanOrEqual(ink, 3, "\(tag): ink vs sky \(ink)")
                        XCTAssertGreaterThanOrEqual(heart, 1.6, "\(tag): heart vs sky \(heart)")
                    }
                }
            }
        }
    }

    func testWorkshopOutlineLiftsAtNightForMidToneBodies() {
        // night in the workshop (light appearance): the dark outline would sit on a dark sky, so a body that
        // cannot take the cream rim still gets a dim cream outline
        let t = ScenePalette.table(mode: .technicolor, appearance: .light, night: true, line: .baby, biome: .workshop,
                                   period: .night, rain: false)
        let outline = t[Int(SceneLayer.outline.rawValue)]
        let sky = ScenePalette.sky(mode: .technicolor, appearance: .light, period: .night, rain: false, biome: .workshop)
        XCTAssertGreaterThanOrEqual(RGB.contrast(outline, sky), 2.6)
        // without a period nothing is lifted (the older callers)
        let plain = ScenePalette.table(mode: .technicolor, appearance: .light, night: true, line: .baby)
        XCTAssertEqual(plain[Int(SceneLayer.outline.rawValue)].hex, "#34384A")
    }

    func testEveryBiomeLayerAppearsInSomeScene() {
        var seen = Set<UInt8>()
        let dry = seed(for: .clear), wet = seed(for: .rain)
        for sp in adults() {
            for (_, hour) in periodHours {
                for rainy in [false, true] {
                    let r = render(makePet(sp, seed: rainy ? wet : dry), hour: hour)
                    for c in r.cells where c != 0 { seen.insert(c) }
                }
            }
        }
        var missing: [Int] = []
        for l in SceneLayer.allCases where l.rawValue >= SceneLayer.wave.rawValue && !l.isPetLayer {
            if !seen.contains(l.rawValue) { missing.append(Int(l.rawValue)) }
        }
        XCTAssertEqual(missing, [], "every biome layer appears in some scene")
    }

    // MARK: 7. gameplay geometry and animation

    func testGroundBandIsIntactAndTheArtAnimates() {
        let fox = Species.all.first { $0.family == "fox" && $0.stage == .adult }!
        let p = makePet(fox)
        for b in Biome.allCases {
            let r = render(p, hour: 12, x: 0, biome: b)
            var ground = 0
            for x in 0..<SceneRaster.side where r.layer(x, SceneRaster.groundY) == .ground { ground += 1 }
            XCTAssertGreaterThanOrEqual(ground, 56, "\(b): ground band intact (\(ground)/64)")
        }
        // still pictures are deterministic; running scenes move
        for b in Biome.allCases where b != .meadow && b != .yard {
            let a = render(p, hour: 19, biome: b, animated: false)
            let again = render(p, hour: 19, biome: b, animated: false)
            XCTAssertEqual(a.cells, again.cells, "\(b) still picture is deterministic")
            func sceneryOnly(_ r: SceneRaster) -> [UInt8] { r.cells.map { SceneLayer.isScenery($0) ? $0 : 0 } }
            let first = sceneryOnly(render(p, hour: 19, biome: b, animated: true))
            var moved = false
            for k in 1...10 where !moved {
                if sceneryOnly(render(p, hour: 19, biome: b, animated: true, offset: Double(k) * 0.7)) != first { moved = true }
            }
            XCTAssertTrue(moved, "\(b) has animation")
        }
    }

    func testLightsOffAndHatchingScenesDraw() {
        for sp in adults() {
            var p = makePet(sp)
            p.lightOn = false
            let r = render(p, hour: 23)
            XCTAssertTrue(r.dim)
            XCTAssertGreaterThan(r.inkCount, 60)
        }
        var egg = Pet(now: base)
        egg.family = "dragon"
        egg.stage = .egg
        let r = render(egg, hour: 12)
        XCTAssertEqual(r.biome, .crags)
        XCTAssertTrue(r.cells.contains { SceneLayer.isScenery($0) })
    }

    // MARK: 8. cost

    func testBiomeFrameIsCheap() {
        let bot = Species.all.first { $0.family == "bot" && $0.stage == .adult }!
        let p = makePet(bot)
        for i in 0..<5 { _ = render(p, hour: 12, offset: Double(i)) }
        let n = 100
        let t0 = Date()
        for i in 0..<n { _ = render(p, hour: 12, offset: Double(i) * 0.125) }
        let ms = Date().timeIntervalSince(t0) * 1000 / Double(n)
        let t1 = Date()
        for i in 0..<n { _ = render(p, hour: 12, biome: .meadow, offset: Double(i) * 0.125) }
        let meadowMs = Date().timeIntervalSince(t1) * 1000 / Double(n)
        print("BIOME-PERF workshop \(String(format: "%.3f", ms)) ms/frame, meadow \(String(format: "%.3f", meadowMs)) ms/frame")
        // generous: CI builds the tests unoptimised on a shared runner
        XCTAssertLessThan(ms, 40, "a biome frame renders in \(ms) ms")
        XCTAssertLessThan(ms - meadowMs, 25, "the biome adds \(ms - meadowMs) ms")
    }
}
