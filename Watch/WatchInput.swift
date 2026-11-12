import CoreGraphics

/// The watch's input rules as pure functions (no SwiftUI, no WatchKit), so they can be unit tested.
///
///  - The Digital Crown flips through a list (actions, feed rows, games...) with wraparound.
///  - A tap does what button B does (perform the selected action, confirm a menu row, page through stats).
///  - A long press goes back (home: describes the selected action instead). Games run on taps alone.
enum WatchInput {
    /// `index` moved by `delta` steps inside `count` items, wrapping around both ends.
    static func wrap(_ index: Int, by delta: Int, count: Int) -> Int {
        guard count > 0 else { return 0 }
        let r = (index + delta) % count
        return r < 0 ? r + count : r
    }

    /// How many rows the crown moves through on this screen; nil where the crown scrolls (stats, dex) or is unused (games).
    static func crownCount(for mode: GameModel.Mode, playRows: Int, games: Int, families: Int) -> Int? {
        switch mode {
        case .home: return MenuIcon.allCases.count
        case .feedMenu: return 5
        case .playMenu: return playRows
        case .scores: return max(1, games)
        case .chooseEgg: return families + 1
        case .play, .game, .stats, .dex: return nil
        }
    }

    enum TapAction: Equatable {
        /// Same as the phone's B: perform the selected action, choose the highlighted row, turn the page.
        case confirm
        /// A game's ready or result screen: the tap starts it or leaves it.
        case gameScreen
        /// A game in play: the tap is game input.
        case gameInput
        case ignore
    }

    static func tapAction(mode: GameModel.Mode, phase: SessionPhase?) -> TapAction {
        guard case .game = mode else { return .confirm }
        switch phase {
        case .ready, .result: return .gameScreen
        case .play: return .gameInput
        default: return .ignore
        }
    }

    enum HoldAction: Equatable {
        /// Home: say what the selected action does.
        case describe
        /// Menus and text screens: back out one level.
        case back
        /// A game: quit to the Play menu.
        case quitGame
    }

    static func holdAction(mode: GameModel.Mode) -> HoldAction {
        switch mode {
        case .home: return .describe
        case .game: return .quitGame
        default: return .back
        }
    }

    /// Where a tap on the watch screen lands in a running game.
    /// - HI-LO: the top half of the screen is HIGHER, the bottom half LOWER.
    /// - CATCH: tap to one side of the pet and it runs that way; tap on the pet to stop.
    /// - DASH: any tap jumps.
    /// - ECHO: the pad under the finger (the game's own tap zones, in scene cells; taps beside or below the scene snap to its edge).
    /// - Anything else: left and right half.
    static func gameInput(gameID: String, tap: CGPoint, screen: CGSize, fit: SceneFit, zones: [TapRow],
                          catchPet: (x: Double, half: Double, width: Double)? = nil) -> GameInput {
        var input = GameInput()
        switch gameID {
        case "hilo":
            input.pick = tap.y < screen.height / 2 ? 0 : 1
        case "dash":
            input.act = true
        case "catch":
            let cx = Double(fit.cellPoint(tap).x) / Double(fit.grid) * (catchPet?.width ?? Double(fit.grid))
            if let pet = catchPet, abs(cx - pet.x) <= pet.half {
                input.act = true
            } else if cx < (catchPet?.x ?? Double(fit.grid) / 2) {
                input.left = true
            } else {
                input.right = true
            }
        case "echo":
            var c = fit.cellPoint(tap)
            // the pads stop one row short of the bottom edge: a tap on the last row (or below the scene) still hits them
            c.y = min(c.y, CGFloat(fit.grid) - 1.01)
            if let i = zones.firstIndex(where: { z in
                c.x >= CGFloat(z.x) && c.x < CGFloat(z.x + z.w) && c.y >= CGFloat(z.y) && c.y < CGFloat(z.y + z.h)
            }) {
                input.pick = i
            }
        default:
            if tap.x < screen.width / 2 { input.left = true } else { input.right = true }
        }
        return input
    }
}
