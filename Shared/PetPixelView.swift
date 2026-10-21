import SwiftUI

/// A pair of LCD colors: the ground and the ink drawn on it.
struct LCDPalette: Sendable {
    let background: Color
    let ink: Color
}

/// Colors of the fake LCD. `background` and `ink` are the light palette (the default
/// everywhere, including widgets and the watch). Dark mode on iPhone is a backlit look:
/// dark ground, with the light LCD green as ink.
enum LCDStyle {
    static let background = Color(red: 0xB5 / 255.0, green: 0xC1 / 255.0, blue: 0x9A / 255.0)
    static let ink = Color(red: 0x2B / 255.0, green: 0x33 / 255.0, blue: 0x20 / 255.0)
    static let backlitGround = Color(red: 0x1E / 255.0, green: 0x24 / 255.0, blue: 0x18 / 255.0)

    static let light = LCDPalette(background: background, ink: ink)
    static let dark = LCDPalette(background: backlitGround, ink: background)

    static func palette(for scheme: ColorScheme) -> LCDPalette {
        scheme == .dark ? dark : light
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

/// Builds paths for the 32x32 pixel scene (see SceneRenderer), shared by the animated screen and the static view.
enum LCDPainter {
    static let grid = 32

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
        let bits = shade ? raster.shade : raster.ink
        for y in 0..<grid {
            for x in 0..<grid where bits[y * grid + x] {
                path.addRect(pixelRect(x, y, cell))
            }
        }
        return path
    }

    /// A single bitmap placed on the 32x32 grid (used for full-screen effects).
    static func glyphPath(_ rows: [String], x: Int, y: Int, size: CGSize) -> Path {
        let cell = min(size.width, size.height) / CGFloat(grid)
        var path = Path()
        addGlyph(rows, x, y, cell, to: &path)
        return path
    }

    /// Shell with a zigzag crack, shown in alternation with the new baby after hatching.
    static let crackEgg: [String] = [
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
            ctx.fill(LCDPainter.gridPath(size: size), with: .color(colors.ink.opacity(0.06)))
            ctx.fill(LCDPainter.path(raster, shade: true, size: size), with: .color(colors.ink.opacity(0.4)))
            ctx.fill(LCDPainter.path(raster, size: size), with: .color(colors.ink))
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
