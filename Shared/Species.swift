import Foundation

/// What a pet must have done during its current stage to take an evolution branch.
/// Zero or nil fields are ignored. Counters are for the stage that is ending.
struct Requirement {
    var mistMin = 0
    var mistMax = Int.max
    var train = 0
    var wins = 0
    var smarts = 0
    var disc = 0
    var heavy = false
    var lead: Food?

    init(mistMin: Int = 0, mistMax: Int = .max, train: Int = 0, wins: Int = 0,
         smarts: Int = 0, disc: Int = 0, heavy: Bool = false, lead: Food? = nil) {
        self.mistMin = mistMin; self.mistMax = mistMax; self.train = train; self.wins = wins
        self.smarts = smarts; self.disc = disc; self.heavy = heavy; self.lead = lead
    }

    func isMet(by pet: Pet) -> Bool {
        pet.stageMistakes >= mistMin && pet.stageMistakes <= mistMax
            && pet.stageTrain >= train && pet.stageWins >= wins
            && pet.smarts >= smarts && pet.discipline >= disc
            && (!heavy || pet.overweight)
            && (lead == nil || pet.leadFood == lead)
    }
}

struct Evolution {
    let to: String
    let req: Requirement
}

struct Species {
    let id: String
    let name: String
    let stage: Stage
    let blurb: String
    /// frames[0] is the open-eyed sprite, frames[1] the blink.
    let frames: [[String]]
    let evolutions: [Evolution]

    static let all = SpeciesData.all
    static let byID: [String: Species] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })
    static var dexSize: Int { all.count }

    static func named(_ id: String) -> Species? { byID[id] }

    /// First branch whose requirements the pet meets. The last branch of every species has none.
    func nextBranch(for pet: Pet) -> String? {
        evolutions.first(where: { $0.req.isMet(by: pet) })?.to
    }
}
