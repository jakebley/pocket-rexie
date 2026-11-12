import Foundation

// Dispatch of the set B 96x96 biome painters (sky, ember, crags, workshop, swamp, space), the hook BiomeDraw.backdrop96 / fore96
// call. These painters own their ground band: the generic meadow ground is not drawn for them (`ownsGround`), and their
// `fore` runs after the sky and overwrites (it clears the outdoor sky objects where the biome is indoors).

enum Biome96B {
    typealias Period = SceneAmbient.Period

    static func handles(_ biome: Biome) -> Bool {
        switch biome {
        case .sky, .ember, .crags, .workshop, .swamp, .space: return true
        default: return false
        }
    }

    /// Scenery drawn before the sky (sun, moon, clouds and the ground follow).
    static func backdrop(into r: inout SceneRaster, biome: Biome, period: Period, live: BiomeLive) {
        var cv = CvB(copying: r.cells)
        switch biome {
        case .sky: SkyB.backdrop(&cv, period, live)
        case .ember: EmberB.backdrop(&cv, period, live)
        case .crags: CragsB.backdrop(&cv, period, live)
        case .workshop: WorkshopB.backdrop(&cv, period, live)
        case .swamp: SwampB.backdrop(&cv, period, live)
        case .space: SpaceB.backdrop(&cv, period, live)
        default: return
        }
        r.cells = cv.px
    }

    /// The floor and the animated parts, after the sky and before the HUD and the pet.
    static func fore(into r: inout SceneRaster, biome: Biome, period: Period, live: BiomeLive) {
        var cv = CvB(copying: r.cells)
        switch biome {
        case .sky: SkyB.fore(&cv, period, live)
        case .ember: EmberB.fore(&cv, period, live)
        case .crags: CragsB.fore(&cv, period, live)
        case .workshop: WorkshopB.fore(&cv, period, live)
        case .swamp: SwampB.fore(&cv, period, live)
        case .space: SpaceB.fore(&cv, period, live)
        default: return
        }
        r.cells = cv.px
    }
}
