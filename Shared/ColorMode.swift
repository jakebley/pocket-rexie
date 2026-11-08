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
        var text = hex
        if text.hasPrefix("#") { text.removeFirst() }
        var value: UInt32 = 0
        Scanner(string: text).scanHexInt32(&value)
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
        }
        return RGB(hex: hex)
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
    private static let darkBodyBlend = 0.44
    private static let darkBodyBlendBaby = 0.62
    private static let bodyLightTint = 0.3
    private static let rimLight = RGB(hex: "#E4DCC4")
    private static let white = RGB(hex: "FFFFFF")

    /// Lights-off darkening: the whole sky, and the extra dither, blend toward this near-black.
    static let dimInk = RGB(hex: "#0B0D18")
    static let dimSky = 0.4
    static let dimDither = 0.38

    // MARK: tables

    /// Number of entries in a color table: index = layer code, 0 is the screen ground.
    static let tableSize = SceneLayer.allCases.count

    /// Layer-indexed colors for one context. Traditional: every lit layer is the ink.
    /// `night` is whether the scene sky is the night sky (it flips ink-like layers light in the light appearance).
    static func table(mode: ColorMode, appearance: Appearance, night: Bool, line: PetLine) -> [RGB] {
        let sc = screen(mode: mode, appearance: appearance)
        var t = [RGB](repeating: sc.ink, count: tableSize)
        t[0] = sc.ground
        guard mode == .technicolor else { return t }
        let dark = appearance == .dark
        for l in SceneLayer.allCases where l != .off {
            let i = Int(l.rawValue)
            if dark, let o = darkOverride(l) {
                t[i] = o
            } else if !dark, night, let o = nightOverride(l) {
                t[i] = o
            } else {
                let base = techLight(l) ?? techLight(.ink) ?? sc.ink
                t[i] = dark ? base.mixed(with: sc.ground, darkBlend) : base
            }
        }
        let body = bodyColor(line)
        let bodyIndex = Int(SceneLayer.body.rawValue)
        t[bodyIndex] = dark
            ? body.mixed(with: sc.ground, line == .baby ? darkBodyBlendBaby : darkBodyBlend)
            : body
        // Against the night sky a dark outline vanishes: rim-light it, but only for bodies dark enough
        // to stand apart from a light rim (the rest keep the dark outline and read against the sky).
        if night, !dark, RGB.contrast(t[bodyIndex], rimLight) >= 3 {
            t[Int(SceneLayer.outline.rawValue)] = rimLight
        }
        t[Int(SceneLayer.bodyLight.rawValue)] = t[bodyIndex].mixed(with: white, dark ? 0.18 : bodyLightTint)
        return t
    }

    /// Color of one lit layer. `.off` is the unlit pixel: the scene sky in Technicolor (for the hour and
    /// weather), the screen ground in Traditional. `weather` only matters for `.off`.
    static func color(layer: SceneLayer, mode: ColorMode, appearance: Appearance, hour: Int,
                      weather: SceneAmbient.Weather, line: PetLine) -> RGB {
        if layer == .off {
            return mode == .technicolor
                ? sky(mode: mode, appearance: appearance, hour: hour, weather: weather)
                : screen(mode: mode, appearance: appearance).ground
        }
        let night = SceneAmbient.Period.of(hour: hour) == .night
        let t = table(mode: mode, appearance: appearance, night: night, line: line)
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
    static func sky(mode: ColorMode, appearance: Appearance, hour: Int, weather: SceneAmbient.Weather) -> RGB {
        let period = SceneAmbient.Period.of(hour: hour)
        let light = skyLight(period, rain: weather == .rain)
        guard appearance == .dark else { return light }
        if period == .night { return RGB(hex: "#1B2240") }
        return light.mixed(with: screen(mode: mode, appearance: .dark).ground, darkSkyBlend)
    }

    /// Fill under the ground band.
    static func soil(mode: ColorMode, appearance: Appearance) -> RGB {
        let light = RGB(hex: "#CDBF9E")
        guard appearance == .dark else { return light }
        return light.mixed(with: screen(mode: mode, appearance: .dark).ground, 0.55)
    }
}
