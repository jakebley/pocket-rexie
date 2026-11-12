import XCTest

/// The watch's input rules (Watch/WatchInput.swift) and the full-screen scene fit (Shared/SceneFit.swift).
@MainActor
final class WatchInputTests: XCTestCase {
    private let screen = CGSize(width: 198, height: 242)
    private var fit: SceneFit { SceneFit(size: screen, scale: 2, topInset: 22) }

    // MARK: crown

    func testCrownWrapsBothWays() {
        XCTAssertEqual(WatchInput.wrap(0, by: 1, count: 10), 1)
        XCTAssertEqual(WatchInput.wrap(9, by: 1, count: 10), 0)
        XCTAssertEqual(WatchInput.wrap(0, by: -1, count: 10), 9)
        XCTAssertEqual(WatchInput.wrap(3, by: 25, count: 10), 8)
        XCTAssertEqual(WatchInput.wrap(3, by: -25, count: 10), 8)
        XCTAssertEqual(WatchInput.wrap(5, by: 3, count: 0), 0)
    }

    func testCrownVisitsEveryActionOnce() {
        let count = MenuIcon.allCases.count
        var seen = Set<Int>()
        var i = 0
        for _ in 0..<count { seen.insert(i); i = WatchInput.wrap(i, by: 1, count: count) }
        XCTAssertEqual(seen.count, count)
        XCTAssertEqual(i, 0)
    }

    func testCrownRowsPerScreen() {
        XCTAssertEqual(WatchInput.crownCount(for: .home, playRows: 6, games: 4, families: 11), 10)
        XCTAssertEqual(WatchInput.crownCount(for: .feedMenu, playRows: 6, games: 4, families: 11), 5)
        XCTAssertEqual(WatchInput.crownCount(for: .playMenu, playRows: 6, games: 4, families: 11), 6)
        XCTAssertEqual(WatchInput.crownCount(for: .scores, playRows: 6, games: 4, families: 11), 4)
        XCTAssertEqual(WatchInput.crownCount(for: .chooseEgg, playRows: 6, games: 4, families: 11), 12)
        XCTAssertNil(WatchInput.crownCount(for: .game, playRows: 6, games: 4, families: 11))
        XCTAssertNil(WatchInput.crownCount(for: .stats, playRows: 6, games: 4, families: 11))
    }

    // MARK: tap and hold

    func testTapAction() {
        XCTAssertEqual(WatchInput.tapAction(mode: .home, phase: nil), .confirm)
        XCTAssertEqual(WatchInput.tapAction(mode: .feedMenu, phase: nil), .confirm)
        XCTAssertEqual(WatchInput.tapAction(mode: .stats, phase: nil), .confirm)
        XCTAssertEqual(WatchInput.tapAction(mode: .game, phase: .ready), .gameScreen)
        XCTAssertEqual(WatchInput.tapAction(mode: .game, phase: .result), .gameScreen)
        XCTAssertEqual(WatchInput.tapAction(mode: .game, phase: .play), .gameInput)
        XCTAssertEqual(WatchInput.tapAction(mode: .game, phase: .over), .ignore)
    }

    func testHoldAction() {
        XCTAssertEqual(WatchInput.holdAction(mode: .home), .describe)
        XCTAssertEqual(WatchInput.holdAction(mode: .game), .quitGame)
        XCTAssertEqual(WatchInput.holdAction(mode: .feedMenu), .back)
        XCTAssertEqual(WatchInput.holdAction(mode: .dex), .back)
    }

    func testTapPerformsSelectedActionAndHoldGoesBack() {
        let day = Date(timeIntervalSince1970: 1_772_632_800)
        let saved = AppClock.now
        AppClock.now = { day }
        defer { AppClock.now = saved }
        var pet = Pet(now: day.addingTimeInterval(-72_000))
        pet.stage = .child
        pet.species = "rawr"
        pet.lastTick = day
        pet.hunger = 3
        pet.happy = 3
        let model = GameModel(pet: pet, persist: { _ in })
        model.selected = .feed
        model.confirm()                       // the tap
        XCTAssertEqual(model.mode, .feedMenu)
        model.cancel()                        // the hold
        XCTAssertEqual(model.mode, .home)
        model.selected = .play
        model.confirm()
        XCTAssertEqual(model.mode, .playMenu)
        model.chooseMenuRow(0)
        XCTAssertEqual(model.mode, .game)
        model.quitGame()
        XCTAssertEqual(model.mode, .playMenu)
    }

    // MARK: scene fit

    func testFitUsesWholePixelsAndKeepsClockFree() {
        for size in [CGSize(width: 176, height: 215), CGSize(width: 198, height: 242), CGSize(width: 205, height: 251),
                     CGSize(width: 162, height: 197)] {
            let f = SceneFit(size: size, scale: 2, topInset: 22)
            XCTAssertEqual(f.cell * 2, (f.cell * 2).rounded(), "whole device pixels per cell")
            XCTAssertLessThanOrEqual(f.side, size.width)
            XCTAssertGreaterThanOrEqual(f.origin.y, 22 - f.cell)
            XCTAssertLessThanOrEqual(f.origin.y + f.side, size.height)
            XCTAssertGreaterThanOrEqual(f.origin.x, 0)
        }
    }

    func testCellPointClampsIntoScene() {
        let f = fit
        let inside = f.cellPoint(CGPoint(x: f.origin.x + f.cell * 10.5, y: f.origin.y + f.cell * 20.5))
        XCTAssertEqual(Double(inside.x), 10.5, accuracy: 0.01)
        XCTAssertEqual(Double(inside.y), 20.5, accuracy: 0.01)
        XCTAssertLessThan(f.cellPoint(CGPoint(x: -50, y: 9999)).y, CGFloat(f.grid))
        XCTAssertEqual(f.cellPoint(CGPoint(x: -50, y: -9)).x, 0)
    }

    // MARK: games

    private func input(_ id: String, _ p: CGPoint, zones: [TapRow] = [],
                       pet: (x: Double, half: Double, width: Double)? = nil) -> GameInput {
        WatchInput.gameInput(gameID: id, tap: p, screen: screen, fit: fit, zones: zones, catchPet: pet)
    }

    func testHiLoHalves() {
        XCTAssertEqual(input("hilo", CGPoint(x: 99, y: 40)).pick, 0)
        XCTAssertEqual(input("hilo", CGPoint(x: 99, y: 200)).pick, 1)
    }

    func testDashAnyTapJumps() {
        XCTAssertTrue(input("dash", CGPoint(x: 5, y: 5)).act)
        XCTAssertTrue(input("dash", CGPoint(x: 190, y: 230)).act)
    }

    func testCatchTapSideOfPet() {
        let pet = (x: 32.0, half: 4.0, width: 64.0)
        let mid = fit.origin.y + fit.side / 2
        XCTAssertTrue(input("catch", CGPoint(x: fit.origin.x + fit.cell * 8, y: mid), pet: pet).left)
        XCTAssertTrue(input("catch", CGPoint(x: fit.origin.x + fit.cell * 56, y: mid), pet: pet).right)
        XCTAssertTrue(input("catch", CGPoint(x: fit.origin.x + fit.cell * 33, y: mid), pet: pet).act)
    }

    func testEchoPicksThePadUnderTheFinger() {
        let p = playerPet()
        let session = MiniSession(def: EchoGame.def, params: MiniTuning.params(for: p, game: "echo"), seed: 6)
        session.begin()
        guard let game = session.game else { return XCTFail("no game") }
        let zones = EchoGame.tapZones(game)
        XCTAssertGreaterThanOrEqual(zones.count, 3)
        for (i, z) in zones.enumerated().dropLast() {
            let centre = CGPoint(x: fit.origin.x + fit.cell * (CGFloat(z.x) + CGFloat(z.w) / 2),
                                 y: fit.origin.y + fit.cell * (CGFloat(z.y) + CGFloat(z.h) / 2))
            XCTAssertEqual(input("echo", centre, zones: zones).pick, i)
            // a tap on the bottom edge of the screen, below the scene, still hits the pad above it
            let low = CGPoint(x: centre.x, y: screen.height - 1)
            XCTAssertEqual(input("echo", low, zones: zones).pick, i)
        }
        let stage = CGPoint(x: screen.width / 2, y: 5)
        XCTAssertEqual(input("echo", stage, zones: zones).pick, zones.count - 1)
    }

    func testEveryGameIsPlayableByTapsAlone() {
        // Each game reacts to the input the mapping produces.
        let p = playerPet()
        for entry in MiniGames.all {
            let session = MiniSession(def: entry.def, params: MiniTuning.params(for: p, game: entry.def.id), seed: 3)
            session.begin()
            let model = GameModel(pet: p, persist: { _ in })
            model.present(session)
            let mid = CGPoint(x: screen.width * 0.25, y: screen.height * 0.8)
            let zones = session.game.flatMap { entry.def.tapZones?($0) } ?? entry.def.tapRows
            let mapped = WatchInput.gameInput(gameID: entry.def.id, tap: mid, screen: screen, fit: fit, zones: zones)
            XCTAssertNotEqual(mapped, GameInput.none, entry.def.id)
            model.sendGameInput(mapped)
            XCTAssertNotEqual(session.pending, GameInput.none, entry.def.id)
        }
    }

    private func playerPet() -> Pet {
        var p = Pet(now: Date(timeIntervalSince1970: 1_772_632_800).addingTimeInterval(-72_000))
        p.stage = .adult
        p.species = Species.all.first { $0.stage == .adult }?.id ?? "chomper"
        return p
    }
}
