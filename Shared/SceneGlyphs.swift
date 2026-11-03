import Foundation

/// Small string-row bitmaps ("X" is a dark pixel) for the living scene on its 64x64 grid. Every
/// glyph is rectangular; `LivingSceneTests` checks that. The 32x32 pet sprites live in
/// `Species.hiFrames`; the 5x5 text-screen glyphs live in `Sprite`.
enum SceneGlyph {
    // MARK: 7x7 HUD and bubble icons
    static let heartFull: [String] = [
        ".XX.XX.",
        "XXXXXXX",
        "XXXXXXX",
        "XXXXXXX",
        ".XXXXX.",
        "..XXX..",
        "...X...",
    ]
    static let heartEmpty: [String] = [
        ".XX.XX.",
        "X..X..X",
        "X.....X",
        "X.....X",
        ".X...X.",
        "..X.X..",
        "...X...",
    ]
    static let smileFull: [String] = [
        "..XXX..",
        ".XXXXX.",
        "XX.X.XX",
        "XXXXXXX",
        "X.XXX.X",
        "XX...XX",
        ".XXXXX.",
    ]
    static let smileEmpty: [String] = [
        "..XXX..",
        ".X...X.",
        "X.X.X.X",
        "X.....X",
        "X.X.X.X",
        ".X...X.",
        "..XXX..",
    ]
    static let alert: [String] = [
        "..XXX..",
        "..XXX..",
        "..XXX..",
        "..XXX..",
        ".......",
        "..XXX..",
        "..XXX..",
    ]
    static let skull: [String] = [
        ".XXXXX.",
        "XXXXXXX",
        "X..X..X",
        "XXXXXXX",
        ".XXXXX.",
        ".X.X.X.",
        ".X.X.X.",
    ]
    static let drop: [String] = [
        "...X...",
        "..XXX..",
        ".XXXXX.",
        "XXXXXXX",
        "XXXXXXX",
        ".XXXXX.",
        "..XXX..",
    ]
    static let flake: [String] = [
        "X..X..X",
        ".X.X.X.",
        "..XXX..",
        "XXXXXXX",
        "..XXX..",
        ".X.X.X.",
        "X..X..X",
    ]
    static let poop: [String] = [
        "...X...",
        "..XXX..",
        ".XXXXX.",
        ".XXXXX.",
        "XXXXXXX",
        "XXXXXXX",
        ".XXXXX.",
    ]
    static let bulb: [String] = [
        ".XXXXX.",
        "XXXXXXX",
        "XXXXXXX",
        "XXXXXXX",
        ".XXXXX.",
        "..XXX..",
        "..X.X..",
    ]
    static let meat7: [String] = [
        ".XXXX..",
        "XXXXXX.",
        "XXXXXXX",
        "XXXXXX.",
        ".XXX...",
        "..X.XX.",
        "...XXX.",
    ]
    static let ball7: [String] = [
        ".XXXXX.",
        "X..X..X",
        "X..X..X",
        "XXXXXXX",
        "X..X..X",
        "X..X..X",
        ".XXXXX.",
    ]
    static let syringe7: [String] = [
        "....XXX",
        "...XXX.",
        "..XXX..",
        ".XXX...",
        "XXX....",
        "XX.....",
        "X......",
    ]

    // MARK: 9x9 food, tools and effects
    static let meat: [String] = [
        ".XXXXX...",
        "XXXXXXX..",
        "XXXXXXXX.",
        "XXXXXXXX.",
        "XXXXXXX..",
        ".XXXXX...",
        "...XX....",
        "....XX.X.",
        ".....XXX.",
    ]
    static let leaf: [String] = [
        ".....XXXX",
        "...XXXXXX",
        "..XXXXXXX",
        ".XXXXXXX.",
        ".XXXXXX..",
        "XXXXXX...",
        "XXXX.....",
        "XX.......",
        "X........",
    ]
    static let noodle: [String] = [
        "XXXXXXXXX",
        "X........",
        "X.XXXXXXX",
        "X.X......",
        "X.X.XXXXX",
        "X.X.....X",
        "X.XXXXX.X",
        "X.......X",
        "XXXXXXXXX",
    ]
    static let candy: [String] = [
        ".........",
        "X.XXXXX.X",
        "XXXXXXXXX",
        "XXX.X.XXX",
        "XX.X.X.XX",
        "XXX.X.XXX",
        "XXXXXXXXX",
        "X.XXXXX.X",
        ".........",
    ]
    static let broom: [String] = [
        "....X....",
        "....X....",
        "....X....",
        "....X....",
        "...XXX...",
        "..XXXXX..",
        ".XXXXXXX.",
        "XXXXXXXXX",
        "X.X.X.X.X",
    ]
    static let ball: [String] = [
        "..XXXXX..",
        ".X..X..X.",
        "X...X...X",
        "X...X...X",
        "XXXXXXXXX",
        "X...X...X",
        "X...X...X",
        ".X..X..X.",
        "..XXXXX..",
    ]
    static let dumbbell: [String] = [
        ".........",
        ".X.....X.",
        "XXX...XXX",
        "XXX...XXX",
        "XXXXXXXXX",
        "XXX...XXX",
        "XXX...XXX",
        ".X.....X.",
        ".........",
    ]
    static let syringe: [String] = [
        ".......XX",
        ".....XXXX",
        "....XX.XX",
        "...XX.XX.",
        "..XX.XX..",
        ".XXXXX...",
        "XXXX.....",
        "XX.......",
        "X........",
    ]
    static let spark: [String] = [
        "....X....",
        "....X....",
        "..X.X.X..",
        "...XXX...",
        "XXXXXXXXX",
        "...XXX...",
        "..X.X.X..",
        "....X....",
        "....X....",
    ]

    // MARK: sky
    /// Round sun with eight rays, 11x11, centred on (5, 5).
    static let sun: [String] = [
        ".....X.....",
        ".X...X...X.",
        "..X.XXX.X..",
        "...XXXXX...",
        "..XXXXXXX..",
        "X.XXXXXXX.X",
        "..XXXXXXX..",
        "...XXXXX...",
        "..X.XXX.X..",
        ".X...X...X.",
        ".....X.....",
    ]
    /// Crescent, 9x9, centred on (4, 4).
    static let moon: [String] = [
        "...XXXX..",
        "..XXXX...",
        ".XXXX....",
        ".XXX.....",
        ".XXX.....",
        ".XXX.....",
        ".XXXX....",
        "..XXXX...",
        "...XXXX..",
    ]
    /// Two-lobed cloud, 17x7.
    static let cloud: [String] = [
        "....XXXX.........",
        "...XXXXXX..XXX...",
        "..XXXXXXXXXXXXX..",
        ".XXXXXXXXXXXXXXX.",
        "XXXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXXX",
        ".XXXXXXXXXXXXXXX.",
    ]
    static let butterflyA: [String] = [
        "X...X",
        "XX.XX",
        ".XXX.",
    ]
    static let butterflyB: [String] = [
        ".....",
        "XXXXX",
        ".XXX.",
    ]
    static let star3: [String] = [
        ".X.",
        "XXX",
        ".X.",
    ]

    // MARK: ground
    static let tuftTallA: [String] = [
        "X.X",
        "X.X",
        ".X.",
        ".X.",
    ]
    static let tuftTallB: [String] = [
        "..X",
        "X.X",
        ".XX",
        ".X.",
    ]
    static let tuftShortA: [String] = [
        "X.X",
        ".X.",
    ]
    static let tuftShortB: [String] = [
        "..X",
        "XX.",
    ]
    static let pebble: [String] = [
        ".XX.",
        "XXXX",
    ]
    static let flower: [String] = [
        ".X.",
        "X.X",
        ".X.",
        ".X.",
        ".X.",
    ]
    static let mat: [String] = [
        ".XXXXXXXXXXXXXXXXXX.",
        "XXXXXXXXXXXXXXXXXXXX",
    ]

    // MARK: pet extras
    static let spark5: [String] = [
        "X...X",
        ".X.X.",
        "..X..",
        ".X.X.",
        "X...X",
    ]
    static let heart5: [String] = [
        ".X.X.",
        "XXXXX",
        "XXXXX",
        ".XXX.",
        "..X..",
    ]
    static let z5: [String] = [
        "XXXXX",
        "...X.",
        "..X..",
        ".X...",
        "XXXXX",
    ]
    static let bead5: [String] = [
        "..X..",
        ".XXX.",
        "XXXXX",
        "XXXXX",
        ".XXX.",
    ]
    static let note: [String] = [
        "..XXXX",
        "..XXXX",
        "..X..X",
        "..X...",
        "XXX...",
        "XXX...",
    ]
    static let shellLeft: [String] = [
        "XXXXX",
        "XX...",
        "X....",
    ]
    static let shellRight: [String] = [
        "XXXXX",
        "...XX",
        "....X",
    ]

    /// 13x9 thought bubble; the 7x7 icon goes at (3, 1). The tail is drawn separately.
    static let bubble: [String] = [
        ".XXXXXXXXXXX.",
        "X...........X",
        "X...........X",
        "X...........X",
        "X...........X",
        "X...........X",
        "X...........X",
        "X...........X",
        ".XXXXXXXXXXX.",
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
        heartFull, heartEmpty, smileFull, smileEmpty, alert, skull, drop, flake, poop, bulb,
        meat7, ball7, syringe7,
        meat, leaf, noodle, candy, broom, ball, dumbbell, syringe, spark,
        sun, moon, cloud, butterflyA, butterflyB, star3,
        tuftTallA, tuftTallB, tuftShortA, tuftShortB, pebble, flower, mat,
        spark5, heart5, z5, bead5, note, shellLeft, shellRight, bubble,
    ]
}
