import XCTest

/// Pet shading (Shared/PetShading.swift, a port of expo-prototype/src/ui/shading.ts): the lit pixel set never
/// changes, Traditional stays ink, every new layer has a palette color, the ramp is ordered light to dark,
/// eyes are opaque and enclosed, and shading is cached per sprite frame and facing.
final class ShadingTests: XCTestCase {
    private let shadingLayers: [SceneLayer] = [.bodyLight, .shade, .deep, .belly, .accent, .accentDark, .accentLight,
                                               .rim, .eye, .glint, .eyeFill, .eyeShine]

    private func flip(_ rows: [String]) -> [String] { rows.map { String($0.reversed()) } }

    private func fnv(_ codes: [UInt8]) -> String {
        var h: UInt32 = 0x811c9dc5
        for v in codes {
            h ^= UInt32(v)
            h = h &* 0x01000193
        }
        return String(h, radix: 16)
    }

    // MARK: 1. the lit pixel set

    func testLitPixelSetAndOutlineSetUnchangedForEveryFrame() {
        var frames = 0, litBad = 0, outlineBad = 0, unknown = 0
        var seen = Set<UInt8>()
        for sp in Species.all {
            for fr in sp.hiFrames {
                for rows in [fr, flip(fr)] {
                    let old = SceneLayer.petLayers(rows)
                    let now = PetShading.layers(rows: rows, family: sp.family)
                    frames += 1
                    XCTAssertEqual(now.height, old.count, sp.id)
                    for y in 0..<old.count {
                        for x in 0..<old[y].count {
                            let o = old[y][x]
                            let c = now.code(x, y)
                            if (o != .off) != SceneLayer.isTraditionalLit(c) { litBad += 1 }
                            let wasOutline = o == .outline
                            let isOutline = c == SceneLayer.outline.rawValue || c == SceneLayer.rim.rawValue
                                || c == SceneLayer.eye.rawValue
                            if wasOutline != isOutline { outlineBad += 1 }
                            if c != 0 {
                                seen.insert(c)
                                if !(SceneLayer(rawValue: c)?.isPetLayer ?? false) { unknown += 1 }
                            }
                        }
                    }
                }
            }
        }
        XCTAssertGreaterThanOrEqual(frames, 1600)
        XCTAssertEqual(litBad, 0, "lit pixel set unchanged (\(litBad) cells differ)")
        XCTAssertEqual(outlineBad, 0, "OUTLINE / RIM / EYE are exactly the old outline (\(outlineBad) differ)")
        XCTAssertEqual(unknown, 0, "shading only emits pet layer codes")
        for l in shadingLayers + [SceneLayer.body, .outline] {
            XCTAssertTrue(seen.contains(l.rawValue), "layer \(l) is produced by some species")
        }
    }

    /// The Swift shader reproduces the Expo shader code for code: hashes taken from the Expo output.
    func testShadingMatchesTheExpoImplementation() {
        var expected: [String: String] = [:]
        for line in ShadingGolden.text.split(separator: "\n") {
            let p = line.split(separator: "|").map(String.init)
            guard p.count == 4 else { continue }
            expected["\(p[0])|\(p[1])|\(p[2])"] = p[3]
        }
        var checked = 0
        var bad: [String] = []
        for sp in Species.all {
            for (fi, fr) in sp.hiFrames.enumerated() {
                for (m, rows) in [fr, flip(fr)].enumerated() {
                    guard let want = expected["\(sp.id)|\(fi)|\(m)"] else { continue }
                    checked += 1
                    let got = fnv(PetShading.shade(rows: rows, family: sp.family).codes)
                    if got != want { bad.append("\(sp.id)|\(fi)|\(m)") }
                }
            }
        }
        XCTAssertGreaterThan(checked, 1500, "golden covers the species")
        XCTAssertEqual(bad.count, 0, "\(bad.count) of \(checked) frames differ from Expo, first: \(bad.prefix(8))")
    }

    // MARK: 1b. eyes

    func testEyesAreOpaqueAndEnclosed() {
        var frames = 0, notHole = 0, seeThrough = 0, tooMany = 0, noShine = 0, speciesWithEye = 0
        for sp in Species.all {
            var any = false
            for fr in sp.hiFrames {
                let s = PetShading.layers(rows: fr, family: sp.family)
                var fill = 0, shine = 0
                for y in 0..<s.height {
                    for x in 0..<s.width {
                        let c = s.code(x, y)
                        guard c == SceneLayer.eyeFill.rawValue || c == SceneLayer.eyeShine.rawValue else { continue }
                        fill += 1
                        if c == SceneLayer.eyeShine.rawValue { shine += 1 }
                        let chars = Array(fr[y])
                        if chars[x] == "X" { notHole += 1 }
                        for (ax, ay) in [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)] where s.code(ax, ay) == 0 {
                            seeThrough += 1
                        }
                    }
                }
                frames += 1
                if fill > 0 {
                    any = true
                    if shine == 0 && fill > 2 { noShine += 1 }
                }
                if fill > (sp.family == "alien" ? 64 : 12) { tooMany += 1 }
            }
            if any { speciesWithEye += 1 }
        }
        XCTAssertEqual(notHole, 0, "eye fills only cover unlit hole cells")
        XCTAssertEqual(seeThrough, 0, "eye fills are enclosed by body, ring or fill")
        XCTAssertEqual(tooMany, 0, "spots, windows and cut-outs stay holes")
        XCTAssertEqual(noShine, 0, "every filled eye has a catch-light")
        XCTAssertGreaterThanOrEqual(Double(speciesWithEye), Double(Species.all.count) * 0.78,
                                    "\(speciesWithEye) of \(Species.all.count) species have an opaque eye")
        XCTAssertGreaterThan(frames, 800)
    }

    // MARK: 2. Traditional

    func testTraditionalPrintsShadingAsInkAndEyeFillAsUnlit() {
        XCTAssertFalse(SceneLayer.isTraditionalLit(SceneLayer.eyeFill.rawValue))
        XCTAssertFalse(SceneLayer.isTraditionalLit(SceneLayer.eyeShine.rawValue))
        XCTAssertFalse(SceneLayer.isTraditionalLit(0))
        for l in shadingLayers where l != .eyeFill && l != .eyeShine {
            XCTAssertTrue(SceneLayer.isTraditionalLit(l.rawValue), "\(l) is ink in Traditional")
        }
        for appearance in [ScenePalette.Appearance.light, .dark] {
            let t = ScenePalette.table(mode: .traditional, appearance: appearance, night: false, line: .meat)
            let ink = ScenePalette.screen(mode: .traditional, appearance: appearance).ink
            for l in shadingLayers { XCTAssertEqual(t[Int(l.rawValue)], ink, "\(l)") }
        }
        // a drawn pet has the sprite's silhouette as its Traditional picture, eyes included
        for sp in Species.all.prefix(120) {
            for rows in sp.hiFrames {
                var layered = SceneRaster()
                layered.drawPet(rows, x: 0, y: 0, family: sp.family)
                var old = SceneRaster()
                old.draw(rows, x: 0, y: 0)
                XCTAssertEqual(layered.ink, old.ink, sp.id)
                XCTAssertEqual(layered.inkCount, old.inkCount, sp.id)
            }
        }
    }

    func testEyeFillNeverReplacesALitTraditionalPixel() {
        var r = SceneRaster()
        let rows = ["XXXXXXXX", "XXXXXXXX", "XXX.XXXX", "XXXXXXXX", "XXXXXXXX"]
        // scenery (a cloud pixel) behind the eye hole stays
        r.set(3, 2, .cloud)
        r.drawPet(rows, x: 0, y: 0, family: "")
        XCTAssertEqual(r.layer(3, 2), .cloud)
        var r2 = SceneRaster()
        r2.drawPet(rows, x: 0, y: 0, family: "")
        XCTAssertTrue(r2.cells[2 * SceneRaster.side + 3] == SceneLayer.eyeFill.rawValue
                      || r2.cells[2 * SceneRaster.side + 3] == SceneLayer.eyeShine.rawValue)
        XCTAssertFalse(r2.isSet(3, 2), "the filled eye is unlit in Traditional")
    }

    // MARK: 3. palette

    func testEveryShadingLayerHasAColorEverywhere() {
        let bodies: [String?] = [nil, "#E7DCC0", "#8B3E1C", "#535B7E", "#2F4F3A", "#F2F0E8"]
        var tables = 0
        for appearance in [ScenePalette.Appearance.light, .dark] {
            for night in [false, true] {
                for line in PetLine.allCases {
                    for hex in bodies {
                        let t = ScenePalette.table(mode: .technicolor, appearance: appearance, night: night, line: line,
                                                   bodyHex: hex)
                        tables += 1
                        XCTAssertEqual(t.count, ScenePalette.tableSize)
                        for l in SceneLayer.allCases where l != .off {
                            let c = t[Int(l.rawValue)]
                            XCTAssertTrue(c.hex.hasPrefix("#") && c.hex.count == 7, "\(l)")
                        }
                        XCTAssertNotEqual(t[Int(SceneLayer.eyeFill.rawValue)], t[Int(SceneLayer.body.rawValue)])
                    }
                }
            }
        }
        XCTAssertGreaterThan(tables, 100)
    }

    // MARK: 4. the ramp

    func testRampIsOrderedHighlightBaseShadeDeep() {
        var order = 0, belly = 0, distinct = 0, n = 0
        for sp in Species.all {
            for appearance in [ScenePalette.Appearance.light, .dark] {
                let t = ScenePalette.table(mode: .technicolor, appearance: appearance, night: false,
                                           line: PetLine(rawValue: sp.line) ?? .meat, bodyHex: sp.bodyHex)
                n += 1
                let hi = t[Int(SceneLayer.bodyLight.rawValue)], base = t[Int(SceneLayer.body.rawValue)]
                let shade = t[Int(SceneLayer.shade.rawValue)], deep = t[Int(SceneLayer.deep.rawValue)]
                let L = [hi, base, shade, deep].map { $0.luminance }
                if !(L[0] > L[1] && L[1] > L[2] && L[2] > L[3]) { order += 1 }
                if t[Int(SceneLayer.belly.rawValue)].luminance <= L[1] { belly += 1 }
                if RGB.contrast(hi, base) < 1.08 || RGB.contrast(base, shade) < 1.08 { distinct += 1 }
            }
        }
        XCTAssertEqual(order, 0, "ramp is ordered highlight > base > shade > deep for all \(n) species/modes")
        XCTAssertEqual(belly, 0, "belly is lighter than the base")
        XCTAssertEqual(distinct, 0, "highlight and shadow are distinguishable from the base")
        // hue shift, not just darkening: a warm body gets a cooler shadow and a warmer highlight
        func hue(_ c: RGB) -> Double {
            Double(atan2(Double(3).squareRoot() * Double(c.g - c.b), Double(2 * c.r - c.g - c.b))) * 180 / Double.pi
        }
        let body = RGB(hex: "#C27358")
        let r = ScenePalette.shadeRamp(body: body, dark: false)
        XCTAssertLessThan(hue(r.shade), hue(body) - 3)
        XCTAssertGreaterThan(hue(r.hi), hue(body) + 3)
    }

    func testRimGlowsOnDarkBackdropsAndSoftensOnLightOnes() {
        let light = ScenePalette.table(mode: .technicolor, appearance: .light, night: false, line: .meat)
        let night = ScenePalette.table(mode: .technicolor, appearance: .light, night: true, line: .meat)
        let rim = Int(SceneLayer.rim.rawValue), outline = Int(SceneLayer.outline.rawValue)
        XCTAssertGreaterThan(night[rim].luminance, night[outline].luminance * 0.9)
        XCTAssertLessThan(light[rim].luminance, light[Int(SceneLayer.body.rawValue)].luminance)
    }

    // MARK: 7. cost and cache

    func testShadingIsCachedPerFrameAndFacing() {
        let sp = Species.named("rawr")!
        let rows = sp.hiFrames[0]
        _ = PetShading.layers(rows: rows, family: sp.family)
        let before = PetShading.cacheCount
        let a = PetShading.layers(rows: rows, family: sp.family)
        let b = PetShading.layers(rows: rows, family: sp.family)
        XCTAssertEqual(PetShading.cacheCount, before, "a repeated sprite does not grow the cache")
        XCTAssertEqual(a.codes, b.codes)
        _ = PetShading.layers(rows: flip(rows), family: sp.family)
        XCTAssertEqual(PetShading.cacheCount, before + 1, "the mirrored facing is its own entry")
        XCTAssertEqual(a.codes, PetShading.shade(rows: rows, family: sp.family).codes, "cached equals fresh")
    }

    func testShadingCost() {
        var frames = 0
        let t0 = Date()
        for sp in Species.all.prefix(60) {
            for fr in sp.hiFrames {
                _ = PetShading.shade(rows: fr, family: sp.family)
                frames += 1
            }
        }
        let per = Date().timeIntervalSince(t0) / Double(frames) * 1000
        print("shading cost: \(String(format: "%.2f", per)) ms per frame over \(frames) frames")
        XCTAssertLessThan(per, 25, "shading one frame stays cheap (cold)")
        // a warm scene draw reuses the cache
        var p = Pet(now: Date(timeIntervalSince1970: 1_767_603_600))
        p.stage = .adult
        p.species = "rawr"
        _ = SceneRenderer.still(pet: p)
        let w0 = Date()
        for _ in 0..<20 { _ = SceneRenderer.still(pet: p) }
        let warm = Date().timeIntervalSince(w0) / 20 * 1000
        print("warm scene draw: \(String(format: "%.2f", warm)) ms")
        XCTAssertLessThan(warm, 50)
    }
}
