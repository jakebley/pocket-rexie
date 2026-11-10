import Foundation

/// What a pet says when petted. Same selection as expo-prototype/src/core/reactions.ts: urgent needs first,
/// then the odd mood line, otherwise a line for its species or body type. Data lives in ReactionData.
enum Reactions {
    private static func splitTable(_ text: String) -> [String: [String]] {
        var out: [String: [String]] = [:]
        for record in text.split(separator: "\n") {
            let parts: [Substring] = record.split(separator: "\t", maxSplits: 1)
            if parts.count == 2 {
                out[String(parts[0])] = parts[1].split(separator: "|").map { String($0) }
            }
        }
        return out
    }

    static let kindOf: [String: String] = {
        var out: [String: String] = [:]
        for pair in ReactionData.kindOf.split(separator: ",") {
            let parts: [Substring] = pair.split(separator: ":", maxSplits: 1)
            if parts.count == 2 { out[String(parts[0])] = String(parts[1]) }
        }
        return out
    }()
    static let kindLines: [String: [String]] = splitTable(ReactionData.kindLines)
    static let context: [String: [String]] = splitTable(ReactionData.context)
    static let speciesLines: [String: [String]] = splitTable(ReactionData.speciesLines)

    /// Taps so far; the step when a caller gives none.
    nonisolated(unsafe) private static var counter: Int = 0

    /// 31-multiplier string hash on 32 bits, like the Expo build.
    static func hash(_ s: String) -> Int {
        var h: UInt32 = 0
        for u in s.utf16 { h = h &* 31 &+ UInt32(u) }
        return Int(h)
    }

    private static func fill(_ line: String, _ name: String) -> String {
        return line.replacingOccurrences(of: "{n}", with: name)
    }

    /// Every line this pet can say in a given state, unfilled (for tests).
    static func allLines(species: String) -> [String] {
        var out: [String] = []
        let kind: String = kindOf[species] ?? "baby"
        out += kindLines[kind] ?? kindLines["baby"] ?? []
        out += speciesLines[species] ?? []
        for key in context.keys.sorted() { out += context[key] ?? [] }
        return out
    }

    /// The reaction for `pet`. Pass `step` for a repeatable result; nil advances the shared counter.
    static func line(for pet: Pet, step: Int? = nil) -> String {
        let info: Species? = pet.speciesInfo
        return line(name: pet.name, species: pet.species, stage: pet.stage, lineage: info?.line ?? "",
                    sick: pet.sick, hunger: pet.hunger, happy: pet.happy, poops: pet.poops,
                    heavy: pet.overweight, step: step)
    }

    static func line(name: String, species: String, stage: Stage, lineage: String, sick: Bool,
                     hunger: Int, happy: Int, poops: Int, heavy: Bool, step: Int? = nil) -> String {
        let s: Int
        if let given = step {
            s = given
        } else {
            s = counter
            counter += 1
        }
        let i: Int = s + hash(species)
        func pick(_ lines: [String]) -> String {
            if lines.isEmpty { return "" }
            return lines[i % lines.count]
        }
        if sick { return fill(pick(context["sick"] ?? []), name) }
        if hunger <= 1 { return fill(pick(context["hungry"] ?? []), name) }
        if poops >= 2 { return fill(pick(context["dirty"] ?? []), name) }
        var mood: [String]? = nil
        if heavy {
            mood = context["heavy"]
        } else if happy <= 1 {
            mood = context["sad"]
        } else if lineage == "neglect" || lineage == "stray" {
            mood = context["stray"]
        } else if stage == .ultimate {
            mood = context["ultimate"]
        }
        if let m = mood, i % 3 == 0 { return fill(pick(m), name) }
        let own: [String] = speciesLines[species] ?? []
        let kind: [String] = kindLines[kindOf[species] ?? "baby"] ?? kindLines["baby"] ?? []
        return fill(pick(own + own + kind), name)
    }
}
