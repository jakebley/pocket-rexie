import Foundation

// Open sky (bird) at 96x96, a port of expo-prototype/src/ui/biome96/sky.ts: far mountains, hazy and green hills with field
// patches, a layered cloud bank, drifting clouds and far birds, and a branch floor with leaf sprigs and a twig nest holding
// speckled eggs. The clouds, birds and a feather move. The colours are slot layers (Biome96BColors.sky).

enum SkyB {
    private enum K {
        static func c(_ n: String) -> UInt8 { BiomeSlots96.code(.sky, n) }
        static let mount = c("mount"), mountLight = c("mountLight"), hillFar = c("hillFar"), hillMid = c("hillMid")
        static let fieldA = c("fieldA"), fieldB = c("fieldB")
        static let treeDark = c("treeDark"), tree = c("tree"), treeLight = c("treeLight")
        static let cloudHi = c("cloudHi"), cloudMid = c("cloudMid"), cloudShade = c("cloudShade")
        static let branchDark = c("branchDark"), branch = c("branch"), branchLight = c("branchLight"), bark = c("bark")
        static let straw = c("straw"), strawDark = c("strawDark"), strawLight = c("strawLight")
        static let egg = c("egg"), eggSpot = c("eggSpot"), farBird = c("farBird"), feather = c("feather")
    }
    private static let g = 90

    /// A puffy bank: a row of balls with shaded undersides.
    private static func bank(_ b: inout CvB, _ y: Double, _ seed: Int, _ r: Double, _ hi: UInt8, _ mid: UInt8, _ shade: UInt8) {
        let n = Int((96 / (r * 1.3)).rounded(.up)) + 1
        for i in 0..<n {
            let x = Double(i) * r * 1.3 - 3
            let rr = r * (0.7 + rndB(seed + i) * 0.5)
            let yy = y - rndB(seed + i + 40) * r * 0.7
            b.ball(x, yy, rr, rr * 0.8, shade, mid, hi)
        }
        let top = jr(y) + 1
        b.rect(0, top, 96, g - jr(y) - 1, mid)
    }

    private static func mountTop(_ x: Int) -> Double {
        let fx = Double(x)
        return 50 + 7 * abs(sin(fx / 19 + 0.6)) + 2.5 * sin(fx / 4.1)
    }

    private static func greenTop(_ x: Int) -> Double {
        let fx = Double(x)
        return 70 + 3.5 * sin(fx / 8 + 3) + 1.5 * sin(fx / 2.9)
    }

    private static func paintBack(_ b: inout CvB) {
        b.ridge(to: g, K.mount) { mountTop($0) }
        for x in 0..<96 {
            let t = jr(mountTop(x))
            if t < 54 && x % 2 == 0 {
                b.set(x, t, K.mountLight)
                b.set(x + 1, t + 1, K.mountLight)
                b.set(x, t + 1, K.mountLight)
            }
        }
        b.ridge(to: g, K.hillFar) { x in 62 + 4 * sin(Double(x) / 11 + 1) + 2 * sin(Double(x) / 3.3) }
        b.ridge(to: g, edge: K.treeLight, K.hillMid) { greenTop($0) }
        // field patches and tiny trees on the green hill
        for x in 0..<96 {
            let t = jr(greenTop(x))
            if t + 2 >= g - 6 { continue }
            for y in (t + 2)..<(g - 6) {
                let q = (x >> 3) + (y >> 2)
                if q % 2 == 0 && (x + y) % 3 != 0 {
                    b.set(x, y, K.fieldA)
                } else if q % 3 == 1 {
                    b.set(x, y, K.fieldB)
                }
            }
        }
        for i in 0..<12 {
            let x = 4 + i * 8 + (i % 3)
            b.clump(Double(x), Double(jr(greenTop(x)) - 1), 3, i * 9, K.treeDark, K.tree, K.treeLight, 3)
        }
        // one cloud bank in front of the hills, with a lighter wisp above
        bank(&b, 83, 1, 7, K.cloudHi, K.cloudMid, K.cloudShade)
        for w in ints("56 28 9, 68 29 5, 76 27 10, 60 34 13, 76 35 8") {
            b.hline(w[0], w[0] + w[2], w[1], K.cloudMid)
            b.hline(w[0] + 2, w[0] + w[2] - 2, w[1] + 1, K.cloudMid)
        }
    }

    private static func sprig(_ b: inout CvB, _ x: Int, _ y: Int, _ dir: Int, _ len: Int, _ seed: Int) {
        let fx = Double(x), fy = Double(y), d = Double(dir), l = Double(len)
        b.lineR(fx, fy, fx + d * l * 0.6, fy - l, K.branchDark)
        b.lineR(fx + 1, fy, fx + 1 + d * l * 0.6, fy - l, K.branch)
        let tx = fx + d * l * 0.6, ty = fy - l
        b.clump(tx, ty, 6, seed * 17 + 3, K.treeDark, K.tree, K.treeLight, 6)
        b.clump(fx + d * l * 0.3, fy - l * 0.5, 4, seed * 5 + 1, K.treeDark, K.tree, K.treeLight, 4)
        b.leaf(tx, ty, tx + d * 8, ty + 2, 2.2, K.tree, K.treeDark)
    }

    private static func paintFore(_ b: inout CvB) {
        // the branch: lit top, shaded belly, grain, knots
        for y in (g - 1)..<96 {
            let l: UInt8 = y <= g ? K.branchLight : (y < 93 ? K.branch : (y < 95 ? K.bark : K.branchDark))
            b.hline(0, 95, y, l)
        }
        for i in 0..<60 {
            let x = Int((rndB(i) * 96).rounded(.down)), y = g + 1 + Int((rndB(i + 60) * 5).rounded(.down))
            b.hline(x, x + 2 + (i % 4), y, i % 2 != 0 ? K.branchDark : K.branchLight)
        }
        for x in [20, 55, 88] {
            b.ell(Double(x), Double(g + 3), 2.4, 2, K.branchDark)
            b.ell(Double(x) + 0.3, Double(g + 3), 1.2, 1, K.bark)
        }
        // sprigs rising at both edges
        sprig(&b, 2, g - 1, 1, 22, 0)
        sprig(&b, 15, g - 1, 1, 11, 1)
        sprig(&b, 94, g - 1, -1, 24, 2)
        sprig(&b, 84, g - 1, -1, 12, 1)
        sprig(&b, 40, g - 1, 1, 6, 0)
        // nest with eggs: a woven bowl, a rim of twigs, three speckled eggs
        let nx = 55, ny = g - 8
        b.ell(Double(nx + 12), Double(ny + 6), 13, 5.5, K.strawDark)
        for i in 0..<26 {
            let x = nx + i - 1
            let d = abs(Double(x - (nx + 12))) / 13
            if d < 1 { b.set(x, ny + 3 + jr(d * d * 4), i % 2 != 0 ? K.strawLight : K.straw) }
        }
        for ex in [nx + 7, nx + 12, nx + 17] {
            b.ell(Double(ex), Double(ny + 2), 2.4, 3.2, K.egg)
            b.set(ex - 1, ny + 1, K.eggSpot)
            b.set(ex + 1, ny + 3, K.eggSpot)
            b.set(ex, ny, K.cloudHi)
            b.set(ex - 1, ny + 3, K.eggSpot)
        }
        for y in 0..<5 {
            for x in 0..<25 {
                let dx = (Double(x) - 12) / 12.5, dy = (Double(y) - 1.5) / 3.2
                if dx * dx + dy * dy < 1 && dy > -0.2 {
                    let l: UInt8 = (x + y) % 3 == 0 ? K.strawLight : ((x * 3 + y) % 4 == 0 ? K.strawDark : K.straw)
                    b.set(nx + x, ny + 4 + y, l)
                }
            }
        }
        for i in 0..<9 {
            b.line(nx + 1 + i * 3, ny + 8, nx + i * 3 + (i % 2 != 0 ? 4 : -2), ny + 3 - (i % 3), i % 2 != 0 ? K.strawLight : K.strawDark)
        }
    }

    private static func cloud(_ b: inout CvB, _ x: Double, _ y: Double, _ sc: Double) {
        b.ball(x + 8 * sc, y, 5 * sc, 4 * sc, K.cloudShade, K.cloudMid, K.cloudHi)
        b.ball(x + 15 * sc, y - 3 * sc, 6 * sc, 5 * sc, K.cloudShade, K.cloudMid, K.cloudHi)
        b.ball(x + 23 * sc, y, 5 * sc, 4 * sc, K.cloudShade, K.cloudMid, K.cloudHi)
        b.rect(jr(x + 8 * sc), jr(y), jr(15 * sc), jr(4.2 * sc), K.cloudMid)
        b.hline(jr(x + 6 * sc), jr(x + 25 * sc), jr(y + 4.5 * sc), K.cloudShade)
    }

    private static func wrap(_ v: Double, _ span: Double) -> Double {
        (v.truncatingRemainder(dividingBy: span) + span).truncatingRemainder(dividingBy: span) - 24
    }

    private static let vShapes: [[String]] = [["x.x", ".x."], ["xxx", "..."]]

    private static func paintLive(_ b: inout CvB, _ live: BiomeLive) {
        let d = live.seconds
        let seed = live.seed
        cloud(&b, wrap(Double(seed % 64) + d * 0.9, 130), 36, 1.1)
        cloud(&b, wrap(Double((seed * 3) % 64) + 50 + d * 1.4, 130), 58, 0.85)
        // far birds: three small Vs flapping
        let fl = live.seconds == 0 ? 0 : Int((live.seconds * 2.5).rounded(.down)) % 2
        for i in 0..<3 {
            let x = jr(wrap(Double(20 + i * 17) + d * 2.2, 150))
            let y = 48 + i * 5 + jr(sin(d / 2 + Double(i)) * 2)
            let rows = vShapes[(fl + i) % 2]
            for (j, row) in rows.enumerated() {
                var k = 0
                for ch in row.utf8 {
                    if ch == UInt8(ascii: "x") { b.set(x + k, y + j, K.farBird) }
                    k += 1
                }
            }
        }
        // a feather drifts down
        let u = (d * 3 + 20).truncatingRemainder(dividingBy: 80)
        let fx = Double(jr(20 + sin(d / 1.7) * 9 + u * 0.4)), fy = Double(jr(18 + u * 0.8))
        b.lineR(fx, fy, fx + 2, fy + 1, K.feather)
        b.set(Int(fx) + 3, Int(fy) + 1, K.cloudShade)
    }

    static func backdrop(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.blit(Biome96BCache.part(.sky, "back", period, live.rain) { paintBack(&$0) })
        paintLive(&cv, live)
    }

    static func fore(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.blit(Biome96BCache.part(.sky, "fore", period, live.rain) { paintFore(&$0) })
    }
}
