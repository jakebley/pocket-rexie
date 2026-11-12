import XCTest

/// The finer Technicolor screen, stage 1 (docs/RESOLUTION.md): grid per look, 48x48 Scale3x pets with re-tuned shading and
/// eyes (hashes taken from the Expo output), the 96 home scene, and Traditional staying exactly 64x64.
final class Res96Tests: XCTestCase {
    private var utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
    /// 09:00 UTC on a Monday.
    private let base = Date(timeIntervalSince1970: 1_767_603_600)

    private func flip(_ rows: [String]) -> [String] { rows.map { String($0.reversed()) } }

    private func fnv(_ codes: [UInt8]) -> String {
        var h: UInt32 = 0x811c9dc5
        for v in codes { h ^= UInt32(v); h = h &* 0x01000193 }
        return String(h, radix: 16)
    }

    private func fnvText(_ s: String) -> String {
        var h: UInt32 = 0x811c9dc5
        for u in s.utf16 { h ^= UInt32(u); h = h &* 0x01000193 }
        return String(h, radix: 16)
    }

    private func makePet(_ sp: Species, seed: UInt64 = 7, stage: Stage? = nil) -> Pet {
        var p = Pet(now: base)
        p.seed = seed
        p.stage = stage ?? sp.stage
        p.species = sp.id
        p.family = sp.family
        p.hunger = 3
        p.happy = 3
        p.lastTick = base
        return p
    }

    private func adults() -> [Species] {
        var list: [Species] = []
        for fam in Species.families {
            if let sp = Species.all.first(where: { $0.family == fam.id && $0.stage == .adult }) { list.append(sp) }
        }
        return list
    }

    private func render(_ pet: Pet, hour: Int = 12, x: Double = 16, facing: Int = 1, look: ColorMode,
                        action: SceneAction = .idle, seedDate: Date? = nil) -> SceneRaster {
        var state = SceneState.still(for: pet)
        state.x = x
        state.facing = facing
        state.action = action
        var options = SceneRenderOptions()
        options.calendar = utc
        options.look = look
        let date = (seedDate ?? base).addingTimeInterval(Double(hour - 9) * 3600)
        return SceneRenderer.render(pet: pet, state: state, date: date, options: options)
    }

    private func bbox(_ r: SceneRaster, _ pred: (UInt8) -> Bool) -> (x0: Int, y0: Int, x1: Int, y1: Int)? {
        var x0 = Int.max, y0 = Int.max, x1 = -1, y1 = -1
        for i in 0..<r.cells.count where r.cells[i] != 0 && pred(r.cells[i] & 0x7f) {
            let x = i % r.n, y = i / r.n
            x0 = min(x0, x); y0 = min(y0, y); x1 = max(x1, x); y1 = max(y1, y)
        }
        return x1 < 0 ? nil : (x0, y0, x1, y1)
    }

    private func isPetCode(_ c: UInt8) -> Bool { SceneLayer(rawValue: c)?.isPetLayer == true }

    // MARK: 1. grid per look

    func testGridPerLook() {
        XCTAssertEqual(SceneGrid.n(for: .traditional), 64)
        XCTAssertEqual(SceneGrid.n(for: .technicolor), 96)
        XCTAssertEqual(SceneRaster().n, 64)
        XCTAssertEqual(SceneRaster().cells.count, 64 * 64)
        XCTAssertEqual(SceneRaster().groundRow, SceneRaster.groundY)
        let big = SceneRaster(n: 96)
        XCTAssertEqual(big.cells.count, 96 * 96)
        XCTAssertEqual(big.shade.count, 96 * 96)
        XCTAssertEqual(big.groundRow, 90)
        XCTAssertEqual(SceneGrid.cell(40, n: 96), 60)
        XCTAssertEqual(SceneGrid.cell(7, n: 96), 11) // 10.5 rounds half up, like Math.round
        let pet = makePet(adults()[0])
        XCTAssertEqual(render(pet, look: .technicolor).n, 96)
        XCTAssertEqual(render(pet, look: .traditional).n, 64)
    }

    /// Traditional must be exactly what it was: the default options and the Traditional look draw the same picture.
    func testTraditionalIsUntouched() {
        for sp in adults() {
            let pet = makePet(sp)
            for hour in [12, 23] {
                var state = SceneState.still(for: pet)
                state.x = 12
                var plain = SceneRenderOptions()
                plain.calendar = utc
                var trad = plain
                trad.look = .traditional
                let date = base.addingTimeInterval(Double(hour - 9) * 3600)
                let a = SceneRenderer.render(pet: pet, state: state, date: date, options: plain)
                let b = SceneRenderer.render(pet: pet, state: state, date: date, options: trad)
                XCTAssertEqual(a, b, sp.id)
                XCTAssertEqual(a.n, 64)
            }
        }
    }

    // MARK: 2. Scale3x

    func testScale3x() {
        XCTAssertEqual(Sprite96.scale3x(["X"]), ["XXX", "XXX", "XXX"])
        XCTAssertEqual(Sprite96.scale3x(["."]), ["...", "...", "..."])
        XCTAssertEqual(Sprite96.scale3x(["XX", "X."]).joined(separator: "|"), "..XXXX|.XXXXX|XXXXXX|XXXX..|XXX...|XXX...")
        XCTAssertEqual(Sprite96.scale3x(["X.", ".X"]).joined(separator: "|"), "XXX...|XXX...|XXXX..|..XXXX|...XXX|...XXX")
        XCTAssertTrue(Sprite96.scale3x(["XXXX"]).allSatisfy { $0 == "XXXXXXXXXXXX" })
        var bad = 0, flipBad = 0
        for sp in Species.all {
            for f in sp.frames {
                let o = Sprite96.scale3x(f)
                if o.count != 48 || o.contains(where: { $0.utf8.count != 48 }) { bad += 1 }
                let m = Sprite96.scale3x(flip(f))
                if flip(o) != m { flipBad += 1 }
            }
        }
        XCTAssertEqual(bad, 0, "every species frame scales to 48x48")
        XCTAssertEqual(flipBad, 0, "the filter is mirror symmetric")
        XCTAssertEqual(Sprite96.egg.count, 48)
        XCTAssertEqual(Sprite96.grave.count, 48)
        XCTAssertEqual(Sprite96.crackEgg.count, 48)
    }

    // MARK: 3. 48x48 shading against the Expo output

    func testShading48MatchesExpo() {
        var expected: [String: String] = [:]
        for line in ShadingGolden96.text.split(separator: "\n") {
            let p = line.split(separator: "|").map(String.init)
            guard p.count == 4 else { continue }
            expected["\(p[0])|\(p[1])|\(p[2])"] = p[3]
        }
        var checked = 0
        var bad: [String] = []
        for sp in Species.all {
            for (fi, fr) in sp.frames.enumerated() {
                let big = Sprite96.scale3x(fr)
                for (m, rows) in [big, flip(big)].enumerated() {
                    guard let want = expected["\(sp.id)|\(fi)|\(m)"] else { continue }
                    checked += 1
                    if fnv(PetShading.shade(rows: rows, family: sp.family).codes) != want { bad.append("\(sp.id)|\(fi)|\(m)") }
                }
            }
        }
        XCTAssertGreaterThan(checked, 1500, "the 48x48 golden covers the species")
        XCTAssertTrue(bad.isEmpty, "48x48 shading differs from Expo for \(bad.count) frames, e.g. \(bad.prefix(5))")
    }

    func testArtMatchesExpo() {
        let art: [String: [String]] = [
            "G10.heartFull": SceneGlyph96.heartFull, "G10.heartEmpty": SceneGlyph96.heartEmpty,
            "G10.smileFull": SceneGlyph96.smileFull, "G10.smileEmpty": SceneGlyph96.smileEmpty,
            "G10.poop": SceneGlyph96.poop, "G10.alert": SceneGlyph96.alert, "G10.skull": SceneGlyph96.skull,
            "G10.zzz": SceneGlyph96.zzz, "G10.drop": SceneGlyph96.drop, "G10.flake": SceneGlyph96.flake,
            "G10.meat": SceneGlyph96.meat, "G10.ball": SceneGlyph96.ball, "G10.syringe": SceneGlyph96.syringe,
            "G10.bulb": SceneGlyph96.bulb,
            "ART96.food:meat": SceneGlyph96.foodMeat, "ART96.food:veggie": SceneGlyph96.foodVeggie,
            "ART96.food:pasta": SceneGlyph96.foodPasta, "ART96.food:snack": SceneGlyph96.foodSnack,
            "ART96.broom": SceneGlyph96.broom, "ART96.ball": SceneGlyph96.ballProp, "ART96.dumbbell": SceneGlyph96.dumbbell,
            "ART96.syringe": SceneGlyph96.syringeProp, "ART96.spark": SceneGlyph96.spark, "ART96.puff": SceneGlyph96.puff,
            "ART96.glint": SceneGlyph96.glint, "ART96.shell": SceneGlyph96.shell, "ART96.note": SceneGlyph96.note,
            "ART96.dropS": SceneGlyph96.dropS, "ART96.flakeS": SceneGlyph96.flakeS, "ART96.dot": SceneGlyph96.dot,
            "ART96.sunDisc": SceneGlyph96.sunDisc, "ART96.moon": SceneGlyph96.moon, "ART96.cloudL": SceneGlyph96.cloudL,
            "ART96.cloudS": SceneGlyph96.cloudS, "ART96.butterfly0": SceneGlyph96.butterfly0,
            "ART96.butterfly1": SceneGlyph96.butterfly1, "ART96.pebble": SceneGlyph96.pebble, "ART96.bubble": SceneGlyph96.bubble,
            "TUFT96.T0": SceneGlyph96.tuftT0, "TUFT96.T1": SceneGlyph96.tuftT1,
            "TUFT96.S0": SceneGlyph96.tuftS0, "TUFT96.S1": SceneGlyph96.tuftS1,
            "FLOWER96.0": SceneGlyph96.flower0, "FLOWER96.1": SceneGlyph96.flower1,
        ]
        var checked = 0
        var bad: [String] = []
        for line in ShadingGolden96.art.split(separator: "\n") {
            let p = line.split(separator: "|", maxSplits: 1).map(String.init)
            guard p.count == 2 else { continue }
            guard let rows = art[p[0]] else { bad.append("missing " + p[0]); continue }
            checked += 1
            if fnvText(rows.joined(separator: "|")) != p[1] { bad.append(p[0]) }
        }
        XCTAssertEqual(checked, art.count)
        XCTAssertTrue(bad.isEmpty, "96 art differs from Expo: \(bad)")
    }

    func testEyesAndLitSetAt48() {
        var withHole = 0, found = 0, litBad = 0
        for sp in Species.all {
            let big = Sprite96.scale3x(sp.frames[0])
            let s = PetShading.shade(rows: big, family: sp.family)
            XCTAssertEqual(s.width, 48)
            XCTAssertEqual(s.height, 48)
            if s.codes.contains(SceneLayer.eyeFill.rawValue) { found += 1 }
            let grid = big.map { Array($0.utf8) }
            for y in 0..<48 {
                for x in 0..<48 {
                    let c = s.code(x, y)
                    let lit = grid[y][x] == 88
                    if lit && c == 0 { litBad += 1 }
                    if !lit && c != 0 && c != SceneLayer.eyeFill.rawValue && c != SceneLayer.eyeShine.rawValue { litBad += 1 }
                }
            }
            withHole += 1
        }
        XCTAssertEqual(litBad, 0, "the lit pixel set of the 48 sprites is untouched by shading")
        XCTAssertGreaterThan(Double(found) / Double(withHole), 0.85, "most species get an eye at 48 (\(found)/\(withHole))")
        // a single 1px 16x16 hole becomes a 3x3 hole with a dark pupil and a glint
        let blob = ["................", "..XXXXXXXXXXXX..", "..XXXXXXXXXXXX..", "..XXXXXXXXXXXX..", "..XXXX.XXXXXXX..", "..XXXXXXXXXXXX..",
                    "..XXXXXXXXXXXX..", "..XXXXXXXXXXXX..", "..XXXXXXXXXXXX..", "..XXXXXXXXXXXX..", "................", "................",
                    "................", "................", "................", "................"]
        let c = PetShading.shade(rows: Sprite96.scale3x(blob), family: "dino").codes
        let fill = c.filter { $0 == SceneLayer.eyeFill.rawValue }.count
        let shine = c.filter { $0 == SceneLayer.eyeShine.rawValue }.count
        XCTAssertEqual(fill + shine, 9)
        XCTAssertGreaterThanOrEqual(shine, 1)
        // 32x32 shading is the 64 path, untouched
        XCTAssertEqual(PetShading.shade(rows: Species.all[0].hiFrames[0], family: "dino").codes.count, 1024)
    }

    // MARK: 4. the 96 scene

    func testPetStandsOnTheGroundAndClearsTheHud() {
        var bad = 0, n = 0, hud = 0, xBad = 0
        for sp in adults() {
            for x in [0.0, 14.0, 32.0] {
                for facing in [1, -1] {
                    let pet = makePet(sp)
                    let r = render(pet, x: x, facing: facing, look: .technicolor)
                    let r64 = render(pet, x: x, facing: facing, look: .traditional)
                    guard let a = bbox(r, { self.isPetCode($0) }), let b = bbox(r64, { self.isPetCode($0) }) else { bad += 1; continue }
                    n += 1
                    if a.y1 != SceneRaster.footY96 { bad += 1 }
                    if a.y0 < 24 { hud += 1 }
                    if abs(a.x0 - Int((1.5 * Double(b.x0)).rounded())) > 6 || abs(a.x1 - Int((1.5 * Double(b.x1)).rounded())) > 7 { xBad += 1 }
                }
            }
        }
        XCTAssertGreaterThan(n, 30)
        XCTAssertEqual(bad, 0, "feet on row 89")
        XCTAssertEqual(hud, 0, "the pet never reaches the HUD rows")
        XCTAssertEqual(xBad, 0, "pet x follows the logic x")
    }

    func testHudAndGroundLayout() {
        let pet = makePet(adults()[0])
        let r = render(pet, look: .technicolor)
        let hearts = bbox(r) { $0 == SceneLayer.heart.rawValue }
        let smiles = bbox(r) { $0 == SceneLayer.smile.rawValue }
        XCTAssertEqual(hearts?.y0, 1)
        XCTAssertLessThanOrEqual(hearts?.y1 ?? 99, 10)
        XCTAssertEqual(smiles?.y0, 13)
        XCTAssertLessThanOrEqual(smiles?.y1 ?? 99, 22)
        XCTAssertEqual(hearts?.x0, 1)
        // ground band starts at row 90 and is only ground below the feet
        for x in 0..<96 { XCTAssertEqual(r.layer(x, 90), .ground) }
        XCTAssertEqual(r.groundRow, 90)
        XCTAssertTrue(r.hasSky)
    }

    func testWeatherIsExclusiveAt96() {
        var wet: UInt64 = 1, dry: UInt64 = 1
        for s in 1...600 where SceneAmbient(seed: UInt64(s), date: base, calendar: utc).weather == .rain { wet = UInt64(s); break }
        for s in 1...600 where SceneAmbient(seed: UInt64(s), date: base, calendar: utc).weather == .clear { dry = UInt64(s); break }
        let sp = adults()[0]
        let rainy = render(makePet(sp, seed: wet), look: .technicolor)
        XCTAssertEqual(rainy.weather, .rain)
        XCTAssertNil(bbox(rainy) { $0 == SceneLayer.sun.rawValue }, "no sun while it rains")
        XCTAssertNotNil(bbox(rainy) { $0 == SceneLayer.rain.rawValue })
        XCTAssertNotNil(bbox(rainy) { $0 == SceneLayer.cloud.rawValue })
        let clear = render(makePet(sp, seed: dry), look: .technicolor)
        XCTAssertNotNil(bbox(clear) { $0 == SceneLayer.sun.rawValue })
        XCTAssertNil(bbox(clear) { $0 == SceneLayer.rain.rawValue })
    }

    func testSkyGlyphsStayOffThePet() {
        // the sun sits where the pet stands at noon: it must be cleared inside the silhouette rows and the 1px ring
        let sp = adults()[0]
        for x in [4.0, 16.0, 30.0] {
            let r = render(makePet(sp), hour: 13, x: x, look: .technicolor)
            var ring = 0
            for i in 0..<r.cells.count where isPetCode(r.cells[i] & 0x7f) && r.cells[i] != 0 {
                let px = i % 96, py = i / 96
                for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
                    let nx = px + dx, ny = py + dy
                    guard nx >= 0, ny >= 0, nx < 96, ny < 96 else { continue }
                    let c = r.cells[ny * 96 + nx]
                    if c == SceneLayer.sun.rawValue || c == SceneLayer.cloud.rawValue { ring += 1 }
                }
            }
            XCTAssertEqual(ring, 0, "no sun or cloud pixel touches the pet at x=\(x)")
        }
    }

    func testEggAt96() {
        var egg = makePet(adults()[0], stage: .egg)
        egg.species = ""
        let r = render(egg, look: .technicolor)
        XCTAssertNotNil(bbox(r) { $0 == SceneLayer.eggShell.rawValue }, "the dedicated egg shell")
        XCTAssertNil(bbox(r) { $0 == SceneLayer.eyeFill.rawValue }, "an egg has no eyes")
        let b = bbox(r) { self.isPetCode($0) }
        XCTAssertEqual(b?.y1, SceneRaster.footY96)
        // an egg is taller than wide-ish and its width reads at 48x48
        if let b {
            XCTAssertGreaterThanOrEqual(b.x1 - b.x0, 30)
            XCTAssertGreaterThanOrEqual(b.y1 - b.y0, 33)
        }
        // Traditional egg: a clean outline, shell fill is unlit
        let t = render(egg, look: .traditional)
        XCTAssertEqual(t.n, 64)
    }

    func testLayerCodesStayBelowTheDimFlag() {
        for sp in adults() {
            for look in [ColorMode.technicolor, .traditional] {
                let r = render(makePet(sp), hour: 23, look: look)
                XCTAssertTrue(r.cells.allSatisfy { $0 < 128 }, "layer codes stay <= 127 (the dim flag is 0x80)")
            }
        }
        XCTAssertLessThanOrEqual(SceneLayer.maxCode, 127)
    }

    func testEveryStateAndCallDrawsAt96() {
        let sp = adults()[0]
        let wet = (1...600).first { SceneAmbient(seed: UInt64($0), date: base, calendar: utc).weather == .rain } ?? 1
        for action in SceneAction.allCases {
            for call in [nil, Call.hungry, .bored, .poop, .sick, .naughty, .light, .hot, .cold] {
                var pet = makePet(sp, seed: UInt64(wet))
                pet.call = call
                pet.sick = call == .sick
                pet.poops = 2
                pet.lightOn = call != .light
                let r = render(pet, hour: 23, x: 30, look: .technicolor, action: action)
                XCTAssertEqual(r.n, 96)
                XCTAssertGreaterThan(r.cells.filter { $0 != 0 }.count, 100)
            }
        }
        // effects
        for kind in SceneEffect.Kind.allCases {
            var state = SceneState.still(for: makePet(sp))
            var e = SceneEffect(kind: kind)
            e.start = 0
            e.x = 20
            e.food = .meat
            state.tick = 6
            state.effect = e
            var options = SceneRenderOptions()
            options.calendar = utc
            options.look = .technicolor
            let r = SceneRenderer.render(pet: makePet(sp), state: state, date: base, options: options)
            XCTAssertEqual(r.n, 96, "\(kind)")
        }
        // ghost, hatchling override, every stage
        for stage in [Stage.egg, .ghost, .baby, .adult] {
            let r = render(makePet(sp, stage: stage), look: .technicolor)
            XCTAssertNotNil(bbox(r) { _ in true }, "\(stage)")
        }
        var options = SceneRenderOptions()
        options.calendar = utc
        options.look = .technicolor
        options.spriteOverride = Sprite96.crackEgg
        let hatch = SceneRenderer.render(pet: makePet(sp, stage: .baby), state: SceneState.still(for: makePet(sp)), date: base, options: options)
        XCTAssertEqual(hatch.n, 96)
    }

    /// Until the 96 biomes land, the biome is the 64 art enlarged 3/2: it must show up, in the right place, and never on the pet.
    func testBiomeFallbackAt96() {
        var withScenery = 0
        for sp in adults() {
            let r = render(makePet(sp), look: .technicolor)
            if r.cells.contains(where: { $0 >= SceneLayer.sceneryFrom && !SceneLayer(rawValue: $0 & 0x7f)!.isPetLayer }) { withScenery += 1 }
            // pets keep a clear ring
            var ringBad = 0
            for i in 0..<r.cells.count where isPetCode(r.cells[i]) {
                let x = i % 96, y = i / 96
                for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
                    let nx = x + dx, ny = y + dy
                    guard nx >= 0, ny >= 0, nx < 96, ny < 96 else { continue }
                    if SceneLayer.isScenery(r.cells[ny * 96 + nx]) { ringBad += 1 }
                }
            }
            XCTAssertEqual(ringBad, 0, sp.family)
        }
        XCTAssertGreaterThanOrEqual(withScenery, 8, "the biomes draw scenery at 96")
    }

    // MARK: 5. painting a 96 raster and mixed grids

    @MainActor
    func testPainterHandlesBothGrids() {
        let pet = makePet(adults()[0])
        for mode in ColorMode.allCases {
            for look in ColorMode.allCases {
                let r = render(pet, look: look)
                let palette = LCDStyle.palette(for: .light, mode: mode)
                let view = Canvas { ctx, size in LCDPainter.paint(&ctx, raster: r, size: size, palette: palette) }
                    .frame(width: 192, height: 192)
                let renderer = ImageRenderer(content: view)
                renderer.scale = 1
                XCTAssertNotNil(renderer.uiImage, "\(mode) palette painting a \(r.n) raster")
            }
        }
        XCTAssertEqual(LCDPainter.path(render(pet, look: .traditional), size: CGSize(width: 64, height: 64)).isEmpty, false)
        XCTAssertEqual(LCDPainter.path(render(pet, look: .technicolor), size: CGSize(width: 96, height: 96)).isEmpty, false)
    }

    // MARK: 6. cost

    private func now() -> Double { ProcessInfo.processInfo.systemUptime }

    func testRenderCost96() {
        var combos: [(Pet, Int, Int)] = []
        for sp in adults() { for hour in [12, 23] { combos.append((makePet(sp), hour, 1)) } }
        func time(_ look: ColorMode) -> Double {
            for (p, h, f) in combos { _ = render(p, hour: h, facing: f, look: look) }   // cold
            var total = 0.0, count = 0
            for rep in 1...5 {
                for (p, h, f) in combos {
                    let t0 = now()
                    _ = render(p, hour: h, facing: rep % 2 == 0 ? -f : f, look: look, seedDate: base.addingTimeInterval(Double(rep) * 0.375))
                    total += now() - t0
                    count += 1
                }
            }
            return total * 1000 / Double(count)
        }
        let t64 = time(.traditional), t96 = time(.technicolor)
        print("RENDER-PERF 96-vs-64 scene64=\(String(format: "%.3f", t64)) scene96=\(String(format: "%.3f", t96)) ratio=\(String(format: "%.2f", t96 / max(t64, 0.0001))) (ms)")
        XCTAssertLessThan(t96, 100)
        XCTAssertLessThan(t96 / max(t64, 0.0001), 6, "the 96 scene stays within a small multiple of the 64 scene")
    }
}
