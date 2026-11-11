import Foundation

/// Species tuning: nothing is one-size-fits-all (docs/PLAY.md). Every reaction kind (the body type) has speed, size,
/// luck and memory modifiers and a favourite game; stage, weight and health scale the result. The tables are generated
/// from expo-prototype/src/core/minigames/tuning.ts (MiniGameData.kinds / stages).
struct KindTuning {
    var speed: Double
    var size: Double
    var luck: Double
    var memory: Double
    var favourite: String
}

/// The final numbers a game reads.
struct Tuning {
    var kind: String
    /// Pet movement multiplier (kind x stage x weight x health).
    var speed: Double
    /// The same without weight and health: what a game may count on from a healthy pet of this body type and stage.
    var baseSpeed: Double
    /// Body and hitbox multiplier (kind x stage).
    var size: Double
    /// Bonus-item multiplier, 1 = normal.
    var luck: Double
    /// Extra ms each ECHO symbol stays on screen.
    var memory: Double
    var favourite: String
    enum Condition: String { case fine, heavy, hungry, sick }
    var condition: Condition
}

/// A pet's body as the tuning sees it.
struct MiniBody {
    var species: String
    var stage: Stage
    var heavy = false
    var sick = false
    var hunger = 4
}

enum MiniTuning {
    static let favouriteMul = MiniGameData.favouriteMul

    static let kinds: [String: KindTuning] = {
        var out: [String: KindTuning] = [:]
        for row in MiniGameData.kinds.split(separator: ",") {
            let f = row.split(separator: ":").map(String.init)
            guard f.count == 6, let s = Double(f[1]), let z = Double(f[2]), let l = Double(f[3]), let m = Double(f[4]) else { continue }
            out[f[0]] = KindTuning(speed: s, size: z, luck: l, memory: m, favourite: MiniGameID.name(forCode: String(f[5].prefix(1))))
        }
        return out
    }()

    /// Every body kind, in table order.
    static let allKinds: [String] = MiniGameData.kinds.split(separator: ",").compactMap { $0.split(separator: ":").first.map(String.init) }

    static let stages: [String: (speed: Double, size: Double)] = {
        var out: [String: (speed: Double, size: Double)] = [:]
        for row in MiniGameData.stages.split(separator: ",") {
            let f = row.split(separator: ":").map(String.init)
            if f.count == 3, let s = Double(f[1]), let z = Double(f[2]) { out[f[0]] = (speed: s, size: z) }
        }
        return out
    }()

    private static let neutral = KindTuning(speed: 1, size: 1, luck: 1, memory: 300, favourite: "catch")

    static func bodyKind(ofSpecies id: String) -> String { Reactions.kindOf[id] ?? "baby" }

    /// Combine the species' body type with stage, weight and health.
    static func tuning(for b: MiniBody) -> Tuning {
        let kind = bodyKind(ofSpecies: b.species)
        let k = kinds[kind] ?? neutral
        let st = stages[b.stage.rawValue] ?? stages["teen"] ?? (speed: 1.0, size: 1.0)
        let baseSpeed = k.speed * st.speed
        var speed = baseSpeed
        var luck = k.luck
        var memory = k.memory
        var condition = Tuning.Condition.fine
        if b.heavy { speed *= MiniGameData.heavySpeed; condition = .heavy }
        if b.hunger <= 0 {
            speed *= MiniGameData.starvingSpeed; luck *= MiniGameData.starvingLuck; condition = .hungry
        } else if b.hunger <= 1 {
            speed *= MiniGameData.hungrySpeed; luck *= MiniGameData.hungryLuck; condition = .hungry
        }
        if b.sick {
            speed *= MiniGameData.sickSpeed; luck *= MiniGameData.sickLuck; memory *= MiniGameData.sickMemory; condition = .sick
        }
        let size = max(0.6, min(1.5, k.size * st.size))
        return Tuning(kind: kind, speed: speed, baseSpeed: baseSpeed, size: size, luck: luck, memory: memory,
                      favourite: k.favourite, condition: condition)
    }

    static func tuning(for p: Pet) -> Tuning {
        tuning(for: MiniBody(species: p.species, stage: p.stage, heavy: p.overweight, sick: p.sick, hunger: p.hunger))
    }

    /// The favourite game of the pet's body type (nil for an egg or a ghost).
    static func favourite(of p: Pet) -> String? {
        Species.named(p.species) == nil ? nil : tuning(for: p).favourite
    }

    /// Params for a game from a pet.
    static func params(for p: Pet, game id: String) -> GameParams {
        let t = tuning(for: p)
        let fam = Species.named(p.species)?.family ?? p.family
        return GameParams(family: fam, species: p.species, stage: p.stage, kind: t.kind, theme: MiniThemes.theme(for: fam),
                          tuning: t, scoreMul: t.favourite == id ? favouriteMul : 1, smarts: p.smarts)
    }

    /// Params for a body without a Pet (tests, bots).
    static func params(for b: MiniBody, game id: String, smarts: Int = 30) -> GameParams {
        let t = tuning(for: b)
        let fam = Species.named(b.species)?.family ?? "dino"
        return GameParams(family: fam, species: b.species, stage: b.stage, kind: t.kind, theme: MiniThemes.theme(for: fam),
                          tuning: t, scoreMul: t.favourite == id ? favouriteMul : 1, smarts: smarts)
    }
}
