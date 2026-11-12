import Foundation

// Slot colours of the set B biomes that use slots (sky, ember): a port of SKYB and EMBERS in biome96/colorsA.ts.
// See BiomeSlots96.swift for the format.

enum Biome96BColors {
    static let sky = SlotSpec(
        glow: "glint=#FFFFFF gold=#F6E2A0",
        tones: """
        mount=#88B6E0 mountLight=#B4D2EE hillFar=#74AAC0 hillMid=#6AA262 hillNear=#58904F fieldA=#9ABA6A fieldB=#7FA55A
        treeDark=#3C6C3C tree=#4F8A4A treeLight=#76AE5C
        cloudHi=#FFFFFF cloudMid=#E8F1FA cloudShade=#C6D8EC cloudDeep=#A9C0DA
        branchDark=#58402E branch=#78593C branchLight=#9A7A54 bark=#6A4E34
        straw=#C9A560 strawDark=#8E6C3A strawLight=#E2C688 egg=#F4EEDC eggSpot=#B8A47C farBird=#50657F feather=#F6EEE0
        """)

    static let ember = SlotSpec(
        glow: "lava=#F2663A lavaHot=#FFC060 ember=#FF9A3C emberDim=#C8502C glowRock=#FF7A44",
        tones: """
        rockFar=#46303A rockFar2=#583A44 rock=#5E4E54 rockDark=#3C2E36 rockLight=#7E6A70 rockEdge=#92787A
        crack=#2A1C24 ash=#8A8284 ashDark=#6A6264 ashLight=#B0A8A8 soil=#4A3C3C soilDark=#32282A soilLight=#62504E
        smokeA=#5A4850 smokeB=#74606A glowHaze=#8A3C34 glowHaze2=#A24A38 cinder=#2C2024 bone=#B8A89A
        """)
}
