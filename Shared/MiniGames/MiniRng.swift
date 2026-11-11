import Foundation

/// Seeded randomness for the mini-games: mulberry32, the same stream as expo-prototype/src/core/minigames/rng.ts,
/// so one seed plays the same game on both platforms (the generated golden traces prove it).
final class MiniRng {
    private var a: Int32

    init(seed: Int) {
        a = Int32(truncatingIfNeeded: seed) ^ Int32(bitPattern: 0x9e37_79b9)
    }

    /// Float in [0, 1).
    func next() -> Double {
        a = a &+ 0x6d2b_79f5
        let ua = UInt32(bitPattern: a)
        var t: Int32 = Int32(bitPattern: ua ^ (ua >> 15)) &* (a | 1)
        let ut = UInt32(bitPattern: t)
        let mixed: Int32 = Int32(bitPattern: ut ^ (ut >> 7)) &* (t | 61)
        t = (t &+ mixed) ^ t
        let uv = UInt32(bitPattern: t)
        let out: UInt32 = uv ^ (uv >> 14)
        return Double(out) / 4_294_967_296.0
    }

    /// Integer in [0, n).
    func int(_ n: Int) -> Int { Int((next() * Double(n)).rounded(.down)) }

    /// True with probability p.
    func chance(_ p: Double) -> Bool { next() < p }

    /// Float in [lo, hi).
    func range(_ lo: Double, _ hi: Double) -> Double { lo + next() * (hi - lo) }
}
