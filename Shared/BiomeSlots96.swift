import Foundation

// Slot layers of the 96x96 biomes (port of expo-prototype/src/ui/biome96/colorsA.ts). Codes `slotFirst`...`slotLast` are not
// fixed layers: a slot means one thing per biome ("rock", "kelp", "window" ...) and the colour table of the biome being drawn
// says which colour it is. A biome declares its slots as two compact strings (`SlotSpec`): the glow slots first (they keep
// their colour at dusk and night), then the tones. Tokens are `name=#RRGGBB` or `name=day:#RRGGBB,night:#RRGGBB,...`.
// A tone given as a plain hex is the DAY colour and is shaded by phase (night, dusk, dawn, rain) like the shared scenery;
// a tone with phases is explicit (a missing phase falls back to the shaded day colour; `rain` only applies to day and dusk).
// To add a biome: write its SlotSpec and add a case to `spec(_:)`.

struct SlotSpec {
    let glow: String
    let tones: String
}

enum BiomeSlots96 {
    static let first = SceneLayer.slotFirst
    static let last = SceneLayer.slotLast

    struct Slot {
        let code: UInt8
        let glow: Bool
        /// phase key ("day", "dawn", "dusk", "night", "rain") to hex
        let hex: [String: String]
    }

    struct Def {
        let codes: [String: UInt8]
        let slots: [Slot]
    }

    /// The slot declaration of a biome (nil: it has none).
    static func spec(_ biome: Biome) -> SlotSpec? {
        switch biome {
        case .sky: return Biome96BColors.sky
        case .ember: return Biome96BColors.ember
        default: return nil
        }
    }

    private static let lock = NSLock()
    private static var defs: [Biome: Def?] = [:]
    private static var tables: [Int: [Resolved]] = [:]

    struct Resolved {
        let code: UInt8
        let glow: Bool
        let rgb: RGB
    }

    private static func parse(_ text: String, glow: Bool, from start: Int, into slots: inout [Slot], codes: inout [String: UInt8]) {
        var next = start
        for token in text.split(whereSeparator: { $0 == " " || $0 == "\n" || $0 == "\t" }) {
            guard let eq = token.firstIndex(of: "=") else { continue }
            let name = String(token[token.startIndex..<eq])
            let value = String(token[token.index(after: eq)...])
            var hex: [String: String] = [:]
            if value.hasPrefix("#") {
                hex["day"] = value
            } else {
                for part in value.split(separator: ",") {
                    let kv = part.split(separator: ":", maxSplits: 1)
                    if kv.count == 2 { hex[String(kv[0])] = String(kv[1]) }
                }
            }
            if next > Int(last) || hex["day"] == nil { continue }
            let code = UInt8(next)
            codes[name] = code
            slots.append(Slot(code: code, glow: glow, hex: hex))
            next += 1
        }
    }

    static func def(_ biome: Biome) -> Def? {
        lock.lock()
        if let hit = defs[biome] { lock.unlock(); return hit }
        lock.unlock()
        var made: Def?
        if let s = spec(biome) {
            var slots: [Slot] = []
            var codes: [String: UInt8] = [:]
            parse(s.glow, glow: true, from: Int(first), into: &slots, codes: &codes)
            parse(s.tones, glow: false, from: Int(first) + slots.count, into: &slots, codes: &codes)
            made = Def(codes: codes, slots: slots)
        }
        lock.lock()
        defs[biome] = .some(made)
        lock.unlock()
        return made
    }

    /// The layer code of a named slot (ink when the name is not declared, so a typo shows).
    static func code(_ biome: Biome, _ name: String) -> UInt8 {
        def(biome)?.codes[name] ?? SceneLayer.ink.rawValue
    }

    private static func mix(_ a: RGB, _ b: String, _ t: Double) -> RGB { a.mixed(with: RGB(hex: b), t) }

    private static func shaded(_ c: RGB, biome: Biome, period: SceneAmbient.Period, rain: Bool) -> RGB {
        if period == .night {
            let tint: String
            switch biome {
            case .underwater: tint = "#0C2A52"
            case .ember: tint = "#1A0C10"
            default: tint = "#101830"
            }
            return mix(c, tint, 0.42)
        }
        if rain && (period == .day || period == .dusk) {
            return biome == .underwater ? mix(c, "#0E3A5E", 0.3) : mix(c, "#5A6A78", 0.14)
        }
        if period == .dusk { return mix(c, "#8A4A6A", 0.14) }
        if period == .dawn { return mix(c, "#E8A878", 0.08) }
        return c
    }

    private static func periodKey(_ p: SceneAmbient.Period) -> String {
        switch p {
        case .dawn: return "dawn"
        case .day: return "day"
        case .dusk: return "dusk"
        case .night: return "night"
        }
    }

    /// Resolved colours of the biome's slots in a phase (nil: no slots).
    static func colors(_ biome: Biome, period: SceneAmbient.Period, rain: Bool) -> [Resolved]? {
        guard let d = def(biome) else { return nil }
        let key = ((Biome.allCases.firstIndex(of: biome) ?? 0) * 4 + Biome96BCache.period(period)) * 2 + (rain ? 1 : 0)
        lock.lock()
        let hit = tables[key]
        lock.unlock()
        if let hit { return hit }
        var out: [Resolved] = []
        let pk = periodKey(period)
        let useRain = rain && (period == .day || period == .dusk)
        for s in d.slots {
            let day = RGB(hex: s.hex["day"] ?? "#FF00FF")
            var key = pk
            if useRain && s.hex["rain"] != nil { key = "rain" }
            let rgb: RGB
            if s.hex.count > 1, let h = s.hex[key] {
                rgb = RGB(hex: h)
            } else if s.glow {
                rgb = day
            } else {
                rgb = shaded(day, biome: biome, period: period, rain: rain)
            }
            out.append(Resolved(code: s.code, glow: s.glow, rgb: rgb))
        }
        lock.lock()
        tables[key] = out
        lock.unlock()
        return out
    }
}
