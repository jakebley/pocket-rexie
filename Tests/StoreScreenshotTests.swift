import XCTest
import SwiftUI

/// Renders plain App Store screenshots with `ImageRenderer` at Apple's required pixel sizes.
/// Captions are added outside the app image. Output: $STORE_OUT/<device>/NN-name.png
/// (default: the temporary directory). Layout is rendered at points = pixels / scale.
@MainActor
final class StoreScreenshotTests: XCTestCase {
    private static let outRoot: URL = {
        if let path = ProcessInfo.processInfo.environment["STORE_OUT"], !path.isEmpty {
            return URL(fileURLWithPath: path, isDirectory: true)
        }
        return URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true).appendingPathComponent("store")
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

    private let day = Date(timeIntervalSince1970: 1_772_632_800)
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

    private struct Shot {
        let name: String
        let pet: Pet
        let clock: Date
        var dark = false
        var setup: (GameModel) -> Void = { _ in }
    }

    private func shots() -> [Shot] {
        let dexFound = ["pip", "nubb", "rawr", "sprig", "twirl", "mud", "fang", "brute", "dash", "moss",
                        "chomper", "razor", "longneck", "petalrex", "tricera"]
        return [
            Shot(name: "01-hatchling-day",
                 pet: pet(.baby, "pip", at: day, ageHours: 3) { $0.hunger = 4; $0.happy = 4 }, clock: day),
            Shot(name: "02-hungry-food-menu",
                 pet: pet(.child, "rawr", at: day, ageHours: 20) {
                     $0.hunger = 0; $0.call = .hungry; $0.callSince = day
                 }, clock: day) { $0.selected = .feed; $0.mode = .feedMenu; $0.menuIndex = 0 },
            Shot(name: "02b-hungry-bubble",
                 pet: pet(.child, "rawr", at: day, ageHours: 20) {
                     $0.hunger = 0; $0.call = .hungry; $0.callSince = day
                 }, clock: day) { $0.selected = .feed },
            Shot(name: "03-evolution-dex",
                 pet: pet(.adult, "chomper", at: day, ageHours: 200) { $0.dex = dexFound },
                 clock: day) { $0.selected = .stats; $0.mode = .dex },
            Shot(name: "04-night-asleep",
                 pet: pet(.adult, "chomper", at: night, ageHours: 200) { $0.asleep = true; $0.lightOn = false },
                 clock: night, dark: true) { $0.selected = .light },
            Shot(name: "05-play-minigame",
                 pet: pet(.child, "rawr", at: day, ageHours: 20), clock: day) {
                $0.selected = .play
                $0.mode = .play(GameModel.PlayState(round: 4, shown: 4, revealed: 8, wins: 3, lastWin: true, pickHigher: true))
            },
        ]
    }

    // MARK: output

    private func write<V: View>(_ view: V, device: String, name: String, pixels: CGSize, scale: CGFloat,
                                file: StaticString = #filePath, line: UInt = #line) {
        let points = CGSize(width: pixels.width / scale, height: pixels.height / scale)
        let renderer = ImageRenderer(content: view.frame(width: points.width, height: points.height))
        renderer.scale = scale
        guard let image = renderer.uiImage, let data = image.pngData() else {
            XCTFail("no image for \(device)/\(name)", file: file, line: line)
            return
        }
        XCTAssertEqual(image.size.width * image.scale, pixels.width, "\(device)/\(name) width", file: file, line: line)
        XCTAssertEqual(image.size.height * image.scale, pixels.height, "\(device)/\(name) height", file: file, line: line)
        XCTAssertGreaterThan(data.count, 5000, "\(device)/\(name) looks blank", file: file, line: line)
        let dir = Self.outRoot.appendingPathComponent(device, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try data.write(to: dir.appendingPathComponent(name + ".png"))
        } catch {
            XCTFail("could not write \(device)/\(name): \(error)", file: file, line: line)
        }
    }

    // MARK: iPhone

    private func phoneView(_ shot: Shot, top: CGFloat, bottom: CGFloat, scale: CGFloat) -> some View {
        let scheme: ColorScheme = shot.dark ? .dark : .light
        let model = GameModel(pet: shot.pet, persist: { _ in })
        shot.setup(model)
        return ZStack {
            LCDStyle.palette(for: scheme).background
            ContentView(model: model, clock: shot.clock)
                .padding(.top, top)
                .padding(.bottom, bottom)
        }
        .environment(\.colorScheme, scheme)
        .environment(\.displayScale, scale)
    }

    func testIPhone69() {
        for shot in shots() {
            write(phoneView(shot, top: 62, bottom: 34, scale: 3), device: "iphone-6.9", name: shot.name,
                  pixels: CGSize(width: 1320, height: 2868), scale: 3)
        }
    }

    func testIPhone65() {
        for shot in shots() {
            write(phoneView(shot, top: 47, bottom: 34, scale: 3), device: "iphone-6.5", name: shot.name,
                  pixels: CGSize(width: 1284, height: 2778), scale: 3)
        }
    }

    // MARK: Apple Watch

    private func watchView(_ shot: Shot, scale: CGFloat) -> some View {
        let model = GameModel(pet: shot.pet, persist: { _ in })
        shot.setup(model)
        return ZStack(alignment: .top) {
            Color.black
            WatchContentView(model: model)
                .padding(.top, 8)
        }
        .environment(\.colorScheme, .dark)
        .environment(\.sceneDate, shot.clock)
        .environment(\.displayScale, scale)
    }

    func testWatchUltra() {
        for shot in shots() {
            write(watchView(shot, scale: 2), device: "watch-ultra", name: shot.name,
                  pixels: CGSize(width: 410, height: 502), scale: 2)
        }
    }

    func testWatchSeries10() {
        for shot in shots() {
            write(watchView(shot, scale: 2), device: "watch-series10", name: shot.name,
                  pixels: CGSize(width: 396, height: 484), scale: 2)
        }
    }
}
