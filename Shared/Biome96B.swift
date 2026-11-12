import Foundation

// Biomes B at 96x96 (workshop, swamp, crags, ember, space, sky): the other agent fills these in (Shared/Biome96B*.swift).
// Until a biome is handled here the scene falls back to the enlarged 64 art.
enum Biome96B {
    static func handles(_ biome: Biome) -> Bool { false }

    static func backdrop(into r: inout SceneRaster, biome: Biome, period: SceneAmbient.Period, live: BiomeLive) -> Bool { false }

    static func fore(into r: inout SceneRaster, biome: Biome, period: SceneAmbient.Period, live: BiomeLive) -> Bool { false }

    static func slotColors(biome: Biome, period: SceneAmbient.Period, rain: Bool) -> [String]? { nil }
}
