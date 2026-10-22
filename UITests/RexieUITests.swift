import XCTest

/// Drives the real app on the simulator. Every test launches a seeded scenario (see iOS/UITestSupport.swift),
/// so the pet, the clock and the persistence suite are the same on every run.
final class RexieUITests: RexieUITestCase {

    // MARK: egg and naming

    func testEggRefusesFeeding() {
        launch("egg")
        XCTAssertEqual(stat("stage"), "egg")
        XCTAssertTrue(messageLine.label.contains("egg"), "status line: \(messageLine.label)")
        shot(1, "egg")

        tap("menu-feed")
        waitForMessage(containing: "Still an egg")
        XCTAssertEqual(stat("mode"), "home", "an egg cannot open the feed menu")
    }

    func testNamingAlertSetsNameOnStatsPage() {
        launch("baby-unnamed")
        let alert = app.alerts["Your dino hatched!"]
        XCTAssertTrue(alert.waitForExistence(timeout: 10), "naming alert should appear for an unnamed baby")
        XCTAssertEqual(stat("named"), "0")
        shot(2, "naming-alert")

        let field = alert.textFields.firstMatch
        XCTAssertTrue(field.exists)
        field.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
        let existing = (field.value as? String) ?? ""
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: existing.count + 2))
        field.typeText("Zed")
        shot(3, "naming-typed")
        alert.buttons["Name it"].tap()

        XCTAssertTrue(alert.waitForNonExistence(timeout: 10), "alert should close")
        waitForStat("name", "Zed")
        XCTAssertEqual(stat("named"), "1")

        tap("menu-stats")
        waitForStat("mode", "stats")
        XCTAssertTrue(element("px-next").exists, "status page has a NEXT button")
        XCTAssertEqual(stat("name"), "Zed")
        // The pixel text on the status page carries the name as its accessibility label.
        XCTAssertTrue(app.descendants(matching: .any)["Zed"].exists, "stats page should show the new name")
        shot(4, "stats-named")
    }

    func testKeepDefaultNameFromAlert() {
        launch("baby-unnamed")
        let alert = app.alerts["Your dino hatched!"]
        XCTAssertTrue(alert.waitForExistence(timeout: 10))
        alert.buttons["Keep Rexie"].tap()
        XCTAssertTrue(alert.waitForNonExistence(timeout: 10))
        waitForStat("named", "1")
        XCTAssertEqual(stat("name"), "Rexie")
    }

    // MARK: feeding and the A / B / C buttons

    func testFeedMeatRaisesHungerHearts() {
        launch("child-hungry")
        XCTAssertEqual(intStat("hunger"), 1)
        XCTAssertTrue(messageLine.label.contains("hungry"), "status line: \(messageLine.label)")
        shot(5, "hungry-child")

        tap("menu-feed")
        waitForStat("mode", "feed")
        XCTAssertTrue(element("px-meat").exists)
        XCTAssertTrue(element("px-veggies").exists)
        XCTAssertTrue(element("px-pasta").exists)
        XCTAssertTrue(element("px-snack").exists)
        XCTAssertTrue(element("px-cancel").exists)
        shot(6, "feed-menu")

        tap("px-meat")
        waitForStat("hunger", "2")
        XCTAssertEqual(stat("mode"), "home")
        waitForMessage(containing: "Yum")
        shot(7, "fed")

        // Feeding to full eventually refuses.
        for _ in 0..<2 {
            tap("menu-feed")
            tap("px-meat")
        }
        waitForStat("hunger", "4")
        tap("menu-feed")
        tap("px-meat")
        waitForMessage(containing: "is full")
        XCTAssertEqual(intStat("hunger"), 4)
    }

    func testFeedAndSnackWithABCButtons() {
        launch("child-hungry")
        tap("btn-B")                       // selected icon is Feed
        waitForStat("mode", "feed")
        tap("btn-A")                       // MEAT -> VEGGIES
        tap("btn-B")
        waitForStat("hunger", "2")
        XCTAssertEqual(stat("mode"), "home")

        let happyBefore = intStat("happy")
        tap("menu-feed")
        for _ in 0..<3 { tap("btn-A") }    // MEAT -> VEGGIES -> PASTA -> SNACK
        tap("btn-B")
        waitForStat("happy", String(happyBefore + 1))
        waitForMessage(containing: "Sweet")

        tap("menu-feed")
        waitForStat("mode", "feed")
        tap("btn-C")
        waitForStat("mode", "home")
    }

    func testButtonAMovesMenuSelectionAndBActivatesIt() {
        launch("child-hungry")
        XCTAssertTrue(element("menu-feed").isSelected)
        tap("btn-A")
        wait("light icon selected") { self.element("menu-light").isSelected }
        XCTAssertFalse(element("menu-feed").isSelected)
        XCTAssertEqual(stat("light"), "1")
        tap("btn-B")                       // toggles the light
        waitForStat("light", "0")
        shot(8, "light-off")
        tap("menu-light")
        waitForStat("light", "1")
    }

    func testMedicineAndCleanIcons() {
        launch("adult-sick")
        XCTAssertEqual(stat("sick"), "1")
        XCTAssertTrue(messageLine.label.contains("sick"), "status line: \(messageLine.label)")
        shot(9, "sick-adult")

        tap("menu-medicine")
        waitForMessage(containing: "One more dose")
        XCTAssertEqual(stat("sick"), "1")
        tap("menu-medicine")
        waitForMessage(containing: "feels better")
        waitForStat("sick", "0")

        tap("menu-clean")
        waitForMessage(containing: "Already clean")
        // Tapping the message line dismisses it and shows the status line again.
        messageLine.tap()
        wait("message dismissed") { !self.messageLine.label.contains("Already clean") }
    }

    // MARK: mini-game

    func testPlayGameReachesResult() {
        launch("child-hungry")
        tap("menu-play")
        waitForStat("mode", "play")
        XCTAssertTrue(element("px-higher").exists)
        XCTAssertTrue(element("px-lower").exists)
        shot(10, "play-round-1")

        for round in 1...5 {
            tap(round.isMultiple(of: 2) ? "px-lower" : "px-higher")
            let next = element(round == 5 ? "px-done" : "px-next")
            XCTAssertTrue(next.waitForExistence(timeout: 10), "round \(round) should reveal a result")
            if round == 1 { shot(11, "play-revealed") }
            next.tap()
        }
        waitForStat("mode", "home")
        waitForMessage(containing: "You won")
        shot(12, "play-result")
    }

    func testQuitPlayGame() {
        launch("child-hungry")
        tap("menu-play")
        waitForStat("mode", "play")
        tap("px-quit")
        waitForStat("mode", "home")
        waitForMessage(containing: "Maybe later")
    }

    // MARK: stats and dex

    func testStatsPagesAndDex() {
        launch("adult-sick")
        XCTAssertEqual(stat("dex"), "4")
        tap("menu-stats")
        waitForStat("mode", "stats")
        shot(13, "stats-status")

        tap("px-next")
        waitForStat("mode", "details")
        shot(14, "stats-details")

        tap("px-dex")
        waitForStat("mode", "dex")
        let header = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'DEX 4/'"))
        XCTAssertGreaterThan(header.count, 0, "dex header should show 4 found")
        shot(15, "dex")
        lcd.swipeUp()
        shot(16, "dex-scrolled")

        tap("px-back")
        waitForStat("mode", "stats")
        tap("btn-C")
        waitForStat("mode", "home")
    }

    func testButtonBPagesThroughStats() {
        launch("child-hungry")
        tap("menu-stats")
        waitForStat("mode", "stats")
        tap("btn-B")
        waitForStat("mode", "details")
        tap("btn-B")
        waitForStat("mode", "dex")
        tap("btn-B")
        waitForStat("mode", "home")
    }

    // MARK: settings

    func testSettingsSheetClassicAndVacationToggles() {
        launch("child-hungry")
        XCTAssertEqual(stat("classic"), "0")
        XCTAssertEqual(stat("vacation"), "0")

        tap("settings-gear")
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 10))
        let classic = app.switches["toggle-classic"]
        let vacation = app.switches["toggle-vacation"]
        XCTAssertTrue(classic.waitForExistence(timeout: 10))
        XCTAssertEqual(classic.value as? String, "0")
        XCTAssertEqual(vacation.value as? String, "0")
        shot(17, "settings")

        flip(classic)
        XCTAssertEqual(classic.value as? String, "1")
        reveal(vacation)
        flip(vacation)
        XCTAssertEqual(vacation.value as? String, "1")
        shot(18, "settings-toggled")

        tap("settings-done")
        XCTAssertTrue(app.navigationBars["Settings"].waitForNonExistence(timeout: 10))
        waitForStat("classic", "1")
        waitForStat("vacation", "1")
        XCTAssertTrue(messageLine.label.contains("on vacation"), "status line: \(messageLine.label)")
        shot(19, "vacation-home")

        // And back off again.
        tap("settings-gear")
        XCTAssertTrue(classic.waitForExistence(timeout: 10))
        XCTAssertEqual(classic.value as? String, "1")
        flip(classic)
        reveal(vacation)
        flip(vacation)
        tap("settings-done")
        waitForStat("classic", "0")
        waitForStat("vacation", "0")
    }

    func testSettingsAboutPage() {
        launch("child-hungry")
        tap("settings-gear")
        let about = app.buttons["settings-about"]
        reveal(about)
        about.tap()
        XCTAssertTrue(app.navigationBars["About"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Version"].exists)
        shot(20, "about")
    }

    // MARK: death

    func testDeadPetCanStartNewEgg() {
        launch("dead")
        XCTAssertEqual(stat("stage"), "ghost")
        shot(21, "dead")
        tap("px-new egg")
        waitForStat("stage", "egg")
        XCTAssertEqual(stat("gen"), "2")
        waitForMessage(containing: "A new egg")
        shot(22, "new-egg")
    }

    // MARK: persistence

    func testNameSurvivesRelaunch() {
        launch("baby-unnamed")
        let alert = app.alerts["Your dino hatched!"]
        XCTAssertTrue(alert.waitForExistence(timeout: 10))
        let field = alert.textFields.firstMatch
        field.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
        let existing = (field.value as? String) ?? ""
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: existing.count + 2))
        field.typeText("Pebble")
        alert.buttons["Name it"].tap()
        waitForStat("name", "Pebble")
        Thread.sleep(forTimeInterval: 1)
        app.terminate()

        launch("baby-unnamed", keep: true)
        XCTAssertFalse(app.alerts["Your dino hatched!"].waitForExistence(timeout: 3), "named pet should not be asked again")
        XCTAssertEqual(stat("name"), "Pebble")
        XCTAssertEqual(stat("named"), "1")
        shot(23, "relaunched")
    }

    func testFeedingSurvivesRelaunch() {
        launch("child-hungry")
        tap("menu-feed")
        tap("px-pasta")
        waitForStat("hunger", "2")
        Thread.sleep(forTimeInterval: 1)
        app.terminate()

        launch("child-hungry", keep: true)
        XCTAssertEqual(stat("hunger"), "2")
        XCTAssertEqual(stat("stage"), "child")
    }

    // MARK: layout

    func testPortraitLayoutAndTapTargets() {
        launch("child-hungry")
        XCUIDevice.shared.orientation = .landscapeLeft
        Thread.sleep(forTimeInterval: 1)
        let window = app.windows.firstMatch.frame
        XCTAssertGreaterThan(window.height, window.width, "the app is portrait-only; it must not rotate")
        shot(24, "landscape-request")

        XCUIDevice.shared.orientation = .portrait
        Thread.sleep(forTimeInterval: 1)
        let bounds = app.windows.firstMatch.frame

        var ids = ["settings-gear", "btn-A", "btn-B", "btn-C"]
        ids += ["feed", "light", "play", "train", "medicine", "clean", "climate", "battle", "scold", "stats"]
            .map { "menu-" + $0 }
        for id in ids {
            let el = element(id)
            XCTAssertTrue(el.exists, "\(id) missing")
            XCTAssertTrue(el.isHittable, "\(id) not hittable")
            let f = el.frame
            XCTAssertGreaterThanOrEqual(f.width, 43.5, "\(id) is \(f.width)pt wide")
            XCTAssertGreaterThanOrEqual(f.height, 43.5, "\(id) is \(f.height)pt tall")
            XCTAssertTrue(bounds.insetBy(dx: -1, dy: -1).contains(f), "\(id) \(f) leaves the window \(bounds)")
        }

        let screen = lcd.frame
        XCTAssertEqual(screen.width, screen.height, accuracy: 1, "LCD should be square")
        XCTAssertGreaterThanOrEqual(screen.width, 160)
        let message = messageLine.frame
        XCTAssertLessThanOrEqual(screen.maxY, message.minY + 1, "message line sits below the LCD")
        XCTAssertLessThanOrEqual(message.maxY, element("btn-A").frame.minY + 1, "buttons sit below the message line")
        XCTAssertLessThanOrEqual(element("btn-A").frame.maxY, bounds.maxY)
        shot(25, "layout")
    }
}
