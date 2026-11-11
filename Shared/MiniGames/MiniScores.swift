import Foundation

/// High scores: best score per game per species, and per game overall. They belong to the player, not to a pet, so they
/// survive a pet's death and a restart. The store lives in UserDefaults (the shared app group by default, so the watch and
/// the widgets can read it); tests inject their own defaults.
struct MiniScoreEntry: Codable, Equatable {
    var score: Int
    var rank: Int
    /// The pet that set it.
    var name: String
    var species: String
    var speciesName: String
    /// Seconds since 1970 of game time.
    var date: Double
}

struct MiniGameScores: Codable, Equatable {
    var overall: MiniScoreEntry?
    var species: [String: MiniScoreEntry] = [:]
}

struct MiniSubmitResult: Equatable {
    /// A new best for this species.
    var recordSpecies: Bool
    /// A new best for the game overall.
    var recordOverall: Bool
    /// The previous best for this species (nil = first time).
    var previous: Int?
}

final class MiniScoreStore {
    static let key = "pocket-rexie-scores-v1"

    private let defaults: UserDefaults
    private(set) var data: [String: MiniGameScores] = [:]

    /// The shared app group defaults unless told otherwise.
    init(defaults: UserDefaults = PetStore.defaults) {
        self.defaults = defaults
        reload()
    }

    /// Read the saved scores again (another process may have written them). A broken save starts empty.
    func reload() {
        guard let raw = defaults.data(forKey: MiniScoreStore.key) else { data = [:]; return }
        if let d = try? JSONDecoder().decode([String: MiniGameScores].self, from: raw) {
            data = d
        } else {
            defaults.set(raw, forKey: MiniScoreStore.key + ".unreadable")
            data = [:]
        }
    }

    func best(_ gameID: String, species: String? = nil) -> MiniScoreEntry? {
        guard let g = data[gameID] else { return nil }
        if let species { return g.species[species] }
        return g.overall
    }

    /// Record a finished game. Equal scores are not records; a score of 0 never is.
    @discardableResult
    func submit(_ gameID: String, _ e: MiniScoreEntry) -> MiniSubmitResult {
        var g = data[gameID] ?? MiniGameScores()
        let prev = g.species[e.species]?.score
        let recordSpecies = e.score > 0 && (prev == nil || e.score > (prev ?? 0))
        let recordOverall = e.score > 0 && (g.overall == nil || e.score > (g.overall?.score ?? 0))
        if recordSpecies { g.species[e.species] = e }
        if recordOverall { g.overall = e }
        if recordSpecies || recordOverall {
            data[gameID] = g
            save()
        }
        return MiniSubmitResult(recordSpecies: recordSpecies, recordOverall: recordOverall, previous: prev)
    }

    func save() {
        if let raw = try? JSONEncoder().encode(data) { defaults.set(raw, forKey: MiniScoreStore.key) }
    }

    func clear() {
        data = [:]
        defaults.removeObject(forKey: MiniScoreStore.key)
    }
}
