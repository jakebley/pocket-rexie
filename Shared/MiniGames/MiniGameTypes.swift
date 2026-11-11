import Foundation

// The mini-game contract (docs/PLAY.md). Foundation only: no rendering, no clocks, no system randomness.
//
// HOW TO ADD A GAME (one new file, one registry line; see MiniGameRegistry.swift):
//   1. Shared/MiniGames/<Name>Game.swift   a `MiniGame` class plus `static let entry = GameEntry(def:..., layout:..., paint:...)`.
//   2. Shared/MiniGames/MiniGameRegistry.swift   add `<Name>Game.entry,` to `MiniGames.all`.

/// The ids the species tuning table can name as a favourite. A game with another id still works; it is nobody's favourite.
enum MiniGameID {
    static let all: [String] = ["hilo", "catch", "dash", "echo"]
    static func name(forCode c: String) -> String {
        switch c {
        case "h": return "hilo"
        case "c": return "catch"
        case "d": return "dash"
        default: return "echo"
        }
    }
}

enum Rank: Int, CaseIterable, Comparable {
    case none = 0, bronze, silver, gold

    static func < (a: Rank, b: Rank) -> Bool { a.rawValue < b.rawValue }

    /// Result screen label: TRY AGAIN, BRONZE, SILVER, GOLD.
    var label: String { self == .none ? "TRY AGAIN" : String(describing: self).uppercased() }
    var key: String { String(describing: self) }
}

struct Thresholds: Equatable {
    var bronze: Int
    var silver: Int
    var gold: Int

    func rank(of score: Int) -> Rank {
        score >= gold ? .gold : score >= silver ? .silver : score >= bronze ? .bronze : .none
    }
}

/// What the player did since the last step. Every field is an EDGE (a press), so the same code serves
/// the A/B/C buttons, taps and bots: left = A or a tap on the left half, right = C or a tap on the right half,
/// act = B, pick = a direct choice of option n.
struct GameInput: Equatable {
    var left = false
    var right = false
    var act = false
    var pick: Int?

    static let none = GameInput()
}

/// Everything a game may depend on: body type, family and condition already reduced to numbers.
struct GameParams {
    var family: String
    var species: String
    var stage: Stage
    var kind: String
    var theme: FamilyTheme
    var tuning: Tuning
    /// 1.25 when this game is the pet's favourite, else 1.
    var scoreMul: Double
    var smarts: Int
}

struct Hud: Equatable {
    var left: String
    var right: String
}

/// A sound the UI may play when `seq` changes.
struct MiniSfx: Equatable {
    enum Kind { case note, bad }
    var seq: Int
    var kind: Kind
    var note: Double
}

protocol MiniGame: AnyObject {
    var id: String { get }
    var done: Bool { get }
    /// Final (or running) score, favourite multiplier included.
    var score: Int { get }
    var rank: Rank { get }
    var hud: Hud { get }
    /// 0...1, how far through the game is.
    var progress: Double { get }
    /// The word on the "game over" banner, at most 7 characters.
    var overLabel: String { get }
    var sfx: MiniSfx? { get }
    /// Advance by dtMs of game time. Games run on a fixed internal tick, so any chunking plays the same game.
    func step(_ input: GameInput, dtMs: Double)
}

extension MiniGame {
    var overLabel: String { "TIME UP" }
    var sfx: MiniSfx? { nil }
}

/// A row of the 64 grid a tap can pick directly (HI-LO's HIGHER and LOWER).
struct TapRow: Equatable {
    var id: String
    var y: Int
    var h: Int
}

struct GameDef {
    var id: String
    /// Menu name, 12 characters at most, upper case.
    var name: String
    /// What the score counts, for the high-score screen.
    var unit: String
    var thresholds: Thresholds
    /// B starts the game and C is the right button; false = C quits (the guessing game uses A and B only).
    var usesRight: Bool
    var hint: String
    /// Up to 3 lines of 16 characters for the ready screen.
    var rules: (FamilyTheme) -> [String]
    /// Rows a tap picks directly, if the game is menu-like.
    var tapRows: [TapRow] = []
    /// The longest a game can run (ms), for tests and bots.
    var maxMs: Double
    var make: (Int, GameParams) -> MiniGame
}

/// Fixed-tick helper: `advance(dt)` runs `fn` once per tick of accumulated time.
struct MiniTicker {
    private var acc: Double = 0

    mutating func advance(_ dtMs: Double, _ fn: () -> Void) {
        acc += dtMs
        while acc >= MiniGameData.tickMs {
            acc -= MiniGameData.tickMs
            fn()
        }
    }
}
