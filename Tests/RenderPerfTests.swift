import XCTest

/// Measures the scene renderer: a warm render of one adult per family, by day and night, dry and rainy, both
/// facings. Prints `RENDER-PERF ...` lines (CI greps them into the RenderPerf annotation). Manual timing with
/// ProcessInfo.systemUptime (no `measure`). The limits are very generous: this is a measurement, and a guard
/// against a 100x regression, not a benchmark gate.
final class RenderPerfTests: XCTestCase {
    private var utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    /// 09:00 UTC on a Monday.
    private let base = Date(timeIntervalSince1970: 1_767_603_600)

    private func makePet(_ sp: Species, seed: UInt64) -> Pet {
        var p = Pet(now: base)
        p.seed = seed
        p.stage = sp.stage
        p.species = sp.id
        p.family = sp.family
        p.hunger = 3
        p.happy = 3
        p.lastTick = base
        return p
    }

    private func seed(for weather: SceneAmbient.Weather) -> UInt64 {
        for s in 1...600 {
            if SceneAmbient(seed: UInt64(s), date: base, calendar: utc).weather == weather { return UInt64(s) }
        }
        return 1
    }

    private func adults() -> [Species] {
        var list: [Species] = []
        for fam in Species.families {
            if let sp = Species.all.first(where: { $0.family == fam.id && $0.stage == .adult }) { list.append(sp) }
        }
        return list
    }

    private func now() -> Double { ProcessInfo.processInfo.systemUptime }

    private func render(_ pet: Pet, hour: Int, facing: Int, offset: Double) -> SceneRaster {
        var state = SceneState.still(for: pet)
        state.x = 16
        state.facing = facing
        var options = SceneRenderOptions()
        options.calendar = utc
        let date = base.addingTimeInterval(Double(hour - 9) * 3600 + offset)
        return SceneRenderer.render(pet: pet, state: state, date: date, options: options)
    }

    func testRenderCost() {
        let dry = seed(for: .clear), wet = seed(for: .rain)
        let species = adults()
        XCTAssertGreaterThanOrEqual(species.count, 10)
        var combos: [(Pet, Int, Int)] = []
        for sp in species {
            for hour in [12, 23] {
                for rainy in [false, true] {
                    combos.append((makePet(sp, seed: rainy ? wet : dry), hour, rainy ? -1 : 1))
                }
            }
        }
        // cold: the first render of each combination (shading, backdrop and palette caches fill)
        let c0 = now()
        for (p, h, f) in combos { _ = render(p, hour: h, facing: f, offset: 0) }
        let coldMs = (now() - c0) * 1000 / Double(combos.count)
        // warm: the same scenes at other moments (animation, blink and drift move on); mirrored too
        var times: [Double] = []
        var lit = 0
        for rep in 1...6 {
            for (p, h, f) in combos {
                let facing = rep % 2 == 0 ? -f : f
                let t0 = now()
                let r = render(p, hour: h, facing: facing, offset: Double(rep) * 0.375)
                times.append((now() - t0) * 1000)
                lit += r.inkCount
            }
        }
        XCTAssertGreaterThan(lit, 0)
        times.sort()
        let mean = times.reduce(0, +) / Double(times.count)
        let p95 = times[min(times.count - 1, Int(Double(times.count) * 0.95))]
        let worst = times[times.count - 1]
        print("RENDER-PERF mean=\(String(format: "%.3f", mean)) p95=\(String(format: "%.3f", p95)) max=\(String(format: "%.3f", worst)) cold=\(String(format: "%.3f", coldMs)) n=\(times.count) (ms)")
        XCTAssertLessThan(mean, 100, "a warm scene render takes \(mean) ms")
    }

    /// Palette tables are rebuilt on every Technicolor frame by the painter: time the 13 biomes x day and night.
    func testPaletteTableCost() {
        func all() {
            for biome in Biome.allCases {
                for (period, hour) in [(SceneAmbient.Period.day, 12), (.night, 23)] {
                    _ = ScenePalette.table(mode: .technicolor, appearance: .light, night: biome.isDark(period), line: .meat,
                                           bodyHex: "#C27358", biome: biome, period: period, rain: hour == 23)
                    _ = ScenePalette.sky(mode: .technicolor, appearance: .light, hour: hour, weather: .clear, biome: biome)
                }
            }
        }
        all()
        let n = 20
        let t0 = now()
        for _ in 0..<n { all() }
        let perTable = (now() - t0) * 1000 / Double(n * Biome.allCases.count * 2)
        print("RENDER-PERF palette-table=\(String(format: "%.4f", perTable)) ms/table")
        XCTAssertLessThan(perTable, 50)
    }
}
