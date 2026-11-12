import Foundation

// Slime swamp cave at 96x96 (always dark), a port of expo-prototype/src/ui/biome96/swamp.ts: a ragged ceiling with stalactites,
// a pale light shaft by day, mossy rock walls, swaying vines, glowing mushrooms with a soft halo, a muddy floor with puddles,
// drips that fall from the stalactite tips and ring the puddles. Static art is cached per (period, rain).

enum SwampB {
    private static let wall = SceneLayer.rock.rawValue
    private static let wallHi = SceneLayer.crag.rawValue
    private static let deep = SceneLayer.cave.rawValue
    private static let stal = SceneLayer.stalac.rawValue
    private static let moss = SceneLayer.moss.rawValue
    private static let mossDk = SceneLayer.fern.rawValue
    private static let glow = SceneLayer.glowShroom.rawValue
    private static let stem = SceneLayer.cloudShade.rawValue
    private static let wet = SceneLayer.puddle.rawValue
    private static let dew = SceneLayer.dew.rawValue
    private static let root = SceneLayer.bark.rawValue
    private static let waterLight = SceneLayer.waterLight.rawValue
    private static let ground = SceneLayer.ground.rawValue
    private static let dirt = SceneLayer.dirt.rawValue
    private static let daisy = SceneLayer.daisy.rawValue
    private static let gy = 90

    /// x, length, base half-width
    private static let stalactites = ints("3 9 3, 14 7 3, 27 5 2, 36 8 3, 52 20 5, 62 9 3, 69 29 6, 78 13 4, 86 24 5, 93 10 3")
    private static let drips = [4, 6, 8, 3]
    /// x, base row, cap radius
    private static let clusters = ints("10 90 5, 18 90 3, 24 90 2, 82 90 5, 90 90 3, 75 90 2, 86 66 3")

    private static func stalactite(_ b: inout CvB, _ x: Int, _ y0: Int, _ len: Int, _ hw: Int) {
        for k in 0..<len {
            let f = Double(k) / Double(len)
            let w = max(0, jr(Double(hw) * (1 - f) * (1 - f * 0.15)))
            for xx in (x - w)...(x + w) {
                b.set(xx, y0 + k, Double(xx) > Double(x) + Double(w) * 0.3 ? stal : wallHi)
            }
            if k > 1 && k % 5 == 3 && w > 1 { b.set(x - w, y0 + k, stal) }
        }
    }

    private static func shroom(_ b: inout CvB, _ x: Int, _ base: Int, _ r: Int) {
        b.vline(x, base - r - 1, base - 1, stem)
        b.vline(x + 1, base - r, base - 1, stem)
        b.set(x + 1, base - 1, mossDk)
        let cy = base - r - 2
        let cx = Double(x) + 0.5
        for yy in (-r)...1 {
            for xx in (-r - 1)...(r + 2) {
                let u = (Double(x + xx) - cx) / (Double(r) + 1.5)
                let v = Double(yy) / (Double(r) * 0.8)
                if (u * u + v * v).squareRoot() <= 1 { b.set(x + xx, cy + yy, glow) }
            }
        }
        b.hline(x - r, x + r + 1, cy + 1, mossDk)
        b.set(x - 1, cy - 1, dew)
        b.set(x + 2, cy - 2, dew)
        if r > 3 { b.set(x + 3, cy, dew) }
    }

    private static func paintBack(_ b: inout CvB, _ period: SceneAmbient.Period) {
        // cave wall: lumpy rock masses in two tones, cracks, mossy patches
        for e in ints("14 52 20 14, 46 46 18 10, 78 56 22 16, 30 70 18 10, 64 76 20 9, 8 80 12 8, 90 40 10 14, 52 64 12 8") {
            b.ellipse(Double(e[0]), Double(e[1]), Double(e[2]), Double(e[3]), wall)
        }
        for i in 0..<70 {
            let x = Int((rndB(i + 3) * 96).rounded(.down)), y = 24 + Int((rndB(i + 70) * 62).rounded(.down))
            if b.at(x, y) == wall { b.set(x, y, i % 3 != 0 ? wallHi : stal) }
        }
        for c in ints("34 28 36 36, 36 36 33 42, 58 34 60 40, 86 44 84 54, 10 38 12 46") { b.line(c[0], c[1], c[2], c[3], deep) }
        for m in ints("22 66 5, 60 62 4, 88 70 5, 40 56 3") {
            b.ellipse(Double(m[0]), Double(m[1]), Double(m[2]), 2, mossDk)
            b.ellipse(Double(m[0] - 1), Double(m[1] - 1), Double(m[2]) - 1.5, 1, moss)
        }
        // ceiling: a dark ragged band
        for x in 0..<96 {
            let fx = Double(x)
            let h = 4 + jr(2.4 * sin(fx / 4) + 1.8 * sin(fx / 1.7 + 1) + rndB(x) * 2)
            b.vline(x, 0, h, deep)
            if x % 3 == 0 { b.set(x, h + 1, stal) }
        }
        for s in stalactites { stalactite(&b, s[0], 3, s[1], s[2]) }
        // side pillars with strata and moss
        for y in 4..<gy {
            let fy = Double(y)
            let wl = 5 + jr(2 * sin(fy / 5)), wr = 4 + jr(2 * sin(fy / 6 + 2))
            b.hline(0, wl, y, stal)
            b.hline(95 - wr, 95, y, stal)
            b.set(wl, y, wallHi)
            b.set(95 - wr, y, deep)
            if y % 7 == 3 {
                b.hline(0, wl - 1, y, deep)
                b.hline(96 - wr, 95, y, wall)
            }
        }
        b.pts([[6, 30], [6, 31], [5, 32], [7, 54], [6, 55], [88, 38], [89, 39], [88, 62]], moss)
        // a light shaft from a crack in the roof (daylight only): dithered beam
        if period != .night {
            let dense = period == .day ? 2 : 3
            for y in 6..<(gy - 2) {
                let t = Double(y - 6) / Double(gy - 8)
                let x0 = jr(72 - 3 - t * 12), x1 = jr(76 + 3 + t * 16)
                for x in x0...x1 where b.at(x, y) != stal && (x + y) % (dense * 3) == 0 && (y % 2 == 0 || x % 3 == 0) {
                    b.set(x, y, stem)
                }
            }
        }
        // dangling roots
        for r in ints("24 6 14, 26 6 9, 48 8 11, 90 6 16") {
            b.vline(r[0], r[1], r[1] + r[2], root)
            b.set(r[0] - 1, r[1] + r[2] - 3, root)
        }
        // glowing mushrooms and a ledge fungus; the halo is a sparse dither
        for c in clusters {
            let x = c[0], base = c[1], r = c[2]
            for yy in (-r - 8)..<2 {
                for xx in (-r - 5)..<(r + 7) {
                    let d = hypot(Double(xx), Double(yy) * 1.4 + Double(r) * 0.4)
                    let near = (xx + yy) % 4 == 0 && d < Double(r + 3)
                    let far = xx % 4 == 0 && yy % 4 == 0 && d < Double(r + 5)
                    if d < Double(r + 5) && (near || far) && base + yy >= 0 && base + yy < gy { b.set(x + xx, base + yy, glow) }
                }
            }
        }
        for c in clusters { shroom(&b, c[0], c[1], c[2]) }
        b.hline(70, 84, 69, moss)
        b.hline(71, 83, 70, mossDk)
        b.hline(73, 81, 71, stal)
    }

    private static func paintFore(_ b: inout CvB) {
        // muddy floor with a mossy lip and two puddles
        for x in 0..<96 {
            b.set(x, gy, x % 3 == 0 ? moss : ground)
            b.set(x, gy + 1, ground)
            b.set(x, gy + 2, x % 2 != 0 ? ground : dirt)
            b.set(x, gy + 3, dirt)
        }
        for x in 0..<96 {
            for y in (gy + 4)..<96 { b.set(x, y, (x * 5 + y * 3) % 7 == 0 ? stal : dirt) }
        }
        for p in ints("28 11, 66 14") {
            let cx = p[0], rx = p[1]
            b.ellipse(Double(cx), Double(gy + 2), Double(rx), 3, wet)
            b.ellipse(Double(cx), Double(gy + 1), Double(rx - 1), 1.2, dirt)
            b.hline(cx - rx + 3, cx - rx + 8, gy + 2, waterLight)
            b.hline(cx + 2, cx + 7, gy + 3, waterLight)
            b.set(cx - 2, gy + 1, dew)
            b.set(cx + rx - 4, gy + 2, dew)
        }
        for p in ints("8 89, 44 89, 47 89, 58 88, 88 89") {
            b.hline(p[0], p[0] + 2, p[1], wall)
            b.set(p[0], p[1] - 1, wallHi)
        }
        for x in [3, 41, 49, 60, 95] {
            b.vline(x, gy - 4, gy - 1, mossDk)
            b.set(x + 1, gy - 3, moss)
            b.set(x - 1, gy - 2, moss)
        }
        for x in stride(from: 2, to: 96, by: 9) { b.set(x, gy + 6, stal) }
    }

    private static let pulseCaps = ints("10 90 5, 82 90 5, 86 66 3, 18 90 3, 90 90 3")
    private static let vines = ints("56 22 0, 92 26 2, 32 12 4")

    private static func paintLive(_ b: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        let T = live.tick
        let fast = live.rain ? 3 : 2   // rain outside: the cave drips more
        // drips: a bead swells on the tip, falls, rings the puddle
        for (i, si) in drips.enumerated() {
            let x = stalactites[si][0], len = stalactites[si][1]
            let tipY = 3 + len
            let cyc = 46 - fast * 4
            let u = (T + i * 13) % cyc
            let fallStart = 12
            let land = (x >= 54 && x <= 80) ? gy + 2 : gy + 1
            let tFall = Int((Double(land - tipY - 1) / 0.45).squareRoot().rounded(.up))
            if u < fallStart {
                if u > 6 { b.set(x, tipY, dew) }
                if u > 9 { b.set(x, tipY + 1, dew) }
            } else {
                let f = u - fallStart
                let y = Double(tipY + 1) + Double(f * f) * 0.45
                if y < Double(land) {
                    b.set(x, jr(y), dew)
                    b.set(x, jr(y) - 1, dew)
                } else {
                    let fr = f - tFall
                    if fr >= 0 && fr < 6 {
                        if fr < 2 { b.pts([[x - 1, land - 2 - fr], [x + 1, land - 2 - fr], [x, land - 3 - fr]], dew) }
                        let rr = min(7, 1 + jr(Double(fr) * 1.4))
                        b.hline(x - rr, x - rr + 1, land + 1, dew)
                        b.hline(x + rr - 1, x + rr, land + 1, dew)
                        if rr > 3 {
                            b.hline(x - rr + 2, x + rr - 2, land + 3, dew)
                            b.hline(x - rr + 2, x + rr - 2, land, dew)
                        }
                    }
                }
            }
        }
        // glow pulse: the halo of the mushrooms breathes
        let pulse = (T >> 3) % 4
        for c in pulseCaps {
            let x = c[0], r = c[2]
            let cy = c[1] - r - 2
            if pulse < 2 {
                b.set(x - 2 + pulse, cy - 1, dew)
                b.set(x + 3 - pulse, cy, dew)
            }
            if pulse == 3 {
                b.set(x + 1, cy - r, glow)
                b.set(x - r - 2, cy + 1, glow)
                b.set(x + r + 3, cy + 1, glow)
            }
        }
        // vines sway
        for v in vines {
            let x = v[0], len = v[1], ph = v[2]
            for k in 0..<len {
                let f = Double(k) / Double(len)
                let off = jr(sin(Double(T) / 15 + Double(ph)) * 1.8 * f * f * 1.5)
                b.set(x + off, 6 + k, k % 4 == 3 ? moss : mossDk)
                if k % 6 == 4 {
                    b.set(x + off + 1, 6 + k, moss)
                    b.set(x + off - 1, 7 + k, moss)
                }
            }
        }
        // bubbles rising in the puddles and popping
        for bub in ints("24 0, 70 5") {
            let u = ((T >> 1) + bub[1]) % 14
            if u < 6 { b.set(bub[0] + (u % 2), gy + 2 - (u >> 1), u == 5 ? dew : waterLight) }
        }
        // spore motes and (by day) dust in the light shaft
        for i in 0..<5 {
            let u = Double((T + i * 37) % 120)
            b.set(jr(Double(8 + i * 17) + sin(u / 9 + Double(i)) * 4), jr(76 - u * 0.5), glow)
        }
        if period != .night {
            for i in 0..<3 {
                let u = Double((T + i * 31) % 90)
                b.set(jr(Double(66 + i * 7) + u * 0.12), 10 + Int((u * 0.8).rounded(.down)), daisy)
            }
        }
    }

    static func back(_ period: SceneAmbient.Period, _ rain: Bool) -> [UInt8] {
        Biome96BCache.part(.swamp, "back", period, rain) { paintBack(&$0, period) }
    }

    static func backdrop(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.blit(back(period, live.rain))
    }

    static func fore(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.clearSky(back(period, live.rain))
        cv.blit(Biome96BCache.part(.swamp, "fore", period, live.rain) { paintFore(&$0) })
        paintLive(&cv, period, live)
    }
}
