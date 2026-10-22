import XCTest

/// Shared plumbing: launching a seeded scenario, reading the LCD's accessibility value,
/// waiting for state, and writing screenshots for CI to publish.
class RexieUITestCase: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
    }

    // MARK: launching

    @discardableResult
    func launch(_ scenario: String, keep: Bool = false) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-uitest-scenario", scenario] + (keep ? ["-uitest-keep"] : [])
        app.launch()
        self.app = app
        XCTAssertTrue(lcd.waitForExistence(timeout: 20), "LCD never appeared")
        return app
    }

    // MARK: elements

    func element(_ id: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: id).firstMatch
    }

    var lcd: XCUIElement { element("lcd") }
    var messageLine: XCUIElement { element("message-line") }

    func tap(_ id: String, file: StaticString = #filePath, line: UInt = #line) {
        let el = element(id)
        XCTAssertTrue(el.waitForExistence(timeout: 10), "\(id) not found", file: file, line: line)
        el.tap()
    }

    // MARK: LCD state ("hunger 1 happy 3 ... dex 2 gen 1 name Rexie")

    func state() -> [String: String] {
        let raw = (lcd.value as? String) ?? ""
        var out: [String: String] = [:]
        let halves = raw.components(separatedBy: " name ")
        out["name"] = halves.count > 1 ? halves[1] : ""
        let tokens = halves[0].split(separator: " ").map(String.init)
        var i = 0
        while i + 1 < tokens.count {
            out[tokens[i]] = tokens[i + 1]
            i += 2
        }
        return out
    }

    func stat(_ key: String) -> String { state()[key] ?? "?" }
    func intStat(_ key: String) -> Int { Int(stat(key)) ?? -1 }

    /// Polls until `condition` holds (UI updates are asynchronous).
    @discardableResult
    func wait(_ what: String, timeout: TimeInterval = 10, file: StaticString = #filePath, line: UInt = #line,
              until condition: () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return true }
            Thread.sleep(forTimeInterval: 0.15)
        }
        XCTFail("Timed out waiting for \(what). LCD: \(lcd.value as? String ?? "nil")", file: file, line: line)
        return false
    }

    func waitForStat(_ key: String, _ expected: String, file: StaticString = #filePath, line: UInt = #line) {
        wait("\(key) == \(expected)", file: file, line: line) { stat(key) == expected }
    }

    func waitForMessage(containing text: String, file: StaticString = #filePath, line: UInt = #line) {
        wait("message containing \"\(text)\"", file: file, line: line) { messageLine.label.contains(text) }
    }

    // MARK: screenshots

    private static var deviceFolder: String {
        let env = ProcessInfo.processInfo.environment
        let raw = env["SIMULATOR_DEVICE_NAME"] ?? {
            let b = XCUIScreen.main.screenshot().image.size
            return "device-\(Int(b.width))x\(Int(b.height))"
        }()
        return raw.map { $0.isLetter || $0.isNumber ? String($0) : "-" }.joined()
    }

    /// Writes /tmp/ui-shots/<device>/<NN>-<name>.png (CI publishes it) and attaches it to the result bundle.
    func shot(_ number: Int, _ name: String) {
        Thread.sleep(forTimeInterval: 0.4)
        let screenshot = XCUIScreen.main.screenshot()
        let root = ProcessInfo.processInfo.environment["UI_SHOTS_DIR"] ?? "/tmp/ui-shots"
        let dir = URL(fileURLWithPath: root).appendingPathComponent(Self.deviceFolder, isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let file = dir.appendingPathComponent(String(format: "%02d-%@.png", number, name))
        try? screenshot.pngRepresentation.write(to: file)
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = String(format: "%02d-%@", number, name)
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    // MARK: system alert / form helpers

    /// Flips a Form switch. Taps near the trailing edge, where the knob is.
    func flip(_ toggle: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        let before = toggle.value as? String
        toggle.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.5)).tap()
        wait("switch to flip", file: file, line: line) { (toggle.value as? String) != before }
    }

    /// Scrolls the settings sheet until `el` can be tapped.
    func reveal(_ el: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(el.waitForExistence(timeout: 10), "missing \(el)", file: file, line: line)
        var tries = 0
        while !el.isHittable && tries < 5 {
            app.swipeUp()
            tries += 1
        }
    }
}
