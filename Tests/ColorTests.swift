import XCTest
import SwiftUI

/// Color modes (docs/COLOR_MODES.md): the layer-coded raster, the palettes, contrast, persistence.
/// Mirrors expo-prototype/test/color.ts.
final class ColorTests: XCTestCase {
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

    private let lights: [ScenePalette.Appearance] = [.light, .dark]
    private let modes = ColorMode.allCases
    /// A local hour in each period of the day.
    private let periodHours: [(String, Int)] = [("dawn", 6), ("day", 12), ("dusk", 19), ("night", 23)]

    // MARK: layers

    func testLayerNumbersMatchTheWebPort() {
        XCTAssertEqual(SceneLayer.off.rawValue, 0)
        XCTAssertEqual(SceneLayer.ink.rawValue, 1)
        XCTAssertEqual(SceneLayer.body.rawValue, 2)
        XCTAssertEqual(SceneLayer.outline.rawValue, 3)
        XCTAssertEqual(SceneLayer.cloud.rawValue, 7)
        XCTAssertEqual(SceneLayer.ground.rawValue, 10)
        XCTAssertEqual(SceneLayer.poop.rawValue, 16)
        XCTAssertEqual(SceneLayer.bubble.rawValue, 23)
        XCTAssertEqual(SceneLayer.alert.rawValue, 28)
        XCTAssertEqual(SceneLayer.bodyLight.rawValue, 29)
        XCTAssertEqual(SceneLayer.ball.rawValue, 30)
        // shading layers and biome layers (Expo numbering, see docs/SHADING.md and docs/BIOMES.md)
        XCTAssertEqual(SceneLayer.shade.rawValue, 31)
        XCTAssertEqual(SceneLayer.glint.rawValue, 39)
        XCTAssertEqual(SceneLayer.eyeFill.rawValue, 87)
        XCTAssertEqual(SceneLayer.eyeShine.rawValue, 88)
        XCTAssertEqual(SceneLayer.wave.rawValue, 40)
        XCTAssertEqual(SceneLayer.peak.rawValue, 42)
        XCTAssertEqual(SceneLayer.bark.rawValue, 43)
        XCTAssertEqual(SceneLayer.leafBig.rawValue, 86)
        XCTAssertEqual(SceneLayer.starfield.rawValue, 89)
        XCTAssertEqual(SceneLayer.hull.rawValue, 94)
        XCTAssertEqual(SceneLayer.eggShade.rawValue, 97)
        XCTAssertEqual(SceneLayer.maxCode, 97)
        XCTAssertEqual(ScenePalette.tableSize, Int(Slot96.last) + 1)   // 131: the layers plus the biome slots 98...130
        XCTAssertEqual(SceneLayer.allCases.count, 98)
        XCTAssertEqual(SceneLayer.allCases.map { Int($0.rawValue) }.sorted(), Array(0...97))
    }

    func testPetLayerRule() {
        let rows = [".....", ".XXX.", "XXXXX", "XXXXX", "XXXXX", ".XXX."]
        let L = SceneLayer.petLayers(rows)
        XCTAssertEqual(L[0][0], .off)
        XCTAssertEqual(L[1][1], .outline)
        XCTAssertEqual(L[2][0], .outline)
        XCTAssertEqual(L[3][4], .outline)
        XCTAssertEqual(L[2][2], .bodyLight, "interior under or right of the outline is highlighted")
        XCTAssertEqual(L[2][1], .bodyLight)
        XCTAssertEqual(L[3][3], .body, "deep interior is body")
        // An eye hole stays unlit and is ringed with outline.
        let holed = ["XXXXX", "XXXXX", "XX.XX", "XXXXX", "XXXXX"]
        let H = SceneLayer.petLayers(holed)
        XCTAssertEqual(H[2][2], .off)
        XCTAssertEqual(H[1][2], .outline)
        XCTAssertEqual(H[2][1], .outline)
    }

    /// Traditional regression: a sprite's lit cells (layer != 0) are exactly the old one-bit bitmap,
    /// for every species and frame, both facings.
    func testTraditionalSpritesEqualTheOldBitmap() {
        for sp in Species.all {
            for rows in sp.hiFrames {
                for mirror in [false, true] {
                    var layered = SceneRaster()
                    layered.drawPet(rows, x: 0, y: 0, mirror: mirror)
                    var old = SceneRaster()
                    old.draw(rows, x: 0, y: 0, mirror: mirror)
                    XCTAssertEqual(layered.ink, old.ink, "\(sp.id) mirror \(mirror)")
                    // and straight from the strings
                    var expected = 0
                    var wrong = 0
                    var notPetLayer = 0
                    for (y, row) in rows.enumerated() {
                        let chars = Array(row)
                        for x in 0..<chars.count {
                            let source = mirror ? chars.count - 1 - x : x
                            let lit = chars[source] == "X"
                            if lit { expected += 1 }
                            if layered.isSet(x, y) != lit { wrong += 1 }
                            let l = layered.layer(x, y)
                            if lit && !l.isPetLayer { notPetLayer += 1 }
                        }
                    }
                    XCTAssertEqual(wrong, 0, "\(sp.id) mirror \(mirror): cells differ from the bitmap")
                    XCTAssertEqual(notPetLayer, 0, "\(sp.id): lit sprite pixels are pet layers")
                    XCTAssertEqual(layered.inkCount, expected, sp.id)
                }
            }
        }
    }

    /// The whole scene: the old `ink` view of the raster (any layer) is what the Traditional painter draws.
    func testTraditionalSceneInkIsEveryNonZeroLayer() {
        for sp in Species.all {
            var p = makePet(stage: sp.stage, species: sp.id)
            p.poops = 2
            p.call = .hungry
            for facing in [1, -1] {
                var s = SceneState.still(for: p)
                s.facing = facing
                let r = SceneRenderer.render(pet: p, state: s, date: base)
                XCTAssertEqual(r.ink, r.cells.map { SceneLayer.isTraditionalLit($0) }, sp.id)
                XCTAssertEqual(r.inkCount, r.ink.filter { $0 }.count, sp.id)
                XCTAssertGreaterThan(r.inkCount, 60, sp.id)
                XCTAssertTrue(r.cells.contains(SceneLayer.outline.rawValue) || r.cells.contains(SceneLayer.rim.rawValue), "\(sp.id) has outline")
            }
        }
    }

    func testSceneUsesTheDocumentedLayers() {
        var p = makePet()
        p.poops = 1
        p.hunger = 2
        p.sick = true
        p.call = .hungry
        let day = SceneRenderer.still(pet: p, calendar: utc)
        func has(_ r: SceneRaster, _ l: SceneLayer) -> Bool { r.cells.contains(l.rawValue) }
        for l in [SceneLayer.sun, .ground, .dirt, .grass, .heart, .smile, .poop, .outline, .bubble,
                  .foodMeat, .ink] {
            XCTAssertTrue(has(day, l), "a day scene has \(l)")
        }
        XCTAssertFalse(has(day, .moon))
        XCTAssertFalse(has(day, .star))
        XCTAssertTrue(day.hasSky)
        XCTAssertEqual(day.hour, 9)

        p.lastTick = base.addingTimeInterval(14 * 3600)   // 23:00 UTC
        let night = SceneRenderer.still(pet: p, calendar: utc)
        XCTAssertTrue(has(night, .moon))
        XCTAssertTrue(has(night, .star))
        XCTAssertFalse(has(night, .sun))
        XCTAssertEqual(night.hour, 23)

        p.lightOn = false
        let dark = SceneRenderer.still(pet: p, calendar: utc)
        XCTAssertTrue(dark.dim)
        XCTAssertFalse(day.dim)
    }

    func testLineComesFromTheSpecies() {
        for sp in Species.all {
            let p = makePet(stage: sp.stage, species: sp.id)
            if PetLine(rawValue: sp.line) != nil {
                XCTAssertEqual(SceneRenderer.lineOf(p).rawValue, sp.line, sp.id)
                XCTAssertEqual(SceneRenderer.still(pet: p, calendar: utc).line.rawValue, sp.line, sp.id)
            } else {
                // family-only lines (raptor, reef...) are colored by bodyHex; the line only sets the dark blend
                XCTAssertNotNil(sp.bodyHex, sp.id)
                XCTAssertEqual(SceneRenderer.lineOf(p), sp.stage == .baby ? .baby : .meat, sp.id)
            }
        }
        XCTAssertEqual(SceneRenderer.lineOf(makePet(stage: .egg, species: "")), .baby)
        XCTAssertEqual(SceneRenderer.lineOf(makePet(stage: .ghost, species: "rawr")), .neglect)
        XCTAssertTrue(Species.all.allSatisfy { PetLine(rawValue: $0.line) != nil || $0.bodyHex != nil },
                      "every species has a known line or a family body color")
        let withBody = Species.all.filter { sp in
            sp.hiFrames.contains { SceneLayer.petLayers($0).joined().contains(.body) }
        }
        XCTAssertGreaterThan(withBody.count * 2, Species.all.count, "most sprites have a body to color")
    }

    // MARK: palette

    func testEveryLayerHasAColorInAllFourModeAndAppearanceCombos() {
        for mode in modes {
            for appearance in lights {
                let screen = ScenePalette.screen(mode: mode, appearance: appearance)
                for (_, hour) in periodHours {
                    for line in PetLine.allCases {
                        for l in SceneLayer.allCases where l != .off {
                            let c = ScenePalette.color(layer: l, mode: mode, appearance: appearance, hour: hour,
                                                       weather: .clear, line: line)
                            XCTAssertTrue(c.hex.hasPrefix("#") && c.hex.count == 7, "\(l) \(mode) \(appearance)")
                            if mode == .traditional {
                                XCTAssertEqual(c, screen.ink, "traditional \(l) is ink")
                            }
                        }
                        let unlit = ScenePalette.color(layer: .off, mode: mode, appearance: appearance, hour: hour,
                                                       weather: .clear, line: line)
                        XCTAssertEqual(unlit, mode == .traditional
                                       ? screen.ground
                                       : ScenePalette.sky(mode: mode, appearance: appearance, hour: hour, weather: .clear))
                    }
                }
                for night in [false, true] {
                    XCTAssertEqual(ScenePalette.table(mode: mode, appearance: appearance, night: night,
                                                      line: .meat).count, ScenePalette.tableSize)
                }
            }
        }
        let distinct = Set(SceneLayer.allCases.filter { $0 != .off }.map {
            ScenePalette.color(layer: $0, mode: .technicolor, appearance: .light, hour: 12, weather: .clear, line: .meat)
        })
        XCTAssertGreaterThanOrEqual(distinct.count, 20, "technicolor layers are visually distinct")
    }

    func testWebPaletteValues() {
        XCTAssertEqual(ScenePalette.screen(mode: .traditional, appearance: .light).ground.hex, "#B5C19A")
        XCTAssertEqual(ScenePalette.screen(mode: .technicolor, appearance: .light).ground.hex, "#EAE2CB")
        XCTAssertEqual(ScenePalette.screen(mode: .technicolor, appearance: .light).ink.hex, "#34384A")
        XCTAssertEqual(ScenePalette.screen(mode: .technicolor, appearance: .dark).ground.hex, "#20243A")
        XCTAssertEqual(ScenePalette.screen(mode: .technicolor, appearance: .dark).ink.hex, "#E4DCC4")
        func light(_ l: SceneLayer, night: Bool = false) -> String {
            ScenePalette.table(mode: .technicolor, appearance: .light, night: night, line: .meat)[Int(l.rawValue)].hex
        }
        XCTAssertEqual(light(.sun), "#E2B94B")
        XCTAssertEqual(light(.rain), "#587C94")      // tuned from the spec's #6F8FA6
        XCTAssertEqual(light(.heart), "#A8453F")     // tuned from #B8574E
        XCTAssertEqual(light(.alert), "#B8392E")
        XCTAssertEqual(light(.body), "#C27358")      // meat body, tuned from #B9684C
        XCTAssertEqual(light(.ink, night: true), "#E4DCC4", "ink flips light on the night sky")
        XCTAssertEqual(ScenePalette.sky(mode: .technicolor, appearance: .light, hour: 12, weather: .clear).hex, "#A9C9D6")
        XCTAssertEqual(ScenePalette.sky(mode: .technicolor, appearance: .light, hour: 12, weather: .rain).hex, "#9AA8B0")
        XCTAssertEqual(ScenePalette.sky(mode: .technicolor, appearance: .light, hour: 23, weather: .rain).hex, "#2F3A5A",
                       "rain overrides day and dusk only")
        XCTAssertEqual(ScenePalette.sky(mode: .technicolor, appearance: .dark, hour: 23, weather: .clear).hex, "#1B2240")
        XCTAssertEqual(RGB(hex: "#FF8000").mixed(with: RGB(hex: "#000000"), 0.5).hex, "#804000")
    }

    // MARK: contrast (same pairs as expo-prototype/test/color.ts)

    func testContrastInBothModesAndAppearances() {
        func table(_ appearance: ScenePalette.Appearance, night: Bool = false, line: PetLine = .baby) -> [RGB] {
            ScenePalette.table(mode: .technicolor, appearance: appearance, night: night, line: line)
        }
        for appearance in lights {
            let tag = appearance == .dark ? "dark" : "light"
            for mode in modes {
                let sc = ScenePalette.screen(mode: mode, appearance: appearance)
                XCTAssertGreaterThanOrEqual(RGB.contrast(sc.ink, sc.ground), 3, "\(mode) \(tag): text vs ground")
            }
            for line in PetLine.allCases {
                let t = table(appearance, line: line)
                let ratio = RGB.contrast(t[Int(SceneLayer.body.rawValue)], t[Int(SceneLayer.outline.rawValue)])
                // Fox lines were tuned by eye and sit a little lower than the original dino lines.
                let minRatio = [PetLine.hunter, .forager, .riverside, .stray].contains(line) ? 2.5 : 3.0
                XCTAssertGreaterThanOrEqual(ratio, minRatio, "\(tag): \(line) body vs outline \(ratio)")
            }
            if appearance == .light {
                for line in PetLine.allCases {
                    let t = table(.light, night: true, line: line)
                    let ratio = RGB.contrast(t[Int(SceneLayer.body.rawValue)], t[Int(SceneLayer.outline.rawValue)])
                    XCTAssertGreaterThanOrEqual(ratio, 3, "light night: \(line) body vs outline \(ratio)")
                }
            }
            let day = table(appearance)
            let daySky = ScenePalette.sky(mode: .technicolor, appearance: appearance, hour: 12, weather: .clear)
            for l in [SceneLayer.heart, .ink] {
                let ratio = RGB.contrast(day[Int(l.rawValue)], daySky)
                XCTAssertGreaterThanOrEqual(ratio, 3, "\(tag): \(l) vs day sky \(ratio)")
            }
            // scene ink and hearts stay readable on every sky (night uses the night palette)
            for (name, hour) in periodHours {
                for weather in [SceneAmbient.Weather.clear, .rain] {
                    let t = table(appearance, night: name == "night")
                    let sky = ScenePalette.sky(mode: .technicolor, appearance: appearance, hour: hour, weather: weather)
                    let ink = RGB.contrast(t[Int(SceneLayer.ink.rawValue)], sky)
                    XCTAssertGreaterThanOrEqual(ink, 3, "\(tag): ink vs \(name)/\(weather) sky \(ink)")
                    if weather == .clear {
                        let heart = RGB.contrast(t[Int(SceneLayer.heart.rawValue)], sky)
                        XCTAssertGreaterThanOrEqual(heart, 2.4, "\(tag): heart vs \(name) sky \(heart)")
                    }
                }
            }
        }
    }

    // MARK: persistence

    func testColorModePersistsThroughInjectedDefaults() {
        let name = "com.pocketrexie.tests.colormode.\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: name) else { return XCTFail("no suite") }
        defer { defaults.removePersistentDomain(forName: name) }

        XCTAssertEqual(ColorModeStore.key, "colorMode")
        XCTAssertEqual(ColorModeStore.defaultMode, .traditional)
        XCTAssertEqual(ColorModeStore.load(from: defaults), .traditional, "default is traditional")

        ColorModeStore.save(.technicolor, to: defaults, reloadWidgets: false)
        XCTAssertEqual(defaults.string(forKey: "colorMode"), "technicolor")
        XCTAssertEqual(ColorModeStore.load(from: defaults), .technicolor, "technicolor survives a relaunch")
        // a second reader of the same suite (the widget, the watch) sees it too
        let reader = UserDefaults(suiteName: name)
        XCTAssertEqual(ColorModeStore.load(from: reader), .technicolor)

        ColorModeStore.save(.traditional, to: defaults, reloadWidgets: false)
        XCTAssertEqual(ColorModeStore.load(from: defaults), .traditional)

        defaults.set("sepia", forKey: "colorMode")
        XCTAssertEqual(ColorModeStore.load(from: defaults), .traditional, "an unknown value falls back")
        XCTAssertEqual(ColorMode.allCases, [.traditional, .technicolor])
        XCTAssertEqual(ColorMode(rawValue: "technicolor"), .technicolor)
    }

    func testLCDPalettesFollowTheMode() {
        for scheme in [ColorScheme.light, .dark] {
            let trad = LCDStyle.palette(for: scheme, mode: .traditional)
            XCTAssertEqual(trad.mode, .traditional)
            XCTAssertEqual(trad.background, LCDStyle.palette(for: scheme).background)
            let tech = LCDStyle.palette(for: scheme, mode: .technicolor)
            XCTAssertEqual(tech.mode, .technicolor)
            XCTAssertNotEqual(tech.background, trad.background)
            XCTAssertNotEqual(tech.ink, trad.ink)
            XCTAssertEqual(tech.backlit, scheme == .dark)
            XCTAssertEqual(tech.appearance, scheme == .dark ? .dark : .light)
        }
        XCTAssertEqual(LCDStyle.palette(dark: true, mode: .technicolor).background,
                       RGB(hex: "#20243A").color)
    }

    // MARK: cosmetics

    /// The thought bubble and its margin never sit on a cloud, whatever the weather and wherever the pet stands.
    func testThoughtBubbleKeepsCloudsAway() {
        var checked = 0
        var sawClouds = 0
        for seed in UInt64(1)...120 {
            var p = makePet(seed: seed)
            p.call = .hungry
            let amb = SceneAmbient(seed: seed, date: base, calendar: utc)
            guard amb.weather != .clear else { continue }
            for x in stride(from: 0.0, through: 32.0, by: 4.0) {
                var s = SceneState.still(for: p)
                s.x = x
                var options = SceneRenderOptions()
                options.animated = false
                options.calendar = utc
                let r = SceneRenderer.render(pet: p, state: s, date: base, options: options)
                let place = SceneRenderer.placement(pet: p, state: s, frame: 0, motion: false, override: nil)
                guard let layout = SceneRenderer.bubbleLayout(pet: p, place: place) else {
                    XCTFail("a hungry pet shows a bubble"); continue
                }
                let a = layout.avoidRect
                for yy in max(0, a.minY)..<min(64, a.maxY) {
                    for xx in max(0, a.minX)..<min(64, a.maxX) {
                        XCTAssertNotEqual(r.layer(xx, yy), .cloud,
                                          "seed \(seed) x \(x): cloud at \(xx),\(yy) by the bubble \(layout)")
                    }
                }
                if r.cells.contains(SceneLayer.cloud.rawValue) { sawClouds += 1 }
                checked += 1
            }
        }
        XCTAssertGreaterThan(checked, 50)
        XCTAssertGreaterThan(sawClouds, checked / 2, "clouds are still drawn")
    }

    func testPoopsLeaveAThreePixelGap() {
        var p = makePet()
        p.poops = 3
        let s = SceneState.still(for: p)
        var options = SceneRenderOptions()
        options.animated = false
        options.calendar = utc
        let r = SceneRenderer.render(pet: p, state: s, date: base, options: options)
        // Still frame: no jiggle. In every glyph row, columns 0...6 of each poop are the poop layer and the
        // three columns between poops hold none.
        for gapStart in [54, 44] {
            for yy in 51..<58 {
                for xx in gapStart..<(gapStart + 3) {
                    XCTAssertNotEqual(r.layer(xx, yy), .poop, "gap pixel \(xx),\(yy)")
                }
            }
        }
        for spot in SceneState.poopSpots {
            XCTAssertEqual(r.layer(spot + 3, 51), .poop, "top of the poop at \(spot)")
            XCTAssertEqual(r.layer(spot + 3, 57), .poop)
        }
    }
}
