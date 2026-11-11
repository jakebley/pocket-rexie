import Foundation

// HI-LO: the original guessing game (5 rounds, higher or lower) as a mini-game, same rules and pacing as
// expo-prototype/src/core/minigames/games/hilo.ts. A (left) switches between HIGHER and LOWER, B (act) chooses, a tap on a
// row chooses it directly; C quits.

struct HiLoState: Equatable {
    enum Phase { case guess, reveal }
    var round = 1
    var shown = 2
    var won = 0
    var phase = Phase.guess
    var sel = 0
    var revealed: Int?
    var correct: Bool?
}

final class HiLoGame: MiniGame {
    let id = "hilo"
    var state = HiLoState()
    private(set) var done = false

    static let rounds = MiniGameData.hiloRounds
    static let revealMs = MiniGameData.hiloRevealMs
    static let thresholds = Thresholds(bronze: MiniGameData.hiloThresholds[0], silver: MiniGameData.hiloThresholds[1],
                                       gold: MiniGameData.hiloThresholds[2])
    /// HI-LO rows (cells of the 64 grid); the painter and the tap layer both use these.
    static let rows: [TapRow] = [TapRow(id: "higher", y: 30, h: 9), TapRow(id: "lower", y: 41, h: 9)]

    private let rng: MiniRng
    private var timer: Double = 0
    private let mul: Double

    init(seed: Int, params: GameParams) {
        rng = MiniRng(seed: seed)
        mul = params.scoreMul
        state.shown = nextShown()
    }

    /// Shown digits stay in 2...8 so both HIGHER and LOWER can win.
    private func nextShown() -> Int { 2 + rng.int(7) }

    var score: Int { Int((Double(state.won) * mul + 1e-9).rounded(.down)) }
    var rank: Rank { HiLoGame.thresholds.rank(of: score) }
    var progress: Double {
        min(1, Double(state.round - 1 + (state.phase == .reveal ? 1 : 0)) / Double(HiLoGame.rounds))
    }
    var hud: Hud { Hud(left: "ROUND \(state.round)/\(HiLoGame.rounds)", right: "WINS \(state.won)") }

    private func guess() {
        if state.phase != .guess { return }
        var rev = 1 + rng.int(9)
        while rev == state.shown { rev = 1 + rng.int(9) }
        let correct = state.sel == 0 ? rev > state.shown : rev < state.shown
        state.phase = .reveal
        state.revealed = rev
        state.correct = correct
        if correct { state.won += 1 }
        timer = HiLoGame.revealMs
    }

    func step(_ input: GameInput, dtMs: Double) {
        if done { return }
        if state.phase == .guess {
            if let p = input.pick, p == 0 || p == 1 {
                state.sel = p
                guess()
                return
            }
            if input.left || input.right { state.sel = state.sel == 0 ? 1 : 0 }
            if input.act { guess() }
            return
        }
        timer -= dtMs
        if timer <= 0 {
            if state.round >= HiLoGame.rounds {
                done = true
            } else {
                state = HiLoState(round: state.round + 1, shown: nextShown(), won: state.won, phase: .guess, sel: state.sel,
                                  revealed: nil, correct: nil)
            }
        }
    }
}

extension HiLoGame {
    static let def = GameDef(
        id: "hilo", name: "HI-LO", unit: "WINS", thresholds: HiLoGame.thresholds, usesRight: false,
        hint: "A: higher/lower | B: choose | C: quit",
        rules: { _ in ["NEXT NUMBER IS", "HIGHER OR LOWER?", "5 ROUNDS"] },
        tapRows: HiLoGame.rows, maxMs: Double(HiLoGame.rounds) * HiLoGame.revealMs + 2000,
        make: { seed, params in HiLoGame(seed: seed, params: params) })

    /// The original screen, pixel for pixel, plus the family's token beside the numbers.
    static let entry = GameEntry(def: HiLoGame.def, layout: .text) { r, c in
        guard let g = c.game as? HiLoGame else { return }
        let s = g.state
        r.text("ROUND \(s.round)/5", 2, 2)
        let w = "WINS \(s.won)"
        r.text(w, SceneRaster.side - SceneRaster.textWidth(w) - 2, 2)
        r.fill(0, 9, SceneRaster.side, 1)
        r.text(String(s.shown), 16, 12, scale: 3)
        r.text(s.phase == .guess ? "?" : String(s.revealed ?? 0), 39, 12, scale: 3)
        if let token = c.params.theme.good.first {
            r.glyph(token, 4, 14, halo: false)
            r.glyph(token, 53, 14, halo: false)
        }
        for (i, label) in ["HIGHER", "LOWER"].enumerated() {
            let row = HiLoGame.rows[i]
            r.frame(1, row.y, SceneRaster.side - 2, row.h)
            r.text(label, 14, row.y + 2)
        }
        let row = HiLoGame.rows[s.sel]
        r.text(">", 5, row.y + 2)
        r.flip(1, row.y, SceneRaster.side - 2, row.h)
        if s.phase == .reveal {
            let msg = s.correct == true ? "YOU WIN" : "MISSED"
            r.text(msg, (SceneRaster.side - SceneRaster.textWidth(msg)) >> 1, 55)
        }
    }
}
