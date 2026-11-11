import Foundation

/// Family themes (docs/PLAY.md): every family gives the games its own items, obstacles and symbols.
/// The data is generated (MiniGameData.themes) from expo-prototype/src/core/minigames/themes.ts and parsed once at runtime.
/// Glyph characters: '.' empty, '#' main tone, 'a' accent tone, 'o' dark detail, 'w' light detail.
/// Technicolor paints the tones; Traditional prints '#' and 'a' as ink and leaves 'o' and 'w' as unlit holes.
enum MiniTone: String {
    case red, rust, orange, yellow, gold, green, pink, blue, ice, cyan, brown, dbrown, purple, white, grey, ink
}

struct MiniGlyph: Equatable {
    var name: String
    var main: MiniTone
    /// Colour of the 'a' pixels (the main tone when the data has none).
    var accent: MiniTone
    /// Seven rows of seven characters.
    var rows: [String]

    static let size = 7
}

struct FamilyTheme {
    var family: String
    var titles: [String: String]
    var goodNoun: String
    var badNoun: String
    var move: String
    var good: [MiniGlyph] = []
    var bonus: MiniGlyph
    var bad: [MiniGlyph] = []
    var obstacles: [MiniGlyph] = []
    var symbols: [MiniGlyph] = []
    /// Result lines by rank key: none, bronze, silver, gold.
    var wins: [String: String]

    /// Every glyph of the theme (tests and sheets).
    var allGlyphs: [MiniGlyph] { good + [bonus] + bad + obstacles + symbols }

    func title(_ gameID: String, fallback: String) -> String { titles[gameID] ?? fallback }
    func winLine(_ rank: Rank) -> String { wins[rank.key] ?? "" }
}

enum MiniThemes {
    /// Family ids in the order of the app's families (dino first).
    static let families: [String] = MiniGameData.familyOrder.split(separator: ",").map(String.init)

    static let all: [String: FamilyTheme] = parse(MiniGameData.themes)

    /// An unknown family falls back to the dino theme.
    static func theme(for family: String) -> FamilyTheme {
        if let t = all[family] { return t }
        guard let dino = all["dino"] else { fatalError("MiniGameData.themes has no dino theme") }
        return dino
    }

    private static func parse(_ text: String) -> [String: FamilyTheme] {
        var out: [String: FamilyTheme] = [:]
        var cur: FamilyTheme?
        func flush() {
            if let t = cur { out[t.family] = t }
            cur = nil
        }
        for line in text.split(separator: "\n") {
            let f: [String] = line.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
            if f.first == "F", f.count >= 13 {
                flush()
                let titles: [String: String] = ["hilo": f[2], "catch": f[3], "dash": f[4], "echo": f[5]]
                let wins: [String: String] = ["none": f[9], "bronze": f[10], "silver": f[11], "gold": f[12]]
                let blank = MiniGlyph(name: "", main: .ink, accent: .ink, rows: [])
                cur = FamilyTheme(family: f[1], titles: titles, goodNoun: f[6], badNoun: f[7], move: f[8], bonus: blank, wins: wins)
            } else if f.first == "G", f.count >= 6, cur != nil {
                let main = MiniTone(rawValue: f[3]) ?? .ink
                let accent = f[4] == "-" ? main : (MiniTone(rawValue: f[4]) ?? main)
                let glyph = MiniGlyph(name: f[2], main: main, accent: accent, rows: f[5].split(separator: "/").map(String.init))
                switch f[1] {
                case "good": cur?.good.append(glyph)
                case "bonus": cur?.bonus = glyph
                case "bad": cur?.bad.append(glyph)
                case "obstacle": cur?.obstacles.append(glyph)
                default: cur?.symbols.append(glyph)
                }
            }
        }
        flush()
        return out
    }
}
