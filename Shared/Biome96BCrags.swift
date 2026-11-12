import Foundation

// Dragon crags at 96x96, a port of expo-prototype/src/ui/biome96/crags.ts: a hazy far ridge, a layered crag face with a cave mouth
// (two eyes glint inside, stalactite teeth), a volcano with a crater glow, lava flows and a smoke plume, a rocky floor with
// boulders and glowing cracks. Ash flakes and embers drift. Static art is cached per (period, rain).

enum CragsB {
    private static let farR = SceneLayer.peak.rawValue
    private static let crag = SceneLayer.crag.rawValue
    private static let cragHi = SceneLayer.wall.rawValue
    private static let rock = SceneLayer.rock.rawValue
    private static let deep = SceneLayer.stalac.rawValue
    private static let cave = SceneLayer.cave.rawValue
    private static let lava = SceneLayer.lava.rawValue
    private static let emb = SceneLayer.ember.rawValue
    private static let ash = SceneLayer.ash.rawValue
    private static let ground = SceneLayer.ground.rawValue
    private static let dirt = SceneLayer.dirt.rawValue
    private static let daisyC = SceneLayer.daisyC.rawValue
    private static let cloudShade = SceneLayer.cloudShade.rawValue
    private static let gy = 90
    private static let vx = 76
    private static let vy = 36   // volcano apex

    private static func volHw(_ y: Int) -> Double {
        let d = Double(y - vy)
        return 3.5 + 0.5 * d + 0.004 * d * d
    }

    private static func flow(_ b: inout CvB, _ pts: [[Int]], _ w: Int) {
        if pts.count < 2 { return }
        for i in 0..<(pts.count - 1) {
            let x0 = pts[i][0], y0 = pts[i][1], x1 = pts[i + 1][0], y1 = pts[i + 1][1]
            let steps = max(abs(x1 - x0), abs(y1 - y0))
            for s in 0...steps {
                let f = Double(s) / Double(steps)
                let x = jr(Double(x0) + Double(x1 - x0) * f), y = jr(Double(y0) + Double(y1 - y0) * f)
                let ww = max(1, jr(Double(w) * (1 - (Double(i) + f) / Double(pts.count) * 0.7)))
                for k in 0..<ww { b.set(x + k - (ww >> 1), y, lava) }
                if ww >= 2 { b.set(x, y, emb) }
            }
        }
    }

    private static func paintBack(_ b: inout CvB, _ period: SceneAmbient.Period) {
        let hot = period == .dusk || period == .night
        // hazy far ridge
        for x in 0..<96 {
            let fx = Double(x)
            let wob = abs(Double((x * 7) % 23 - 11)) * 0.45
            let y = jr(60 + 5 * sin(fx / 9) + 3.2 * sin(fx / 3.7 + 2) + wob)
            b.vline(x, y, gy - 1, farR)
        }
        // volcano: lit left flank, shaded right flank, rock ribs, crater
        for y in vy..<gy {
            let hw = volHw(y)
            for x in jr(Double(vx) - hw)...jr(Double(vx) + hw) {
                let t = Double(x - vx) / max(1, hw)
                b.set(x, y, t > 0.15 ? deep : rock)
            }
        }
        for i in 0..<70 {
            let y = vy + 6 + Int((rndB(i + 11) * 52).rounded(.down))
            let hw = volHw(y)
            let x = jr(Double(vx) + (rndB(i + 31) * 2 - 1) * hw * 0.9)
            if b.at(x, y) != 0 { b.set(x, y, x < vx ? crag : rock) }
        }
        for k in 0..<6 {   // ribs down the lit flank
            let sx = vx - 3 - k * 4
            for y in (vy + 8)..<(gy - 2) {
                let x = jr(Double(vx) + Double(sx - vx) * (volHw(y) / volHw(gy - 1)) * 1.1)
                if y % 7 != (k * 3) % 7 { b.set(x, y, k % 2 != 0 ? crag : deep) }
            }
        }
        b.hline(vx - 4, vx + 4, vy, cragHi)
        b.hline(vx - 5, vx - 2, vy + 1, cragHi)
        // crater with a lava lip
        b.ellipse(Double(vx), Double(vy + 1), 5.5, 2, lava)
        b.hline(vx - 3, vx + 3, vy + 1, emb)
        b.set(vx - 5, vy - 1, rock)
        b.set(vx + 5, vy - 1, deep)
        // two lava flows, the left one thick, tapering and cooling to rock at its end
        flow(&b, [[vx - 2, vy + 3], [vx - 4, vy + 9], [vx - 3, vy + 16], [vx - 7, vy + 23], [vx - 6, vy + 31], [vx - 10, vy + 39], [vx - 9, vy + 47]], 3)
        flow(&b, [[vx + 2, vy + 3], [vx + 4, vy + 10], [vx + 3, vy + 17], [vx + 7, vy + 25], [vx + 6, vy + 32]], 2)
        b.pts([[vx - 9, vy + 50], [vx - 11, vy + 49], [vx - 7, vy + 51]], lava)
        b.pts([[vx - 12, vy + 45], [vx - 12, vy + 46], [vx - 6, vy + 41]], rock)
        if hot {
            for y in (vy - 18)..<vy {
                for x in (vx - 18)..<(vx + 18) {
                    let d = hypot(Double(x - vx), Double(y - (vy - 1)) * 1.4)
                    let a = d < 7 && (x + y) % 2 == 0
                    let c = d < 12 && x % 2 == 0 && y % 2 == 0
                    let e = d < 16 && x % 4 == 0 && y % 4 == 0
                    if b.at(x, y) == 0 && (a || c || e) { b.set(x, y, emb) }
                }
            }
        }

        // the front crag: polygon with strata, a shaded flank, rim light
        b.poly(ints("0 48, 5 44, 9 36, 14 30, 19 36, 26 44, 30 54, 37 62, 43 72, 47 90, 0 90"), crag)
        for y in 30..<gy {
            let ridge = 14 + Double(y - 30) * 0.62
            for x in 0..<50 where b.at(x, y) == crag {
                let fx = Double(x)
                if fx > ridge {
                    b.set(x, y, rock)
                } else if fx < ridge - 14 && fx > ridge - 22 && y % 9 == 4 {
                    b.set(x, y, cragHi)
                }
            }
        }
        for y in stride(from: 36, to: gy - 2, by: 6) {   // strata: slightly tilted bands with gaps
            let sl = (y % 12 != 0) ? 0.18 : -0.12
            for x in 0..<48 {
                let yy = jr(Double(y) + Double(x) * sl)
                if b.at(x, yy) == crag && (x + y) % 11 != 0 { b.set(x, yy, (y % 12 != 0) ? rock : deep) }
            }
        }
        for y in 31..<62 {
            let x = jr(14 - Double(y - 30) * 0.55)
            if b.at(x, y) == crag { b.set(x, y, cragHi) }
        }
        b.line(9, 36, 14, 30, cragHi)
        b.line(14, 30, 19, 36, deep)
        // cliff cracks
        b.line(22, 40, 24, 48, deep)
        b.line(24, 48, 22, 56, deep)
        b.line(6, 54, 8, 60, deep)

        // cave mouth with stalactite teeth, an inner arch and a rim
        let cx = 17, top = 62
        for y in top..<gy {
            var hw = 14
            if y < top + 9 {
                let dy = Double(top + 9 - y)
                hw = jr(max(0, 14.0 * 14.0 - dy * dy * 2.2).squareRoot())
            }
            b.hline(cx - hw, cx + hw, y, cave)
            b.set(cx - hw - 1, y, deep)
            b.set(cx + hw + 1, y, deep)
        }
        for y in (top + 3)..<gy {
            var hw = 9
            if y < top + 11 {
                let dy = Double(top + 11 - y)
                hw = max(0, jr(max(0, 81 - dy * dy * 1.6).squareRoot()))
            }
            b.hline(cx - hw, cx + hw, y, deep)
        }
        for y in (top + 6)..<gy {
            var hw = 5
            if y < top + 13 {
                let dy = Double(top + 13 - y)
                hw = max(0, jr(max(0, 25 - dy * dy * 1.4).squareRoot()))
            }
            b.hline(cx - hw, cx + hw, y, cave)
        }
        b.hline(cx - 9, cx + 9, top + 1, deep)
        for t in [[cx - 10, 4], [cx - 6, 3], [cx - 1, 5], [cx + 4, 3], [cx + 8, 4]] {
            let x = t[0], len = t[1]
            for k in 0..<len {
                let wd = len - k > 2 ? 1 : 0
                b.hline(x - wd, x + wd, top + 4 + k, crag)
            }
        }
        if hot { b.pts([[cx - 7, gy - 3], [cx - 6, gy - 2], [cx + 6, gy - 3], [cx + 5, gy - 2], [cx, gy - 2]], emb) }
    }

    private static func paintFore(_ b: inout CvB, _ period: SceneAmbient.Period) {
        // rocky floor: crumbly top edge, strata, rubble; glowing cracks at dusk and night
        for x in 0..<96 {
            b.set(x, gy, x % 4 == 1 ? crag : ground)
            b.set(x, gy + 1, ground)
            b.set(x, gy + 2, x % 3 == 0 ? crag : ground)
            b.set(x, gy + 3, dirt)
        }
        for x in 0..<96 {
            for y in (gy + 4)..<96 {
                if (x * 3 + y * 7) % 13 == 0 {
                    b.set(x, y, deep)
                } else if (x * 5 + y) % 19 == 0 {
                    b.set(x, y, ground)
                }
            }
        }
        for x in stride(from: 4, to: 96, by: 12) {
            b.hline(x, x + 5, gy + 5, deep)
            b.hline(x + 2, x + 8, gy + 4, ground)
        }
        // boulders and rubble standing on the floor
        for bo in ints("4 4, 90 5, 58 3, 35 2") {
            let cx = bo[0], r = bo[1]
            let fr = Double(r)
            b.ellipse(Double(cx), Double(gy) - fr * 0.4, fr * 1.3, fr, rock)
            b.ellipse(Double(cx - 1), Double(gy) - fr * 0.6, fr * 0.9, fr * 0.6, crag)
            b.hline(cx - r, cx + r, gy - 1, deep)
            b.set(cx - r, gy - r + 1, cragHi)
            b.set(cx - r + 1, gy - r, cragHi)
        }
        for p in ints("25 89, 27 89, 26 88, 46 89, 49 89, 48 88, 70 89, 73 89, 72 88, 82 89") {
            b.set(p[0], p[1], p[0] % 2 != 0 ? crag : rock)
        }
        if period == .dusk || period == .night {
            let nl = period == .night
            b.line(14, gy + 3, 20, gy + 5, lava)
            b.line(20, gy + 5, 26, gy + 4, lava)
            b.line(26, gy + 4, 30, gy + 6, lava)
            b.line(55, gy + 4, 62, gy + 5, lava)
            b.line(62, gy + 5, 66, gy + 3, lava)
            if nl {
                b.line(72, gy + 5, 80, gy + 4, lava)
                b.line(4, gy + 5, 10, gy + 4, lava)
                b.pts([[22, gy + 4], [58, gy + 5], [76, gy + 4]], emb)
            }
        }
    }

    /// Ash flakes falling slowly, embers rising from the crater, the plume, eye glints.
    private static func paintLive(_ b: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        let T = live.tick
        // smoke plume: puffs that rise from the crater, grow, thin and drift left
        for i in 0..<6 {
            let u = Double(((T >> 1) + i * 7) % 42)
            let x = Double(vx - 1) - u * 0.36 + sin(u / 5 + Double(i)) * 1.2
            let y = Double(vy - 3) - u * 0.62
            let r = 1.4 + u / 14
            if y > 4 {
                if u > 30 {
                    var yy = -r
                    while yy <= r {
                        var xx = -r
                        while xx <= r {
                            if xx * xx + yy * yy <= r * r && (jr(x + xx) + jr(y + yy)) % 2 == 0 { b.set(jr(x + xx), jr(y + yy), ash) }
                            xx += 1
                        }
                        yy += 1
                    }
                } else {
                    b.disc(Double(jr(x)), Double(jr(y)), r, ash)
                }
                if u < 20 { b.set(jr(x - r * 0.5), jr(y - r * 0.5), cloudShade) }
            }
        }
        // embers
        let n = period == .night ? 9 : (period == .dusk ? 6 : 3)
        for i in 0..<n {
            let u = Double(((T >> 1) + i * 5) % 30)
            if Int(u) % 3 == 1 { continue }
            b.set(jr(Double(vx - 5) + Double(i) * 1.6 + sin(u / 3 + Double(i)) * 3), jr(Double(vy - 2) - u * 0.8), emb)
        }
        // ash flakes
        for i in 0..<8 {
            let u = Double((T + i * 23) % 150)
            let x = (i * 29 + 10 + jr(u * 0.15)) % 96
            let y = 16 + Int(((u / 150) * 70).rounded(.down))
            b.set(x, y, ash)
        }
        // lava flicker: the flow shimmers
        if (T >> 2) % 2 == 0 {
            b.pts([[vx - 3, vy + 10], [vx - 6, vy + 24], [vx - 8, vy + 38]], emb)
        } else {
            b.pts([[vx - 4, vy + 15], [vx - 6, vy + 31], [vx + 4, vy + 13]], emb)
        }
        // eyes in the cave: yellow, with a slit, blinking now and then
        let e = (T >> 3) % 20
        if e < 15 || period == .night {
            let closed = e == 13
            for x in [12, 22] {
                if closed {
                    b.hline(x, x + 2, 78, emb)
                } else {
                    b.rect(x, 77, 3, 2, emb)
                    b.set(x + 1, 77, daisyC)
                    b.set(x + 1, 78, cave)
                }
            }
        }
    }

    static func back(_ period: SceneAmbient.Period, _ rain: Bool) -> [UInt8] {
        Biome96BCache.part(.crags, "back", period, rain) { paintBack(&$0, period) }
    }

    static func backdrop(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.blit(back(period, live.rain))
    }

    static func fore(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.occlude(back(period, live.rain))
        cv.blit(Biome96BCache.part(.crags, "fore", period, live.rain) { paintFore(&$0, period) })
        paintLive(&cv, period, live)
    }
}
