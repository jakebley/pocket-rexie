import XCTest
import SwiftUI
import WidgetKit

/// Renders the real SwiftUI views to PNGs with `ImageRenderer` so the UI can be looked at.
/// Output goes to $RENDER_OUT (default: the temporary directory); CI publishes it to the
/// `ci-screenshots` branch. The tests only assert that every image rendered and is not blank.
@MainActor
final class UIRenderTests: XCTestCase {
    // MARK: setup

    private static let outRoot: URL = {
        if let path = ProcessInfo.processInfo.environment["RENDER_OUT"], !path.isEmpty {
            return URL(fileURLWithPath: path, isDirectory: true)
        }
        return URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true).appendingPathComponent("renders")
    }()

    private var savedZone: TimeZone!

    override func setUp() {
        super.setUp()
        savedZone = NSTimeZone.default
        NSTimeZone.default = TimeZone(identifier: "UTC")!
        try? FileManager.default.createDirectory(at: Self.outRoot, withIntermediateDirectories: true)
    }

    override func tearDown() {
        NSTimeZone.default = savedZone
        super.tearDown()
    }

    /// 2026-03-04 14:00 UTC, a Wednesday afternoon. Multiples of 0.6 s keep animation frames aligned.
    private let day = Date(timeIntervalSince1970: 1_772_632_800)
    /// 2026-03-05 02:00 UTC.
    private let night = Date(timeIntervalSince1970: 1_772_676_000)

    // MARK: pets

    private func pet(_ stage: Stage, _ species: String, at now: Date, ageHours: Double = 20,
                     name: String = "Rexie", edit: (inout Pet) -> Void = { _ in }) -> Pet {
        var p = Pet(now: now.addingTimeInterval(-ageHours * 3600))
        p.seed = 4242
        p.name = name
        p.named = true
        p.stage = stage
        p.species = species
        p.lastTick = now
        p.modified = now
        p.hunger = 3
        p.happy = 3
        p.weight = p.baseWeight
        if !species.isEmpty { p.dex = [species] }
        edit(&p)
        return p
    }

    private struct Scenario {
        let name: String
        let pet: Pet
        let clock: Date
        var setup: (GameModel) -> Void = { _ in }
    }

    private func scenarios() -> [Scenario] {
        let discoveredDex = ["pip", "rawr", "sprig", "fang", "chomper", "tyrannox"]
        var list: [Scenario] = []
        list.append(Scenario(name: "01-egg", pet: pet(.egg, "", at: day, ageHours: 0.05) { $0.named = false }, clock: day))
        // Hatching alternates a crack frame and the baby every 0.6 s: render both.
        for (i, offset) in [0.0, 0.6].enumerated() {
            let clock = day.addingTimeInterval(offset)
            list.append(Scenario(name: "02-hatched-\(i == 0 ? "a" : "b")",
                                 pet: pet(.baby, "pip", at: clock, ageHours: 0.05) { $0.named = true },
                                 clock: clock) { $0.hatchedAt = clock.addingTimeInterval(-1) })
        }
        list.append(Scenario(name: "03-child-hungry",
                             pet: pet(.child, "rawr", at: day, ageHours: 20) {
                                 $0.hunger = 0; $0.call = .hungry; $0.callSince = day
                             }, clock: day))
        list.append(Scenario(name: "04-adult-asleep-night-light-off",
                             pet: pet(.adult, "chomper", at: night, ageHours: 200) {
                                 $0.asleep = true; $0.lightOn = false
                             }, clock: night))
        list.append(Scenario(name: "05-adult-asleep-night-light-on",
                             pet: pet(.adult, "chomper", at: night, ageHours: 200) {
                                 $0.asleep = true; $0.lightOn = true; $0.lightTicks = 4; $0.call = .light
                             }, clock: night))
        list.append(Scenario(name: "06-sick-3-poops",
                             pet: pet(.teen, "fang", at: day, ageHours: 60) {
                                 $0.sick = true; $0.poops = 3; $0.call = .sick; $0.hunger = 2; $0.happy = 1
                             }, clock: day))
        for (i, offset) in [0.0, 0.6].enumerated() {
            let clock = day.addingTimeInterval(offset + 0.05)
            list.append(Scenario(name: "07-evolved-flash-\(i == 0 ? "a" : "b")",
                                 pet: pet(.teen, "fang", at: day, ageHours: 40),
                                 clock: clock) { $0.evolutionFlash = (from: "rawr", to: "fang") })
        }
        list.append(Scenario(name: "08-feed-menu",
                             pet: pet(.child, "rawr", at: day), clock: day) {
            $0.selected = .feed; $0.mode = .feedMenu; $0.menuIndex = 1
        })
        list.append(Scenario(name: "09-play-guess",
                             pet: pet(.child, "rawr", at: day), clock: day) {
            $0.selected = .play
            $0.mode = .play(GameModel.PlayState(round: 2, shown: 4, revealed: nil, wins: 1, lastWin: false, pickHigher: true))
        })
        list.append(Scenario(name: "10-play-revealed",
                             pet: pet(.child, "rawr", at: day), clock: day) {
            $0.selected = .play
            $0.mode = .play(GameModel.PlayState(round: 5, shown: 4, revealed: 8, wins: 3, lastWin: true, pickHigher: false))
        })
        list.append(Scenario(name: "11-stats-status",
                             pet: pet(.adult, "chomper", at: day, ageHours: 200) { $0.discipline = 60; $0.hunger = 2 },
                             clock: day) {
            $0.selected = .stats; $0.mode = .stats; $0.statsPage = 0
        })
        list.append(Scenario(name: "12-stats-detail",
                             pet: pet(.adult, "chomper", at: day, ageHours: 200) {
                                 $0.legacy = ["Pip the Nubb: 9d, a full happy life", "Dot the Rawr: 3d, went hungry too long"]
                                 $0.stageMeat = 12; $0.stageVeg = 3; $0.stagePasta = 4; $0.battles = 7; $0.wins = 5
                                 $0.smarts = 12; $0.discipline = 45; $0.careMistakes = 2; $0.stageTrain = 6
                             }, clock: day) {
            $0.selected = .stats; $0.mode = .stats; $0.statsPage = 1
        })
        list.append(Scenario(name: "13-stats-longname",
                             pet: pet(.adult, "noodlemancer", at: day, ageHours: 300, name: "Bartholomew") {
                                 $0.generation = 12; $0.stage = .adult; $0.species = "noodlemancer"
                             }, clock: day) {
            $0.selected = .stats; $0.mode = .stats; $0.statsPage = 0
        })
        list.append(Scenario(name: "14-dex",
                             pet: pet(.adult, "chomper", at: day, ageHours: 200) { $0.dex = discoveredDex },
                             clock: day) {
            $0.selected = .stats; $0.mode = .dex
        })
        list.append(Scenario(name: "15-dead",
                             pet: pet(.ghost, "chomper", at: day, ageHours: 200) {
                                 $0.causeOfDeath = "went hungry too long"; $0.diedAt = day
                             }, clock: day))
        list.append(Scenario(name: "16-message-long",
                             pet: pet(.child, "rawr", at: day), clock: day) {
            $0.message = "WHILE YOU WERE AWAY: Rexie napped, made 2 messes and got hungry"
        })
        list.append(Scenario(name: "17-happy-fed",
                             pet: pet(.child, "sprig", at: day) { $0.hunger = 4; $0.happy = 4; $0.poops = 1 },
                             clock: day) { $0.selected = .light })
        list.append(Scenario(name: "18-too-warm-evening",
                             pet: pet(.teen, "dash", at: day.addingTimeInterval(5 * 3600), ageHours: 50) {
                                 $0.temp = 2; $0.call = .hot
                             }, clock: day.addingTimeInterval(5 * 3600)) { $0.selected = .climate })
        return list
    }

    // MARK: biomes

    /// One adult of every family (and an ember spirit) at `clock`, for the biome sheets.
    private func biomePets(at clock: Date) -> [(String, Pet)] {
        var list: [(String, Pet)] = []
        for fam in Species.families {
            guard let sp = Species.all.first(where: { $0.family == fam.id && $0.stage == .adult }) else { continue }
            let id = fam.id
            list.append((id, pet(.adult, sp.id, at: clock, ageHours: 200) { $0.family = id }))
        }
        list.append(("ember", pet(.adult, "spirits_emberhorn", at: clock, ageHours: 200) { $0.family = "spirits" }))
        return list
    }

    private func biomeTile(_ pet: Pet, clock: Date, palette: LCDPalette, side: CGFloat) -> AnyView {
        let model = GameModel(pet: pet, persist: { _ in })
        let view = LCDScreen(model: model, framed: true)
            .padding(6)
            .background(palette.background)
            .environment(\.lcdPalette, palette)
            .environment(\.sceneDate, clock)
            .environment(\.displayScale, 2)
            .frame(width: side, height: side)
        return AnyView(view)
    }

    /// Every family's background (docs/BIOMES.md) by day and by night: a contact sheet per look plus single tiles in
    /// Technicolor, to compare with expo-prototype/docs/screens/biomes-*.png.
    func testRenderBiomes() {
        let side: CGFloat = 250
        let cols = 4
        for (label, clock) in [("day", day), ("night", night)] {
            let pets = biomePets(at: clock)
            let looks: [(ColorMode, ColorScheme)] = [(.technicolor, .light), (.technicolor, .dark), (.traditional, .light)]
            for (mode, scheme) in looks {
                let palette = LCDStyle.palette(for: scheme, mode: mode)
                let tiles: [AnyView] = pets.map { biomeTile($0.1, clock: clock, palette: palette, side: side) }
                let rows = (tiles.count + cols - 1) / cols
                let sheet = VStack(spacing: 4) {
                    ForEach(0..<rows, id: \.self) { row in
                        HStack(spacing: 4) {
                            ForEach(0..<cols, id: \.self) { col in
                                if row * cols + col < tiles.count {
                                    tiles[row * cols + col]
                                } else {
                                    Color.clear.frame(width: side, height: side)
                                }
                            }
                        }
                    }
                }
                .background(palette.background)
                let name = "\(mode.rawValue)-\(scheme == .dark ? "dark" : "light")-\(label)"
                write(sheet, to: "biomes/sheet-\(name)",
                      size: CGSize(width: side * CGFloat(cols) + 4 * CGFloat(cols - 1), height: side * CGFloat(rows) + 4 * CGFloat(rows - 1)))
            }
            let palette = LCDStyle.palette(for: .light, mode: .technicolor)
            for (family, p) in pets {
                write(biomeTile(p, clock: clock, palette: palette, side: 358), to: "biomes/tile-\(family)-\(label)",
                      size: CGSize(width: 358, height: 358))
            }
        }
    }

    // MARK: phone scene checks (egg, fox, weather, every family's baby)

    /// A moment at `hour` UTC on a day whose weather for the render seed (4242) is `weather`.
    private func moment(_ weather: SceneAmbient.Weather, hour: Int) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let start = cal.startOfDay(for: day)
        for d in 0..<60 {
            let t = start.addingTimeInterval(Double(d) * 86400 + Double(hour) * 3600)
            if SceneAmbient(seed: 4242, date: t, calendar: cal).weather == weather { return t }
        }
        return start.addingTimeInterval(Double(hour) * 3600)
    }

    private func sceneTile(_ pet: Pet, clock: Date, palette: LCDPalette, side: CGFloat) -> AnyView {
        let model = GameModel(pet: pet, persist: { _ in })
        let view = LCDScreen(model: model, framed: true)
            .padding(6)
            .background(palette.background)
            .environment(\.lcdPalette, palette)
            .environment(\.sceneDate, clock)
            .environment(\.displayScale, 2)
            .frame(width: side, height: side)
        return AnyView(view)
    }

    /// The pets the owner flagged, in clear, rain and night, in both looks: single tiles under `scenes/`.
    func testRenderSceneChecks() {
        let looks: [(String, ColorMode, ColorScheme)] = [("tech-light", .technicolor, .light), ("tech-dark", .technicolor, .dark),
                                                         ("trad", .traditional, .light)]
        let moments: [(String, Date)] = [("clear", moment(.clear, hour: 12)), ("cloudy", moment(.cloudy, hour: 12)),
                                         ("rain", moment(.rain, hour: 12)), ("night", moment(.clear, hour: 23))]
        for (look, mode, scheme) in looks {
            let palette = LCDStyle.palette(for: scheme, mode: mode)
            for (mname, clock) in moments {
                let pets: [(String, Pet)] = [
                    ("egg", pet(.egg, "", at: clock, ageHours: 0.05) { $0.named = false }),
                    ("fox-kit", pet(.baby, "dewkit", at: clock, ageHours: 2) { $0.family = "fox" }),
                    ("fox-child", pet(.child, "scamp", at: clock, ageHours: 20) { $0.family = "fox" }),
                    ("fox-teen", pet(.teen, "tracker", at: clock, ageHours: 60) { $0.family = "fox" }),
                ]
                for (name, p) in pets {
                    write(sceneTile(p, clock: clock, palette: palette, side: 358), to: "scenes/\(look)/\(name)-\(mname)",
                          size: CGSize(width: 358, height: 358))
                }
            }
            // every family's baby, one contact sheet per look, in clear weather and in rain
            for (mname, clock) in [("clear", moments[0].1), ("rain", moments[2].1)] {
                var tiles: [AnyView] = []
                for fam in Species.families {
                    guard let sp = Species.all.first(where: { $0.family == fam.id && $0.stage == .baby }) else { continue }
                    let id = fam.id
                    tiles.append(sceneTile(pet(.baby, sp.id, at: clock, ageHours: 2) { $0.family = id }, clock: clock,
                                           palette: palette, side: 250))
                }
                let cols = 4
                let all = tiles
                let rows = (all.count + cols - 1) / cols
                let sheet = VStack(spacing: 4) {
                    ForEach(0..<rows, id: \.self) { row in
                        HStack(spacing: 4) {
                            ForEach(0..<cols, id: \.self) { col in
                                if row * cols + col < all.count { all[row * cols + col] } else { Color.clear.frame(width: 250, height: 250) }
                            }
                        }
                    }
                }
                .background(palette.background)
                write(sheet, to: "scenes/\(look)/babies-\(mname)",
                      size: CGSize(width: 250 * CGFloat(cols) + 4 * CGFloat(cols - 1), height: 250 * CGFloat(rows) + 4 * CGFloat(rows - 1)))
            }
        }
    }

    // MARK: output

    private func write<V: View>(_ view: V, to relative: String, size: CGSize, scale: CGFloat = 2,
                                file: StaticString = #filePath, line: UInt = #line) {
        let renderer = ImageRenderer(content: view.frame(width: size.width, height: size.height))
        renderer.scale = scale
        guard let image = renderer.uiImage, let data = image.pngData() else {
            XCTFail("no image for \(relative)", file: file, line: line)
            return
        }
        XCTAssertGreaterThan(data.count, 2000, "\(relative) looks blank", file: file, line: line)
        let url = Self.outRoot.appendingPathComponent(relative + ".png")
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try data.write(to: url)
        } catch {
            XCTFail("could not write \(url.path): \(error)", file: file, line: line)
        }
    }

    // MARK: phone

    private struct Phone {
        let name: String
        let size: CGSize
        let top: CGFloat
        let bottom: CGFloat
    }

    private let phones = [
        Phone(name: "390x844", size: CGSize(width: 390, height: 844), top: 59, bottom: 34),
        Phone(name: "375x667", size: CGSize(width: 375, height: 667), top: 20, bottom: 0),
    ]

    /// Renders land in `ios/...` (Traditional, as always) and `ios-technicolor/...`.
    private func folder(_ base: String, _ mode: ColorMode) -> String {
        mode == .traditional ? base : base + "-" + mode.rawValue
    }

    private func phoneView(_ sc: Scenario, phone: Phone, scheme: ColorScheme,
                           mode: ColorMode = .traditional) -> some View {
        let model = GameModel(pet: sc.pet, persist: { _ in })
        sc.setup(model)
        let ground = LCDStyle.palette(for: scheme, mode: mode).background
        return ZStack {
            ground
            ContentView(model: model, clock: sc.clock, colorMode: mode)
                .padding(.top, phone.top)
                .padding(.bottom, phone.bottom)
        }
        .environment(\.colorScheme, scheme)
        .environment(\.displayScale, 2)
    }

    func testRenderPhoneScreens() {
        for mode in ColorMode.allCases {
            for phone in phones {
                for scheme in [ColorScheme.light, .dark] {
                    let schemeName = scheme == .dark ? "dark" : "light"
                    for sc in scenarios() {
                        write(phoneView(sc, phone: phone, scheme: scheme, mode: mode),
                              to: "\(folder("ios", mode))/\(phone.name)/\(schemeName)/\(sc.name)", size: phone.size)
                    }
                }
            }
        }
    }

    // MARK: widgets

    private func widgetPets() -> [(String, Pet)] {
        [
            ("child-hungry", pet(.child, "rawr", at: day) { $0.hunger = 1; $0.call = .hungry }),
            ("child-fine", pet(.child, "sprig", at: day) { $0.hunger = 4; $0.happy = 3 }),
            ("sick-poops", pet(.teen, "fang", at: day, ageHours: 60) {
                $0.sick = true; $0.poops = 3; $0.call = .sick; $0.hunger = 2; $0.happy = 1
            }),
            ("adult-asleep", pet(.adult, "chomper", at: night, ageHours: 200) { $0.asleep = true; $0.lightOn = false }),
            ("egg", pet(.egg, "", at: day, ageHours: 0.05)),
            ("dead", pet(.ghost, "chomper", at: day, ageHours: 200) { $0.causeOfDeath = "was sick too long" }),
        ]
    }

    private func widgetView(_ pet: Pet, family: WidgetFamily, size: CGSize, dark: Bool,
                            mode: ColorMode = .traditional) -> some View {
        let entry = PetEntry(date: pet.lastTick, pet: pet, mode: mode)
        let isAccessory = family == .accessoryCircular || family == .accessoryRectangular || family == .accessoryInline
        let palette = LCDStyle.palette(for: dark ? .dark : .light, mode: mode)
        return ZStack {
            if isAccessory {
                // Lock screen look: a dark wallpaper with vibrant white content.
                LinearGradient(colors: [Color(white: 0.18), Color(white: 0.32)], startPoint: .top, endPoint: .bottom)
            } else {
                // The widget host draws containerBackground; ImageRenderer does not, so draw it here.
                RetroBackdrop(palette: palette)
            }
            PocketRexieWidgetView(entry: entry, familyOverride: family)
                .foregroundStyle(isAccessory ? Color.white : Color.primary)
        }
        .frame(width: size.width, height: size.height)
        // Home screen widgets are clipped to a continuous rounded rectangle.
        .clipShape(RoundedRectangle(cornerRadius: isAccessory ? 0 : 22, style: .continuous))
        .environment(\.colorScheme, dark || isAccessory ? .dark : .light)
    }

    func testRenderWidgets() {
        let families: [(String, WidgetFamily, CGSize)] = [
            ("small", .systemSmall, CGSize(width: 170, height: 170)),
            ("small-compact", .systemSmall, CGSize(width: 141, height: 141)),
            ("medium", .systemMedium, CGSize(width: 364, height: 170)),
            ("medium-compact", .systemMedium, CGSize(width: 321, height: 148)),
            ("large", .systemLarge, CGSize(width: 364, height: 382)),
            ("accessoryRectangular", .accessoryRectangular, CGSize(width: 172, height: 76)),
            ("accessoryCircular", .accessoryCircular, CGSize(width: 76, height: 76)),
            ("accessoryInline", .accessoryInline, CGSize(width: 257, height: 26)),
            // The same views at the sizes the watch complications get.
            ("watchCircular", .accessoryCircular, CGSize(width: 50, height: 50)),
            ("watchRectangular", .accessoryRectangular, CGSize(width: 160, height: 68)),
        ]
        for (label, pet) in widgetPets() {
            for (famName, family, size) in families {
                for dark in [false, true] {
                    // Accessory families look the same in both schemes.
                    if dark && (famName.hasPrefix("accessory") || famName.hasPrefix("watch")) { continue }
                    write(widgetView(pet, family: family, size: size, dark: dark),
                          to: "widgets/\(famName)/\(dark ? "dark" : "light")/\(label)", size: size, scale: 3)
                }
            }
        }
    }

    /// The same home screen widgets in Technicolor (accessory families stay ink-only, tinted by the system).
    func testRenderTechnicolorWidgets() {
        let families: [(String, WidgetFamily, CGSize)] = [
            ("small", .systemSmall, CGSize(width: 170, height: 170)),
            ("medium", .systemMedium, CGSize(width: 364, height: 170)),
            ("large", .systemLarge, CGSize(width: 364, height: 382)),
        ]
        for (label, pet) in widgetPets() {
            for (famName, family, size) in families {
                for dark in [false, true] {
                    write(widgetView(pet, family: family, size: size, dark: dark, mode: .technicolor),
                          to: "widgets-technicolor/\(famName)/\(dark ? "dark" : "light")/\(label)", size: size, scale: 3)
                }
            }
        }
    }

    // MARK: watch

    func testRenderWatch() {
        let sizes = [CGSize(width: 184, height: 224), CGSize(width: 162, height: 197)]
        for mode in ColorMode.allCases {
          // Technicolor: one size is enough to judge the colors.
          for size in sizes where mode == .traditional || size.width == 184 {
            for dark in [false, true] {
                for sc in scenarios() where !sc.name.contains("-b") {
                    let model = GameModel(pet: sc.pet, persist: { _ in })
                    sc.setup(model)
                    let view = ZStack(alignment: .top) {
                        Color.black
                        WatchContentView(model: model, palette: LCDStyle.palette(for: dark ? .dark : .light, mode: mode))
                    }
                    .environment(\.colorScheme, .dark)
                    .environment(\.sceneDate, sc.clock)
                    .environment(\.displayScale, 2)
                    write(view, to: "\(folder("watch", mode))/\(Int(size.width))x\(Int(size.height))/\(dark ? "dark" : "light")/\(sc.name)", size: size)
                }
            }
          }
        }
    }

    /// The bare LCD screens at the sizes the widgets and watch use, without any chrome.
    func testRenderLCDOnly() {
        for mode in ColorMode.allCases {
            for scheme in [ColorScheme.light, .dark] {
                for sc in scenarios() {
                    let model = GameModel(pet: sc.pet, persist: { _ in })
                    sc.setup(model)
                    let palette = LCDStyle.palette(for: scheme, mode: mode)
                    let view = LCDScreen(model: model, framed: true)
                        .padding(8)
                        .background(palette.background)
                        .environment(\.lcdPalette, palette)
                        .environment(\.sceneDate, sc.clock)
                        .environment(\.displayScale, 2)
                    write(view, to: "\(folder("lcd", mode))/\(scheme == .dark ? "dark" : "light")/\(sc.name)",
                          size: CGSize(width: 358, height: 358))
                }
            }
        }
    }

    // MARK: play (docs/PLAY.md)

    private static let playScenes = ["menu", "ready", "game-a", "game-b", "over", "result", "scores", "hilo", "hilo-reveal"]

    /// One adult of a family, for the Play sheets.
    private func playPet(_ fam: String) -> Pet {
        let sp = Species.all.first { $0.family == fam && $0.stage == .adult } ?? Species.all[0]
        return pet(.adult, sp.id, at: day, ageHours: 200) { $0.family = fam; $0.name = "Rexie"; $0.smarts = 20 }
    }

    /// A model showing one Play screen: the menu, a game at a given moment, the result or HIGH SCORES.
    private func playModel(_ scene: String, _ p: Pet) -> GameModel {
        let model = GameModel(pet: p, persist: { _ in })
        model.selected = .play
        model.scoreStore.submit("catch", MiniScoreEntry(score: 41, rank: 3, name: "MOCHI", species: "fennec_x", speciesName: "Fennec", date: 0))
        model.scoreStore.submit("catch", MiniScoreEntry(score: 24, rank: 2, name: p.name, species: p.species, speciesName: p.speciesName, date: 0))
        model.scoreStore.submit("hilo", MiniScoreEntry(score: 5, rank: 3, name: "MOCHI", species: "fennec_x", speciesName: "Fennec", date: 0))
        switch scene {
        case "menu":
            model.playSel = 1
            model.mode = .playMenu
        case "scores":
            model.scoresPage = 1
            model.mode = .scores
        case "hilo", "hilo-reveal":
            let s = MiniSession(def: HiLoGame.def, params: MiniTuning.params(for: p, game: "hilo"), seed: 4)
            s.begin()
            if scene == "hilo-reveal" {
                s.pending = GameInput(left: true)
                _ = s.tick(50)
                s.pending = GameInput(act: true)
                _ = s.tick(50)
            }
            model.present(s)
        default:
            let params = MiniTuning.params(for: p, game: "catch")
            let s = MiniSession(def: CatchGame.def, params: params, seed: 4)
            if scene != "ready" {
                s.begin()
                let bot = CatchBot(skill: CatchBot.Skill(react: 250, noise: 2, miss: 0.1, careful: true, vp: CatchGame.dims(params).vp), seed: 2)
                let until: Double = scene == "game-a" ? 9000 : 16000
                var t: Double = 0
                while s.phase == .play && (scene == "over" || scene == "result" || t < until) {
                    if let g = s.game { s.pending = bot.decide(g, t) }
                    _ = s.tick(50)
                    t += 50
                }
                if scene == "result" {
                    while !s.tick(100) {}
                    var pp = model.pet
                    s.settle(pet: &pp, store: model.scoreStore, now: day.timeIntervalSince1970)
                    model.pet = pp
                }
            }
            model.present(s)
        }
        return model
    }

    private func playTile(_ scene: String, _ p: Pet, palette: LCDPalette, side: CGFloat) -> AnyView {
        let model = playModel(scene, p)
        let view = LCDScreen(model: model, framed: true)
            .padding(4)
            .background(palette.background)
            .environment(\.lcdPalette, palette)
            .environment(\.sceneDate, day)
            .environment(\.displayScale, 2)
            .frame(width: side, height: side)
        return AnyView(view)
    }

    /// The Play menu, ready, CATCH mid-game (twice), time up, result and HIGH SCORES, and HI-LO, for every family in both looks.
    /// Compare with expo-prototype/docs/screens/play-technicolor-*.png and play-catch-technicolor.png.
    func testRenderPlayScreens() {
        let side: CGFloat = 130
        let scenes = Self.playScenes
        let families = Species.families.map { $0.id }
        for mode in ColorMode.allCases {
            let palette = LCDStyle.palette(for: .light, mode: mode)
            var index = 0
            var start = 0
            while start < families.count {
                let group = Array(families[start..<min(start + 4, families.count)])
                index += 1
                let sheet = VStack(spacing: 3) {
                    ForEach(group, id: \.self) { fam in
                        HStack(spacing: 3) {
                            ForEach(scenes, id: \.self) { scene in
                                self.playTile(scene, self.playPet(fam), palette: palette, side: side)
                            }
                        }
                    }
                }
                .background(palette.background)
                write(sheet, to: "play/sheet-\(mode.rawValue)-\(index)",
                      size: CGSize(width: side * CGFloat(scenes.count) + 3 * CGFloat(scenes.count - 1),
                                   height: side * CGFloat(group.count) + 3 * CGFloat(group.count - 1)))
                start += 4
            }
            // CATCH mid-game of every family, larger (the Expo play-catch sheet)
            let big: CGFloat = 200
            let cols = 6
            let rows = (families.count + cols - 1) / cols
            let catchSheet = VStack(spacing: 4) {
                ForEach(0..<rows, id: \.self) { row in
                    HStack(spacing: 4) {
                        ForEach(0..<cols, id: \.self) { col in
                            let i = row * cols + col
                            if i < families.count {
                                self.playTile("game-b", self.playPet(families[i]), palette: palette, side: big)
                            } else {
                                Color.clear.frame(width: big, height: big)
                            }
                        }
                    }
                }
            }
            .background(palette.background)
            write(catchSheet, to: "play/catch-\(mode.rawValue)",
                  size: CGSize(width: big * CGFloat(cols) + 4 * CGFloat(cols - 1), height: big * CGFloat(rows) + 4 * CGFloat(rows - 1)))
        }
        // single large tiles of one pet: the menu with its favourite star, a game, the result, the scores
        let palette = LCDStyle.palette(for: .light, mode: .technicolor)
        for scene in ["menu", "ready", "game-b", "result", "scores"] {
            write(playTile(scene, playPet("fox"), palette: palette, side: 358), to: "play/fox-\(scene)-technicolor",
                  size: CGSize(width: 358, height: 358))
        }
    }

    // MARK: ECHO scenes (compare with expo-prototype/docs/screens/echo-technicolor-1.png and echo-traditional.png)

    private static let echoScenes = ["intro", "show", "input", "ok", "oops", "five", "result"]

    /// A model showing ECHO at one moment, driven by the perfect bot (the same one the tests use).
    private func echoModel(_ scene: String, _ p: Pet) -> GameModel {
        let model = GameModel(pet: p, persist: { _ in })
        model.selected = .play
        let params = MiniTuning.params(for: p, game: "echo")
        let s = MiniSession(def: EchoGame.def, params: params, seed: 6)
        s.begin()
        let bot = EchoBot(skill: "perfect", seed: 6)
        var t: Double = 0
        func g() -> EchoGame? { s.game as? EchoGame }
        func run(until stop: (EchoState) -> Bool) {
            var n = 0
            while s.phase == .play && n < 4000 {
                if let game = g(), stop(game.state) { return }
                if let game = g() { s.pending = bot.decide(game, t) }
                _ = s.tick(50)
                t += 50
                n += 1
            }
        }
        switch scene {
        case "intro":
            run(until: { $0.phase == .intro && $0.phaseMs >= 100 })
        case "show":
            run(until: { $0.phase == .show && $0.shown >= 2 && $0.lit >= 0 })
        case "input":
            run(until: { $0.phase == .input && $0.entered >= 1 && $0.pressed >= 0 })
        case "ok":
            run(until: { $0.phase == .ok && $0.phaseMs >= 200 })
        case "oops":
            run(until: { $0.phase == .input && $0.entered >= 1 })
            if let game = g() {
                let want = game.state.pattern[game.state.entered]
                s.pending = want == 0 ? GameInput(right: true) : GameInput(left: true)
                _ = s.tick(50)
                for _ in 0..<4 { _ = s.tick(50) }
            }
        case "five":
            run(until: { $0.round >= 6 && $0.phase == .input && $0.entered >= 2 && $0.pressed >= 0 })
        default:
            run(until: { _ in false })
            while !s.tick(100) {}
            var pp = model.pet
            s.settle(pet: &pp, store: model.scoreStore, now: day.timeIntervalSince1970)
            model.pet = pp
        }
        model.present(s)
        return model
    }

    private func echoTile(_ scene: String, _ p: Pet, palette: LCDPalette, side: CGFloat) -> AnyView {
        let model = echoModel(scene, p)
        let view = LCDScreen(model: model, framed: true)
            .padding(4)
            .background(palette.background)
            .environment(\.lcdPalette, palette)
            .environment(\.sceneDate, day)
            .environment(\.displayScale, 2)
            .frame(width: side, height: side)
        return AnyView(view)
    }

    /// ECHO: intro, show, input, ok, oops, a five-pad round and the result, one pet per family, both looks; plus large tiles of one pet.
    func testRenderEchoScreens() {
        let side: CGFloat = 130
        let scenes = Self.echoScenes
        let families = Species.families.map { $0.id }
        for mode in ColorMode.allCases {
            let palette = LCDStyle.palette(for: .light, mode: mode)
            for (index, start) in [0, 6].enumerated() {
                let group = Array(families[start..<min(start + 6, families.count)])
                let sheet = VStack(spacing: 3) {
                    ForEach(group, id: \.self) { fam in
                        HStack(spacing: 3) {
                            ForEach(scenes, id: \.self) { scene in
                                self.echoTile(scene, self.playPet(fam), palette: palette, side: side)
                            }
                        }
                    }
                }
                .background(palette.background)
                write(sheet, to: "echo/sheet-\(mode.rawValue)-\(index + 1)",
                      size: CGSize(width: side * CGFloat(scenes.count) + 3 * CGFloat(scenes.count - 1),
                                   height: side * CGFloat(group.count) + 3 * CGFloat(group.count - 1)))
            }
            for scene in scenes {
                write(echoTile(scene, playPet("fox"), palette: palette, side: 358), to: "echo/fox-\(scene)-\(mode.rawValue)",
                      size: CGSize(width: 358, height: 358))
            }
        }
    }

    // MARK: DASH renders (compare with expo-prototype/docs/screens/play-dash-technicolor.png and play-dash-closeup.png)

    private static let dashScenes = ["countdown", "run", "jump", "hit", "faster", "result"]

    /// A model showing DASH at a moment: the countdown, a run, mid-jump, just after a hit, the FASTER banner or the result.
    private func dashModel(_ scene: String, _ p: Pet) -> GameModel {
        let model = GameModel(pet: p, persist: { _ in })
        model.selected = .play
        let params = MiniTuning.params(for: p, game: "dash")
        let s = MiniSession(def: DashGame.def, params: params, seed: 5)
        s.begin()
        guard let g = s.game as? DashGame else { return model }
        let bot = DashBot(tuning: params.tuning, skill: DashBot.good, seed: 2)
        func tick(_ input: GameInput) { s.pending = input; _ = s.tick(50) }
        var guardN = 0
        switch scene {
        case "countdown":
            while g.state.cd > 900 { tick(GameInput()) }
        case "run":
            while g.state.t < 6000 && guardN < 2000 { tick(bot.decide(g)); guardN += 1 }
        case "jump":
            while !(g.state.t > 7000 && !g.state.grounded && g.state.hp > 6) && guardN < 2000 { tick(bot.decide(g)); guardN += 1 }
        case "hit":
            while g.state.cd > 0 { tick(GameInput()) }
            while g.state.hits == 0 && guardN < 2000 { tick(GameInput()); guardN += 1 }
            for _ in 0..<3 { tick(GameInput()) }
        case "faster":
            while g.state.t < 13500 && guardN < 2000 { tick(bot.decide(g)); guardN += 1 }
        default:
            while s.phase == .play && guardN < 4000 { tick(bot.decide(g)); guardN += 1 }
            if scene == "result" {
                while !s.tick(100) {}
                var pp = model.pet
                s.settle(pet: &pp, store: model.scoreStore, now: day.timeIntervalSince1970)
                model.pet = pp
            }
        }
        model.present(s)
        return model
    }

    private func dashTile(_ scene: String, _ p: Pet, palette: LCDPalette, side: CGFloat) -> AnyView {
        let model = dashModel(scene, p)
        let view = LCDScreen(model: model, framed: true)
            .padding(4)
            .background(palette.background)
            .environment(\.lcdPalette, palette)
            .environment(\.sceneDate, day)
            .environment(\.displayScale, 2)
            .frame(width: side, height: side)
        return AnyView(view)
    }

    /// DASH for every family in both looks: countdown, run, mid-jump, hit, FASTER banner, result.
    func testRenderDashScreens() {
        let side: CGFloat = 130
        let scenes = Self.dashScenes
        let families = Species.families.map { $0.id }
        for mode in ColorMode.allCases {
            let palette = LCDStyle.palette(for: .light, mode: mode)
            var index = 0
            var start = 0
            while start < families.count {
                let group = Array(families[start..<min(start + 4, families.count)])
                index += 1
                let sheet = VStack(spacing: 3) {
                    ForEach(group, id: \.self) { fam in
                        HStack(spacing: 3) {
                            ForEach(scenes, id: \.self) { scene in
                                self.dashTile(scene, self.playPet(fam), palette: palette, side: side)
                            }
                        }
                    }
                }
                .background(palette.background)
                write(sheet, to: "dash/sheet-\(mode.rawValue)-\(index)",
                      size: CGSize(width: side * CGFloat(scenes.count) + 3 * CGFloat(scenes.count - 1),
                                   height: side * CGFloat(group.count) + 3 * CGFloat(group.count - 1)))
                start += 4
            }
            // a mid-run tile of every family, larger (the Expo play-dash-technicolor sheet)
            let big: CGFloat = 200
            let cols = 6
            let rows = (families.count + cols - 1) / cols
            let runSheet = VStack(spacing: 4) {
                ForEach(0..<rows, id: \.self) { row in
                    HStack(spacing: 4) {
                        ForEach(0..<cols, id: \.self) { col in
                            let i = row * cols + col
                            if i < families.count {
                                self.dashTile(i % 2 == 0 ? "jump" : "run", self.playPet(families[i]), palette: palette, side: big)
                            } else {
                                Color.clear.frame(width: big, height: big)
                            }
                        }
                    }
                }
            }
            .background(palette.background)
            write(runSheet, to: "dash/run-\(mode.rawValue)",
                  size: CGSize(width: big * CGFloat(cols) + 4 * CGFloat(cols - 1), height: big * CGFloat(rows) + 4 * CGFloat(rows - 1)))
        }
        let palette = LCDStyle.palette(for: .light, mode: .technicolor)
        for scene in ["countdown", "jump", "hit", "result"] {
            write(dashTile(scene, playPet("fox"), palette: palette, side: 358), to: "dash/fox-\(scene)-technicolor",
                  size: CGSize(width: 358, height: 358))
        }
    }

    /// The Play flow inside the real phone layout (icons, message line, A/B/C), Technicolor and Traditional.
    func testRenderPlayOnThePhone() {
        let phone = phones[0]
        for mode in ColorMode.allCases {
            for scene in ["menu", "game-b", "result"] {
                let model = playModel(scene, playPet("fox"))
                let ground = LCDStyle.palette(for: .light, mode: mode).background
                let view = ZStack {
                    ground
                    ContentView(model: model, clock: day, colorMode: mode)
                        .padding(.top, phone.top)
                        .padding(.bottom, phone.bottom)
                }
                .environment(\.colorScheme, .light)
                .environment(\.displayScale, 2)
                write(view, to: "play/phone-\(mode.rawValue)-\(scene)", size: phone.size)
            }
        }
    }
}
