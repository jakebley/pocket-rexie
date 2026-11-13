import XCTest

/// The finer Technicolor interface chrome, stage 3 (docs/RESOLUTION.md "Interface chrome"): the 5x7 font and 16x16 icon data (hashes taken from the
/// Expo output via tools/gen_chrome96.ts), the density switch, the pixel box geometry and the text fitting; Traditional's numbers stay put.
final class Chrome96Tests: XCTestCase {
    private func fnvText(_ s: String) -> String {
        var h: UInt32 = 0x811c9dc5
        for u in s.utf16 { h ^= UInt32(u); h = h &* 0x01000193 }
        return String(h, radix: 16)
    }

    private func golden(_ table: String) -> [String: String] {
        var out: [String: String] = [:]
        for line in table.split(separator: "\n") {
            let p = line.split(separator: " ")
            if p.count == 2 { out[String(p[0])] = String(p[1]) }
        }
        return out
    }

    func testFontMatchesExpo() {
        let gold = golden(Chrome96Golden.font)
        XCTAssertEqual(Chrome96.font.count, gold.count)
        XCTAssertGreaterThanOrEqual(Chrome96.font.count, 60)
        for (ch, rows) in Chrome96.font {
            XCTAssertEqual(rows.count, 7, "glyph \(ch) rows")
            XCTAssertTrue(rows.allSatisfy { $0.count == 5 }, "glyph \(ch) columns")
            let code = String(ch.unicodeScalars.first!.value, radix: 16)
            XCTAssertEqual(fnvText(rows.joined(separator: "|")), gold[code], "glyph \(ch)")
        }
    }

    func testFontCoversTheOldFont() {
        for ch in PixelFont.glyphs.keys { XCTAssertNotNil(Chrome96.font[ch], "5x7 font lacks '\(ch)' used by 3x5") }
        XCTAssertNotNil(Chrome96.font["?"])
        // every character the chrome labels and texts use
        var corpus = "POCKET REXIE SETTINGS CLOSE LOOK PLAY NOTIFICATIONS SOUND BEEPS AND TUNES CLASSIC VACATION TESTING VERSION ABOUT BACK MORE 0123456789"
        for icon in MenuIcon.allCases { corpus += icon.label + icon.help.uppercased() }
        for f in Species.families { corpus += f.name.uppercased() }
        for sp in Species.all { corpus += sp.name.uppercased() }
        corpus += Pet(now: Date()).statusLine.uppercased()
        let missing = Set(corpus).filter { Chrome96.font[$0] == nil }
        XCTAssertTrue(missing.isEmpty, "missing in 5x7: \(missing.sorted())")
    }

    func testIconsMatchExpo() {
        let gold = golden(Chrome96Golden.icons)
        XCTAssertEqual(Chrome96.icons.count, gold.count)
        for (name, rows) in Chrome96.icons {
            XCTAssertEqual(rows.count, 16, "icon \(name) rows")
            XCTAssertTrue(rows.allSatisfy { $0.count == 16 }, "icon \(name) columns")
            XCTAssertEqual(fnvText(rows.joined(separator: "|")), gold[name], "icon \(name)")
        }
        for icon in MenuIcon.allCases { XCTAssertNotNil(Chrome96.icons[icon.title.lowercased()], "no 16x16 icon for \(icon.title)") }
        for name in ["gear", "lock", "tick", "close"] { XCTAssertNotNil(Chrome96.icons[name]) }
        XCTAssertEqual(Set(Chrome96.icons.values.map { $0.joined() }).count, Chrome96.icons.count, "icons are distinct")
    }

    func testDensitySwitch() {
        let t = ChromeDensity.of(.technicolor), r = ChromeDensity.of(.traditional)
        XCTAssertTrue(t.fine)
        XCTAssertFalse(r.fine)
        XCTAssertEqual(r.advance, PixelFont.advance)
        XCTAssertEqual(r.fontHeight, PixelFont.glyphHeight)
        XCTAssertEqual(r.textScale, 1)
        XCTAssertEqual(r.iconSize, 8)
        XCTAssertEqual(r.corner, 0)
        XCTAssertEqual(t.advance, 6)
        XCTAssertEqual(t.fontHeight, 7)
        XCTAssertEqual(t.iconSize, 16)
        XCTAssertEqual(t.width(of: "MEDICINE"), 47)
        XCTAssertEqual(t.width(of: ""), 0)
        XCTAssertEqual(r.width(of: "AB"), PixelFont.width(of: "AB"))
        // Traditional keeps its sizes as given
        XCTAssertEqual(r.fontPixel(3, scale: 3), 3)
        // snapping goes to whole device pixels
        XCTAssertEqual(ChromeDensity.snap(1.5, scale: 3), 5.0 / 3.0, accuracy: 1e-9)
        XCTAssertEqual(ChromeDensity.snap(1.5, scale: 3, down: true), 4.0 / 3.0, accuracy: 1e-9)
        XCTAssertGreaterThanOrEqual(ChromeDensity.snap(0, scale: 2), 1.15)
    }

    func testBoxGeometry() {
        for r in 0...5 {
            let wc = 20, hc = 14
            let c = ChromeBox.cells(wc, hc, r)
            func at(_ x: Int, _ y: Int) -> ChromeCell { c[y * wc + x] }
            for y in 0..<hc {
                for x in 0..<wc {
                    let a = at(x, y) == .out, b = at(wc - 1 - x, y) == .out, d = at(x, hc - 1 - y) == .out
                    XCTAssertTrue(a == b && a == d, "radius \(r) symmetric")
                }
            }
            XCTAssertEqual(at(10, 0), .border)
            XCTAssertEqual(at(0, 7), .border)
            XCTAssertEqual(at(10, 7), .face)
            XCTAssertEqual(at(10, 1), .hi)
            XCTAssertEqual(at(10, hc - 2), .sh)
            XCTAssertEqual(at(1, 7), .hi)
            XCTAssertEqual(at(wc - 2, 7), .sh)
            let steps = ChromeBox.cornerSteps[r]
            XCTAssertEqual(at(0, 0), steps.isEmpty ? .border : .out)
        }
        XCTAssertEqual(ChromeBox.cornerFor(6, 6, 5), 2)
        XCTAssertEqual(ChromeBox.cornerFor(40, 40, 9), 5)
        XCTAssertEqual(ChromeBox.cornerFor(3, 40, 4), 1)
        let tiny = ChromeBox.cells(3, 3, 5)
        XCTAssertEqual(tiny.count, 9)
        XCTAssertEqual(tiny[0], .out)
        XCTAssertNotEqual(tiny[4], .out)
    }

    func testBoxColorsAndPaths() {
        let ground = RGB(hex: "#EAE2CB"), ink = RGB(hex: "#34384A")
        let raised = ChromeBox.colors(.raised, ground: ground, ink: ink, dark: false)
        XCTAssertNotNil(raised.face)
        XCTAssertNotNil(raised.hi)
        XCTAssertNotNil(raised.sh)
        let paths = ChromeBox.paths(wc: 20, hc: 14, radius: 3, colors: raised, size: CGSize(width: 100, height: 70))
        XCTAssertEqual(paths.count, 4)
        XCTAssertEqual(ChromeBox.paths(wc: 20, hc: 14, radius: 3, colors: ChromeBox.colors(.tile, ground: ground, ink: ink, dark: false),
                                       size: CGSize(width: 100, height: 70)).count, 1)
        XCTAssertEqual(ChromeBox.colors(.down, ground: ground, ink: ink, dark: false).face, ink)
    }

    func testFitLines() {
        let t = ChromeDensity.technicolor
        let sentences = ["Rexie is doing fine", "A: next | B: eat | C: back", "Wonderbolt is being naughty", "HATCH A NEW EGG", "An egg is warming up",
                         "WHILE YOU WERE AWAY: Rexie napped, made 2 messes and got hungry"]
        for scale in [CGFloat(2), 3] {
            for avail in [CGFloat(150), 200, 250, 300, 351] {
                for s in sentences {
                    let r = t.fitLines(s, avail: avail, maxPs: 4.5, minPs: 3, scale: scale)
                    XCTAssertLessThanOrEqual(r.lines.count, 2)
                    let px = t.fontPixel(r.ps, scale: scale)
                    let widths: [CGFloat] = r.lines.map { CGFloat(t.width(of: $0)) * px }
                    let widest: CGFloat = widths.max() ?? 0
                    // a message that cannot fit even two lines at the floor size is cut by the caller; the rest must fit
                    let natural: CGFloat = CGFloat(s.count) * 6 * px
                    let limit: CGFloat = avail * 3
                    if natural < limit { XCTAssertLessThanOrEqual(widest, avail + 0.02, "\(s) at \(avail)") }
                }
            }
        }
        XCTAssertEqual(t.fitLines("one\ntwo", avail: 300, scale: 2).lines, ["one", "two"])
    }

    func testTouchTargetsKeepTheirSize() {
        // the finger does not get smaller with the pixels: icon rows keep their 48pt floor in both looks
        XCTAssertGreaterThanOrEqual(ChromeDensity.technicolor.iconFill, ChromeDensity.traditional.iconFill)
    }
}
