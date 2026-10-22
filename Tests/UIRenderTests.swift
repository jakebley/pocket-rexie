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

    private func phoneView(_ sc: Scenario, phone: Phone, scheme: ColorScheme) -> some View {
        let model = GameModel(pet: sc.pet, persist: { _ in })
        sc.setup(model)
        let ground = LCDStyle.palette(for: scheme).background
        return ZStack {
            ground
            ContentView(model: model, clock: sc.clock)
                .padding(.top, phone.top)
                .padding(.bottom, phone.bottom)
        }
        .environment(\.colorScheme, scheme)
        .environment(\.displayScale, 2)
    }

    func testRenderPhoneScreens() {
        for phone in phones {
            for scheme in [ColorScheme.light, .dark] {
                let schemeName = scheme == .dark ? "dark" : "light"
                for sc in scenarios() {
                    write(phoneView(sc, phone: phone, scheme: scheme),
                          to: "ios/\(phone.name)/\(schemeName)/\(sc.name)", size: phone.size)
                }
            }
        }
    }

    // MARK: widgets

    private let widgetBackground = Color(red: 0.62, green: 0.71, blue: 0.53)

    private func widgetPets() -> [(String, Pet)] {
        [
            ("child-hungry", pet(.child, "rawr", at: day) { $0.hunger = 1; $0.call = .hungry }),
            ("sick-poops", pet(.teen, "fang", at: day, ageHours: 60) {
                $0.sick = true; $0.poops = 3; $0.call = .sick; $0.hunger = 2; $0.happy = 1
            }),
            ("adult-asleep", pet(.adult, "chomper", at: night, ageHours: 200) { $0.asleep = true; $0.lightOn = false }),
            ("egg", pet(.egg, "", at: day, ageHours: 0.05)),
            ("dead", pet(.ghost, "chomper", at: day, ageHours: 200) { $0.causeOfDeath = "was sick too long" }),
        ]
    }

    private func widgetView(_ pet: Pet, family: WidgetFamily, dark: Bool) -> some View {
        let entry = PetEntry(date: pet.lastTick, pet: pet)
        let isAccessory = family == .accessoryCircular || family == .accessoryRectangular || family == .accessoryInline
        return ZStack {
            if isAccessory {
                // Lock screen look: a dark wallpaper with vibrant white content.
                LinearGradient(colors: [Color(white: 0.18), Color(white: 0.32)], startPoint: .top, endPoint: .bottom)
            } else {
                widgetBackground
            }
            PocketRexieWidgetView(entry: entry, familyOverride: family)
                // A real widget host insets the content of the system families by 16 pt.
                .padding(isAccessory ? 0 : 16)
                .foregroundStyle(isAccessory ? Color.white : Color.primary)
        }
        .environment(\.colorScheme, dark || isAccessory ? .dark : .light)
    }

    func testRenderWidgets() {
        let families: [(String, WidgetFamily, CGSize)] = [
            ("small", .systemSmall, CGSize(width: 170, height: 170)),
            ("medium", .systemMedium, CGSize(width: 364, height: 170)),
            ("accessoryRectangular", .accessoryRectangular, CGSize(width: 172, height: 76)),
            ("accessoryCircular", .accessoryCircular, CGSize(width: 76, height: 76)),
            ("accessoryInline", .accessoryInline, CGSize(width: 257, height: 26)),
        ]
        for (label, pet) in widgetPets() {
            for (famName, family, size) in families {
                for dark in [false, true] {
                    // Accessory families look the same in both schemes.
                    if dark && (famName.hasPrefix("accessory")) { continue }
                    write(widgetView(pet, family: family, dark: dark),
                          to: "widgets/\(famName)/\(dark ? "dark" : "light")/\(label)", size: size, scale: 3)
                }
            }
        }
    }

    // MARK: watch

    func testRenderWatch() {
        let size = CGSize(width: 184, height: 224)
        for sc in scenarios() where !sc.name.contains("-b") {
            let model = GameModel(pet: sc.pet, persist: { _ in })
            sc.setup(model)
            let view = ZStack(alignment: .top) {
                Color.black
                WatchContentView(model: model)
            }
            .environment(\.colorScheme, .dark)
            .environment(\.sceneDate, sc.clock)
            .environment(\.displayScale, 2)
            write(view, to: "watch/184x224/\(sc.name)", size: size)
        }
    }

    /// The bare LCD screens at the sizes the widgets and watch use, without any chrome.
    func testRenderLCDOnly() {
        for scheme in [ColorScheme.light, .dark] {
            for sc in scenarios() {
                let model = GameModel(pet: sc.pet, persist: { _ in })
                sc.setup(model)
                let view = LCDScreen(model: model, framed: true)
                    .padding(8)
                    .background(LCDStyle.palette(for: scheme).background)
                    .environment(\.lcdPalette, LCDStyle.palette(for: scheme))
                    .environment(\.sceneDate, sc.clock)
                    .environment(\.displayScale, 2)
                write(view, to: "lcd/\(scheme == .dark ? "dark" : "light")/\(sc.name)",
                      size: CGSize(width: 358, height: 358))
            }
        }
    }
}
