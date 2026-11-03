import SwiftUI

/// 16x16 one-bit sprites in the style of a 1996 LCD toy. "X" is a dark pixel.
enum Sprite {
    static let egg: [String] = [
        "................",
        "................",
        ".....XXXXXX.....",
        "....XXXXXXXX....",
        "...XXXXXXXXXX...",
        "...XXX.XXXXXX...",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXX.XXX..",
        "..XXXXXXXXXXXX..",
        "..XX.XXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...XXXXXXXXXX...",
        "...XXXXXXXXXX...",
        "....XXXXXXXX....",
        ".....XXXXXX.....",
        "................",
    ]

    static let ghost: [String] = [
        "................",
        "................",
        ".....XXXXXX.....",
        "....XXXXXXXX....",
        "...XXXXXXXXXX...",
        "...XX..XX..XX...",
        "...XX..XX..XX...",
        "...XXXXXXXXXX...",
        "...XXXXXXXXXX...",
        "...XXX....XXX...",
        "...XXXXXXXXXX...",
        "...XXXXXXXXXX...",
        "...XX.XXXX.XX...",
        "...X..XXXX..X...",
        "................",
        "................",
    ]

    static let grave: [String] = [
        "................",
        "................",
        "......XXXX......",
        ".....XXXXXX.....",
        "....XXX..XXX....",
        "....XXX..XXX....",
        "....XXXXXXXX....",
        "....XXX..XXX....",
        "....XXX..XXX....",
        "....XXXXXXXX....",
        "....XXXXXXXX....",
        "...XXXXXXXXXX...",
        "XXXXXXXXXXXXXXXX",
        "................",
        "................",
        "................",
    ]

    // 5x5 status glyphs
    static let poop: [String] = [
        "..X..",
        ".XXX.",
        "XXXXX",
        "XXXXX",
        ".XXX.",
    ]
    static let heartFull: [String] = [
        ".X.X.",
        "XXXXX",
        "XXXXX",
        ".XXX.",
        "..X..",
    ]
    static let heartEmpty: [String] = [
        ".X.X.",
        "X.X.X",
        "X...X",
        ".X.X.",
        "..X..",
    ]
    static let smileFull: [String] = [
        ".XXX.",
        "X.X.X",
        "XXXXX",
        "X.X.X",
        ".XXX.",
    ]
    static let smileEmpty: [String] = [
        ".XXX.",
        "X...X",
        "X...X",
        "X...X",
        ".XXX.",
    ]
    static let alert: [String] = [
        "..X..",
        "..X..",
        "..X..",
        ".....",
        "..X..",
    ]
    static let skull: [String] = [
        ".XXX.",
        "X.X.X",
        "XXXXX",
        ".XXX.",
        ".X.X.",
    ]
    static let zzz: [String] = [
        "XXXXX",
        "...X.",
        "..X..",
        ".X...",
        "XXXXX",
    ]
    static let drop: [String] = [
        "..X..",
        ".XXX.",
        "XXXXX",
        "XXXXX",
        ".XXX.",
    ]
    static let flake: [String] = [
        "X.X.X",
        ".XXX.",
        "XXXXX",
        ".XXX.",
        "X.X.X",
    ]
    static let note: [String] = [
        "..XXX",
        "..X.X",
        "..X..",
        "XXX..",
        "XXX..",
    ]

    /// EPX / Scale2x upscale (the same rule tools/spritegen.py uses for `Species.hiFrames`):
    /// 16x16 -> 32x32 with diagonals smoothed and no blur.
    static func scale2x(_ rows: [String]) -> [String] {
        let n = rows.count
        let g = rows.map { $0.map { $0 == "X" } }
        func at(_ x: Int, _ y: Int) -> Bool { x >= 0 && x < n && y >= 0 && y < n && x < g[y].count ? g[y][x] : false }
        var out = [[Bool]](repeating: [Bool](repeating: false, count: n * 2), count: n * 2)
        for y in 0..<n {
            for x in 0..<n {
                let p = at(x, y), a = at(x, y - 1), b = at(x + 1, y), c = at(x - 1, y), d = at(x, y + 1)
                var e1 = p, e2 = p, e3 = p, e4 = p
                if c == a && c != d && a != b { e1 = a }
                if a == b && a != c && b != d { e2 = b }
                if d == c && d != b && c != a { e3 = c }
                if b == d && b != a && d != c { e4 = d }
                out[2 * y][2 * x] = e1; out[2 * y][2 * x + 1] = e2
                out[2 * y + 1][2 * x] = e3; out[2 * y + 1][2 * x + 1] = e4
            }
        }
        return out.map { String($0.map { $0 ? "X" : "." }) }
    }

    // 32x32 versions of the non-species pictures, for the 64x64 scene.
    static let eggHi = scale2x(egg)
    static let ghostHi = scale2x(ghost)
    static let graveHi = scale2x(grave)

    /// The 32x32 sprite drawn in the scene (`Species.hiFrames`).
    static func sprite(for pet: Pet, blink: Bool) -> [String] {
        switch pet.stage {
        case .egg: return eggHi
        case .ghost: return ghostHi
        default:
            guard let frames = pet.speciesInfo?.hiFrames, !frames.isEmpty else { return eggHi }
            return frames[blink && frames.count > 1 ? 1 : 0]
        }
    }
}
