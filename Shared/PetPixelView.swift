import SwiftUI

extension RGB {
    var color: Color {
        Color(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: 1)
    }
}

/// A pair of LCD colors: the ground and the ink drawn on it, plus the look (mode) they belong to.
struct LCDPalette: Sendable {
    let background: Color
    let ink: Color
    /// Light ink on a dark ground. There the "lights off" dither would brighten the screen, so it is dimmed instead.
    var backlit = false
    /// Traditional paints every lit scene pixel in `ink`; Technicolor paints each layer in its own color.
    var mode: ColorMode = .traditional

    var appearance: ScenePalette.Appearance { backlit ? .dark : .light }
}

/// Colors of the fake LCD. `background` and `ink` are the light palette (the default
/// everywhere, including widgets and the watch). Dark mode on iPhone is a backlit look:
/// dark ground, with the light LCD green as ink.
enum LCDStyle {
    static let background = Color(red: 0xB5 / 255.0, green: 0xC1 / 255.0, blue: 0x9A / 255.0)
    static let ink = Color(red: 0x2B / 255.0, green: 0x33 / 255.0, blue: 0x20 / 255.0)
    static let backlitGround = Color(red: 0x1E / 255.0, green: 0x24 / 255.0, blue: 0x18 / 255.0)

    static let light = LCDPalette(background: background, ink: ink)
    static let dark = LCDPalette(background: backlitGround, ink: background, backlit: true)

    static func palette(for scheme: ColorScheme) -> LCDPalette {
        scheme == .dark ? dark : light
    }

    private static func chrome(_ mode: ColorMode, _ appearance: ScenePalette.Appearance) -> LCDPalette {
        let screen = ScenePalette.screen(mode: mode, appearance: appearance)
        return LCDPalette(background: screen.ground.color, ink: screen.ink.color,
                          backlit: appearance == .dark, mode: mode)
    }

    static let technicolorLight = chrome(.technicolor, .light)
    static let technicolorDark = chrome(.technicolor, .dark)

    /// The palette of a look in a system appearance (screen ground, ink and, in Technicolor, scene colors).
    static func palette(for scheme: ColorScheme, mode: ColorMode) -> LCDPalette {
        switch mode {
        case .traditional: return palette(for: scheme)
        case .technicolor: return scheme == .dark ? technicolorDark : technicolorLight
        }
    }

    /// Same, for views that only know light or backlit (watch Always-On).
    static func palette(dark isDark: Bool, mode: ColorMode) -> LCDPalette {
        palette(for: isDark ? .dark : .light, mode: mode)
    }
}

private struct LCDPaletteKey: EnvironmentKey {
    static let defaultValue = LCDStyle.light
}

extension EnvironmentValues {
    /// The palette used by LCD views. Defaults to the light palette.
    var lcdPalette: LCDPalette {
        get { self[LCDPaletteKey.self] }
        set { self[LCDPaletteKey.self] = newValue }
    }
}

/// Builds paths for the 64x64 pixel scene (see SceneRenderer), shared by the animated screen and the static view.
enum LCDPainter {
    static let grid = SceneRaster.side

    /// Faint "unlit" pixels, for the LCD look.
    static func gridPath(size: CGSize) -> Path {
        let cell = min(size.width, size.height) / CGFloat(grid)
        var path = Path()
        for y in 0..<grid {
            for x in 0..<grid {
                path.addRect(pixelRect(x, y, cell))
            }
        }
        return path
    }

    /// The dark (or, with `shade`, the dithered) pixels of a rendered scene.
    static func path(_ raster: SceneRaster, shade: Bool = false, size: CGSize) -> Path {
        let cell = min(size.width, size.height) / CGFloat(grid)
        var path = Path()
        for y in 0..<grid {
            for x in 0..<grid {
                let i = y * grid + x
                if shade ? raster.shade[i] : SceneLayer.isTraditionalLit(raster.cells[i]) {
                    path.addRect(pixelRect(x, y, cell))
                }
            }
        }
        return path
    }

    /// Paints a rendered scene in the palette's look. Traditional: faint grid, dim dither and every
    /// lit pixel in the ink. Technicolor: sky and soil, the same grid, then the lit pixels grouped
    /// into one path per color (a handful of fills per frame).
    static func paint(_ ctx: inout GraphicsContext, raster: SceneRaster, size: CGSize, palette: LCDPalette) {
        if palette.mode == .traditional {
            ctx.fill(gridPath(size: size), with: .color(palette.ink.opacity(0.06)))
            ctx.fill(path(raster, shade: true, size: size), with: .color(palette.ink.opacity(0.4)))
            ctx.fill(path(raster, size: size), with: .color(palette.ink))
            return
        }
        let cell = min(size.width, size.height) / CGFloat(grid)
        let appearance = palette.appearance
        let period = SceneAmbient.Period.of(hour: raster.hour)
        // a dark backdrop (the night sky, or an always-dark biome like the workshop) flips the ink-like layers light
        let night = raster.biome.isDark(period)
        let table = ScenePalette.table(mode: palette.mode, appearance: appearance, night: night, line: raster.line,
                                       bodyHex: raster.bodyHex, biome: raster.biome, period: period,
                                       rain: raster.weather == .rain)
        if raster.hasSky {
            let ground = CGFloat(raster.groundRow) * cell
            let skyRect = CGRect(x: 0, y: 0, width: cell * CGFloat(grid), height: ground)
            let soilRect = CGRect(x: 0, y: ground, width: cell * CGFloat(grid), height: cell * CGFloat(grid) - ground)
            let sky = ScenePalette.sky(mode: palette.mode, appearance: appearance, hour: raster.hour,
                                       weather: raster.weather, biome: raster.biome)
            ctx.fill(Path(skyRect), with: .color(sky.color))
            ctx.fill(Path(soilRect), with: .color(ScenePalette.soil(mode: palette.mode, appearance: appearance, biome: raster.biome).color))
            if raster.dim {
                var both = Path()
                both.addRect(skyRect)
                both.addRect(soilRect)
                ctx.fill(both, with: .color(ScenePalette.dimInk.color.opacity(ScenePalette.dimSky)))
            }
        }
        ctx.fill(gridPath(size: size), with: .color(palette.ink.opacity(0.06)))
        if raster.dim {
            ctx.fill(path(raster, shade: true, size: size),
                     with: .color(ScenePalette.dimInk.color.opacity(ScenePalette.dimDither)))
        }
        var groups: [RGB: Path] = [:]
        for y in 0..<grid {
            for x in 0..<grid {
                let i = y * grid + x
                let raw = raster.cells[i]
                if raw == 0 { continue }
                let code = Int(raw)
                var rgb = code < table.count ? table[code] : table[Int(SceneLayer.ink.rawValue)]
                // lights off: the dither also darkens scenery (it is unlit in Traditional, so it was marked like the sky)
                if raster.dim && raster.shade[i] && SceneLayer.isScenery(raw) {
                    rgb = rgb.mixed(with: ScenePalette.dimInk, ScenePalette.dimDither)
                }
                groups[rgb, default: Path()].addRect(pixelRect(x, y, cell))
            }
        }
        for (rgb, group) in groups {
            ctx.fill(group, with: .color(rgb.color))
        }
    }

    /// A single bitmap placed on the 64x64 grid (used for full-screen effects).
    static func glyphPath(_ rows: [String], x: Int, y: Int, size: CGSize) -> Path {
        let cell = min(size.width, size.height) / CGFloat(grid)
        var path = Path()
        addGlyph(rows, x, y, cell, to: &path)
        return path
    }

    /// Shell with a zigzag crack, shown in alternation with the new baby after hatching.
    static let crackEgg: [String] = Sprite.scale2x(crackEgg16)

    private static let crackEgg16: [String] = [
        "................",
        ".....XXXXXX.....",
        "....XXXXXXXX....",
        "...XXXXXXXXXX...",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "..XXXX..XXXXXX..",
        "..XXX..XX..XXX..",
        "..XX..XXXX..XX..",
        "..XXXX..XXXXXX..",
        "..XXXXXXXXXXXX..",
        "...XXXXXXXXXX...",
        "...XXXXXXXXXX...",
        "....XXXXXXXX....",
        ".....XXXXXX.....",
        "................",
    ]

    private static func addGlyph(_ rows: [String], _ x0: Int, _ y0: Int, _ cell: CGFloat,
                                 to path: inout Path) {
        for (r, row) in rows.enumerated() {
            for (c, ch) in row.enumerated() where ch == "X" {
                let x = x0 + c
                let y = y0 + r
                guard x >= 0, x < grid, y >= 0, y < grid else { continue }
                path.addRect(pixelRect(x, y, cell))
            }
        }
    }

    private static func pixelRect(_ x: Int, _ y: Int, _ cell: CGFloat) -> CGRect {
        let inset = cell * 0.06
        return CGRect(x: CGFloat(x) * cell + inset, y: CGFloat(y) * cell + inset,
                      width: cell - inset * 2, height: cell - inset * 2)
    }
}

/// A still picture of the pet in its room on the LCD (no animation). Needs only a `Pet`, so widgets can use it.
struct PetPixelView: View {
    let pet: Pet
    /// Explicit palette; when nil the environment's `lcdPalette` (light by default) is used.
    let palette: LCDPalette?
    @Environment(\.lcdPalette) private var environmentPalette

    init(pet: Pet, palette: LCDPalette? = nil) {
        self.pet = pet
        self.palette = palette
    }

    var body: some View {
        let colors = palette ?? environmentPalette
        let raster = SceneRenderer.still(pet: pet)
        Canvas { ctx, size in
            LCDPainter.paint(&ctx, raster: raster, size: size, palette: colors)
        }
        .aspectRatio(1, contentMode: .fit)
        .background(colors.background)
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
        .accessibilityLabel(pet.statusLine)
    }

    static func image(for pet: Pet, size: CGFloat) -> some View {
        PetPixelView(pet: pet).frame(width: size, height: size)
    }
}
