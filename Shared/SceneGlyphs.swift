import Foundation

/// Small string-row bitmaps ("X" is a dark pixel) for the living scene. Every glyph is
/// rectangular; `SceneTests` checks that. The 16x16 pet sprites live in `Sprite`/`SpeciesData`.
enum SceneGlyph {
    // 5x5 food, dropped into the room by feeding
    static let meat: [String] = [
        ".XXX.",
        "XXXXX",
        "XXXXX",
        ".XXX.",
        "X.X..",
    ]
    static let leaf: [String] = [
        "...XX",
        "..XXX",
        ".XXX.",
        "XXX..",
        "X....",
    ]
    static let noodle: [String] = [
        "XXXXX",
        "X....",
        "XXXX.",
        "....X",
        "XXXXX",
    ]
    static let candy: [String] = [
        "X...X",
        ".XXX.",
        "XXXXX",
        ".XXX.",
        "X...X",
    ]

    // 5x5 tools and effects
    static let broom: [String] = [
        "..X..",
        "..X..",
        ".XXX.",
        "XXXXX",
        "X.X.X",
    ]
    static let ball: [String] = [
        ".XXX.",
        "X.X.X",
        "XXXXX",
        "X.X.X",
        ".XXX.",
    ]
    static let dumbbell: [String] = [
        "X...X",
        "X...X",
        "XXXXX",
        "X...X",
        "X...X",
    ]
    static let syringe: [String] = [
        "...XX",
        "..XXX",
        ".XXX.",
        "XXX..",
        "X....",
    ]
    static let spark: [String] = [
        "..X..",
        "..X..",
        "XXXXX",
        "..X..",
        "..X..",
    ]
    static let bulb: [String] = [
        ".XXX.",
        "XXXXX",
        "XXXXX",
        ".XXX.",
        "..X..",
    ]
    static let sun: [String] = [
        ".XXX.",
        "XXXXX",
        "XXXXX",
        "XXXXX",
        ".XXX.",
    ]
    static let moon: [String] = [
        ".XXX.",
        "XX...",
        "XX...",
        "XX...",
        ".XXX.",
    ]

    // 3x3
    static let spark3: [String] = [
        "X.X",
        ".X.",
        "X.X",
    ]
    static let heart3: [String] = [
        "X.X",
        "XXX",
        ".X.",
    ]
    static let z3: [String] = [
        "XX.",
        ".X.",
        ".XX",
    ]
    static let bead3: [String] = [
        ".X.",
        "X.X",
        ".X.",
    ]
    static let star3: [String] = [
        ".X.",
        "XXX",
        ".X.",
    ]
    static let tuftA: [String] = [
        "X.X",
        ".X.",
        ".X.",
    ]
    static let tuftB: [String] = [
        "X..",
        ".XX",
        ".X.",
    ]
    static let pebble: [String] = [
        "...",
        ".X.",
        "XXX",
    ]
    static let butterflyA: [String] = [
        "X.X",
        ".X.",
        "X.X",
    ]
    static let butterflyB: [String] = [
        "...",
        "XXX",
        ".X.",
    ]
    static let shellLeft: [String] = [
        "XXX",
        "X..",
    ]
    static let shellRight: [String] = [
        "XXX",
        "..X",
    ]

    // bigger pieces
    static let cloud: [String] = [
        "..XXX....",
        ".XXXXXX..",
        "XXXXXXXXX",
    ]
    static let mat: [String] = [
        ".XXXXXXXX.",
        "XXXXXXXXXX",
    ]
    /// 9x7 speech bubble; the 5x5 icon goes at (2, 1). The tail is drawn separately.
    static let bubble: [String] = [
        ".XXXXXXX.",
        "X.......X",
        "X.......X",
        "X.......X",
        "X.......X",
        "X.......X",
        ".XXXXXXX.",
    ]

    static func food(_ food: Food?) -> [String] {
        switch food {
        case .some(.meat): return meat
        case .some(.veggie): return leaf
        case .some(.pasta): return noodle
        case .none: return candy
        }
    }

    /// Every glyph, for tests.
    static let all: [[String]] = [
        meat, leaf, noodle, candy, broom, ball, dumbbell, syringe, spark, bulb, sun, moon,
        spark3, heart3, z3, bead3, star3, tuftA, tuftB, pebble, butterflyA, butterflyB,
        shellLeft, shellRight, cloud, mat, bubble,
    ]
}
