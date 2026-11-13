import Foundation

// Ember realm (spirits on the imp, horn and soot lines) at 96x96, a port of expo-prototype/src/ui/biome96/ember.ts: a glowing
// haze at the horizon, far volcanoes with lava streams and a smoking crater, rock spires with glowing cracks, a cracked floor
// with lava veins, rocks, ash drifts and bones. Embers rise, ash falls, the lava flickers and the smoke drifts.
// The colours are slot layers (Biome96BColors.ember).

enum EmberB {
    private enum K {
        static func c(_ n: String) -> UInt8 { BiomeSlots96.code(.ember, n) }
        static let lava = c("lava"), lavaHot = c("lavaHot"), ember = c("ember"), emberDim = c("emberDim"), glowRock = c("glowRock")
        static let rockFar = c("rockFar"), rockFar2 = c("rockFar2"), rock = c("rock"), rockDark = c("rockDark")
        static let rockLight = c("rockLight"), rockEdge = c("rockEdge"), crack = c("crack")
        static let ash = c("ash"), ashDark = c("ashDark"), ashLight = c("ashLight")
        static let soil = c("soil"), soilDark = c("soilDark"), soilLight = c("soilLight")
        static let smokeA = c("smokeA"), smokeB = c("smokeB"), glowHaze = c("glowHaze"), glowHaze2 = c("glowHaze2"), bone = c("bone")
    }
    private static let g = 90

    private static func spire(_ b: inout CvB, _ cx: Int, _ w: Int, _ h: Int, _ seed: Int, _ flip: Int) {
        for y in (g - h)..<g {
            let t = Double(y - (g - h)) / Double(h)
            let hw = Double(w) * (0.18 + t * 0.82) + sin(Double(y) * 0.7 + Double(seed)) * 0.8
            b.hline(jr(Double(cx) - hw), jr(Double(cx) + hw), y, K.rock)
            let l = jr(Double(cx) - hw * Double(flip)), r = jr(Double(cx) + hw * Double(flip))
            b.set(l, y, K.rockEdge)
            b.set(l + flip, y, K.rockLight)
            b.set(r, y, K.rockDark)
            b.set(r - flip, y, K.rockDark)
        }
        for i in 0..<5 {
            let y = g - h + 6 + Int((rndB(seed + i) * Double(h - 10)).rounded(.down))
            let x = cx + jr((rndB(seed + i + 20) - 0.5) * Double(w))
            b.vline(x, y, y + 3 + (i % 3), K.crack)
        }
    }

    private static func vtop(_ x: Int) -> Double { 54 + abs(Double(x - 66)) * 0.55 }

    private static func paintBack(_ b: inout CvB) {
        // glow at the horizon: dither bands
        for y in 56..<g {
            let k = Double(y - 56) / 34
            for x in 0..<96 where bayerB(x, y, k) { b.set(x, y, k > 0.55 ? K.glowHaze2 : K.glowHaze) }
        }
        // far volcano with a lava crater and streams
        b.ridge(to: g, K.rockFar) { x in (x > 40 && x < 92) ? vtop(x) : 99 }
        b.ridge(to: g, K.rockFar2) { x in x < 34 ? 64 + abs(Double(x - 12)) * 0.5 : 99 }
        b.hline(62, 70, 54, K.lava)
        b.hline(63, 69, 55, K.lavaHot)
        for c in ints("63 58, 68 73, 66 66") { b.line(c[0], 56, c[1], 76, K.lava) }
        for x in 40..<92 where jr(vtop(x)) < 70 && x % 3 == 0 { b.set(x, jr(vtop(x)), K.rockLight) }
        // a far lava river
        for x in 0..<96 {
            let y = 82 + jr(sin(Double(x) / 6) * 1.5)
            b.set(x, y, K.lava)
            if x % 2 != 0 { b.set(x, y + 1, K.emberDim) }
        }
        // spires, big ones at the edges
        spire(&b, 5, 8, 52, 1, 1)
        spire(&b, 17, 6, 34, 4, 1)
        spire(&b, 90, 8, 48, 7, -1)
        spire(&b, 79, 5, 30, 9, -1)
        spire(&b, 44, 5, 20, 12, 1)
        // glowing cracks in the spires
        for c in ints("4 52 6 62, 6 62 3 70, 3 70 6 80, 90 48 88 58, 88 58 91 66, 91 66 89 76, 17 66 18 74, 79 66 78 72") {
            b.line(c[0], c[1], c[2], c[3], K.glowRock)
        }
        // cinders on the spire tops
        for p in ints("5 40, 90 44, 17 58") {
            b.set(p[0], p[1], K.emberDim)
            b.set(p[0] + 1, p[1] + 1, K.ember)
        }
    }

    private static func paintFore(_ b: inout CvB) {
        // floor: dark ash soil with a ragged lit edge and lava veins
        b.rect(0, g, 96, 6, K.soil)
        for x in 0..<96 {
            b.set(x, g, x % 3 != 0 ? K.soilLight : K.rock)
            if x % 4 == 0 { b.set(x, g + 1, K.soilLight) }
        }
        for i in 0..<46 {
            let x = Int((rndB(i + 5) * 96).rounded(.down)), y = g + 2 + Int((rndB(i + 55) * 4).rounded(.down))
            b.hline(x, x + 1 + (i % 3), y, i % 3 != 0 ? K.soilDark : K.soilLight)
        }
        for x in [8, 30, 55, 80] {
            for k in 0..<6 {
                b.setD(Double(x + (k % 2 != 0 ? 1 : 0) + (k >> 2)), Double(g + 1) + Double(k) * 0.9, K.crack)
            }
        }
        // rocks and ash drifts
        for r in dbls("13 4, 38 3, 60 5, 86 3.5") {
            let x = r[0], rad = r[1]
            b.ball(x, Double(g - 1), rad + 1, rad * 0.8, K.rockDark, K.rock, K.rockLight)
            b.hline(Int(x) - 2, Int(x) + 2, g - 1, K.rockDark)
            b.pxr(x + 1, Double(g - 2) - rad * 0.6, K.glowRock)
        }
        for d in dbls("24 8, 70 9, 48 6") {
            let x = d[0], w = d[1]
            b.ell(x, Double(g - 1), w / 2, 2, K.ash)
            b.hlineD(x - w / 2 + 1, x + 1, g - 2, K.ashLight)
            b.hlineD(x, x + w / 2 - 1, g, K.ashDark)
        }
        // bones
        b.lineR(44, Double(g - 2), 50, Double(g - 4), K.bone)
        b.set(43, g - 3, K.bone)
        b.set(43, g - 1, K.bone)
        b.set(51, g - 5, K.bone)
        b.set(51, g - 3, K.bone)
        b.discA(92, Double(g - 3), 2.2, K.bone)
        b.set(91, g - 3, K.crack)
        b.set(93, g - 3, K.crack)
    }

    private static let veins = ints("8 92, 30 93, 55 92, 80 93, 20 94, 66 94")

    private static func paintLive(_ b: inout CvB, _ live: BiomeLive) {
        let T = live.tick
        let t = live.seconds
        // lava veins in the floor flicker between orange and yellow
        for (i, v) in veins.enumerated() {
            let x = v[0], y = v[1]
            let hot = ((T >> 1) + i) % 3 == 0
            b.hline(x, x + 4, y, hot ? K.lavaHot : K.lava)
            b.set(x + 5, y + 1, K.emberDim)
            b.set(x - 1, y - 1, hot ? K.lava : K.emberDim)
        }
        // crater smoke drifts up and to the right
        for i in 0..<6 {
            let u = (t * 3 + Double(i * 7)).truncatingRemainder(dividingBy: 42) / 42
            let y = Double(jr(52 - u * 34))
            let x = Double(jr(66 + u * 14 + sin(t + Double(i)) * 2))
            let r = 1.5 + u * 3
            b.ell(x, y, r, r * 0.8, i % 2 != 0 ? K.smokeA : K.smokeB)
        }
        // rising embers
        for i in 0..<12 {
            let u = (Double(T) * (1 + Double(i % 3) * 0.5) * 0.5 + Double(i * 13)).truncatingRemainder(dividingBy: 66)
            let y = jr(88 - u)
            let x = jr(Double(i * 8 + 3) + sin(Double(T) / 7 + Double(i)) * 2.5)
            b.set(x, y, u > 40 ? K.emberDim : K.ember)
            if i % 4 == 0 && u < 40 { b.set(x + 1, y, K.lavaHot) }
        }
        // falling ash
        for i in 0..<10 {
            b.set((i * 9 + (T >> 2)) % 96, 20 + (((T >> 1) + i * 13) % 66), i % 2 != 0 ? K.ash : K.ashLight)
        }
    }

    static func backdrop(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.blit(Biome96BCache.part(.ember, "back", period, live.rain) { paintBack(&$0) })
        paintLive(&cv, live)
    }

    static func fore(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.blit(Biome96BCache.part(.ember, "fore", period, live.rain) { paintFore(&$0) })
    }
}
