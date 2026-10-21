import SwiftUI

/// Hand-drawn 8x8 icons for the menu, like the printed icons on a 1996 toy. "X" is a dark pixel.
extension MenuIcon {
    var glyph: [String] {
        switch self {
        case .feed:  // drumstick
            return [
                "..XXXX..",
                ".XXXXXX.",
                ".XXXXXX.",
                ".XXXXXX.",
                "..XXXX..",
                "...XX...",
                "..XXXX..",
                "..X..X..",
            ]
        case .light:  // bulb
            return [
                "..XXXX..",
                ".XXXXXX.",
                ".XXXXXX.",
                ".XXXXXX.",
                "..XXXX..",
                "...XX...",
                "..XXXX..",
                "...XX...",
            ]
        case .play:  // ball
            return [
                "..XXXX..",
                ".X.XX.X.",
                "X..XX..X",
                "XXXXXXXX",
                "XXXXXXXX",
                "X..XX..X",
                ".X.XX.X.",
                "..XXXX..",
            ]
        case .train:  // dumbbell
            return [
                "........",
                ".X....X.",
                "XXX..XXX",
                "XXXXXXXX",
                "XXXXXXXX",
                "XXX..XXX",
                ".X....X.",
                "........",
            ]
        case .medicine:  // cross
            return [
                "..XXXX..",
                "..XXXX..",
                "XXXXXXXX",
                "XXXXXXXX",
                "XXXXXXXX",
                "XXXXXXXX",
                "..XXXX..",
                "..XXXX..",
            ]
        case .clean:  // broom
            return [
                ".....XX.",
                "....XX..",
                "...XX...",
                "..XXX...",
                ".XXXXX..",
                "XXXXXXX.",
                "XXXXXXX.",
                "X.X.X.X.",
            ]
        case .climate:  // thermometer
            return [
                "...XX...",
                "...XXXX.",
                "...XX...",
                "...XXXX.",
                "...XX...",
                "..XXXX..",
                "..XXXX..",
                "...XX...",
            ]
        case .scold:  // exclamation mark
            return [
                "..XXXX..",
                "..XXXX..",
                "..XXXX..",
                "..XXXX..",
                "...XX...",
                "........",
                "..XXXX..",
                "..XXXX..",
            ]
        case .battle:  // VS
            return [
                "........",
                "........",
                "X.X...XX",
                "X.X..X..",
                "X.X...X.",
                "X.X....X",
                ".X...XX.",
                "........",
            ]
        case .stats:  // bars
            return [
                "........",
                "......XX",
                "......XX",
                "...XX.XX",
                "...XX.XX",
                "XX.XX.XX",
                "XX.XX.XX",
                "XXXXXXXX",
            ]
        }
    }
}

/// A bitmap drawn with square pixels, e.g. a menu glyph.
struct PixelGlyphView: View {
    let rows: [String]
    let pixel: CGFloat
    var color: Color = LCDStyle.ink

    init(rows: [String], pixel: CGFloat, color: Color = LCDStyle.ink) {
        self.rows = rows
        self.pixel = pixel
        self.color = color
    }

    var body: some View {
        let columns = rows.map { $0.count }.max() ?? 0
        Canvas { ctx, _ in
            ctx.fill(PixelBitmap.path(rows: rows, pixel: pixel), with: .color(color))
        }
        .frame(width: CGFloat(columns) * pixel, height: CGFloat(rows.count) * pixel)
        .accessibilityHidden(true)
    }
}
