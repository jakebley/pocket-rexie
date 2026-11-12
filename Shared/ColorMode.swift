import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

// Color modes: the Traditional monochrome LCD and the muted, nostalgic Technicolor palette.
// Spec: docs/COLOR_MODES.md. The values mirror expo-prototype/src/ui/palette.ts (the web port),
// including the contrast tunings made there. Foundation only (plus WidgetKit for reloads), so tests can use it directly.

/// The look chosen in Settings. Persisted in the App Group defaults under `ColorModeStore.key`.
enum ColorMode: String, CaseIterable, Sendable {
    case traditional
    case technicolor

    var title: String {
        switch self {
        case .traditional: return "Traditional"
        case .technicolor: return "Technicolor"
        }
    }
}

/// Reads and writes the chosen `ColorMode`. Widgets, the Watch app and the phone app all use the
/// same App Group key; tests inject their own `UserDefaults`.
enum ColorModeStore {
    static let key = "colorMode"
    static let defaultMode: ColorMode = .traditional

    /// The saved mode; a missing or unknown value is Traditional.
    static func load(from defaults: UserDefaults? = nil) -> ColorMode {
        let store = defaults ?? PetStore.defaults
        guard let raw = store.string(forKey: key), let mode = ColorMode(rawValue: raw) else {
            return defaultMode
        }
        return mode
    }

    /// Saves the mode and (unless told not to) asks WidgetKit to redraw every widget.
    static func save(_ mode: ColorMode, to defaults: UserDefaults? = nil, reloadWidgets: Bool = true) {
        let store = defaults ?? PetStore.defaults
        store.set(mode.rawValue, forKey: key)
        #if canImport(WidgetKit)
        if reloadWidgets { WidgetCenter.shared.reloadAllTimelines() }
        #endif
    }
}

/// Lineage color family of a species (`Species.line`).
enum PetLine: String, CaseIterable, Sendable {
    case baby, meat, veggie, pasta, neglect
    /// Fox family lines (first pass from docs/FOX_FAMILY.md; colours to be tuned by eye).
    case hunter, forager, riverside, stray

    init(name: String) { self = PetLine(rawValue: name) ?? .baby }
}

/// An opaque 8-bit color with the small amount of math the palette needs.
struct RGB: Hashable, Sendable {
    var r: Int
    var g: Int
    var b: Int

    init(r: Int, g: Int, b: Int) {
        self.r = max(0, min(255, r))
        self.g = max(0, min(255, g))
        self.b = max(0, min(255, b))
    }

    /// "#RRGGBB" (the leading # is optional).
    init(hex: String) {
        // Hand-rolled hex parse (Scanner is slow and the palette parses hundreds of literals per frame):
        // an optional leading "#", then hex digits up to the first other character.
        var value: UInt32 = 0
        var first = true
        for ch in hex.utf8 {
            if first {
                first = false
                if ch == 35 { continue } // "#"
            }
            let digit: UInt32
            switch ch {
            case 48...57: digit = UInt32(ch - 48)
            case 65...70: digit = UInt32(ch - 55)
            case 97...102: digit = UInt32(ch - 87)
            default: digit = 99
            }
            if digit == 99 { break }
            value = (value &<< 4) | digit
        }
        self.init(r: Int((value >> 16) & 0xFF), g: Int((value >> 8) & 0xFF), b: Int(value & 0xFF))
    }

    var hex: String { String(format: "#%02X%02X%02X", r, g, b) }

    /// This color moved `t` (0...1) of the way toward `other`.
    func mixed(with other: RGB, _ t: Double) -> RGB {
        func mix(_ a: Int, _ b: Int) -> Int { Int((Double(a) + (Double(b) - Double(a)) * t).rounded()) }
        return RGB(r: mix(r, other.r), g: mix(g, other.g), b: mix(b, other.b))
    }

    /// WCAG relative luminance.
    var luminance: Double {
        func channel(_ v: Int) -> Double {
            let c = Double(v) / 255
            return c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }

    /// WCAG contrast ratio, 1...21.
    static func contrast(_ a: RGB, _ b: RGB) -> Double {
        let la = a.luminance, lb = b.luminance
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
    }
}

/// Maps scene layers to colors for a mode, appearance and time of day.
enum ScenePalette {
    enum Appearance: Sendable { case light, dark }

    struct Screen: Equatable {
        let ground: RGB
        let ink: RGB
    }

    // MARK: screen (outside the scene)

    static func screen(mode: ColorMode, appearance: Appearance) -> Screen {
        switch (mode, appearance) {
        case (.traditional, .light): return Screen(ground: RGB(hex: "#B5C19A"), ink: RGB(hex: "#2B3320"))
        case (.traditional, .dark): return Screen(ground: RGB(hex: "#1E2418"), ink: RGB(hex: "#B5C19A"))
        case (.technicolor, .light): return Screen(ground: RGB(hex: "#EAE2CB"), ink: RGB(hex: "#34384A"))
        case (.technicolor, .dark): return Screen(ground: RGB(hex: "#20243A"), ink: RGB(hex: "#E4DCC4"))
        }
    }

    // MARK: Technicolor values (light appearance, "day")

    private static func techLight(_ l: SceneLayer) -> RGB? {
        let hex: String
        switch l {
        case .ink, .outline, .bubble: hex = "#34384A"
        case .sun: hex = "#E2B94B"
        case .moon: hex = "#EDE6C8"
        case .star: hex = "#F2EBCF"
        case .cloud: hex = "#F1EDE0"
        case .rain: hex = "#587C94"
        case .grass: hex = "#7C9C63"
        case .ground: hex = "#A98F67"
        case .dirt: hex = "#8F7752"
        case .flowerA: hex = "#C9707A"
        case .flowerB: hex = "#E0B84F"
        case .heart: hex = "#A8453F"
        case .smile: hex = "#98701C"
        case .poop: hex = "#8D6A47"
        case .foodMeat: hex = "#A9573E"
        case .foodVeg: hex = "#6F9A5B"
        case .foodPasta: hex = "#D8B65D"
        case .snack: hex = "#C98AA0"
        case .tool: hex = "#9A7B52"
        case .ball: hex = "#C0634F"
        case .spark: hex = "#F0D77A"
        case .waterDrop: hex = "#6FA3B8"
        case .snow: hex = "#BFD8E2"
        case .mat: hex = "#8E6F8F"
        case .butterfly: hex = "#C98AA0"
        case .alert: hex = "#B8392E"
        case .off, .body, .bodyLight: return nil
        // pet shading and eyes: derived from the body color in `table` (shadeRamp); these are placeholders
        case .shade, .deep, .belly, .accent, .accentDark, .accentLight, .rim, .eye, .glint,
             .eyeFill, .eyeShine: return nil
        default:
            // biome cues and scenery (BiomePalette.swift)
            guard let biomeHex = biomeLightHex(l) else { return nil }
            hex = biomeHex
        }
        return RGB(hex: hex)
    }

    /// Body color of a species: its family's own hex when it has one, else the dino line color.
    static func bodyColor(line: PetLine, hex: String?) -> RGB {
        if let hex { return RGB(hex: hex) }
        return bodyColor(line)
    }

    private static func bodyColor(_ line: PetLine) -> RGB {
        switch line {
        case .meat: return RGB(hex: "#C27358")
        case .veggie: return RGB(hex: "#6E9A6B")
        case .pasta: return RGB(hex: "#D1A94A")
        case .neglect: return RGB(hex: "#8A8F96")
        case .baby: return RGB(hex: "#E7DCC0")
        case .hunter: return RGB(hex: "#C2623A")
        case .forager: return RGB(hex: "#D9A441")
        case .riverside: return RGB(hex: "#8FA3B5")
        case .stray: return RGB(hex: "#9A948C")
        }
    }

    /// Dark appearance: small HUD glyphs and ink-like layers are lifted so they glow on the dark sky.
    private static func darkOverride(_ l: SceneLayer) -> RGB? {
        switch l {
        case .outline: return RGB(hex: "#D6CEB6")
        case .ink, .bubble: return RGB(hex: "#E4DCC4")
        case .heart: return RGB(hex: "#F29E94")
        case .smile: return RGB(hex: "#E6C25C")
        case .alert: return RGB(hex: "#F08A7A")
        case .rain: return RGB(hex: "#8FB2C8")
        default: return nil
        }
    }

    /// Light appearance at night: dark ink would vanish on the night sky, so ink-like and HUD layers flip light.
    private static func nightOverride(_ l: SceneLayer) -> RGB? {
        switch l {
        case .ink, .bubble: return RGB(hex: "#E4DCC4")
        case .heart: return RGB(hex: "#E0847A")
        case .alert: return RGB(hex: "#EE8678")
        case .smile: return RGB(hex: "#E6C25C")
        default: return nil
        }
    }

    private static let darkBlend = 0.18
    private static let darkSkyBlend = 0.68
    // A body keeps its colour in the dark appearance (a light touch of the night ground only): the old 44 and 62 percent
    // blends toward the navy ground turned orange foxes and cream eggs into grey. The outline adapts instead (below).
    private static let darkBodyBlend = 0.1
    private static let darkBodyBlendBaby = 0.06
    /// Outline of a body too light to stand apart from the cream dark-appearance outline.
    private static let darkOutlineInk = RGB(hex: "#1A1626")
    private static let rimLight = RGB(hex: "#E4DCC4")

    /// Lights-off darkening: the whole sky, and the extra dither, blend toward this near-black.
    static let dimInk = RGB(hex: "#0B0D18")
    static let dimSky = 0.4
    static let dimDither = 0.38

    // MARK: tables

    /// Number of entries in a color table: index = layer code, 0 is the screen ground.
    static let tableSize = Int(SceneLayer.maxCode) + 1

    /// Layer-indexed colors for one context. Traditional: every lit layer is the ink.
    /// `night` is whether the scene sky is dark (the night sky, or an always-dark biome: it flips ink-like layers light in
    /// the light appearance). `biome`, `period` and `rain` re-colour the shared layers and shade the scenery (docs/BIOMES.md);
    /// the defaults give the dino meadow.
    static func table(mode: ColorMode, appearance: Appearance, night: Bool, line: PetLine, bodyHex: String? = nil,
                      biome: Biome = .meadow, period: SceneAmbient.Period? = nil, rain: Bool = false) -> [RGB] {
        let key = TableKey(mode: mode, appearance: appearance, night: night, line: line, bodyHex: bodyHex, biome: biome,
                           period: period.map { periodSlot($0) } ?? -1, rain: rain)
        tableLock.lock()
        let hit = tableCache[key]
        tableLock.unlock()
        if let hit { return hit }
        let made = buildTable(mode: mode, appearance: appearance, night: night, line: line, bodyHex: bodyHex,
                              biome: biome, period: period, rain: rain)
        tableLock.lock()
        if tableCache.count >= 512 { tableCache.removeAll() }
        tableCache[key] = made
        tableLock.unlock()
        return made
    }

    // The painter asks for the table on every frame; it depends only on these inputs, so it is built once each.
    private struct TableKey: Hashable {
        let mode: ColorMode
        let appearance: Appearance
        let night: Bool
        let line: PetLine
        let bodyHex: String?
        let biome: Biome
        let period: Int
        let rain: Bool
    }
    private static let tableLock = NSLock()
    private static var tableCache: [TableKey: [RGB]] = [:]

    private static func periodSlot(_ p: SceneAmbient.Period) -> Int {
        switch p {
        case .dawn: return 0
        case .day: return 1
        case .dusk: return 2
        case .night: return 3
        }
    }

    private static func buildTable(mode: ColorMode, appearance: Appearance, night: Bool, line: PetLine, bodyHex: String?,
                                   biome: Biome, period: SceneAmbient.Period?, rain: Bool) -> [RGB] {
        let sc = screen(mode: mode, appearance: appearance)
        var t = [RGB](repeating: sc.ink, count: tableSize)
        t[0] = sc.ground
        guard mode == .technicolor else { return t }
        let dark = appearance == .dark
        let remap = biomeRemap(biome)
        let shade: (RGB, Double)? = biome == .meadow ? nil : biomeShade(biome: biome, period: period, rain: rain)
        for l in SceneLayer.allCases where l != .off {
            let i = Int(l.rawValue)
            if dark, let o = darkOverride(l) {
                t[i] = o
            } else if !dark, night, let o = nightOverride(l) {
                t[i] = o
            } else {
                var base = techLight(l) ?? techLight(.ink) ?? sc.ink
                if let hex = remap?[l] { base = RGB(hex: hex) }
                if let sh = shade, biomeIsScenery(l), !l.isPetLayer, !biomeGlows.contains(l) { base = base.mixed(with: sh.0, sh.1) }
                t[i] = dark ? base.mixed(with: sc.ground, darkBlend) : base
            }
        }
        let body = bodyColor(line: line, hex: bodyHex)
        let bodyIndex = Int(SceneLayer.body.rawValue)
        t[bodyIndex] = dark
            ? body.mixed(with: sc.ground, line == .baby ? darkBodyBlendBaby : darkBodyBlend)
            : body
        // Dark appearance: a bright body against the cream outline has little contrast, so it takes a dark outline
        // (its lit edge still glows through the rim layer below); only bodies dark enough keep the cream one.
        if dark, RGB.contrast(t[bodyIndex], t[Int(SceneLayer.outline.rawValue)]) < 3 {
            t[Int(SceneLayer.outline.rawValue)] = darkOutlineInk
        }
        // Against the night sky a dark outline vanishes: rim-light it, but only for bodies dark enough
        // to stand apart from a light rim (the rest keep the dark outline and read against the sky).
        if night, !dark, RGB.contrast(t[bodyIndex], rimLight) >= 3 {
            t[Int(SceneLayer.outline.rawValue)] = rimLight
        }
        // A mid-tone body on a mid-dark backdrop (the workshop) can leave the dark outline too close to the sky: lift it to a dim cream.
        if night, !dark, let period {
            let outlineIndex = Int(SceneLayer.outline.rawValue)
            let backdrop = sky(mode: mode, appearance: appearance, period: period, rain: rain, biome: biome)
            if t[outlineIndex] == techLight(.outline), RGB.contrast(t[outlineIndex], backdrop) < 2.6 {
                t[outlineIndex] = RGB(hex: "#CFC7AE")
            }
        }
        // Pet shading ramp, all derived from the body color (shadeRamp), and the eyes (port of palette.ts).
        let ramp = shadeRamp(body: t[bodyIndex], dark: dark)
        t[Int(SceneLayer.bodyLight.rawValue)] = ramp.hi
        t[Int(SceneLayer.shade.rawValue)] = ramp.shade
        t[Int(SceneLayer.deep.rawValue)] = ramp.deep
        t[Int(SceneLayer.belly.rawValue)] = ramp.belly
        t[Int(SceneLayer.accent.rawValue)] = ramp.accent
        t[Int(SceneLayer.accentDark.rawValue)] = ramp.accentDark
        t[Int(SceneLayer.accentLight.rawValue)] = ramp.accentLight
        t[Int(SceneLayer.glint.rawValue)] = ramp.glint
        // egg shell: eggshell cream with a soft highlight and a warm (not cool grey) shade; the dark appearance only
        // takes a touch of the night ground so the egg stays light
        func eggTone(_ hex: String) -> RGB { dark ? RGB(hex: hex).mixed(with: sc.ground, 0.08) : RGB(hex: hex) }
        t[Int(SceneLayer.eggShell.rawValue)] = eggTone("#F0E5C6")
        t[Int(SceneLayer.eggLight.rawValue)] = eggTone("#FCF6E2")
        t[Int(SceneLayer.eggShade.rawValue)] = eggTone("#D2BF95")
        // eyes: an opaque dark pupil with a bright catch-light; on a very dark body the ring around it turns cream
        let pupil = dark ? RGB(hex: "#12141F") : RGB(hex: "#1E2030")
        t[Int(SceneLayer.eyeFill.rawValue)] = pupil
        t[Int(SceneLayer.eyeShine.rawValue)] = RGB(hex: "#FFFBEA")
        t[Int(SceneLayer.eye.rawValue)] = t[bodyIndex].luminance < 0.09 ? rimLight : pupil
        // rim light: the outline on the lit side. On a dark sky it glows; on a light sky it is the ink softened toward the body.
        let outline = t[Int(SceneLayer.outline.rawValue)]
        if dark || night {
            t[Int(SceneLayer.rim.rawValue)] = outline.mixed(with: ramp.hi, 0.3).mixed(with: RGB(hex: "#FFF8E4"), 0.4)
        } else {
            t[Int(SceneLayer.rim.rawValue)] = outline.mixed(with: t[bodyIndex], 0.12)
        }
        return t
    }

    // MARK: shading ramp (port of shadeRamp in palette.ts)

    struct ShadeRamp {
        let hi: RGB
        let shade: RGB
        let deep: RGB
        let belly: RGB
        let accent: RGB
        let accentDark: RGB
        let accentLight: RGB
        let glint: RGB
    }

    private static func toHSL(_ c: RGB) -> (h: Double, s: Double, l: Double) {
        let r = Double(c.r) / 255, g = Double(c.g) / 255, b = Double(c.b) / 255
        let mx = max(r, g, b), mn = min(r, g, b)
        let l = (mx + mn) / 2, d = mx - mn
        if d == 0 { return (0, 0, l) }
        let sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
        var hue: Double
        if mx == r {
            hue = (g - b) / d + (g < b ? 6 : 0)
        } else if mx == g {
            hue = (b - r) / d + 2
        } else {
            hue = (r - g) / d + 4
        }
        hue *= 60
        return (hue, sat, l)
    }

    private static func fromHSL(_ hue: Double, _ s: Double, _ l: Double) -> RGB {
        var hn = (hue.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360) / 360
        if hn < 0 { hn += 1 }
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s
        let p = 2 * l - q
        func f(_ t0: Double) -> Double {
            let t = (t0 + 1).truncatingRemainder(dividingBy: 1)
            if t < 1.0 / 6 { return p + (q - p) * 6 * t }
            if t < 1.0 / 2 { return q }
            if t < 2.0 / 3 { return p + (q - p) * (2.0 / 3 - t) * 6 }
            return p
        }
        func byte(_ v: Double) -> Int { Int((v * 255).rounded()) }
        return RGB(r: byte(f(hn + 1.0 / 3)), g: byte(f(hn)), b: byte(f(hn - 1.0 / 3)))
    }

    /// Move hue `a` toward `b` by at most `deg` along the short way.
    private static func hueToward(_ a: Double, _ b: Double, _ deg: Double) -> Double {
        let d = (b - a + 540).truncatingRemainder(dividingBy: 360) - 180
        return a + max(-deg, min(deg, d))
    }

    private static func clamp01(_ v: Double) -> Double { max(0, min(1, v)) }

    /// Push `c` toward `toward` (up to 8 steps) until it is at least `ratio` away from `ref` by contrast.
    private static func step(_ c0: RGB, ref: RGB, ratio: Double, toward: RGB) -> RGB {
        var c = c0
        let lr = ref.luminance
        let lighter = toward.luminance > lr
        var i = 0
        while i < 8 {
            let lc = c.luminance
            let short = lighter ? lc < (lr + 0.05) * ratio - 0.05 : lc > (lr + 0.05) / ratio - 0.05
            if !short { break }
            c = c.mixed(with: toward, 0.14)
            i += 1
        }
        return c
    }

    /// Four-tone body ramp (highlight warm and light, base, shadow cool and darker, deep underside) plus belly
    /// and accent tones, all derived from one body color. Hue shifts, not just darkening.
    static func shadeRamp(body: RGB, dark: Bool) -> ShadeRamp {
        let (h, s, l) = toHSL(body)
        let gray = s < 0.12 // neutral bodies keep a neutral ramp but still lean warm / cool
        let hiRaw = fromHSL(hueToward(h, 48, 12), clamp01(s * 0.92), clamp01(l + (dark ? 0.1 : 0.12)))
        let hi = step(hiRaw, ref: body, ratio: 1.14, toward: RGB(hex: "#FFFAE6"))
        let shadeRaw = fromHSL(hueToward(h, 252, 12), min(0.6, clamp01(s * 0.92 + (gray ? 0.04 : 0))), clamp01(l * 0.8))
        let shade = step(shadeRaw, ref: body, ratio: 1.2, toward: RGB(hex: "#1C1830"))
        let deepRaw = fromHSL(hueToward(h, 258, 22), min(0.46, clamp01(s * 0.8 + 0.03)), clamp01(l * 0.62))
        let deep = step(deepRaw, ref: shade, ratio: 1.22, toward: RGB(hex: "#1C1830"))
        let belly = body.mixed(with: RGB(hex: "#F6EBCB"), dark ? 0.42 : 0.55).mixed(with: hi, 0.15)
        let ah = h < 200 ? h + 34 : h - 34
        let accL = clamp01(min(0.58, max(0.36, l + (l > 0.5 ? -0.06 : 0.06))))
        let accent = fromHSL(ah, clamp01(max(s * 0.95, 0.34)), accL)
        let accentDark = deep.mixed(with: body, 0.3)
        let accentLight = body.mixed(with: RGB(hex: dark ? "#E4DCC4" : "#F7EDD2"), dark ? 0.62 : 0.78)
        return ShadeRamp(hi: hi, shade: shade, deep: deep, belly: belly, accent: accent, accentDark: accentDark,
                         accentLight: accentLight, glint: RGB(hex: dark ? "#E8E0CC" : "#FFFBEA"))
    }

    /// Color of one lit layer. `.off` is the unlit pixel: the scene sky in Technicolor (for the hour and
    /// weather), the screen ground in Traditional. `weather` only matters for `.off`.
    static func color(layer: SceneLayer, mode: ColorMode, appearance: Appearance, hour: Int,
                      weather: SceneAmbient.Weather, line: PetLine, bodyHex: String? = nil, biome: Biome = .meadow) -> RGB {
        if layer == .off {
            return mode == .technicolor
                ? sky(mode: mode, appearance: appearance, hour: hour, weather: weather, biome: biome)
                : screen(mode: mode, appearance: appearance).ground
        }
        let period = SceneAmbient.Period.of(hour: hour)
        let night = biome.isDark(period)
        let t = table(mode: mode, appearance: appearance, night: night, line: line, bodyHex: bodyHex,
                      biome: biome, period: period, rain: weather == .rain)
        return t[Int(layer.rawValue)]
    }

    // MARK: sky and soil (Technicolor)

    private static func skyLight(_ period: SceneAmbient.Period, rain: Bool) -> RGB {
        if rain && (period == .day || period == .dusk) { return RGB(hex: "#9AA8B0") }
        switch period {
        case .dawn: return RGB(hex: "#E3C9A9")
        case .day: return RGB(hex: "#A9C9D6")
        case .dusk: return RGB(hex: "#D0A38F")
        case .night: return RGB(hex: "#2F3A5A")
        }
    }

    /// Sky behind the scene by local hour and weather (rain overrides day and dusk).
    static func sky(mode: ColorMode, appearance: Appearance, hour: Int, weather: SceneAmbient.Weather,
                    biome: Biome = .meadow) -> RGB {
        sky(mode: mode, appearance: appearance, period: SceneAmbient.Period.of(hour: hour), rain: weather == .rain,
            biome: biome)
    }

    /// Same, from the period and whether it rains. A biome has its own sky for every period and for rain.
    static func sky(mode: ColorMode, appearance: Appearance, period: SceneAmbient.Period, rain: Bool,
                    biome: Biome = .meadow) -> RGB {
        if biome != .meadow {
            let c = RGB(hex: biomeSkyHex(biome: biome, period: period, rain: rain))
            guard appearance == .dark else { return c }
            let blend = Biome.alwaysDark.contains(biome) ? 0.3 : (period == .night ? 0.4 : 0.6)
            return c.mixed(with: screen(mode: mode, appearance: .dark).ground, blend)
        }
        let light = skyLight(period, rain: rain)
        guard appearance == .dark else { return light }
        if period == .night { return RGB(hex: "#1B2240") }
        return light.mixed(with: screen(mode: mode, appearance: .dark).ground, darkSkyBlend)
    }

    /// Fill under the ground band.
    static func soil(mode: ColorMode, appearance: Appearance, biome: Biome = .meadow) -> RGB {
        let light = biome == .meadow ? RGB(hex: "#CDBF9E") : RGB(hex: biomeSoilHex(biome))
        guard appearance == .dark else { return light }
        return light.mixed(with: screen(mode: mode, appearance: .dark).ground, 0.55)
    }
}
