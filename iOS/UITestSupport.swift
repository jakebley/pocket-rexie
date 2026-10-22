import Foundation

/// Launch-argument hook for the XCUITest target (Debug builds only; Release compiles it out).
///
///     -uitest-scenario egg|baby-unnamed|child-hungry|adult-sick|dead   seed a pet and run deterministically
///     -uitest-keep                                                     keep the pet already in the test suite
///
/// With a scenario the app: reads and writes a throwaway UserDefaults suite instead of the App Group,
/// pins the game clock to `fixedNow` (no ticks, no drift, no sleep or evolution mid-test), keeps
/// messages on screen until dismissed, and silences sound, haptics and notification prompts.
/// Without the argument nothing here runs and the app behaves exactly as before.
enum UITestSupport {
    static let suiteName = "com.pocketrexie.uitest"
    /// 2026-03-04 14:00 UTC, the same afternoon the render tests use.
    static let fixedNow = Date(timeIntervalSince1970: 1_772_632_800)
    static let scenarios = ["egg", "baby-unnamed", "child-hungry", "adult-sick", "dead"]

    #if DEBUG
    static let scenario: String? = {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-uitest-scenario"), i + 1 < args.count else { return nil }
        return args[i + 1]
    }()
    #else
    static let scenario: String? = nil
    #endif

    static var active: Bool { scenario != nil }

    /// The fixed scene clock for the LCD, or nil for the live one.
    static var sceneClock: Date? { active ? fixedNow : nil }

    static func configureIfRequested() {
        guard let scenario else { return }
        let defaults = UserDefaults(suiteName: suiteName) ?? .standard
        PetStore.overrideDefaults = defaults
        AppClock.now = { fixedNow }
        GameModel.deterministic = true
        UITestFlags.forceScroll = true
        Beeper.muted = true
        Haptics.muted = true
        Notifier.disabled = true

        let keep = ProcessInfo.processInfo.arguments.contains("-uitest-keep")
        if keep && PetStore.exists() { return }
        defaults.removePersistentDomain(forName: suiteName)
        PetStore.save(seed(scenario), reloadWidgets: false)
    }

    static func seed(_ scenario: String) -> Pet {
        let now = fixedNow
        func make(_ stage: Stage, _ species: String, ageHours: Double) -> Pet {
            var p = Pet(now: now.addingTimeInterval(-ageHours * 3600))
            p.seed = 4242
            p.stage = stage
            p.species = species
            p.lastTick = now
            p.modified = now
            p.named = true
            p.hunger = 3
            p.happy = 3
            p.weight = p.baseWeight
            if !species.isEmpty { p.dex = [species] }
            return p
        }
        switch scenario {
        case "baby-unnamed":
            var p = make(.baby, "pip", ageHours: 0.5)
            p.named = false
            return p
        case "child-hungry":
            var p = make(.child, "rawr", ageHours: 20)
            p.dex = ["pip", "rawr"]
            p.hunger = 1
            p.call = .hungry
            p.callSince = now
            return p
        case "adult-sick":
            var p = make(.adult, "chomper", ageHours: 100)
            p.dex = ["pip", "rawr", "fang", "chomper"]
            p.sick = true
            p.call = .sick
            p.callSince = now
            return p
        case "dead":
            var p = make(.ghost, "chomper", ageHours: 120)
            p.diedAt = now
            p.causeOfDeath = "was too hungry for too long"
            p.legacy = ["Rexie the Chompasaur: 5d, was too hungry for too long"]
            p.dex = ["pip", "rawr", "chomper"]
            return p
        default: // "egg"
            var p = make(.egg, "", ageHours: 0.05)
            p.named = false
            return p
        }
    }
}
