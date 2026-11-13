import Foundation

// Biomes B at 96x96 (sky, ember, crags, workshop, swamp, space): dispatch to the painters in Biome96B*.swift, ports of
// expo-prototype/src/ui/biome96/*.ts. These painters own their ground band (Biome96.handles), so the generic meadow ground is
// not drawn for them; their `fore` runs after the sky and overwrites. Colours: ember and sky use slot layers (Biome96BColors).

enum Biome96B {
    typealias Period = SceneAmbient.Period

    static func handles(_ biome: Biome) -> Bool {
        switch biome {
        case .sky, .ember, .crags, .workshop, .swamp, .space: return true
        default: return false
        }
    }

    /// Scenery drawn before the sky (sun, moon, clouds and the ground follow).
    static func backdrop(into r: inout SceneRaster, biome: Biome, period: Period, live: BiomeLive) -> Bool {
        guard handles(biome) else { return false }
        var cv = CvB(copying: r.cells)
        switch biome {
        case .sky: SkyB.backdrop(&cv, period, live)
        case .ember: EmberB.backdrop(&cv, period, live)
        case .crags: CragsB.backdrop(&cv, period, live)
        case .workshop: WorkshopB.backdrop(&cv, period, live)
        case .swamp: SwampB.backdrop(&cv, period, live)
        default: SpaceB.backdrop(&cv, period, live)
        }
        r.cells = cv.px
        return true
    }

    /// The floor and the animated parts, after the sky and before the HUD and the pet.
    static func fore(into r: inout SceneRaster, biome: Biome, period: Period, live: BiomeLive) -> Bool {
        guard handles(biome) else { return false }
        var cv = CvB(copying: r.cells)
        switch biome {
        case .sky: SkyB.fore(&cv, period, live)
        case .ember: EmberB.fore(&cv, period, live)
        case .crags: CragsB.fore(&cv, period, live)
        case .workshop: WorkshopB.fore(&cv, period, live)
        case .swamp: SwampB.fore(&cv, period, live)
        default: SpaceB.fore(&cv, period, live)
        }
        r.cells = cv.px
        return true
    }

    /// Hex table of the slot layers (index = code - Slot96.first), nil for a biome without slots.
    static func slotColors(biome: Biome, period: Period, rain: Bool) -> [String]? {
        guard let list = BiomeSlots96.colors(biome, period: period, rain: rain) else { return nil }
        var out = [String](repeating: "-", count: Int(Slot96.last) - Int(Slot96.first) + 1)
        for s in list {
            let i = Int(s.code) - Int(Slot96.first)
            if i >= 0 && i < out.count { out[i] = s.rgb.hex }
        }
        return out
    }
}
