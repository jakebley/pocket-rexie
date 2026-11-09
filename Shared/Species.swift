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
            && pet.stageSmarts >= smarts && pet.discipline >= disc
            && (!heavy || pet.overweight)
            && (lead == nil || pet.leadFood == lead)
    }
}

struct Evolution {
    let to: String
    let req: Requirement
}

/// A line of animals with its own evolution tree.
struct Family: Equatable {
    let id: String
    let name: String
    /// Free families are always available; the others need Plus.
    let isFree: Bool
    /// Feed menu labels for the three engine foods, in order meat, veggie, pasta.
    let foods: [String]
}

struct Species {
    let id: String
    let name: String
    let stage: Stage
    let blurb: String
    /// Animal family this species belongs to (the free app ships only `dino`).
    let family: String
    /// Lineage color family: baby, meat, veggie, pasta or neglect (drives the Technicolor body color).
    let line: String
    /// Technicolor body color ("#RRGGBB") from the species' family palette. nil for the dino family,
    /// whose bodies are colored by `line` through `PetLine`.
    let bodyHex: String?
    /// frames[0] is the open-eyed sprite, frames[1] the blink.
    let frames: [[String]]
    /// 32x32 Scale2x-smoothed version of `frames` for the high-resolution scene.
    let hiFrames: [[String]]
    let evolutions: [Evolution]

    static let all = SpeciesData.all
    static let byID: [String: Species] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })
    /// Size of the free family's Dex (kept for older call sites; use `dexSize(family:)`).
    static var dexSize: Int { dexSize(family: "dino") }

    static func named(_ id: String) -> Species? { byID[id] }

    /// The families the app knows. Only `dino` is free; the rest is the Plus plan in docs/PLUS.md.
    static let families: [Family] = SpeciesData.families
    static func family(_ id: String) -> Family? { families.first { $0.id == id } }
    static func dexSize(family id: String) -> Int { all.filter { $0.family == id }.count }
    /// Feed menu labels (meat, veggie, pasta) for a family; unknown families get the dino labels.
    static func foodLabels(family id: String) -> [String] {
        if let f = family(id), f.foods.count == 3 { return f.foods }
        return ["Meat", "Veggies", "Pasta"]
    }
    /// Hatchling species ids for a family.
    static func babies(family id: String) -> [String] { SpeciesData.babies.filter { byID[$0]?.family == id } }

    /// First branch whose requirements the pet meets. The last branch of every species has none.
    func nextBranch(for pet: Pet) -> String? {
        evolutions.first(where: { $0.req.isMet(by: pet) })?.to
    }
}
