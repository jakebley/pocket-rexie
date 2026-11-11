import Foundation

// One play of one game, from the ready screen to the result: the pure state machine the UI (and the tests) drive.
//   ready -> play -> over (a short "time up" beat) -> result
// The A / B / C buttons and taps become GameInput here, so the UI never needs to know a game's rules.

enum SessionPhase: Equatable { case ready, play, over, result }
enum SessionExit: Equatable { case none, menu, home }
enum PadButton { case a, b, c }

struct SessionResult {
    var gameID: String
    var score: Int
    var rank: Rank
    var recordSpecies: Bool
    var recordOverall: Bool
    var previous: Int?
    var reward: RewardResult
    var winLine: String
    var petName: String
    var speciesName: String
}

final class MiniSession {
    static let overMs: Double = 1200

    let def: GameDef
    let params: GameParams
    let seed: Int
    var phase: SessionPhase = .ready
    var game: MiniGame?
    private(set) var overMs: Double = 0
    var pending = GameInput()
    private(set) var result: SessionResult?
    /// Frames drawn so far, for the UI's ambient animation and to know when to repaint.
    var frames = 0

    init(def: GameDef, params: GameParams, seed: Int) {
        self.def = def
        self.params = params
        self.seed = seed
    }

    private func start() {
        game = def.make(seed, params)
        phase = .play
        pending = GameInput()
    }

    /// A hardware button. Returns where the session wants to go next (the UI changes screen) or `.none`.
    func press(_ b: PadButton) -> SessionExit {
        switch phase {
        case .ready:
            if b == .b { start() } else if b == .c { return .menu }
            return .none
        case .play:
            switch b {
            case .a: pending.left = true
            case .b: pending.act = true
            case .c:
                if def.usesRight { pending.right = true } else { return .menu }
            }
            return .none
        case .over:
            return .none
        case .result:
            return b == .c ? .home : .menu
        }
    }

    /// A tap on the screen: side -1 = left half, +1 = right half.
    func tapSide(_ side: Int) -> SessionExit {
        switch phase {
        case .ready: start(); return .none
        case .result: return .menu
        case .play:
            if side < 0 { pending.left = true } else { pending.right = true }
            return .none
        case .over: return .none
        }
    }

    /// A tap on a row the game declared in `tapRows`.
    func tapPick(_ i: Int) {
        if phase == .play { pending.pick = i }
    }

    /// Advance by dtMs. Returns true on the step the result becomes ready (the caller then settles).
    func tick(_ dtMs: Double) -> Bool {
        if phase == .play, let g = game {
            let input = pending
            pending = GameInput()
            g.step(input, dtMs: dtMs)
            if g.done { phase = .over; overMs = 0 }
        } else if phase == .over {
            overMs += dtMs
            if overMs >= MiniSession.overMs { phase = .result; return true }
        }
        return false
    }

    /// Score the finished game: high scores, then the pet's reward (capped per day). Mutates the pet and the store.
    @discardableResult
    func settle(pet: inout Pet, store: MiniScoreStore, now: Double) -> SessionResult? {
        guard let g = game else { return nil }
        let rank = g.rank
        let spName = pet.speciesName
        let sub = store.submit(def.id, MiniScoreEntry(score: g.score, rank: rank.rawValue, name: pet.name, species: pet.species,
                                                      speciesName: Species.named(pet.species)?.name ?? spName, date: now))
        let reward = MiniRewards.apply(&pet, rank: rank, now: now)
        let r = SessionResult(gameID: def.id, score: g.score, rank: rank, recordSpecies: sub.recordSpecies,
                              recordOverall: sub.recordOverall, previous: sub.previous, reward: reward,
                              winLine: params.theme.winLine(rank), petName: pet.name, speciesName: spName)
        result = r
        return r
    }

    /// Put a game in place without going through the ready screen (render scenes and tests).
    func begin() { start() }

    /// Run a whole game with a scripted player (tests and bots). `decide` sees the live game and the elapsed ms.
    static func playOut(_ def: GameDef, _ params: GameParams, seed: Int, stepMs: Double = 50,
                        decide: (MiniGame, Double) -> GameInput) -> MiniGame {
        let game = def.make(seed, params)
        var t: Double = 0
        while !game.done && t <= def.maxMs + 5000 {
            game.step(decide(game, t), dtMs: stepMs)
            t += stepMs
        }
        return game
    }
}
