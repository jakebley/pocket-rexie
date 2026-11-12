import Foundation

// Bot workshop at 96x96 (always dark, indoors), a port of expo-prototype/src/ui/biome96/workshop.ts: riveted wall panels, a
// pegboard of tools, copper pipes with a steam leak, meshing gears, a vent fan, a monitor with scrolling lines, a control box
// with blinking LEDs, hanging cables and a grated floor. The outdoor sky is removed. Static art is cached; the animated bits
// are drawn per frame.

enum WorkshopB {
    private static let plate = SceneLayer.panel.rawValue
    private static let seam = SceneLayer.cable.rawValue
    private static let steel = SceneLayer.gear.rawValue
    private static let steelHi = SceneLayer.wall.rawValue
    private static let copper = SceneLayer.roof.rawValue
    private static let copperHi = SceneLayer.litter.rawValue
    private static let copperDk = SceneLayer.bark.rawValue
    private static let bench = SceneLayer.wood.rawValue
    private static let benchDk = SceneLayer.hole.rawValue
    private static let ground = SceneLayer.ground.rawValue
    private static let dirt = SceneLayer.dirt.rawValue
    private static let window = SceneLayer.window.rawValue
    private static let ledA = SceneLayer.ledA.rawValue
    private static let ledB = SceneLayer.ledB.rawValue
    private static let screen = SceneLayer.screen.rawValue
    private static let twinkle = SceneLayer.twinkle.rawValue
    private static let steam = SceneLayer.cloudShade.rawValue
    private static let gridline = SceneLayer.gridline.rawValue
    private static let gy = 90

    private static func panel(_ b: inout CvB, _ x: Int, _ y: Int, _ w: Int, _ h: Int) {
        b.rect(x, y, w, h, plate)
        b.hline(x, x + w - 1, y, steelHi)
        b.vline(x, y, y + h - 1, steelHi)
        b.hline(x, x + w - 1, y + h - 1, seam)
        b.vline(x + w - 1, y, y + h - 1, seam)
        let rivets: [[Int]] = [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]
        for p in rivets {
            b.set(p[0], p[1], steel)
            b.set(p[0] + 1, p[1] + 1, seam)
        }
    }

    private static func pipe(_ b: inout CvB, _ x0: Int, _ y0: Int, _ len: Int, _ thick: Int, vertical: Bool = false) {
        for k in 0..<len {
            for t in 0..<thick {
                let l: UInt8 = t == 0 ? copperHi : (t == thick - 1 ? copperDk : (t == 1 ? copperHi : copper))
                if vertical { b.set(x0 + t, y0 + k, l) } else { b.set(x0 + k, y0 + t, l) }
            }
        }
    }

    private static let wrench: [String] = [".XXX.", "X...X", "X...X", ".XXX.", "..X..", "..X..", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."]
    private static let hammer: [String] = ["XXXXXX", "XXXXXX", ".XXXX.", "..XX..", "..XX..", "..XX..", "..XX..", "..XX..", "..XX..", "..XX.."]
    private static let pliers: [String] = ["X...X", "XX.XX", ".XXX.", "..X..", ".X.X.", ".X.X.", "X...X", "X...X"]
    private static let saw: [String] = ["XXXXXXXXXXXXXX", ".X.X.X.X.X.X.X", "..............", "..............."]

    private static func ring2(_ b: inout CvB, _ cx: Int, _ cy: Int) {
        b.disc(Double(cx), Double(cy), 5, seam)
        b.disc(Double(cx), Double(cy), 3.6, plate)
        b.hline(cx - 5, cx + 5, cy, steel)
        b.vline(cx, cy - 5, cy + 5, steel)
        b.set(cx, cy, seam)
    }

    private static func drape(_ b: inout CvB, _ x0: Int, _ y0: Int, _ x1: Int, _ y1: Int, _ sag: Double) {
        if x1 <= x0 { return }
        var px0 = x0, py0 = y0
        for x in (x0 + 1)...x1 {
            let t = Double(x - x0) / Double(x1 - x0)
            let y = jr(Double(y0) + Double(y1 - y0) * t + sin(Double.pi * t) * sag)
            b.line(px0, py0, x, y, seam)
            px0 = x
            py0 = y
        }
    }

    private static func paintBack(_ b: inout CvB) {
        for x in [0, 33, 66] { panel(&b, x, 40, 31, 22) }
        for x in [0, 33, 66] { panel(&b, x, 63, 31, 27) }
        // pegboard with hanging tools and their shadows
        panel(&b, 3, 30, 27, 30)
        for y in stride(from: 33, to: 58, by: 4) {
            for x in stride(from: 6, to: 28, by: 4) { b.set(x, y, seam) }
        }
        func hang(_ rows: [String], _ x: Int, _ y: Int) {
            b.spr(rows, x + 1, y + 1, [UInt8(ascii: "X"): seam])
            b.spr(rows, x, y, [UInt8(ascii: "X"): steel])
        }
        hang(wrench, 7, 34)
        hang(hammer, 15, 34)
        hang(pliers, 22, 34)
        b.spr(saw, 7, 50, [UInt8(ascii: "X"): seam])
        b.spr(saw, 6, 49, [UInt8(ascii: "X"): steel])
        // ceiling pipe run with flanges, a drop on the right and a valve wheel
        pipe(&b, 36, 29, 60, 4)
        pipe(&b, 91, 33, 29, 4, vertical: true)
        for x in [46, 70, 86] {
            b.rect(x, 27, 4, 8, copperDk)
            b.rect(x + 1, 27, 2, 8, copper)
        }
        b.rect(88, 29, 8, 8, copperDk)
        b.rect(89, 30, 6, 6, copper)
        ring2(&b, 92, 50)
        // fan housing (the blades turn in live)
        b.disc(37, 47, 8, seam)
        b.disc(37, 47, 6.4, plate)
        // work bench on the right
        b.rect(54, 76, 42, 3, bench)
        b.hline(54, 95, 76, copperHi)
        b.hline(54, 95, 79, benchDk)
        b.rect(56, 80, 3, 10, seam)
        b.rect(91, 80, 3, 10, seam)
        b.rect(59, 81, 31, 8, benchDk)
        b.hline(59, 89, 81, seam)
        b.rect(62, 83, 10, 5, bench)
        b.rect(76, 83, 10, 5, bench)
        b.pts([[66, 85], [67, 85], [80, 85], [81, 85]], seam)
        b.rect(58, 70, 5, 6, steel)
        b.hline(58, 62, 70, steelHi)
        b.set(63, 72, steel)
        b.set(63, 73, steel)
        b.disc(59, 74, 2, steel)
        b.set(59, 74, seam)
        // monitor on the bench
        b.rect(67, 50, 26, 21, seam)
        b.hline(67, 92, 50, plate)
        b.rect(77, 71, 6, 3, seam)
        b.rect(73, 74, 14, 2, seam)
        // control box on the left, below the pegboard
        panel(&b, 3, 64, 22, 16)
        for k in 0..<4 { b.rect(5 + k * 5, 75, 3, 3, seam) }
        // cables
        drape(&b, 30, 36, 66, 36, 8)
        drape(&b, 0, 36, 3, 41, 4)
        drape(&b, 60, 62, 67, 66, 9)
        drape(&b, 20, 90, 3, 78, 4)
        b.rect(63, 58, 4, 4, steel)
        b.set(64, 59, seam)
        // a hanging lamp: shade, bulb (glows in all phases)
        b.vline(52, 0, 12, seam)
        b.rect(48, 13, 9, 3, copperDk)
        b.hline(49, 55, 13, copper)
        b.hline(50, 54, 12, copperDk)
        b.hline(50, 54, 16, window)
        b.hline(51, 53, 17, window)
        b.pts([[48, 18], [56, 18], [46, 20], [58, 20], [49, 21], [55, 21]], window)
    }

    private static func paintFore(_ b: inout CvB) {
        for x in 0..<96 {
            b.set(x, gy, steelHi)
            b.set(x, gy + 1, ground)
            b.set(x, gy + 2, ground)
            b.set(x, gy + 3, x % 6 == 0 ? seam : ground)
        }
        for y in (gy + 4)..<96 {
            for x in 0..<96 { b.set(x, y, (x + (y % 2) * 2) % 4 < 2 ? dirt : ground) }
        }
        for x in stride(from: 0, to: 96, by: 12) {
            b.vline(x, gy, gy + 3, seam)
            b.set(x + 2, gy + 1, steel)
            b.set(x + 9, gy + 1, steel)
        }
        for x in 0..<96 where x % 8 < 5 { b.set(x, gy + 5, gridline) }
        for x in 6..<46 { b.set(x, gy - 1 + jr(sin(Double(x) / 3.2)), seam) }
        for x in 62..<82 { b.set(x, gy - 2 - jr(sin(Double(x - 62) / 2.8)), seam) }
        b.pts([[50, gy - 1], [51, gy - 1], [52, gy - 1], [51, gy - 2], [30, gy - 1], [31, gy - 1], [32, gy - 1], [31, gy - 2]], steel)
    }

    private static func gear(_ b: inout CvB, _ cx: Double, _ cy: Double, _ R: Double, _ teeth: Double, _ rot: Double) {
        let ro = R + 2.2
        let r2 = ro * ro
        let y0 = Int((cy - ro).rounded(.down)), y1 = Int((cy + ro).rounded(.up))
        let x0 = Int((cx - ro).rounded(.down)), x1 = Int((cx + ro).rounded(.up))
        for y in y0...y1 {
            for x in x0...x1 {
                let dx = Double(x) - cx, dy = Double(y) - cy
                let d2 = dx * dx + dy * dy
                if d2 > r2 { continue }
                let d = d2.squareRoot()
                let a = atan2(dy, dx)
                let tc = cos(teeth * (a - rot))
                if d > R && !(tc > 0.1) { continue }
                if d > R + 1.4 && tc < 0.5 { continue }
                var l = steel
                if d < 2 {
                    l = seam
                } else if d < 3.4 {
                    l = steelHi
                } else if d > 3.8 && d < R - 2.4 && cos(4 * (a - rot)) > 0.3 {
                    l = plate
                } else if d > R - 1.6 && d <= R && dx + dy < 0 {
                    l = steelHi
                }
                b.set(x, y, l)
            }
        }
    }

    private static let leds = ints("6 67, 11 67, 16 67, 6 71, 11 71, 16 71")

    private static func paintLive(_ b: inout CvB, _ T: Int) {
        let r = Double(T) * 0.055
        gear(&b, 72, 17, 10, 14, r)
        gear(&b, 88, 12, 5.4, 8, -r * 14 / 8 + Double.pi / 8)
        // the fan: four blades
        let fa = Double(T) * 0.35
        for k in 0..<4 {
            let a = fa + Double(k) * Double.pi / 2
            for s in 1...5 {
                let ds = Double(s)
                b.set(jr(37 + cos(a) * ds), jr(47 + sin(a) * ds), steel)
                if s > 2 { b.set(jr(37 + cos(a + 0.35) * ds), jr(47 + sin(a + 0.35) * ds), steel) }
            }
        }
        b.set(37, 47, seam)
        // monitor: lines scroll up, a sparkline runs along the bottom, the cursor blinks
        b.rect(69, 52, 22, 17, screen)
        let sc = T >> 1
        for k in 0..<4 {
            let yy = 53 + ((((k * 3 - sc) % 12) + 12) % 12)
            let idx = k + ((sc - k * 3 + 120) / 12) * 4
            var x = 70 + (rndB(idx) > 0.7 ? 2 : 0)
            let end = 90 - Int((rndB(idx + 9) * 6).rounded(.down))
            while x < end {
                let w = 2 + Int((rndB(idx * 7 + x) * 5).rounded(.down))
                b.hline(x, min(end, x + w - 1), yy, seam)
                x += w + 2
            }
        }
        for x in 70..<90 {
            let wave = sin(Double(x + sc) / 2.6) * 1.6 + sin(Double(x + sc * 2) / 1.7) * 0.8
            b.set(x, 66 + jr(wave), ledA)
        }
        b.hline(69, 90, 64, seam)
        if (T >> 2) % 2 == 0 { b.rect(88, 55, 2, 2, seam) }
        // control box LEDs and a level meter
        for (i, p) in leds.enumerated() {
            let on = ((T >> 3) + i * 5 + (i % 2)) % 4 != 0
            let lit: UInt8 = (i % 3 == 1) ? ledB : ledA
            b.rect(p[0], p[1], 3, 2, on ? lit : seam)
        }
        for k in 0..<4 {
            let h = 1 + Int((rndB((T >> 2) + k * 5) * 3).rounded(.down))
            b.rect(5 + k * 5, 78 - h, 3, h, h > 2 ? ledB : ledA)
        }
        // a steam leak at the pipe flange
        for i in 0..<4 {
            let u = Double(((T >> 1) + i * 5) % 20)
            let x = 72 + jr(sin(u / 4 + Double(i)) * 1.5)
            let y = 27 - u * 0.9
            if y > 8 && u > 2 { b.disc(Double(x), Double(jr(y)), 0.9 + u / 9, steam) }
        }
        // lamp bulb flicker, and a spark from the loose cable now and then
        if (T >> 4) % 17 == 5 { b.hline(50, 54, 16, seam) }
        if (T >> 1) % 23 == 3 { b.pts([[63, 62], [62, 64], [65, 63]], twinkle) }
    }

    static func back(_ period: SceneAmbient.Period, _ rain: Bool) -> [UInt8] {
        Biome96BCache.part(.workshop, "back", period, rain) { paintBack(&$0) }
    }

    static func backdrop(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.blit(back(period, live.rain))
    }

    static func fore(_ cv: inout CvB, _ period: SceneAmbient.Period, _ live: BiomeLive) {
        cv.clearSky(back(period, live.rain))
        cv.blit(Biome96BCache.part(.workshop, "fore", period, live.rain) { paintFore(&$0) })
        paintLive(&cv, live.tick)
    }
}
