import Foundation

// Painting helpers for the mini-games: everything draws into the existing 64x64 SceneRaster (layer codes), exactly like the
// Expo painters (expo-prototype/src/ui/games/common.ts). Layers below `SceneLayer.sceneryFrom` print as ink in Traditional;
// scenery layers and the 'o' / 'w' glyph details are Technicolor-only.

/// What a painter gets for one frame.
struct PaintCtx {
    var game: MiniGame
    var params: GameParams
    var pet: Pet
    /// Wall-clock ms, for ambient animation only (never for game rules).
    var ms: Double
}

enum GameLayout {
    /// The generic screen paints the family biome backdrop and the HUD strip; the painter draws the pet and the items.
    case field
    /// The painter owns the whole screen (a text-style layout, like HI-LO).
    case text
}

/// One playable game: its definition, its layout and its painter. `MiniGames.all` lists them.
struct GameEntry {
    var def: GameDef
    var layout: GameLayout
    var paint: (inout SceneRaster, PaintCtx) -> Void
}

/// The tones of a theme as layer codes.
extension MiniTone {
    var layer: SceneLayer {
        switch self {
        case .red: return .heart
        case .rust: return .foodMeat
        case .orange: return .ball
        case .yellow: return .foodPasta
        case .gold: return .spark
        case .green: return .foodVeg
        case .pink: return .snack
        case .blue: return .waterDrop
        case .ice: return .snow
        case .cyan: return .wave
        case .brown: return .tool
        case .dbrown: return .poop
        case .purple: return .mat
        case .white: return .glint
        case .grey: return .peak
        case .ink: return .ink
        }
    }
}

enum GlyphMark { case none, danger, prize }

extension SceneRaster {
    // MARK: primitives

    mutating func fill(_ x0: Int, _ y0: Int, _ w: Int, _ h: Int, _ layer: SceneLayer = .ink) {
        if w <= 0 || h <= 0 { return }
        for y in y0..<(y0 + h) {
            for x in x0..<(x0 + w) { set(x, y, layer) }
        }
    }

    mutating func frame(_ x0: Int, _ y0: Int, _ w: Int, _ h: Int, _ layer: SceneLayer = .ink) {
        for x in x0..<(x0 + w) { set(x, y0, layer); set(x, y0 + h - 1, layer) }
        for y in y0..<(y0 + h) { set(x0, y, layer); set(x0 + w - 1, y, layer) }
    }

    /// Flip lit and unlit (lit pixels go dark, unlit pixels become ink).
    mutating func flip(_ x0: Int, _ y0: Int, _ w: Int, _ h: Int) {
        let side = SceneRaster.side
        for y in y0..<(y0 + h) where y >= 0 && y < side {
            for x in x0..<(x0 + w) where x >= 0 && x < side {
                let v = cells[y * side + x]
                cells[y * side + x] = (v != 0 && v < SceneLayer.eyeFill.rawValue) ? 0 : SceneLayer.ink.rawValue
            }
        }
    }

    // MARK: text

    static func textWidth(_ s: String, scale: Int = 1) -> Int { s.isEmpty ? 0 : (s.count * 4 - 1) * scale }

    mutating func text(_ s: String, _ x0: Int, _ y0: Int, scale: Int = 1, layer: SceneLayer = .ink) {
        var x = x0
        for ch in s.uppercased() {
            let g: [String] = MiniFont.glyph(ch)
            for (row, line) in g.enumerated() {
                for (col, c) in line.enumerated() where c == "X" {
                    fill(x + col * scale, y0 + row * scale, scale, scale, layer)
                }
            }
            x += 4 * scale
        }
    }

    mutating func centered(_ s: String, y: Int, scale: Int = 1, layer: SceneLayer = .ink) {
        text(s, (SceneRaster.side - SceneRaster.textWidth(s, scale: scale)) >> 1, y, scale: scale, layer: layer)
    }

    // MARK: glyphs and sprites

    /// Draw a 7x7 family glyph with its top-left at x,y. A 1px halo of unlit pixels keeps it readable over any backdrop.
    mutating func glyph(_ g: MiniGlyph, _ x: Double, _ y: Double, halo: Bool = true, mark: GlyphMark = .none, ms: Double = 0) {
        let px = MiniPaint.jsRound(x), py = MiniPaint.jsRound(y)
        let rows: [[Character]] = g.rows.map { Array($0) }
        let h = rows.count
        let w = rows.first?.count ?? 0
        if halo {
            for j in 0..<h {
                for i in 0..<w where rows[j][i] != "." {
                    for dy in -1...1 {
                        for dx in -1...1 { set(px + i + dx, py + j + dy, .off) }
                    }
                }
            }
        }
        let main = g.main.layer, acc = g.accent.layer
        for j in 0..<h {
            for i in 0..<w {
                switch rows[j][i] {
                case "#": set(px + i, py + j, main)
                case "a": set(px + i, py + j, acc)
                case "o": set(px + i, py + j, .cable)
                case "w": set(px + i, py + j, .daisy)
                default: break
                }
            }
        }
        if mark == .danger {
            // dotted aura two pixels out, on the pixels the halo left clear (a checker ring, so it reads in Traditional too)
            let phase = (Int((ms / 250).rounded(.down))) % 2
            for j in -2..<(h + 2) {
                for i in -2..<(w + 2) {
                    let edge = i == -2 || j == -2 || i == w + 1 || j == h + 1
                    if edge && (i + j + phase + 40) % 2 == 0 { set(px + i, py + j, .alert) }
                }
            }
        } else if mark == .prize {
            let k = Int((ms / 220).rounded(.down)) % 2
            let pts: [(Int, Int)] = k == 1 ? [(-2, 1), (w + 1, h - 2)] : [(w + 1, 1), (-2, h - 2)]
            for (i, j) in pts {
                set(px + i, py + j, .spark); set(px + i - 1, py + j, .spark); set(px + i + 1, py + j, .spark)
                set(px + i, py + j - 1, .spark); set(px + i, py + j + 1, .spark)
            }
        }
    }

    /// The same glyph at scale k (blocks), no halo.
    mutating func glyphScaled(_ g: MiniGlyph, _ x: Int, _ y: Int, k: Int) {
        let main = g.main.layer, acc = g.accent.layer
        for (j, row) in g.rows.enumerated() {
            for (i, c) in row.enumerated() {
                var layer = SceneLayer.off
                switch c {
                case "#": layer = main
                case "a": layer = acc
                case "o": layer = .cable
                case "w": layer = .daisy
                default: break
                }
                if layer != .off { fill(x + i * k, y + j * k, k, k, layer) }
            }
        }
    }

    /// The species sprite scaled to fit a box (never up), shaded like the home scene, feet at footY and centre at cx.
    /// Scenery behind the silhouette is cleared so the pet reads against any backdrop. Returns the drawn box.
    @discardableResult
    mutating func petFit(species: String, cx: Double, footY: Int, boxW: Int, boxH: Int,
                         blink: Bool = false, flip: Bool = false, dx: Int = 0, dy: Int = 0) -> (x: Int, y: Int, w: Int, h: Int)? {
        guard let sp = Species.named(species) else { return nil }
        let rows = MiniPaint.fitted(species: sp, boxW: boxW, boxH: boxH, blink: blink)
        let h = rows.count
        let w = rows.first?.utf8.count ?? 0
        let x = MiniPaint.jsRound(cx - Double(w) / 2) + dx
        let y = footY - h + 1 + dy
        let grid: [[UInt8]] = rows.map { Array($0.utf8) }
        let mark = UInt8(ascii: "X")
        func near(_ xx: Int, _ yy: Int) -> Bool {
            let sx = flip ? w - 1 - xx : xx
            return yy >= 0 && yy < h && sx >= 0 && sx < w && grid[yy][sx] == mark
        }
        for j in -1...h {
            for i in -1...w where near(i, j) || near(i - 1, j) || near(i + 1, j) || near(i, j - 1) || near(i, j + 1) {
                set(x + i, y + j, .off)
            }
        }
        drawPet(rows, x: x, y: y, mirror: flip, family: sp.family)
        return (x: x, y: y, w: w, h: h)
    }
}

/// The 3x5 font plus the few characters the game screens need that the app font lacks.
enum MiniFont {
    private static let extra: [Character: [String]] = [
        ">": ["X..", ".X.", "..X", ".X.", "X.."],
        "<": ["..X", ".X.", "X..", ".X.", "..X"],
        "(": [".XX", "X..", "X..", "X..", ".XX"],
        ")": ["XX.", "..X", "..X", "..X", "XX."],
        "|": [".X.", ".X.", ".X.", ".X.", ".X."],
    ]

    static func glyph(_ c: Character) -> [String] {
        if let g = PixelFont.glyphs[c] { return g }
        if let g = extra[c] { return g }
        return PixelFont.glyphs["?"] ?? []
    }
}

enum MiniPaint {
    /// JavaScript's Math.round: halves round up.
    static func jsRound(_ v: Double) -> Int { Int((v + 0.5).rounded(.down)) }

    private static let lock = NSLock()
    nonisolated(unsafe) private static var fitCache: [String: [String]] = [:]

    /// Crop a 32x32 sprite to its ink and box-filter it down to fit w x h (never up). Rows of "X" and ".".
    static func fitRows(_ src: [String], boxW: Int, boxH: Int) -> [String] {
        let grid: [[UInt8]] = src.map { Array($0.utf8) }
        let mark = UInt8(ascii: "X")
        var x0 = 99, x1 = -1, y0 = 99, y1 = -1
        for (y, r) in grid.enumerated() {
            for (x, c) in r.enumerated() where c == mark {
                x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
            }
        }
        if x1 < 0 { return ["X"] }
        let bw = x1 - x0 + 1, bh = y1 - y0 + 1
        let s = min(Double(boxW) / Double(bw), Double(boxH) / Double(bh), 1)
        let w = max(1, jsRound(Double(bw) * s)), h = max(1, jsRound(Double(bh) * s))
        var out: [String] = []
        for y in 0..<h {
            var line = ""
            for x in 0..<w {
                let sx0 = Double(x0) + Double(x * bw) / Double(w), sx1 = Double(x0) + Double((x + 1) * bw) / Double(w)
                let sy0 = Double(y0) + Double(y * bh) / Double(h), sy1 = Double(y0) + Double((y + 1) * bh) / Double(h)
                var lit = 0.0, tot = 0.0
                var yy = Int(sy0.rounded(.down))
                while yy < Int(sy1.rounded(.up)) {
                    var xx = Int(sx0.rounded(.down))
                    while xx < Int(sx1.rounded(.up)) {
                        let wgt = (min(Double(xx + 1), sx1) - max(Double(xx), sx0)) * (min(Double(yy + 1), sy1) - max(Double(yy), sy0))
                        if wgt > 0 {
                            tot += wgt
                            if yy >= 0 && yy < grid.count && xx >= 0 && xx < grid[yy].count && grid[yy][xx] == mark { lit += wgt }
                        }
                        xx += 1
                    }
                    yy += 1
                }
                line += (tot > 0 && lit / tot >= 0.42) ? "X" : "."
            }
            out.append(line)
        }
        return out
    }

    static func fitted(species sp: Species, boxW: Int, boxH: Int, blink: Bool) -> [String] {
        let key = "\(sp.id)|\(boxW)|\(boxH)|\(blink ? 1 : 0)"
        lock.lock()
        if let hit = fitCache[key] { lock.unlock(); return hit }
        lock.unlock()
        let frames = sp.hiFrames
        let src: [String] = frames.isEmpty ? ["X"] : frames[blink && frames.count > 1 ? 1 : 0]
        let rows = fitRows(src, boxW: boxW, boxH: boxH)
        lock.lock()
        if fitCache.count > 600 { fitCache.removeAll() }
        fitCache[key] = rows
        lock.unlock()
        return rows
    }

    // MARK: backdrop

    /// The Expo rows are used as they are (ground band at row 60, the pet's feet on row 59).
    private static let identityRows: [Int] = Array(0..<64)
    static let fieldGround = 59

    /// The family's biome behind a field game (always a clear noon, so items stay readable) with a ground band at the bottom.
    static func field(pet: Pet, ms: Double) -> SceneRaster {
        var r = SceneRaster()
        r.hasSky = true
        r.hour = 12
        r.weather = .clear
        r.line = SceneRenderer.lineOf(pet)
        r.bodyHex = SceneRenderer.bodyHexOf(pet)
        r.groundRow = fieldGround + 1
        let biome = Biome.of(pet)
        r.biome = biome
        let live = BiomeLive(tick: Int((ms / 125).rounded(.down)), seconds: ms / 1000, seed: Int(pet.seed % 4096), rain: false)
        BiomeDraw.backdrop(into: &r, biome: biome, period: .day, live: live, rows: identityRows)
        r.fill(0, fieldGround + 1, SceneRaster.side, 2, .ground)
        for x in stride(from: 0, to: SceneRaster.side, by: 2) { r.set(x, fieldGround + 3, .dirt) }
        for x in stride(from: 1, to: SceneRaster.side, by: 4) { r.set(x, fieldGround + 4, .dirt) }
        BiomeDraw.fore(into: &r, biome: biome, period: .day, rain: false, rows: identityRows)
        return r
    }

    /// The strip along the top: two short texts and a bar.
    static func hud(_ r: inout SceneRaster, left: String, right: String, fill: Double) {
        r.fill(0, 0, SceneRaster.side, 8, .off)
        r.text(left, 1, 1)
        r.text(right, SceneRaster.side - SceneRaster.textWidth(right) - 1, 1)
        let w = max(0, min(SceneRaster.side, jsRound(Double(SceneRaster.side) * fill)))
        r.fill(0, 7, w, 1, .ink)
    }

    /// 5x5 star for the favourite game.
    static let star5: [String] = ["..X..", ".XXX.", "XXXXX", ".XXX.", "X.X.X"]

    /// One frame of a running (or just finished) game: the generic field screen or the game's own text screen.
    static func frame(session: MiniSession, pet: Pet, ms: Double) -> SceneRaster {
        guard let game = session.game, let entry = MiniGames.entry(session.def.id) else { return SceneRaster() }
        let ctx = PaintCtx(game: game, params: session.params, pet: pet, ms: ms)
        switch entry.layout {
        case .field:
            var r = field(pet: pet, ms: ms)
            entry.paint(&r, ctx)
            let h = game.hud
            hud(&r, left: h.left, right: h.right, fill: game.progress)
            if session.phase == .over {
                let label = game.overLabel
                let w = SceneRaster.textWidth(label, scale: 2)
                let x = (SceneRaster.side - w) >> 1
                r.fill(x - 3, 22, w + 6, 15, .off)
                r.frame(x - 3, 22, w + 6, 15)
                r.text(label, x, 26, scale: 2)
            }
            return r
        case .text:
            var r = SceneRaster()
            entry.paint(&r, ctx)
            return r
        }
    }
}
