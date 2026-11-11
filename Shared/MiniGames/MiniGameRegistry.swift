import Foundation

/// The list of playable games, in menu order. To add a game (DASH, ECHO, ...): write Shared/MiniGames/<Name>Game.swift with
/// a `MiniGame` class and a `static let entry = GameEntry(def:..., layout:..., paint:...)`, then add ONE line below.
/// The Play menu, the ready/result/HIGH SCORES screens, scores, rewards and the tests (a monkey bot plays every registered
/// game for every family and renders every screen) pick the new game up automatically.
enum MiniGames {
    static let all: [GameEntry] = [
        HiLoGame.entry,
        CatchGame.entry,
        // ---- add new games here, one line each: DashGame.entry, EchoGame.entry ----
    ]

    static func entry(_ id: String) -> GameEntry? { all.first { $0.def.id == id } }

    /// Play menu rows: the registered games, then HIGH SCORES, then CANCEL.
    static var menuRows: [String] { all.map { $0.def.name } + ["HIGH SCORES", "CANCEL"] }
}
