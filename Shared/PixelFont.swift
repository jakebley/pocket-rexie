import SwiftUI

/// Draws string-row bitmaps ("X" is a dark pixel) as one merged path.
enum PixelBitmap {
    /// Adds the dark pixels of `rows` to `path`, `pixel` points per bitmap pixel.
    static func add(_ rows: [String], origin: CGPoint, pixel: CGFloat, to path: inout Path) {
        for (r, row) in rows.enumerated() {
            let chars = Array(row)
            var c = 0
            while c < chars.count {
                if chars[c] == "X" {
                    var end = c
                    while end < chars.count && chars[end] == "X" { end += 1 }
                    path.addRect(CGRect(x: origin.x + CGFloat(c) * pixel,
                                        y: origin.y + CGFloat(r) * pixel,
                                        width: CGFloat(end - c) * pixel,
                                        height: pixel))
                    c = end
                } else {
                    c += 1
                }
            }
        }
    }

    static func path(rows: [String], origin: CGPoint = .zero, pixel: CGFloat) -> Path {
        var path = Path()
        add(rows, origin: origin, pixel: pixel, to: &path)
        return path
    }
}

/// A 3x5 bitmap font for the LCD. Uppercase only, one pixel between glyphs.
enum PixelFont {
    static let glyphWidth = 3
    static let glyphHeight = 5
    /// Glyph width plus the one pixel gap.
    static let advance = 4

    /// Width of `text` in font pixels.
    static func width(of text: String) -> Int {
        let n = text.count
        return n == 0 ? 0 : n * advance - 1
    }

    /// The dark pixels of `text` (uppercased), with its top-left corner at `origin`.
    static func path(text: String, origin: CGPoint = .zero, pixel: CGFloat) -> Path {
        var path = Path()
        for (i, ch) in text.uppercased().enumerated() {
            let rows = glyphs[ch] ?? glyphs["?"] ?? []
            PixelBitmap.add(rows, origin: CGPoint(x: origin.x + CGFloat(i * advance) * pixel, y: origin.y),
                            pixel: pixel, to: &path)
        }
        return path
    }

    /// Greedy word wrap to at most `maxChars` per line. Uppercases the text.
    static func wrap(_ text: String, maxChars: Int) -> [String] {
        let limit = max(1, maxChars)
        var lines: [String] = []
        var current = ""
        for word in text.uppercased().split(separator: " ", omittingEmptySubsequences: true) {
            var w = String(word)
            while w.count > limit {
                if !current.isEmpty { lines.append(current); current = "" }
                lines.append(String(w.prefix(limit)))
                w = String(w.dropFirst(limit))
            }
            if current.isEmpty {
                current = w
            } else if current.count + 1 + w.count <= limit {
                current += " " + w
            } else {
                lines.append(current)
                current = w
            }
        }
        if !current.isEmpty { lines.append(current) }
        return lines
    }

    static let glyphs: [Character: [String]] = [
        "A": [".X.", "X.X", "XXX", "X.X", "X.X"],
        "B": ["XX.", "X.X", "XX.", "X.X", "XX."],
        "C": [".XX", "X..", "X..", "X..", ".XX"],
        "D": ["XX.", "X.X", "X.X", "X.X", "XX."],
        "E": ["XXX", "X..", "XX.", "X..", "XXX"],
        "F": ["XXX", "X..", "XX.", "X..", "X.."],
        "G": [".XX", "X..", "X.X", "X.X", ".XX"],
        "H": ["X.X", "X.X", "XXX", "X.X", "X.X"],
        "I": ["XXX", ".X.", ".X.", ".X.", "XXX"],
        "J": ["..X", "..X", "..X", "X.X", ".X."],
        "K": ["X.X", "X.X", "XX.", "X.X", "X.X"],
        "L": ["X..", "X..", "X..", "X..", "XXX"],
        "M": ["X.X", "XXX", "XXX", "X.X", "X.X"],
        "N": ["XXX", "X.X", "X.X", "X.X", "X.X"],
        "O": [".X.", "X.X", "X.X", "X.X", ".X."],
        "P": ["XX.", "X.X", "XX.", "X..", "X.."],
        "Q": ["XXX", "X.X", "X.X", "XXX", "..X"],
        "R": ["XX.", "X.X", "XX.", "X.X", "X.X"],
        "S": [".XX", "X..", ".X.", "..X", "XX."],
        "T": ["XXX", ".X.", ".X.", ".X.", ".X."],
        "U": ["X.X", "X.X", "X.X", "X.X", "XXX"],
        "V": ["X.X", "X.X", "X.X", "X.X", ".X."],
        "W": ["X.X", "X.X", "XXX", "XXX", "X.X"],
        "X": ["X.X", "X.X", ".X.", "X.X", "X.X"],
        "Y": ["X.X", "X.X", ".X.", ".X.", ".X."],
        "Z": ["XXX", "..X", ".X.", "X..", "XXX"],
        "0": ["XXX", "X.X", "X.X", "X.X", "XXX"],
        "1": [".X.", "XX.", ".X.", ".X.", "XXX"],
        "2": ["XX.", "..X", ".X.", "X..", "XXX"],
        "3": ["XX.", "..X", ".X.", "..X", "XX."],
        "4": ["X.X", "X.X", "XXX", "..X", "..X"],
        "5": ["XXX", "X..", "XX.", "..X", "XX."],
        "6": [".XX", "X..", "XXX", "X.X", "XXX"],
        "7": ["XXX", "..X", ".X.", ".X.", ".X."],
        "8": ["XXX", "X.X", "XXX", "X.X", "XXX"],
        "9": ["XXX", "X.X", "XXX", "..X", "XX."],
        " ": ["...", "...", "...", "...", "..."],
        ".": ["...", "...", "...", "...", ".X."],
        ",": ["...", "...", "...", ".X.", "X.."],
        "!": [".X.", ".X.", ".X.", "...", ".X."],
        "?": ["XX.", "..X", ".X.", "...", ".X."],
        ":": ["...", ".X.", "...", ".X.", "..."],
        "/": ["..X", "..X", ".X.", "X..", "X.."],
        "-": ["...", "...", "XXX", "...", "..."],
        "+": ["...", ".X.", "XXX", ".X.", "..."],
        "'": [".X.", ".X.", "...", "...", "..."],
        "%": ["X.X", "..X", ".X.", "X..", "X.X"],
        "#": ["X.X", "XXX", "X.X", "XXX", "X.X"],
    ]
}

/// Uppercase pixel text in LCD ink. `pixel` is the size of one font pixel in points.
struct PixelText: View {
    let text: String
    let pixel: CGFloat
    let color: Color

    init(_ text: String, pixel: CGFloat, color: Color = LCDStyle.ink) {
        self.text = text
        self.pixel = pixel
        self.color = color
    }

    var body: some View {
        let shown = text.uppercased()
        let width = CGFloat(PixelFont.width(of: shown)) * pixel
        Canvas { ctx, _ in
            ctx.fill(PixelFont.path(text: shown, pixel: pixel), with: .color(color))
        }
        .frame(width: width, height: CGFloat(PixelFont.glyphHeight) * pixel)
        .accessibilityElement()
        .accessibilityLabel(text)
    }
}

/// Word-wrapped pixel text, `maxChars` per line.
struct PixelParagraph: View {
    let text: String
    let pixel: CGFloat
    let maxChars: Int
    var color: Color = LCDStyle.ink
    var centered = false

    var body: some View {
        let lines = PixelFont.wrap(text, maxChars: maxChars)
        VStack(alignment: centered ? .center : .leading, spacing: pixel) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                PixelText(line, pixel: pixel, color: color)
            }
        }
        .frame(maxWidth: .infinity, alignment: centered ? .center : .leading)
        .accessibilityElement(children: .combine)
    }
}

/// A tappable row of pixel text. Selected (or pressed) rows are inverted: ink background,
/// LCD-colored text, like a menu cursor.
struct PixelButton: View {
    let title: String
    let pixel: CGFloat
    var selected = false
    var outlined = true
    let action: () -> Void

    init(_ title: String, pixel: CGFloat, selected: Bool = false, outlined: Bool = true,
         action: @escaping () -> Void) {
        self.title = title
        self.pixel = pixel
        self.selected = selected
        self.outlined = outlined
        self.action = action
    }

    var body: some View {
        Button(action: action) { EmptyView() }
            .buttonStyle(PixelButtonStyle(title: title, pixel: pixel, selected: selected, outlined: outlined))
            .accessibilityLabel(title)
    }
}

private struct PixelButtonStyle: ButtonStyle {
    let title: String
    let pixel: CGFloat
    let selected: Bool
    let outlined: Bool

    func makeBody(configuration: Configuration) -> some View {
        let inverted = selected || configuration.isPressed
        return PixelText(title, pixel: pixel, color: inverted ? LCDStyle.background : LCDStyle.ink)
            .padding(.horizontal, pixel)
            .padding(.vertical, pixel * 1.5)
            .frame(maxWidth: .infinity)
            .background(inverted ? LCDStyle.ink : Color.clear)
            .overlay {
                if outlined && !inverted {
                    Rectangle().strokeBorder(LCDStyle.ink, lineWidth: pixel)
                }
            }
            .contentShape(Rectangle())
    }
}
