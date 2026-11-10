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
        case .light:  // bulb outline
            return [
                "..XXXX..",
                ".X....X.",
                ".X....X.",
                ".X....X.",
                "..X..X..",
                "..XXXX..",
                "..X..X..",
                "...XX...",
            ]
        case .play:  // game controller
            return [
                "........",
                ".XXXXXX.",
                "XX.XXXXX",
                "X...XX.X",
                "XX.XX.XX",
                "XXXXXXXX",
                "XX....XX",
                "........",
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
                "...XX...",
                "...XX...",
                "...XX...",
                "...XX...",
                "..XXXX..",
                ".XXXXXX.",
                "XXXXXXXX",
                "X.X..X.X",
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

extension MenuIcon {
    /// Short printed name under the icon (pixel font, uppercase).
    var label: String { title.uppercased() }

    /// What the icon does; shown in the message line when the icon is held down. Same texts as the Expo build.
    var help: String {
        switch self {
        case .feed: return "FEED: meal or snack. Fills hunger."
        case .light: return "LIGHT: turn the lights off so it can sleep."
        case .play: return "PLAY: guess game. Makes it happy."
        case .train: return "TRAIN: exercise. Gets stronger, burns weight."
        case .medicine: return "MEDICINE: cures a sick pet."
        case .clean: return "CLEAN: wipe up the poop."
        case .climate: return "CLIMATE: fix hot or cold."
        case .scold: return "SCOLD: only when it is being naughty."
        case .battle: return "BATTLE: fight for wins."
        case .stats: return "STATS: hunger, mood and growth."
        }
    }
}

/// A bitmap drawn with square pixels, e.g. a menu glyph.
struct PixelGlyphView: View {
    let rows: [String]
    let pixel: CGFloat
    var color: Color?
    @Environment(\.lcdPalette) private var palette

    init(rows: [String], pixel: CGFloat, color: Color? = nil) {
        self.rows = rows
        self.pixel = pixel
        self.color = color
    }

    var body: some View {
        let columns = rows.map { $0.count }.max() ?? 0
        Canvas { ctx, _ in
            ctx.fill(PixelBitmap.path(rows: rows, pixel: pixel), with: .color(color ?? palette.ink))
        }
        .frame(width: CGFloat(columns) * pixel, height: CGFloat(rows.count) * pixel)
        .accessibilityHidden(true)
    }
}

extension PixelBitmap {
    /// A 7x5 checkmark for selected tiles.
    static let check: [String] = [
        ".....XX",
        "....XX.",
        "X..XX..",
        ".XXX...",
        "..X....",
    ]

    /// An 8x8 gear for the settings button.
    static let gear: [String] = [
        "...XX...",
        ".X.XX.X.",
        "..XXXX..",
        "XXX..XXX",
        "XXX..XXX",
        "..XXXX..",
        ".X.XX.X.",
        "...XX...",
    ]
}
