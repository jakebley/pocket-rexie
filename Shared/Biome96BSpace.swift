import Foundation

// Alien space at 96x96 (always dark), a port of expo-prototype/src/ui/biome96/space.ts: a starfield in two brightnesses with a
// twinkle, two dim nebula smudges, a big banded ringed planet, a cratered moon, lunar hills with pits, a landed saucer with
// blinking lights, glowing crystal clusters and shooting stars. The outdoor sky is removed; everything static is cached.

enum SpaceB {
    private static let star = SceneLayer.starfield.rawValue
    private static let dimStar = SceneLayer.cloudShade.rawValue
    private static let neb1 = SceneLayer.hill.rawValue
    private static let neb2 = SceneLayer.sand.rawValue
    private static let pl = SceneLayer.planet.rawValue
    private static let plDk = SceneLayer.planetShade.rawValue
    private static let ring = SceneLayer.crag.rawValue
    private static let ringDk = SceneLayer.rock.rawValue
    private static let moon = SceneLayer.hull.rawValue
    private static let crater = SceneLayer.crater.rawValue
    private static let hull = SceneLayer.hull.rawValue
    private static let crys = SceneLayer.crystal.rawValue
    private static let crysDk = SceneLayer.gridline.rawValue
    private static let daisy = SceneLayer.daisy.rawValue
    private static let coralA = SceneLayer.coralA.rawValue
    private static let stalac = SceneLayer.stalac.rawValue
    private static let hill = SceneLayer.hill.rawValue
    private static let crag = SceneLayer.crag.rawValue
    private static let rock = SceneLayer.rock.rawValue
    private static let ground = SceneLayer.ground.rawValue
    private static let dirt = SceneLayer.dirt.rawValue
    private static let window = SceneLayer.window.rawValue
    private static let ledA = SceneLayer.ledA.rawValue
    private static let ledB = SceneLayer.ledB.rawValue
    private static let twinkle = SceneLayer.twinkle.rawValue
    private static let gy = 90
    private static let ppx = 66, ppy = 34   // planet centre
    private static let sx = 76, sy = 70     // saucer

    private static func ringArc(_ b: inout CvB, front: Bool) {
        for k in 0..<400 {
            let a = Double(k) / 400 * Double.pi * 2
            let sn = sin(a)
            if (sn >= 0) != front { continue }
            let rings: [(Double, UInt8)] = [(24, ring), (22.5, ring), (20.5, ringDk)]
            for (rr, l) in rings {
                let x = jr(Double(ppx) + cos(a) * rr)
                let y = jr(Double(ppy) + sn * rr * 0.2 + cos(a) * rr * 0.16)
                if front || hypot(Double(x - ppx), Double(y - ppy)) > 14.5 { b.set(x, y, l) }
            }
        }
    }

    private static func planet(_ b: inout CvB) {
        ringArc(&b, front: false)
        b.disc(Double(ppx), Double(ppy), 14, pl)
        for y in (ppy - 14)...(ppy + 14) {
            for x in (ppx - 14)...(ppx + 14) {
                let dx = Double(x - ppx), dy = Double(y - ppy)
                if dx * dx + dy * dy > 14 * 14 + 0.5 { continue }
                let band = Int(((dy + 14 + sin(dx / 6) * 1.2) / 4.5).rounded(.down))
                var l: UInt8 = band % 2 == 0 ? pl : coralA   // soft belts
                let lit = dx * 0.6 + dy * 0.8
                if lit > 6.5 {
                    l = plDk   // shadowed limb
                } else if lit > 4.6 && (x + y) % 2 == 0 {
                    l = plDk
                }
                if dx < -9 && dy < -4 && (x + y) % 3 == 0 { l = daisy }   // light on the lit limb
                b.set(x, y, l)
            }
        }
        ringArc(&b, front: true)
        // the ring's shadow across the planet
        for x in (ppx - 12)..<(ppx + 12) {
            let y = jr(Double(ppy + 2) + Double(x - ppx) * 0.03)
            if (x + y) % 2 == 0 { b.set(x, y + 3, plDk) }
        }
    }

    private static func crystal(_ b: inout CvB, _ x: Int, _ base: Int, _ w: Int, _ h: Int) {
        // hexagonal prism with a pointed tip: lit left facet, darker right facet, bright edge
        let tip = base - h
        let fw = Double(w)
        for y in tip..<base {
            let t = Double(y - tip) / Double(h)
            let hw: Double = Double(y - tip) < fw * 0.8 ? Double(jr((Double(y - tip) / (fw * 0.8)) * (fw / 2))) : fw / 2
            for xx in jr(Double(x) - hw)...jr(Double(x) + hw) {
                b.set(xx, y, Double(xx) > Double(x) + 0.5 ? crysDk : crys)
            }
            if t > 0.1 && (y - tip) % 5 == 3 { b.set(jr(Double(x) - hw), y, daisy) }
        }
        b.vline(x, tip + 2, base - 2, crys)
        b.setD(Double(x - 1), Double(tip) + fw * 0.9, daisy)   // the Expo call has a fractional row, so it draws nothing
    }

    private static let crystalsLeft = ints("7 90 7 34, 14 90 5 22, 20 90 4 14, 2 90 4 18, 11 90 3 10")

    private static func paintBack(_ b: inout CvB, _ period: SceneAmbient.Period) {
        // nebula: two dithered smudges, very dim
        for n in ints("22 30 26 11 1, 74 62 24 9 2, 52 20 16 5 1") {
            let cx = n[0], cy = n[1], rx = n[2], ry = n[3]
            let l = n[4] == 1 ? neb1 : neb2
            for y in (cy - ry)...(cy + ry) {
                for x in (cx - rx)...(cx + rx) {
                    let d = hypot(Double(x - cx) / Double(rx), Double(y - cy) / Double(ry))
                    if d < 1 && ((d < 0.55 && (x + y) % 2 == 0) || (d < 0.85 && x % 2 == 0 && y % 2 == 0)) { b.set(x, y, l) }
                }
            }
        }
        // stars: dim, bright, and a few with crosses
        for i in 0..<120 {
            let x = Int((rndB(i + 7) * 96).rounded(.down)), y = 1 + Int((rndB(i + 91) * 70).rounded(.down))
            b.set(x, y, i % 3 == 0 ? star : dimStar)
            if i % 17 == 0 { b.pts([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], dimStar) }
        }
        planet(&b)
        // the moon: a lit disc with pits
        b.disc(30, 36, 6, moon)
        for y in 30...42 {
            for x in 24...36 {
                let dx = Double(x - 30), dy = Double(y - 36)
                if dx * 0.7 + dy * 0.7 > 3.2 && dx * dx + dy * dy <= 36 { b.set(x, y, rock) }
            }
        }
        for c in dbls("28 34 1.6, 32 39 1.2, 27 38 1") { b.disc(c[0], c[1], c[2], crater) }
        // lunar hills: two layers, craters with a bright rim
        for x in 0..<96 {
            let fx = Double(x)
            let h = jr(76 + 3 * sin(fx / 11 + 1) + 1.5 * sin(fx / 4))
            b.vline(x, h, gy - 1, hill)
            b.set(x, h, crag)
        }
        for x in 0..<96 {
            let fx = Double(x)
            let h = jr(82 + 3 * sin(fx / 8 + 4) + 1.5 * sin(fx / 3.1))
            b.vline(x, h, gy - 1, rock)
            b.set(x, h, crag)
            if x % 3 == 0 { b.set(x, h + 1, crag) }
        }
        for c in ints("44 84 7, 20 86 5, 82 85 6") {
            let x = c[0], y = c[1], rx = c[2]
            b.ellipse(Double(x), Double(y), Double(rx), 2, crater)
            b.hline(x - rx + 1, x + rx - 1, y - 2, crag)
            b.hline(x - rx + 2, x + rx - 2, y - 1, crater)
        }
        // a landed saucer on the right: legs, flat hull with a shaded belly and a rim, glass dome, lit windows
        for dx in [-12, 0, 12] {
            let off = dx > 0 ? 3 : (dx < 0 ? -3 : 0)
            b.line(sx + dx, sy + 10, sx + dx + off, gy - 1, hull)
            b.hline(sx + dx - 2 + off, sx + dx + 2 + off, gy - 1, hull)
        }
        b.ellipse(Double(sx), Double(sy + 5), 19, 5, hull)
        b.ellipse(Double(sx), Double(sy) + 7.5, 16, 3, plDk)
        b.hline(sx - 17, sx + 17, sy + 4, daisy)
        b.hline(sx - 15, sx + 15, sy + 5, stalac)
        b.ellipse(Double(sx), Double(sy - 1), 8, 6, crysDk)
        b.ellipse(Double(sx - 2), Double(sy - 3), 4, 2.6, crys)
        for y in (sy - 7)..<(sy + 2) {
            for x in (sx - 8)...(sx + 8) where b.at(x, y) == crysDk && x > sx + 3 && (x + y) % 2 == 0 { b.set(x, y, stalac) }
        }
        b.set(sx - 3, sy - 4, daisy)
        b.set(sx - 2, sy - 5, daisy)
        b.vline(sx, sy - 12, sy - 7, hull)
        b.set(sx, sy - 13, ledB)
        for dx in [-11, -4, 4, 11] { b.rect(sx + dx - 1, sy + 3, 3, 2, window) }
        // glowing crystals on the left: prisms of different heights and their glow
        for c in crystalsLeft {
            let x = c[0], base = c[1], w = c[2], h = c[3]
            let hw = Double(w) / 2
            for dy in -4..<(h + 1) {
                for dx in (-w - 4)..<(w + 5) {
                    let yy = base - h + dy, xx = x + dx
                    if yy < 8 || yy >= gy || xx < 0 { continue }
                    let inside = abs(Double(dx)) < hw + 1 && dy >= 0
                    if !inside && (dx + dy) % 6 == 0 && dx % 2 == 0 && abs(Double(dx)) < hw + 3 && (period != .day || (dx + dy) % 12 == 0) {
                        b.set(xx, yy, crysDk)
                    }
                }
            }
        }
        for c in crystalsLeft { crystal(&b, c[0], c[1], c[2], c[3]) }
    }

    private static func paintFore(_ b: inout CvB) {
        // moon dust floor with a lit lip, pits and small crystals
        for x in 0..<96 {
            b.set(x, gy, x % 2 != 0 ? crag : ground)
            b.set(x, gy + 1, ground)
            b.set(x, gy + 2, ground)
            b.set(x, gy + 3, x % 3 == 0 ? dirt : ground)
        }
        for x in 0..<96 {
            for y in (gy + 4)..<96 {
                b.set(x, y, (x * 7 + y * 5) % 9 == 0 ? crater : ((x + y) % 6 == 0 ? ground : dirt))
            }
        }
        for p in ints("30 6, 58 8, 8 5") {
            b.ellipse(Double(p[0]), Double(gy + 3), Double(p[1]), 1.4, crater)
            b.hline(p[0] - p[1] + 1, p[0] + p[1] - 1, gy + 1, crag)
        }
        for x in [38, 52, 64, 28] {
            b.hline(x, x + 2, gy - 1, rock)
            b.set(x, gy - 2, crag)
            b.set(x + 1, gy - 2, rock)
        }
        for p in ints("44 4, 90 5, 60 3") {
            let x = p[0], h = p[1]
            b.vline(x, gy - h, gy - 1, crys)
            b.vline(x + 1, gy - h + 1, gy - 1, crysDk)
            b.set(x, gy - h - 1, crys)
        }
    }

    private static func paintLive(_ b: inout CvB, _ live: BiomeLive) {
        let T = live.tick
        // twinkle: bright stars blink and flare in turn
        for i in 0..<14 {
            let x = Int((rndB(i * 3 + 200) * 96).rounded(.down)), y = 2 + Int((rndB(i * 3 + 300) * 62).rounded(.down))
            if hypot(Double(x - ppx), Double(y - ppy)) < 26 { continue }
            let ph = ((T >> 2) + i * 3) % 6
            if ph == 0 { continue }
            b.set(x, y, twinkle)
            if ph == 3 || ph == 4 { b.pts([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], twinkle) }
        }
        // shooting stars: one every ~8 s, a shower in the rain
        let meteors = live.rain ? 3 : 1
        for m in 0..<meteors {
            let cyc = live.rain ? 52 : 70
            let base = (T >> 1) + m * 19
            let u = base % cyc
            if u < 12 {
                let x0 = Double(8 + ((m * 41 + (base / cyc) * 23) % 56)), y0 = Double(6 + m * 9)
                for k in 0..<7 {
                    let t = Double(u) - Double(k) * 0.9
                    if t < 0 { continue }
                    b.set(jr(x0 + t * 4), jr(y0 + t * 1.9), k < 2 ? daisy : twinkle)
                }
            }
        }
        // the saucer's rim lights chase, the antenna blinks, a crystal tip glints
        for i in 0..<6 {
            let on = ((T >> 2) + i) % 6
            b.set(sx - 15 + i * 6, sy + 6 + (i % 2), on == 0 ? ledA : (on == 3 ? ledB : hull))
        }
        b.set(sx, sy - 13, ((T >> 3) % 3) == 0 ? ledB : hull)
        if ((T >> 3) % 5) == 1 { b.pts([[7, 49], [6, 50], [8, 50], [7, 51]], daisy) }
        // the planet's ring glints
        if ((T >> 4) % 6) == 2 { b.pts([[ppx + 21, ppy + 2], [ppx + 22, ppy + 2]], daisy) }
    }

    static func back(_ period: SceneAmbient.Period, _ rain: Bool) -> [UInt8] {
        Biome96BCache.part(.space, "back", period, rain) { paintBack(&$0, period) }
    }

    static func backdrop(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.blit(back(period, live.rain))
    }

    static func fore(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.clearSky(back(period, live.rain))
        cv.blit(Biome96BCache.part(.space, "fore", period, live.rain) { paintFore(&$0) })
        paintLive(&cv, live)
    }
}
