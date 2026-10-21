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

    static func sprite(for pet: Pet, blink: Bool) -> [String] {
        switch pet.stage {
        case .egg: return egg
        case .ghost: return ghost
        default:
            guard let frames = pet.speciesInfo?.frames else { return egg }
            return frames[blink && frames.count > 1 ? 1 : 0]
        }
    }
}
