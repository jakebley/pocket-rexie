import SwiftUI

// Interface chrome at finer pixels (docs/RESOLUTION.md "Interface chrome", Expo: src/ui/density.ts, chrome96.ts).
// Technicolor draws the pixel interface outside the LCD with a 5x7 font, 16x16 icons and boxes built from small cells with stepped
// corners and a 1-cell bevel. Traditional keeps the 3x5 font, 8x8 icons and plain strokes exactly. The look comes from the palette
// (`palette.mode`), so every call site asks `ChromeDensity.of(mode)` and nothing else.

/// Pixel metrics of the interface for a look. Mirrors `density(look)` in the Expo build.
struct ChromeDensity: Sendable {
    let fine: Bool
    /// Font pixels per glyph column / row and the pen advance (glyph width plus one blank column).
    let fontHeight: Int
    let advance: Int
    /// Real size of one font pixel is the caller's size times this (1 for Traditional).
    let textScale: CGFloat
    /// Points per chrome cell before snapping to device pixels, and corner radii in cells.
    let cell: CGFloat
    let corner: Int
    let cornerBig: Int
    /// Size multiplier of the big A / B / C labels, in callers' units.
    let bigLabelPs: CGFloat
    let iconSize: Int
    let iconFill: CGFloat

    static let traditional = ChromeDensity(fine: false, fontHeight: 5, advance: 4, textScale: 1, cell: 2, corner: 0, cornerBig: 0,
                                           bigLabelPs: 5, iconSize: 8, iconFill: 0.74)
    static let technicolor = ChromeDensity(fine: true, fontHeight: 7, advance: 6, textScale: 0.62, cell: 1.5, corner: 3, cornerBig: 5,
                                           bigLabelPs: 6, iconSize: 16, iconFill: 0.9)

    static func of(_ mode: ColorMode) -> ChromeDensity { mode == .technicolor ? technicolor : traditional }

    /// Width of a string in font pixels.
    func width(of text: String) -> Int { text.isEmpty ? 0 : text.count * advance - 1 }

    /// Snap a size to whole device pixels (`down` floors so text is guaranteed to fit).
    static func snap(_ v: CGFloat, scale: CGFloat, down: Bool = false, minPt: CGFloat = 1.15) -> CGFloat {
        let r = max(1, scale)
        let minDev = (minPt * r).rounded(.up)
        let dev = down ? (v * r + 1e-6).rounded(.down) : (v * r - 0.35).rounded(.up)
        return max(minDev, dev) / r
    }

    /// Real points per font pixel for a caller size `ps`.
    func fontPixel(_ ps: CGFloat, scale: CGFloat) -> CGFloat {
        fine ? Self.snap(ps * textScale, scale: scale) : ps
    }

    /// Points per chrome cell, snapped to whole device pixels.
    func cellPixel(scale: CGFloat) -> CGFloat { Self.snap(cell, scale: scale) }

    /// Wrap a message into at most two lines that fit `avail` points and pick the size (callers' units). Port of `fitLinesD`, fine look only.
    func fitLines(_ text: String, avail: CGFloat, maxPs: CGFloat = 3, minPs: CGFloat = 2, scale: CGFloat) -> (lines: [String], ps: CGFloat) {
        let sc = textScale
        func wpx(_ s: String) -> CGFloat { CGFloat(width(of: s)) }
        func size(_ maxP: CGFloat, _ widest: CGFloat) -> CGFloat {
            Self.snap(min(maxP * sc, avail / max(1, widest)), scale: scale, down: true) / sc
        }
        if text.contains("\n") {
            let lines = Array(text.split(separator: "\n", omittingEmptySubsequences: false).prefix(2).map(String.init))
            return (lines, size(maxPs, lines.map(wpx).max() ?? 1))
        }
        let one = size(maxPs, wpx(text))
        let fits = wpx(text) * one * sc <= avail + 0.01
        if (one >= minPs - 1e-9 && fits) || text.count < 2 { return ([text], one) }
        let minPx = Self.snap(0, scale: scale, down: true)
        let per = max(1, Int(((avail / max(minPs * sc, minPx) + 1) / CGFloat(advance)).rounded(.down)))
        var lines: [String] = []
        var cur = ""
        for w in text.split(separator: " ") {
            if !cur.isEmpty && (cur + " " + w).count > per { lines.append(cur); cur = String(w) } else { cur = cur.isEmpty ? String(w) : cur + " " + w }
        }
        if !cur.isEmpty { lines.append(cur) }
        let kept = Array(lines.prefix(2))
        return (kept, size(minPs, kept.map(wpx).max() ?? 1))
    }
}

/// The 5x7 font and the 16x16 icons, parsed once from the generated strings (Chrome96Data).
enum Chrome96 {
    static let fontWidth = 5
    static let fontHeight = 7
    static let advance = 6

    static let font: [Character: [String]] = {
        var out: [Character: [String]] = [:]
        for line in Chrome96Data.font5x7.split(separator: "\n") {
            let parts = line.split(separator: " ", maxSplits: 1, omittingEmptySubsequences: false)
            guard parts.count == 2, let code = UInt8(parts[0], radix: 16) else { continue }
            out[Character(UnicodeScalar(code))] = parts[1].split(separator: "|").map(String.init)
        }
        return out
    }()

    static let icons: [String: [String]] = {
        var out: [String: [String]] = [:]
        for line in Chrome96Data.icons16.split(separator: "\n") {
            let parts = line.split(separator: " ", maxSplits: 1)
            guard parts.count == 2 else { continue }
            out[String(parts[0])] = parts[1].split(separator: "|").map(String.init)
        }
        return out
    }()

    static func glyph(_ ch: Character) -> [String] { font[ch] ?? font["?"] ?? [] }

    /// The dark pixels of `text` (uppercased) with its top-left at `origin`, `pixel` points per font pixel.
    static func path(text: String, origin: CGPoint = .zero, pixel: CGFloat) -> Path {
        var path = Path()
        for (i, ch) in text.uppercased().enumerated() {
            PixelBitmap.add(glyph(ch), origin: CGPoint(x: origin.x + CGFloat(i * advance) * pixel, y: origin.y), pixel: pixel, to: &path)
        }
        return path
    }
}

// MARK: - Box geometry (chrome96.ts)

enum ChromeCell: UInt8 { case out, border, face, hi, sh }

enum ChromeBoxStyle { case raised, down, inset, tile, tileOn, flat }

enum ChromeBox {
    /// Cells cut from the left (and right) end of the first rows of a box, per corner radius.
    static let cornerSteps: [[Int]] = [[], [1], [2, 1], [3, 1, 1], [4, 2, 1, 1], [5, 3, 2, 1, 1]]
    static let maxCorner = 5

    static func cornerFor(_ wc: Int, _ hc: Int, _ r: Int) -> Int { max(0, min(r, maxCorner, (min(wc, hc) - 1) / 2)) }

    /// Classify the cells of a wc x hc box with corner radius r (clamped). Row-major.
    static func cells(_ wcIn: Int, _ hcIn: Int, _ r: Int) -> [ChromeCell] {
        let wc = max(1, wcIn), hc = max(1, hcIn)
        let steps = cornerSteps[cornerFor(wc, hc, r)]
        func inset(_ y: Int) -> Int { y < steps.count ? steps[y] : (y >= hc - steps.count ? steps[hc - 1 - y] : 0) }
        func inside(_ x: Int, _ y: Int) -> Bool { x >= 0 && y >= 0 && x < wc && y < hc && x >= inset(y) && x < wc - inset(y) }
        func isBorder(_ x: Int, _ y: Int) -> Bool {
            inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))
        }
        var out = [ChromeCell](repeating: .out, count: wc * hc)
        for y in 0..<hc {
            for x in 0..<wc where inside(x, y) {
                if isBorder(x, y) { out[y * wc + x] = .border; continue }
                let up = isBorder(x, y - 1), left = isBorder(x - 1, y), down = isBorder(x, y + 1), right = isBorder(x + 1, y)
                var c = ChromeCell.face
                if up && right { c = .hi } else if down && left { c = .sh } else if up || left { c = .hi } else if down || right { c = .sh }
                out[y * wc + x] = c
            }
        }
        return out
    }

    struct Colors {
        let border: RGB
        let face: RGB?
        let hi: RGB?
        let sh: RGB?
    }

    /// Colours of a box style for a theme (ground / ink are the toy's two screen colours). Depth is a 1-cell bevel, never a gradient.
    static func colors(_ style: ChromeBoxStyle, ground: RGB, ink: RGB, dark: Bool) -> Colors {
        let night = RGB(hex: "#05060C")
        func lighter(_ c: RGB) -> RGB { dark ? c.mixed(with: ink, 0.2) : c.mixed(with: RGB(hex: "#FFFFFF"), 0.5) }
        func darker(_ c: RGB) -> RGB { dark ? c.mixed(with: night, 0.45) : c.mixed(with: ink, 0.2) }
        switch style {
        case .raised:
            let face = ground.mixed(with: ink, dark ? 0.1 : 0.07)
            return Colors(border: ink, face: face, hi: lighter(face), sh: darker(face))
        case .inset:
            let face = ground.mixed(with: ink, dark ? 0.04 : 0.1)
            return Colors(border: ink, face: face, hi: darker(face), sh: lighter(face))
        case .down:
            return Colors(border: ink, face: ink, hi: ink.mixed(with: night, dark ? 0.0 : 0.3), sh: ink.mixed(with: ground, 0.22))
        case .tileOn: return Colors(border: ink, face: ink, hi: nil, sh: nil)
        case .tile: return Colors(border: ground.mixed(with: ink, 0.32), face: nil, hi: nil, sh: nil)
        case .flat: return Colors(border: ink, face: nil, hi: nil, sh: nil)
        }
    }

    /// One path per colour for a box, horizontal runs of cells scaled to `size`.
    static func paths(wc: Int, hc: Int, radius: Int, colors: Colors, size: CGSize) -> [(RGB, Path)] {
        let cells = cells(wc, hc, radius)
        let w = max(1, wc), h = max(1, hc)
        let sx = size.width / CGFloat(w), sy = size.height / CGFloat(h)
        func color(_ c: ChromeCell) -> RGB? {
            switch c {
            case .out: return nil
            case .border: return colors.border
            case .face: return colors.face
            case .hi: return colors.hi ?? colors.face
            case .sh: return colors.sh ?? colors.face
            }
        }
        var order: [RGB] = []
        var by: [RGB: Path] = [:]
        for y in 0..<h {
            var x = 0
            while x < w {
                guard let col = color(cells[y * w + x]) else { x += 1; continue }
                var n = 1
                while x + n < w, color(cells[y * w + x + n]) == col { n += 1 }
                if by[col] == nil { order.append(col); by[col] = Path() }
                by[col]!.addRect(CGRect(x: CGFloat(x) * sx, y: CGFloat(y) * sy, width: CGFloat(n) * sx, height: sy))
                x += n
            }
        }
        return order.map { ($0, by[$0]!) }
    }
}

/// The pixel-drawn box behind a view: stepped corners, 1-cell border, and a 1-cell highlight and shadow for raised / inset / down.
struct ChromeBoxView: View {
    let style: ChromeBoxStyle
    var radius: Int = ChromeDensity.technicolor.corner
    @Environment(\.lcdPalette) private var palette
    @Environment(\.displayScale) private var displayScale

    var body: some View {
        let screen = ScenePalette.screen(mode: .technicolor, appearance: palette.appearance)
        let colors = ChromeBox.colors(style, ground: screen.ground, ink: screen.ink, dark: palette.backlit)
        let cell = ChromeDensity.technicolor.cellPixel(scale: displayScale)
        Canvas { ctx, size in
            guard size.width > 0, size.height > 0 else { return }
            let wc = max(1, Int((size.width / cell).rounded())), hc = max(1, Int((size.height / cell).rounded()))
            for (rgb, path) in ChromeBox.paths(wc: wc, hc: hc, radius: radius, colors: colors, size: size) {
                ctx.fill(path, with: .color(rgb.color))
            }
        }
        .allowsHitTesting(false)
    }
}

extension View {
    /// A pixel box behind the view in Technicolor; `flat` is drawn instead in Traditional (the caller's existing look).
    @ViewBuilder
    func chromeBox(_ style: ChromeBoxStyle, radius: Int = ChromeDensity.technicolor.corner) -> some View {
        self.background(ChromeBoxView(style: style, radius: radius))
    }
}

// MARK: - Text, icons

/// Text in the interface font: 5x7 in Technicolor at `ps` (3x5-font points, scaled by the look and snapped to device pixels), the usual 3x5 PixelText otherwise.
/// `exact` skips the snap (the caller already did it).
struct ChromeText: View {
    let text: String
    let ps: CGFloat
    var color: Color?
    var exact = false
    @Environment(\.lcdPalette) private var palette
    @Environment(\.displayScale) private var displayScale

    init(_ text: String, ps: CGFloat, color: Color? = nil, exact: Bool = false) {
        self.text = text
        self.ps = ps
        self.color = color
        self.exact = exact
    }

    var body: some View {
        let d = ChromeDensity.of(palette.mode)
        if d.fine {
            let px = exact ? ps * d.textScale : d.fontPixel(ps, scale: displayScale)
            let shown = text.uppercased()
            let ink = color ?? palette.ink
            Canvas { ctx, _ in
                ctx.fill(Chrome96.path(text: shown, pixel: px), with: .color(ink))
            }
            .frame(width: CGFloat(max(1, d.width(of: shown))) * px, height: CGFloat(Chrome96.fontHeight) * px)
            .accessibilityElement()
            .accessibilityLabel(text)
        } else {
            PixelText(text, pixel: ps, color: color)
        }
    }
}

/// Word-wrapped chrome text at a size, `avail` points wide.
struct ChromeParagraph: View {
    let text: String
    let ps: CGFloat
    let avail: CGFloat
    var color: Color?
    var centered = false
    @Environment(\.lcdPalette) private var palette
    @Environment(\.displayScale) private var displayScale

    var body: some View {
        let d = ChromeDensity.of(palette.mode)
        let px = d.fontPixel(ps, scale: displayScale)
        let per = max(1, Int(((avail / px + 1) / CGFloat(d.advance)).rounded(.down)))
        let lines = PixelFont.wrap(text, maxChars: per)
        VStack(alignment: centered ? .center : .leading, spacing: px * 2) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                ChromeText(line, ps: ps, color: color)
            }
        }
        .frame(width: avail, alignment: centered ? .center : .leading)
        .accessibilityElement(children: .combine)
    }
}

/// One of the 16x16 chrome icons ("feed", "gear", "lock", "tick", "close" ...), `pixel` points per icon pixel.
struct ChromeIcon: View {
    let name: String
    let pixel: CGFloat
    var color: Color?
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        let rows = Chrome96.icons[name] ?? []
        Canvas { ctx, _ in
            ctx.fill(PixelBitmap.path(rows: rows, pixel: pixel), with: .color(color ?? palette.ink))
        }
        .frame(width: 16 * pixel, height: 16 * pixel)
        .accessibilityHidden(true)
    }
}

/// A pixel-box button for sheets and dialogs: raised, inverted (`down`) while pressed or `on`.
struct ChromeButton: View {
    let title: String
    var ps: CGFloat = 3.5
    var on = false
    var big = false
    var minHeight: CGFloat = 48
    var fill = false
    var hpad: CGFloat = 14
    var identifier: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) { EmptyView() }
            .buttonStyle(ChromeButtonStyle(title: title, ps: ps, on: on, big: big, minHeight: minHeight, fill: fill, hpad: hpad))
            .accessibilityLabel(title)
            .accessibilityIdentifier(identifier ?? "px-" + title.lowercased())
    }
}

private struct ChromeButtonStyle: ButtonStyle {
    let title: String
    let ps: CGFloat
    let on: Bool
    let big: Bool
    let minHeight: CGFloat
    let fill: Bool
    let hpad: CGFloat

    func makeBody(configuration: Configuration) -> some View {
        ChromeButtonBody(title: title, ps: ps, inverted: on || configuration.isPressed, big: big, minHeight: minHeight, fill: fill, hpad: hpad)
    }
}

private struct ChromeButtonBody: View {
    let title: String
    let ps: CGFloat
    let inverted: Bool
    let big: Bool
    let minHeight: CGFloat
    let fill: Bool
    let hpad: CGFloat
    @Environment(\.lcdPalette) private var palette

    var body: some View {
        let d = ChromeDensity.technicolor
        ChromeText(title, ps: ps, color: inverted ? palette.background : palette.ink)
            .padding(.horizontal, hpad)
            .padding(.vertical, 8)
            .frame(maxWidth: fill ? .infinity : nil, minHeight: minHeight)
            .chromeBox(inverted ? .down : .raised, radius: big ? d.cornerBig : d.corner)
            .contentShape(Rectangle())
    }
}
