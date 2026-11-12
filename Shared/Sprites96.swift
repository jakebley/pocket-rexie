import Foundation

// The Technicolor 96x96 LCD (docs/RESOLUTION.md): pets are 48x48, the 16x16 base art enlarged with Scale3x
// (AdvMAME3x), port of `scale3x` in expo-prototype/src/ui/pixel.ts. Logic coordinates stay in 64-space (x1.5).

/// Grid size per look: Traditional keeps the classic 64x64, Technicolor has the finer 96x96.
enum SceneGrid {
    static let traditional = 64
    static let technicolor = 96
    static func n(for mode: ColorMode) -> Int { mode == .technicolor ? technicolor : traditional }
    /// logic units (64-space) to cells of a grid of n (Math.round, half up).
    static func cell(_ v: Int, n: Int) -> Int { n == traditional ? v : Int((Double(v) * Double(n) / 64.0 + 0.5).rounded(.down)) }
}

enum Sprite96 {
    /// Scale3x of an ink bitmap: every pixel becomes 3x3, diagonal edges smoothed, corners kept crisp.
    static func scale3x(_ rows: [String]) -> [String] {
        let h = rows.count
        guard h > 0 else { return [] }
        let w = rows[0].utf8.count
        let g: [[UInt8]] = rows.map { Array($0.utf8) }
        let X: UInt8 = 88, D: UInt8 = 46
        func at(_ x: Int, _ y: Int) -> UInt8 { (x < 0 || y < 0 || x >= w || y >= h || x >= g[y].count) ? D : g[y][x] }
        var out: [String] = []
        out.reserveCapacity(h * 3)
        for y in 0..<h {
            var r0 = [UInt8](), r1 = [UInt8](), r2 = [UInt8]()
            r0.reserveCapacity(w * 3); r1.reserveCapacity(w * 3); r2.reserveCapacity(w * 3)
            for x in 0..<w {
                let A = at(x - 1, y - 1), B = at(x, y - 1), C = at(x + 1, y - 1)
                let Dd = at(x - 1, y), E = at(x, y), F = at(x + 1, y)
                let G = at(x - 1, y + 1), H = at(x, y + 1), I = at(x + 1, y + 1)
                var e0 = E, e1 = E, e2 = E, e3 = E, e5 = E, e6 = E, e7 = E, e8 = E
                if B != H && Dd != F {
                    e0 = Dd == B ? Dd : E
                    e1 = ((Dd == B && E != C) || (B == F && E != A)) ? B : E
                    e2 = B == F ? F : E
                    e3 = ((Dd == B && E != G) || (Dd == H && E != A)) ? Dd : E
                    e5 = ((B == F && E != I) || (H == F && E != C)) ? F : E
                    e6 = Dd == H ? Dd : E
                    e7 = ((Dd == H && E != I) || (H == F && E != G)) ? H : E
                    e8 = H == F ? F : E
                }
                r0 += [e0, e1, e2]; r1 += [e3, E, e5]; r2 += [e6, e7, e8]
            }
            out.append(String(decoding: r0, as: UTF8.self))
            out.append(String(decoding: r1, as: UTF8.self))
            out.append(String(decoding: r2, as: UTF8.self))
        }
        _ = X
        return out
    }

    private static let lock = NSLock()
    private static var species: [String: [[String]]] = [:]
    private static var fixed: [String: [String]] = [:]

    /// The 48x48 frames of a species (cached: the shading cache is keyed on the row buffers).
    static func frames(of sp: Species) -> [[String]] {
        lock.lock()
        if let hit = species[sp.id] { lock.unlock(); return hit }
        lock.unlock()
        let made = sp.frames.map { scale3x($0) }
        lock.lock()
        species[sp.id] = made
        lock.unlock()
        return made
    }

    private static func fixedSprite(_ key: String, _ base: [String]) -> [String] {
        lock.lock()
        if let hit = fixed[key] { lock.unlock(); return hit }
        lock.unlock()
        let made = scale3x(base)
        lock.lock()
        fixed[key] = made
        lock.unlock()
        return made
    }

    /// The open-eyed 48x48 frame of a species id (the egg when unknown).
    static func firstFrame(id: String) -> [String] {
        guard let sp = Species.named(id), let f = frames(of: sp).first else { return egg }
        return f
    }

    static var egg: [String] { fixedSprite("egg", Sprite.egg) }
    static var ghost: [String] { fixedSprite("ghost", Sprite.ghost) }
    static var grave: [String] { fixedSprite("grave", Sprite.grave) }
    /// Shell with a zigzag crack (hatching), 48x48.
    static var crackEgg: [String] { fixedSprite("crack", LCDPainter.crackEgg16) }

    /// The 48x48 sprite drawn in the 96 scene for a pet.
    static func sprite(for pet: Pet, blink: Bool) -> [String] {
        switch pet.stage {
        case .egg: return egg
        case .ghost: return ghost
        default:
            guard let sp = pet.speciesInfo else { return egg }
            let f = frames(of: sp)
            guard !f.isEmpty else { return egg }
            return f[blink && f.count > 1 ? 1 : 0]
        }
    }
}
