import SwiftUI

// Retro-but-modern LCD toy chrome shared by the widgets, the watch app and the watch complications.
// Everything is drawn from the pixel font / bitmaps and the LCD palette: no system fonts, no SF Symbols.

enum RetroMetrics {
    /// Distance from the widget edge to the thin ink bezel line.
    static let bezelInset: CGFloat = 5
    /// Distance from the widget edge to the content (bezel inset plus a little breathing room).
    static let contentPad: CGFloat = 12
}

// MARK: - Backdrop

/// Faint horizontal scanlines, the LCD texture.
struct RetroScanlines: View {
    let color: Color

    var body: some View {
        Canvas { ctx, size in
            var lines = Path()
            var y: CGFloat = 1
            while y < size.height {
                lines.addRect(CGRect(x: 0, y: y, width: size.width, height: 1))
                y += 3
            }
            ctx.fill(lines, with: .color(color.opacity(0.05)))
        }
        .allowsHitTesting(false)
    }
}

/// The whole face of the toy: LCD ground, a thin ink bezel with softly rounded corners, a subtle
/// inner shadow and scanlines. Used as the widget container background and the watch face.
struct RetroBackdrop: View {
    let palette: LCDPalette
    var inset: CGFloat = RetroMetrics.bezelInset
    var corner: CGFloat = 22

    var body: some View {
        let radius = max(4, corner - inset)
        ZStack {
            palette.background
            ZStack {
                RetroScanlines(color: palette.ink)
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(Color.black.opacity(palette.backlit ? 0.6 : 0.22), lineWidth: 9)
                    .blur(radius: 4)
            }
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(palette.ink, lineWidth: 1.5)
            )
            .padding(inset)
        }
    }
}

extension View {
    /// The glass over a scene: rounded corners and a hairline of ink.
    func retroGlass(_ palette: LCDPalette, corner: CGFloat = 6) -> some View {
        self
            .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: corner, style: .continuous)
                    .strokeBorder(palette.ink, lineWidth: 1)
            )
    }
}

// MARK: - Text fitting

enum RetroFit {
    struct Fit {
        let pixel: CGFloat
        let lines: [String]
        /// False when even the smallest pixel size had to cut the text.
        let fits: Bool
    }

    /// How many font characters fit in `width` at `pixel` points per font pixel.
    static func maxChars(width: CGFloat, pixel: CGFloat) -> Int {
        max(1, Int(((width / pixel) + 1) / CGFloat(PixelFont.advance)))
    }

    /// The largest integer pixel size (down to 1) at which `text` wraps into at most `maxLines` lines.
    static func lines(_ text: String, width: CGFloat, maxPixel: Int, maxLines: Int) -> Fit {
        var px = max(1, maxPixel)
        while px >= 1 {
            let n = maxChars(width: width, pixel: CGFloat(px))
            let wrapped = PixelFont.wrap(text, maxChars: n)
            if wrapped.count <= maxLines { return Fit(pixel: CGFloat(px), lines: wrapped, fits: true) }
            px -= 1
        }
        let n = maxChars(width: width, pixel: 1)
        return Fit(pixel: 1, lines: Array(PixelFont.wrap(text, maxChars: n).prefix(maxLines)), fits: false)
    }

    /// The largest integer pixel size at which a single-line `text` fits `width`.
    static func pixel(for text: String, width: CGFloat, max maxPixel: Int) -> CGFloat {
        var px = max(1, maxPixel)
        while px > 1 {
            if CGFloat(PixelFont.width(of: text) * px) <= width { return CGFloat(px) }
            px -= 1
        }
        return 1
    }
}

/// Pixel text wrapped to a width, never clipped: it steps the pixel size down instead.
struct RetroCaption: View {
    let text: String
    let width: CGFloat
    var maxPixel = 2
    var maxLines = 2
    var centered = false
    var color: Color? = nil

    var body: some View {
        let fit = RetroFit.lines(text, width: width, maxPixel: maxPixel, maxLines: maxLines)
        VStack(alignment: centered ? .center : .leading, spacing: fit.pixel) {
            ForEach(Array(fit.lines.enumerated()), id: \.offset) { _, line in
                PixelText(line, pixel: fit.pixel, color: color)
            }
        }
        .frame(width: width, alignment: centered ? .center : .leading)
    }
}

// MARK: - Hearts and smiles

/// A row of pixel hearts (7x7 or 5x5) or smiles (5x5): filled ones are solid, the rest outlined.
struct RetroMeter: View {
    enum Kind { case heart7, heart5, smile5 }

    let kind: Kind
    let filled: Int
    var total = Pet.maxHearts
    let pixel: CGFloat
    var color: Color? = nil
    @Environment(\.lcdPalette) private var palette

    static let heart7Full = [
        ".XX.XX.",
        "XXXXXXX",
        "XXXXXXX",
        "XXXXXXX",
        ".XXXXX.",
        "..XXX..",
        "...X...",
    ]
    static let heart7Empty = [
        ".XX.XX.",
        "X..X..X",
        "X.....X",
        "X.....X",
        ".X...X.",
        "..X.X..",
        "...X...",
    ]

    private var side: Int { kind == .heart7 ? 7 : 5 }
    private var fullRows: [String] {
        switch kind {
        case .heart7: return Self.heart7Full
        case .heart5: return Sprite.heartFull
        case .smile5: return Sprite.smileFull
        }
    }
    private var emptyRows: [String] {
        switch kind {
        case .heart7: return Self.heart7Empty
        case .heart5: return Sprite.heartEmpty
        case .smile5: return Sprite.smileEmpty
        }
    }

    var width: CGFloat { CGFloat(max(1, total) * (side + 1) - 1) * pixel }
    var height: CGFloat { CGFloat(side) * pixel }

    private func makePath() -> Path {
        var path = Path()
        let on = max(0, min(total, filled))
        for i in 0..<max(1, total) {
            let origin = CGPoint(x: CGFloat(i * (side + 1)) * pixel, y: 0)
            PixelBitmap.add(i < on ? fullRows : emptyRows, origin: origin, pixel: pixel, to: &path)
        }
        return path
    }

    var body: some View {
        Canvas { ctx, _ in
            ctx.fill(makePath(), with: .color(color ?? palette.ink))
        }
        .frame(width: width, height: height)
        .accessibilityElement()
        .accessibilityLabel("\(filled) of \(total)")
    }
}

// MARK: - The pixel pet alone

/// The 16x16 sprite of the pet, ink only (for lock screen and complications).
struct PixelPetView: View {
    let pet: Pet
    let pixel: CGFloat
    var color: Color? = nil
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        let rows = Sprite.sprite(for: pet, blink: false)
        let cols = rows.map { $0.count }.max() ?? 16
        Canvas { ctx, _ in
            ctx.fill(PixelBitmap.path(rows: rows, pixel: pixel), with: .color(color ?? palette.ink))
        }
        .frame(width: CGFloat(cols) * pixel, height: CGFloat(rows.count) * pixel)
        .accessibilityLabel(pet.statusLine)
    }
}

// MARK: - Glyph tiles

/// A menu glyph on a little button tile. Plain tiles are outlined ink on the LCD ground;
/// inverted tiles (selected, pressed, or calling for attention) are solid ink with a ground glyph.
struct PixelTile: View {
    let icon: MenuIcon
    var title: String? = nil
    var inverted = false
    var glyphPixel: CGFloat = 2
    var labelPixel: CGFloat = 2
    var width: CGFloat? = nil
    let height: CGFloat
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        let fg = inverted ? palette.background : palette.ink
        let shape = RoundedRectangle(cornerRadius: 5, style: .continuous)
        VStack(spacing: max(2, labelPixel)) {
            PixelGlyphView(rows: icon.glyph, pixel: glyphPixel, color: fg)
            if let title {
                PixelText(title, pixel: labelPixel, color: fg)
            }
        }
        .frame(width: width, height: height)
        .background(shape.fill(inverted ? palette.ink : Color.clear))
        .overlay(shape.strokeBorder(palette.ink, lineWidth: 1.5))
        .contentShape(shape)
    }
}

/// Button style for tiles in apps: the tile inverts while pressed.
struct RetroTileStyle: ButtonStyle {
    let icon: MenuIcon
    var title: String? = nil
    var selected = false
    var glyphPixel: CGFloat = 3
    var labelPixel: CGFloat = 2
    var width: CGFloat? = nil
    let height: CGFloat

    func makeBody(configuration: Configuration) -> some View {
        PixelTile(icon: icon, title: title, inverted: selected || configuration.isPressed,
                  glyphPixel: glyphPixel, labelPixel: labelPixel, width: width, height: height)
    }
}
