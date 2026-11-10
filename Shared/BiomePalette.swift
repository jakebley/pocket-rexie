import Foundation

// Biome colors (docs/BIOMES.md): the Technicolor values of the cue and scenery layers, the per-biome re-colouring of the
// shared layers (sun, clouds, grass, ...), the phase shade of non-glowing scenery, and each biome's sky and soil.
// Mirrors expo-prototype/src/ui/palette.ts; hex values are the design.

extension ScenePalette {
    // MARK: Technicolor values of the biome layers (light appearance, "day")

    static func biomeLightHex(_ l: SceneLayer) -> String? {
        switch l {
        case .wave: return "#D5F0F0"
        case .hole: return "#4A3A2A"
        case .peak: return "#6A5E6E"
        case .bark: return "#6E5238"
        case .canopy: return "#4C7544"
        case .litter: return "#B8793F"
        case .moss: return "#7FA356"
        case .shroom: return "#C4503C"
        case .firefly: return "#F4EA7A"
        case .fern: return "#5E9150"
        case .waterLight: return "#93DAE0"
        case .airBubble: return "#D8F4F4"
        case .seaweed: return "#2F8F6A"
        case .coralA: return "#E8826E"
        case .coralB: return "#B77FC0"
        case .sand: return "#E6D6A4"
        case .hill: return "#6F98B4"
        case .wall: return "#D8C6AA"
        case .roof: return "#8C5A52"
        case .window: return "#F4D06A"
        case .wood: return "#C9B48C"
        case .yarn: return "#D66F8E"
        case .twinkle: return "#F2C84E"
        case .cloudShade: return "#DCE6F2"
        case .ember: return "#FF9A3C"
        case .ash: return "#8A8284"
        case .rock: return "#6E6560"
        case .crag: return "#8F8092"
        case .cave: return "#3A3038"
        case .lava: return "#F2663A"
        case .gridline: return "#5CC8C4"
        case .panel: return "#6A7794"
        case .gear: return "#9AA4B8"
        case .ledA: return "#6CF08C"
        case .ledB: return "#F2605A"
        case .screen: return "#7CE4F0"
        case .cable: return "#2E3446"
        case .stalac: return "#54665C"
        case .glowShroom: return "#5FF0C0"
        case .puddle: return "#3F8074"
        case .dew: return "#D4EEF6"
        case .starfield: return "#C8D0F0"
        case .planet: return "#C98A9E"
        case .planetShade: return "#8A5A86"
        case .crater: return "#4A4C6A"
        case .crystal: return "#7CF0E4"
        case .hull: return "#A8B0C8"
        case .burrow: return "#3A2C20"
        case .clover: return "#82B055"
        case .carrot: return "#E98A36"
        case .daisy: return "#F6F2E4"
        case .daisyC: return "#F0C640"
        case .leafBig: return "#5FA64C"
        default: return nil
        }
    }

    // MARK: re-colouring of the shared layers per biome (the pixels are the meadow's; only the colour changes)

    private static let remapWoods: [SceneLayer: String] = [.grass: "#5F8A4E", .ground: "#8A6E48", .dirt: "#6E5638", .flowerA: "#C9553F", .flowerB: "#E6D8B0", .cloud: "#DDE6D6"]
    private static let remapUnderwater: [SceneLayer: String] = [.sun: "#EAF8EA", .moon: "#DCECF8", .star: "#CDEBF4", .cloud: "#A8DCE2", .rain: "#CFEAF0", .grass: "#35956C", .ground: "#D8C58F", .dirt: "#BBA874", .flowerA: "#E8826E", .flowerB: "#C58AC4", .butterfly: "#F0A060"]
    private static let remapSky: [SceneLayer: String] = [.grass: "#4F8A4A", .ground: "#8A6A44", .dirt: "#6E5236", .flowerA: "#E89AB0", .flowerB: "#F2D878", .cloud: "#FFFFFF"]
    private static let remapYard: [SceneLayer: String] = [.ground: "#B79B6E", .dirt: "#957B54"]
    private static let remapClouds: [SceneLayer: String] = [.sun: "#F6DFA0", .moon: "#F4EEFF", .star: "#FFFFFF", .cloud: "#FFFFFF", .rain: "#A9B6DE", .grass: "#DDD6F0", .ground: "#F6F2FD", .dirt: "#CFC6E6", .flowerA: "#F2A6C8", .flowerB: "#F6E08A", .butterfly: "#9FD0F0"]
    private static let remapEmber: [SceneLayer: String] = [.sun: "#FF9A4A", .moon: "#F0A070", .star: "#FFB060", .cloud: "#6E5E5E", .rain: "#A09490", .grass: "#8A5A3A", .ground: "#4A3C3C", .dirt: "#32282A", .flowerA: "#E8602E", .flowerB: "#F0B040", .butterfly: "#FF8A4A"]
    private static let remapWarren: [SceneLayer: String] = [.ground: "#9A7B55", .dirt: "#7C6044"]
    private static let remapCrags: [SceneLayer: String] = [.sun: "#F0A850", .cloud: "#BCABA2", .rain: "#7C8A98", .grass: "#7E7A58", .ground: "#7A6E64", .dirt: "#5A5048", .flowerA: "#D8683C", .flowerB: "#E8B848", .butterfly: "#E88050"]
    private static let remapWorkshop: [SceneLayer: String] = [.sun: "#F6E6A0", .moon: "#E8EEF4", .star: "#7CE0C8", .cloud: "#C8CED8", .rain: "#8AB4D0", .grass: "#7A88A6", .ground: "#5A6684", .dirt: "#3E465C", .flowerA: "#E86060", .flowerB: "#F0C850", .butterfly: "#6FD0E0"]
    private static let remapSwamp: [SceneLayer: String] = [.sun: "#C8E8A0", .moon: "#B8D8C0", .star: "#8CF0C0", .cloud: "#5E7C70", .rain: "#6CC0A0", .grass: "#4F7A3E", .ground: "#3C4A34", .dirt: "#2A3628", .flowerA: "#7CE0B0", .flowerB: "#B8E86C", .butterfly: "#B8F070"]
    private static let remapGarden: [SceneLayer: String] = [.grass: "#5C9A44", .ground: "#8E7048", .dirt: "#6E5636"]
    private static let remapSpace: [SceneLayer: String] = [.sun: "#FFE7A0", .moon: "#E8E4F6", .star: "#FFFFFF", .cloud: "#6D5CA6", .rain: "#9CE8F0", .grass: "#8C8EAA", .ground: "#6E7090", .dirt: "#52546E", .flowerA: "#6CF0D8", .flowerB: "#F08AD0", .butterfly: "#FFD870", .crag: "#C8B2F0", .rock: "#5A5C7C"]
    static func biomeRemap(_ biome: Biome) -> [SceneLayer: String]? {
        switch biome {
        case .meadow: return nil
        case .woods: return remapWoods
        case .underwater: return remapUnderwater
        case .sky: return remapSky
        case .yard: return remapYard
        case .clouds: return remapClouds
        case .ember: return remapEmber
        case .warren: return remapWarren
        case .crags: return remapCrags
        case .workshop: return remapWorkshop
        case .swamp: return remapSwamp
        case .garden: return remapGarden
        case .space: return remapSpace
        }
    }

    /// Layers that glow: they keep their colour at dusk and night instead of sinking into the shade.
    static let biomeGlows: Set<SceneLayer> = [
        .sun, .moon, .star, .spark, .waterLight, .firefly, .window, .lava, .ember, .ledA, .ledB,
        .screen, .glowShroom, .twinkle, .airBubble, .wave, .gridline, .starfield, .crystal,
    ]

    /// Shared layers that count as scenery for the phase shade (the rest of the scenery is every code from wave up).
    private static let sceneryOld: Set<SceneLayer> = [.grass, .ground, .dirt, .flowerA, .flowerB, .cloud, .butterfly]

    static func biomeIsScenery(_ l: SceneLayer) -> Bool {
        l.rawValue >= SceneLayer.wave.rawValue || sceneryOld.contains(l)
    }

    /// Phase shade of non-glowing scenery: the colour and how far toward it. Night also sinks per biome (underwater goes deep blue).
    static func biomeShade(biome: Biome, period: SceneAmbient.Period?, rain: Bool) -> (RGB, Double)? {
        guard let period else { return nil }
        if period == .night {
            let tint: String
            switch biome {
            case .underwater: tint = "#0C2A52"
            case .swamp: tint = "#0C1A18"
            case .workshop: tint = "#141830"
            case .ember: tint = "#1A0C10"
            case .space: tint = "#0A0C26"
            default: tint = "#101830"
            }
            return (RGB(hex: tint), 0.42)
        }
        if rain && (period == .day || period == .dusk) {
            return biome == .underwater ? (RGB(hex: "#0E3A5E"), 0.3) : (RGB(hex: "#5A6A78"), 0.14)
        }
        if period == .dusk { return (RGB(hex: "#8A4A6A"), 0.14) }
        if period == .dawn { return (RGB(hex: "#E8A878"), 0.08) }
        return nil
    }

    // MARK: sky and soil

    /// Per biome: dawn, day, dusk, night and rain sky.
    private static func biomeSkies(_ biome: Biome) -> [String] {
        switch biome {
        case .woods: return ["#C9C79C", "#9DB88E", "#B08A78", "#1F2B3A", "#8A9C94"]
        case .underwater: return ["#6AB0C2", "#5FB8CC", "#5496B2", "#0F3566", "#58A0B2"]
        case .sky: return ["#F0C9A8", "#8FC8F0", "#E0A088", "#27345E", "#8E9EAE"]
        case .yard: return ["#E6CBA9", "#B3D0DC", "#D2A08C", "#2A3558", "#9CAAB2"]
        case .clouds: return ["#F0D4DC", "#C3D2F2", "#D8BCE4", "#3A3E7A", "#B1B8D4"]
        case .ember: return ["#74423E", "#6C3A3A", "#7A3234", "#2C1620", "#523638"]
        case .warren: return ["#E3C9A9", "#AACBD4", "#D0A38F", "#2F3A5A", "#9AA8B0"]
        case .crags: return ["#E2B496", "#C9B6A2", "#C9785A", "#251D30", "#8C8490"]
        case .workshop: return ["#4F5B76", "#56627C", "#4E5872", "#262B40", "#56627C"]
        case .swamp: return ["#2E4A42", "#2F4C44", "#2A403C", "#16262A", "#28403E"]
        case .garden: return ["#E3D2A8", "#B5D8A0", "#D0A78F", "#26364A", "#9DB0A0"]
        case .space: return ["#3A2E72", "#231E56", "#34226A", "#0A0C2A", "#1E2150"]
        case .meadow: return ["#E3C9A9", "#A9C9D6", "#D0A38F", "#2F3A5A", "#9AA8B0"]
        }
    }

    /// Light-appearance sky of a biome (rain overrides day and dusk).
    static func biomeSkyHex(biome: Biome, period: SceneAmbient.Period, rain: Bool) -> String {
        let skies = biomeSkies(biome)
        if rain && (period == .day || period == .dusk) { return skies[4] }
        switch period {
        case .dawn: return skies[0]
        case .day: return skies[1]
        case .dusk: return skies[2]
        case .night: return skies[3]
        }
    }

    /// Light-appearance fill under the ground band.
    static func biomeSoilHex(_ biome: Biome) -> String {
        switch biome {
        case .woods: return "#7A6444"
        case .underwater: return "#BCA874"
        case .sky: return "#7C5E3C"
        case .yard: return "#B9A27A"
        case .clouds: return "#E4DEF2"
        case .ember: return "#3A2E30"
        case .warren: return "#9A7B55"
        case .crags: return "#625850"
        case .workshop: return "#3C445A"
        case .swamp: return "#2C3A2A"
        case .garden: return "#6E5A3E"
        case .space: return "#44466A"
        case .meadow: return "#CDBF9E"
        }
    }
}
