import Foundation

// Biomes: each pet family has its own background (docs/BIOMES.md). A pure lookup, mirroring
// expo-prototype/src/ui/biomes.ts. The drawing lives in BiomeDraw.swift, the colors in BiomePalette.swift.

enum Biome: String, CaseIterable, Sendable {
    case meadow, woods, underwater, sky, yard, clouds, ember, warren, crags, workshop, swamp, garden, space

    /// Family to biome. Spirits split by line: see `emberSpirits`.
    static func ofFamily(_ family: String) -> Biome {
        switch family {
        case "dino": return .meadow
        case "fox": return .woods
        case "fish": return .underwater
        case "bird": return .sky
        case "cat": return .yard
        case "spirits": return .clouds
        case "bunny": return .warren
        case "dragon": return .crags
        case "bot": return .workshop
        case "slime": return .swamp
        case "bug": return .garden
        case "alien": return .space
        default: return .meadow
        }
    }

    /// Spirits on the imp, horn and soot lines (tools/families/spirits.py LINE) live in the ember realm.
    static let emberSpirits: Set<String> = [
        "spirits_glimmer", "spirits_fluffimp", "spirits_plumpuff", "spirits_cherubimp", "spirits_prankwing",
        "spirits_jester", "spirits_duskhalo", "spirits_trickstar",
        "spirits_emberling", "spirits_hornlet", "spirits_pronglet", "spirits_embergut", "spirits_emberhorn",
        "spirits_prongmaster", "spirits_cinderbelly", "spirits_hornbrawler", "spirits_cinderlord", "spirits_brimstorm",
        "spirits_smudge", "spirits_sootwing", "spirits_cindersnip", "spirits_gloomwing", "spirits_tatterimp",
        "spirits_hushwing",
    ]

    /// Biomes whose backdrop is dark in every phase (caves, the ember realm, the lit workshop, deep space):
    /// HUD glyphs use the night ink there.
    static let alwaysDark: Set<Biome> = [.workshop, .swamp, .ember, .space]

    /// The species' own family decides (falling back to the pet's family for an egg).
    static func of(species id: String, family: String) -> Biome {
        let fam = Species.named(id)?.family ?? family
        if fam == "spirits" && emberSpirits.contains(id) { return .ember }
        return ofFamily(fam)
    }

    static func of(_ pet: Pet) -> Biome { of(species: pet.species, family: pet.family) }

    /// Does this biome's backdrop read as dark in this period (HUD glyphs and rim light use the night palette)?
    func isDark(_ period: SceneAmbient.Period) -> Bool {
        period == .night || Biome.alwaysDark.contains(self)
    }
}
