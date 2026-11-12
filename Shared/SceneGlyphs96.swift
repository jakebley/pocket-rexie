import Foundation

// Finer art for the Technicolor 96x96 LCD: 10x10 HUD glyphs, 13x13 props and effects. Port of
// expo-prototype/src/ui/art96.ts (same shapes: the Expo file is the reference). Rows of "X" and ".".

/// Build a bitmap from a predicate on integer cell coordinates.
fileprivate func pred(_ w: Int, _ h: Int, _ f: (Int, Int) -> Bool) -> [String] {
    var out: [String] = []
    for y in 0..<h {
        var r = ""
        for x in 0..<w { r += f(x, y) ? "X" : "." }
        out.append(r)
    }
    return out
}
fileprivate func dist(_ x: Int, _ y: Int, _ cx: Double, _ cy: Double) -> Double { hypot(Double(x) - cx, Double(y) - cy) }
fileprivate func segDist(_ x: Int, _ y: Int, _ ax: Double, _ ay: Double, _ bx: Double, _ by: Double) -> Double {
    let dx = bx - ax, dy = by - ay
    let t = max(0, min(1, ((Double(x) - ax) * dx + (Double(y) - ay) * dy) / (dx * dx + dy * dy)))
    return hypot(Double(x) - (ax + t * dx), Double(y) - (ay + t * dy))
}
fileprivate func disc13(_ r: Double, _ f: (Int, Int) -> Bool = { _, _ in true }) -> [String] {
    pred(13, 13) { x, y in dist(x, y, 6, 6) <= r && f(x, y) }
}

enum SceneGlyph96 {
    // MARK: 10x10 HUD / bubble glyphs
    static let heartFull = [".XXX..XXX.", "XXXXXXXXXX", "XXXXXXXXXX", "XXXXXXXXXX", "XXXXXXXXXX", ".XXXXXXXX.", "..XXXXXX..", "...XXXX...", "....XX....", ".........."]
    static let heartEmpty = [".XXX..XXX.", "X...XX...X", "X........X", "X........X", "X........X", ".X......X.", "..X....X..", "...X..X...", "....XX....", ".........."]
    static let smileFull = ["...XXXX...", "..XXXXXX..", ".XXXXXXXX.", "XXX.XX.XXX", "XXX.XX.XXX", "XXXXXXXXXX", "XX.XXXX.XX", ".XX....XX.", "..XXXXXX..", "...XXXX..."]
    static let smileEmpty = ["...XXXX...", "..X....X..", ".X......X.", "X..X..X..X", "X..X..X..X", "X........X", "X.X....X.X", ".X.XXXX.X.", "..X....X..", "...XXXX..."]
    static let poop = ["..........", "....XX....", "...XXXX...", "..XXXXXX..", "...XXXX...", ".XXXXXXXX.", "XXXXXXXXXX", "XX.XXXX.XX", "XXXXXXXXXX", ".XXXXXXXX."]
    static let alert = ["...XXXX...", "...XXXX...", "...XXXX...", "...XXXX...", "...XXXX...", "....XX....", "..........", "...XXXX...", "...XXXX...", ".........."]
    static let skull = ["..XXXXXX..", ".XXXXXXXX.", "XXXXXXXXXX", "XX..XX..XX", "XX..XX..XX", "XXXX..XXXX", ".XXXXXXXX.", "..XXXXXX..", "..X.XX.X..", ".........."]
    static let zzz = ["XXXXXXXXXX", "XXXXXXXXXX", "......XXX.", ".....XXX..", "....XXX...", "...XXX....", "..XXX.....", ".XXX......", "XXXXXXXXXX", "XXXXXXXXXX"]
    static let drop = ["....XX....", "....XX....", "...XXXX...", "..XXXXXX..", ".XXXXXXXX.", "XXXXXXXXXX", "XXXXXXXXXX", "XXXXXXXXXX", ".XXXXXXXX.", "..XXXXXX.."]
    static let flake = ["X...XX...X", ".X..XX..X.", "..X.XX.X..", "...XXXX...", "XXXXXXXXXX", "XXXXXXXXXX", "...XXXX...", "..X.XX.X..", ".X..XX..X.", "X...XX...X"]
    static let meat = ["...XXXXX..", "..XXXXXXX.", ".XXXXXXXXX", ".XXXXXXXXX", ".XXXXXXXX.", "..XXXXXX..", "..XXXX....", ".XXX......", "XX.XX.....", ".XXX......"]
    static let ball = ["..XXXXXX..", ".XX.XX.XX.", "XX..XX..XX", "X..XXXX..X", "XXXXXXXXXX", "XXXXXXXXXX", "X..XXXX..X", "XX..XX..XX", ".XX.XX.XX.", "..XXXXXX.."]
    static let syringe = ["........XX", ".......XXX", "......XXX.", ".....XXX..", "....XXX...", "..XXXX....", ".XXXX.....", "XXXX......", "XXX.......", "XX........"]
    static let bulb = ["...XXXX...", "..XXXXXX..", ".XXXXXXXX.", ".XXXXXXXX.", ".XXXXXXXX.", "..XXXXXX..", "...XXXX...", "...XXXX...", "...XXXX...", "....XX...."]

    // MARK: 13x13 props (9x9 in logic units) and effects
    // Written statement by statement (long boolean chains of mixed Int / Double literals can stall the type checker).
    static let foodMeat: [String] = pred(13, 13) { (x: Int, y: Int) -> Bool in
        if dist(x, y, 7.5, 4.8) <= 5.3 { return true }
        if segDist(x, y, 5.0, 7.5, 1.8, 10.7) <= 1.6 { return true }
        if dist(x, y, 0.8, 10.4) <= 1.3 { return true }
        return dist(x, y, 2.2, 12.0) <= 1.3
    }
    static let foodVeggie: [String] = pred(13, 13) { (x: Int, y: Int) -> Bool in
        if dist(x, y, 6.0, 7.6) <= 4.9 { return true }
        if segDist(x, y, 6.0, 3.4, 3.0, 0.6) <= 1.1 { return true }
        if segDist(x, y, 6.0, 3.4, 9.0, 0.6) <= 1.1 { return true }
        if segDist(x, y, 6.0, 3.4, 6.0, 0.2) <= 0.6 { return true }
        return x >= 5 && x <= 7 && y >= 11
    }
    static let foodPasta: [String] = pred(13, 13) { (x: Int, y: Int) -> Bool in
        if y >= 6 && dist(x, y, 6.0, 6.0) <= 6.2 { return true }
        if y >= 3 && y <= 6 && x >= 1 && x <= 11 && (x + y) % 3 != 0 { return true }
        let parity: Int = x > 6 ? 1 : 0
        return y <= 2 && x % 4 == 1 && y % 2 == parity
    }
    fileprivate static let snackHoles: [(Double, Double)] = [(4, 4), (8, 3), (6, 7), (3, 8), (9, 8), (8, 5)]
    static let foodSnack: [String] = pred(13, 13) { (x: Int, y: Int) -> Bool in
        if dist(x, y, 6.0, 6.0) > 6.2 { return false }
        for h in SceneGlyph96.snackHoles where dist(x, y, h.0, h.1) <= 0.9 { return false }
        return true
    }
    static let broom: [String] = pred(13, 13) { (x: Int, y: Int) -> Bool in
        if segDist(x, y, 12.0, 0.5, 7.0, 7.0) <= 0.9 { return true }
        if y < 7 || y > 12 { return false }
        if y == 12 && x % 2 == 0 { return false }
        let half: Double = (Double(y) - 6.2) * 1.1 + 0.4
        return abs(Double(x) - 5.0) <= half
    }
    static let ballProp: [String] = disc13(6.3) { (x: Int, y: Int) -> Bool in
        let dx: Double = abs(Double(x) - 6.0), dy: Double = abs(Double(y) - 6.0)
        if dx < 0.8 && (y < 3 || y > 9) { return false }
        if dy < 0.8 && (x < 3 || x > 9) { return false }
        return true
    }
    static let dumbbell: [String] = pred(16, 11) { (x: Int, y: Int) -> Bool in
        if x <= 4 && y >= 1 && y <= 9 { return !(x == 0 && (y == 1 || y == 9)) }
        if x >= 11 && y >= 1 && y <= 9 { return !(x == 15 && (y == 1 || y == 9)) }
        return x > 4 && x < 11 && y >= 4 && y <= 6
    }
    static let syringeProp: [String] = pred(13, 13) { (x: Int, y: Int) -> Bool in
        if segDist(x, y, 12.0, 0.5, 5.0, 7.5) <= 1.7 { return true }
        if segDist(x, y, 5.0, 7.5, 0.5, 12.0) <= 0.6 { return true }
        return segDist(x, y, 11.5, 0.5, 12.5, 1.5) <= 1.6
    }
    static let spark: [String] = pred(13, 13) { (x: Int, y: Int) -> Bool in
        if x == 6 || y == 6 { return true }
        if abs(x - 6) == abs(y - 6) && abs(x - 6) <= 3 { return true }
        return dist(x, y, 6.0, 6.0) <= 2.2
    }
    static let puff = ["XXXXXXXXXXXXXXXXXX", "..................", "......XXXXXXXXXXXX", "..................", "...XXXXXXXXXX"]
    static let glint = ["...X...", "...X...", "...X...", "XXXXXXX", "...X...", "...X...", "...X..."]
    static let shell = ["XXXXXXXXXX", "XXXXXXXXXX", "XXXXXXXXXX", ".XXXXXXXX.", "..XXXXXX..", "...XXXX..."]
    static let note = ["...XXX..", "...XXXXX", "...X..XX", "...X...X", "...X....", "...X....", ".XXX....", "XXXX....", "XXXX....", ".XX....."]
    static let dropS = ["...X...", "...X...", "..XXX..", ".XXXXX.", "XXXXXXX", "XXXXXXX", ".XXXXX."]
    static let flakeS = ["X..X..X", ".X.X.X.", "..XXX..", "XXXXXXX", "..XXX..", ".X.X.X.", "X..X..X"]
    static let dot = ["XXX", "XXX", "XXX"]
    // sky
    static let sunDisc: [String] = pred(13, 13) { (x: Int, y: Int) -> Bool in dist(x, y, 6.0, 6.0) <= 6.4 }
    static let moon: [String] = pred(13, 13) { (x: Int, y: Int) -> Bool in
        dist(x, y, 6.0, 6.0) <= 6.4 && dist(x, y, 9.2, 4.6) > 5.6
    }
    fileprivate static let lobesL: [(Double, Double, Double)] = [(6, 9, 5.2), (12.5, 6, 6.2), (19.5, 8, 5.4), (14, 9.5, 5.4)]
    fileprivate static let lobesS: [(Double, Double, Double)] = [(4.5, 6, 4.2), (9, 4, 4.2), (12.5, 6, 4.2)]
    static let cloudL: [String] = pred(26, 14) { (x: Int, y: Int) -> Bool in
        if y > 13 { return false }
        for l in SceneGlyph96.lobesL where dist(x, y, l.0, l.1) <= l.2 { return true }
        return x >= 6 && x <= 20 && y >= 9
    }
    static let cloudS: [String] = pred(17, 10) { (x: Int, y: Int) -> Bool in
        if y > 9 { return false }
        for l in SceneGlyph96.lobesS where dist(x, y, l.0, l.1) <= l.2 { return true }
        return x >= 5 && x <= 12 && y >= 6
    }
    static let butterfly0 = ["XXX....XXX", "XXXX..XXXX", ".XXXXXXXX.", "...XXXX...", "....XX...."]
    static let butterfly1 = ["..........", "...X..X...", "..XXXXXX..", "...XXXX...", "....XX...."]
    static let pebble = ["..XXX..", ".XXXXX.", "XXXXXXX"]
    /// 20x14 thought bubble outline (the 10x10 icon goes at (5, 2)).
    static let bubble = pred(20, 14) { x, y in
        if (y == 0 || y == 13) && x >= 2 && x <= 17 { return true }
        if (x == 0 || x == 19) && y >= 2 && y <= 11 { return true }
        return (x == 1 || x == 18) && (y == 1 || y == 12)
    }

    /// Grass tuft: blades 2px apart with the given heights; the top two pixels of every blade lean `lean`; a base row joins them.
    static func tuft(_ heights: [Int], _ lean: Int) -> [String] {
        let w = heights.count * 2 - 1, h = heights.max() ?? 1
        var g = [[Character]](repeating: [Character](repeating: ".", count: w), count: h)
        for i in 0..<heights.count {
            for j in 0..<heights[i] {
                let x = 2 * i + ((j >= heights[i] - 2 && j > 0) ? lean : 0)
                if x >= 0 && x < w { g[h - 1 - j][x] = "X" }
            }
        }
        for x in 0..<w { g[h - 1][x] = "X" }
        return g.map { String($0) }
    }
    static let tuftT0 = tuft([3, 6, 4, 5], 0), tuftT1 = tuft([3, 6, 4, 5], 1)
    static let tuftS0 = tuft([3, 4, 2], 0), tuftS1 = tuft([3, 4, 2], -1)
    /// 5x7 flowers: X petals (flower layer), o centre (sun), s stem and leaf (grass).
    static let flower0 = [".XXX.", "XXoXX", ".XXX.", "..s..", ".ss..", "..s..", "..s.."]
    static let flower1 = ["..X..", ".XXX.", "XXoXX", ".XXX.", "..s..", "..ss.", "..s.."]

    static func food(_ f: Food?) -> [String] {
        switch f {
        case .some(.meat): return foodMeat
        case .some(.veggie): return foodVeggie
        case .some(.pasta): return foodPasta
        case .none: return foodSnack
        }
    }

    /// The foe at 96: the 16x16 base frame, Scale3x, then a 2x2 majority reduction (24x24: half the pet's size).
    static func foe(_ frame: [String]) -> [String] {
        let big = Sprite96.scale3x(frame)
        let g: [[UInt8]] = big.map { Array($0.utf8) }
        let n = g.count / 2
        var out: [String] = []
        for y in 0..<n {
            var row = ""
            for x in 0..<n {
                var c = 0
                for dy in 0..<2 { for dx in 0..<2 where g[y * 2 + dy][x * 2 + dx] == 88 { c += 1 } }
                row += c >= 2 ? "X" : "."
            }
            out.append(row)
        }
        return out
    }
}
